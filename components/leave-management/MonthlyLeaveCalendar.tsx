'use client'

import { useState, useMemo } from 'react'
import { LeaveRequest, getDetailedLeaveTypeLabel } from '@/lib/leave-management/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MonthlyLeaveCalendarProps {
  leaveRequests: LeaveRequest[]
}

export function MonthlyLeaveCalendar({ leaveRequests }: MonthlyLeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 달력 생성 로직
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0: 일요일

    const days: Array<{ date: number | null; fullDate: string | null }> = []

    // 이전 달 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, fullDate: null })
    }

    // 현재 달 날짜
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      days.push({ date, fullDate })
    }

    return days
  }, [year, month])

  // 날짜별 연차 사용자 매핑
  const getLeaveUsersForDate = (dateStr: string): string[] => {
    if (!dateStr) return []

    const users: string[] = []
    const targetDate = new Date(dateStr)

    leaveRequests
      .filter(r => r.status === 'approved')
      .forEach(request => {
        const startDate = new Date(request.startDate)
        const endDate = new Date(request.endDate)

        // 날짜 범위에 포함되는지 확인
        if (targetDate >= startDate && targetDate <= endDate) {
          users.push(request.memberName)
        }
      })

    return users
  }

  // 날짜별 연차 요청 상세 정보 가져오기
  const getLeaveDetailsForDate = (dateStr: string): LeaveRequest[] => {
    if (!dateStr) return []

    const details: LeaveRequest[] = []
    const targetDate = new Date(dateStr)

    leaveRequests
      .filter(r => r.status === 'approved')
      .forEach(request => {
        const startDate = new Date(request.startDate)
        const endDate = new Date(request.endDate)

        // 날짜 범위에 포함되는지 확인
        if (targetDate >= startDate && targetDate <= endDate) {
          details.push(request)
        }
      })

    return details
  }

  // 휴가 타입 한글 변환 (상세 타입 사용)
  const getLeaveTypeLabel = (leaveType: string, detailedType?: string): string => {
    return getDetailedLeaveTypeLabel(detailedType || leaveType)
  }

  // 휴가 타입별 색상 (상세 타입 지원)
  const getLeaveTypeColor = (leaveType: string, detailedType?: string): { bg: string; text: string; border: string } => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      annual: { bg: 'var(--primary-bg)', text: 'var(--primary)', border: 'var(--primary)' },
      half_day: { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' },
      half_day_am: { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' },
      half_day_pm: { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' },
      quarter_day: { bg: 'var(--info-bg)', text: 'var(--info)', border: 'var(--info)' },
      award: { bg: 'var(--secondary-bg)', text: 'var(--secondary)', border: 'var(--secondary)' },
      reward: { bg: 'var(--secondary-bg)', text: 'var(--secondary)', border: 'var(--secondary)' },
      sick: { bg: 'var(--destructive-bg)', text: 'var(--destructive)', border: 'var(--destructive)' },
      special: { bg: 'var(--info-bg)', text: 'var(--info)', border: 'var(--info)' },
    }
    const typeToUse = detailedType || leaveType
    return colors[typeToUse] || colors.annual
  }

  // 날짜 클릭 핸들러
  const handleDateClick = (fullDate: string | null) => {
    if (!fullDate) return
    const details = getLeaveDetailsForDate(fullDate)
    if (details.length === 0) return

    setSelectedDate(fullDate)
    setIsModalOpen(true)
  }

  // 사용자 수 표시 로직 (N명) - Figma Design
  const renderUserCount = (count: number) => {
    if (count === 0) return null

    return (
      <div className="mt-1 flex justify-center">
        <div
          className="px-2 py-1 rounded"
          style={{
            fontSize: 'var(--font-size-caption)',
            lineHeight: 1.2,
            backgroundColor: 'var(--primary-bg)',
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          {count}명
        </div>
      </div>
    )
  }

  // 월 변경
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // 오늘 날짜 확인
  const isToday = (date: number | null, fullDate: string | null) => {
    if (!date || !fullDate) return false
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === date
    )
  }

  const handleMouseEnter = (e: React.MouseEvent, fullDate: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredDate(fullDate)
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  return (
    <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5
            }}
          >
            월간 연차 캘린더
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 500,
              }}
            >
              오늘
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span
              style={{
                fontSize: 'var(--font-size-body)',
                fontWeight: 500,
                color: 'var(--foreground)',
                minWidth: '120px',
                textAlign: 'center'
              }}
            >
              {year}년 {month + 1}월
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div
              key={day}
              className="text-center py-2"
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 500,
                color: idx === 0 ? 'var(--destructive)' : idx === 6 ? 'var(--info)' : 'var(--muted-foreground)',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 - Figma Design */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const users = day.fullDate ? getLeaveUsersForDate(day.fullDate) : []
            const isTodayDate = isToday(day.date, day.fullDate)

            return (
              <div
                key={idx}
                className="relative min-h-[80px] p-2 rounded-lg border transition-all"
                style={{
                  borderColor: isTodayDate ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: day.date ? 'var(--background)' : 'var(--muted)',
                  borderWidth: isTodayDate ? '2px' : '1px',
                  cursor: users.length > 0 ? 'pointer' : 'default',
                }}
                onClick={() => handleDateClick(day.fullDate)}
              >
                {day.date && (
                  <>
                    <div
                      className="mb-1"
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        fontWeight: isTodayDate ? 600 : 400,
                        color: isTodayDate ? 'var(--primary)' : idx % 7 === 0 ? 'var(--destructive)' : idx % 7 === 6 ? 'var(--info)' : 'var(--foreground)',
                      }}
                    >
                      {day.date}
                    </div>
                    {renderUserCount(users.length)}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* 범례 - Figma Design */}
        <div className="mt-4 flex items-center gap-4 justify-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
              승인된 연차만 표시됩니다
            </span>
          </div>
        </div>
      </CardContent>

      {/* 날짜 상세 모달 - Figma Design */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          aria-describedby={undefined}
          style={{
            backgroundColor: 'var(--background)',
            maxWidth: '600px',
            borderRadius: '16px',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <DialogTitle
                style={{
                  fontSize: 'var(--font-size-h4)',
                  fontWeight: 'var(--font-weight-h4)',
                  lineHeight: 'var(--line-height-h1)',
                  color: 'var(--foreground)'
                }}
              >
                {selectedDate && new Date(selectedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} 휴가 현황
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedDate && getLeaveDetailsForDate(selectedDate).map((request, idx) => {
              const colors = getLeaveTypeColor(request.leaveType, request.detailedLeaveType)
              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4
                          style={{
                            fontSize: 'var(--font-size-body)',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--foreground)',
                          }}
                        >
                          {request.memberName}
                        </h4>
                        <Badge
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            fontSize: 'var(--font-size-caption)',
                            padding: '2px 8px',
                            fontWeight: 500,
                          }}
                        >
                          {getLeaveTypeLabel(request.leaveType, request.detailedLeaveType)}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                          }}
                        >
                          기간: {request.startDate} ~ {request.endDate}
                        </p>
                        {request.days && request.days > 0 && (
                          <p
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              color: 'var(--muted-foreground)',
                              lineHeight: 1.4,
                            }}
                          >
                            일수: {request.days}일
                          </p>
                        )}
                        {request.reason && (
                          <p
                            style={{
                              fontSize: 'var(--font-size-caption)',
                              color: 'var(--muted-foreground)',
                              lineHeight: 1.4,
                            }}
                          >
                            사유: {request.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              총 {selectedDate ? getLeaveDetailsForDate(selectedDate).length : 0}명
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
