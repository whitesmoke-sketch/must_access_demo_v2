# PHASE-3: 내 연차 조회

**생성일:** 2025-11-18
**Phase 타입:** [PAGE]
**예상 기간:** 4-5일
**의존성:** Phase 0

---

## 🎯 Phase Overview

### Goal
직원이 자신의 연차 현황과 캘린더를 확인할 수 있는 페이지를 구현합니다.

### Pages
- `/leave/my-leave` - 내 연차 조회

### User Stories
- [ ] 사용자는 총 연차, 사용한 연차, 잔여 연차, 포상휴가를 카드로 확인할 수 있다
- [ ] 사용자는 캘린더에서 멀티데이 연차를 시각적으로 확인할 수 있다
- [ ] 사용자는 월 단위로 캘린더를 이동하며 연차를 확인할 수 있다
- [ ] 사용자는 연차 항목에 마우스를 올려 상세 정보를 확인할 수 있다

### Completion Criteria
- [ ] 연차 카드 4개 정확한 데이터 표시
- [ ] 캘린더 멀티데이 연차 정상 렌더링
- [ ] 월 이동 버튼 동작
- [ ] 툴팁 정상 표시

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `annual_leave_balance` (연차 잔액)
- `leave_request` (연차 신청)
- `employee` (직원 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: My Leave (`/leave/my-leave`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "내 연차 조회" + 설명 + 연차신청 버튼          │
├────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │총연차│ │사용  │ │잔여  │ │포상  │          │
│ └──────┘ └──────┘ └──────┘ └──────┘          │
│ ┌────────────────────────────────────────────┐│
│ │                                            ││
│ │   연차 캘린더 (멀티데이 표시)              ││
│ │                                            ││
│ │                                            ││
│ └────────────────────────────────────────────┘│
│ 범례: □ 연차  □ 반차  □ 포상휴가              │
└────────────────────────────────────────────────┘
```

---

## 🧩 Components

### 1. MyLeavePage

**File:** `app/(authenticated)/leave/my-leave/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { LeaveInfoCards } from '@/components/leave/LeaveInfoCards'
import { LeaveCalendar } from '@/components/leave/LeaveCalendar'

export default async function MyLeavePage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 연차 조회</h1>
          <p className="text-muted-foreground">
            나의 연차 현황과 사용 내역을 확인하세요
          </p>
        </div>
        <Link href="/leave/request">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            연차 신청
          </Button>
        </Link>
      </div>

      {/* 연차 정보 카드 */}
      <LeaveInfoCards employeeId={user.id} />

      {/* 연차 캘린더 */}
      <LeaveCalendar employeeId={user.id} />

      {/* 범례 */}
      <div className="flex items-center justify-center space-x-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10" />
          <span className="text-sm">연차</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-warning bg-warning/10" />
          <span className="text-sm">반차</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-pink-500 bg-pink-100" />
          <span className="text-sm">포상휴가</span>
        </div>
      </div>
    </div>
  )
}
```

---

### 2. LeaveInfoCards

**File:** `components/leave/LeaveInfoCards.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

interface LeaveInfoCardsProps {
  employeeId: string
}

