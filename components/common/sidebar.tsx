'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Users,
  UserCheck,
  Armchair,
  Lock,
  ClipboardList,
  Calendar,
  Clock,
  Shield,
  LayoutDashboard,
  Menu,
  X,
  FileCheck,
  FilePlus,
  DoorOpen,
  UserCog,
  LayoutPanelLeft,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  role?: string
  roleLevel?: number
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({
  role,
  roleLevel = 1,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const getMenuItems = () => {
    const baseItems = [
      {
        id: 'dashboard',
        label: '대시보드',
        icon: LayoutPanelLeft,
        href: '/dashboard',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: true,
      },
      {
        id: 'admin-dashboard',
        label: '관리자 대시보드',
        icon: LayoutDashboard,
        href: '/admin/dashboard',
        roles: ['admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'seats',
        label: '자유석',
        icon: Armchair,
        href: '/resources/seats',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'lockers',
        label: '사물함',
        icon: Lock,
        href: '/resources/lockers',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'meeting-rooms',
        label: '회의실 예약',
        icon: DoorOpen,
        href: '/resources/meeting-rooms',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'my-leave',
        label: '내 연차 조회',
        icon: Calendar,
        href: '/leave/my-leave',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: true,
      },
      {
        id: 'request-form',
        label: '신청서 작성',
        icon: FilePlus,
        href: '/request',
        roles: ['employee', 'team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: true,
      },
      {
        id: 'leave',
        label: '연차 관리',
        icon: Calendar,
        href: '/admin/leave',
        roles: ['admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'approval-inbox',
        label: '결재함',
        icon: FileCheck,
        href: '/documents',
        roles: ['team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: false,
      },
    ]

    const adminItems = [
      {
        id: 'employees',
        label: '조직구성원',
        icon: Users,
        href: '/admin/employees',
        roles: ['team_leader', 'department_head', 'business_head', 'hr', 'admin', 'super_admin'],
        implemented: true,
      },
      {
        id: 'visitors',
        label: '방문자',
        icon: UserCheck,
        href: '/admin/visitors',
        roles: ['admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'access',
        label: '출입기록',
        icon: ClipboardList,
        href: '/admin/access',
        roles: ['admin', 'super_admin'],
        implemented: false,
      },
      {
        id: 'attendance',
        label: '근태관리',
        icon: Clock,
        href: '/admin/attendance',
        roles: ['admin', 'super_admin'],
        implemented: false,
      },
    ]

    const superAdminItems = [
      {
        id: 'permissions',
        label: '권한관리',
        icon: Shield,
        href: '/admin/permissions',
        roles: ['super_admin'],
        implemented: false,
      },
    ]

    // Role level 기반 필터링
    // level 1: 모든 메뉴
    // level 3+: admin 메뉴 포함
    // level 5+: super_admin 메뉴 포함
    return [...baseItems, ...adminItems, ...superAdminItems].filter((item) => {
      // level 5 (CEO, HR): 모든 메뉴 접근
      if (roleLevel >= 5) return true

      // level 3-4 (부서리더, 사업리더): admin 메뉴까지
      if (roleLevel >= 3 && !item.roles.includes('super_admin')) return true

      // level 1-2 (일반사원, 팀리더): employee 메뉴만
      return item.roles.includes('employee')
    })
  }

  const menuItems = getMenuItems()

  return (
    <>
      {/* Desktop Sidebar */}
      <TooltipProvider>
        <aside
          className={`hidden md:flex flex-col bg-white border-r fixed left-0 top-0 h-full transition-all duration-300 z-30 ${
            collapsed ? 'w-20' : 'w-[270px]'
          }`}
          style={{ borderColor: '#E5E8EB' }}
        >
          <div
            className="flex items-center justify-between h-16 px-6 border-b"
            style={{ borderColor: '#E5E8EB' }}
          >
            {!collapsed && (
              <h1 style={{ color: '#635BFF', fontSize: '18px', fontWeight: 700 }}>
                MUST Access
              </h1>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ marginLeft: collapsed ? 'auto' : '0' }}
            >
              <Menu className="w-5 h-5" style={{ color: '#A0ACB3' }} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isHovered = hoveredItem === item.id

              const handleClick = (e: React.MouseEvent) => {
                if (!item.implemented) {
                  e.preventDefault()
                  toast.info(`${item.label} 기능은 곧 제공될 예정입니다`, {
                    description: '현재 개발 중인 기능입니다.',
                  })
                }
              }

              const menuButton = (
                <Link
                  key={item.id}
                  href={item.implemented ? item.href : '#'}
                  onClick={handleClick}
                  className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 relative ${
                    collapsed ? 'justify-center px-4 py-3' : 'px-4 py-3'
                  } ${!item.implemented ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: isActive ? '#635BFF' : 'transparent',
                    color: isActive ? '#ffffff' : isHovered ? '#635BFF' : '#5B6A72',
                    boxShadow: isActive ? '0 2px 4px rgba(99, 91, 255, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                      e.currentTarget.style.color = '#635BFF'
                    }
                    setHoveredItem(item.id)
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#5B6A72'
                    }
                    setHoveredItem(null)
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-150"
                    style={{
                      color: isActive ? '#ffffff' : isHovered ? '#635BFF' : '#A0ACB3',
                    }}
                  />
                  {!collapsed && (
                    <span className="flex-1">{item.label}</span>
                  )}
                  {!collapsed && !item.implemented && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      준비중
                    </span>
                  )}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="border-none shadow-md"
                      style={{
                        backgroundColor: '#16CDC7',
                        color: '#FFFFFF',
                        fontWeight: 500,
                      }}
                    >
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return menuButton
            })}
          </nav>

          <div className="p-4 border-t" style={{ borderColor: '#E5E8EB' }}>
            {role !== 'employee' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
                      collapsed ? 'justify-center px-4 py-3' : 'px-4 py-3'
                    }`}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#5B6A72',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                      e.currentTarget.style.color = '#635BFF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#5B6A72'
                    }}
                    onClick={() => alert('관리자 모드 전환 기능은 준비 중입니다.')}
                  >
                    <UserCog className="w-5 h-5" />
                    {!collapsed && <span>관리자 모드</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent
                    side="right"
                    className="border-none shadow-md"
                    style={{
                      backgroundColor: '#16CDC7',
                      color: '#FFFFFF',
                      fontWeight: 500,
                    }}
                  >
                    <p>관리자 모드</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </aside>
      </TooltipProvider>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed md:hidden inset-y-0 left-0 z-50 w-[270px] bg-white transform transition-transform duration-200 ease-in-out border-r ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: '#E5E8EB' }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between h-16 px-6 border-b"
            style={{ borderColor: '#E5E8EB' }}
          >
            <h1 style={{ color: '#635BFF', fontSize: '18px', fontWeight: 700 }}>
              MUST Access
            </h1>
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" style={{ color: '#A0ACB3' }} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              const handleClick = (e: React.MouseEvent) => {
                if (!item.implemented) {
                  e.preventDefault()
                  toast.info(`${item.label} 기능은 곧 제공될 예정입니다`, {
                    description: '현재 개발 중인 기능입니다.',
                  })
                } else {
                  onMobileClose()
                }
              }

              return (
                <Link
                  key={item.id}
                  href={item.implemented ? item.href : '#'}
                  onClick={handleClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 relative ${
                    !item.implemented ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? '#635BFF' : 'transparent',
                    color: isActive ? '#ffffff' : '#5B6A72',
                    boxShadow: isActive ? '0 2px 4px rgba(99, 91, 255, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? '#ffffff' : '#A0ACB3' }}
                  />
                  <span className="flex-1">{item.label}</span>
                  {!item.implemented && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      준비중
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
