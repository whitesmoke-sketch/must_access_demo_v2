import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const { data: employee } = await supabase
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

  // 타입 단언
  const employeeData = employee as unknown as EmployeeWithRole | null

  return <LayoutClient user={user} employee={employeeData}>{children}</LayoutClient>
}
