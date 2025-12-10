/**
 * Google OAuth Token Helper
 * refresh_token을 사용하여 만료된 access_token을 갱신
 * DB에 저장된 refresh_token을 fallback으로 사용
 */

import { createAdminClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = '620267390218-ftf52ebnfi2o445dbe5imtqfpb1vk2rg.apps.googleusercontent.com'

interface TokenRefreshResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope?: string
}

export interface GoogleTokenResult {
  accessToken: string | null
  error?: string
  needsReauth?: boolean
}

/**
 * refresh_token으로 새 access_token 발급
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResult> {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientSecret) {
    console.error('[Google Auth] GOOGLE_CLIENT_SECRET 환경변수 없음')
    return { accessToken: null, error: 'Google client secret 없음', needsReauth: true }
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: GOOGLE_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Google Auth] 토큰 갱신 실패:', errorText)

      // refresh_token이 무효화된 경우 재인증 필요
      if (response.status === 400 || response.status === 401) {
        return { accessToken: null, error: 'Refresh token 무효', needsReauth: true }
      }

      return { accessToken: null, error: `토큰 갱신 실패: ${response.status}` }
    }

    const data: TokenRefreshResponse = await response.json()
    console.log('[Google Auth] 토큰 갱신 성공, 만료:', data.expires_in, '초')

    return { accessToken: data.access_token }
  } catch (error) {
    console.error('[Google Auth] 토큰 갱신 에러:', error)
    return { accessToken: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 유효한 Google access_token 반환 (세션 -> DB 순으로 탐색)
 * @param providerToken 세션의 access_token
 * @param providerRefreshToken 세션의 refresh_token
 * @param userId DB 조회를 위한 사용자 ID (employee.id)
 */
export async function getValidGoogleAccessToken(
  providerToken: string | null | undefined,
  providerRefreshToken: string | null | undefined,
  userId?: string
): Promise<GoogleTokenResult> {
  // 1. 세션에 있는 access_token이 유효한지 확인
  if (providerToken) {
    const isValid = await verifyGoogleToken(providerToken)
    if (isValid) {
      return { accessToken: providerToken }
    }
    console.log('[Google Auth] 세션 Access Token 만료됨')
  }

  // 2. 세션에 refresh_token이 있다면 갱신 시도
  if (providerRefreshToken) {
    console.log('[Google Auth] 세션 Refresh Token으로 갱신 시도')
    return refreshGoogleAccessToken(providerRefreshToken)
  }

  // 3. 세션에 토큰이 없으면 DB에서 조회 (Fallback)
  if (userId) {
    console.log('[Google Auth] 세션에 토큰 없음. DB에서 백업 토큰 조회 중...')
    try {
      const adminClient = createAdminClient()
      const { data: employee, error } = await adminClient
        .from('employee')
        .select('google_refresh_token')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[Google Auth] DB 조회 실패:', error.message)
      } else if (employee?.google_refresh_token) {
        console.log('[Google Auth] DB에서 Refresh Token 발견! 갱신 시도')
        return refreshGoogleAccessToken(employee.google_refresh_token)
      } else {
        console.log('[Google Auth] DB에 저장된 Refresh Token 없음')
      }
    } catch (err) {
      console.error('[Google Auth] DB 조회 중 오류:', err)
    }
  }

  // 4. 모든 토큰 소실 - 재로그인 필요
  console.log('[Google Auth] 모든 토큰 소실. 재로그인 필요.')
  return { accessToken: null, error: 'refresh_token 없음', needsReauth: true }
}

/**
 * Google access_token 유효성 확인
 */
async function verifyGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    )
    return response.ok
  } catch {
    return false
  }
}
