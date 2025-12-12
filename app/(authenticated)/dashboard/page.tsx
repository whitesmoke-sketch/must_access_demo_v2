import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkStatusCard } from '@/components/dashboard/WorkStatusCard'
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ApprovalStatusClient } from '@/components/dashboard/ApprovalStatusClient'
import { MyReservationsCard } from '@/components/dashboard/MyReservationsCard'
import { TodayOnLeaveCard } from '@/components/dashboard/TodayOnLeaveCard'
import { StudioAccessCard } from '@/components/dashboard/StudioAccessCard'
import { LiveDateTime } from '@/components/common/LiveDateTime'

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // Parallel queries for better performance (doc_data JSONB)
  const [employeeResult, myRequestsResult, employeeRoleResult, todayLeaveResult] = await Promise.all([
    // 사용자 정보 조회
    supabase
      .from('employee')
      .select('id, name, department:department_id(name)')
      .eq('id', user.id)
      .maybeSingle(),
    // 내가 요청한 문서 (최근 3건) - doc_data JSONB
    supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        status,
        current_step,
        created_at,
        approved_at,
        doc_data,
        requester:requester_id(id, name, department:department_id(name), role:role_id(name))
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
    // 오늘 연차인 멤버 조회 (승인된 연차만) - doc_data JSONB
    supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        doc_data,
        requester:requester_id(id, name, department:department_id(name))
      `)
      .eq('doc_type', 'leave')
      .eq('status', 'approved')
  ])

  const employee = employeeResult.data
  const myRequestsRaw = myRequestsResult.data || []
  const todayLeaveRequests = todayLeaveResult.data || []

  // document_master.doc_data → LeaveRequest 형태로 변환
  const myRequests = myRequestsRaw.map(req => {
    const docData = req.doc_data || {}
    return {
      id: req.id,
      employee_id: req.requester_id,
      leave_type: docData.leave_type || 'annual',
      requested_days: docData.days_count || 0,
      start_date: docData.start_date || '',
      end_date: docData.end_date || '',
      reason: docData.reason || null,
      status: req.status,
      requested_at: req.created_at,
      approved_at: req.approved_at,
      current_step: req.current_step,
      employee: req.requester,
    }
  })

  // 오늘 연차인 멤버 데이터 처리 (doc_data JSONB)
  const todayOnLeaveMembers = todayLeaveRequests
    .filter((request) => {
      // doc_data에서 오늘 날짜가 연차 기간에 포함되는지 확인
      const docData = request.doc_data || {}
      if (!docData.start_date || !docData.end_date) return false
      return docData.start_date <= today && docData.end_date >= today
    })
    .map((request) => {
      const emp = request.requester as { id: string; name: string; department?: { name: string } | { name: string }[] | null } | { id: string; name: string }[] | null
      if (!emp) return null
      const empData = Array.isArray(emp) ? emp[0] : emp
      if (!empData) return null

      const dept = 'department' in empData ? empData.department : null
      const deptName = dept ? (Array.isArray(dept) ? dept[0]?.name : (dept as { name: string })?.name) || '' : ''

      const docData = request.doc_data || {}

      return {
        id: empData.id,
        name: empData.name,
        department: deptName,
        team: '', // team 정보가 없으면 빈 문자열
        leaveType: docData.leave_type || 'annual',
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

      // 병렬로 document_master + approval_steps 조회 (doc_data JSONB)
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
            doc_data,
            requester:requester_id(id, name, department:department_id(name), role:role_id(name))
          `)
          .eq('doc_type', 'leave')
          .in('id', requestIds)
          .order('created_at', { ascending: true })
          .limit(3),
        adminSupabase
          .from('approval_step')
          .select('request_id, step_order, status, approver_id, approved_at, comment, approver:approver_id(id, name)')
          .eq('request_type', 'leave')
          .in('request_id', requestIds)
          .order('step_order', { ascending: true })
      ])

      // document_master.doc_data → LeaveRequest 형태로 변환
      pendingRequests = (leaveResult.data || []).map(req => {
        const docData = req.doc_data || {}
        return {
          id: req.id,
          employee_id: req.requester_id,
          leave_type: docData.leave_type || 'annual',
          requested_days: docData.days_count || 0,
          start_date: docData.start_date || '',
          end_date: docData.end_date || '',
          reason: docData.reason || null,
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
    const { data: mySteps } = await adminSupabase
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
        <LiveDateTime
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            color: '#5B6A72',
            marginTop: '4px'
          }}
        />
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

        {/* 5. 결재 현황 */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
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
