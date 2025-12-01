import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyAccountClient } from '@/components/account/MyAccountClient'

export default async function AccountPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회 (실제 테이블 구조에 맞게)
  const { data: employee } = await supabase
    .from('employee')
    .select(`
      id,
      name,
      email,
      phone,
      location,
      employment_date,
      status,
      department:department_id(id, name),
      role:role_id(id, name, code)
    `)
    .eq('id', user.id)
    .single()

  if (!employee) {
    redirect('/login')
  }

  // 데이터 정규화
  const department = employee.department as { id: string; name: string } | null
  const role = employee.role as { id: string; name: string; code: string } | null

  const userData = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone || '',
    location: employee.location || '',
    employmentDate: employee.employment_date || '',
    status: employee.status || 'active',
    departmentName: department?.name || '',
    roleName: role?.name || '',
    roleCode: role?.code || '',
  }

  return <MyAccountClient user={userData} />
}
