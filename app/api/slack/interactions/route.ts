/**
 * Slack Interactions API
 * 슬랙 버튼 클릭 시 호출되는 엔드포인트
 * - 회의 참석/거절 처리
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getValidGoogleAccessToken } from '@/lib/google-auth'

interface SlackInteractionPayload {
  type: string
  user: {
    id: string
    username: string
    name: string
  }
  actions: {
    action_id: string
    value: string
    type: string
  }[]
  response_url: string
  trigger_id: string
}

export async function POST(request: NextRequest) {
  try {
    // 슬랙은 x-www-form-urlencoded로 payload를 보냄
    const formData = await request.formData()
    const payloadStr = formData.get('payload') as string

    if (!payloadStr) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 })
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadStr)

    // 버튼 클릭 이벤트만 처리
    if (payload.type !== 'block_actions') {
      return NextResponse.json({ ok: true })
    }

    const action = payload.actions[0]
    const slackUserId = payload.user.id
    const bookingId = action.value

    // 회의 관련 액션인지 확인
    if (!['meeting_accept', 'meeting_decline'].includes(action.action_id)) {
      return NextResponse.json({ ok: true })
    }

    const responseStatus = action.action_id === 'meeting_accept' ? 'accepted' : 'declined'

    console.log('[Slack Interaction] 회의 응답:', {
      slackUserId,
      bookingId,
      responseStatus
    })

    // 슬랙 user_id로 employee 조회
    const adminClient = createAdminClient()
    const { data: employee, error: empError } = await adminClient
      .from('employee')
      .select('id, email, google_refresh_token')
      .eq('slack_user_id', slackUserId)
      .single()

    if (empError || !employee) {
      console.error('[Slack Interaction] Employee 조회 실패:', empError)
      return sendSlackResponse(payload.response_url, '사용자 정보를 찾을 수 없습니다.')
    }

    // Google 토큰 획득 시도 (DB에 저장된 refresh_token 사용)
    const tokenResult = await getValidGoogleAccessToken(
      null, // 세션 토큰 없음
      null, // 세션 리프레시 토큰 없음
      employee.id // DB에서 조회
    )

    let calendarSynced = false

    // Google Calendar 연동 시도
    if (tokenResult.accessToken) {
      console.log('[Slack Interaction] Google Calendar 연동 시도')
      try {
        // Edge Function 호출
        const { data: result, error } = await adminClient.functions.invoke(
          'respond-to-meeting',
          {
            body: {
              bookingId,
              responseStatus,
              employeeId: employee.id,
              employeeEmail: employee.email,
              accessToken: tokenResult.accessToken
            }
          }
        )

        if (!error && result?.success) {
          console.log('[Slack Interaction] Google Calendar 연동 성공')
          calendarSynced = true
        } else {
          console.warn('[Slack Interaction] Edge Function 실패:', error)
        }
      } catch (calendarError) {
        console.warn('[Slack Interaction] Calendar 연동 에러:', calendarError)
      }
    }

    // Google Calendar 연동 실패 시 DB만 업데이트
    if (!calendarSynced) {
      console.log('[Slack Interaction] DB만 업데이트 (Calendar 연동 없음)')
      const { error: updateError } = await adminClient
        .from('meeting_room_booking_attendee')
        .update({
          response_status: responseStatus,
          responded_at: new Date().toISOString(),
          calendar_synced: false
        })
        .eq('booking_id', bookingId)
        .eq('employee_id', employee.id)

      if (updateError) {
        console.error('[Slack Interaction] DB 업데이트 실패:', updateError)
        return sendSlackResponse(payload.response_url, '응답 처리에 실패했습니다.')
      }
    }

    // 성공 응답 메시지
    const statusText = responseStatus === 'accepted' ? '참석' : '거절'
    const calendarNote = calendarSynced ? ' (Google Calendar 동기화됨)' : ''

    return sendSlackResponse(
      payload.response_url,
      `회의에 *${statusText}* 처리되었습니다.${calendarNote}`,
      true
    )

  } catch (error) {
    console.error('[Slack Interaction] 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * 슬랙 response_url로 응답 메시지 전송
 */
async function sendSlackResponse(
  responseUrl: string,
  message: string,
  replaceOriginal: boolean = false
): Promise<NextResponse> {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        replace_original: replaceOriginal,
        response_type: 'ephemeral' // 본인에게만 보임
      })
    })
  } catch (err) {
    console.error('[Slack Interaction] Response 전송 실패:', err)
  }

  return NextResponse.json({ ok: true })
}
