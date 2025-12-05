'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Seat {
  id: string
  seat_number: string
  floor: number
  area: string | null
  seat_type: string
  amenities: Record<string, any> | null
  is_available: boolean
  nameplate_device_id: string | null
  created_at: string
  updated_at: string
}

export interface SeatWithReservation extends Seat {
  status: 'available' | 'in_use' | 'maintenance'
  current_user_id?: string
  current_user_name?: string
  start_time?: string
  reservation_id?: string
}

export interface SeatReservation {
  id: string
  seat_id: string
  employee_id: string
  reservation_date: string
  start_time: string | null
  end_time: string | null
  status: string
  created_at: string
  seat?: Seat
  employee?: {
    id: string
    name: string
    email: string
  }
}

/**
 * Get all seats with current reservation status
 */
export async function getSeats(): Promise<SeatWithReservation[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all seats
  const { data: seats, error: seatsError } = await supabase
    .from('seat')
    .select('*')
    .order('floor', { ascending: true })
    .order('seat_number', { ascending: true })

  if (seatsError) {
    console.error('Failed to fetch seats:', seatsError)
    throw new Error('좌석 목록을 불러오는데 실패했습니다.')
  }

  // Get today's active reservations
  const { data: reservations, error: reservationsError } = await supabase
    .from('seat_reservation')
    .select(`
      id,
      seat_id,
      employee_id,
      start_time,
      status,
      employee:employee_id (
        id,
        name
      )
    `)
    .eq('reservation_date', today)
    .in('status', ['reserved', 'in_use'])

  if (reservationsError) {
    console.error('Failed to fetch reservations:', reservationsError)
    // Don't throw - return seats without reservation info
  }

  // Map reservations to seats
  const reservationMap = new Map<string, any>()
  if (reservations) {
    for (const r of reservations) {
      reservationMap.set(r.seat_id, r)
    }
  }

  // Combine seats with reservation status
  const seatsWithStatus: SeatWithReservation[] = seats.map((seat) => {
    const reservation = reservationMap.get(seat.id.toString())

    let status: 'available' | 'in_use' | 'maintenance' = 'available'
    let current_user_id: string | undefined
    let current_user_name: string | undefined
    let start_time: string | undefined
    let reservation_id: string | undefined

    if (!seat.is_available) {
      status = 'maintenance'
    } else if (reservation) {
      status = 'in_use'
      current_user_id = reservation.employee_id
      current_user_name = (reservation.employee as any)?.name
      start_time = reservation.start_time
      reservation_id = reservation.id.toString()
    }

    return {
      ...seat,
      id: seat.id.toString(),
      status,
      current_user_id,
      current_user_name,
      start_time,
      reservation_id,
    }
  })

  return seatsWithStatus
}

/**
 * Get seats filtered by floor
 */
export async function getSeatsByFloor(floor: number): Promise<SeatWithReservation[]> {
  const allSeats = await getSeats()
  return allSeats.filter((seat) => seat.floor === floor)
}

/**
 * Get current user's active seat reservation
 */
export async function getCurrentUserSeat(): Promise<SeatReservation | null> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('seat_reservation')
    .select(`
      *,
      seat:seat_id (
        id,
        seat_number,
        floor,
        area,
        seat_type
      )
    `)
    .eq('employee_id', user.id)
    .eq('reservation_date', today)
    .in('status', ['reserved', 'in_use'])
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch current user seat:', error)
    return null
  }

  if (!data) {
    return null
  }

  return {
    ...data,
    id: data.id.toString(),
    seat_id: data.seat_id.toString(),
    seat: data.seat ? {
      ...data.seat,
      id: data.seat.id.toString(),
    } : undefined,
  }
}

/**
 * Start using a seat (create reservation)
 */
export async function startUsingSeat(seatId: string): Promise<SeatReservation> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // Check if user already has an active reservation
  const existingReservation = await getCurrentUserSeat()
  if (existingReservation) {
    throw new Error('이미 사용 중인 좌석이 있습니다. 먼저 반납해주세요.')
  }

  // Check if seat is available
  const { data: seat, error: seatError } = await supabase
    .from('seat')
    .select('*')
    .eq('id', seatId)
    .single()

  if (seatError || !seat) {
    throw new Error('좌석을 찾을 수 없습니다.')
  }

  if (!seat.is_available) {
    throw new Error('해당 좌석은 현재 사용할 수 없습니다.')
  }

  // Check if seat is already reserved today
  const { data: existingSeatReservation, error: checkError } = await supabase
    .from('seat_reservation')
    .select('*')
    .eq('seat_id', seatId)
    .eq('reservation_date', today)
    .in('status', ['reserved', 'in_use'])
    .maybeSingle()

  if (existingSeatReservation) {
    throw new Error('해당 좌석은 이미 사용 중입니다.')
  }

  // Create reservation
  const { data: reservation, error: reservationError } = await supabase
    .from('seat_reservation')
    .insert({
      seat_id: parseInt(seatId),
      employee_id: user.id,
      reservation_date: today,
      start_time: now,
      status: 'in_use',
    })
    .select(`
      *,
      seat:seat_id (
        id,
        seat_number,
        floor,
        area,
        seat_type
      )
    `)
    .single()

  if (reservationError) {
    console.error('Failed to create reservation:', reservationError)
    throw new Error('좌석 예약에 실패했습니다.')
  }

  revalidatePath('/resources/seats')
  revalidatePath('/dashboard')

  return {
    ...reservation,
    id: reservation.id.toString(),
    seat_id: reservation.seat_id.toString(),
    seat: reservation.seat ? {
      ...reservation.seat,
      id: reservation.seat.id.toString(),
    } : undefined,
  }
}

/**
 * End using a seat (update reservation status)
 */
export async function endUsingSeat(reservationId: string): Promise<void> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const now = new Date().toTimeString().slice(0, 5)

  // Update reservation
  const { error } = await supabase
    .from('seat_reservation')
    .update({
      status: 'completed',
      end_time: now,
    })
    .eq('id', reservationId)
    .eq('employee_id', user.id) // Only owner can end

  if (error) {
    console.error('Failed to end reservation:', error)
    throw new Error('좌석 반납에 실패했습니다.')
  }

  revalidatePath('/resources/seats')
  revalidatePath('/dashboard')
}

/**
 * End using current seat (for convenience)
 */
export async function endUsingCurrentSeat(): Promise<void> {
  const currentSeat = await getCurrentUserSeat()

  if (!currentSeat) {
    throw new Error('사용 중인 좌석이 없습니다.')
  }

  await endUsingSeat(currentSeat.id)
}
