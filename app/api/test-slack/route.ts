import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const token = process.env.SLACK_BOT_TOKEN

  // 1. 토큰 확인
  if (!token) {
    return NextResponse.json({
      error: 'SLACK_BOT_TOKEN이 설정되지 않았습니다',
      hasToken: false
    })
  }

  // 2. DB에서 slack_user_id 가져오기
  const adminSupabase = createAdminClient()
  const { data: employees } = await adminSupabase
    .from('employee')
    .select('id, name, slack_user_id')
    .not('slack_user_id', 'is', null)
    .limit(1)

  if (!employees || employees.length === 0) {
    return NextResponse.json({
      error: '슬랙 연동된 직원이 없습니다',
      hasToken: true,
      tokenPrefix: token.substring(0, 10) + '...'
    })
  }

  const testUser = employees[0]

  // 3. 테스트 메시지 발송
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: testUser.slack_user_id,
        text: '🧪 테스트 메시지입니다. 슬랙 알림이 정상 작동합니다!',
        mrkdwn: true,
      }),
    })

    const result = await response.json()

    return NextResponse.json({
      success: result.ok,
      hasToken: true,
      tokenPrefix: token.substring(0, 10) + '...',
      testUser: testUser.name,
      slackUserId: testUser.slack_user_id,
      slackResponse: result
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Slack API 호출 실패',
      hasToken: true,
      tokenPrefix: token.substring(0, 10) + '...',
      errorDetail: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
