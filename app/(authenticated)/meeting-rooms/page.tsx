import { MeetingRoomsClient } from '@/components/meeting-rooms/MeetingRoomsClient'
import { getMeetingRooms, getBookings } from '@/app/actions/meeting-room'

export default async function MeetingRoomsPage() {
  const [rooms, bookings] = await Promise.all([
    getMeetingRooms(),
    getBookings(), // Get all bookings for today
  ])

  return <MeetingRoomsClient initialRooms={rooms} initialBookings={bookings} />
}
