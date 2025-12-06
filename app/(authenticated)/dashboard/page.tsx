import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkStatusCard } from '@/components/dashboard/WorkStatusCard'
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ApprovalStatusClient } from '@/components/dashboard/ApprovalStatusClient'
import { MyReservationsCard } from '@/components/dashboard/MyReservationsCard'
import { TodayOnLeaveCard } from '@/components/dashboard/TodayOnLeaveCard'
import { StudioAccessCard } from '@/components/dashboard/StudioAccessCard'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // Parallel queries for better performance (새 시스템: document_master + doc_leave)
  const [employeeResult, myRequestsResult, employeeRoleResult, todayLeaveResult] = await Promise.all([
    // 사용자 정보 조회
    supabase
      .from('employee')
      .select('id, name, department:department_id(name)')
      .eq('id', user.id)
      .maybeSingle(),
    // 내가 요청한 문서 (최근 3건) - 새 시스템
    supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        status,
        current_step,
        created_at,
        approved_at,
        requester:requester_id(id, name, department:department_id(name), role:role_id(name)),
        doc_leave (
          leave_type,
          start_date,
          end_date,
          days_count,
          reason
        )
      `)
      .eq('requester_id', user.id)
      .eq('doc_type', 'leave')
      .order('created_at', { ascending: false })
      .limit(3),
    // 사용자 역할 확인
    supabase
      .from('employee')
      .select('role:role_id(code)')
      .eq('id', user.id)
      .maybeSingle(),
    // 오늘 연차인 멤버 조회 (승인된 연차만) - 새 시스템
    supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        requester:requester_id(id, name, department:department_id(name)),
        doc_leave!inner (
          leave_type,
          start_date,
          end_date
        )
      `)
      .eq('doc_type', 'leave')
      .eq('status', 'approved')
  ])

  const employee = employeeResult.data
  const myRequestsRaw = myRequestsResult.data || []
  const todayLeaveRequests = todayLeaveResult.data || []

  // document_master + doc_leave → LeaveRequest 형태로 변환
  const myRequests = myRequestsRaw.map(req => {
    const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave
    return {
      id: req.id,
      employee_id: req.requester_id,
      leave_type: docLeave?.leave_type || 'annual',
      requested_days: docLeave?.days_count || 0,
      start_date: docLeave?.start_date || '',
      end_date: docLeave?.end_date || '',
      reason: docLeave?.reason || null,
      status: req.status,
      requested_at: req.created_at,
      approved_at: req.approved_at,
      current_step: req.current_step,
      employee: req.requester,
    }
  })

  // 오늘 연차인 멤버 데이터 처리 (새 시스템: document_master + doc_leave)
  const todayOnLeaveMembers = todayLeaveRequests
    .filter((request) => {
      // doc_leave에서 오늘 날짜가 연차 기간에 포함되는지 확인
      const docLeave = Array.isArray(request.doc_leave) ? request.doc_leave[0] : request.doc_leave
      if (!docLeave) return false
      return docLeave.start_date <= today && docLeave.end_date >= today
    })
    .map((request) => {
      const emp = request.requester as { id: string; name: string; department?: { name: string } | { name: string }[] | null } | { id: string; name: string }[] | null
      if (!emp) return null
      const empData = Array.isArray(emp) ? emp[0] : emp
      if (!empData) return null

      const dept = 'department' in empData ? empData.department : null
      const deptName = dept ? (Array.isArray(dept) ? dept[0]?.name : (dept as { name: string })?.name) || '' : ''

      const docLeave = Array.isArray(request.doc_leave) ? request.doc_leave[0] : request.doc_leave

      return {
        id: empData.id,
        name: empData.name,
        department: deptName,
        team: '', // team 정보가 없으면 빈 문자열
        leaveType: docLeave?.leave_type || 'annual',
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    // 중복 제거 (같은 사람이 여러 연차가 있을 수 있음)
    .filter((member, index, self) =>
      index === self.findIndex(m => m.id === member.id)
    )

  // Type-safe role check
  const role = employeeRoleResult.data?.role as { code: string } | { code: string }[] | null
  const isAdmin = role
    ? Array.isArray(role)
      ? role[0]?.code === 'admin'
      : role?.code === 'admin'
    : false

  // 결재 대기 문서 (내가 결재해야 할 문서들)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pendingRequests: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let approvalStepsMap: Record<number, any[]> = {}

  try {
    // approval_step에서 나에게 할당된 pending 문서 조회
    const { data: myPendingSteps, error: stepsError } = await supabase
      .from('approval_step')
      .select('request_id')
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .limit(10)

    if (!stepsError && myPendingSteps && myPendingSteps.length > 0) {
      const requestIds = myPendingSteps.map(step => step.request_id)

      // 병렬로 document_master + doc_leave와 approval_steps 조회 (새 시스템)
      const [leaveResult, stepsResult] = await Promise.all([
        supabase
          .from('document_master')
          .select(`
            id,
            requester_id,
            status,
            current_step,
            created_at,
            approved_at,
            requester:requester_id(id, name, department:department_id(name), role:role_id(name)),
            doc_leave (
              leave_type,
              start_date,
              end_date,
              days_count,
              reason
            )
          `)
          .eq('doc_type', 'leave')
          .in('id', requestIds)
          .order('created_at', { ascending: true })
          .limit(3),
        supabase
          .from('approval_step')
          .select('request_id, step_order, status, approver_id, approved_at, comment, approver:approver_id(id, name)')
          .eq('request_type', 'leave')
          .in('request_id', requestIds)
          .order('step_order', { ascending: true })
      ])

      // document_master + doc_leave → LeaveRequest 형태로 변환
      pendingRequests = (leaveResult.data || []).map(req => {
        const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave
        return {
          id: req.id,
          employee_id: req.requester_id,
          leave_type: docLeave?.leave_type || 'annual',
          requested_days: docLeave?.days_count || 0,
          start_date: docLeave?.start_date || '',
          end_date: docLeave?.end_date || '',
          reason: docLeave?.reason || null,
          status: req.status,
          requested_at: req.created_at,
          approved_at: req.approved_at,
          current_step: req.current_step,
          employee: req.requester,
        }
      })

      // approval steps를 request_id별로 그룹핑
      if (stepsResult.data) {
        for (const step of stepsResult.data) {
          if (!approvalStepsMap[step.request_id]) {
            approvalStepsMap[step.request_id] = []
          }
          approvalStepsMap[step.request_id].push(step)
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch pending requests:', error)
  }

  // 내 요청 문서들의 approval steps도 조회
  if (myRequests.length > 0) {
    const myRequestIds = myRequests.map(r => r.id)
    const { data: mySteps } = await supabase
      .from('approval_step')
      .select('request_id, step_order, status, approver_id, approved_at, comment, approver:approver_id(id, name)')
      .eq('request_type', 'leave')
      .in('request_id', myRequestIds)
      .order('step_order', { ascending: true })

    if (mySteps) {
      for (const step of mySteps) {
        if (!approvalStepsMap[step.request_id]) {
          approvalStepsMap[step.request_id] = []
        }
        approvalStepsMap[step.request_id].push(step)
      }
    }
  }

  // 현재 날짜 및 시간
  const now = new Date()
  const dateString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4">
        <h2 style={{
          fontSize: '22px',
          fontWeight: 500,
          lineHeight: '27.5px',
          color: '#29363D'
        }}>
          안녕하세요 {employee?.name}님!
        </h2>
        <p style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#5B6A72',
          marginTop: '4px'
        }}>
          {dateString}
        </p>
      </div>

      {/* Main Grid - 피그마 디자인: 모든 카드가 하나의 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. 근무 상태 */}
        <WorkStatusCard employeeId={user.id} />

        {/* 2. 연차 요약 */}
        <LeaveBalanceCard employeeId={user.id} />

        {/* 3. 빠른 메뉴 */}
        <QuickActions />

        {/* 4. 나의 예약 현황 */}
        <MyReservationsCard employeeId={user.id} />

        {/* 5. 결재 현황 (2열 차지) */}
        <div className="md:col-span-2 lg:col-span-2">
          <ApprovalStatusClient
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            myRequests={myRequests as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pendingRequests={pendingRequests as any}
            isAdmin={isAdmin}
            userId={user.id}
            approvalStepsMap={approvalStepsMap}
          />
        </div>

        {/* 6. 오늘 연차인 멤버 */}
        <TodayOnLeaveCard members={todayOnLeaveMembers} />

        {/* 7. 지하1층 스튜디오 */}
        <StudioAccessCard status="restricted" reason="브랜드 리뉴얼 프로젝트 촬영" />
      </div>
    </div>
  )
}
