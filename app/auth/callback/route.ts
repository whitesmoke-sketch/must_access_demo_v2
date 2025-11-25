import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmployeeWithRole } from '@/types/database'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // 사용자 역할 확인
      const { data: employee, error: employeeError } = await supabase
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
        .eq('email', data.user.email)
        .single()

      // employee가 없는 경우 (첫 로그인)
      if (employeeError || !employee) {
        console.log('[Auth Callback] employee 없음, 이메일 검증 시작:', data.user.email)

        // Edge Function 호출: 이메일 검증 및 가입 처리
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/validate-and-register-employee`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              email: data.user.email,
              authUserId: data.user.id,
              name: data.user.user_metadata?.name || data.user.user_metadata?.full_name
            })
          })

          const result = await response.json()

          if (!response.ok || !result.success) {
            console.error('[Auth Callback] 이메일 검증 실패:', result)

            // invited_employees에 없음 → auth.users에서 계정 완전 삭제
            try {
              const adminClient = createAdminClient()
              await adminClient.auth.admin.deleteUser(data.user.id)
              console.log('[Auth Callback] 미등록 사용자 계정 삭제 완료:', data.user.email)
            } catch (deleteError) {
              console.error('[Auth Callback] 계정 삭제 실패:', deleteError)
              // 삭제 실패해도 로그아웃은 진행
              await supabase.auth.signOut()
            }

            return NextResponse.redirect(`${origin}/login?error=not-invited`)
          }

          console.log('[Auth Callback] 구성원 등록 완료, 대시보드로 이동')
          // 신규 가입 완료 → 대시보드로
          return NextResponse.redirect(`${origin}/dashboard`)
        } catch (err) {
          console.error('[Auth Callback] Edge Function 호출 실패:', err)
          return NextResponse.redirect(`${origin}/login?error=system-error`)
        }
      }

      // employee가 있는 경우 (기존 사용자)
      // 역할별 리다이렉트
      const employeeData = employee as unknown as EmployeeWithRole
      if (employeeData?.role?.code === 'admin') {
        return NextResponse.redirect(`${origin}/admin/dashboard`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // 실패 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
