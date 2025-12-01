import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyAccountClient } from '@/components/account/MyAccountClient'

export default async function AccountPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회
  const { data: employee } = await supabase
    .from('employee')
    .select(`
      id,
      name,
      email,
      phone,
      birth_date,
      gender,
      emergency_contact,
      profile_image,
      position,
      hire_date,
      employment_type,
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
    birthDate: employee.birth_date || '',
    gender: employee.gender || '',
    emergencyContact: employee.emergency_contact || '',
    profileImage: employee.profile_image || '',
    position: employee.position || '',
    hireDate: employee.hire_date || '',
    employmentType: employee.employment_type || '정규직',
    departmentName: department?.name || '',
    roleName: role?.name || '',
  }

  return <MyAccountClient user={userData} />
}
