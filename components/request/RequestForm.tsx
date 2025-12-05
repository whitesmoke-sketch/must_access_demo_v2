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
  | 'half_day'
  | 'reward_leave'
  | 'condolence'
  | 'overtime'
  | 'expense'
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
  reward_leave_balance?: number
  reward_total?: number
  reward_used?: number
  reward_remaining?: number
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
  const validDocumentTypes: DocumentType[] = ['annual_leave', 'half_day', 'reward_leave', 'condolence', 'overtime', 'expense', 'other']
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

  // 야근수당
  const [overtimeDate, setOvertimeDate] = useState<Date>()
  const [overtimeHours, setOvertimeHours] = useState('')

  // 지출결의서 - 다중 항목 지원
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([{ item: '', amount: '' }])
  const [paymentMethod, setPaymentMethod] = useState('')

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

  // 주말 여부 확인 함수
  const isWeekend = (date: Date) => {
    const day = date.getDay()
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
        // 주말(토,일)은 제외
        if (!isWeekend(current)) {
          dateList.push(current.toISOString().split('T')[0])
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
    let approvalType = 'leave' // 기본값
    if (docType === 'expense') {
      approvalType = 'expense'
    } else if (docType === 'overtime') {
      approvalType = 'overtime'
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
  const isLeaveType = documentType === 'annual_leave' || documentType === 'half_day' || documentType === 'reward_leave'

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

    if (documentType === 'half_day') {
      return leaveType === 'half' ? 0.5 : leaveType === 'quarter' ? 0.25 : diffDays
    }

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

      // 포상휴가인 경우 포상휴가 잔액 체크
      if (documentType === 'reward_leave') {
        const remainingReward = balance?.reward_remaining || 0
        if (calculatedDays > remainingReward) {
          toast.error(`잔여 포상휴가가 부족합니다 (필요: ${calculatedDays}일, 잔여: ${remainingReward}일)`)
          return false
        }
      } else {
        // 연차/반차인 경우 연차 잔액 체크
        const remainingDays = balance?.remaining_days || 0
        if (calculatedDays > remainingDays) {
          toast.error(`잔여 연차가 부족합니다 (필요: ${calculatedDays}일, 잔여: ${remainingDays}일)`)
          return false
        }
      }
    }

    // 경조사비 검증
    if (documentType === 'condolence') {
      if (!condolenceType || !targetName || !relationship) {
        toast.error('경조사 정보를 모두 입력해주세요')
        return false
      }
    }

    // 야근수당 검증
    if (documentType === 'overtime') {
      if (!overtimeDate || !overtimeHours) {
        toast.error('야근 날짜와 시간을 입력해주세요')
        return false
      }
    }

    // 지출결의서 검증
    if (documentType === 'expense') {
      if (expenseItems.some(item => !item.item.trim() || !item.amount.trim())) {
        toast.error('모든 지출 항목과 금액을 입력해주세요')
        return false
      }
      if (!paymentMethod) {
        toast.error('결제수단을 선택해주세요')
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
        formData.leave_type = documentType === 'annual_leave' ? 'annual' : documentType === 'half_day' ? 'half_day' : 'award'
        formData.requested_days = calculatedDays
        formData.start_date = startDate?.toISOString().split('T')[0]
        formData.end_date = endDate?.toISOString().split('T')[0]
        if (documentType === 'annual_leave') {
          formData.date_details = dateDetails
        }
        if (documentType === 'half_day') {
          formData.half_day_slot = halfDaySlot
        }
      }

      if (documentType === 'condolence') {
        formData.condolence_type = condolenceType
        formData.target_name = targetName
        formData.relationship = relationship
      }

      if (documentType === 'overtime') {
        formData.overtime_date = overtimeDate?.toISOString().split('T')[0]
        formData.overtime_hours = parseFloat(overtimeHours)
      }

      if (documentType === 'expense') {
        formData.expense_items = expenseItems.map(item => ({
          item: item.item,
          amount: parseFloat(item.amount),
        }))
        formData.payment_method = paymentMethod
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
    'half_day': '반차',
    'reward_leave': '포상휴가',
    'condolence': '경조사비',
    'overtime': '야근수당',
    'expense': '지출결의서',
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
        }}
      />

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

              {/* 연차 정보 카드 */}
              {isLeaveType && (
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder="종료일 선택"
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder="종료일 선택"
                      />
                    </div>
                  </div>

                  {calculatedDays > 0 && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: 'rgba(255, 102, 146, 0.05)' }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6692' }} />
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
                          신청 후 잔여 포상휴가: {(balance?.reward_remaining || 0) - calculatedDays}일
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {documentType === 'half_day' && (
                <>
                  <div className="space-y-2">
                    <Label>날짜 *</Label>
                    <DatePicker
                      date={startDate}
                      onDateChange={(date) => {
                        setStartDate(date)
                        setEndDate(date)
                      }}
                      placeholder="날짜 선택"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>반차 구분 *</Label>
                    <Select value={halfDaySlot} onValueChange={(value: 'morning' | 'afternoon') => setHalfDaySlot(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">오전 반차</SelectItem>
                        <SelectItem value="afternoon">오후 반차</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetName">대상자 이름 *</Label>
                      <Input
                        id="targetName"
                        placeholder="이름"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">관계 *</Label>
                      <Input
                        id="relationship"
                        placeholder="예: 본인, 부모, 자녀"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {documentType === 'overtime' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>야근 날짜 *</Label>
                    <DatePicker
                      date={overtimeDate}
                      onDateChange={setOvertimeDate}
                      placeholder="야근 날짜 선택"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtimeHours">야근 시간 *</Label>
                    <Input
                      id="overtimeHours"
                      type="number"
                      placeholder="시간 입력 (예: 2.5)"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {documentType === 'expense' && (
                <>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">결제수단 *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="결제수단 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate_card">법인카드</SelectItem>
                        <SelectItem value="cash">현금</SelectItem>
                        <SelectItem value="transfer">계좌이체</SelectItem>
                      </SelectContent>
                    </Select>
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
