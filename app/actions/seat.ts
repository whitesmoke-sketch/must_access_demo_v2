'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ================================================
// Types
// ================================================

export interface Seat {
  id: number
  seat_number: string
  floor: number
  area: string | null
  seat_type: string
  amenities: Record<string, any> | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface SeatReservation {
  id: number
  seat_id: number
  employee_id: string
  reservation_date: string
  start_time: string | null
  end_time: string | null
  status: 'reserved' | 'in_use' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  seat?: Seat
}

// ================================================
// 좌석 조회
// ================================================

/**
 * 모든 좌석 목록 조회
 */
export async function getAllSeats() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('seat')
      .select('*')
      .eq('is_available', true)
      .order('floor', { ascending: true })
      .order('seat_number', { ascending: true })

    if (error) {
      console.error('Get all seats error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get all seats error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 층별 좌석 목록 조회
 */
export async function getSeatsByFloor(floor: number) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('seat')
      .select('*')
      .eq('floor', floor)
      .eq('is_available', true)
      .order('seat_number', { ascending: true })

    if (error) {
      console.error('Get seats by floor error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get seats by floor error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 오늘 날짜 좌석 예약 현황 조회 (어떤 좌석이 사용중인지)
 */
export async function getTodaySeatReservations() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('seat_reservation')
      .select(`
        *,
        seat:seat_id (*),
        employee:employee_id (
          id,
          name
        )
      `)
      .eq('reservation_date', today)
      .in('status', ['reserved', 'in_use'])

    if (error) {
      console.error('Get today seat reservations error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get today seat reservations error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 내 현재 좌석 예약 조회 (오늘)
 */
export async function getMyCurrentSeatReservation() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: null }
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('seat_reservation')
      .select(`
        *,
        seat:seat_id (*)
      `)
      .eq('employee_id', user.id)
      .eq('reservation_date', today)
      .in('status', ['reserved', 'in_use'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Get my current seat reservation error:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error: unknown) {
    console.error('Get my current seat reservation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: null }
  }
}

// ================================================
// 좌석 예약/사용
// ================================================

/**
 * 좌석 사용 시작 (예약 + 사용중 상태로 변경)
 */
export async function startUsingSeat(seatId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

    // 1. 이미 사용 중인 좌석이 있는지 확인
    const { data: existingReservation } = await supabase
      .from('seat_reservation')
      .select('id, seat:seat_id(seat_number)')
      .eq('employee_id', user.id)
      .eq('reservation_date', today)
      .in('status', ['reserved', 'in_use'])
      .maybeSingle()

    if (existingReservation) {
      const seatNumber = (existingReservation.seat as any)?.seat_number || '알 수 없음'
      return { success: false, error: `이미 ${seatNumber} 좌석을 사용 중입니다. 먼저 반납해주세요.` }
    }

    // 2. 해당 좌석이 오늘 이미 예약되어 있는지 확인
    const { data: seatReserved } = await supabase
      .from('seat_reservation')
      .select('id')
      .eq('seat_id', seatId)
      .eq('reservation_date', today)
      .in('status', ['reserved', 'in_use'])
      .maybeSingle()

    if (seatReserved) {
      return { success: false, error: '이미 다른 사용자가 사용 중인 좌석입니다.' }
    }

    // 3. 좌석 예약 생성 (사용중 상태)
    const { data, error } = await supabase
      .from('seat_reservation')
      .insert({
        seat_id: seatId,
        employee_id: user.id,
        reservation_date: today,
        start_time: now,
        status: 'in_use'
      })
      .select(`
        *,
        seat:seat_id (*)
      `)
      .single()

    if (error) {
      console.error('Start using seat error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/resources/seats')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error: unknown) {
    console.error('Start using seat error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 좌석 반납 (사용 완료)
 */
export async function endUsingSeat(reservationId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const now = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

    // 예약 정보 확인 (본인 예약인지)
    const { data: reservation } = await supabase
      .from('seat_reservation')
      .select('*')
      .eq('id', reservationId)
      .eq('employee_id', user.id)
      .single()

    if (!reservation) {
      return { success: false, error: '예약 정보를 찾을 수 없습니다.' }
    }

    // 상태 업데이트
    const { error } = await supabase
      .from('seat_reservation')
      .update({
        status: 'completed',
        end_time: now,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)

    if (error) {
      console.error('End using seat error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/resources/seats')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: unknown) {
    console.error('End using seat error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 좌석 예약 취소
 */
export async function cancelSeatReservation(reservationId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const { error } = await supabase
      .from('seat_reservation')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .eq('employee_id', user.id)

    if (error) {
      console.error('Cancel seat reservation error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/resources/seats')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: unknown) {
    console.error('Cancel seat reservation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
