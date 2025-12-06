'use client'

import React, { useEffect, useState } from 'react'
import { Check, X, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveDocument, rejectDocument } from '@/app/(authenticated)/documents/actions'

type LeaveType = 'annual' | 'half_day' | 'quarter_day' | 'award'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

interface EmployeeInfo {
  id: string
  name: string
  department: { name: string } | { name: string }[] | null
  role: { name: string } | { name: string }[] | null
}

interface ApprovalDocument {
  id: number
  employee_id: string
  leave_type: LeaveType
  requested_days: number
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  requested_at: string
  approved_at: string | null
  rejected_at: string | null
  retrieved_at: string | null
  current_step: number | null
  employee: EmployeeInfo | EmployeeInfo[] | null
}

interface ApprovalStep {
  id?: string
  step_order: number
  approver_id?: string | null
  status: string
  comment?: string | null
  approved_at?: string | null
  created_at?: string
  // Edge Function 응답 형식
  employee?: {
    name: string
  } | null
  // 페이지에서 전달되는 형식
  approver?: {
    id: string
    name: string
  } | { id: string; name: string }[] | null
}

interface CCPerson {
  id: string
  employee_id: string
  employee?: {
    id: string
    name: string
    department?: { name: string } | { name: string }[] | null
    role?: { name: string } | { name: string }[] | null
  } | {
    id: string
    name: string
    department?: { name: string } | { name: string }[] | null
    role?: { name: string } | { name: string }[] | null
  }[] | null
  read_at: string | null
  created_at: string
}

interface ApprovalDocumentDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: ApprovalDocument | null
  userId: string
  initialApprovalSteps?: ApprovalStep[]
  ccList?: CCPerson[]
}

const getStatusBadge = (status: LeaveStatus) => {
  const styles: Record<string, { backgroundColor: string; color: string }> = {
    pending: { backgroundColor: '#FFF8E5', color: '#FFAE1F' },
    approved: { backgroundColor: 'rgba(76, 212, 113, 0.1)', color: '#4CD471' },
    rejected: { backgroundColor: '#FEE2E2', color: '#EF4444' },
    cancelled: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
    retrieved: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
  }

  const labels: Record<string, string> = {
    pending: '승인 대기',
    approved: '승인',
    rejected: '반려',
    cancelled: '취소',
    retrieved: '회수',
  }

  const defaultStyle = { backgroundColor: '#F6F8F9', color: '#5B6A72' }
  const currentStyle = styles[status] || defaultStyle
  const currentLabel = labels[status] || status || '알 수 없음'

  return (
    <Badge style={{ ...currentStyle, fontSize: '12px', lineHeight: 1.33, fontWeight: 600, padding: '2px 8px' }}>
      {currentLabel}
    </Badge>
  )
}

const getLeaveTypeLabel = (type: LeaveType): string => {
  const labels: Record<string, string> = {
    annual: '연차',
    half_day: '반차',
    half_day_am: '오전 반차',
    half_day_pm: '오후 반차',
    quarter_day: '반반차',
    sick: '병가',
    award: '포상휴가',
  }
  return labels[type] || type || '기타'
}

const getHistoryEventInfo = (status: string) => {
  switch (status) {
    case 'waiting':
      return { label: '대기', color: '#5B6A72', bgColor: '#F6F8F9', icon: ClockIcon }
    case 'pending':
      return { label: '진행중', color: '#F8C653', bgColor: '#FFF8E5', icon: ClockIcon }
    case 'approved':
      return { label: '승인', color: '#4CD471', bgColor: 'rgba(76, 212, 113, 0.1)', icon: CheckCircle }
    case 'rejected':
      return { label: '반려', color: '#FF6B6B', bgColor: '#FFF0ED', icon: XCircle }
    default:
      return { label: status, color: '#5B6A72', bgColor: '#F6F8F9', icon: ClockIcon }
  }
}

