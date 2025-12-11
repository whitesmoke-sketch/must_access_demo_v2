'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DocumentTypeSelector } from './DocumentTypeSelector'
import { LeaveBalanceCards } from './LeaveBalanceCards'
import { submitDocumentRequest, searchAccessibleDocuments } from '@/app/actions/document'
import { generateDefaultApprovers } from '@/app/actions/approval'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, AlertCircle, Plus, User, Edit2, Trash2, GripVertical, FileText, Search, Check, Loader2 } from 'lucide-react'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { toast } from 'sonner'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

type DocumentType =
  | 'annual_leave'
  | 'reward_leave'
  | 'condolence'
  | 'overtime'
  | 'expense'
  | 'budget'
  | 'expense_proposal'
  | 'resignation'
  | 'overtime_report'
  | 'work_type_change'
  | 'other'

// 서버 액션에 전달할 타입
interface ServerApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  approvalType: 'single' | 'agreement'
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface ApprovalStep {
  id: string
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  role: 'approver' | 'reviewer'
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
}

interface Member {
  id: string
  name: string
  email?: string
  position?: string
  department_id?: number
  team?: string
  role_id?: number
}

interface CurrentUser {
  id: string
  name: string
  email?: string
  position?: string
  department_id?: number
  role_id?: number
}

interface Balance {
  total_days: number
  used_days: number
  remaining_days: number
  reward_used?: number // 올해 사용한 포상휴가
}

interface ExpenseItem {
  item: string
  amount: string
}

interface ExistingDocument {
  id: string
  title: string
  type: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  requesterName?: string
  visibility?: string
}

interface RequestFormProps {
  currentUser: CurrentUser
  balance: Balance | null
  members: Member[]
  initialDocumentType?: string
}

interface DraggableApprovalGroupProps {
  order: number
  stepsInOrder: ApprovalStep[]
  approvalSteps: ApprovalStep[]
  openApprovalDialog: (index: number, delegating: boolean) => void
  removeApprover: (id: string) => void
  moveOrderGroup: (dragOrder: number, hoverOrder: number) => void
}

