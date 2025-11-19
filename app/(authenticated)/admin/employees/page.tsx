import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmployeesPageClient } from '@/components/admin/EmployeesPageClient'

export default async function EmployeesPage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // 권한 확인 (관리자만 접근 가능)
  const { data: employee } = await supabase
    .from('employee')
    .select('role:role_id(code, level)')
    .eq('id', user.id)
    .single()

  // level 3 이상만 접근 가능 (부서리더, 사업리더, 대표, HR)
  if (!employee?.role || employee.role.level < 3) {
    redirect('/dashboard')
  }

  return <EmployeesPageClient />
}
