/**
 * Google OAuth Token Helper
 * refresh_token을 사용하여 만료된 access_token을 갱신
 */

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
  const clientSecret = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET

  if (!clientSecret) {
    console.error('[Google Auth] SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET 없음')
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
 * 유효한 Google access_token 반환 (필요시 갱신)
 */
export async function getValidGoogleAccessToken(
  providerToken: string | null | undefined,
  providerRefreshToken: string | null | undefined
): Promise<GoogleTokenResult> {
  // access_token이 있으면 유효성 확인
  if (providerToken) {
    const isValid = await verifyGoogleToken(providerToken)
    if (isValid) {
      return { accessToken: providerToken }
    }
    console.log('[Google Auth] 토큰 만료됨, 갱신 시도...')
  }

  // refresh_token으로 갱신
  if (!providerRefreshToken) {
    console.log('[Google Auth] refresh_token 없음')
    return { accessToken: null, error: 'refresh_token 없음', needsReauth: true }
  }

  return refreshGoogleAccessToken(providerRefreshToken)
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
