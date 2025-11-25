'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { User } from '@supabase/supabase-js'
import type { EmployeeWithRole } from '@/types/database'
import type { Notification } from '@/app/actions/notification'

interface LayoutClientProps {
  user: User
  employee: EmployeeWithRole | null
  notifications: Notification[]
  children: React.ReactNode
}

export function LayoutClient({ user, employee, notifications, children }: LayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <Sidebar
        role={employee?.role?.code}
        roleLevel={employee?.role?.level}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-[270px]'
        }`}
      >
        <Header
          user={user}
          employee={employee}
          notifications={notifications}
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-auto px-6 py-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}
