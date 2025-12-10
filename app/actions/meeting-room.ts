'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getValidGoogleAccessToken } from '@/lib/google-auth'
import { sendMeetingInvitation, MeetingInvitationData } from '@/lib/slack-notifier'

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
 * Create a new booking with Google Calendar integration
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

  const { data: { session } } = await supabase.auth.getSession()

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

  // 참석자 이메일 조회 - 예약자 자신도 포함
  let attendeeEmails: string[] = [user.email!] // 예약자는 항상 참석자에 포함
  if (input.attendee_ids.length > 0) {
    const { data: attendeesData } = await supabase
      .from('employee')
      .select('email')
      .in('id', input.attendee_ids)

    const additionalEmails = attendeesData?.map(a => a.email) || []
    // 중복 제거하여 추가
    attendeeEmails = [...new Set([...attendeeEmails, ...additionalEmails])]
  }

  // Google 토큰 확인 및 필요시 갱신 (세션 → DB fallback)
  const tokenResult = await getValidGoogleAccessToken(
    session?.provider_token,
    session?.provider_refresh_token,
    session?.user?.id
  )

  console.log('[Calendar Integration] Check:', {
    hasValidToken: !!tokenResult.accessToken,
    needsReauth: tokenResult.needsReauth,
    attendeeCount: attendeeEmails.length
  })

  // Google Calendar 연동이 가능한 경우 (유효한 토큰이 있는 경우)
  if (tokenResult.accessToken) {
    console.log('[Calendar Integration] Calling Edge Function...')
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'create-meeting-reservation',
        {
          body: {
            roomId: input.room_id,
            title: input.title,
            description: input.description,
            bookingDate: input.booking_date,
            startTime: input.start_time,
            endTime: input.end_time,
            attendeeEmails: attendeeEmails,
            organizerId: user.id,
            organizerEmail: user.email,
            accessToken: tokenResult.accessToken
          }
        }
      )

      console.log('[Calendar Integration] Edge Function Result:', { error, success: result?.success, result })

      if (!error && result?.success) {
        console.log('[Calendar Integration] Success! Calendar event created.')

        // Calendar 연동 성공 시에도 슬랙 알림 발송
        if (input.attendee_ids.length > 0) {
          try {
            const adminClient = createAdminClient()

            // 회의실 정보 조회
            const { data: room } = await supabase
              .from('meeting_room')
              .select('name, floor, location')
              .eq('id', input.room_id)
              .single()

            // 예약자 정보 조회
            const { data: organizer } = await supabase
              .from('employee')
              .select('name')
              .eq('id', user.id)
              .single()

            const organizerName = organizer?.name || user.email

            // 참석자들의 slack_user_id 조회
            const { data: attendeesWithSlack } = await adminClient
              .from('employee')
              .select('id, slack_user_id')
              .in('id', input.attendee_ids)

            if (attendeesWithSlack && attendeesWithSlack.length > 0) {
              const slackData: MeetingInvitationData = {
                bookingId: result.booking.id,
                organizerName: organizerName || '알 수 없음',
                title: input.title,
                roomName: room?.name || '회의실',
                floor: room?.floor || 1,
                location: room?.location || null,
                bookingDate: input.booking_date,
                startTime: input.start_time,
                endTime: input.end_time
              }

              for (const attendee of attendeesWithSlack) {
                if (attendee.slack_user_id) {
                  sendMeetingInvitation(attendee.slack_user_id, slackData)
                    .catch(err => console.error('[Slack] 회의 초대 알림 발송 실패:', err))
                }
              }
              console.log('[Calendar Integration] Slack notifications sent to attendees')
            }
          } catch (slackError) {
            console.error('[Slack] Calendar 연동 후 알림 처리 오류 (무시됨):', slackError)
          }
        }

        revalidatePath('/meeting-rooms')
        revalidatePath('/meeting-room-booking')
        return result.booking
      }

      // Edge Function 실패 시 로그만 남기고 기존 방식으로 계속 진행
      console.warn('[Calendar Integration] Failed, falling back to basic booking:', error)
    } catch (calendarError) {
      console.warn('[Calendar Integration] Exception:', calendarError)
    }
  } else {
    console.log('[Calendar Integration] Skipped - no valid token available')
    if (tokenResult.needsReauth) {
      console.log('[Calendar Integration] User needs to re-authenticate with Google')
    }
  }

  // Google Calendar 연동 없이 기본 예약 생성
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

  // Add attendees and create notifications
  if (input.attendee_ids.length > 0) {
    const attendees = input.attendee_ids.map((employeeId) => ({
      booking_id: booking.id,
      employee_id: employeeId,
      response_status: 'needsAction',
      calendar_synced: false
    }))

    const { error: attendeeError } = await supabase
      .from('meeting_room_booking_attendee')
      .insert(attendees)

    if (attendeeError) {
      console.error('Failed to add attendees:', attendeeError)
      // Don't throw - booking was created, just log the error
    } else {
      // 회의실 정보 조회 (층수 포함)
      const { data: room } = await supabase
        .from('meeting_room')
        .select('name, floor, location')
        .eq('id', input.room_id)
        .single()

      // 예약자 정보 조회
      const { data: organizer } = await supabase
        .from('employee')
        .select('name')
        .eq('id', user.id)
        .single()

      const organizerName = organizer?.name || user.email

      // 시간 포맷팅
      const startDate = new Date(`${input.booking_date}T${input.start_time}`)
      const formattedDate = startDate.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // 각 참석자에게 알림 생성 (Admin 클라이언트 사용 - RLS 우회)
      const notificationRecords = input.attendee_ids.map(empId => ({
        recipient_id: empId,
        type: 'meeting_invitation',
        title: `${organizerName}님이 회의에 초대했습니다`,
        message: `${input.title} - ${formattedDate}`,
        channel: 'in_app',
        status: 'sent',
        metadata: {
          meeting_data: {
            id: booking.id,
            booking: {
              id: booking.id,
              title: input.title,
              description: input.description || null,
              booking_date: input.booking_date,
              start_time: input.start_time,
              end_time: input.end_time,
              calendar_event_url: null,
              room: {
                name: room?.name || '',
                location: room?.location || null
              }
            },
            response_status: 'needsAction'
          }
        },
        action_url: '/meetings',
        sent_at: new Date().toISOString()
      }))

      // notification 테이블은 INSERT에 RLS 정책이 없으므로 adminClient 사용
      const adminClient = createAdminClient()
      const { error: notificationError } = await adminClient
        .from('notification')
        .insert(notificationRecords)

      if (notificationError) {
        console.error('Failed to create notifications:', notificationError)
      } else {
        console.log('[Basic Booking] Notifications created for attendees:', input.attendee_ids.length)
        // postgres_changes가 자동으로 클라이언트에 알림을 전송함
      }

      // 슬랙 알림 발송 (참석자들에게)
      try {
        // 참석자들의 slack_user_id 조회
        const { data: attendeesWithSlack } = await adminClient
          .from('employee')
          .select('id, slack_user_id')
          .in('id', input.attendee_ids)

        if (attendeesWithSlack && attendeesWithSlack.length > 0) {
          const slackData: MeetingInvitationData = {
            bookingId: booking.id,
            organizerName: organizerName || '알 수 없음',
            title: input.title,
            roomName: room?.name || '회의실',
            floor: room?.floor || 1,
            location: room?.location || null,
            bookingDate: input.booking_date,
            startTime: input.start_time,
            endTime: input.end_time
          }

          // 각 참석자에게 슬랙 알림 발송
          for (const attendee of attendeesWithSlack) {
            if (attendee.slack_user_id) {
              sendMeetingInvitation(attendee.slack_user_id, slackData)
                .catch(err => console.error('[Slack] 회의 초대 알림 발송 실패:', err))
            }
          }
          console.log('[Basic Booking] Slack notifications sent to attendees with slack_user_id')
        }
      } catch (slackError) {
        // 슬랙 알림 실패가 예약에 영향을 주지 않음
        console.error('[Slack] 회의 초대 알림 처리 중 오류 (무시됨):', slackError)
      }
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

  const { data: { session } } = await supabase.auth.getSession()

  // Google 토큰 확인 및 필요시 갱신 (세션 → DB fallback)
  const tokenResult = await getValidGoogleAccessToken(
    session?.provider_token,
    session?.provider_refresh_token,
    user.id
  )

  // Google Calendar 연동 시도 (유효한 토큰이 있는 경우)
  if (tokenResult.accessToken) {
    console.log('[Cancel Booking] Calling Edge Function for calendar deletion...')
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'cancel-meeting-reservation',
        {
          body: {
            bookingId: bookingId,
            userId: user.id,
            accessToken: tokenResult.accessToken
          }
        }
      )

      console.log('[Cancel Booking] Edge Function Result:', { error, result })

      if (!error && result?.success) {
        console.log('[Cancel Booking] Successfully cancelled with calendar deletion')
        revalidatePath('/meeting-rooms')
        revalidatePath('/meeting-room-booking')
        return { success: true }
      }

      console.warn('[Cancel Booking] Edge Function failed, falling back to basic cancellation:', error)
    } catch (calendarError) {
      console.warn('[Cancel Booking] Exception:', calendarError)
    }
  } else {
    console.log('[Cancel Booking] No valid token, skipping calendar deletion')
  }

  // Fallback: 기본 취소 (Calendar 연동 없이)
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

