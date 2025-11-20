import { createClient } from '@/lib/supabase/server'
import { MyReservationsClient } from './MyReservationsClient'

interface MyReservationsCardProps {
  employeeId: string
}

export async function MyReservationsCard({ employeeId }: MyReservationsCardProps) {
  const supabase = await createClient()

  // TODO: 좌석 예약 기능 구현 필요
  const seatNumber = null

  // TODO: 사물함 예약 기능 구현 필요
  const lockerNumber = null

  // 회의실 예약 조회 (현재 사용자가 예약한 것만, 미래 예약만)
  const today = new Date().toISOString().split('T')[0]
  const { data: bookings, error } = await supabase
    .from('meeting_room_booking')
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      title,
      room:room_id(name),
      attendees:meeting_room_booking_attendee(
        employee:employee_id(id, name)
      )
    `)
    .eq('booked_by', employeeId)
    .eq('status', 'confirmed')
    .gte('booking_date', today)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(3)

  if (error) {
    console.error('Failed to fetch meeting room bookings:', error)
  }

  // Transform data to match client component interface
  const meetingBookings = (bookings || []).map((booking: any) => ({
    id: booking.id,
    room_name: booking.room?.name || 'Unknown',
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    title: booking.title,
    attendees: (booking.attendees || []).map((a: any) => ({
      id: a.employee?.id || '',
      name: a.employee?.name || 'Unknown',
    })),
  }))

  return (
    <MyReservationsClient
      seatNumber={seatNumber}
      lockerNumber={lockerNumber}
      meetingBookings={meetingBookings}
    />
  )
}
