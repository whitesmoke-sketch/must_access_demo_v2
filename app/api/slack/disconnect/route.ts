import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 슬랙 연동 해제 API
 * POST /api/slack/disconnect
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 슬랙 연동 정보 초기화
    const { error: updateError } = await supabase
      .from('employee')
      .update({
        slack_user_id: null,
        slack_access_token: null,
        slack_email: null,
        slack_avatar_url: null,
        slack_connected_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Slack Disconnect] DB update failed:', updateError)
      return NextResponse.json(
        { error: '슬랙 연동 해제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Slack Disconnect] Unexpected error:', error)
    return NextResponse.json(
      { error: '예상치 못한 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
