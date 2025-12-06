import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Calendar } from 'lucide-react'

type LeaveStatus = 'pending' | 'approved' | 'rejected'
type LeaveType = 'annual' | 'half_day' | 'reward'

interface LeaveRequest {
  id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  requester?: {
    name: string
  }[] | { name: string } | null
}

interface ApprovalStatusProps {
  employeeId: string
}

export async function ApprovalStatus({ employeeId }: ApprovalStatusProps) {
  const supabase = await createClient()

  // Parallel queries for better performance (새 시스템: document_master + doc_leave)
  const [myRequestsResult, employeeResult] = await Promise.all([
    // 내가 요청한 문서 (최근 3건) - 새 시스템
    supabase
      .from('document_master')
      .select(`
        id,
        status,
        doc_leave (
          leave_type,
          start_date,
          end_date
        )
      `)
      .eq('requester_id', employeeId)
      .eq('doc_type', 'leave')
      .order('created_at', { ascending: false })
      .limit(3),
    // 사용자 역할 확인
    supabase
      .from('employee')
      .select('role:role_id(code)')
      .eq('id', employeeId)
      .maybeSingle()
  ])

  // 데이터 변환 (document_master + doc_leave → LeaveRequest 형태)
  const myRequests: LeaveRequest[] = (myRequestsResult.data || []).map(req => {
    const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave
    return {
      id: req.id,
      leave_type: (docLeave?.leave_type || 'annual') as LeaveType,
      start_date: docLeave?.start_date || '',
      end_date: docLeave?.end_date || '',
      status: req.status as LeaveStatus,
    }
  })

  // Type-safe role check
  const role = employeeResult.data?.role as { code: string } | { code: string }[] | null
  const isAdmin = role
    ? Array.isArray(role)
      ? role[0]?.code === 'admin'
      : role?.code === 'admin'
    : false

  // 결재 대기 문서 (내가 승인자인 문서, approval_step 기반)
  let pendingRequests: LeaveRequest[] = []

  // approval_step에서 내가 승인자인 pending 건 조회
  const { data: myApprovalSteps, error: approvalError } = await supabase
    .from('approval_step')
    .select('request_id, request_type, step_order, status')
    .eq('approver_id', employeeId)
    .eq('status', 'pending')
    .eq('request_type', 'leave')
    .limit(3)



  if (myApprovalSteps && myApprovalSteps.length > 0) {
    // approval_step의 request_id로 document_master + doc_leave 조회 (새 시스템)
    const requestIds = myApprovalSteps.map(s => s.request_id)
    const { data: leaveRequests } = await supabase
      .from('document_master')
      .select(`
        id,
        status,
        requester:requester_id(name),
        doc_leave (
          leave_type,
          start_date,
          end_date
        )
      `)
      .eq('doc_type', 'leave')
      .in('id', requestIds)

    if (leaveRequests) {
      pendingRequests = leaveRequests.map(req => {
        const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave
        return {
          id: req.id,
          leave_type: (docLeave?.leave_type || 'annual') as LeaveType,
          start_date: docLeave?.start_date || '',
          end_date: docLeave?.end_date || '',
          status: req.status as LeaveStatus,
          requester: req.requester,
        }
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>결재 현황</span>
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              전체보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 내가 요청한 문서 */}
        <div>
          <h4 className="font-semibold mb-3">내가 요청한 문서</h4>
          <div className="space-y-2">
            {myRequests && myRequests.length > 0 ? (
              myRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getLeaveTypeLabel(request.leave_type)}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {request.start_date} ~ {request.end_date}
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                신청 내역이 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 결재 대기 문서 (내가 승인자인 문서) */}
        {pendingRequests.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">결재 대기 문서</h4>
            <div className="space-y-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {Array.isArray(request.requester)
                          ? request.requester[0]?.name ?? '알 수 없음'
                          : request.requester?.name ?? '알 수 없음'} - {getLeaveTypeLabel(request.leave_type)}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {request.start_date} ~ {request.end_date}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  대기 중인 문서가 없습니다
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const configs: Record<LeaveStatus, { label: string; className: string }> = {
    pending: {
      label: '대기',
      className: 'bg-yellow-100 text-yellow-700'
    },
    approved: {
      label: '승인',
      className: 'bg-green-100 text-green-700'
    },
    rejected: {
      label: '반려',
      className: 'bg-red-100 text-red-700'
    }
  }

  const config = configs[status]

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

function getLeaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    annual: '연차',
    half_day: '반차',
    reward: '포상휴가'
  }
  return labels[type]
}
