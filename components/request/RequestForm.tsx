'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DocumentTypeSelector } from './DocumentTypeSelector'
import { LeaveBalanceCards } from './LeaveBalanceCards'
import { ApprovalLineEditor, type ApprovalStep as EditorApprovalStep } from '@/components/approval/approval-line-editor'
import { ApprovalTemplateLoadModal } from '@/components/approval/approval-template-modal'
import { ApprovalTemplateSaveModal } from '@/components/approval/approval-template-save-modal'
import { ReferenceSelector } from './ReferenceSelector'
import { submitDocumentRequest } from '@/app/actions/document'
import { generateDefaultApprovers } from '@/app/actions/approval'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'

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
}

interface RequestFormProps {
  currentUser: CurrentUser
  balance: Balance | null
  members: Member[]
}

export function RequestForm({ currentUser, balance, members }: RequestFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: 문서 유형
  const [documentType, setDocumentType] = useState<DocumentType | ''>('')

  // 공통 필드
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')

  // 연차 관련
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [leaveType, setLeaveType] = useState<'full' | 'half' | 'quarter'>('full')
  const [halfDaySlot, setHalfDaySlot] = useState<'morning' | 'afternoon'>('morning')

  // 경조사비
  const [condolenceType, setCondolenceType] = useState('')
  const [targetName, setTargetName] = useState('')
  const [relationship, setRelationship] = useState('')

  // 야근수당
  const [overtimeDate, setOvertimeDate] = useState<Date>()
  const [overtimeHours, setOvertimeHours] = useState('')

  // 지출결의서
  const [expenseItem, setExpenseItem] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  // Step 3: 결재선
  const [approvalSteps, setApprovalSteps] = useState<EditorApprovalStep[]>([])
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Step 4: 참조자
  const [referenceSteps, setReferenceSteps] = useState<ReferenceStep[]>([])

  // 자동 결재선 생성 (컴포넌트 마운트 시)
  useEffect(() => {
    if (approvalSteps.length === 0) {
      loadDefaultApprovers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDefaultApprovers() {
    const result = await generateDefaultApprovers('leave')
    if (result.success && result.data) {
      const defaultSteps: EditorApprovalStep[] = result.data.map((approver) => ({
        id: approver.id,
        name: approver.name,
        email: approver.email || '',
        role: approver.role.name,
        department: approver.department?.name || '',
      }))
      setApprovalSteps(defaultSteps)
      toast.success('자동 결재선이 설정되었습니다')
    }
  }

  function handleLoadTemplate(template: {
    approvers: Array<{
      id: string
      name: string
      email: string
      role: string
      department: string
    }>
  }) {
    const loadedSteps: EditorApprovalStep[] = template.approvers.map((approver) => ({
      id: approver.id,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      department: approver.department,
    }))
    setApprovalSteps(loadedSteps)
    toast.success('템플릿을 불러왔습니다')
    setShowLoadModal(false)
  }

  // 연차 관련 문서 여부
  const isLeaveType = documentType === 'annual_leave' || documentType === 'half_day' || documentType === 'reward_leave'

  // 일수 계산
  const calculateDays = () => {
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

      const remainingDays = balance?.remaining_days || 0
      if (calculatedDays > remainingDays) {
        toast.error(`잔여 연차가 부족합니다 (필요: ${calculatedDays}일, 잔여: ${remainingDays}일)`)
        return false
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
      if (!expenseItem || !expenseAmount || !paymentMethod) {
        toast.error('지출 정보를 모두 입력해주세요')
        return false
      }
    }

    if (approvalSteps.length === 0) {
      toast.error('최소 1명의 결재자를 지정해주세요')
      return false
    }

    return true
  }

  // 제출 처리
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // 결재선을 서버 형식으로 변환
      const serverApprovalSteps: ServerApprovalStep[] = approvalSteps.map((step, index) => ({
        order: index + 1,
        approverId: step.id,
        approverName: step.name,
        approverPosition: step.role,
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
        formData.expense_item = expenseItem
        formData.expense_amount = parseFloat(expenseAmount)
        formData.payment_method = paymentMethod
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

  const handleCancel = () => {
    router.back()
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
                <LeaveBalanceCards balance={balance} />
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
              {(documentType === 'annual_leave' || documentType === 'reward_leave') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>시작일 *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP', { locale: ko }) : '날짜 선택'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>종료일 *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP', { locale: ko }) : '날짜 선택'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>사용 일수</Label>
                    <Input
                      value={`${calculatedDays}일`}
                      disabled
                      style={{ backgroundColor: 'var(--muted)' }}
                    />
                  </div>
                </>
              )}

              {documentType === 'half_day' && (
                <>
                  <div className="space-y-2">
                    <Label>날짜 *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date)
                            setEndDate(date)
                          }}
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>유형 *</Label>
                    <RadioGroup value={leaveType} onValueChange={(value: 'full' | 'half' | 'quarter') => setLeaveType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full">종일 (1일)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="half" id="half" />
                        <Label htmlFor="half">반차 (0.5일)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quarter" id="quarter" />
                        <Label htmlFor="quarter">시간차 (0.25일)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {leaveType === 'half' && (
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
                    <Label htmlFor="targetName">대상자 이름 *</Label>
                    <Input
                      id="targetName"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">관계 *</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger id="relationship">
                        <SelectValue placeholder="관계 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">본인</SelectItem>
                        <SelectItem value="parent">부모</SelectItem>
                        <SelectItem value="child">자녀</SelectItem>
                        <SelectItem value="spouse">배우자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {documentType === 'overtime' && (
                <>
                  <div className="space-y-2">
                    <Label>야근 날짜 *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {overtimeDate ? format(overtimeDate, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={overtimeDate}
                          onSelect={setOvertimeDate}
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
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
                </>
              )}

              {documentType === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="expenseItem">지출 항목 *</Label>
                    <Input
                      id="expenseItem"
                      placeholder="지출 항목 입력"
                      value={expenseItem}
                      onChange={(e) => setExpenseItem(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenseAmount">금액 *</Label>
                    <Input
                      id="expenseAmount"
                      type="number"
                      placeholder="금액 입력"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
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
            </CardContent>
          </Card>

          {/* Step 3: 결재선 지정 */}
          <Card className="rounded-2xl" style={{
            borderRadius: 'var(--radius)',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
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
              <ApprovalLineEditor
                approvers={approvalSteps}
                onApproversChange={setApprovalSteps}
                onLoadTemplate={() => setShowLoadModal(true)}
                onSaveTemplate={() => setShowSaveModal(true)}
                showTemplateButtons={true}
              />
            </CardContent>
          </Card>

          {/* Step 4: 참조자 지정 */}
          <ReferenceSelector
            referenceSteps={referenceSteps}
            setReferenceSteps={setReferenceSteps}
            members={members}
          />

          {/* 하단 고정 버튼 */}
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-white z-20">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? '제출 중...' : '제출'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 템플릿 불러오기 모달 */}
      <ApprovalTemplateLoadModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        requestType="leave"
        onSelectTemplate={handleLoadTemplate}
      />

      {/* 템플릿 저장 모달 */}
      <ApprovalTemplateSaveModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        requestType="leave"
        approvers={approvalSteps}
      />
    </div>
  )
}
