import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkStatusCard } from '@/components/dashboard/WorkStatusCard'
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ApprovalStatusClient } from '@/components/dashboard/ApprovalStatusClient'
import { MyReservationsCard } from '@/components/dashboard/MyReservationsCard'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Parallel queries for better performance
  const [employeeResult, myRequestsResult, employeeRoleResult] = await Promise.all([
    // 사용자 정보 조회
    supabase
      .from('employee')
      .select('id, name, department:department_id(name)')
      .eq('id', user.id)
      .maybeSingle(),
    // 내가 요청한 문서 (최근 3건)
    supabase
      .from('leave_request')
      .select('id, employee_id, leave_type, requested_days, start_date, end_date, reason, status, requested_at, approved_at, current_step, employee:employee_id(id, name, department:department_id(name), role:role_id(name))')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // 사용자 역할 확인
    supabase
      .from('employee')
      .select('role:role_id(code)')
      .eq('id', user.id)
      .maybeSingle()
  ])

  const employee = employeeResult.data
  const myRequests = myRequestsResult.data || []

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

      // 병렬로 leave_request와 approval_steps 조회
      const [leaveResult, stepsResult] = await Promise.all([
        supabase
          .from('leave_request')
          .select('id, employee_id, leave_type, requested_days, start_date, end_date, reason, status, requested_at, approved_at, current_step, employee:employee_id(id, name, department:department_id(name), role:role_id(name))')
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

      pendingRequests = leaveResult.data || []

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WorkStatusCard employeeId={user.id} />
        <LeaveBalanceCard employeeId={user.id} />
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MyReservationsCard employeeId={user.id} />

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
    </div>
  )
}
