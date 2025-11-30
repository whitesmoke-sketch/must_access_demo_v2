import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyDocumentsClient } from '@/components/documents/MyDocumentsClient'

export default async function MyDocumentsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 내가 작성한 모든 연차 신청 문서 조회
  const { data: myLeaveRequests, error: leaveError } = await supabase
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
      current_step
    `)
    .eq('employee_id', user.id)
    .order('requested_at', { ascending: false })

  if (leaveError) {
    console.error('Failed to fetch leave requests:', leaveError)
  }

  // 각 문서의 결재 히스토리 조회 - Admin Client 사용 (RLS 우회)
  const requestIds = myLeaveRequests?.map(req => req.id) || []

  const adminSupabase = createAdminClient()
  const { data: approvalSteps, error: approvalError } = await adminSupabase
    .from('approval_step')
    .select(`
      request_id,
      step_order,
      status,
      approval_type,
      approved_at,
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
    .in('request_id', requestIds)
    .eq('request_type', 'leave')
    .order('step_order', { ascending: true })

  // 문서별로 결재 히스토리를 매핑
  const approvalHistoryMap = new Map<number, any[]>()
  approvalSteps?.forEach(step => {
    const existing = approvalHistoryMap.get(step.request_id) || []
    approvalHistoryMap.set(step.request_id, [...existing, step])
  })

  return (
    <div className="space-y-6">
      <MyDocumentsClient
        documents={myLeaveRequests || []}
        userId={user.id}
        approvalHistoryMap={Object.fromEntries(approvalHistoryMap)}
      />
    </div>
  )
}
