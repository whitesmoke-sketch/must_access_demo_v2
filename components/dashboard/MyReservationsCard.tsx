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

  // 회의실 예약 조회 (내가 예약한 것 + 내가 참석자인 것, Edge Function 사용)
  let bookings: any[] = []

  try {
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found')
    } else {
      // Call Edge Function to bypass RLS
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
      const baseUrl = supabaseUrl.replace('/rest/v1', '')
      const edgeFunctionUrl = `${baseUrl}/functions/v1/get-my-bookings`

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employeeId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('Edge Function error:', result.error)
      } else {
        bookings = result.data || []
      }
    }
  } catch (error) {
    console.error('Failed to fetch meeting room bookings:', error)
  }

  // Transform data to match client component interface
  const meetingBookings = (bookings || []).map((booking: any) => ({
    id: booking.id,
    booked_by: booking.booked_by,
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
      currentUserId={employeeId}
    />
  )
}
