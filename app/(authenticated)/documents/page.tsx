import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalDocumentsClient } from '@/components/documents/ApprovalDocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 모든 쿼리를 병렬로 실행 (성능 최적화)
  const [
    employeeRoleResult,
    allDocumentsResult,
    myCurrentApprovalStepsResult,
    myApprovalStepsResult,
    allApprovalStepsResult
  ] = await Promise.all([
    // 사용자 역할 확인
    supabase
      .from('employee')
      .select('role:role_id(code, approval_level)')
      .eq('id', user.id)
      .maybeSingle(),
    // 모든 결재 문서 조회
    supabase
      .from('leave_request')
      .select(`
        id,
        employee_id,
        leave_type,
        requested_days,
        start_date,
        end_date,
        reason,
        status,
        requested_at,
        approved_at,
        current_step,
        employee:employee_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        )
      `)
      .order('requested_at', { ascending: false }),
    // 내가 승인자로 지정된 문서 중, 현재 내 차례인 것만 조회
    supabase
      .from('approval_step')
      .select(`
        request_id,
        step_order,
        status,
        leave_request:request_id (
          current_step
        )
      `)
      .eq('approver_id', user.id)
      .eq('request_type', 'leave')
      .eq('status', 'pending'),
    // 내가 관여한 모든 문서의 approval_step 상태 조회
    supabase
      .from('approval_step')
      .select('request_id, status')
      .eq('approver_id', user.id)
      .eq('request_type', 'leave'),
    // 모든 문서의 approval_step 조회 (결재선 정보 - 부서/직급 포함)
    adminSupabase
      .from('approval_step')
      .select(`
        request_id,
        step_order,
        status,
        approval_type,
        approver:approver_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        )
      `)
      .eq('request_type', 'leave')
      .order('step_order', { ascending: true })
  ])

  const employeeRole = employeeRoleResult.data
  const role = employeeRole?.role as { code: string; approval_level: number } | { code: string; approval_level: number }[] | null
  const approvalLevel = role
    ? Array.isArray(role)
      ? role[0]?.approval_level ?? 0
      : role?.approval_level ?? 0
    : 0

  const allDocuments = allDocumentsResult.data
  const myCurrentApprovalSteps = myCurrentApprovalStepsResult.data

  // 내 step_order가 현재 current_step과 일치하는 문서만 필터링
  const myApprovalRequestIds = new Set(
    myCurrentApprovalSteps
      ?.filter(step => {
        const leaveRequest = step.leave_request as { current_step: number | null } | { current_step: number | null }[] | null
        const currentStep = leaveRequest
          ? Array.isArray(leaveRequest)
            ? leaveRequest[0]?.current_step
            : leaveRequest.current_step
          : null
        return step.step_order === currentStep
      })
      .map(step => step.request_id) ?? []
  )

  // 문서별로 내 승인 상태를 매핑 (request_id -> status)
  const myApprovalStatusMap = new Map(
    myApprovalStepsResult.data?.map(step => [step.request_id, step.status]) ?? []
  )

  const allApprovalSteps = allApprovalStepsResult.data

  // 디버깅: approval_step 쿼리 결과 확인
  console.log('📋 allApprovalStepsResult error:', allApprovalStepsResult.error)
  console.log('📋 allApprovalSteps count:', allApprovalSteps?.length)
  console.log('📋 allApprovalSteps sample:', allApprovalSteps?.slice(0, 3))

  // 문서별로 결재선 정보를 매핑 (request_id -> approval_steps[])
  const approvalStepsMap = new Map<number, any[]>()
  allApprovalSteps?.forEach(step => {
    const existing = approvalStepsMap.get(step.request_id) || []
    approvalStepsMap.set(step.request_id, [...existing, step])
  })

  return (
    <div className="space-y-6">
      <ApprovalDocumentsClient
        documents={allDocuments || []}
        userId={user.id}
        approvalLevel={approvalLevel}
        myApprovalRequestIds={Array.from(myApprovalRequestIds)}
        myApprovalStatusMap={Object.fromEntries(myApprovalStatusMap)}
        approvalStepsMap={Object.fromEntries(approvalStepsMap)}
      />
    </div>
  )
}
