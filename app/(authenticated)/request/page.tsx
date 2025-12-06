import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestForm } from '@/components/request/RequestForm'

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const params = await searchParams

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('id, name, email, department_id, role_id')
    .eq('id', user.id)
    .single()

  if (!employee) {
    redirect('/login')
  }

  // 연차 잔액 조회
  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days, remaining_days')
    .eq('employee_id', user.id)
    .single()

  // 포상휴가 조회
  const { data: rewardGrants } = await supabase
    .from('annual_leave_grant')
    .select('granted_days')
    .eq('employee_id', user.id)
    .in('grant_type', ['award_overtime', 'award_attendance'])
    .eq('approval_status', 'approved')

  const totalReward = rewardGrants?.reduce((sum, grant) => sum + grant.granted_days, 0) || 0

  // 포상휴가 사용량 조회 (새 시스템: document_master + doc_leave)
  const { data: rewardUsage } = await supabase
    .from('document_master')
    .select(`
      doc_leave (
        days_count
      )
    `)
    .eq('requester_id', user.id)
    .eq('doc_type', 'leave')
    .eq('status', 'approved')

  // doc_leave에서 leave_type이 award인 것을 필터링하기 위해 별도 조회 필요
  // 또는 단순히 모든 승인된 연차를 계산
  const usedReward = rewardUsage?.reduce((sum, req) => {
    const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave
    return sum + (docLeave?.days_count || 0)
  }, 0) || 0
  const remainingReward = totalReward - usedReward

  // 구성원 목록 조회 (결재선용) - 직책, 부서 정보 포함
  // RLS를 우회하기 위해 adminSupabase 사용
  const { data: membersRaw } = await adminSupabase
    .from('employee')
    .select(`
      id,
      name,
      email,
      department_id,
      role_id,
      department:department_id(name),
      role:role_id(name)
    `)
    .eq('status', 'active')
    .order('name')

  // MemberCombobox가 기대하는 형식으로 변환
  const members = membersRaw?.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    department_id: m.department_id,
    role_id: m.role_id,
    position: (m.role as any)?.name || '직원',
    team: (m.department as any)?.name || '팀 정보 없음'
  })) || []

  return (
    <div className="space-y-6 pb-24">
      {/* 헤더 */}
      <div className="pb-4">
        <h2 style={{
          color: 'var(--card-foreground)',
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 1.25
        }}>
          신청서 작성
        </h2>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: 'var(--font-size-body)',
          lineHeight: 1.5
        }} className="mt-1">
          문서 양식을 선택하고 필요한 정보를 입력하세요
        </p>
      </div>

      {/* 신청서 폼 */}
      <RequestForm
        currentUser={employee}
        balance={balance ? {
          ...balance,
          reward_total: totalReward,
          reward_used: usedReward,
          reward_remaining: remainingReward
        } : null}
        members={members}
        initialDocumentType={params.type}
      />
    </div>
  )
}
