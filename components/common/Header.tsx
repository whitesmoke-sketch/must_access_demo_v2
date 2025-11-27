'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NotificationDropdown from '@/components/NotificationDropdown'
import type { Notification } from '@/app/actions/notification'
import {
  Menu,
  // Search,  // TODO: 추후 구현 예정
  // Moon,    // TODO: 추후 구현 예정
  // Sun,     // TODO: 추후 구현 예정
  User,
  // Languages, // TODO: 추후 구현 예정
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { EmployeeWithRole, UserStatus } from '@/types/database'

interface HeaderProps {
  user: SupabaseUser
  employee: EmployeeWithRole | null
  notifications?: Notification[]
  onMobileMenuClick?: () => void
}

export function Header({ user, employee, notifications = [], onMobileMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  // TODO: 추후 구현 예정
  // const [darkMode, setDarkMode] = useState(false)
  // const [searchQuery, setSearchQuery] = useState('')
  // const [currentLang, setCurrentLang] = useState<'KR' | 'EN'>('KR')
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('online')

  const getStatusInfo = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return { emoji: '🟢', label: '온라인', color: '#4CD471' }
      case 'in_meeting':
        return { emoji: '💬', label: '회의중', color: '#635BFF' }
      case 'lunch':
        return { emoji: '🍽️', label: '식사중', color: '#F8C653' }
      case 'away':
        return { emoji: '🚶', label: '이동중', color: '#A0ACB3' }
      case 'offline':
        return { emoji: '⚪', label: '오프라인', color: '#D3D9DC' }
      case 'vacation':
        return { emoji: '🌴', label: '휴가', color: '#16CDC7' }
    }
  }

  const handleStatusChange = (newStatus: UserStatus) => {
    setCurrentStatus(newStatus)
    // TODO: DB에 상태 업데이트
    toast.success(`상태가 "${getStatusInfo(newStatus).label}"(으)로 변경되었습니다`)
  }

  const statusInfo = getStatusInfo(currentStatus)

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
    <header
      className="bg-white px-6 flex items-center h-16 flex-shrink-0 border-b"
      style={{ borderColor: '#E5E8EB' }}
    >
      <div className="flex items-center justify-between w-full max-w-full">
        {/* Left - Mobile Menu */}
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" style={{ color: '#5B6A72' }} />
        </button>

        {/* TODO: 추후 구현 예정 - Center - Search Bar (Desktop) */}
        {/* <div className="hidden lg:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: '#A0ACB3' }}
            />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: '#F8FAFC',
                borderColor: '#E5E8EB',
                color: '#29363D',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#635BFF'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E8EB'
              }}
            />
          </div>
        </div> */}

        <div className="flex-1 lg:flex-none" />

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* TODO: 추후 구현 예정 - Language Toggle Dropdown */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-lg transition-all"
                aria-label="언어 변경"
                style={{
                  backgroundColor: 'var(--muted)',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.97)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)'
                }}
              >
                <Languages className="w-5 h-5" style={{ color: '#5B6A72' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setCurrentLang('KR')}
                style={{
                  backgroundColor:
                    currentLang === 'KR' ? 'rgba(99, 91, 255, 0.1)' : 'transparent',
                  color: currentLang === 'KR' ? '#635BFF' : '#29363D',
                  fontWeight: currentLang === 'KR' ? 600 : 400,
                }}
              >
                KOR
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setCurrentLang('EN')}
                style={{
                  backgroundColor:
                    currentLang === 'EN' ? 'rgba(99, 91, 255, 0.1)' : 'transparent',
                  color: currentLang === 'EN' ? '#635BFF' : '#29363D',
                  fontWeight: currentLang === 'EN' ? 600 : 400,
                }}
              >
                ENG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}

          {/* TODO: 추후 구현 예정 - Dark Mode Toggle */}
          {/* <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg transition-all"
            aria-label="다크모드 토글"
            style={{
              backgroundColor: 'var(--muted)',
              transitionDuration: '150ms',
              transitionTimingFunction: 'ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(0.97)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            {darkMode ? (
              <Sun className="w-5 h-5" style={{ color: '#5B6A72' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: '#5B6A72' }} />
            )}
          </button> */}

          {/* Notifications */}
          <NotificationDropdown notifications={notifications} userId={user.id} />

          {/* Profile Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 p-1.5 pr-3 rounded-lg transition-all duration-150"
                style={{
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(99, 91, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: '#635BFF' }}
                >
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.5,
                      color: 'var(--card-foreground)',
                      fontWeight: 500,
                    }}
                  >
                    {employee?.name || user.email}
                  </div>
                  <div
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.4,
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <span>{statusInfo.emoji}</span>
                    {statusInfo.label}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-4 py-3 border-b">
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    color: '#29363D',
                    fontWeight: 600,
                  }}
                >
                  {employee?.name || user.email}
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: '#5B6A72',
                    marginTop: '2px',
                  }}
                >
                  {employee?.role?.code === 'super_admin'
                    ? '최고관리자'
                    : employee?.role?.code === 'admin'
                      ? '관리자'
                      : '구성원'}
                </p>
              </div>

              {/* Status Selection */}
              <div className="px-2 py-2">
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: '#5B6A72',
                    padding: '8px 12px',
                  }}
                >
                  상태 변경
                </p>
                {(
                  [
                    'online',
                    'in_meeting',
                    'lunch',
                    'away',
                    'offline',
                    'vacation',
                  ] as UserStatus[]
                ).map((status) => {
                  const info = getStatusInfo(status)
                  const isActive = currentStatus === status
                  return (
                    <DropdownMenuItem
                      key={status}
                      className="cursor-pointer"
                      onClick={() => handleStatusChange(status)}
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(99, 91, 255, 0.1)'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span style={{ fontSize: 'var(--font-size-caption)' }}>
                          {info.emoji} {info.label}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer">내 계정</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