export function ApprovalDocumentDetailModal({
  open,
  onOpenChange,
  document,
  userId,
  initialApprovalSteps,
  ccList = [],
}: ApprovalDocumentDetailModalProps) {
  const router = useRouter()
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(initialApprovalSteps || [])
  const [loading, setLoading] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // initialApprovalSteps가 변경되면 상태 업데이트
  useEffect(() => {
    if (initialApprovalSteps) {
      setApprovalSteps(initialApprovalSteps)
    }
  }, [initialApprovalSteps])

  // initialApprovalSteps가 없을 때만 Edge Function 호출
  useEffect(() => {
    if (open && document && !initialApprovalSteps) {
      fetchApprovalSteps()
    }
  }, [open, document, initialApprovalSteps])

  const fetchApprovalSteps = async () => {
    if (!document) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        setLoading(false)
        return
      }

      // Call Edge Function to bypass RLS
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
      const baseUrl = supabaseUrl.replace('/rest/v1', '')
      const edgeFunctionUrl = `${baseUrl}/functions/v1/get-approval-steps`

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestType: 'leave',
          requestId: document.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('Edge Function error:', result.error)
        toast.error('결재 단계를 불러오는데 실패했습니다')
      } else {
        setApprovalSteps(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch approval steps:', error)
      toast.error('결재 단계를 불러오는데 실패했습니다')
    }

    setLoading(false)
  }

  const handleApprove = async () => {
    if (!document) return

    setProcessing(true)
    try {
      const result = await approveDocument(document.id, 'leave')

      if (result.success) {
        toast.success('승인이 완료되었습니다')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || '승인 처리 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('승인 처리 중 오류가 발생했습니다')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectClick = () => {
    setRejectReason('')
    setIsRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!document || !rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요')
      return
    }

    setProcessing(true)
    try {
      const result = await rejectDocument(document.id, rejectReason, 'leave')

      if (result.success) {
        toast.error('반려가 완료되었습니다')
        setIsRejectDialogOpen(false)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || '반려 처리 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('Rejection error:', error)
      toast.error('반려 처리 중 오류가 발생했습니다')
    } finally {
      setProcessing(false)
    }
  }

  // 현재 사용자가 승인할 수 있는지 확인 (순차적 결재)
  // 1. 문서 상태가 pending이어야 함
  // 2. 현재 사용자가 승인자여야 함
  // 3. 현재 사용자의 step_order가 current_step과 일치해야 함 (순차적)
  const canApprove = document?.status === 'pending' && approvalSteps.some(
    step => {
      // approver_id (Edge Function 형식) 또는 approver.id (페이지 형식) 체크
      let approverId: string | null = null
      if (step.approver_id) {
        approverId = step.approver_id
      } else if (step.approver) {
        const approverData = Array.isArray(step.approver) ? step.approver[0] : step.approver
        approverId = approverData?.id || null
      }

      // status가 'pending'인 step만 결재 가능 (현재 차례)
      const isPending = step.status === 'pending'
      // step_order와 current_step 비교 (둘 다 숫자여야 함)
      const isCurrentStep = document.current_step !== null &&
        Number(step.step_order) === Number(document.current_step)

      return approverId === userId && isPending && isCurrentStep
    }
  )

  // employee 객체 추출 (배열일 경우 첫 번째 요소 반환)
  const getEmployee = (employee: EmployeeInfo | EmployeeInfo[] | null | undefined): EmployeeInfo | null => {
    if (!employee) return null
    return Array.isArray(employee) ? employee[0] || null : employee
  }

  const getDepartmentName = (department: { name: string } | { name: string }[] | null | undefined): string => {
    if (!department) return '-'
    return Array.isArray(department) ? department[0]?.name || '-' : department.name
  }

  if (!document) return null

  const employee = getEmployee(document.employee)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, color: '#29363D' }}>
              연차 신청 상세
            </DialogTitle>
            <DialogDescription style={{ fontSize: '16px', lineHeight: 1.5, color: '#5B6A72' }}>
              문서 상세 정보를 확인하세요
            </DialogDescription>
          </DialogHeader>

          <Card className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-4 p-6">
            {/* 신청자 / 연차 유형 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>신청자</p>
                <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#29363D' }}>
                  {employee?.name || '알 수 없음'}
                </p>
              </div>
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>연차 유형</p>
                <div className="mt-1">
                  <Badge style={{ backgroundColor: 'rgba(99,91,255,0.1)', color: '#635BFF', fontSize: '12px', lineHeight: 1.33, fontWeight: 600, padding: '2px 8px' }}>
                    {getLeaveTypeLabel(document.leave_type)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 소속 */}
            <div className="space-y-1">
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>소속</p>
              <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#29363D' }}>
                {getDepartmentName(employee?.department)}
              </p>
            </div>

            {/* 시작일 / 종료일 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>시작일</p>
                <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#29363D' }}>
                  {new Date(document.start_date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).replace(/\. /g, '-').replace('.', '')}
                </p>
              </div>
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>종료일</p>
                <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#29363D' }}>
                  {new Date(document.end_date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).replace(/\. /g, '-').replace('.', '')}
                </p>
              </div>
            </div>

            {/* 사용일수 */}
            <div className="space-y-1">
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>사용일수</p>
              <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, color: '#29363D' }}>
                {document.requested_days}일
              </p>
            </div>

            {/* 사유 */}
            <div className="space-y-1">
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>사유</p>
              <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#29363D' }}>
                {document.reason || '-'}
              </p>
            </div>

            {/* 신청 시간 */}
            <div className="space-y-1">
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>신청 시간</p>
              <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#29363D' }}>
                {new Date(document.requested_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </p>
            </div>

            {/* 상태 */}
            <div className="space-y-1">
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>상태</p>
              <div className="mt-1">
                {getStatusBadge(document.status)}
              </div>
            </div>

            {/* 승인/반려/회수 시간 */}
            {document.approved_at && (
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>승인 시간</p>
                <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#29363D' }}>
                  {new Date(document.approved_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            {document.rejected_at && (
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>반려 시간</p>
                <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#29363D' }}>
                  {new Date(document.rejected_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            {document.retrieved_at && (
              <div className="space-y-1">
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#5B6A72' }}>회수 시간</p>
                <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#29363D' }}>
                  {new Date(document.retrieved_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* 결재 상태 로그 */}
            {approvalSteps.length > 0 && (
              <div className="space-y-3 pt-5" style={{ borderTop: '1px solid #E5E8EB' }}>
                <p style={{ fontSize: '16px', fontWeight: 500, lineHeight: '24px', color: '#29363D' }}>
                  결재 상태 로그
                </p>
                <div className="space-y-3">
                  {approvalSteps.map((step) => {
                    const eventInfo = getHistoryEventInfo(step.status)
                    const EventIcon = eventInfo.icon

                    return (
                      <div
                        key={step.id}
                        className="pl-4 pr-3 pt-3 pb-0"
                        style={{
                          borderLeft: `4px solid ${eventInfo.color}`
                        }}
                      >
                        <div className="flex items-start gap-3 pb-3">
                          <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '16px',
                              backgroundColor: eventInfo.bgColor
                            }}
                          >
                            <EventIcon className="w-4 h-4" style={{ color: eventInfo.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Badge style={{
                                backgroundColor: eventInfo.bgColor,
                                color: eventInfo.color,
                                fontSize: '12px',
                                lineHeight: '16px',
                                fontWeight: 600,
                                padding: '2px 8px'
                              }}>
                                {step.step_order}단계 - {eventInfo.label}
                              </Badge>
                              {step.approved_at && (
                                <p style={{ fontSize: '12px', lineHeight: '18px', color: '#5B6A72' }}>
                                  {new Date(step.approved_at).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              )}
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '21px', color: '#29363D' }}>
                              {step.employee
                                ? (Array.isArray(step.employee) ? step.employee[0]?.name : step.employee.name) || '알 수 없음'
                                : step.approver
                                  ? (Array.isArray(step.approver) ? step.approver[0]?.name : step.approver.name) || '알 수 없음'
                                  : '대기중'}
                            </p>
                            {step.comment && (
                              <p style={{ fontSize: '14px', lineHeight: '21px', color: '#5B6A72' }}>
                                {step.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 참조자 목록 */}
            {ccList.length > 0 && (
              <div className="space-y-3 pt-5" style={{ borderTop: '1px solid #E5E8EB' }}>
                <p style={{ fontSize: '16px', fontWeight: 500, lineHeight: '24px', color: '#29363D' }}>
                  참조자 ({ccList.length}명)
                </p>
                <div className="space-y-2">
                  {ccList.map((cc) => {
                    const ccEmployee = cc.employee
                      ? Array.isArray(cc.employee) ? cc.employee[0] : cc.employee
                      : null
                    const ccName = ccEmployee?.name || '알 수 없음'
                    const ccDept = ccEmployee?.department
                      ? Array.isArray(ccEmployee.department)
                        ? ccEmployee.department[0]?.name
                        : ccEmployee.department.name
                      : ''
                    const ccRole = ccEmployee?.role
                      ? Array.isArray(ccEmployee.role)
                        ? ccEmployee.role[0]?.name
                        : ccEmployee.role.name
                      : ''

                    return (
                      <div
                        key={cc.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: '#F6F8F9' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '16px',
                              backgroundColor: cc.read_at ? 'rgba(76, 212, 113, 0.1)' : '#E5E8EB',
                            }}
                          >
                            {cc.read_at ? (
                              <CheckCircle className="w-4 h-4" style={{ color: '#4CD471' }} />
                            ) : (
                              <ClockIcon className="w-4 h-4" style={{ color: '#5B6A72' }} />
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '21px', color: '#29363D' }}>
                              {ccName}
                            </p>
                            {(ccDept || ccRole) && (
                              <p style={{ fontSize: '12px', lineHeight: '18px', color: '#5B6A72' }}>
                                {ccDept}{ccDept && ccRole ? ' · ' : ''}{ccRole}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {cc.read_at ? (
                            <>
                              <Badge style={{
                                backgroundColor: 'rgba(76, 212, 113, 0.1)',
                                color: '#4CD471',
                                fontSize: '12px',
                                lineHeight: '16px',
                                fontWeight: 600,
                                padding: '2px 8px'
                              }}>
                                열람완료
                              </Badge>
                              <p style={{ fontSize: '11px', lineHeight: '16px', color: '#5B6A72', marginTop: '4px' }}>
                                {new Date(cc.read_at).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </>
                          ) : (
                            <Badge style={{
                              backgroundColor: '#E5E8EB',
                              color: '#5B6A72',
                              fontSize: '12px',
                              lineHeight: '16px',
                              fontWeight: 600,
                              padding: '2px 8px'
                            }}>
                              미열람
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            </div>
          </Card>

          <DialogFooter>
            {canApprove && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  style={{
                    backgroundColor: '#10B981',
                    color: 'white',
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  승인
                </Button>
                <Button
                  onClick={handleRejectClick}
                  disabled={processing}
                  style={{
                    backgroundColor: '#EF4444',
                    color: 'white',
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  반려
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 사유 입력 다이얼로그 */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontSize: '18px', fontWeight: 500, lineHeight: 1.3 }}>
              반려 사유 입력
            </DialogTitle>
            <DialogDescription style={{ fontSize: '14px', lineHeight: 1.5 }}>
              {employee?.name}님의 연차 신청 반려 사유를 입력해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejectReason" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>
              반려 사유 *
            </Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              rows={4}
              style={{ fontSize: '14px', lineHeight: 1.5 }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false)
                setRejectReason('')
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
              }}
            >
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
