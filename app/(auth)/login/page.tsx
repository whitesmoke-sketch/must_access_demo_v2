'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EmployeeWithRole } from '@/types/database'

const ERROR_MESSAGES: Record<string, string> = {
  'not-invited': '등록되지 않은 이메일입니다. 관리자에게 문의하세요.',
  'system-error': '시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'auth-failed': '인증에 실패했습니다. 다시 시도해주세요.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // URL 쿼리 파라미터에서 에러 읽기
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam])
    }
  }, [searchParams])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      // 사용자 역할 조회
      const { data: employee } = await supabase
        .from('employee')
        .select(`
          id,
          name,
          email,
          role:role_id!inner (
            code,
            name
          )
        `)
        .eq('email', email)
        .single()

      // 역할별 리다이렉트
      const employeeData = employee as unknown as EmployeeWithRole
      if (employeeData?.role?.code === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/dashboard')
      }

      toast.success('로그인 성공!')
    } catch (err) {
      const error = err as Error
      setError(error.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/drive.file',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      })

      if (signInError) throw signInError
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Google 로그인에 실패했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* 로고 */}
          <div className="flex justify-center mb-12">
            <h1 
              style={{ 
                fontSize: '40px', 
                fontWeight: 700,
                color: '#635BFF',
                letterSpacing: '-0.02em'
              }}
            >
              MUST Access
            </h1>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border transition-all"
                style={{
                  backgroundColor: 'var(--input-background)',
                  borderColor: 'var(--border)',
                  color: 'var(--card-foreground)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--primary)';
                  e.currentTarget.style.outlineOffset = '0px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border transition-all"
                style={{
                  backgroundColor: 'var(--input-background)',
                  borderColor: 'var(--border)',
                  color: 'var(--card-foreground)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--primary)';
                  e.currentTarget.style.outlineOffset = '0px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div 
                className="px-4 py-2 rounded-lg text-sm"
                style={{ 
                  backgroundColor: '#FFF0ED',
                  color: 'var(--error)',
                  fontSize: 'var(--font-size-caption)',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 text-center transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-body)',
                lineHeight: 1.5,
                transitionDuration: '150ms',
                transitionTimingFunction: 'ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            {/* 구분선 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
              </div>
              <div className="relative flex justify-center">
                <span 
                  className="px-4" 
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    fontSize: 'var(--font-size-caption)', 
                    color: 'var(--muted-foreground)' 
                  }}
                >
                  또는
                </span>
              </div>
            </div>

            {/* Google 로그인 */}
            <button
              type="button"
              className="w-full px-6 py-3 flex items-center justify-center gap-3 border transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: 'var(--border)',
                color: '#29363D',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-body)',
                lineHeight: 1.5,
                transitionDuration: '150ms',
                transitionTimingFunction: 'ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F6F8F9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.1713 8.36788H17.5001V8.33329H10.0001V11.6666H14.7096C14.0225 13.607 12.1763 15 10.0001 15C7.23882 15 5.00007 12.7612 5.00007 9.99996C5.00007 7.23871 7.23882 4.99996 10.0001 4.99996C11.2746 4.99996 12.4342 5.48079 13.3171 6.26621L15.6742 3.90913C14.1859 2.52204 12.1951 1.66663 10.0001 1.66663C5.39799 1.66663 1.66675 5.39788 1.66675 9.99996C1.66675 14.602 5.39799 18.3333 10.0001 18.3333C14.6022 18.3333 18.3334 14.602 18.3334 9.99996C18.3334 9.44121 18.2755 8.89579 18.1713 8.36788Z" fill="#FFC107"/>
                <path d="M2.62756 6.12121L5.36548 8.12913C6.10631 6.29496 7.90215 4.99996 10.0001 4.99996C11.2746 4.99996 12.4342 5.48079 13.3171 6.26621L15.6742 3.90913C14.1859 2.52204 12.1951 1.66663 10.0001 1.66663C6.79923 1.66663 4.02339 3.47371 2.62756 6.12121Z" fill="#FF3D00"/>
                <path d="M10.0001 18.3333C12.1526 18.3333 14.1101 17.5095 15.5876 16.162L13.0084 13.9875C12.1432 14.6452 11.0865 15.0008 10.0001 15C7.83258 15 5.99175 13.6179 5.29883 11.6891L2.58008 13.7829C3.96091 16.4816 6.76133 18.3333 10.0001 18.3333Z" fill="#4CAF50"/>
                <path d="M18.1713 8.36796H17.5001V8.33337H10.0001V11.6667H14.7096C14.3809 12.5902 13.7889 13.3972 13.0067 13.9879L13.0084 13.9871L15.5876 16.1617C15.4042 16.3275 18.3334 14.1667 18.3334 10C18.3334 9.44129 18.2755 8.89587 18.1713 8.36796Z" fill="#1976D2"/>
              </svg>
              Google로 로그인
            </button>
          </form>

        {/* 테스트 계정 안내 */}
        <div className="mt-6 text-center">
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            테스트 계정: admin@must.com / password
          </p>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            테스트 계정: employee@must.com / password
          </p>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            테스트 계정: designer@must.com / password
          </p>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-6" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-center" style={{ fontSize: 'var(--font-size-copyright)', color: 'var(--muted-foreground)' }}>
          © 2024 MUST Access. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