const DraggableApprovalGroup: React.FC<DraggableApprovalGroupProps> = ({
  order,
  stepsInOrder,
  approvalSteps,
  openApprovalDialog,
  removeApprover,
  moveOrderGroup,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: 'APPROVAL_GROUP',
    item: { order },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'APPROVAL_GROUP',
    hover: (item: { order: number }) => {
      if (item.order !== order) {
        moveOrderGroup(item.order, order)
        item.order = order
      }
    },
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'var(--muted)',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '16px',
            height: '16px',
            cursor: 'grab'
          }}
        >
          <GripVertical className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {/* Order Badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'rgba(99, 91, 255, 0.2)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 600,
            color: 'var(--primary)'
          }}
        >
          {order}
        </div>

        {/* Group Container */}
        <div className="flex-1 space-y-3">
          {stepsInOrder.map((step) => {
            const globalIndex = approvalSteps.findIndex(s => s.id === step.id)

            // Role-based styling
            const roleStyle = step.role === 'reviewer'
              ? { iconBg: 'rgba(245, 158, 11, 0.1)', iconColor: '#F59E0B' }
              : { iconBg: 'rgba(99, 91, 255, 0.1)', iconColor: 'var(--primary)' }

            return (
              <div
                key={step.id}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: roleStyle.iconBg }}
                  >
                    <User className="w-5 h-5" style={{ color: roleStyle.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: 'var(--font-size-body)',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      lineHeight: 1.5
                    }}>
                      {step.isDelegated && step.delegateName
                        ? `${step.delegateName} (대결)`
                        : step.approverName}
                    </p>
                    <p style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4
                    }}>
                      결재자 · {step.approverPosition}
                      {step.isDelegated && ` (원 결재자: ${step.approverName})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openApprovalDialog(globalIndex, false)}
                    className="h-8 w-9 p-0"
                    title="수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeApprover(step.id)}
                    className="h-8 w-9 p-0"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 문서 유형별 작성 전 확인사항
const DOCUMENT_PRECAUTIONS: Record<string, string[]> = {
  annual_leave: [
    '신청 기한: 연차유급휴가는 휴가 사용일 기준 최소 1일 전부터 최대 90일 전까지 신청 및 결재가 가능합니다.',
    '분리 신청 필수: 기간이 떨어져 있거나(징검다리 연차), 반차를 연속으로 사용하는 경우(예: 목요일 오후 반차 + 금요일 오전 반차)는 날짜별로 각각 별건으로 작성해야 합니다.',
    "예외 처리: 신청 기한을 놓친 당일 사용, 사후 신청 또는 잔여 연차가 없는 경우(마이너스)에는 본 양식이 아닌 '연차 예외 사용 신청서'를 이용해 주세요.",
    '사용 단위: 연차는 종일 또는 반일(4시간) 단위로 분할 사용이 가능합니다.',
  ],
  reward_leave: [
    '사용 기한: 포상휴가는 발생한 분기의 다음 분기 내에 모두 소진해야 하며, 이월되지 않습니다. (예: 3분기 발생 분 → 4분기 내 사용)',
    '연속 사용 불가: 포상휴가는 연차와 연이어 사용할 수 없습니다. (연차 앞뒤로 붙여 쓰기 불가)',
    '분할 사용 불가: 포상휴가는 1일 단위로 부여되며 분할 사용(오전/오후 반차)이 불가능합니다.',
    '소명 자료: 해당 휴가는 전 분기에 지각이 없는 사원에게 부여됩니다. 반드시 해당 기간(분기 전체)의 Hubstaff 출근 기록 파일을 첨부해야 합니다.',
  ],
  work_type_change: [
    '사전 협의: 근로 형태 변경(병가, 휴직, 단축근무 등)은 사전에 HR 부서 및 부서장과 충분히 논의한 후 기안을 제출해 주시기 바랍니다.',
    '증빙 첨부: 각 근로 형태 변경 사유에 부합하는 증빙 자료(진단서, 훈련통지서, 증명서 등)를 반드시 첨부해야 합니다.',
    '규정 확인: 구체적인 신청 가능 기간 및 급여 조건(유/무급)은 취업규칙의 해당 조항을 따릅니다.',
  ],
  condolence: [
    '지급 기준: 경조금 등 복리후생은 계속근로기간 1년 이상인 사원에게 적용됩니다.',
    '증빙 필수: 청첩장, 부고장, 가족관계증명서 등 해당 사실을 증명할 수 있는 서류를 반드시 첨부해 주세요.',
    '지원 내용: 본인 생일, 본인 결혼, 출산, 자녀 초등학교 입학 등 취업 규칙 상의 기준에 근거하여 지급됩니다.',
  ],
  overtime: [
    '신청 시점: 연장 근로는 당일 정상 퇴근 시각의 1시간 전까지 팀장 및 부서장의 사전 승인을 받아야 합니다.',
    '근로 한도: 연장 근로는 1주간 12시간을 초과할 수 없으며, 1일 최대 3시간까지만 가능합니다.',
    '휴게 공제: 연장 근로 시간 중 1시간은 식사 및 휴게시간으로 처리되어 근로시간에 포함되지 않습니다.',
    '보호 대상: 임신 중인 여성 사원은 연장 근로를 신청할 수 없습니다.',
  ],
  overtime_report: [
    '제출 기한: 사전 승인된 연장 근로 건에 대해, 실제 근무 종료 후 48시간 이내에 보고서를 제출해야 합니다.',
    '교통비/식대: 저녁 식대는 연장 근로 승인 시 지급 가능합니다. 택시비는 23:00 이후 퇴근하는 경우에만 청구 가능하며 영수증을 첨부해야 합니다.',
    '출근 조정: 심야 근로(연장 초과) 수행 시, 부서장 승인 하에 익일 출근 시간을 최대 2시간 조정할 수 있습니다.',
  ],
  budget: [
    '작성 시기: 예산 집행이 필요한 기간 이전에 미리 계획을 승인받기 위해 작성합니다. (실제 지출 시에는 별도의 지출 품의서/지출 결의서 제출 필요)',
    '산출 근거: 예산 요청액에 대한 구체적인 산출 근거(예상 견적, 시장 조사 데이터 등)를 명확히 기재해야 합니다.',
    '기간 지정: 해당 예산이 사용될 시작일과 종료일을 최대한 정확하게 지정해 주세요.',
  ],
  expense_proposal: [
    "사전 품의: 물품 구매, 용역 계약 등 지출이 예상되는 건은 원칙적으로 '지출 품의서'를 통해 사전 승인을 득하고 난 뒤 지출하여야 하며, 지출 이후 해당 내용을 '지출 결의서'를 통해 처리해야 합니다.",
    '증빙 첨부: 모든 지출 내역에는 법적 증빙(세금계산서, 법인카드 영수증 등) 첨부가 필수입니다.',
    '대금 지급: 세금계산서(이체) 발행 건은 거래처의 통장 사본과 사업자등록증을 결의서에 함께 첨부해 주세요.',
  ],
  expense: [
    "사전 품의: 물품 구매, 용역 계약 등 지출이 예상되는 건은 원칙적으로 '지출 품의서'를 통해 사전 승인을 득하고 난 뒤 지출하여야 하며, 지출 이후 해당 내용을 '지출 결의서'를 통해 처리해야 합니다.",
    '증빙 첨부: 모든 지출 내역에는 법적 증빙(세금계산서, 법인카드 영수증 등) 첨부가 필수입니다.',
    '대금 지급: 세금계산서(이체) 발행 건은 거래처의 통장 사본과 사업자등록증을 결의서에 함께 첨부해 주세요.',
  ],
  resignation: [
    '퇴직 협의: 퇴직 희망일은 회사와 협의하여 결정하며, 업무 인수인계를 위해 제출일로부터 최대 90일 범위 내에서 퇴직일이 지정될 수 있습니다.',
    '의무 사항: 퇴사 전까지 담당 업무에 대한 인수인계를 성실히 이행해야 합니다.',
    '비밀 유지: 재직 중 취득한 회사의 영업비밀은 퇴사 후에도 유출이 금지됨을 서약합니다. (하단 서약 내용 체크박스 확인)',
  ],
  other: [
    '필수 항목(*)은 반드시 입력해주세요.',
    '결재선은 최소 1명 이상 지정해야 합니다.',
    '제출 후에는 수정이 불가능하니 신중하게 작성해주세요.',
  ],
}

export function RequestForm({ currentUser, balance, members, initialDocumentType }: RequestFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate and set initial document type
  const validDocumentTypes: DocumentType[] = ['annual_leave', 'reward_leave', 'condolence', 'overtime', 'expense', 'budget', 'expense_proposal', 'resignation', 'overtime_report', 'work_type_change', 'other']
  const initialType = initialDocumentType && validDocumentTypes.includes(initialDocumentType as DocumentType)
    ? (initialDocumentType as DocumentType)
    : ''

  // Step 1: 문서 유형
  const [documentType, setDocumentType] = useState<DocumentType | ''>(initialType)

  // 공통 필드
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')

  // 공개 범위 (연차/사직서는 자동으로 'private' 설정)
  type VisibilityScope = 'private' | 'team' | 'department' | 'division' | 'public'
  const [visibility, setVisibility] = useState<VisibilityScope | ''>('')

  // 연차 관련
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [leaveType, setLeaveType] = useState<'full' | 'half' | 'quarter'>('full')
  const [halfDaySlot, setHalfDaySlot] = useState<'morning' | 'afternoon'>('morning')

  // 일자별 유형 선택 (연차 신청용)
  const [dateDetails, setDateDetails] = useState<{ [date: string]: 'full' | 'morning' | 'afternoon' }>({})

  // 경조사비
  const [condolenceType, setCondolenceType] = useState('')
  const [targetName, setTargetName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [welfareDate, setWelfareDate] = useState<Date>()
  const [welfareAmount, setWelfareAmount] = useState('')

  // 야근수당
  const [overtimeDate, setOvertimeDate] = useState<Date>()
  const [overtimeStartTime, setOvertimeStartTime] = useState('')
  const [overtimeEndTime, setOvertimeEndTime] = useState('')
  const [workContent, setWorkContent] = useState('')

  // 지출결의서 - 다중 항목 지원
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([{ item: '', amount: '' }])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [expenseDate, setExpenseDate] = useState<Date>()
  const [expenseCategory, setExpenseCategory] = useState('')
  // 세금계산서(이체) 선택 시 추가 필드
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')

  // 예산 신청서
  const [budgetDepartmentId, setBudgetDepartmentId] = useState('')
  const [budgetPeriodStart, setBudgetPeriodStart] = useState<Date>()
  const [budgetPeriodEnd, setBudgetPeriodEnd] = useState<Date>()
  const [calculationBasis, setCalculationBasis] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')

  // 지출 품의서
  interface ExpenseProposalItem {
    item: string
    quantity: string
    unitPrice: string
  }
  const [proposalExpenseDate, setProposalExpenseDate] = useState<Date>()
  const [proposalItems, setProposalItems] = useState<ExpenseProposalItem[]>([{ item: '', quantity: '', unitPrice: '' }])
  const [vendorName, setVendorName] = useState('')

  // 사직서
  const [employmentDate, setEmploymentDate] = useState<Date>()
  const [resignationDate, setResignationDate] = useState<Date>()
  const [resignationType, setResignationType] = useState<'personal' | 'contract_end' | 'recommended' | 'other'>('personal')
  const [handoverConfirmed, setHandoverConfirmed] = useState(false)
  const [confidentialityAgreed, setConfidentialityAgreed] = useState(false)
  const [voluntaryConfirmed, setVoluntaryConfirmed] = useState(false)

  // 연장 근로 보고
  const [reportWorkDate, setReportWorkDate] = useState<Date>()
  const [reportStartTime, setReportStartTime] = useState('')
  const [reportEndTime, setReportEndTime] = useState('')
  const [reportWorkContent, setReportWorkContent] = useState('')
  const [reportTransportationFee, setReportTransportationFee] = useState('')
  const [reportMealFee, setReportMealFee] = useState('')

  // 근로형태 변경 신청
  type WorkType = 'unpaid_sick_leave' | 'public_duty' | 'leave_of_absence' | 'parental_leave' | 'family_event_leave' | 'maternity_leave' | 'paternity_leave' | 'pregnancy_reduced_hours' | 'work_schedule_change' | 'business_trip' | 'menstrual_leave'
  const [workTypeChangeType, setWorkTypeChangeType] = useState<WorkType | ''>('')
  const [workTypeStartDate, setWorkTypeStartDate] = useState<Date>()
  const [workTypeEndDate, setWorkTypeEndDate] = useState<Date>()

  // 첨부파일
  const [attachments, setAttachments] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // 파일명 sanitize 함수 (URL 안전하지 않은 문자 치환)
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .replace(/[\/\\]/g, '_')  // 슬래시, 백슬래시
      .replace(/\s+/g, '_')     // 공백
      .replace(/[<>:"|?*]/g, '_') // Windows 금지 문자
      .replace(/[^\w.\-가-힣]/g, '_') // 알파벳, 숫자, 점, 하이픈, 한글 외 문자
      .replace(/_+/g, '_')      // 연속된 언더스코어 정리
  }

  // Supabase Storage에 파일 업로드
  const uploadFilesToStorage = async (files: File[], userId: string): Promise<string[]> => {
    const supabase = createClient()
    const uploadedUrls: string[] = []

    for (const file of files) {
      const timestamp = Date.now()
      const sanitizedName = sanitizeFileName(file.name)
      const filePath = `uploads/${userId}/${timestamp}_${sanitizedName}`

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error(`파일 업로드 실패 (${file.name}):`, error)
        throw new Error(`파일 업로드 실패: ${file.name}`)
      }

      // Public URL 생성
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path)

      uploadedUrls.push(urlData.publicUrl)
    }

    return uploadedUrls
  }

  // 기존 문서 첨부
  const [selectedExistingDocs, setSelectedExistingDocs] = useState<string[]>([])
  const [isExistingDocDialogOpen, setIsExistingDocDialogOpen] = useState(false)
  const [tempSelectedDocs, setTempSelectedDocs] = useState<string[]>([])
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  // Step 3: 결재선
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([])
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [isDelegating, setIsDelegating] = useState(false)
  const [selectedDelegateId, setSelectedDelegateId] = useState('')
  // 역할은 '결재자'로 고정 (합의자는 추후 구현)
  const [selectedOrder, setSelectedOrder] = useState<number>(1)

  // Step 4: 참조자
  const [referenceSteps, setReferenceSteps] = useState<ReferenceStep[]>([])
  const [isReferenceDialogOpen, setIsReferenceDialogOpen] = useState(false)
  const [selectedReferenceId, setSelectedReferenceId] = useState('')

  // 로컬 시간대(KST) 기준 날짜 문자열 반환 (YYYY-MM-DD)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 주말 여부 확인 함수 (로컬 시간대 기준)
  const isWeekend = (date: Date) => {
    const day = date.getDay() // 로컬 시간대 기준 요일 반환
    return day === 0 || day === 6 // 0=일요일, 6=토요일
  }

  // 날짜 변경 시 일자별 상세 초기화 (연차 신청일 경우)
  useEffect(() => {
    if (startDate && endDate && documentType === 'annual_leave') {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // 날짜 범위의 모든 날짜 생성 (주말 제외)
      const dateList: string[] = []
      const current = new Date(start)
      while (current <= end) {
        // 주말(토,일)은 제외 - 로컬(KST) 시간대 기준
        if (!isWeekend(current)) {
          dateList.push(getLocalDateString(current))
        }
        current.setDate(current.getDate() + 1)
      }

      // 기존 dateDetails를 유지하면서 새로운 날짜는 'full'로 초기화
      // 단, 위치에 맞지 않는 선택은 'full'로 리셋
      const newDateDetails: { [date: string]: 'full' | 'morning' | 'afternoon' } = {}
      const totalDays = dateList.length

      dateList.forEach((date, index) => {
        const existingValue = dateDetails[date]
        const isFirst = index === 0
        const isLast = index === totalDays - 1
        const isMiddle = !isFirst && !isLast
        const isOnly = totalDays === 1

        // 기본값 또는 기존값
        let value: 'full' | 'morning' | 'afternoon' = existingValue || 'full'

        // 위치에 맞지 않는 선택은 'full'로 리셋
        if (!isOnly) {
          // 시작일인데 오전반차 선택되어 있으면 리셋
          if (isFirst && value === 'morning') {
            value = 'full'
          }
          // 종료일인데 오후반차 선택되어 있으면 리셋
          if (isLast && value === 'afternoon') {
            value = 'full'
          }
          // 중간일인데 반차 선택되어 있으면 리셋
          if (isMiddle && value !== 'full') {
            value = 'full'
          }
        }

        newDateDetails[date] = value
      })

      // 2일 연속 신청 시 오후반차+오전반차 조합 체크
      if (totalDays === 2) {
        const firstDate = dateList[0]
        const lastDate = dateList[1]
        if (newDateDetails[firstDate] === 'afternoon' && newDateDetails[lastDate] === 'morning') {
          // 둘 다 full로 리셋
          newDateDetails[firstDate] = 'full'
          newDateDetails[lastDate] = 'full'
        }
      }

      setDateDetails(newDateDetails)
    } else {
      setDateDetails({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, documentType])

  // 문서 유형 선택 시 자동 결재선 생성 (기타 문서는 제외)
  useEffect(() => {
    if (documentType && documentType !== 'other') {
      loadDefaultApprovers(documentType)
    } else if (documentType === 'other') {
      // 기타 문서는 결재선을 비움
      setApprovalSteps([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType])

  async function loadDefaultApprovers(docType: DocumentType) {
    // 문서 유형에 따라 결재 타입 결정
    // 기본값: leave, 지출관련: expense, 야근관련: overtime
    type ApprovalRequestType = 'leave' | 'expense' | 'overtime' | 'welfare' | 'general' | 'budget' | 'expense_proposal' | 'resignation' | 'overtime_report' | 'document'
    let approvalType: ApprovalRequestType = 'leave' // 기본값
    if (docType === 'expense' || docType === 'budget' || docType === 'expense_proposal') {
      approvalType = 'expense'
    } else if (docType === 'overtime' || docType === 'overtime_report') {
      approvalType = 'overtime'
    } else if (docType === 'condolence') {
      approvalType = 'welfare'
    } else if (docType === 'resignation') {
      approvalType = 'resignation'
    }

    const result = await generateDefaultApprovers(approvalType)
    if (result.success && result.data) {
      const defaultSteps: ApprovalStep[] = result.data.map((approver, index) => ({
        id: `step-${Date.now()}-${index}`,
        order: index + 1,
        approverId: approver.id,
        approverName: approver.name,
        approverPosition: approver.role.name,
        role: 'approver' as const,
      }))
      setApprovalSteps(defaultSteps)
    }
  }

  // 연차 관련 문서 여부
  const isLeaveType = documentType === 'annual_leave' || documentType === 'reward_leave'

  // 일수 계산 (dateDetails 기반)
  const calculateDays = () => {
    if (documentType === 'annual_leave' && Object.keys(dateDetails).length > 0) {
      let total = 0
      Object.values(dateDetails).forEach(type => {
        if (type === 'full') {
          total += 1
        } else if (type === 'morning' || type === 'afternoon') {
          total += 0.5
        }
      })
      return total
    }

    if (!startDate || !endDate) return 0
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    return diffDays
  }

  const calculatedDays = calculateDays()

  // 검증
  const validateForm = () => {
    if (!documentType) {
      toast.error('문서 유형을 선택해주세요')
      return false
    }

    // 연차 신청은 제목 자동 설정, 그 외는 제목 필수
    if (documentType !== 'annual_leave' && !title.trim()) {
      toast.error('제목을 입력해주세요')
      return false
    }

    // 사유가 필요한 문서 유형에서만 검증 (연차 제외 - 자동 입력)
    const reasonRequiredTypes = ['reward_leave', 'condolence', 'expense']
    if (reasonRequiredTypes.includes(documentType) && !reason.trim()) {
      toast.error('사유를 입력해주세요')
      return false
    }

    // 공개 범위 검증 (연차/사직서 제외한 문서에서 필수)
    const visibilityExemptTypes = ['annual_leave', 'reward_leave', 'resignation']
    if (!visibilityExemptTypes.includes(documentType) && !visibility) {
      toast.error('공개 범위를 선택해주세요')
      return false
    }

    // 연차 관련 검증
    if (isLeaveType) {
      if (!startDate || !endDate) {
        toast.error('시작일과 종료일을 선택해주세요')
        return false
      }

      // 포상휴가는 잔액 체크 없음 (신청 → 승인 시 부여와 동시에 사용)
      // 연차/반차인 경우만 연차 잔액 체크
      if (documentType === 'annual_leave') {
        const remainingDays = balance?.remaining_days || 0
        if (calculatedDays > remainingDays) {
          toast.error(`잔여 연차가 부족합니다 (필요: ${calculatedDays}일, 잔여: ${remainingDays}일)`)
          return false
        }
      }
    }

    // 경조사비 검증
    if (documentType === 'condolence') {
      if (!condolenceType) {
        toast.error('경조사 유형을 선택해주세요')
        return false
      }
      if (!welfareDate) {
        toast.error('경조사 날짜를 선택해주세요')
        return false
      }
    }

    // 야근수당 검증
    if (documentType === 'overtime') {
      if (!overtimeDate) {
        toast.error('야근 날짜를 선택해주세요')
        return false
      }
      if (!overtimeStartTime || !overtimeEndTime) {
        toast.error('야근 시작 시간과 종료 시간을 선택해주세요')
        return false
      }
      if (!workContent.trim()) {
        toast.error('업무 내용을 입력해주세요')
        return false
      }
    }

    // 지출결의서 검증
    if (documentType === 'expense') {
      if (!expenseDate) {
        toast.error('지출 날짜를 선택해주세요')
        return false
      }
      if (!expenseCategory) {
        toast.error('지출 카테고리를 선택해주세요')
        return false
      }
      if (expenseItems.some(item => !item.item.trim() || !item.amount.trim())) {
        toast.error('모든 지출 항목과 금액을 입력해주세요')
        return false
      }
      if (!paymentMethod) {
        toast.error('결제수단을 선택해주세요')
        return false
      }
      // 세금계산서(이체) 선택 시 계좌 정보 필수
      if (paymentMethod === 'tax_invoice') {
        if (!bankName.trim()) {
          toast.error('은행명을 입력해주세요')
          return false
        }
        if (!accountNumber.trim()) {
          toast.error('계좌번호를 입력해주세요')
          return false
        }
        if (!accountHolder.trim()) {
          toast.error('예금주명을 입력해주세요')
          return false
        }
      }
    }

    // 예산 신청서 검증
    if (documentType === 'budget') {
      if (!budgetDepartmentId) {
        toast.error('예산 대상 부서를 선택해주세요')
        return false
      }
      if (!budgetPeriodStart || !budgetPeriodEnd) {
        toast.error('예산 기간을 선택해주세요')
        return false
      }
      if (!calculationBasis.trim()) {
        toast.error('산출 근거를 입력해주세요')
        return false
      }
      if (!budgetAmount.trim() || parseFloat(budgetAmount) <= 0) {
        toast.error('총 금액을 입력해주세요')
        return false
      }
    }

    // 지출 품의서 검증
    if (documentType === 'expense_proposal') {
      if (!proposalExpenseDate) {
        toast.error('지출 예정일을 선택해주세요')
        return false
      }
      if (proposalItems.some(item => !item.item.trim() || !item.quantity.trim() || !item.unitPrice.trim())) {
        toast.error('모든 품목 정보를 입력해주세요')
        return false
      }
      if (!vendorName.trim()) {
        toast.error('거래 예정처를 입력해주세요')
        return false
      }
    }

    // 사직서 검증
    if (documentType === 'resignation') {
      if (!employmentDate) {
        toast.error('입사일을 선택해주세요')
        return false
      }
      if (!resignationDate) {
        toast.error('퇴직 희망일을 선택해주세요')
        return false
      }
      if (!handoverConfirmed) {
        toast.error('인수인계 확약에 동의해주세요')
        return false
      }
      if (!confidentialityAgreed) {
        toast.error('기밀유지 동의에 체크해주세요')
        return false
      }
      if (!voluntaryConfirmed) {
        toast.error('자발적 퇴직 확인에 체크해주세요')
        return false
      }
    }

    // 연장 근로 보고 검증
    if (documentType === 'overtime_report') {
      if (!reportWorkDate) {
        toast.error('근무일을 선택해주세요')
        return false
      }
      if (!reportStartTime || !reportEndTime) {
        toast.error('시작 시간과 종료 시간을 선택해주세요')
        return false
      }
      if (!reportWorkContent.trim()) {
        toast.error('업무 내용을 입력해주세요')
        return false
      }
    }

    // 근로형태 변경 신청 검증
    if (documentType === 'work_type_change') {
      if (!workTypeChangeType) {
        toast.error('근로 형태를 선택해주세요')
        return false
      }
      if (!workTypeStartDate || !workTypeEndDate) {
        toast.error('시작일과 종료일을 선택해주세요')
        return false
      }
    }

    if (approvalSteps.length === 0) {
      toast.error('최소 1명의 결재자를 지정해주세요')
      return false
    }

    return true
  }

  // 결재자 추가 다이얼로그 열기
  const openAddApproverDialog = () => {
    setEditingStepIndex(null)
    setIsDelegating(false)
    setSelectedApproverId('')

    // Calculate next order
    const maxOrder = approvalSteps.length > 0 ? Math.max(...approvalSteps.map(s => s.order)) : 0
    setSelectedOrder(maxOrder + 1)

    setIsApprovalDialogOpen(true)
  }

  // 결재자 변경 다이얼로그 열기
  const openApprovalDialog = (stepIndex: number, delegating: boolean = false) => {
    setEditingStepIndex(stepIndex)
    setIsDelegating(delegating)
    setSelectedApproverId('')
    setSelectedDelegateId('')

    if (delegating) {
      // 대결자 지정 모드
      setIsApprovalDialogOpen(true)
    } else {
      // 결재자 변경 모드
      setIsApprovalDialogOpen(true)
    }
  }

  // 결재자 변경/대결자 지정/추가
  const handleApprovalChange = () => {
    if (editingStepIndex === null) {
      // 결재선 추가
      if (!selectedApproverId) {
        toast.error('구성원을 선택해주세요')
        return
      }

      const approver = members.find(m => m.id === selectedApproverId)
      if (!approver) return

      const newStep: ApprovalStep = {
        id: `step-${Date.now()}`,
        order: selectedOrder,
        approverId: approver.id,
        approverName: approver.name,
        approverPosition: approver.position || '',
        role: 'approver',
      }

      setApprovalSteps([...approvalSteps, newStep])

      toast.success('결재자 추가 완료', {
        description: `${approver.name}님이 추가되었습니다.`,
      })

      setIsApprovalDialogOpen(false)
      return
    }

    if (isDelegating) {
      // 대결자 지정
      if (!selectedDelegateId) {
        toast.error('대결자를 선택해주세요')
        return
      }

      const delegate = members.find(m => m.id === selectedDelegateId)
      if (!delegate) return

      const updatedSteps = [...approvalSteps]
      updatedSteps[editingStepIndex] = {
        ...updatedSteps[editingStepIndex],
        isDelegated: true,
        delegateId: delegate.id,
        delegateName: delegate.name,
      }
      setApprovalSteps(updatedSteps)

      toast.success('대결자 지정 완료', {
        description: `${delegate.name}님을 대결자로 지정했습니다.`,
      })
    } else {
      // 결재자 교체
      if (!selectedApproverId) {
        toast.error('결재자를 선택해주세요')
        return
      }

      const approver = members.find(m => m.id === selectedApproverId)
      if (!approver) return

      const updatedSteps = [...approvalSteps]
      updatedSteps[editingStepIndex] = {
        ...updatedSteps[editingStepIndex],
        approverId: approver.id,
        approverName: approver.name,
        approverPosition: approver.position || '',
        isDelegated: false,
        delegateId: undefined,
        delegateName: undefined,
      }
      setApprovalSteps(updatedSteps)

      toast.success('결재자 변경 완료', {
        description: `${approver.name}님으로 변경했습니다.`,
      })
    }

    setIsApprovalDialogOpen(false)
    setEditingStepIndex(null)
  }

  // 순번 그룹 이동 (드래그 앤 드롭용)
  const moveOrderGroup = (dragOrder: number, hoverOrder: number) => {
    if (dragOrder === hoverOrder) return

    const newSteps = approvalSteps.map(step => {
      if (step.order === dragOrder) {
        return { ...step, order: hoverOrder }
      } else if (step.order === hoverOrder) {
        return { ...step, order: dragOrder }
      }
      return step
    })

    setApprovalSteps(newSteps)
  }

  // 결재자 삭제
  const removeApprover = (stepId: string) => {
    const newSteps = approvalSteps.filter(step => step.id !== stepId)
    setApprovalSteps(newSteps)
    toast.success('제거되었습니다')
  }

  // 제출 처리
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setIsUploading(true)

    try {
      // 첨부파일 업로드 처리
      let attachmentUrl: string | null = null
      if (attachments.length > 0) {
        try {
          toast.info('첨부파일 업로드 중...', { duration: 2000 })
          const uploadedUrls = await uploadFilesToStorage(attachments, currentUser.id)
          // 여러 파일인 경우 JSON 배열로 저장, 단일 파일이면 그냥 URL
          attachmentUrl = uploadedUrls.length === 1
            ? uploadedUrls[0]
            : JSON.stringify(uploadedUrls)
        } catch (uploadError) {
          console.error('파일 업로드 실패:', uploadError)
          toast.error(uploadError instanceof Error ? uploadError.message : '파일 업로드 중 오류가 발생했습니다')
          setIsSubmitting(false)
          setIsUploading(false)
          return
        }
      }
      setIsUploading(false)

      // 결재선을 서버 형식으로 변환
      const serverApprovalSteps: ServerApprovalStep[] = approvalSteps.map((step) => ({
        order: step.order,
        approverId: step.approverId,
        approverName: step.approverName,
        approverPosition: step.approverPosition,
        approvalType: step.role === 'reviewer' ? 'agreement' : 'single',
        isDelegated: step.isDelegated,
        delegateId: step.delegateId,
        delegateName: step.delegateName,
      }))

      // 폼 데이터 구성
      // 연차/사직서는 자동으로 비공개, 그 외는 사용자 선택값
      const visibilityExemptTypes = ['annual_leave', 'reward_leave', 'resignation']
      const finalVisibility = visibilityExemptTypes.includes(documentType)
        ? 'private'
        : visibility

      // 연차 신청 시 제목/사유 자동 설정
      const finalTitle = documentType === 'annual_leave' ? '연차신청서' : title
      const finalReason = documentType === 'annual_leave' ? '연차 신청합니다' : reason

      const formData: Record<string, unknown> = {
        title: finalTitle,
        reason: finalReason,
        visibility: finalVisibility,
      }

      if (isLeaveType) {
        formData.requested_days = calculatedDays
        formData.start_date = startDate?.toISOString().split('T')[0]
        formData.end_date = endDate?.toISOString().split('T')[0]

        if (documentType === 'annual_leave') {
          // 1일만 신청하고 반차인 경우 half_day로 설정
          const sortedDates = Object.keys(dateDetails).sort()
          const hasHalfDay = Object.values(dateDetails).some(v => v === 'morning' || v === 'afternoon')
          const isSingleDayHalfLeave = sortedDates.length === 1 && hasHalfDay

          if (isSingleDayHalfLeave) {
            formData.leave_type = 'half_day'
            const slot = dateDetails[sortedDates[0]]
            formData.half_day_slot = slot === 'morning' ? 'am' : 'pm'
          } else {
            formData.leave_type = 'annual'
          }
          formData.date_details = dateDetails
        } else {
          // 포상휴가
          formData.leave_type = 'award'
        }
      }

      if (documentType === 'condolence') {
        // DB 필드명에 맞게 매핑 (doc_welfare 테이블)
        formData.event_type = condolenceType
        formData.event_date = welfareDate?.toISOString().split('T')[0]
        formData.target_name = targetName
        formData.relationship = relationship
        formData.amount = 0  // 금액은 관리자가 승인 시 결정
      }

      if (documentType === 'overtime') {
        // DB 필드명에 맞게 매핑
        formData.work_date = overtimeDate?.toISOString().split('T')[0]
        formData.start_time = overtimeStartTime
        // 종료 시간: 익일인 경우 '+' 제거
        formData.end_time = overtimeEndTime.startsWith('+')
          ? overtimeEndTime.slice(1)
          : overtimeEndTime
        formData.work_content = workContent

        // 총 야근 시간 계산 (소수점 1자리, 휴게시간 1시간 차감)
        const startParts = overtimeStartTime.split(':').map(Number)
        const startMinutes = startParts[0] * 60 + startParts[1]
        let endMinutes: number
        if (overtimeEndTime.startsWith('+')) {
          const endParts = overtimeEndTime.slice(1).split(':').map(Number)
          endMinutes = (24 * 60) + endParts[0] * 60 + endParts[1]
        } else {
          const endParts = overtimeEndTime.split(':').map(Number)
          endMinutes = endParts[0] * 60 + endParts[1]
        }
        // 1시간 차감 (휴게시간)
        const diffMinutes = Math.max(0, endMinutes - startMinutes - 60)
        formData.total_hours = Math.round((diffMinutes / 60) * 10) / 10
      }

      if (documentType === 'expense') {
        // DB 필드명에 맞게 매핑
        formData.expense_date = expenseDate?.toISOString().split('T')[0]
        formData.category = expenseCategory
        // 총 금액 계산
        formData.amount = expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        formData.usage_purpose = reason // 사유를 usage_purpose로 매핑
        formData.expense_items = expenseItems.map(item => ({
          item: item.item,
          amount: parseFloat(item.amount),
        }))
        formData.payment_method = paymentMethod
        // 세금계산서(이체) 선택 시 계좌 정보 추가
        if (paymentMethod === 'tax_invoice') {
          formData.bank_name = bankName
          formData.account_number = accountNumber
          formData.account_holder = accountHolder
        }
      }

      if (documentType === 'budget') {
        formData.budget_department_id = parseInt(budgetDepartmentId)
        formData.period_start = budgetPeriodStart?.toISOString().split('T')[0]
        formData.period_end = budgetPeriodEnd?.toISOString().split('T')[0]
        formData.calculation_basis = calculationBasis
        formData.total_amount = parseFloat(budgetAmount)
      }

      if (documentType === 'expense_proposal') {
        formData.expense_date = proposalExpenseDate?.toISOString().split('T')[0]
        formData.items = proposalItems.map(item => ({
          item: item.item,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unitPrice) || 0,
        }))
        // 총 금액 계산 (부가세 없이)
        const totalAmount = proposalItems.reduce((sum, item) =>
          sum + (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0), 0)
        formData.total_amount = totalAmount
        formData.vendor_name = vendorName
      }

      if (documentType === 'resignation') {
        formData.employment_date = employmentDate?.toISOString().split('T')[0]
        formData.resignation_date = resignationDate?.toISOString().split('T')[0]
        formData.resignation_type = resignationType
        formData.handover_confirmed = handoverConfirmed
        formData.confidentiality_agreed = confidentialityAgreed
        formData.voluntary_confirmed = voluntaryConfirmed
      }

      if (documentType === 'overtime_report') {
        formData.work_date = reportWorkDate?.toISOString().split('T')[0]
        formData.start_time = reportStartTime
        formData.end_time = reportEndTime.startsWith('+')
          ? reportEndTime.slice(1)
          : reportEndTime
        formData.work_content = reportWorkContent
        formData.transportation_fee = reportTransportationFee ? parseFloat(reportTransportationFee) : 0
        formData.meal_fee = reportMealFee ? parseFloat(reportMealFee) : 0

        // 총 근로 시간 계산
        const startParts = reportStartTime.split(':').map(Number)
        const startMinutes = startParts[0] * 60 + startParts[1]
        let endMinutes: number
        if (reportEndTime.startsWith('+')) {
          const endParts = reportEndTime.slice(1).split(':').map(Number)
          endMinutes = (24 * 60) + endParts[0] * 60 + endParts[1]
        } else {
          const endParts = reportEndTime.split(':').map(Number)
          endMinutes = endParts[0] * 60 + endParts[1]
        }
        const diffMinutes = endMinutes - startMinutes
        formData.total_hours = Math.round((diffMinutes / 60) * 10) / 10
      }

      if (documentType === 'work_type_change') {
        formData.work_type = workTypeChangeType
        formData.start_date = workTypeStartDate?.toISOString().split('T')[0]
        formData.end_date = workTypeEndDate?.toISOString().split('T')[0]
      }

      if (selectedExistingDocs.length > 0) {
        formData.attached_documents = selectedExistingDocs
      }

      // 첨부파일 URL 설정
      if (attachmentUrl) {
        formData.attachment_url = attachmentUrl
      }

      const result = await submitDocumentRequest({
        employee_id: currentUser.id,
        document_type: documentType,
        title,
        form_data: formData,
        approval_steps: serverApprovalSteps,
        reference_steps: referenceSteps,
        visibility: finalVisibility as 'private' | 'team' | 'department' | 'division' | 'public',
      })

      if (result.success) {
        toast.success('신청서가 제출되었습니다')
        router.push('/dashboard')
      } else {
        toast.error(result.error || '제출 중 오류가 발생했습니다')
      }
    } catch (error: unknown) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : '제출 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 첨부파일 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setAttachments([...attachments, ...Array.from(files)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  // 기존 문서 첨부 다이얼로그 열기
  const openExistingDocDialog = async () => {
    setTempSelectedDocs([...selectedExistingDocs])
    setDocSearchQuery('')
    setIsExistingDocDialogOpen(true)

    // 접근 가능한 문서 목록 조회
    setIsLoadingDocs(true)
    try {
      const result = await searchAccessibleDocuments()
      if (result.success) {
        setExistingDocuments(result.data)
      } else {
        toast.error('문서 목록을 불러오는데 실패했습니다')
      }
    } catch {
      toast.error('문서 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoadingDocs(false)
    }
  }

  // 기존 문서 선택 토글
  const toggleExistingDoc = (docId: string) => {
    setTempSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  // 기존 문서 첨부 확인
  const confirmExistingDocs = () => {
    setSelectedExistingDocs(tempSelectedDocs)
    setIsExistingDocDialogOpen(false)
    toast.success('기존 문서가 첨부되었습니다', {
      description: `${tempSelectedDocs.length}개 문서가 선택되었습니다.`,
    })
  }

  // 기존 문서 첨부 삭제
  const removeExistingDoc = (docId: string) => {
    setSelectedExistingDocs(prev => prev.filter(id => id !== docId))
  }

  const handleCancel = () => {
    router.back()
  }

  // 지출 항목 추가
  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, { item: '', amount: '' }])
  }

  // 지출 항목 삭제
  const removeExpenseItem = (index: number) => {
    if (expenseItems.length > 1) {
      setExpenseItems(expenseItems.filter((_, i) => i !== index))
    }
  }

  // 지출 항목 업데이트
  const updateExpenseItem = (index: number, field: 'item' | 'amount', value: string) => {
    const newItems = [...expenseItems]
    newItems[index][field] = value
    setExpenseItems(newItems)
  }

  // 상태 색상 및 라벨
  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' },
    approved: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' },
    rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  }
  const statusLabels: Record<string, string> = {
    pending: '대기중',
    approved: '승인됨',
    rejected: '반려됨',
  }
  const documentTypeLabels: Record<string, string> = {
    'annual_leave': '연차',
    'reward_leave': '포상휴가',
    'condolence': '경조사비',
    'overtime': '야근수당',
    'expense': '지출결의서',
    'budget': '예산 신청',
    'expense_proposal': '지출 품의',
    'resignation': '사직서',
    'overtime_report': '연장 근로 보고',
    'work_type_change': '근로형태 변경',
    'other': '기타',
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Step 1: 문서 양식 선택 */}
      <DocumentTypeSelector
        value={documentType}
        onChange={(value) => {
          setDocumentType(value)
          // 문서 타입 변경 시 필드 초기화
          setTitle('')
          setReason('')
          setVisibility('')
          setStartDate(undefined)
          setEndDate(undefined)
          setDateDetails({})
          setExpenseItems([{ item: '', amount: '' }])
          // 야근수당 필드 초기화
          setOvertimeDate(undefined)
          setOvertimeStartTime('')
          setOvertimeEndTime('')
          setWorkContent('')
          // 지출결의서 필드 초기화
          setExpenseDate(undefined)
          setExpenseCategory('')
          setPaymentMethod('')
          setBankName('')
          setAccountNumber('')
          setAccountHolder('')
          // 예산 신청서 필드 초기화
          setBudgetDepartmentId('')
          setBudgetPeriodStart(undefined)
          setBudgetPeriodEnd(undefined)
          setCalculationBasis('')
          setBudgetAmount('')
          // 지출 품의서 필드 초기화
          setProposalExpenseDate(undefined)
          setProposalItems([{ item: '', quantity: '', unitPrice: '' }])
          setVendorName('')
          // 사직서 필드 초기화
          setEmploymentDate(undefined)
          setResignationDate(undefined)
          setResignationType('personal')
          setHandoverConfirmed(false)
          setConfidentialityAgreed(false)
          setVoluntaryConfirmed(false)
          // 연장 근로 보고 필드 초기화
          setReportWorkDate(undefined)
          setReportStartTime('')
          setReportEndTime('')
          setReportWorkContent('')
          setReportTransportationFee('')
          setReportMealFee('')
          // 근로형태 변경 신청 필드 초기화
          setWorkTypeChangeType('')
          setWorkTypeStartDate(undefined)
          setWorkTypeEndDate(undefined)
        }}
      />

      {/* 작성 전 확인사항 - 문서 유형 선택 후 표시 */}
      {documentType && DOCUMENT_PRECAUTIONS[documentType] && (
        <Card
          className="rounded-2xl"
          style={{
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 shrink-0 mt-0.5"
                style={{ color: 'var(--muted-foreground)' }}
              />
              <div className="space-y-2">
                <h4
                  style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    lineHeight: 1.5,
                  }}
                >
                  작성 전 확인사항
                </h4>
                <ul className="space-y-1.5">
                  {DOCUMENT_PRECAUTIONS[documentType].map((item, index) => (
                    <li
                      key={index}
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.5,
                      }}
                    >
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {documentType && (
        <>
          {/* Step 2: 양식 작성 */}
          <Card className="rounded-2xl" style={{
            borderRadius: 'var(--radius)',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                >
                  2
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--card-foreground)',
                  lineHeight: 1.5
                }}>
                  양식 작성
                </h3>
              </div>

              {/* 연차 정보 카드 - 연차 신청 시에만 표시 */}
              {documentType === 'annual_leave' && (
                <LeaveBalanceCards balance={balance} documentType={documentType} />
              )}

              {/* 제목 - 연차 신청 제외 */}
              {documentType !== 'annual_leave' && (
                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  <Input
                    id="title"
                    placeholder="신청 제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              )}

              {/* 공개 범위 - 연차/사직서 제외 */}
              {documentType && !['annual_leave', 'reward_leave', 'resignation'].includes(documentType) && (
                <div className="space-y-2">
                  <Label htmlFor="visibility">공개 범위 *</Label>
                  <Select value={visibility} onValueChange={(value) => setVisibility(value as VisibilityScope)}>
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="공개 범위를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">비공개 (본인 + 최종결재자)</SelectItem>
                      <SelectItem value="team">팀 (본인이 속한 팀)</SelectItem>
                      <SelectItem value="department">부서 (본인이 속한 부서)</SelectItem>
                      <SelectItem value="division">사업부 (본인이 속한 사업부)</SelectItem>
                      <SelectItem value="public">전사 (모든 직원)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    marginTop: '4px',
                  }}>
                    다른 직원이 문서를 첨부할 때 검색 가능 범위가 결정됩니다
                  </p>
                </div>
              )}

              {/* 문서별 동적 필드 */}
              {documentType === 'annual_leave' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작일 *</Label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        placeholder="시작일 선택"
                        disableWeekends
                        disablePastDates
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder="종료일 선택"
                        disableWeekends
                        disablePastDates
                      />
                    </div>
                  </div>

                  {/* 일자별 유형 선택 */}
                  {Object.keys(dateDetails).length > 0 && (
                    <div className="space-y-2">
                      <Label>일자별 유형 *</Label>
                      <p style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.4,
                        marginBottom: '8px',
                      }}>
                        시작일: 종일/오후반차 | 종료일: 종일/오전반차 | 중간일: 종일만 가능
                      </p>
                      <div className="space-y-2">
                        {(() => {
                          const sortedDates = Object.keys(dateDetails).sort()
                          const totalDays = sortedDates.length

                          return sortedDates.map((date, index) => {
                            const dateObj = new Date(date)
                            const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                            const formattedDate = `${dateObj.getFullYear()}년 ${String(dateObj.getMonth() + 1).padStart(2, '0')}월 ${String(dateObj.getDate()).padStart(2, '0')}일 (${dayNames[dateObj.getDay()]})`

                            // 위치 판단
                            const isFirst = index === 0
                            const isLast = index === totalDays - 1
                            const isMiddle = !isFirst && !isLast
                            const isOnly = totalDays === 1

                            // 2일 연속 신청 시 오후반차+오전반차 조합 체크
                            const isTwoDays = totalDays === 2
                            const firstDateType = isTwoDays ? dateDetails[sortedDates[0]] : null
                            const lastDateType = isTwoDays ? dateDetails[sortedDates[1]] : null

                            // 위치별 라벨
                            let positionLabel = ''
                            if (isOnly) positionLabel = ''
                            else if (isFirst) positionLabel = '[시작일]'
                            else if (isLast) positionLabel = '[종료일]'
                            else positionLabel = '[중간일]'

                            // 선택 가능한 옵션 결정
                            // - 1일만: 모든 옵션 가능
                            // - 시작일: 종일, 오후반차 가능 (오전반차 X)
                            // - 종료일: 종일, 오전반차 가능 (오후반차 X)
                            // - 중간일: 종일만 가능
                            const canSelectMorning = isOnly || isLast  // 종료일 또는 1일만
                            const canSelectAfternoon = isOnly || isFirst  // 시작일 또는 1일만

                            // 2일 연속: 오후반차(시작)+오전반차(종료) 조합 불가
                            // 시작일이 오후반차면 종료일 오전반차 비활성화
                            // 종료일이 오전반차면 시작일 오후반차 비활성화
                            let disableAfternoonForTwoDays = false
                            let disableMorningForTwoDays = false

                            if (isTwoDays) {
                              if (isFirst && lastDateType === 'morning') {
                                disableAfternoonForTwoDays = true
                              }
                              if (isLast && firstDateType === 'afternoon') {
                                disableMorningForTwoDays = true
                              }
                            }

                            return (
                              <div
                                key={date}
                                className="flex items-center justify-between p-3 gap-3"
                                style={{
                                  backgroundColor: 'var(--muted)',
                                  borderRadius: '8px',
                                }}
                              >
                                <div className="flex flex-col">
                                  <span style={{
                                    fontSize: 'var(--font-size-caption)',
                                    color: 'var(--foreground)',
                                    fontWeight: 500,
                                  }}>
                                    {formattedDate}
                                  </span>
                                  {positionLabel && (
                                    <span style={{
                                      fontSize: '11px',
                                      color: 'var(--primary)',
                                      fontWeight: 600,
                                    }}>
                                      {positionLabel}
                                    </span>
                                  )}
                                </div>
                                <Select
                                  value={dateDetails[date]}
                                  onValueChange={(value) => {
                                    setDateDetails({
                                      ...dateDetails,
                                      [date]: value as 'full' | 'morning' | 'afternoon'
                                    })
                                  }}
                                >
                                  <SelectTrigger style={{ width: '140px', height: '42px' }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">종일</SelectItem>
                                    <SelectItem
                                      value="morning"
                                      disabled={isMiddle || (!canSelectMorning) || disableMorningForTwoDays}
                                    >
                                      오전반차 {!canSelectMorning && !isMiddle && '(시작일 불가)'}
                                      {disableMorningForTwoDays && '(연속X)'}
                                    </SelectItem>
                                    <SelectItem
                                      value="afternoon"
                                      disabled={isMiddle || (!canSelectAfternoon) || disableAfternoonForTwoDays}
                                    >
                                      오후반차 {!canSelectAfternoon && !isMiddle && '(종료일 불가)'}
                                      {disableAfternoonForTwoDays && '(연속X)'}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

                  {calculatedDays > 0 && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: 'rgba(99, 91, 255, 0.05)' }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                      <div>
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--card-foreground)',
                          lineHeight: 1.5
                        }}>
                          사용 일수: {calculatedDays}일
                        </p>
                        <p style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4
                        }}>
                          신청 후 잔여 연차: {(balance?.remaining_days || 0) - calculatedDays}일
                        </p>
                      </div>
                    </div>
                  )}

                </>
              )}

              {documentType === 'reward_leave' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작일 *</Label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        placeholder="시작일 선택"
                        disableWeekends
                        disablePastDates
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder="종료일 선택"
                        disableWeekends
                        disablePastDates
                      />
                    </div>
                  </div>

                  {calculatedDays > 0 && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: 'var(--primary-bg)' }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                      <div>
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          lineHeight: 1.5
                        }}>
                          사용 일수: {calculatedDays}일
                        </p>
                        <p style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4
                        }}>
                          신청 후 잔여 포상휴가: {(balance?.reward_remaining || 0) - calculatedDays}일
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">사유 *</Label>
                    <Textarea
                      id="reason"
                      placeholder="포상휴가 사유를 입력하세요"
                      rows={3}
                      value={reason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {documentType === 'condolence' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="condolenceType">경조사 유형 *</Label>
                    <Select value={condolenceType} onValueChange={setCondolenceType}>
                      <SelectTrigger id="condolenceType">
                        <SelectValue placeholder="경조사 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marriage">결혼</SelectItem>
                        <SelectItem value="funeral">장례</SelectItem>
                        <SelectItem value="birth">출산</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>경조사 날짜 *</Label>
                    <DatePicker
                      date={welfareDate}
                      onDateChange={setWelfareDate}
                      placeholder="경조사 날짜 선택"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetName">대상자 이름</Label>
                      <Input
                        id="targetName"
                        placeholder="이름 (선택)"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">관계</Label>
                      <Input
                        id="relationship"
                        placeholder="예: 본인, 부모, 자녀 (선택)"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">사유 *</Label>
                    <Textarea
                      id="reason"
                      placeholder="경조사 사유를 입력하세요"
                      rows={3}
                      value={reason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {documentType === 'overtime' && (
                <>
                  {/* 야근 날짜 */}
                  <div className="space-y-2">
                    <Label>야근 날짜 *</Label>
                    <DatePicker
                      date={overtimeDate}
                      onDateChange={setOvertimeDate}
                      placeholder="야근 날짜 선택"
                    />
                  </div>

                  {/* 야근 시작/종료 시간 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>야근 시작 시간 *</Label>
                      <Select value={overtimeStartTime} onValueChange={setOvertimeStartTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="시작 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 18:00 ~ 23:30 (30분 단위) */}
                          {Array.from({ length: 12 }, (_, i) => {
                            const hour = 18 + Math.floor(i / 2)
                            const minute = (i % 2) * 30
                            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                            return (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>야근 종료 시간 *</Label>
                      <Select value={overtimeEndTime} onValueChange={setOvertimeEndTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="종료 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 시작 시간 이후 ~ 익일 09:00 (30분 단위) */}
                          {(() => {
                            const options = []
                            // 18:30 ~ 23:30
                            for (let i = 1; i <= 11; i++) {
                              const hour = 18 + Math.floor(i / 2)
                              const minute = (i % 2) * 30
                              const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                              const isDisabled = overtimeStartTime !== '' && time <= overtimeStartTime
                              options.push(
                                <SelectItem key={time} value={time} disabled={isDisabled}>
                                  {time}
                                </SelectItem>
                              )
                            }
                            // 00:00 ~ 09:00 (익일)
                            for (let i = 0; i <= 18; i++) {
                              const hour = Math.floor(i / 2)
                              const minute = (i % 2) * 30
                              const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                              options.push(
                                <SelectItem key={`next-${time}`} value={`+${time}`}>
                                  익일 {time}
                                </SelectItem>
                              )
                            }
                            return options
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 총 야근 시간 자동 계산 */}
                  {overtimeStartTime && overtimeEndTime && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: 'rgba(99, 91, 255, 0.05)' }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                      <div>
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--card-foreground)',
                          lineHeight: 1.5
                        }}>
                          총 야근 시간: {(() => {
                            const startParts = overtimeStartTime.split(':').map(Number)
                            const startMinutes = startParts[0] * 60 + startParts[1]

                            let endMinutes: number
                            if (overtimeEndTime.startsWith('+')) {
                              // 익일 시간
                              const endParts = overtimeEndTime.slice(1).split(':').map(Number)
                              endMinutes = (24 * 60) + endParts[0] * 60 + endParts[1]
                            } else {
                              const endParts = overtimeEndTime.split(':').map(Number)
                              endMinutes = endParts[0] * 60 + endParts[1]
                            }

                            // 1시간 차감 (휴게시간)
                            const diffMinutes = Math.max(0, endMinutes - startMinutes - 60)
                            const hours = Math.floor(diffMinutes / 60)
                            const minutes = diffMinutes % 60

                            if (minutes === 0) {
                              return `${hours}시간`
                            }
                            return `${hours}시간 ${minutes}분`
                          })()} (휴게시간 1시간 제외)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 업무 내용 */}
                  <div className="space-y-2">
                    <Label htmlFor="workContent">업무 내용 *</Label>
                    <Textarea
                      id="workContent"
                      placeholder="야근 중 수행한 업무 내용을 입력하세요"
                      rows={3}
                      value={workContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWorkContent(e.target.value)}
                    />
                  </div>
                </>
              )}

              {documentType === 'expense' && (
                <>
                  {/* 지출 날짜 */}
                  <div className="space-y-2">
                    <Label>지출 날짜 *</Label>
                    <DatePicker
                      date={expenseDate}
                      onDateChange={setExpenseDate}
                      placeholder="지출 날짜 선택"
                    />
                  </div>

                  {/* 지출 카테고리 */}
                  <div className="space-y-2">
                    <Label>지출 카테고리 *</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office_supplies">사무용품</SelectItem>
                        <SelectItem value="transportation">교통비</SelectItem>
                        <SelectItem value="meals">식비</SelectItem>
                        <SelectItem value="meeting">회의비</SelectItem>
                        <SelectItem value="equipment">장비/비품</SelectItem>
                        <SelectItem value="education">교육비</SelectItem>
                        <SelectItem value="overtime_transport">야근 교통비</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 지출 항목 */}
                  <div className="space-y-3">
                    <Label>지출 항목 *</Label>
                    {expenseItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            placeholder="예: 사무용품 구매"
                            value={item.item}
                            onChange={(e) => updateExpenseItem(index, 'item', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="금액"
                            value={item.amount}
                            onChange={(e) => updateExpenseItem(index, 'amount', e.target.value)}
                          />
                        </div>
                        {expenseItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExpenseItem(index)}
                            style={{ height: '42px', width: '42px' }}
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addExpenseItem}
                      className="w-full"
                      style={{ height: '42px' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      지출 항목 추가
                    </Button>

                    {/* 총 금액 표시 */}
                    <div className="flex justify-end pt-2 border-t">
                      <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--foreground)' }}>
                        총 금액: {expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}원
                      </p>
                    </div>
                  </div>

                  {/* 결제수단 */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">결제수단 *</Label>
                    <Select value={paymentMethod} onValueChange={(value) => {
                      setPaymentMethod(value)
                      // 세금계산서(이체) 외 선택 시 계좌 정보 초기화
                      if (value !== 'tax_invoice') {
                        setBankName('')
                        setAccountNumber('')
                        setAccountHolder('')
                      }
                    }}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="결제수단 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate_card">법인카드</SelectItem>
                        <SelectItem value="personal_card">개인카드</SelectItem>
                        <SelectItem value="tax_invoice">세금계산서(이체)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 세금계산서(이체) 선택 시 계좌 정보 */}
                  {paymentMethod === 'tax_invoice' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium text-muted-foreground">계좌 정보</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">은행명 *</Label>
                          <Input
                            id="bankName"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="예: 국민은행"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">계좌번호 *</Label>
                          <Input
                            id="accountNumber"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="계좌번호 입력"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountHolder">예금주명 *</Label>
                          <Input
                            id="accountHolder"
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            placeholder="예금주명 입력"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">사유 *</Label>
                    <Textarea
                      id="reason"
                      placeholder="지출 사유를 입력하세요"
                      rows={3}
                      value={reason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 예산 신청서 */}
              {documentType === 'budget' && (
                <>
                  {/* 예산 대상 부서 */}
                  <div className="space-y-2">
                    <Label>예산 대상 부서 *</Label>
                    <Select value={budgetDepartmentId} onValueChange={setBudgetDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="부서 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">경영지원팀</SelectItem>
                        <SelectItem value="2">개발팀</SelectItem>
                        <SelectItem value="3">마케팅팀</SelectItem>
                        <SelectItem value="4">영업팀</SelectItem>
                        <SelectItem value="5">인사팀</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 예산 기간 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>기간 시작일 *</Label>
                      <DatePicker
                        date={budgetPeriodStart}
                        onDateChange={setBudgetPeriodStart}
                        placeholder="시작일 선택"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>기간 종료일 *</Label>
                      <DatePicker
                        date={budgetPeriodEnd}
                        onDateChange={setBudgetPeriodEnd}
                        placeholder="종료일 선택"
                      />
                    </div>
                  </div>

                  {/* 산출 근거 */}
                  <div className="space-y-2">
                    <Label htmlFor="calculationBasis">산출 근거 *</Label>
                    <Textarea
                      id="calculationBasis"
                      placeholder="예산 산출 근거를 상세히 입력해주세요"
                      rows={4}
                      value={calculationBasis}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCalculationBasis(e.target.value)}
                    />
                  </div>

                  {/* 총 금액 */}
                  <div className="space-y-2">
                    <Label htmlFor="budgetAmount">총 금액 (원) *</Label>
                    <Input
                      id="budgetAmount"
                      type="number"
                      placeholder="예산 총액을 입력하세요"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                    />
                    {budgetAmount && (
                      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
                        {parseFloat(budgetAmount).toLocaleString()}원
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* 지출 품의서 */}
              {documentType === 'expense_proposal' && (
                <>
                  {/* 지출 예정일 */}
                  <div className="space-y-2">
                    <Label>지출 예정일 *</Label>
                    <DatePicker
                      date={proposalExpenseDate}
                      onDateChange={setProposalExpenseDate}
                      placeholder="지출 예정일 선택"
                    />
                  </div>

                  {/* 품목 목록 */}
                  <div className="space-y-3">
                    <Label>품목 목록 *</Label>
                    {proposalItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Input
                            placeholder="품목명"
                            value={item.item}
                            onChange={(e) => {
                              const newItems = [...proposalItems]
                              newItems[index].item = e.target.value
                              setProposalItems(newItems)
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="수량"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...proposalItems]
                              newItems[index].quantity = e.target.value
                              setProposalItems(newItems)
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="단가"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newItems = [...proposalItems]
                              newItems[index].unitPrice = e.target.value
                              setProposalItems(newItems)
                            }}
                          />
                        </div>
                        {proposalItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProposalItems(proposalItems.filter((_, i) => i !== index))
                            }}
                            style={{ height: '42px', width: '42px' }}
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProposalItems([...proposalItems, { item: '', quantity: '', unitPrice: '' }])}
                      className="w-full"
                      style={{ height: '42px' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      품목 추가
                    </Button>

                    {/* 품목 요약 및 총 금액 */}
                    {proposalItems.some(item => item.item && item.quantity && item.unitPrice) && (
                      <div className="space-y-2 pt-2 border-t">
                        {/* 품목 목록 요약 */}
                        <div className="space-y-1">
                          {proposalItems.filter(item => item.item && item.quantity && item.unitPrice).map((item, index) => {
                            const itemTotal = (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                            return (
                              <div key={index} className="flex justify-between">
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
                                  {item.item} x {item.quantity}개
                                </span>
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                                  {itemTotal.toLocaleString()}원
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {/* 총 금액 */}
                        <div className="flex justify-between pt-2 border-t">
                          <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--foreground)' }}>총 금액</span>
                          <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--primary)' }}>
                            {proposalItems.reduce((sum, item) =>
                              sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 거래 예정처 */}
                  <div className="space-y-2">
                    <Label htmlFor="vendorName">거래 예정처 *</Label>
                    <Input
                      id="vendorName"
                      placeholder="거래 예정처를 입력하세요"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 사직서 */}
              {documentType === 'resignation' && (
                <>
                  {/* 입사일 / 퇴직 희망일 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>입사일 *</Label>
                      <DatePicker
                        date={employmentDate}
                        onDateChange={setEmploymentDate}
                        placeholder="입사일 선택"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>퇴직 희망일 *</Label>
                      <DatePicker
                        date={resignationDate}
                        onDateChange={setResignationDate}
                        placeholder="퇴직 희망일 선택"
                      />
                    </div>
                  </div>

                  {/* 퇴직 유형 */}
                  <div className="space-y-2">
                    <Label>퇴직 유형 *</Label>
                    <Select value={resignationType} onValueChange={(v) => setResignationType(v as 'personal' | 'contract_end' | 'recommended' | 'other')}>
                      <SelectTrigger>
                        <SelectValue placeholder="퇴직 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">개인 사유</SelectItem>
                        <SelectItem value="contract_end">계약 만료</SelectItem>
                        <SelectItem value="recommended">권고 사직</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 확약 사항 */}
                  <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                    <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--foreground)' }}>
                      확약 사항 *
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={handoverConfirmed}
                          onChange={(e) => setHandoverConfirmed(e.target.checked)}
                          className="mt-1"
                        />
                        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                          담당 업무에 대한 인수인계를 성실히 이행할 것을 확약합니다.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confidentialityAgreed}
                          onChange={(e) => setConfidentialityAgreed(e.target.checked)}
                          className="mt-1"
                        />
                        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                          재직 중 취득한 회사의 기밀정보를 퇴직 후에도 유지할 것을 동의합니다.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={voluntaryConfirmed}
                          onChange={(e) => setVoluntaryConfirmed(e.target.checked)}
                          className="mt-1"
                        />
                        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                          본 사직서 제출은 본인의 자발적인 의사에 의한 것임을 확인합니다.
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* 연장 근로 보고 */}
              {documentType === 'overtime_report' && (
                <>
                  {/* 근무일 */}
                  <div className="space-y-2">
                    <Label>근무일 *</Label>
                    <DatePicker
                      date={reportWorkDate}
                      onDateChange={setReportWorkDate}
                      placeholder="근무일 선택"
                    />
                  </div>

                  {/* 시작/종료 시간 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작 시간 *</Label>
                      <Select value={reportStartTime} onValueChange={setReportStartTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="시작 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const hour = 18 + Math.floor(i / 2)
                            const minute = (i % 2) * 30
                            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                            return <SelectItem key={time} value={time}>{time}</SelectItem>
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>종료 시간 *</Label>
                      <Select value={reportEndTime} onValueChange={setReportEndTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="종료 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const options = []
                            for (let i = 1; i <= 11; i++) {
                              const hour = 18 + Math.floor(i / 2)
                              const minute = (i % 2) * 30
                              const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                              const isDisabled = reportStartTime !== '' && time <= reportStartTime
                              options.push(
                                <SelectItem key={time} value={time} disabled={isDisabled}>{time}</SelectItem>
                              )
                            }
                            for (let i = 0; i <= 12; i++) {
                              const hour = Math.floor(i / 2)
                              const minute = (i % 2) * 30
                              const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                              options.push(
                                <SelectItem key={`next-${time}`} value={`+${time}`}>익일 {time}</SelectItem>
                              )
                            }
                            return options
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 총 근로 시간 표시 */}
                  {reportStartTime && reportEndTime && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: 'rgba(99, 91, 255, 0.05)' }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                      <div>
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--card-foreground)',
                          lineHeight: 1.5
                        }}>
                          총 근로 시간: {(() => {
                            const startParts = reportStartTime.split(':').map(Number)
                            const startMinutes = startParts[0] * 60 + startParts[1]
                            let endMinutes: number
                            if (reportEndTime.startsWith('+')) {
                              const endParts = reportEndTime.slice(1).split(':').map(Number)
                              endMinutes = (24 * 60) + endParts[0] * 60 + endParts[1]
                            } else {
                              const endParts = reportEndTime.split(':').map(Number)
                              endMinutes = endParts[0] * 60 + endParts[1]
                            }
                            const diffMinutes = endMinutes - startMinutes
                            const hours = Math.floor(diffMinutes / 60)
                            const minutes = diffMinutes % 60
                            if (minutes === 0) return `${hours}시간`
                            return `${hours}시간 ${minutes}분`
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 업무 내용 */}
                  <div className="space-y-2">
                    <Label htmlFor="reportWorkContent">업무 내용 *</Label>
                    <Textarea
                      id="reportWorkContent"
                      placeholder="연장 근로 중 수행한 업무 내용을 입력하세요"
                      rows={3}
                      value={reportWorkContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportWorkContent(e.target.value)}
                    />
                  </div>

                  {/* 교통비 */}
                  <div className="space-y-2">
                    <Label htmlFor="reportTransportationFee">교통비 (원)</Label>
                    <Input
                      id="reportTransportationFee"
                      type="number"
                      placeholder="교통비 (선택)"
                      value={reportTransportationFee}
                      onChange={(e) => setReportTransportationFee(e.target.value)}
                    />
                  </div>

                  {/* 식대 */}
                  <div className="space-y-2">
                    <Label htmlFor="reportMealFee">식대 (원)</Label>
                    <Input
                      id="reportMealFee"
                      type="number"
                      placeholder="식대 (선택)"
                      value={reportMealFee}
                      onChange={(e) => setReportMealFee(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 근로형태 변경 신청 */}
              {documentType === 'work_type_change' && (
                <>
                  {/* 근로 형태 선택 */}
                  <div className="space-y-2">
                    <Label>근로 형태 *</Label>
                    <Select value={workTypeChangeType} onValueChange={(v) => setWorkTypeChangeType(v as WorkType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="근로 형태를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid_sick_leave">무급병가 (연 60일)</SelectItem>
                        <SelectItem value="public_duty">공가 휴가 (예비군/민방위 등)</SelectItem>
                        <SelectItem value="leave_of_absence">휴직 (무급)</SelectItem>
                        <SelectItem value="parental_leave">육아 휴직</SelectItem>
                        <SelectItem value="family_event_leave">경조사 휴가</SelectItem>
                        <SelectItem value="maternity_leave">출산전후 휴가 (90일)</SelectItem>
                        <SelectItem value="paternity_leave">배우자출산휴가 (20일)</SelectItem>
                        <SelectItem value="pregnancy_reduced_hours">임신 중 단축근무</SelectItem>
                        <SelectItem value="work_schedule_change">근무 변경 (재택 등)</SelectItem>
                        <SelectItem value="business_trip">출장/외근</SelectItem>
                        <SelectItem value="menstrual_leave">여성 보건 휴가</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 시작일 / 종료일 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작일 *</Label>
                      <DatePicker
                        date={workTypeStartDate}
                        onDateChange={setWorkTypeStartDate}
                        placeholder="시작일 선택"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <DatePicker
                        date={workTypeEndDate}
                        onDateChange={setWorkTypeEndDate}
                        placeholder="종료일 선택"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 첨부파일 */}
              <div className="space-y-2">
                <Label htmlFor="attachments">첨부파일</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    파일 선택
                  </Button>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--muted)' }}
                        >
                          <span style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--card-foreground)',
                            lineHeight: 1.4
                          }}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 기존 문서 참조 */}
              <div className="space-y-2">
                <Label>기존 문서 참조</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openExistingDocDialog}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    이전 문서 선택
                  </Button>

                  {selectedExistingDocs.length > 0 && (
                    <div className="space-y-2">
                      {selectedExistingDocs.map((docId) => {
                        const doc = existingDocuments.find(d => d.id === docId)
                        if (!doc) return null

                        return (
                          <div
                            key={docId}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--muted)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span style={{
                                  fontSize: 'var(--font-size-caption)',
                                  color: 'var(--foreground)',
                                  lineHeight: 1.4
                                }}>
                                  {doc.title}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: statusColors[doc.status]?.bg,
                                    color: statusColors[doc.status]?.color,
                                  }}
                                >
                                  {statusLabels[doc.status]}
                                </span>
                              </div>
                              <p style={{
                                fontSize: 'var(--font-size-caption)',
                                color: 'var(--muted-foreground)',
                                lineHeight: 1.4,
                                marginTop: '2px',
                              }}>
                                {new Date(doc.submittedAt).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingDoc(docId)}
                              className="p-1 rounded transition-colors flex-shrink-0 hover:bg-gray-200"
                            >
                              <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: 결재선 지정 */}
          <Card className="rounded-2xl" style={{
            borderRadius: 'var(--radius)',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    3
                  </div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    결재선 지정
                  </h3>
                </div>
                <Button variant="outline" size="sm" onClick={openAddApproverDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  결재선 추가
                </Button>
              </div>

              {approvalSteps.length === 0 ? (
                <div className="text-center py-8">
                  <p style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}>
                    결재선이 설정되지 않았습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 신청자 */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                    <div className="flex-1">
                      <p style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        lineHeight: 1.5
                      }}>
                        {currentUser.name}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.4
                      }}>
                        신청자 · {currentUser.position}
                      </p>
                    </div>
                    <Badge style={{
                      backgroundColor: 'rgba(99, 91, 255, 0.1)',
                      color: 'var(--primary)',
                      fontSize: 'var(--font-size-caption)',
                    }}>
                      작성 중
                    </Badge>
                  </div>

                  {/* 결재선 - 순번별로 그룹화 (드래그 앤 드롭) */}
                  <DndProvider backend={HTML5Backend}>
                    {(() => {
                      // Group steps by order
                      const groupedSteps: { [key: number]: ApprovalStep[] } = {}
                      approvalSteps.forEach(step => {
                        if (!groupedSteps[step.order]) {
                          groupedSteps[step.order] = []
                        }
                        groupedSteps[step.order].push(step)
                      })

                      const orders = Object.keys(groupedSteps).map(Number).sort((a, b) => a - b)

                      return orders.map((order) => {
                        const stepsInOrder = groupedSteps[order]

                        return (
                          <DraggableApprovalGroup
                            key={order}
                            order={order}
                            stepsInOrder={stepsInOrder}
                            approvalSteps={approvalSteps}
                            openApprovalDialog={openApprovalDialog}
                            removeApprover={removeApprover}
                            moveOrderGroup={moveOrderGroup}
                          />
                        )
                      })
                    })()}
                  </DndProvider>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4: 참조자 지정 */}
          <Card className="rounded-2xl" style={{
            borderRadius: 'var(--radius)',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    참조자 지정 (선택)
                  </h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsReferenceDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  참조자 추가
                </Button>
              </div>

              {referenceSteps.length === 0 ? (
                <div className="text-center py-8">
                  <p style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}>
                    지정된 참조자가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referenceSteps.map((reference) => (
                    <div
                      key={reference.id}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                          >
                            <User className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{
                              fontSize: 'var(--font-size-body)',
                              fontWeight: 600,
                              color: 'var(--foreground)',
                              lineHeight: 1.5
                            }}>
                              {reference.memberName}
                            </p>
                            <p style={{
                              fontSize: 'var(--font-size-caption)',
                              color: 'var(--muted-foreground)',
                              lineHeight: 1.4
                            }}>
                              참조자 · {reference.memberPosition}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReferenceSteps(referenceSteps.filter(r => r.id !== reference.id))
                              toast.success('제거 완료')
                            }}
                            className="h-8 w-9 p-0"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 하단 고정 버튼 */}
          <style>{`
            .request-form-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 1rem;
              z-index: 20;
              transition: all 300ms;
              border-top: 1px solid var(--border);
              background-color: var(--card);
            }
            @media (min-width: 768px) {
              .request-form-footer {
                left: 80px;
              }
            }
          `}</style>
          <div className="request-form-footer">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isSubmitting}
                style={{ height: '42px' }}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading}
                className="flex-1"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  height: '42px',
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    업로드 중...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '제출'
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 결재자 추가/수정/대결자 지정 다이얼로그 */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent
          className="!p-4 !border-0"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--foreground)',
            }}>
              {editingStepIndex === null ? '결재선 추가' : (isDelegating ? '대결자 지정' : '결재자 변경')}
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              {editingStepIndex === null
                ? '역할과 순번을 선택하고 구성원을 추가하세요'
                : (isDelegating
                  ? '결재를 대신 처리할 대결자를 선택하세요'
                  : '새로운 결재자를 선택하세요')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingStepIndex === null && (
              <>
                <div className="space-y-2">
                  <Label style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--foreground)',
                    lineHeight: 1.5
                  }}>
                    역할
                  </Label>
                  <div
                    className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    style={{ color: 'var(--foreground)' }}
                  >
                    결재자
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--foreground)',
                    lineHeight: 1.5
                  }}>
                    결재 순번
                  </Label>
                  <Select
                    value={selectedOrder.toString()}
                    onValueChange={(value) => setSelectedOrder(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const maxOrder = approvalSteps.length > 0 ? Math.max(...approvalSteps.map(s => s.order)) : 0
                        const uniqueOrders = [...new Set(approvalSteps.map(s => s.order))].sort((a, b) => a - b)
                        const newOrder = maxOrder + 1
                        const options = approvalSteps.length > 0 ? [...uniqueOrders, newOrder] : [1]
                        return options.map(order => (
                          <SelectItem key={order} value={order.toString()}>
                            {order}순위{uniqueOrders.includes(order) ? ' (기존 순번에 추가)' : ' (새 순번)'}
                          </SelectItem>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--foreground)',
                lineHeight: 1.5
              }}>
                구성원
              </Label>
              <MemberCombobox
                members={members.filter(m => {
                  // 현재 사용자 제외
                  if (m.id === currentUser.id) return false
                  // 대결자 지정 시에는 모든 구성원 표시
                  if (isDelegating) return true
                  // 이미 선택된 결재자 제외 (수정 중인 결재자는 포함)
                  const selectedIds = approvalSteps.map(s => s.approverId)
                  if (editingStepIndex !== null) {
                    const editingId = approvalSteps[editingStepIndex]?.approverId
                    if (m.id === editingId) return true
                  }
                  return !selectedIds.includes(m.id)
                })}
                value={isDelegating ? selectedDelegateId : selectedApproverId}
                onValueChange={isDelegating ? setSelectedDelegateId : setSelectedApproverId}
                placeholder="구성원 검색 및 선택"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleApprovalChange}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 참조자 추가 다이얼로그 */}
      <Dialog open={isReferenceDialogOpen} onOpenChange={setIsReferenceDialogOpen}>
        <DialogContent
          className="!p-4 !border-0"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--foreground)',
            }}>
              참조자 추가
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              참조자로 추가할 구성원을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <MemberCombobox
              members={members.filter(m => {
                // 현재 사용자 제외
                if (m.id === currentUser.id) return false
                // 이미 선택된 참조자 제외
                const selectedRefIds = referenceSteps.map(r => r.memberId)
                return !selectedRefIds.includes(m.id)
              })}
              value={selectedReferenceId}
              onValueChange={setSelectedReferenceId}
              placeholder="구성원 검색 및 선택"
            />
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                if (!selectedReferenceId) {
                  toast.error('구성원을 선택해주세요')
                  return
                }

                const referenceMember = members.find(m => m.id === selectedReferenceId)
                if (!referenceMember) return

                const newReferenceStep: ReferenceStep = {
                  id: `ref-${Date.now()}`,
                  memberId: referenceMember.id,
                  memberName: referenceMember.name,
                  memberPosition: referenceMember.position || '',
                }

                setReferenceSteps([...referenceSteps, newReferenceStep])

                toast.success('참조자 추가 완료', {
                  description: `${referenceMember.name}님이 추가되었습니다.`,
                })

                setIsReferenceDialogOpen(false)
                setSelectedReferenceId('')
              }}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 기존 문서 선택 다이얼로그 */}
      <Dialog open={isExistingDocDialogOpen} onOpenChange={setIsExistingDocDialogOpen}>
        <DialogContent
          className="!p-4 !border-0 max-w-4xl"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--foreground)',
            }}>
              기존 문서 선택
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              참고 자료로 첨부할 이전 제출 문서를 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div
            className="py-4"
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
            }}
          >
            {/* 검색 */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                <Input
                  placeholder="문서 제목으로 검색..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoadingDocs ? (
              <div className="text-center py-8">
                <p style={{
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}>
                  문서 목록을 불러오는 중...
                </p>
              </div>
            ) : existingDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p style={{
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}>
                  첨부 가능한 문서가 없습니다
                </p>
              </div>
            ) : (
              (() => {
                // 검색 필터링
                const filteredDocs = existingDocuments.filter((doc) =>
                  doc.title.toLowerCase().includes(docSearchQuery.toLowerCase())
                )

                return (
                  <>
                    <div className="mb-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
                      전체 {filteredDocs.length}건
                    </div>

                    {filteredDocs.length === 0 ? (
                      <div className="text-center py-8">
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.5
                        }}>
                          검색 결과가 없습니다
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow style={{ borderBottom: '2px solid var(--border)' }}>
                            <TableHead className="text-center p-3 w-12" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              선택
                            </TableHead>
                            <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              문서 종류
                            </TableHead>
                            <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              문서 제목
                            </TableHead>
                            <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              작성자
                            </TableHead>
                            <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              제출일
                            </TableHead>
                            <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                              상태
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDocs.map((doc) => {
                            const isSelected = tempSelectedDocs.includes(doc.id)

                            return (
                              <TableRow
                                key={doc.id}
                                onClick={() => toggleExistingDoc(doc.id)}
                                className="cursor-pointer transition-all hover:bg-muted"
                                style={{
                                  borderBottom: '1px solid var(--border)',
                                  backgroundColor: isSelected ? 'rgba(99, 91, 255, 0.05)' : 'transparent',
                                }}
                              >
                                <TableCell className="text-center p-3">
                                  <div className="flex items-center justify-center">
                                    <div
                                      className="w-5 h-5 rounded flex items-center justify-center"
                                      style={{
                                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                                        backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                                      }}
                                    >
                                      {isSelected && (
                                        <Check className="w-3 h-3" style={{ color: 'var(--primary-foreground)' }} />
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="p-3">
                                  <Badge
                                    style={{
                                      backgroundColor: 'var(--muted)',
                                      color: 'var(--muted-foreground)',
                                      fontSize: '12px',
                                      lineHeight: 1.4,
                                      fontWeight: 600,
                                      border: 'none',
                                    }}
                                  >
                                    {documentTypeLabels[doc.type] || doc.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                                  {doc.title}
                                </TableCell>
                                <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
                                  {doc.requesterName || '-'}
                                </TableCell>
                                <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                                  {new Date(doc.submittedAt).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </TableCell>
                                <TableCell className="p-3">
                                  <Badge
                                    style={{
                                      backgroundColor: statusColors[doc.status]?.bg,
                                      color: statusColors[doc.status]?.color,
                                      fontSize: '12px',
                                      lineHeight: 1.4,
                                      fontWeight: 600,
                                      border: 'none',
                                    }}
                                  >
                                    {statusLabels[doc.status]}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )
              })()
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExistingDocDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={confirmExistingDocs}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
              disabled={tempSelectedDocs.length === 0}
            >
              선택 완료 ({tempSelectedDocs.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
