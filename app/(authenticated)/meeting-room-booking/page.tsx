import { MeetingRoomBookingClient } from '@/components/meeting-rooms/MeetingRoomBookingClient'
import { getMeetingRooms, getEmployees } from '@/app/actions/meeting-room'
import { redirect } from 'next/navigation'

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
    />
  )
}
