'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
}

interface SidebarProps {
  items?: SidebarItem[]
  className?: string
}

const defaultItems: SidebarItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/leave', icon: Calendar, label: '연차 관리' },
  { href: '/attendance', icon: Clock, label: '근태 관리' },
  { href: '/resources', icon: MapPin, label: '자원 예약' },
  { href: '/admin/users', icon: Users, label: '조직 관리' },
  { href: '/settings', icon: Settings, label: '설정' },
]

/**
 * Collapsible Mini Sidebar - Figma Guidelines
 * - Expanded: 270px width (icon + text)
 * - Collapsed: 80px width (icon only, tooltip on hover)
 * - Active: Primary color background
 * - Hover: 20% opacity, 150ms transition
 */
export function Sidebar({ items = defaultItems, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-surface border-r border-border transition-all duration-300 z-50',
        isCollapsed ? 'w-[80px]' : 'w-[270px]',
        className
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <h1 className="text-h2 font-semibold text-primary">MUST Access</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 interactive"
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-fast',
                    'hover:bg-primary/20 interactive',
                    isActive && 'bg-primary text-white',
                    !isActive && 'text-gray-700',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-error text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg w-full',
            'hover:bg-error/10 text-error interactive',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? '로그아웃' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}

