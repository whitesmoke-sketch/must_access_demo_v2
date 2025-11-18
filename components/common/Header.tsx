'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'
import type { EmployeeWithRole } from '@/types/database'

interface HeaderProps {
  user: User
  employee: EmployeeWithRole | null
}

export function Header({ user, employee }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error('로그아웃에 실패했습니다')
      return
    }

    router.push('/login')
    router.refresh()
    toast.success('로그아웃되었습니다')
  }

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-primary">MUST Access</h1>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">
          {employee?.name || user.email}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="로그아웃"
          className="px-2"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
