import { MeetingRoomBookingClient } from '@/components/meeting-rooms/MeetingRoomBookingClient'
import { getMeetingRooms, getEmployees } from '@/app/actions/meeting-room'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function MeetingRoomBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>
}) {
  const params = await searchParams
  const roomId = params.roomId

  if (!roomId) {
    redirect('/meeting-rooms')
  }

  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 현재 사용자의 employee 정보 가져오기
  const { data: currentEmployee } = await supabase
    .from('employee')
    .select('id, name, email')
    .eq('id', user.id)
    .single()

  if (!currentEmployee) {
    redirect('/login')
  }

  const [rooms, employees] = await Promise.all([
    getMeetingRooms(),
    getEmployees(),
  ])

  const selectedRoom = rooms.find((r) => r.id === roomId)

  if (!selectedRoom) {
    redirect('/meeting-rooms')
  }

  return (
    <MeetingRoomBookingClient
      room={selectedRoom}
      employees={employees}
      currentUser={{
        id: currentEmployee.id,
        name: currentEmployee.name,
        email: currentEmployee.email,
      }}
    />
  )
}
