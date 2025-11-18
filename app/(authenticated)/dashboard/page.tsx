import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">대시보드</h1>
      <p>환영합니다, {user?.email}</p>
      {/* TODO: Add Dashboard Components */}
    </div>
  )
}
