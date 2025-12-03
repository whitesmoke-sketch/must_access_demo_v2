'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NotificationDropdown from '@/components/NotificationDropdown'
import type { Notification } from '@/app/actions/notification'
import {
  Menu,
  Search,
  Moon,
  Sun,
  User,
  Languages,
  X,
  Clock,
  UsersIcon,
  FileText,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { EmployeeWithRole, UserStatus } from '@/types/database'
import { logoSvgPaths } from './svg-assets'

interface HeaderProps {
  user: SupabaseUser
  employee: EmployeeWithRole | null
  notifications?: Notification[]
  onMobileMenuClick?: () => void
}

// Mock data for search
const recentSearches = ['홍길동', '연차 신청', '회의실 예약']
const popularSearches = ['출근', '퇴근', '연차', '휴가', '급여']

// MUST Logo Icon Component
function MustLogoIcon() {
  return (
    <div className="h-[24px] w-[24px] relative shrink-0">
      <div className="absolute contents inset-[17.83%_16.62%_11.63%_12.52%]">
        <div className="absolute flex inset-[17.83%_30.83%_11.63%_12.51%] items-center justify-center">
          <div className="flex-none h-[17.19px] rotate-[180deg] scale-y-[-100%] skew-x-[9.851deg] w-[10.612px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 18">
              <path d={logoSvgPaths.pb76c8f2} fill="#635BFF" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[17.83%_16.62%_11.63%_26.73%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 17">
            <path d={logoSvgPaths.p25f0bc00} fill="#635BFF" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// Mobile More Button (3 dots vertically)
function MoreButton({ onClick, isActive }: { onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-[10px] shrink-0 size-[39.999px] transition-colors"
      aria-label="더보기"
      style={{
        backgroundColor: isActive ? 'var(--sidebar-accent, rgba(99, 91, 255, 0.1))' : 'transparent',
      }}
    >
      <div className="flex items-end justify-center p-[8px] size-full">
        <div className="relative shrink-0 size-[24px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g>
              <circle cx="12" cy="5" r="1.5" fill={isActive ? '#635BFF' : '#5B6A72'} />
              <circle cx="12" cy="12" r="1.5" fill={isActive ? '#635BFF' : '#5B6A72'} />
              <circle cx="12" cy="19" r="1.5" fill={isActive ? '#635BFF' : '#5B6A72'} />
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
  const [searchQuery, setSearchQuery] = useState('')
  const [currentLang, setCurrentLang] = useState<'KR' | 'EN'>('KR')
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('online')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const desktopSearchRef = useRef<HTMLDivElement>(null)

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

  // Click outside to close search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) {
        setIsDesktopSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

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

  const markAllAsRead = () => {
    // TODO: Implement mark all as read functionality
    toast.success('모든 알림을 읽음 처리했습니다')
  }

  const saveSearch = (query: string) => {
    if (!query.trim() || typeof window === 'undefined') return

    const saved = localStorage.getItem('recentSearches')
    const existing = saved ? JSON.parse(saved) : []
    const updated = [query, ...existing.filter((s: string) => s !== query)].slice(0, 5)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const removeSearch = (query: string) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      const existing = JSON.parse(saved)
      const updated = existing.filter((s: string) => s !== query)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }

  const clearAllSearches = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('recentSearches')
  }

  const handleSearchClick = (query: string) => {
    setSearchQuery(query)
    saveSearch(query)
    // TODO: Implement actual search
    toast.info(`"${query}" 검색`)
    setIsSearchOpen(false)
    setIsDesktopSearchOpen(false)
  }

  const getAutocompleteResults = () => {
    if (!searchQuery?.trim()) return []

    const results: Array<{ type: 'member' | 'document' | 'menu'; text: string; subtext?: string }> = []

    // Mock member search
    const members = [
      { name: '홍길동', team: '개발팀', position: '선임' },
      { name: '김철수', team: '디자인팀', position: '대리' },
      { name: '이영희', team: '기획팀', position: '과장' },
    ]
    const matchedMembers = members
      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map(m => ({
        type: 'member' as const,
        text: m.name,
        subtext: `${m.team} · ${m.position}`,
      }))

    results.push(...matchedMembers)

    // Mock document search
    const documents = ['연차 신청서', '포상휴가 신청서', '회의실 예약', '일반 신청서']
    const matchedDocuments = documents
      .filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 2)
      .map(d => ({
        type: 'document' as const,
        text: d,
      }))

    results.push(...matchedDocuments)

    // Mock menu search
    const menus = [
      { name: '대시보드', path: 'dashboard' },
      { name: '구성원 관리', path: 'members' },
      { name: '연차 관리', path: 'leave' },
    ]
    const matchedMenus = menus
      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 2)
      .map(m => ({
        type: 'menu' as const,
        text: m.name,
      }))

    results.push(...matchedMenus)

    return results.slice(0, 8)
  }

  const autocompleteResults = getAutocompleteResults()

  // Search Dropdown Component
  const SearchDropdown = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div
      className={isMobile ? 'fixed left-0 right-0 top-32 mx-4 rounded-2xl overflow-hidden z-50' : 'absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50'}
      style={{
        backgroundColor: 'var(--card, white)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        maxHeight: '480px',
        animation: 'fadeIn 150ms ease-in-out',
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#5B6A72' }} />
          <input
            type="text"
            placeholder="검색어를 입력하세요…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleSearchClick(searchQuery)
              }
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors"
            style={{
              backgroundColor: '#F8FAFC',
              borderColor: '#E5E8EB',
              color: '#29363D',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
            autoFocus
          />
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {/* 검색어가 없을 때 */}
          {!searchQuery?.trim() && (
            <>
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#29363D', lineHeight: 1.5 }}>
                      최근 검색어
                    </h3>
                    <button
                      onClick={clearAllSearches}
                      style={{
                        fontSize: '12px',
                        color: '#5B6A72',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                      }}
                      className="hover:underline"
                    >
                      모두 지우기
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between group rounded-lg p-2 transition-colors cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSearchClick(search)}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" style={{ color: '#5B6A72' }} />
                          <span style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5 }}>
                            {search}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeSearch(search)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          style={{ color: '#5B6A72' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 많이 찾는 검색어 */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#29363D', lineHeight: 1.5, marginBottom: '10px' }}>
                  많이 찾는 검색어
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchClick(search)}
                      className="transition-colors hover:opacity-80"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#F6F8F9',
                        border: 'none',
                        fontSize: '13px',
                        color: '#29363D',
                        cursor: 'pointer',
                        lineHeight: 1.4,
                      }}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 검색어가 있을 때: 자동완성 결과 */}
          {searchQuery?.trim() && (
            <>
              {autocompleteResults.length > 0 ? (
                <div className="space-y-1">
                  {autocompleteResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors cursor-pointer hover:bg-gray-50"
                      style={{ minHeight: '44px' }}
                      onClick={() => handleSearchClick(result.text)}
                    >
                      {result.type === 'member' && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                        >
                          <UsersIcon className="w-3.5 h-3.5" style={{ color: '#635BFF' }} />
                        </div>
                      )}
                      {result.type === 'document' && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(22, 205, 199, 0.1)' }}
                        >
                          <FileText className="w-3.5 h-3.5" style={{ color: '#16CDC7' }} />
                        </div>
                      )}
                      {result.type === 'menu' && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(248, 198, 83, 0.1)' }}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" style={{ color: '#F8C653' }} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5 }}>
                          {result.text}
                        </p>
                        {result.subtext && (
                          <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                            {result.subtext}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="w-10 h-10 mx-auto mb-2" style={{ color: '#5B6A72', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5, marginBottom: '4px' }}>
                    검색 결과가 없습니다.
                  </p>
                  <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                    다른 검색어를 입력해 주세요.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden w-full">
        <div
          className="flex items-center justify-center h-16 border-b"
          style={{ backgroundColor: 'white', borderColor: '#E5E8EB' }}
        >
          <div className="flex items-center justify-between px-4 w-full">
            {/* Menu Button */}
            <button
              onClick={onMobileMenuClick}
              className="relative rounded-[10px] shrink-0 size-[39.999px]"
              aria-label="메뉴 열기"
            >
              <div className="flex items-center justify-center p-[8px] size-full">
                <div className="h-[24px] w-[24px] relative">
                  <svg className="block size-full" fill="none" viewBox="0 0 24 24">
                    <path d="M1 1H17" stroke="#5B6A72" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M1 12H17" stroke="#5B6A72" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M1 23H17" stroke="#5B6A72" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Logo */}
            <button className="relative rounded-[10px] shrink-0 size-[39.999px]" aria-label="홈">
              <div className="flex items-center justify-center p-[8px] size-full">
                <MustLogoIcon />
              </div>
            </button>

            {/* More Button */}
            <MoreButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)} isActive={mobileMenuOpen} />
          </div>
        </div>

        {/* Mobile Additional Menu */}
        {mobileMenuOpen && (
          <div
            className="flex items-center justify-between pb-[0.557px] pt-0 px-4 h-16 border-b"
            style={{ backgroundColor: 'white', borderColor: '#E5E8EB' }}
          >
            {/* Search - Left Side */}
            <div className="flex items-center">
              <div ref={searchContainerRef} className="relative">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="rounded-[10px] p-2 shrink-0"
                  aria-label="검색"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <Search className="w-5 h-5" style={{ color: '#5B6A72' }} />
                </button>

                {isSearchOpen && <SearchDropdown isMobile />}
              </div>
            </div>

            {/* Right Side Group */}
            <div className="flex items-center gap-[22px]">
              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-[10px] p-2 shrink-0"
                    aria-label="언어 변경"
                    style={{ backgroundColor: '#F8FAFC' }}
                  >
                    <Languages className="w-5 h-5" style={{ color: '#5B6A72' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-32">
                  <DropdownMenuItem
                    className="cursor-pointer transition-colors"
                    onClick={() => setCurrentLang('KR')}
                    style={{
                      backgroundColor: currentLang === 'KR' ? 'rgba(99, 91, 255, 0.1)' : 'transparent',
                      color: currentLang === 'KR' ? '#635BFF' : '#29363D',
                      fontWeight: currentLang === 'KR' ? 600 : 400,
                    }}
                  >
                    KOR
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer transition-colors"
                    onClick={() => setCurrentLang('EN')}
                    style={{
                      backgroundColor: currentLang === 'EN' ? 'rgba(99, 91, 255, 0.1)' : 'transparent',
                      color: currentLang === 'EN' ? '#635BFF' : '#29363D',
                      fontWeight: currentLang === 'EN' ? 600 : 400,
                    }}
                  >
                    ENG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dark Mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-[10px] p-2 shrink-0"
                aria-label="다크모드"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                {darkMode ? <Sun className="w-5 h-5" style={{ color: '#5B6A72' }} /> : <Moon className="w-5 h-5" style={{ color: '#5B6A72' }} />}
              </button>

              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative rounded-[10px] p-2 shrink-0"
                    aria-label="알림"
                    style={{ backgroundColor: '#F8FAFC' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#5B6A72" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <div
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: '#635BFF', fontSize: '10px', fontWeight: 600 }}
                      >
                        {unreadCount}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span style={{ color: '#29363D', fontSize: '14px', fontWeight: 600 }}>알림</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{ color: '#635BFF', fontSize: '14px' }}
                        className="hover:underline"
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {!notifications || notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center" style={{ color: '#5B6A72', fontSize: '14px' }}>
                        알림이 없습니다
                      </div>
                    ) : (
                      notifications
                        .slice(0, 10)
                        .map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className="px-4 py-3"
                            style={{
                              backgroundColor: !notification.read ? '#F8C653' : 'transparent'
                            }}
                          >
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: '#29363D' }}>
                                {notification.message}
                              </p>
                              <p className="text-xs mt-1" style={{ color: '#5B6A72' }}>
                                {new Date(notification.timestamp).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-150"
                    style={{
                      backgroundColor: '#635BFF',
                      transitionDuration: '150ms',
                      transitionTimingFunction: 'ease-in-out',
                    }}
                    aria-label="프로필"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-4 py-3">
                    <p style={{ fontSize: '14px', color: '#29363D', fontWeight: 600, lineHeight: 1.5 }}>
                      {employee?.name || user.email}
                    </p>
                    <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '2px', lineHeight: 1.4 }}>
                      {employee?.team} | {employee?.position}
                    </p>
                    <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '4px', lineHeight: 1.4 }}>
                      {employee?.email || user.email}
                    </p>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer transition-colors"
                    onClick={() => router.push('/account')}
                  >
                    내 계정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer transition-colors"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <header
        className="hidden lg:flex px-6 items-center h-16 flex-shrink-0 border-b"
        style={{ backgroundColor: 'white', borderColor: '#E5E8EB' }}
      >
        <div className="flex items-center justify-between w-full max-w-full">
          {/* Center - Search Bar (Desktop) */}
          <div className="flex items-center flex-1 max-w-md relative" ref={desktopSearchRef}>
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
                onFocus={() => setIsDesktopSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearchClick(searchQuery)
                  }
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E5E8EB',
                  color: '#29363D',
                }}
              />
            </div>
            {isDesktopSearchOpen && <SearchDropdown />}
          </div>

          <div className="flex-1" />

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {/* Language Toggle Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-lg transition-all"
                  aria-label="언어 변경"
                  style={{
                    backgroundColor: '#F6F8F9',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
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
            </DropdownMenu>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg transition-all"
              aria-label="다크모드 토글"
              style={{
                backgroundColor: '#F6F8F9',
                transitionDuration: '150ms',
                transitionTimingFunction: 'ease-in-out',
              }}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" style={{ color: '#5B6A72' }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: '#5B6A72' }} />
              )}
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#F6F8F9',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#5B6A72" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full"
                      style={{ backgroundColor: '#635BFF', fontSize: '10px' }}
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span style={{ color: '#29363D' }}>알림</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm hover:underline"
                      style={{ color: '#635BFF' }}
                    >
                      모두 읽음
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center" style={{ color: '#5B6A72' }}>
                      알림이 없습니다
                    </div>
                  ) : (
                    notifications
                      .slice(0, 10)
                      .map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="px-4 py-3"
                          style={{
                            backgroundColor: !notification.read ? '#F8C653' : 'transparent'
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm" style={{ color: '#29363D' }}>
                              {notification.message}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#5B6A72' }}>
                              {new Date(
                                notification.timestamp,
                              ).toLocaleString("ko-KR")}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-150"
                  style={{
                    backgroundColor: '#635BFF',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
                  }}
                >
                  <User className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-4 py-3">
                  <p style={{ fontSize: '14px', color: '#29363D', fontWeight: 600, lineHeight: 1.5 }}>
                    {employee?.name || user.email}
                  </p>
                  <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '2px', lineHeight: 1.4 }}>
                    {employee?.team} | {employee?.position}
                  </p>
                  <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '4px', lineHeight: 1.4 }}>
                    {employee?.email || user.email}
                  </p>
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
        </div>
      </header>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
