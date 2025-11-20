'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MeetingRoom {
  id: string
  name: string
  code: string
  floor: number
  capacity: number
  location: string | null
  description: string | null
  photo_url: string | null
  has_whiteboard: boolean
  has_monitor: boolean
  has_camera: boolean
  has_outlet: boolean
  has_hdmi: boolean
  is_active: boolean
}

export interface Booking {
  id: string
  room_id: string
  booked_by: string
  title: string
  description: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  employee?: {
    name: string
    email: string
  }
  attendees?: {
    employee_id: string
    employee: {
      name: string
      email: string
    }
  }[]
}

export interface CreateBookingInput {
  room_id: string
  title: string
  description?: string
  booking_date: string
  start_time: string
  end_time: string
  attendee_ids: string[]
}

/**
 * Get all active meeting rooms
 */
export async function getMeetingRooms() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meeting_room')
    .select('*')
    .eq('is_active', true)
    .order('floor', { ascending: true })
    .order('code', { ascending: true })

  if (error) {
    console.error('Failed to fetch meeting rooms:', error)
    throw new Error('회의실 목록을 불러오는데 실패했습니다.')
  }

  return data as MeetingRoom[]
}

/**
 * Get bookings for a specific room and date range
 */
export async function getBookings(roomId?: string, date?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('meeting_room_booking')
    .select(`
      *,
      employee:booked_by (
        name,
        email
      ),
      attendees:meeting_room_booking_attendee (
        employee_id,
        employee:employee_id (
          name,
          email
        )
      )
    `)
    .in('status', ['confirmed', 'completed'])
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  if (date) {
    query = query.eq('booking_date', date)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch bookings:', error)
    throw new Error('예약 목록을 불러오는데 실패했습니다.')
  }

  return data as Booking[]
}

/**
 * Check if a time slot is available
 */
export async function checkBookingOverlap(
  roomId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('check_booking_overlap', {
    p_room_id: roomId,
    p_booking_date: bookingDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_exclude_booking_id: excludeBookingId || null,
  })

  if (error) {
    console.error('Failed to check booking overlap:', error)
    throw new Error('예약 가능 여부를 확인하는데 실패했습니다.')
  }

  return data as boolean
}

/**
 * Create a new booking
 */
export async function createBooking(input: CreateBookingInput) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // Check for overlap
  const hasOverlap = await checkBookingOverlap(
    input.room_id,
    input.booking_date,
    input.start_time,
    input.end_time
  )

  if (hasOverlap) {
    throw new Error('선택한 시간에 이미 예약이 있습니다.')
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('meeting_room_booking')
    .insert({
      room_id: input.room_id,
      booked_by: user.id,
      title: input.title,
      description: input.description || null,
      booking_date: input.booking_date,
      start_time: input.start_time,
      end_time: input.end_time,
      status: 'confirmed',
    })
    .select()
    .single()

  if (bookingError) {
    console.error('Failed to create booking:', bookingError)
    throw new Error('예약 생성에 실패했습니다.')
  }

  // Add attendees
  if (input.attendee_ids.length > 0) {
    const attendees = input.attendee_ids.map((employeeId) => ({
      booking_id: booking.id,
      employee_id: employeeId,
    }))

    const { error: attendeeError } = await supabase
      .from('meeting_room_booking_attendee')
      .insert(attendees)

    if (attendeeError) {
      console.error('Failed to add attendees:', attendeeError)
      // Don't throw - booking was created, just log the error
    }
  }

  revalidatePath('/meeting-rooms')
  revalidatePath('/meeting-room-booking')

  return booking
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // Update booking status to cancelled
  const { error } = await supabase
    .from('meeting_room_booking')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('booked_by', user.id) // Only owner can cancel

  if (error) {
    console.error('Failed to cancel booking:', error)
    throw new Error('예약 취소에 실패했습니다.')
  }

  revalidatePath('/meeting-rooms')
  revalidatePath('/meeting-room-booking')

  return { success: true }
}

/**
 * Get employees for attendee selection
 */
export async function getEmployees(searchTerm?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('employee')
    .select('id, name, email, department:department_id(name)')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch employees:', error)
    throw new Error('직원 목록을 불러오는데 실패했습니다.')
  }

  return data
}
