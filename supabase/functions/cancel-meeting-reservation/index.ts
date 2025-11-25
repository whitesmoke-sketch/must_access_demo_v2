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
      userId,
      accessToken
    } = await req.json()

    console.log('[Cancel Meeting] Request:', { bookingId, userId })

    if (!bookingId || !userId || !accessToken) {
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

    // 예약 정보 조회
    const { data: booking, error: bookingError } = await supabase
      .from('meeting_room_booking')
      .select('calendar_event_id, booked_by, title')
      .eq('id', bookingId)
      .eq('booked_by', userId) // Only owner can cancel
      .single()

    if (bookingError || !booking) {
      console.error('[Cancel Meeting] Booking not found:', bookingError)
      throw new Error('예약을 찾을 수 없거나 권한이 없습니다.')
    }

    // Google Calendar 이벤트 삭제
    if (booking.calendar_event_id) {
      console.log('[Cancel Meeting] Deleting calendar event:', booking.calendar_event_id)

      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text()
        console.error('[Cancel Meeting] Calendar delete error:', errorText)
        // Don't throw - continue with DB update even if calendar delete fails
      } else {
        console.log('[Cancel Meeting] Calendar event deleted successfully')
      }
    }

    // DB 상태 업데이트
    const { error: updateError } = await supabase
      .from('meeting_room_booking')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('booked_by', userId)

    if (updateError) {
      console.error('[Cancel Meeting] DB update error:', updateError)
      throw updateError
    }

    console.log('[Cancel Meeting] Booking cancelled successfully')

    // 관련 알림 삭제 (참석자들에게 보낸 초대 알림)
    const { error: notificationError } = await supabase
      .from('notification')
      .update({
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('type', 'meeting_invitation')
      .contains('metadata', { meeting_data: { booking: { id: bookingId } } })

    if (notificationError) {
      console.error('[Cancel Meeting] Notification update error:', notificationError)
      // Don't throw - not critical
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Cancel Meeting] Error:', error)
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
