'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NotificationDropdown from '@/components/NotificationDropdown'
import type { Notification } from '@/app/actions/notification'
import {
  Menu,
  Moon,
  Sun,
  User,
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

// Mobile More Button (3 dots vertically)
function MoreButton({ onClick, isActive }: { onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-[10px] shrink-0 transition-colors"
      style={{
        width: '40px',
        height: '40px',
        backgroundColor: isActive ? 'var(--sidebar-accent)' : 'transparent',
      }}
      aria-label="더보기"
    >
      <div className="flex items-center justify-center size-full">
        <div className="relative shrink-0 size-[24px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g>
              <circle cx="12" cy="5" r="1.5" fill={isActive ? 'var(--primary)' : 'var(--muted-foreground)'} />
              <circle cx="12" cy="12" r="1.5" fill={isActive ? 'var(--primary)' : 'var(--muted-foreground)'} />
              <circle cx="12" cy="19" r="1.5" fill={isActive ? 'var(--primary)' : 'var(--muted-foreground)'} />
            </g>
          </svg>
        </div>
      </div>
    </button>
  )
}

export function Header({ user, employee, notifications = [], onMobileMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      return saved === 'true'
    }
    return false
  })
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('online')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Dark mode effect
  useEffect(() => {
    const html = document.documentElement
    if (darkMode) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', darkMode.toString())
    }
  }, [darkMode])

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
    <>
      {/* Mobile Header */}
      <div className="lg:hidden w-full">
        <div
          className="flex items-center justify-center h-16 border-b"
          style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between px-4 w-full">
            {/* Menu Button */}
            <button
              onClick={onMobileMenuClick}
              className="relative rounded-[10px] shrink-0"
              style={{ width: '40px', height: '40px' }}
              aria-label="메뉴 열기"
            >
              <div className="flex items-center justify-center size-full">
                <Menu className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              </div>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* More Button */}
            <MoreButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)} isActive={mobileMenuOpen} />
          </div>
        </div>

        {/* Mobile Additional Menu */}
        {mobileMenuOpen && (
          <div
            className="flex items-center justify-end px-4 h-16 border-b gap-3"
            style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--border)' }}
          >
            {/* Dark Mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-[10px] p-2 shrink-0"
              aria-label="다크모드"
              style={{ backgroundColor: 'var(--background)' }}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              )}
            </button>

            {/* Notifications */}
            <NotificationDropdown notifications={notifications} userId={user.id} />

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ backgroundColor: 'var(--primary)' }}
                  aria-label="프로필"
                >
                  <User className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-4 py-3 border-b">
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {employee?.name || user.email}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                    {employee?.role?.code === 'super_admin' ? '최고관리자' : employee?.role?.code === 'admin' ? '관리자' : '구성원'}
                  </p>
                </div>

                <DropdownMenuSeparator />

                {/* Status Selection */}
                <div className="px-2 py-2">
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', padding: '8px 12px' }}>
                    상태 변경
                  </p>
                  {(['online', 'in_meeting', 'lunch', 'away', 'offline', 'vacation'] as UserStatus[]).map((status) => {
                    const info = getStatusInfo(status)
                    const isActive = currentStatus === status
                    return (
                      <DropdownMenuItem
                        key={status}
                        className="cursor-pointer"
                        onClick={() => handleStatusChange(status)}
                        style={{ backgroundColor: isActive ? 'var(--primary-bg)' : 'transparent' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                          <span style={{ fontSize: 'var(--font-size-caption)' }}>
                            {info.emoji} {info.label}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/account')}>
                  내 계정
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <header
        className="hidden lg:flex px-6 items-center h-16 flex-shrink-0 border-b"
        style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between w-full max-w-full">

          <div className="flex-1" />

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg transition-all"
              aria-label="다크모드 토글"
              style={{
                backgroundColor: 'var(--muted)',
                transitionDuration: '150ms',
                transitionTimingFunction: 'ease-in-out',
              }}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              )}
            </button>

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
                  e.currentTarget.style.backgroundColor = 'var(--primary-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: 'var(--primary)' }}
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
                    color: 'var(--foreground)',
                    fontWeight: 600,
                  }}
                >
                  {employee?.name || user.email}
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
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
                    color: 'var(--muted-foreground)',
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
                          ? 'var(--primary-bg)'
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

              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/account')}>내 계정</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}
