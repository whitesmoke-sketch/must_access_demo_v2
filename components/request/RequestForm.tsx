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
import { submitDocumentRequest } from '@/app/actions/document'
import { generateDefaultApprovers } from '@/app/actions/approval'
import { Upload, X, AlertCircle, Plus, User, Edit2, Trash2, GripVertical, FileText, Search, Check } from 'lucide-react'
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
}

interface RequestFormProps {
  currentUser: CurrentUser
  balance: Balance | null
  members: Member[]
  initialDocumentType?: string
  existingDocuments?: ExistingDocument[]
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
                      {step.role === 'reviewer' ? '합의자' : '결재자'} · {step.approverPosition}
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

export function RequestForm({ currentUser, balance, members, initialDocumentType, existingDocuments = [] }: RequestFormProps) {
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
  const [expenseReason, setExpenseReason] = useState('')
  const [proposalItems, setProposalItems] = useState<ExpenseProposalItem[]>([{ item: '', quantity: '', unitPrice: '' }])
  const [vendorName, setVendorName] = useState('')

  // 사직서
  const [employmentDate, setEmploymentDate] = useState<Date>()
  const [resignationDate, setResignationDate] = useState<Date>()
  const [resignationType, setResignationType] = useState<'personal' | 'contract_end' | 'recommended' | 'other'>('personal')
  const [detailReason, setDetailReason] = useState('')
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
  const [workTypeDetail, setWorkTypeDetail] = useState('')

  // 첨부파일
  const [attachments, setAttachments] = useState<File[]>([])

  // 기존 문서 첨부
  const [selectedExistingDocs, setSelectedExistingDocs] = useState<string[]>([])
  const [isExistingDocDialogOpen, setIsExistingDocDialogOpen] = useState(false)
  const [tempSelectedDocs, setTempSelectedDocs] = useState<string[]>([])
  const [docSearchQuery, setDocSearchQuery] = useState('')

  // Step 3: 결재선
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([])
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [isDelegating, setIsDelegating] = useState(false)
  const [selectedDelegateId, setSelectedDelegateId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'approver' | 'reviewer'>('approver')
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

    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return false
    }

    if (!reason.trim()) {
      toast.error('사유를 입력해주세요')
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
      if (!expenseReason.trim()) {
        toast.error('지출 사유를 입력해주세요')
        return false
      }
      if (proposalItems.some(item => !item.item.trim() || !item.quantity.trim() || !item.unitPrice.trim())) {
        toast.error('모든 품목 정보를 입력해주세요')
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
    setSelectedRole('approver')

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
        role: selectedRole,
      }

      setApprovalSteps([...approvalSteps, newStep])

      const roleLabel = selectedRole === 'approver' ? '결재자' : '합의자'
      toast.success(`${roleLabel} 추가 완료`, {
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

    try {
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
      const formData: Record<string, unknown> = {
        title,
        reason,
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

        // 총 야근 시간 계산 (소수점 1자리)
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
        const diffMinutes = endMinutes - startMinutes
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
        formData.expense_reason = expenseReason
        formData.items = proposalItems.map(item => ({
          item: item.item,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unitPrice) || 0,
        }))
        const supplyAmount = proposalItems.reduce((sum, item) =>
          sum + (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0), 0)
        formData.supply_amount = supplyAmount
        formData.vat_amount = Math.round(supplyAmount * 0.1)
        formData.total_amount = supplyAmount + Math.round(supplyAmount * 0.1)
        formData.vendor_name = vendorName || null
      }

      if (documentType === 'resignation') {
        formData.employment_date = employmentDate?.toISOString().split('T')[0]
        formData.resignation_date = resignationDate?.toISOString().split('T')[0]
        formData.resignation_type = resignationType
        formData.detail_reason = detailReason || null
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
        formData.detail_description = workTypeDetail || null
      }

      if (selectedExistingDocs.length > 0) {
        formData.attached_documents = selectedExistingDocs
      }

      const result = await submitDocumentRequest({
        employee_id: currentUser.id,
        document_type: documentType,
        title,
        form_data: formData,
        approval_steps: serverApprovalSteps,
        reference_steps: referenceSteps,
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
  const openExistingDocDialog = () => {
    setTempSelectedDocs([...selectedExistingDocs])
    setDocSearchQuery('')
    setIsExistingDocDialogOpen(true)
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
          setExpenseReason('')
          setProposalItems([{ item: '', quantity: '', unitPrice: '' }])
          setVendorName('')
          // 사직서 필드 초기화
          setEmploymentDate(undefined)
          setResignationDate(undefined)
          setResignationType('personal')
          setDetailReason('')
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
          setWorkTypeDetail('')
        }}
      />

      {/* 작성 전 확인사항 - 문서 유형 선택 후 표시 */}
      {documentType && (
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
                  <li
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    • 필수 항목(*)은 반드시 입력해주세요
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    • 결재선은 최소 1명 이상 지정해야 합니다
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    • 제출 후에는 수정이 불가능하니 신중하게 작성해주세요
                  </li>
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

              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="신청 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

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
                          {/* 시작 시간 이후 ~ 익일 06:00 (30분 단위) */}
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
                            // 00:00 ~ 06:00 (익일)
                            for (let i = 0; i <= 12; i++) {
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

                            const diffMinutes = endMinutes - startMinutes
                            const hours = Math.floor(diffMinutes / 60)
                            const minutes = diffMinutes % 60

                            if (minutes === 0) {
                              return `${hours}시간`
                            }
                            return `${hours}시간 ${minutes}분`
                          })()}
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

                  {/* 지출 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="expenseReason">지출 사유 *</Label>
                    <Textarea
                      id="expenseReason"
                      placeholder="지출 사유를 입력하세요"
                      rows={3}
                      value={expenseReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExpenseReason(e.target.value)}
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

                    {/* 금액 계산 */}
                    {proposalItems.some(item => item.quantity && item.unitPrice) && (
                      <div className="space-y-1 pt-2 border-t">
                        {(() => {
                          const supplyAmount = proposalItems.reduce((sum, item) =>
                            sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0)
                          const vatAmount = Math.round(supplyAmount * 0.1)
                          const totalAmount = supplyAmount + vatAmount
                          return (
                            <>
                              <div className="flex justify-between">
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>공급가액</span>
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>{supplyAmount.toLocaleString()}원</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>부가세 (10%)</span>
                                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>{vatAmount.toLocaleString()}원</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t">
                                <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--foreground)' }}>총 금액</span>
                                <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--primary)' }}>{totalAmount.toLocaleString()}원</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* 거래처 */}
                  <div className="space-y-2">
                    <Label htmlFor="vendorName">거래처</Label>
                    <Input
                      id="vendorName"
                      placeholder="거래처명 (선택)"
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

                  {/* 상세 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="detailReason">상세 사유</Label>
                    <Textarea
                      id="detailReason"
                      placeholder="퇴직 사유를 상세히 입력해주세요 (선택)"
                      rows={3}
                      value={detailReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetailReason(e.target.value)}
                    />
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

                  {/* 상세 내역 */}
                  <div className="space-y-2">
                    <Label htmlFor="workTypeDetail">상세 내역</Label>
                    <Textarea
                      id="workTypeDetail"
                      placeholder="상세 내역을 입력하세요 (선택)"
                      rows={3}
                      value={workTypeDetail}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWorkTypeDetail(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 사유 */}
              <div className="space-y-2">
                <Label htmlFor="reason">사유 *</Label>
                <Textarea
                  id="reason"
                  placeholder="신청 사유를 입력하세요"
                  rows={4}
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                />
              </div>

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

              {/* 기존 문서 첨부 */}
              <div className="space-y-2">
                <Label>기존 문서 첨부</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openExistingDocDialog}
                    className="w-full"
                    disabled={existingDocuments.length === 0}
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

                  {existingDocuments.length === 0 && (
                    <p style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4,
                      textAlign: 'center',
                      padding: '8px 0',
                    }}>
                      이전에 제출한 문서가 없습니다
                    </p>
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
                disabled={isSubmitting}
                className="flex-1"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  height: '42px',
                }}
              >
                {isSubmitting ? '제출 중...' : '제출'}
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
                  <Select value={selectedRole} onValueChange={(value: 'approver' | 'reviewer') => setSelectedRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approver">결재자</SelectItem>
                      <SelectItem value="reviewer">합의자</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Select
                value={isDelegating ? selectedDelegateId : selectedApproverId}
                onValueChange={isDelegating ? setSelectedDelegateId : setSelectedApproverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="구성원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.id !== currentUser.id)
                    .map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.position})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
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
            <Select
              value={selectedReferenceId}
              onValueChange={setSelectedReferenceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="구성원 선택" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(m => m.id !== currentUser.id)
                  .map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.position})
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
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

            {existingDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p style={{
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}>
                  이전에 제출한 문서가 없습니다
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
