'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GoogleConsentPage() {
  useEffect(() => {
    const supabase = createClient()

    // consent 모드로 Google 재로그인
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?needs_consent=true`,
        scopes: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4">Google Calendar 권한 요청 중...</h1>
        <p className="text-gray-500">잠시만 기다려주세요.</p>
      </div>
    </div>
  )
}
