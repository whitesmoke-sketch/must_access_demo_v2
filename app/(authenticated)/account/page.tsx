import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyAccountClient } from '@/components/account/MyAccountClient'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // URL 파라미터에서 슬랙 연동 결과 확인
  const slackConnected = params.slack_connected === 'true'
  const slackError = typeof params.slack_error === 'string' ? params.slack_error : null

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회 (슬랙 연동 정보 포함)
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
      slack_user_id,
      slack_email,
      slack_avatar_url,
      slack_connected_at,
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
    // 슬랙 연동 정보
    slackUserId: employee.slack_user_id || null,
    slackEmail: employee.slack_email || null,
    slackAvatarUrl: employee.slack_avatar_url || null,
    slackConnectedAt: employee.slack_connected_at || null,
  }

  return (
    <MyAccountClient
      user={userData}
      slackConnected={slackConnected}
      slackError={slackError}
    />
  )
}
