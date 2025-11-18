import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TODO: Add Navigation/Sidebar Component */}
      <main className="p-6">{children}</main>
    </div>
  )
}
