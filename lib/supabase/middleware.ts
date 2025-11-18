// Middleware에서 사용하는 Supabase 클라이언트
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 새로고침 (토큰 자동 갱신)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인이 필요한 페이지에 대한 보호 로직은 여기서 구현
  // 예: if (!user && request.nextUrl.pathname.startsWith('/dashboard')) { ... }

  return supabaseResponse
}
