import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/common/Header'
import { Sidebar } from '@/components/common/Sidebar'
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
        name
      )
    `)
    .eq('id', user.id)
    .single()

  // 타입 단언
  const employeeData = employee as unknown as EmployeeWithRole | null
  const roleCode = employeeData?.role?.code

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} employee={employeeData} />

      <div className="flex">
        <Sidebar role={roleCode} />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