export async function LeaveInfoCards({ employeeId }: LeaveInfoCardsProps) {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()

  // 연차 잔액 조회
  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', currentYear)
    .single()

  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0
  const rewardLeave = balance?.reward_leave_balance || 0

  const cards = [
    {
      label: '총 연차',
      value: totalDays,
      description: `${currentYear}년 기준`,
      color: 'text-card-foreground',
      bgColor: 'bg-white',
    },
    {
      label: '사용한 연차',
      value: usedDays,
      description: `총 ${totalDays}일 중`,
      color: 'text-muted-foreground',
      bgColor: 'bg-white',
    },
    {
      label: '사용 가능한 연차',
      value: remainingDays,
      description: '잔여 일수',
      color: 'text-primary',
      bgColor: 'bg-primary/5',
    },
    {
      label: '포상 휴가',
      value: rewardLeave,
      description: `사용 가능 / 총 ${rewardLeave}일`,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={card.bgColor}>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{card.label}</p>
            <p className={`text-4xl font-bold ${card.color} mb-2`}>
              {card.value}일
            </p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

### 3. LeaveCalendar

**File:** `components/leave/LeaveCalendar.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  format,
  isSameMonth,
  isSameDay,
  isWeekend,
} from 'date-fns'
import { ko } from 'date-fns/locale'

interface LeaveCalendarProps {
  employeeId: string
}

export function LeaveCalendar({ employeeId }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaves()
  }, [currentMonth, employeeId])

  async function loadLeaves() {
    setLoading(true)
    const supabase = createClient()

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    const { data } = await supabase
      .from('leave_request')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('start_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('end_date', format(monthEnd, 'yyyy-MM-dd'))
      .in('status', ['approved', 'pending'])

    setLeaves(data || [])
    setLoading(false)
  }

  function prevMonth() {
    setCurrentMonth(addMonths(currentMonth, -1))
  }

  function nextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  function renderHeader() {
    return (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  function renderDaysOfWeek() {
    const days = ['일', '월', '화', '수', '목', '금', '토']

    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-semibold py-2 ${
              index === 0
                ? 'text-error'
                : index === 6
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    )
  }

  function renderCells() {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day
        const dayLeaves = getLeavesForDay(cloneDay)

        days.push(
          <div
            key={day.toString()}
            className={`min-h-24 p-2 border ${
              !isSameMonth(day, monthStart) ? 'bg-muted/30' : 'bg-white'
            }`}
          >
            <div
              className={`text-sm mb-1 ${
                !isSameMonth(day, monthStart)
                  ? 'text-muted-foreground'
                  : isSameDay(day, new Date())
                  ? 'w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white font-bold'
                  : isWeekend(day)
                  ? day.getDay() === 0
                    ? 'text-error'
                    : 'text-primary'
                  : 'text-foreground'
              }`}
            >
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className={`text-xs p-1 rounded ${getLeaveStyle(
                    leave.leave_type
                  )} ${getLeavePosition(leave, cloneDay)}`}
                  title={`${getLeaveTypeLabel(leave.leave_type)}: ${leave.start_date} ~ ${leave.end_date}`}
                >
                  {isLeaveStart(leave, cloneDay) && (
                    <span className="font-medium truncate block">
                      {getLeaveTypeLabel(leave.leave_type)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

        day = addDays(day, 1)
      }

      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      )
      days = []
    }

    return <div>{rows}</div>
  }

  function getLeavesForDay(day: Date): any[] {
    return leaves.filter((leave) => {
      const start = new Date(leave.start_date)
      const end = new Date(leave.end_date)
      return day >= start && day <= end
    })
  }

  function isLeaveStart(leave: any, day: Date): boolean {
    const start = new Date(leave.start_date)
    return isSameDay(start, day) || day.getDay() === 0
  }

  function getLeavePosition(leave: any, day: Date): string {
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    const isStart = isSameDay(start, day) || day.getDay() === 0
    const isEnd = isSameDay(end, day) || day.getDay() === 6

    if (isStart && isEnd) {
      return 'rounded-md'
    } else if (isStart) {
      return 'rounded-l-md'
    } else if (isEnd) {
      return 'rounded-r-md'
    } else {
      return 'rounded-none'
    }
  }

  function getLeaveStyle(type: string): string {
    const styles = {
      annual: 'bg-primary/10 border-l-2 border-primary',
      half_day: 'bg-warning/10 border-l-2 border-warning',
      reward: 'bg-pink-100 border-l-2 border-pink-500',
    }
    return styles[type] || styles.annual
  }

  function getLeaveTypeLabel(type: string): string {
    const labels = {
      annual: '연차',
      half_day: '반차',
      reward: '포상휴가',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>연차 캘린더</CardTitle>
      </CardHeader>
      <CardContent>
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </CardContent>
    </Card>
  )
}
```

---

## 📊 Supabase Queries Summary

### 1. 연차 잔액 조회
```typescript
await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('year', currentYear)
  .single()
```

### 2. 연차 신청 내역 (캘린더)
```typescript
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', employeeId)
  .gte('start_date', monthStart)
  .lte('end_date', monthEnd)
  .in('status', ['approved', 'pending'])
```

---

## 🔒 RLS Policies

```sql
-- annual_leave_balance: 본인 연차만 조회
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- leave_request: 본인 신청 조회
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

---

## 📋 Task Checklist

### Pages & Components
- [ ] `app/(authenticated)/leave/my-leave/page.tsx` 생성
- [ ] `components/leave/LeaveInfoCards.tsx` 생성
- [ ] `components/leave/LeaveCalendar.tsx` 생성

### External Libraries
- [ ] date-fns 설치 확인
- [ ] date-fns/locale 한국어 설정

### Data Integration
- [ ] 모든 Supabase 쿼리 테스트
- [ ] RLS 정책 적용 및 테스트

### UI/UX
- [ ] 연차 카드 스타일링
- [ ] 캘린더 멀티데이 연차 렌더링
- [ ] 툴팁 구현
- [ ] 반응형 레이아웃

### Testing
- [ ] 연차 카드 데이터 정확성
- [ ] 캘린더 멀티데이 표시
- [ ] 월 이동 기능
- [ ] 다양한 연차 타입 표시

---

## 📁 File Structure

```
app/
└── (authenticated)/
    └── leave/
        └── my-leave/
            └── page.tsx              [CREATE]
components/
└── leave/
    ├── LeaveInfoCards.tsx            [CREATE]
    └── LeaveCalendar.tsx             [CREATE]
```

---

**Phase 3 완료 후:**
```
"Phase 4 구현"
```
