import { createClient } from '@/lib/supabase/server'
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
        .eq('email', data.user.email)
        .single()

      // 역할별 리다이렉트
      const employeeData = employee as unknown as EmployeeWithRole
      if (employeeData?.role?.code === 'admin') {
        return NextResponse.redirect(`${origin}/admin/dashboard`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // 실패 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login`)
}
