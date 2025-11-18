# PHASE-1: 사용자 대시보드

**생성일:** 2025-01-18
**Phase 타입:** [PAGE]
**예상 기간:** 4-5일
**의존성:** Phase 0

---

## 🎯 Phase Overview

### Goal
직원이 자신의 근무 상태, 연차 현황, 예약 현황, 결재 현황을 한눈에 확인할 수 있는 대시보드를 구현합니다.

### Pages
- `/dashboard` - 사용자 대시보드

### User Stories
- [ ] 사용자는 현재 근무 상태를 확인할 수 있다
- [ ] 사용자는 잔여 연차와 포상휴가를 확인할 수 있다
- [ ] 사용자는 퀵 액션 버튼으로 주요 기능에 빠르게 접근할 수 있다
- [ ] 사용자는 오늘의 예약 현황을 확인할 수 있다
- [ ] 사용자는 결재 현황을 확인할 수 있다

### Completion Criteria
- [ ] 모든 위젯이 정상 렌더링
- [ ] 데이터 정확성 확인
- [ ] 반응형 레이아웃 (3열 → 2열 → 1열)
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `employee` (직원 정보)
- `department` (부서)
- `attendance` (근무 상태)
- `annual_leave_balance` (연차 잔액)
- `seat_reservation` (좌석 예약)
- `leave_request` (연차 신청)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Dashboard (`/dashboard`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "안녕하세요 홍길동님!" + 인사말                 │
├────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│ │근무 상태 카드│ │연차 요약 카드│ │퀵 액션  ││
│ └──────────────┘ └──────────────┘ └─────────┘│
│ ┌────────────────────────────────────────────┐│
│ │나의 예약 현황                              ││
│ └────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────┐│
│ │결재 현황 (2열 span)                        ││
│ └────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

#### Grid Configuration
- **Desktop (≥1024px):** 3열 그리드
- **Tablet (≥768px):** 2열 그리드
- **Mobile (<768px):** 1열 스택

---

## 🧩 Components

### 1. DashboardPage

**File:** `app/(authenticated)/dashboard/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkStatusCard } from '@/components/dashboard/WorkStatusCard'
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ReservationStatus } from '@/components/dashboard/ReservationStatus'
import { ApprovalStatus } from '@/components/dashboard/ApprovalStatus'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('id, name, department:department_id(name)')
    .eq('id', user.id)
    .single()

  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">
          안녕하세요 {employee?.name}님!
        </h1>
        <p className="text-muted-foreground">{greeting}</p>
      </div>

      {/* 그리드 레이아웃 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WorkStatusCard employeeId={user.id} />
        <LeaveBalanceCard employeeId={user.id} />
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReservationStatus employeeId={user.id} />
        <div className="lg:col-span-2">
          <ApprovalStatus employeeId={user.id} />
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '좋은 아침입니다! ☀️'
  if (hour < 18) return '좋은 오후입니다! 😊'
  return '좋은 저녁입니다! 🌙'
}
```

---

### 2. WorkStatusCard

**File:** `components/dashboard/WorkStatusCard.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut, Coffee, Home } from 'lucide-react'

interface WorkStatusCardProps {
  employeeId: string
}

export async function WorkStatusCard({ employeeId }: WorkStatusCardProps) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()

  const status = attendance?.status || 'not_checked_in'
  const startTime = attendance?.start_time
  const workHours = attendance ? calculateWorkHours(attendance) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>근무 상태</span>
          <StatusBadge status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {startTime && (
          <div>
            <p className="text-sm text-muted-foreground">출근 시간</p>
            <p className="text-lg font-semibold">
              {new Date(startTime).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {workHours > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">누적 근무 시간</p>
            <p className="text-lg font-semibold">{workHours}시간</p>
          </div>
        )}

        {status === 'not_checked_in' && (
          <p className="text-sm text-muted-foreground">
            아직 출근하지 않았습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    checked_in: {
      icon: LogIn,
      label: '출근',
      className: 'bg-green-100 text-green-700'
    },
    checked_out: {
      icon: LogOut,
      label: '퇴근',
      className: 'bg-gray-100 text-gray-700'
    },
    away: {
      icon: Coffee,
      label: '자리비움',
      className: 'bg-yellow-100 text-yellow-700'
    },
    remote: {
      icon: Home,
      label: '재택',
      className: 'bg-purple-100 text-purple-700'
    },
    not_checked_in: {
      icon: LogOut,
      label: '미출근',
      className: 'bg-gray-100 text-gray-700'
    }
  }

  const config = configs[status] || configs.not_checked_in
  const Icon = config.icon

  return (
    <Badge className={config.className}>
      <Icon className="w-4 h-4 mr-1" />
      {config.label}
    </Badge>
  )
}

function calculateWorkHours(attendance: any): number {
  if (!attendance.start_time) return 0

  const start = new Date(attendance.start_time)
  const end = attendance.end_time ? new Date(attendance.end_time) : new Date()

  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  return Math.floor(hours)
}
```

---

### 3. LeaveBalanceCard

**File:** `components/dashboard/LeaveBalanceCard.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface LeaveBalanceCardProps {
  employeeId: string
}

export async function LeaveBalanceCard({ employeeId }: LeaveBalanceCardProps) {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()

  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', currentYear)
    .single()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>연차 요약</span>
          <Link href="/leave/request">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              연차신청
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 잔여 연차 */}
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">잔여 연차</p>
          <p className="text-3xl font-bold text-primary">
            {balance?.remaining_days || 0}일
          </p>
        </div>

        {/* 잔여 포상휴가 */}
        <div className="p-4 bg-pink-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">잔여 포상휴가</p>
          <p className="text-3xl font-bold" style={{ color: '#FF6692' }}>
            {balance?.reward_leave_balance || 0}일
          </p>
        </div>

        {/* 구분선 */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">총 연차 부여일</span>
            <span className="font-semibold">
              {balance?.total_days || 0}일
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### 4. QuickActions

**File:** `components/dashboard/QuickActions.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { DoorOpen, Armchair, FileText } from 'lucide-react'

const actions = [
  {
    icon: DoorOpen,
    label: '회의실 예약',
    href: '/resources/meeting-rooms',
    bgColor: 'bg-secondary/10',
    iconColor: 'text-secondary'
  },
  {
    icon: Armchair,
    label: '좌석 등록',
    href: '/resources/seats',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary'
  },
  {
    icon: FileText,
    label: '결재 문서',
    href: '/documents',
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning'
  }
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>퀵 액션</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className={`p-2 rounded-lg ${action.bgColor}`}>
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

---

### 5. ReservationStatus

**File:** `components/dashboard/ReservationStatus.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Armchair, Clock, MapPin } from 'lucide-react'

interface ReservationStatusProps {
  employeeId: string
}

export async function ReservationStatus({ employeeId }: ReservationStatusProps) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // 오늘의 좌석 예약
  const { data: seatReservation } = await supabase
    .from('seat_reservation')
    .select('*, seat:seat_id(name, location)')
    .eq('employee_id', employeeId)
    .eq('reservation_date', today)
    .eq('status', 'active')
    .single()

  const hasReservation = !!seatReservation

  return (
    <Card>
      <CardHeader>
        <CardTitle>나의 예약 현황</CardTitle>
      </CardHeader>
      <CardContent>
        {hasReservation ? (
          <div className="space-y-3">
            {/* 좌석 정보 */}
            <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
              <Armchair className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{seatReservation.seat.name}</p>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  {seatReservation.start_time} ~ {seatReservation.end_time || '사용 중'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {seatReservation.seat.location}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>오늘 예약 없음</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### 6. ApprovalStatus

**File:** `components/dashboard/ApprovalStatus.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Calendar } from 'lucide-react'

interface ApprovalStatusProps {
  employeeId: string
}

export async function ApprovalStatus({ employeeId }: ApprovalStatusProps) {
  const supabase = await createClient()

  // 내가 요청한 문서 (최근 3건)
  const { data: myRequests } = await supabase
    .from('leave_request')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(3)

  // 사용자 역할 확인
  const { data: employee } = await supabase
    .from('employee')
    .select('role:role_id(code)')
    .eq('id', employeeId)
    .single()

  const isAdmin = employee?.role?.code === 'admin'

  // 결재 대기 문서 (관리자만)
  let pendingRequests = []
  if (isAdmin) {
    const { data } = await supabase
      .from('leave_request')
      .select('*, employee:employee_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(3)

    pendingRequests = data || []
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>결재 현황</span>
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              전체보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 내가 요청한 문서 */}
        <div>
          <h4 className="font-semibold mb-3">내가 요청한 문서</h4>
          <div className="space-y-2">
            {myRequests && myRequests.length > 0 ? (
              myRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getLeaveTypeLabel(request.leave_type)}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {request.start_date} ~ {request.end_date}
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                신청 내역이 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 결재 대기 문서 (관리자만) */}
        {isAdmin && (
          <div>
            <h4 className="font-semibold mb-3">결재 대기 문서</h4>
            <div className="space-y-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {request.employee.name} - {getLeaveTypeLabel(request.leave_type)}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {request.start_date} ~ {request.end_date}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  대기 중인 문서가 없습니다
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    pending: {
      label: '대기',
      className: 'bg-yellow-100 text-yellow-700'
    },
    approved: {
      label: '승인',
      className: 'bg-green-100 text-green-700'
    },
    rejected: {
      label: '반려',
      className: 'bg-red-100 text-red-700'
    }
  }

  const config = configs[status] || configs.pending

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

function getLeaveTypeLabel(type: string): string {
  const labels = {
    annual: '연차',
    half_day: '반차',
    reward: '포상휴가'
  }
  return labels[type] || type
}
```

---

## 📊 Supabase Queries Summary

### 1. 사용자 프로필 조회
```typescript
await supabase
  .from('employee')
  .select('id, name, department:department_id(name)')
  .eq('id', user.id)
  .single()
```

### 2. 근무 상태 조회
```typescript
await supabase
  .from('attendance')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('date', today)
  .single()
```

### 3. 연차 잔액 조회
```typescript
await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('year', currentYear)
  .single()
```

### 4. 좌석 예약 조회
```typescript
await supabase
  .from('seat_reservation')
  .select('*, seat:seat_id(name, location)')
  .eq('employee_id', employeeId)
  .eq('reservation_date', today)
  .eq('status', 'active')
  .single()
```

### 5. 내 연차 신청 내역
```typescript
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', employeeId)
  .order('created_at', { ascending: false })
  .limit(3)
```

### 6. 결재 대기 문서 (관리자)
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
  .limit(3)
```

---

## 🔒 RLS Policies

```sql
-- annual_leave_balance: 본인 연차만 조회
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- seat_reservation: 본인 예약만 조회
CREATE POLICY "Users can view own reservations"
ON seat_reservation FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- leave_request: 본인 신청 조회
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- leave_request: 관리자는 모든 신청 조회 가능
CREATE POLICY "Admins can view all leave requests"
ON leave_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

---

## 📋 Task Checklist

### Pages & Components
- [ ] `app/(authenticated)/dashboard/page.tsx` 생성
- [ ] `components/dashboard/WorkStatusCard.tsx` 생성
- [ ] `components/dashboard/LeaveBalanceCard.tsx` 생성
- [ ] `components/dashboard/QuickActions.tsx` 생성
- [ ] `components/dashboard/ReservationStatus.tsx` 생성
- [ ] `components/dashboard/ApprovalStatus.tsx` 생성

### UI Components
- [ ] Badge 컴포넌트 추가
- [ ] Card 컴포넌트 스타일링 확인

### Data Integration
- [ ] 모든 Supabase 쿼리 테스트
- [ ] RLS 정책 적용 및 테스트
- [ ] 에러 처리 추가

### UI/UX
- [ ] 반응형 레이아웃 테스트 (3열 → 2열 → 1열)
- [ ] 로딩 스켈레톤 추가
- [ ] 빈 상태 UI

### Testing
- [ ] 모든 위젯 렌더링 확인
- [ ] 데이터 정확성 검증
- [ ] 역할별 표시 차이 확인 (employee vs admin)

---

## 📁 File Structure

```
app/
└── (authenticated)/
    └── dashboard/
        └── page.tsx              [CREATE]
components/
└── dashboard/
    ├── WorkStatusCard.tsx        [CREATE]
    ├── LeaveBalanceCard.tsx      [CREATE]
    ├── QuickActions.tsx          [CREATE]
    ├── ReservationStatus.tsx     [CREATE]
    └── ApprovalStatus.tsx        [CREATE]
```

---

**Phase 1 완료 후:**
```
"Phase 2 구현"
```
