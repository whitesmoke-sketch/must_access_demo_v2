'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { ApprovalDocumentDetailModal } from '@/components/documents/ApprovalDocumentDetailModal'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/(authenticated)/documents/actions'
import { useRouter } from 'next/navigation'

type LeaveStatus = 'pending' | 'approved' | 'rejected'
type LeaveType = 'annual' | 'half_day' | 'reward'

interface LeaveRequest {
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
  current_step: number | null
  employee?: {
    id: string
    name: string
    department?: { name: string } | { name: string }[] | null
    role?: { name: string } | { name: string }[] | null
  } | { id: string; name: string }[] | null
}

interface ApprovalStep {
  request_id: number
  step_order: number
  status: string
  approver_id: string | null
  approved_at: string | null
  comment: string | null
  approver: { id: string; name: string } | { id: string; name: string }[] | null
}

interface ApprovalStatusClientProps {
  myRequests: LeaveRequest[]
  pendingRequests: LeaveRequest[]
  isAdmin: boolean
  userId: string
  approvalStepsMap: Record<number, ApprovalStep[]>
}

export function ApprovalStatusClient({
  myRequests,
  pendingRequests,
  isAdmin,
  userId,
  approvalStepsMap
}: ApprovalStatusClientProps) {
  const router = useRouter()
  const [approvalTab, setApprovalTab] = useState<'pending' | 'requested'>('pending')
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState<number | null>(null)

  const getEmployeeName = (employee: LeaveRequest['employee']) => {
    if (!employee) return '알 수 없음'
    return Array.isArray(employee) ? employee[0]?.name ?? '알 수 없음' : employee.name
  }

  const handleApprove = async (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation()
    setIsProcessing(requestId)
    try {
      const result = await approveLeaveRequest(requestId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || '승인 처리 중 오류가 발생했습니다.')
      }
    } catch {
      alert('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReject = async (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation()
    setIsProcessing(requestId)
    try {
      const result = await rejectLeaveRequest(requestId, '반려되었습니다')
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || '반려 처리 중 오류가 발생했습니다.')
      }
    } catch {
      alert('반려 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(null)
    }
  }

  // 전체 문서 개수 계산
  const totalPendingCount = pendingRequests.length
  const totalRequestedCount = myRequests.length

  return (
    <Card
      className="rounded-2xl md:col-span-2 lg:col-span-2 flex flex-col"
      style={{
        height: '353.375px'
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <CardTitle style={{
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '24px',
          color: '#29363D'
        }}>
          결재 현황
        </CardTitle>
      </CardHeader>

      {/* Tab Buttons */}
      <div className="px-6 pb-3 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: approvalTab === 'pending' ? '#635BFF' : '#F6F8F9',
              color: approvalTab === 'pending' ? '#FFFFFF' : '#5B6A72',
              fontSize: '14px',
              fontWeight: 500,
            }}
            onClick={() => setApprovalTab('pending')}
          >
            결재 대기 문서
          </button>
          <button
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: approvalTab === 'requested' ? '#635BFF' : '#F6F8F9',
              color: approvalTab === 'requested' ? '#FFFFFF' : '#5B6A72',
              fontSize: '14px',
              fontWeight: 500,
            }}
            onClick={() => setApprovalTab('requested')}
          >
            내가 상신한 문서
          </button>
        </div>
        <p style={{
          fontSize: '14px',
          lineHeight: '19.6px',
          color: '#5B6A72',
          fontWeight: 500
        }}>
          전체 {approvalTab === 'pending' ? totalPendingCount : totalRequestedCount}건
        </p>
      </div>

      <CardContent className="flex-1 overflow-y-auto" style={{ paddingTop: '0' }}>
        {/* 결재 대기 문서 탭 */}
        {approvalTab === 'pending' && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
                <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                  모든 승인 완료
                </p>
                <p className="mt-1" style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                  대기 중인 승인 항목이 없습니다
                </p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 transition-all cursor-pointer hover:bg-[#F6F8F9]"
                  onClick={() => {
                    setSelectedDocument(request)
                    setIsDetailDialogOpen(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                          {getEmployeeName(request.employee)}
                        </p>
                        <LeaveTypeBadge type={request.leave_type} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" style={{ color: '#5B6A72' }} />
                          <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                            {request.start_date} ~ {request.end_date}
                          </p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#00A3FF' }}>
                          {request.requested_days}일
                        </p>
                      </div>
                      <p className="mt-2" style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                        신청일: {new Date(request.requested_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        className="px-3 py-1.5 transition-all flex items-center disabled:opacity-50"
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '14px',
                          borderRadius: '8px',
                        }}
                        disabled={isProcessing === request.id}
                        onClick={(e) => handleApprove(e, request.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        승인
                      </button>
                      <button
                        className="px-3 py-1.5 transition-all flex items-center disabled:opacity-50"
                        style={{
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '14px',
                          borderRadius: '8px',
                        }}
                        disabled={isProcessing === request.id}
                        onClick={(e) => handleReject(e, request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        반려
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 내가 상신한 문서 탭 */}
        {approvalTab === 'requested' && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ fontSize: '16px', lineHeight: '24px', color: '#5B6A72' }}>
                  상신한 문서가 없습니다
                </p>
              </div>
            ) : (
              myRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 transition-all cursor-pointer hover:bg-[#F6F8F9]"
                  onClick={() => {
                    setSelectedDocument(request)
                    setIsDetailDialogOpen(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                          {request.leave_type === 'annual' ? '연차' : request.leave_type === 'half_day' ? '반차' : '포상휴가'}
                        </p>
                        <StatusBadge status={request.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" style={{ color: '#5B6A72' }} />
                          <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                            {request.start_date} ~ {request.end_date}
                          </p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#00A3FF' }}>
                          {request.requested_days}일
                        </p>
                      </div>
                      <p className="mt-2" style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                        신청일: {new Date(request.requested_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      {/* 전체보기 버튼 - 하단 고정 */}
      <div className="px-6 pb-4">
        <Link
          href={approvalTab === 'pending' ? '/documents' : '/documents/my-documents'}
          className="w-full py-3 transition-all block text-center hover:brightness-95"
          style={{
            backgroundColor: '#F6F8F9',
            color: '#5B6A72',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          전체보기
        </Link>
      </div>

      <ApprovalDocumentDetailModal
        document={selectedDocument}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        userId={userId}
        initialApprovalSteps={selectedDocument ? approvalStepsMap[selectedDocument.id] : undefined}
      />
    </Card>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const configs: Record<LeaveStatus, { label: string; backgroundColor: string; color: string }> = {
    pending: {
      label: '대기',
      backgroundColor: '#FEF3C7',
      color: '#92400E'
    },
    approved: {
      label: '승인',
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    rejected: {
      label: '반려',
      backgroundColor: '#FEE2E2',
      color: '#991B1B'
    }
  }

  const config = configs[status]

  return (
    <Badge
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontSize: '14px',
        fontWeight: 600,
        border: 'none'
      }}
    >
      {config.label}
    </Badge>
  )
}

function getLeaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    annual: '연차 신청서',
    half_day: '반차 신청서',
    reward: '포상휴가 신청서'
  }
  return labels[type]
}

function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const configs: Record<LeaveType, { label: string; backgroundColor: string; color: string }> = {
    annual: {
      label: '연차',
      backgroundColor: '#EEF2FF',
      color: '#635BFF'
    },
    half_day: {
      label: '반차',
      backgroundColor: '#EEF2FF',
      color: '#635BFF'
    },
    reward: {
      label: '포상휴가',
      backgroundColor: '#FDF2F8',
      color: '#EC4899'
    }
  }

  const config = configs[type]

  return (
    <Badge
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontSize: '12px',
        fontWeight: 600,
        border: 'none'
      }}
    >
      {config.label}
    </Badge>
  )
}
