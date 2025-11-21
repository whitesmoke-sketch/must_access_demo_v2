import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalDocumentsClient } from '@/components/documents/ApprovalDocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 사용자 역할 확인 - 결재 권한이 있는지 체크
  const { data: employeeRole } = await supabase
    .from('employee')
    .select('role:role_id(code, approval_level)')
    .eq('id', user.id)
    .maybeSingle()

  const role = employeeRole?.role as { code: string; approval_level: number } | { code: string; approval_level: number }[] | null
  const approvalLevel = role
    ? Array.isArray(role)
      ? role[0]?.approval_level ?? 0
      : role?.approval_level ?? 0
    : 0

  // 모든 결재 문서 조회 (결재 권한이 있는 사용자만)
  const { data: allDocuments, error: documentsError } = await supabase
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
    .order('requested_at', { ascending: false })

  console.log('📄 Documents Page - Query Results:', {
    userId: user.id,
    approvalLevel,
    documentsCount: allDocuments?.length ?? 0,
    error: documentsError
  })

  if (documentsError) {
    console.error('Failed to fetch documents:', documentsError)
  }

  // 내가 승인자로 지정된 문서 중, 현재 내 차례인 것만 조회 (순차적 결재)
  // step_order가 current_step과 일치하고, status가 pending인 것만
  const { data: myCurrentApprovalSteps } = await supabase
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
    .eq('status', 'pending')

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

  // 내가 관여한 모든 문서의 approval_step 상태 조회 (승인/반려한 것 포함)
  const { data: myApprovalSteps } = await supabase
    .from('approval_step')
    .select('request_id, status')
    .eq('approver_id', user.id)
    .eq('request_type', 'leave')

  // 문서별로 내 승인 상태를 매핑 (request_id -> status)
  const myApprovalStatusMap = new Map(
    myApprovalSteps?.map(step => [step.request_id, step.status]) ?? []
  )

  return (
    <div className="space-y-6">
      <ApprovalDocumentsClient
        documents={allDocuments || []}
        userId={user.id}
        approvalLevel={approvalLevel}
        myApprovalRequestIds={Array.from(myApprovalRequestIds)}
        myApprovalStatusMap={Object.fromEntries(myApprovalStatusMap)}
      />
    </div>
  )
}
