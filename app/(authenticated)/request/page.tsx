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

  // 포상휴가 사용량 조회 (올해 사용한 포상휴가만)
  // 포상휴가는 신청 → 승인 시 부여와 동시에 사용 처리됨
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`
  const yearEnd = `${currentYear}-12-31`

  const { data: rewardUsage } = await supabase
    .from('document_master')
    .select('doc_data')
    .eq('requester_id', user.id)
    .eq('doc_type', 'leave')
    .eq('status', 'approved')

  // leave_type이 award이고 올해 사용한 것만 합산
  const usedReward = rewardUsage?.reduce((sum, req) => {
    const docData = req.doc_data || {}
    if (docData.leave_type === 'award') {
      const startDate = docData.start_date
      if (startDate && startDate >= yearStart && startDate <= yearEnd) {
        return sum + (docData.days_count || 0)
      }
    }
    return sum
  }, 0) || 0

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
          reward_used: usedReward,
        } : null}
        members={members}
        initialDocumentType={params.type}
      />
    </div>
  )
}
