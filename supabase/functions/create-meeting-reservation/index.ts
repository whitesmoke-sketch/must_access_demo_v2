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
      roomId,
      title,
      description,
      bookingDate,
      startTime,
      endTime,
      attendeeEmails,
      organizerId,
      organizerEmail,
      accessToken
    } = await req.json()

    console.log('[Create Meeting] Request:', {
      roomId,
      title,
      bookingDate,
      startTime,
      endTime,
      attendeeCount: attendeeEmails?.length
    })

    if (!roomId || !title || !bookingDate || !startTime || !endTime || !accessToken) {
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

    // 회의실 정보 조회
    const { data: room } = await supabase
      .from('meeting_room')
      .select('name, location')
      .eq('id', roomId)
      .single()

    if (!room) {
      throw new Error('Meeting room not found')
    }

    // Google Calendar에 이벤트 생성
    const startDateTime = `${bookingDate}T${startTime}:00`
    const endDateTime = `${bookingDate}T${endTime}:00`

    console.log('[Create Meeting] Creating calendar event...')

    const attendees = (attendeeEmails || []).map((email: string) => ({
      email: email,
      responseStatus: 'needsAction'
    }))

    const calendarEventBody = {
      summary: `${title} (${room.name})`,
      description: description || '',
      location: room.location || room.name,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Seoul'
      },
      attendees: attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 10 }
        ]
      },
      sendUpdates: 'all'  // 참석자들에게 이메일 초대 발송
    }

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEventBody)
      }
    )

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text()
      console.error('[Create Meeting] Calendar API error:', errorText)
      throw new Error(`Failed to create calendar event: ${errorText}`)
    }

    const eventData = await calendarResponse.json()
    console.log('[Create Meeting] Calendar event created:', eventData.id)

    // DB에 예약 정보 저장
    const { data: booking, error: bookingError } = await supabase
      .from('meeting_room_booking')
      .insert({
        room_id: roomId,
        booked_by: organizerId,
        title: title,
        description: description,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        calendar_event_id: eventData.id,
        calendar_event_url: eventData.htmlLink
      })
      .select()
      .single()

    if (bookingError) {
      console.error('[Create Meeting] DB insert error:', bookingError)
      throw bookingError
    }

    console.log('[Create Meeting] Booking created:', booking.id)

    // 참석자 정보 저장 (예약자 제외)
    if (attendeeEmails && attendeeEmails.length > 0) {
      const { data: employees } = await supabase
        .from('employee')
        .select('id, email')
        .in('email', attendeeEmails)

      if (employees && employees.length > 0) {
        // 예약자는 참석자 테이블에서 제외 (알림 불필요)
        const attendeesWithoutOrganizer = employees.filter(emp => emp.email !== organizerEmail)

        if (attendeesWithoutOrganizer.length === 0) {
          console.log('[Create Meeting] No attendees to add (organizer-only meeting)')
          return new Response(
            JSON.stringify({ success: true, booking }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const attendeeRecords = attendeesWithoutOrganizer.map(emp => ({
          booking_id: booking.id,
          employee_id: emp.id,
          response_status: 'needsAction',
          calendar_synced: true
        }))

        const { error: attendeeError } = await supabase
          .from('meeting_room_booking_attendee')
          .insert(attendeeRecords)

        if (attendeeError) {
          console.error('[Create Meeting] Attendee insert error:', attendeeError)
        } else {
          console.log('[Create Meeting] Attendees added (excluding organizer):', attendeesWithoutOrganizer.length)

          // 참석자들에게 알림 생성 (예약자 제외)
          const { data: organizer } = await supabase
            .from('employee')
            .select('name')
            .eq('id', organizerId)
            .single()

          const organizerName = organizer?.name || organizerEmail

          // 시작 시간 포맷팅
          const startDate = new Date(`${bookingDate}T${startTime}`)
          const formattedDate = startDate.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          // 각 참석자에게 알림 생성 (예약자 제외)
          const notificationRecords = attendeesWithoutOrganizer.map(emp => ({
            recipient_id: emp.id,
            type: 'meeting_invitation',
            title: `${organizerName}님이 회의에 초대했습니다`,
            message: `${title} - ${formattedDate}`,
            channel: 'in_app',
            status: 'sent',
            metadata: {
              meeting_data: {
                id: attendeeRecords.find(a => a.employee_id === emp.id)?.booking_id,
                booking: {
                  id: booking.id,
                  title: title,
                  description: description,
                  booking_date: bookingDate,
                  start_time: startTime,
                  end_time: endTime,
                  calendar_event_url: eventData.htmlLink,
                  room: {
                    name: room.name,
                    location: room.location
                  }
                },
                response_status: 'needsAction'
              }
            },
            action_url: '/meetings',
            sent_at: new Date().toISOString()
          }))

          const { data: insertedNotifications, error: notificationError } = await supabase
            .from('notification')
            .insert(notificationRecords)
            .select()

          if (notificationError) {
            console.error('[Create Meeting] Notification insert error:', notificationError)
          } else {
            console.log('[Create Meeting] Notifications created:', attendeesWithoutOrganizer.length)

            // 각 참석자에게 실시간 알림 Broadcast
            if (insertedNotifications) {
              for (const notification of insertedNotifications) {
                try {
                  const channel = supabase.channel(`notifications:${notification.recipient_id}`)

                  // 채널 구독 후 메시지 전송
                  await new Promise<void>((resolve, reject) => {
                    channel.subscribe((status: string) => {
                      if (status === 'SUBSCRIBED') {
                        channel.send({
                          type: 'broadcast',
                          event: 'new_notification',
                          payload: notification
                        }).then(() => {
                          console.log('[Create Meeting] Broadcast sent to:', notification.recipient_id)
                          supabase.removeChannel(channel)
                          resolve()
                        }).catch(reject)
                      } else if (status === 'CHANNEL_ERROR') {
                        reject(new Error('Channel error'))
                      }
                    })
                  })
                } catch (broadcastError) {
                  console.error('[Create Meeting] Broadcast error:', broadcastError)
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: booking,
        calendarEventUrl: eventData.htmlLink
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Create Meeting] Error:', error)
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
