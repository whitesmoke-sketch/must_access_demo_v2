import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Slack OAuth Callback Edge Function
 * 슬랙 인증 후 리다이렉트될 때 실행
 *
 * 1. URL 쿼리 파라미터에서 code와 state(사용자 UUID) 추출
 * 2. 슬랙 API로 토큰 교환
 * 3. 사용자 프로필 정보 조회
 * 4. DB 업데이트
 * 5. 앱으로 리다이렉트
 */

interface SlackOAuthResponse {
  ok: boolean
  error?: string
  access_token?: string
  authed_user?: {
    id: string
    access_token?: string
  }
  team?: {
    id: string
    name: string
  }
}

interface SlackUserProfile {
  ok: boolean
  error?: string
  profile?: {
    email?: string
    image_192?: string
    image_512?: string
    display_name?: string
    real_name?: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // 사용자 UUID
    const error = url.searchParams.get('error')

    // 환경 변수
    const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID')
    const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET')
    const SLACK_REDIRECT_URI = Deno.env.get('SLACK_REDIRECT_URI')
    const APP_URL = Deno.env.get('APP_URL') || 'https://must-access-demo-v2.vercel.app'

    // 슬랙에서 에러가 온 경우 (사용자가 취소 등)
    if (error) {
      console.error('[Slack OAuth] Error from Slack:', error)
      return Response.redirect(`${APP_URL}/account?slack_error=${encodeURIComponent(error)}`, 302)
    }

    // 필수 파라미터 검증
    if (!code || !state) {
      console.error('[Slack OAuth] Missing code or state:', { code, state })
      return Response.redirect(`${APP_URL}/account?slack_error=missing_params`, 302)
    }

    // 환경 변수 검증
    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URI) {
      console.error('[Slack OAuth] Missing environment variables')
      return Response.redirect(`${APP_URL}/account?slack_error=server_config_error`, 302)
    }

    // 1. 토큰 교환
    console.log('[Slack OAuth] Exchanging code for token...')
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    })

    const tokenData: SlackOAuthResponse = await tokenResponse.json()

    if (!tokenData.ok || !tokenData.authed_user) {
      console.error('[Slack OAuth] Token exchange failed:', tokenData.error)
      return Response.redirect(`${APP_URL}/account?slack_error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`, 302)
    }

    const slackUserId = tokenData.authed_user.id
    const userAccessToken = tokenData.authed_user.access_token || tokenData.access_token

    console.log('[Slack OAuth] Token exchanged successfully, user ID:', slackUserId)

    // 2. 사용자 프로필 조회 (선택적)
    let slackEmail: string | null = null
    let slackAvatarUrl: string | null = null

    if (userAccessToken) {
      try {
        console.log('[Slack OAuth] Fetching user profile...')
        const profileResponse = await fetch(`https://slack.com/api/users.profile.get?user=${slackUserId}`, {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
          },
        })

        const profileData: SlackUserProfile = await profileResponse.json()

        if (profileData.ok && profileData.profile) {
          slackEmail = profileData.profile.email || null
          slackAvatarUrl = profileData.profile.image_512 || profileData.profile.image_192 || null
          console.log('[Slack OAuth] Profile fetched:', { email: slackEmail, hasAvatar: !!slackAvatarUrl })
        }
      } catch (profileError) {
        console.error('[Slack OAuth] Profile fetch failed (non-critical):', profileError)
        // 프로필 조회 실패는 치명적이지 않음, 계속 진행
      }
    }

    // 3. Supabase 클라이언트 생성 (Service Role Key로 RLS 우회)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 4. DB 업데이트 - state로 전달받은 사용자 ID(employee.id)를 찾아 업데이트
    console.log('[Slack OAuth] Updating employee record for user:', state)
    const { error: updateError } = await supabase
      .from('employee')
      .update({
        slack_user_id: slackUserId,
        slack_access_token: userAccessToken || null,
        slack_email: slackEmail,
        slack_avatar_url: slackAvatarUrl,
        slack_connected_at: new Date().toISOString(),
      })
      .eq('id', state)

    if (updateError) {
      console.error('[Slack OAuth] DB update failed:', updateError)
      return Response.redirect(`${APP_URL}/account?slack_error=db_update_failed`, 302)
    }

    console.log('[Slack OAuth] Successfully connected Slack for user:', state)

    // 5. 성공 - 앱으로 리다이렉트
    return Response.redirect(`${APP_URL}/account?slack_connected=true`, 302)

  } catch (error) {
    console.error('[Slack OAuth] Unexpected error:', error)
    const APP_URL = Deno.env.get('APP_URL') || 'https://must-access-demo-v2.vercel.app'
    return Response.redirect(`${APP_URL}/account?slack_error=unexpected_error`, 302)
  }
})
