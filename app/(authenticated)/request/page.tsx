import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestForm } from '@/components/request/RequestForm'

export default async function RequestPage() {
  const supabase = await createClient()

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

  // 구성원 목록 조회 (결재선용)
  const { data: members } = await supabase
    .from('employee')
    .select('id, name, email, department_id, role_id')
    .eq('status', 'active')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
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
        balance={balance}
        members={members || []}
      />
    </div>
  )
}
