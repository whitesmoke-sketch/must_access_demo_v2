import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LayoutClient } from '@/components/common/LayoutClient'
import type { EmployeeWithRole } from '@/types/database'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자 역할 조회
  const { data: employee, error: employeeError } = await supabase
    .from('employee')
    .select(`
      id,
      name,
      email,
      role:role_id!inner (
        code,
        name,
        level
      )
    `)
    .eq('id', user.id)
    .single()

  // employee 테이블에 없는 경우 (검증되지 않은 사용자)
  if (employeeError || !employee) {
    console.error('[Authenticated Layout] employee 없음, 계정 삭제 처리:', user.email)

    // auth.users에서 계정 완전 삭제
    try {
      const adminClient = createAdminClient()
      await adminClient.auth.admin.deleteUser(user.id)
      console.log('[Authenticated Layout] 미등록 사용자 계정 삭제 완료:', user.email)
    } catch (deleteError) {
      console.error('[Authenticated Layout] 계정 삭제 실패:', deleteError)
      // 삭제 실패해도 로그아웃은 진행
      await supabase.auth.signOut()
    }

    // 에러 메시지와 함께 로그인 페이지로
    redirect('/login?error=not-invited')
  }

  // 타입 단언
  const employeeData = employee as unknown as EmployeeWithRole

  return <LayoutClient user={user} employee={employeeData}>{children}</LayoutClient>
}
