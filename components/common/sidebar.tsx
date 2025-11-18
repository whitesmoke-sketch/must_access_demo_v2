'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarCheck
} from 'lucide-react'

interface SidebarProps {
  role?: string
}

const employeeMenu = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: Calendar, label: '내 연차', href: '/leave/my-leave' },
]

const adminMenu = [
  { icon: LayoutDashboard, label: '대시보드', href: '/admin/dashboard' },
  { icon: Users, label: '조직 관리', href: '/admin/employees' },
  { icon: CalendarCheck, label: '연차 관리', href: '/admin/leave-management' },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const menu = role === 'admin' ? adminMenu : employeeMenu

  return (
    <aside className="w-60 bg-muted border-r border-border hidden lg:block">
      <nav className="p-4 space-y-2">
        {menu.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
