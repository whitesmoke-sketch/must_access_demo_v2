'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { User } from '@supabase/supabase-js'
import type { EmployeeWithRole } from '@/types/database'

interface LayoutClientProps {
  user: User
  employee: EmployeeWithRole | null
  children: React.ReactNode
}

export function LayoutClient({ user, employee, children }: LayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <Sidebar
        role={employee?.role?.code}
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
