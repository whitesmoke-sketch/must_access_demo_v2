# API-PHASE-3: 내 연차 조회

**생성일:** 2025-01-18
**Phase:** 3 (내 연차 조회)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries (Server & Client Component)

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/leave/my-leave
Local: http://localhost:3000/leave/my-leave
```

### Authentication
모든 API는 인증된 사용자만 접근 가능합니다.

**Required Headers:**
```http
Cookie: sb-access-token=<JWT_TOKEN>
```

---

## 2. Supabase Queries

### 2.1 연차 잔액 조회

**Query:**
```typescript
await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('year', currentYear)
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID (auth.uid()) |
| currentYear | number | Yes | 현재 연도 (YYYY) |

**Response:**
```typescript
{
  data: {
    id: string,
    employee_id: string,
    year: number,
    total_days: number,           // 총 연차 일수
    used_days: number,            // 사용한 연차 일수
    remaining_days: number,       // 잔여 연차 일수
    reward_leave_balance: number, // 포상휴가 잔액
    created_at: string,
    updated_at: string
  },
  error: null
}
```

**RLS Policy:** 본인 연차만 조회 가능

**사용 예시:**
```typescript
const currentYear = new Date().getFullYear()

const { data: balance } = await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', user.id)
  .eq('year', currentYear)
  .single()

const remainingDays = balance?.remaining_days || 0
const rewardLeave = balance?.reward_leave_balance || 0
```

---

### 2.2 연차 신청 내역 (월별)

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', employeeId)
  .gte('start_date', monthStart)
  .lte('end_date', monthEnd)
  .in('status', ['approved', 'pending'])
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID |
| monthStart | string | Yes | 월 시작일 (YYYY-MM-DD) |
| monthEnd | string | Yes | 월 종료일 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: Array<{
    id: string,
    employee_id: string,
    leave_type: 'annual' | 'half_day' | 'reward',
    start_date: string,  // YYYY-MM-DD
    end_date: string,    // YYYY-MM-DD
    days_count: number,
    reason: string,
    status: 'pending' | 'approved' | 'rejected',
    approved_by: string | null,
    approved_at: string | null,
    rejected_by: string | null,
    rejected_at: string | null,
    rejection_reason: string | null,
    created_at: string
  }>,
  error: null
}
```

**RLS Policy:** 본인 신청만 조회 가능

**사용 예시:**
```typescript
import { startOfMonth, endOfMonth, format } from 'date-fns'

const monthStart = startOfMonth(currentMonth)
const monthEnd = endOfMonth(currentMonth)

const { data } = await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', user.id)
  .gte('start_date', format(monthStart, 'yyyy-MM-dd'))
  .lte('end_date', format(monthEnd, 'yyyy-MM-dd'))
  .in('status', ['approved', 'pending'])
```

---

### 2.3 전체 연차 신청 내역 (연도별)

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', employeeId)
  .gte('start_date', `${year}-01-01`)
  .lte('end_date', `${year}-12-31`)
  .order('start_date', { ascending: false })
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID |
| year | number | Yes | 연도 (YYYY) |

**Response:**
```typescript
{
  data: Array<{
    id: string,
    employee_id: string,
    leave_type: 'annual' | 'half_day' | 'reward',
    start_date: string,
    end_date: string,
    days_count: number,
    reason: string,
    status: 'pending' | 'approved' | 'rejected',
    created_at: string
  }>,
  error: null
}
```

---

## 3. Server Actions

Phase 3에서는 Server Actions를 사용하지 않습니다. 모든 데이터는 Supabase 직접 호출로 조회됩니다.

---

## 4. RLS Policies

### 4.1 annual_leave_balance 테이블

**Policy: "Users can view own leave balance"**
```sql
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**설명:** 본인의 연차 잔액만 조회 가능

---

### 4.2 leave_request 테이블

