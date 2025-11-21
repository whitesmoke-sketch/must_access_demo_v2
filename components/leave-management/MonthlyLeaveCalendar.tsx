'use client'

import { useState } from 'react'
import { LeaveRequest } from '@/lib/leave-management/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MonthlyLeaveCalendarProps {
  leaveRequests: LeaveRequest[]
}

export function MonthlyLeaveCalendar({ leaveRequests }: MonthlyLeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 월의 첫날과 마지막날
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 첫주 시작 인덱스 (일요일 = 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  // 이전 달 마지막 날
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  // 캘린더 그리드 생성 (6주 * 7일 = 42칸)
  const calendarDays: (Date | null)[] = []

  // 이전 달의 날짜들
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push(new Date(year, month - 1, prevMonthLastDay - i))
  }

  // 현재 달의 날짜들
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i))
  }

  // 다음 달의 날짜들 (6주를 채우기 위해)
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push(new Date(year, month + 1, i))
  }

  // 날짜에 해당하는 승인된 연차 요청 찾기
  const getLeaveRequestsForDate = (date: Date): LeaveRequest[] => {
    return leaveRequests.filter(req => {
      if (req.status !== 'approved') return false
      const startDate = new Date(req.startDate)
      const endDate = new Date(req.endDate)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  // 이전/다음 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <Card
      className="rounded-2xl"
      style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle style={{ color: 'var(--card-foreground)', fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
            월간 연차 캘린더
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              오늘
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, minWidth: '120px', textAlign: 'center' }}>
              {year}년 {month + 1}월
            </div>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className="text-center py-2"
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 500,
                color: index === 0 ? '#FF6B6B' : index === 6 ? '#4A90E2' : 'var(--muted-foreground)',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) return <div key={index} />

            const dayLeaves = getLeaveRequestsForDate(date)
            const isTodayDate = isToday(date)
            const isCurrentMonthDate = isCurrentMonth(date)
            const dayOfWeek = date.getDay()

            return (
              <div
                key={index}
                className="relative p-2 min-h-[80px] border rounded-lg transition-colors"
                style={{
                  borderColor: isTodayDate ? 'var(--primary)' : 'var(--border)',
                  borderWidth: isTodayDate ? '2px' : '1px',
                  backgroundColor: isTodayDate ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                  opacity: isCurrentMonthDate ? 1 : 0.4,
                }}
                onMouseEnter={e => {
                  if (dayLeaves.length > 0) {
                    e.currentTarget.style.backgroundColor = '#F6F8F9'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = isTodayDate ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'
                }}
              >
                {/* 날짜 */}
                <div
                  className="text-sm mb-1"
                  style={{
                    fontWeight: isTodayDate ? 700 : 500,
                    color:
                      dayOfWeek === 0
                        ? '#FF6B6B'
                        : dayOfWeek === 6
                        ? '#4A90E2'
                        : isCurrentMonthDate
                        ? 'var(--card-foreground)'
                        : 'var(--muted-foreground)',
                  }}
                >
                  {date.getDate()}
                </div>

                {/* 연차 요청 표시 */}
                {dayLeaves.length > 0 && (
                  <div className="space-y-1">
                    {dayLeaves.slice(0, 2).map(leave => (
                      <div
                        key={leave.id}
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{
                          backgroundColor:
                            leave.leaveType === 'annual'
                              ? '#E8F8F5'
                              : leave.leaveType === 'reward'
                              ? '#FFE5EC'
                              : '#FFF8E5',
                          color:
                            leave.leaveType === 'annual'
                              ? '#4CD471'
                              : leave.leaveType === 'reward'
                              ? '#FF6692'
                              : '#F8C653',
                          fontSize: '10px',
                          lineHeight: 1.2,
                        }}
                        title={`${leave.memberName} - ${leave.leaveType === 'annual' ? '연차' : '포상휴가'}`}
                      >
                        {leave.memberName}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div
                        className="text-xs px-1"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '10px',
                        }}
                      >
                        +{dayLeaves.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E8F8F5' }}></div>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>연차</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFE5EC' }}></div>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>포상휴가</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2" style={{ borderColor: 'var(--primary)' }}></div>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>오늘</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
