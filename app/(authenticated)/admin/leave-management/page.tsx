import { LeaveManagementClient } from '@/components/leave-management/LeaveManagementClient'
import { getLeaveManagementData } from '@/lib/leave-management/actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LeaveManagementPage() {
  // 권한 체크 (인사과 role.level >= 5)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: employee } = await supabase
    .from('employee')
    .select(`
      id,
      role_id,
      role:role_id (
        level
      )
    `)
    .eq('id', user.id)
    .single()

  if (!employee || !employee.role || (employee.role as any).level < 5) {
    redirect('/unauthorized')
  }

  // 데이터 조회
  try {
    const data = await getLeaveManagementData()

    return (
      <div className="container mx-auto p-6">
        <LeaveManagementClient initialMembers={data.members} initialLeaveRequests={data.leaveRequests} />
      </div>
    )
  } catch (error) {
    console.error('Failed to load leave management data:', error)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">데이터를 불러오는데 실패했습니다</h2>
          <p className="text-gray-600 mt-2">{error instanceof Error ? error.message : '알 수 없는 오류'}</p>
        </div>
      </div>
    )
  }
}
