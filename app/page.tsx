import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인되어 있으면 대시보드로 리다이렉트
  if (user) {
    redirect('/dashboard')
  }

  // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
  redirect('/login')
}
