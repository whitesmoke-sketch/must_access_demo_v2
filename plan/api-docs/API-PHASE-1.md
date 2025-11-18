# API-PHASE-1: 사용자 대시보드

**생성일:** 2025-01-18
**Phase:** 1 (사용자 대시보드)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries (Server Component)

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/dashboard
Local: http://localhost:3000/dashboard
```

### Authentication
모든 API는 인증된 사용자만 접근 가능합니다.

**Required Headers:**
```http
Cookie: sb-access-token=<JWT_TOKEN>
```

---

## 2. Supabase Queries

### 2.1 사용자 프로필 조회

**Query:**
```typescript
await supabase
  .from('employee')
  .select('id, name, department:department_id(name)')
  .eq('id', userId)
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | 사용자 ID (auth.uid()) |

**Response:**
```typescript
{
  data: {
    id: string,
    name: string,
    department: {
      name: string
    }
  },
  error: null
}
```

**RLS Policy:** 본인 정보만 조회 가능

---

### 2.2 근무 상태 조회

**Query:**
```typescript
await supabase
  .from('attendance')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('date', today)
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID |
| today | string | Yes | 오늘 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: {
    id: string,
    employee_id: string,
    date: string,              // YYYY-MM-DD
    start_time: string | null, // HH:MM:SS
    end_time: string | null,   // HH:MM:SS
    status: 'checked_in' | 'checked_out' | 'away' | 'remote',
    is_late: boolean,
    is_early_leave: boolean,
    created_at: string,
    updated_at: string
  },
  error: null
}
```

**RLS Policy:** 본인 근태만 조회 가능

**사용 예시:**
```typescript
const today = new Date().toISOString().split('T')[0]

const { data: attendance } = await supabase
  .from('attendance')
  .select('*')
  .eq('employee_id', user.id)
  .eq('date', today)
  .single()

const workHours = calculateWorkHours(attendance)
```

---

### 2.3 연차 잔액 조회

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
| employeeId | string | Yes | 직원 ID |
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

---

### 2.4 좌석 예약 조회 (오늘)

**Query:**
```typescript
await supabase
  .from('seat_reservation')
  .select('*, seat:seat_id(name, location)')
  .eq('employee_id', employeeId)
  .eq('reservation_date', today)
  .eq('status', 'active')
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID |
| today | string | Yes | 오늘 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: {
    id: string,
    employee_id: string,
    seat_id: string,
    reservation_date: string,  // YYYY-MM-DD
    start_time: string,        // HH:MM:SS
    end_time: string | null,   // HH:MM:SS
    status: 'active',
    seat: {
      name: string,            // 좌석명 (예: A-01)
      location: string         // 위치 (예: 3층 북측)
    },
    created_at: string
  },
  error: null
}
```

**RLS Policy:** 본인 예약만 조회 가능

---

### 2.5 내가 요청한 연차 신청 (최근 3건)

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', employeeId)
  .order('created_at', { ascending: false })
  .limit(3)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employeeId | string | Yes | 직원 ID |

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

---

### 2.6 결재 대기 문서 (관리자만, 최근 3건)

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
  .limit(3)
```

**Parameters:** 없음

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
    status: 'pending',
    employee: {
      name: string
    },
    created_at: string
  }>,
  error: null
}
```

**RLS Policy:** Admin만 조회 가능

---

## 3. Server Actions

Phase 1에서는 Server Actions를 사용하지 않습니다. 모든 데이터는 Server Component에서 Supabase 직접 호출로 조회됩니다.

---

## 4. RLS Policies

### 4.1 attendance 테이블

**Policy: "Users can view own attendance"**
```sql
CREATE POLICY "Users can view own attendance"
ON attendance FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

---

### 4.2 annual_leave_balance 테이블

**Policy: "Users can view own leave balance"**
```sql
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

---

### 4.3 seat_reservation 테이블

**Policy: "Users can view own reservations"**
```sql
CREATE POLICY "Users can view own reservations"
ON seat_reservation FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

---

### 4.4 leave_request 테이블

**Policy: "Users can view own leave requests"**
```sql
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**Policy: "Admins can view all leave requests"**
```sql
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

## 5. Data Models

### 5.1 Attendance

```typescript
interface Attendance {
  id: string                                          // UUID
  employee_id: string                                 // 직원 ID
  date: string                                        // 날짜 (YYYY-MM-DD)
  start_time: string | null                           // 출근 시간 (HH:MM:SS)
  end_time: string | null                             // 퇴근 시간 (HH:MM:SS)
  status: 'checked_in' | 'checked_out' | 'away' | 'remote'
  is_late: boolean                                    // 지각 여부
  is_early_leave: boolean                             // 조퇴 여부
  created_at: string                                  // 생성일
  updated_at: string                                  // 수정일
}
```

---

### 5.2 AnnualLeaveBalance

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

### 5.3 SeatReservation

```typescript
interface SeatReservation {
  id: string                              // UUID
  employee_id: string                     // 직원 ID
  seat_id: string                         // 좌석 ID
  reservation_date: string                // 예약 날짜 (YYYY-MM-DD)
  start_time: string                      // 시작 시간 (HH:MM:SS)
  end_time: string | null                 // 종료 시간 (HH:MM:SS)
  status: 'active' | 'completed' | 'cancelled'
  created_at: string                      // 생성일
}
```

---

### 5.4 LeaveRequest

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

## 6. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `PGRST116` | No rows found | 데이터가 존재하지 않음 |
| `PGRST301` | Row level security violation | RLS 정책 위반 (권한 없음) |
| `23505` | Duplicate key value | 중복 데이터 |

---

## 7. Usage Examples

### 7.1 대시보드 페이지 전체 구현

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          안녕하세요 {employee?.name}님!
        </h1>
        <p className="text-muted-foreground">
          {getGreeting()}
        </p>
      </div>

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
  if (hour < 12) return '좋은 아침입니다!'
  if (hour < 18) return '좋은 오후입니다!'
  return '좋은 저녁입니다!'
}
```

---

### 7.2 근무 상태 카드 컴포넌트

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
              {formatTime(startTime)}
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

function calculateWorkHours(attendance: any): number {
  if (!attendance.start_time) return 0

  const start = new Date(`${attendance.date}T${attendance.start_time}`)
  const end = attendance.end_time
    ? new Date(`${attendance.date}T${attendance.end_time}`)
    : new Date()

  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  return Math.floor(hours)
}
```

---

### 7.3 연차 잔액 카드 컴포넌트

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
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">잔여 연차</p>
          <p className="text-3xl font-bold text-primary">
            {balance?.remaining_days || 0}일
          </p>
        </div>

        <div className="p-4 bg-pink-50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">잔여 포상휴가</p>
          <p className="text-3xl font-bold text-pink-600">
            {balance?.reward_leave_balance || 0}일
          </p>
        </div>

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

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
