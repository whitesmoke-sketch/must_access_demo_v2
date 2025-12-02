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
  FileText,
  Building2,
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
  const [adminModeEnabled, setAdminModeEnabled] = useState(false)

  // 일반 사용자 메뉴
  const normalMenuItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: LayoutPanelLeft,
      href: '/dashboard',
      implemented: true,
    },
    {
      id: 'seats',
      label: '자유석',
      icon: Armchair,
      href: '/resources/seats',
      implemented: true,
    },
    {
      id: 'lockers',
      label: '사물함',
      icon: Lock,
      href: '/resources/lockers',
      implemented: false,
    },
    {
      id: 'meeting-rooms',
      label: '회의실 예약',
      icon: DoorOpen,
      href: '/meeting-rooms',
      implemented: true,
    },
    {
      id: 'my-leave',
      label: '내 연차 조회',
      icon: Calendar,
      href: '/leave/my-leave',
      implemented: true,
    },
    {
      id: 'request-form',
      label: '신청서 작성',
      icon: FilePlus,
      href: '/request',
      implemented: true,
    },
    {
      id: 'my-documents',
      label: '내 문서',
      icon: FileText,
      href: '/documents/my-documents',
      implemented: true,
    },

    {
      id: 'approval-inbox',
      label: '결재함',
      icon: FileCheck,
      href: '/documents',
      implemented: true,
      requiresRole: true,
    },
  ]

  // 관리자 모드 메뉴
  const adminMenuItems = [
    {
      id: 'admin-dashboard',
      label: '관리자 대시보드',
      icon: LayoutDashboard,
      href: '/admin/dashboard',
      implemented: true,
    },
    {
      id: 'employees',
      label: '조직구성원',
      icon: Users,
      href: '/admin/employees',
      implemented: true,
    },
    {
      id: 'visitors',
      label: '방문자 출입기록',
      icon: UserCheck,
      href: '/admin/visitors',
      implemented: false,
    },
    {
      id: 'attendance',
      label: '근태관리',
      icon: Clock,
      href: '/admin/attendance',
      implemented: false,
    },
    {
      id: 'leave-management-admin',
      label: '연차 관리',
      icon: Calendar,
      href: '/admin/leave-management',
      implemented: true,
    },
    {
      id: 'permissions',
      label: '권한관리',
      icon: Shield,
      href: '/admin/permissions',
      implemented: false,
    },
    {
      id: 'organization-management',
      label: '조직관리',
      icon: Building2,
      href: '/admin/organization-management',
      implemented: true,
    },
  ]

  const getMenuItems = () => {
    if (adminModeEnabled) {
      return adminMenuItems
    }

    // 일반 모드: 역할에 따른 필터링
    return normalMenuItems.filter((item) => {
      // requiresRole이 true인 항목은 roleLevel 2 이상만
      if (item.requiresRole && roleLevel < 2) {
        return false
      }
      return true
    })
  }

  const menuItems = getMenuItems()

  return (
    <>
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
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
                      color: isActive ? '#ffffff' : isHovered ? '#635BFF' : '#5B6A72',
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
                      variant="secondary"
                      className="border-none shadow-md"
                      style={{
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
            {roleLevel >= 5 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
                      collapsed ? 'justify-center px-4 py-3' : 'px-4 py-3'
                    }`}
                    style={{
                      backgroundColor: adminModeEnabled ? '#635BFF' : 'transparent',
                      color: adminModeEnabled ? '#ffffff' : '#5B6A72',
                      boxShadow: adminModeEnabled ? '0 2px 4px rgba(99, 91, 255, 0.2)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!adminModeEnabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                        e.currentTarget.style.color = '#635BFF'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!adminModeEnabled) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#5B6A72'
                      }
                    }}
                    onClick={() => {
                      setAdminModeEnabled(!adminModeEnabled)
                      toast.success(
                        adminModeEnabled ? '일반 모드로 전환되었습니다' : '관리자 모드로 전환되었습니다',
                        {
                          description: adminModeEnabled
                            ? '일반 사용자 메뉴가 표시됩니다.'
                            : '관리자 메뉴가 표시됩니다.',
                        }
                      )
                    }}
                  >
                    <UserCog
                      className="w-5 h-5"
                      style={{
                        color: adminModeEnabled ? '#ffffff' : undefined,
                      }}
                    />
                    {!collapsed && <span>관리자 모드</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent
                    side="right"
                    variant="secondary"
                    className="border-none shadow-md"
                    style={{
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
                    style={{ color: isActive ? '#ffffff' : '#5B6A72' }}
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

          {roleLevel >= 5 && (
            <div className="p-4 border-t" style={{ borderColor: '#E5E8EB' }}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: adminModeEnabled ? '#635BFF' : 'transparent',
                  color: adminModeEnabled ? '#ffffff' : '#5B6A72',
                  boxShadow: adminModeEnabled ? '0 2px 4px rgba(99, 91, 255, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!adminModeEnabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                    e.currentTarget.style.color = '#635BFF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!adminModeEnabled) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#5B6A72'
                  }
                }}
                onClick={() => {
                  setAdminModeEnabled(!adminModeEnabled)
                  toast.success(
                    adminModeEnabled ? '일반 모드로 전환되었습니다' : '관리자 모드로 전환되었습니다',
                    {
                      description: adminModeEnabled
                        ? '일반 사용자 메뉴가 표시됩니다.'
                        : '관리자 메뉴가 표시됩니다.',
                    }
                  )
                }}
              >
                <UserCog
                  className="w-5 h-5"
                  style={{
                    color: adminModeEnabled ? '#ffffff' : undefined,
                  }}
                />
                <span>관리자 모드</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
