import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      bookingId,
      responseStatus,  // 'accepted' or 'declined'
      employeeId,
      employeeEmail,
      accessToken
    } = await req.json()

    console.log('[Respond to Meeting] Request:', {
      bookingId,
      responseStatus,
      employeeId
    })

    if (!bookingId || !responseStatus || !employeeId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 예약 정보 조회 (calendar_event_id 필요)
    const { data: booking, error: bookingError } = await supabase
      .from('meeting_room_booking')
      .select('calendar_event_id, booked_by, title')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('[Respond to Meeting] Booking not found:', bookingError)
      throw new Error('Booking not found')
    }

    if (!booking.calendar_event_id) {
      throw new Error('No calendar event associated with this booking')
    }

    console.log('[Respond to Meeting] Booking found:', {
      eventId: booking.calendar_event_id,
      title: booking.title
    })

    // Google Calendar에서 이벤트 조회
    console.log('[Respond to Meeting] Fetching calendar event...')
    const getEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!getEventResponse.ok) {
      const errorText = await getEventResponse.text()
      console.error('[Respond to Meeting] Failed to get event:', errorText)
      throw new Error(`Failed to get calendar event: ${errorText}`)
    }

    const event = await getEventResponse.json()
    console.log('[Respond to Meeting] Event found:', event.id)

    // 참석자 목록에서 현재 사용자 찾아서 응답 상태 업데이트
    const attendees = event.attendees || []
    const updatedAttendees = attendees.map((attendee: any) => {
      if (attendee.email.toLowerCase() === employeeEmail.toLowerCase()) {
        return {
          ...attendee,
          responseStatus: responseStatus
        }
      }
      return attendee
    })

    // Google Calendar 이벤트 업데이트
    console.log('[Respond to Meeting] Updating calendar event...')
    const updateEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendees: updatedAttendees
        })
      }
    )

    if (!updateEventResponse.ok) {
      const errorText = await updateEventResponse.text()
      console.error('[Respond to Meeting] Calendar update error:', errorText)
      throw new Error(`Failed to update calendar response: ${errorText}`)
    }

    const updatedEvent = await updateEventResponse.json()
    console.log('[Respond to Meeting] Calendar updated successfully')

    // DB에 응답 상태 저장
    const { error: updateError } = await supabase
      .from('meeting_room_booking_attendee')
      .update({
        response_status: responseStatus,
        responded_at: new Date().toISOString(),
        calendar_synced: true
      })
      .eq('booking_id', bookingId)
      .eq('employee_id', employeeId)

    if (updateError) {
      console.error('[Respond to Meeting] DB update error:', updateError)
      throw updateError
    }

    console.log('[Respond to Meeting] DB updated successfully')

    // 관련 알림을 읽음 처리
    const { error: notificationError } = await supabase
      .from('notification')
      .update({
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', employeeId)
      .eq('type', 'meeting_invitation')
      .contains('metadata', { meeting_data: { booking: { id: bookingId } } })

    if (notificationError) {
      console.error('[Respond to Meeting] Notification update error:', notificationError)
      // Don't throw - this is not critical
    } else {
      console.log('[Respond to Meeting] Notification marked as read')
    }

    return new Response(
      JSON.stringify({
        success: true,
        responseStatus: responseStatus,
        eventUrl: updatedEvent.htmlLink
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Respond to Meeting] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