/**
 * Respond to meeting invitation (accept/decline)
 */
export async function respondToMeetingInvitation(
  bookingId: string,
  responseStatus: 'accepted' | 'declined'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다' }
  }

  const { data: { session } } = await supabase.auth.getSession()

  // Google 토큰 확인 및 필요시 갱신 (세션 → DB fallback)
  const tokenResult = await getValidGoogleAccessToken(
    session?.provider_token,
    session?.provider_refresh_token,
    user.id
  )

  if (!tokenResult.accessToken) {
    return {
      success: false,
      error: tokenResult.needsReauth
        ? 'Google 재로그인이 필요합니다.'
        : 'Google 토큰 갱신 실패'
    }
  }

  try {
    // Edge Function 호출
    const { data: result, error } = await supabase.functions.invoke(
      'respond-to-meeting',
      {
        body: {
          bookingId,
          responseStatus,
          employeeId: user.id,
          employeeEmail: user.email,
          accessToken: tokenResult.accessToken
        }
      }
    )

    if (error) {
      console.error('Edge Function error:', error)
      throw error
    }

    if (!result.success) {
      throw new Error(result.error || '응답 처리 실패')
    }

    revalidatePath('/meeting-rooms')
    revalidatePath('/meeting-room-booking')
    revalidatePath('/dashboard')

    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to respond to meeting:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '응답 처리 실패'
    }
  }
}

/**
 * Get meeting invitations for current user
 */
export async function getMeetingInvitations() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  try {
    // 참석자로 초대된 회의 목록 조회
    const { data: invitations, error } = await supabase
      .from('meeting_room_booking_attendee')
      .select(`
        id,
        response_status,
        responded_at,
        booking:meeting_room_booking!inner (
          id,
          title,
          description,
          booking_date,
          start_time,
          end_time,
          calendar_event_url,
          room:meeting_room!inner (
            name,
            location
          ),
          organizer:employee!meeting_room_booking_booked_by_fkey (
            name,
            email
          )
        )
      `)
      .eq('employee_id', user.id)
      .gte('booking.booking_date', new Date().toISOString().split('T')[0])
      .eq('booking.status', 'confirmed')
      .order('booking.booking_date', { ascending: true })
      .order('booking.start_time', { ascending: true })
      .limit(20)

    if (error) {
      console.error('Failed to fetch invitations:', error)
      return []
    }

    return invitations || []
  } catch (error) {
    console.error('Failed to get meeting invitations:', error)
    return []
  }
}