**Policy: "Users can view own leave requests"**
```sql
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**설명:** 본인의 연차 신청 내역만 조회 가능

---

## 5. Data Models

### 5.1 AnnualLeaveBalance

```typescript
interface AnnualLeaveBalance {
  id: string                    // UUID
  employee_id: string           // 직원 ID
  year: number                  // 연도
  total_days: number            // 총 연차 일수
  used_days: number             // 사용한 연차 일수
  remaining_days: number        // 잔여 연차 일수
  reward_leave_balance: number  // 포상휴가 잔액
  created_at: string            // 생성일
  updated_at: string            // 수정일
}
```

---

### 5.2 LeaveRequest

```typescript
interface LeaveRequest {
  id: string                              // UUID
  employee_id: string                     // 직원 ID
  leave_type: 'annual' | 'half_day' | 'reward'
  start_date: string                      // 시작일 (YYYY-MM-DD)
  end_date: string                        // 종료일 (YYYY-MM-DD)
  days_count: number                      // 일수
  reason: string                          // 사유
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null              // 승인자 ID
  approved_at: string | null              // 승인일
  rejected_by: string | null              // 반려자 ID
  rejected_at: string | null              // 반려일
  rejection_reason: string | null         // 반려 사유
  created_at: string                      // 생성일
}
```

---

### 5.3 LeaveInfoCard

```typescript
interface LeaveInfoCard {
  label: string                 // 카드 제목
  value: number                 // 값
  description: string           // 설명
  color: string                 // 텍스트 색상 (Tailwind class)
  bgColor: string               // 배경 색상 (Tailwind class)
}
```

---

## 6. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `PGRST116` | No rows found | 연차 잔액 데이터가 없음 |
| `PGRST301` | Row level security violation | RLS 정책 위반 (권한 없음) |
| `23505` | Duplicate key value | 중복 데이터 |

---

## 7. Usage Examples

### 7.1 내 연차 조회 페이지

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

### 7.2 연차 정보 카드 컴포넌트

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

### 7.3 연차 캘린더 컴포넌트 (Client)

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

## 8. 캘린더 UI 구현 팁

### 8.1 멀티데이 연차 표시

연차가 여러 날에 걸쳐 있을 때, 주 시작(일요일)마다 새로운 바를 렌더링합니다.

```typescript
function isLeaveStart(leave: any, day: Date): boolean {
  const start = new Date(leave.start_date)
  return isSameDay(start, day) || day.getDay() === 0
}
```

### 8.2 연차 바의 모서리 처리

시작일, 종료일, 주 경계에 따라 모서리를 다르게 처리합니다.

```typescript
function getLeavePosition(leave: any, day: Date): string {
  const start = new Date(leave.start_date)
  const end = new Date(leave.end_date)
  const isStart = isSameDay(start, day) || day.getDay() === 0
  const isEnd = isSameDay(end, day) || day.getDay() === 6

  if (isStart && isEnd) return 'rounded-md'
  else if (isStart) return 'rounded-l-md'
  else if (isEnd) return 'rounded-r-md'
  else return 'rounded-none'
}
```

### 8.3 연차 타입별 색상

```typescript
const leaveColors = {
  annual: 'bg-primary/10 border-l-2 border-primary',
  half_day: 'bg-warning/10 border-l-2 border-warning',
  reward: 'bg-pink-100 border-l-2 border-pink-500',
}
```

---

## 9. 날짜 라이브러리 (date-fns)

### 9.1 설치

```bash
npm install date-fns
```

### 9.2 주요 함수

```typescript
import {
  startOfMonth,      // 월의 첫 날
  endOfMonth,        // 월의 마지막 날
  startOfWeek,       // 주의 첫 날 (일요일)
  endOfWeek,         // 주의 마지막 날 (토요일)
  addDays,           // 날짜 더하기
  addMonths,         // 월 더하기
  format,            // 날짜 포맷팅
  isSameMonth,       // 같은 월인지 확인
  isSameDay,         // 같은 날인지 확인
  isWeekend,         // 주말인지 확인
} from 'date-fns'
import { ko } from 'date-fns/locale'
```

---

## 10. 보안 고려사항

1. **본인 데이터만 조회**
   - RLS 정책으로 본인 연차만 조회 가능
   - employee_id와 auth.uid() 일치 확인

2. **날짜 범위 검증**
   - 클라이언트에서 날짜 범위 제한
   - 과도한 쿼리 방지

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
