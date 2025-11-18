# API-PHASE-2: 관리자 대시보드

**생성일:** 2025-01-18
**Phase:** 2 (관리자 대시보드)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries (Server Component)

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/admin/dashboard
Local: http://localhost:3000/admin/dashboard
```

### Authentication
관리자 권한이 있는 인증된 사용자만 접근 가능합니다.

**Required Headers:**
```http
Cookie: sb-access-token=<JWT_TOKEN>
```

**Required Role:** `admin` or `super_admin`

---

## 2. Supabase Queries

### 2.1 오늘 근태 요약

**Query:**
```typescript
await supabase
  .from('attendance')
  .select('*', { count: 'exact' })
  .eq('date', today)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| today | string | Yes | 오늘 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: Array<{
    id: string,
    employee_id: string,
    date: string,
    start_time: string | null,
    end_time: string | null,
    status: 'checked_in' | 'checked_out' | 'away' | 'remote',
    is_late: boolean,
    is_early_leave: boolean,
    created_at: string,
    updated_at: string
  }>,
  count: number,
  error: null
}
```

**RLS Policy:** Admin만 조회 가능

**사용 예시:**
```typescript
const today = new Date().toISOString().split('T')[0]

const { data: todayAttendance, count: totalCount } = await supabase
  .from('attendance')
  .select('*', { count: 'exact' })
  .eq('date', today)

const normalCount = todayAttendance?.filter(
  (a) => a.status === 'checked_in' && !a.is_late
).length || 0

const lateCount = todayAttendance?.filter((a) => a.is_late).length || 0
```

---

### 2.2 근태 트렌드 (최근 7일)

**Query:**
```typescript
await supabase
  .from('attendance')
  .select('date, status, is_late')
  .gte('date', sevenDaysAgo)
  .order('date', { ascending: true })
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| sevenDaysAgo | string | Yes | 7일 전 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: Array<{
    date: string,
    status: 'checked_in' | 'checked_out' | 'away' | 'remote',
    is_late: boolean
  }>,
  error: null
}
```

**사용 예시:**
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0]

const { data: trendData } = await supabase
  .from('attendance')
  .select('date, status, is_late')
  .gte('date', sevenDaysAgo)
  .order('date', { ascending: true })

// 날짜별 집계
const chartData = aggregateAttendanceData(trendData || [])
```

---

### 2.3 좌석 통계

**Query:**
```typescript
await supabase
  .from('seat')
  .select('*, seat_reservation(*)')
```

**Response:**
```typescript
{
  data: Array<{
    id: string,
    name: string,
    location: string,
    floor: number,
    status: 'available' | 'occupied' | 'maintenance',
    created_at: string,
    seat_reservation: Array<{
      id: string,
      employee_id: string,
      seat_id: string,
      reservation_date: string,
      start_time: string,
      end_time: string | null,
      status: 'active' | 'completed' | 'cancelled',
      created_at: string
    }>
  }>,
  error: null
}
```

**사용 예시:**
```typescript
const today = new Date().toISOString().split('T')[0]

const { data: seats } = await supabase
  .from('seat')
  .select('*, seat_reservation(*)')

const totalSeats = seats?.length || 0
const inUse = seats?.filter(
  (s) => s.seat_reservation?.some((r: any) =>
    r.reservation_date === today && r.status === 'active'
  )
).length || 0
const available = seats?.filter((s) => s.status === 'available').length || 0
const maintenance = seats?.filter((s) => s.status === 'maintenance').length || 0

const occupancyRate = totalSeats ? Math.round((inUse / totalSeats) * 100) : 0
```

---

### 2.4 사용 중인 좌석 목록

**Query:**
```typescript
await supabase
  .from('seat_reservation')
  .select('*, seat:seat_id(name, location), employee:employee_id(name)')
  .eq('reservation_date', today)
  .eq('status', 'active')
  .order('start_time', { ascending: false })
  .limit(5)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| today | string | Yes | 오늘 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  data: Array<{
    id: string,
    employee_id: string,
    seat_id: string,
    reservation_date: string,
    start_time: string,
    end_time: string | null,
    status: 'active',
    seat: {
      name: string,
      location: string
    },
    employee: {
      name: string
    },
    created_at: string
  }>,
  error: null
}
```

---

### 2.5 승인 대기 목록

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
  .limit(5)
```

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

### 2.6 미출근 직원 수

**Query:**
```typescript
await supabase
  .from('employee')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')
  .not('id', 'in', `(
    SELECT employee_id FROM attendance WHERE date = '${today}'
  )`)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| today | string | Yes | 오늘 날짜 (YYYY-MM-DD) |

**Response:**
```typescript
{
  count: number,
  error: null
}
```

**사용 예시:**
```typescript
const today = new Date().toISOString().split('T')[0]

const { count: notCheckedInCount } = await supabase
  .from('employee')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')
  .not('id', 'in', `(
    SELECT employee_id FROM attendance WHERE date = '${today}'
  )`)

if (notCheckedInCount && notCheckedInCount > 0) {
  console.log(`출근 미체크 ${notCheckedInCount}건 발생`)
}
```

---

### 2.7 점검 중인 좌석

**Query:**
```typescript
await supabase
  .from('seat')
  .select('name')
  .eq('status', 'maintenance')
```

**Response:**
```typescript
{
  data: Array<{
    name: string
  }>,
  error: null
}
```

---

## 3. Server Actions

Phase 2에서는 Server Actions를 사용하지 않습니다. 모든 데이터는 Server Component에서 Supabase 직접 호출로 조회됩니다.

---

## 4. RLS Policies

### 4.1 attendance 테이블

**Policy: "Admins can view all attendance"**
```sql
CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 직원의 근태 기록 조회 가능

---

### 4.2 seat 테이블

**Policy: "Admins can view all seats"**
```sql
CREATE POLICY "Admins can view all seats"
ON seat FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 좌석 정보 조회 가능

---

### 4.3 seat_reservation 테이블

**Policy: "Admins can view all reservations"**
```sql
CREATE POLICY "Admins can view all reservations"
ON seat_reservation FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 좌석 예약 조회 가능

---

### 4.4 leave_request 테이블

**Policy: "Admins can view all leave requests"**
```sql
CREATE POLICY "Admins can view all leave requests"
ON leave_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 연차 신청 조회 가능

---

## 5. Data Models

### 5.1 AttendanceSummary

```typescript
interface AttendanceSummary {
  totalEmployees: number          // 총 직원 수
  normalCount: number              // 정상 출근
  lateCount: number                // 지각
  earlyLeaveCount: number          // 조퇴
  absentCount: number              // 결근
  complianceRate: number           // 준수율 (%)
}
```

---

### 5.2 AttendanceTrend

```typescript
interface AttendanceTrend {
  date: string                     // 날짜 (YYYY-MM-DD)
  정상: number                      // 정상 출근 수
  지각: number                      // 지각 수
  결근: number                      // 결근 수
}
```

---

### 5.3 SeatUsage

```typescript
interface SeatUsage {
  totalSeats: number               // 총 좌석 수
  inUse: number                    // 사용 중
  available: number                // 사용 가능
  maintenance: number              // 점검 중
  occupancyRate: number            // 점유율 (%)
}
```

---

### 5.4 Alert

```typescript
interface Alert {
  severity: 'critical' | 'warning' | 'info'
  category: string                 // 근태, 승인, 좌석 등
  message: string                  // 알림 메시지
  time: string                     // 발생 시간
}
```

---

## 6. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `PGRST116` | No rows found | 데이터가 존재하지 않음 |
| `PGRST301` | Row level security violation | RLS 정책 위반 (권한 없음) |
| `23505` | Duplicate key value | 중복 데이터 |
| `42501` | Insufficient privilege | 권한 부족 |

---

## 7. Usage Examples

### 7.1 관리자 대시보드 페이지

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AttendanceChart } from '@/components/admin/AttendanceChart'
import { SeatUsageChart } from '@/components/admin/SeatUsageChart'
import { ApprovalQueue } from '@/components/admin/ApprovalQueue'
import { AlertWidget } from '@/components/admin/AlertWidget'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 관리자 권한 확인
  const { data: employee } = await supabase
    .from('employee')
    .select('role:role_id(code)')
    .eq('id', user.id)
    .single()

  if (employee?.role?.code !== 'admin' && employee?.role?.code !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          조직의 근태 현황과 자원 사용 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 그리드 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceChart />
        </div>
        <SeatUsageChart />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ApprovalQueue />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AlertWidget />
      </div>
    </div>
  )
}
```

---

### 7.2 근태 차트 컴포넌트

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceBarChart } from '@/components/admin/AttendanceBarChart'
import { Clock, TrendingUp, XCircle } from 'lucide-react'

export async function AttendanceChart() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // 오늘 근태 요약
  const { data: todayAttendance, count: totalCount } = await supabase
    .from('attendance')
    .select('*', { count: 'exact' })
    .eq('date', today)

  const normalCount = todayAttendance?.filter(
    (a) => a.status === 'checked_in' && !a.is_late
  ).length || 0
  const lateCount = todayAttendance?.filter((a) => a.is_late).length || 0
  const earlyLeaveCount = todayAttendance?.filter((a) => a.is_early_leave).length || 0
  const absentCount = (totalCount || 0) - (todayAttendance?.length || 0)

  const complianceRate = totalCount
    ? Math.round((normalCount / totalCount) * 100)
    : 0

  // 최근 7일 근태 트렌드
  const { data: trendData } = await supabase
    .from('attendance')
    .select('date, status, is_late')
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: true })

  // 날짜별 집계
  const chartData = aggregateAttendanceData(trendData || [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>근태 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 오늘 근태 요약 */}
        <div>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-primary">{complianceRate}%</p>
            <p className="text-sm text-muted-foreground">
              오늘 근태 준수율 ({normalCount}/{totalCount || 0}명)
            </p>
          </div>

          {/* 지표 카드 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-sm text-muted-foreground">지각</span>
              </div>
              <p className="text-2xl font-bold text-warning">{lateCount}명</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                <span className="text-sm text-muted-foreground">조퇴</span>
              </div>
              <p className="text-2xl font-bold text-secondary">{earlyLeaveCount}명</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-sm text-muted-foreground">결근</span>
              </div>
              <p className="text-2xl font-bold text-error">{absentCount}명</p>
            </div>
          </div>
        </div>

        {/* 트렌드 차트 */}
        <div>
          <h4 className="font-semibold mb-3">근태 트렌드</h4>
          <AttendanceBarChart data={chartData} />
        </div>
      </CardContent>
    </Card>
  )
}

function aggregateAttendanceData(data: any[]): any[] {
  const grouped = data.reduce((acc, item) => {
    const date = item.date
    if (!acc[date]) {
      acc[date] = { date, 정상: 0, 지각: 0, 결근: 0 }
    }

    if (item.status === 'checked_in' && !item.is_late) {
      acc[date].정상++
    } else if (item.is_late) {
      acc[date].지각++
    } else {
      acc[date].결근++
    }

    return acc
  }, {})

  return Object.values(grouped)
}
```

---

### 7.3 좌석 사용 차트

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeatPieChart } from '@/components/admin/SeatPieChart'

export async function SeatUsageChart() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // 좌석 통계
  const { data: seats } = await supabase
    .from('seat')
    .select('*, seat_reservation(*)')

  const totalSeats = seats?.length || 0
  const inUse = seats?.filter(
    (s) => s.seat_reservation?.some((r: any) => r.reservation_date === today && r.status === 'active')
  ).length || 0
  const available = seats?.filter((s) => s.status === 'available').length || 0
  const maintenance = seats?.filter((s) => s.status === 'maintenance').length || 0

  const occupancyRate = totalSeats ? Math.round((inUse / totalSeats) * 100) : 0

  const chartData = [
    { name: '사용중', value: inUse, fill: '#5B6A72' },
    { name: '사용가능', value: available, fill: '#16CDC7' },
    { name: '점검중', value: maintenance, fill: '#FF6B6B' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>좌석 사용 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 점유율 */}
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{occupancyRate}%</p>
          <p className="text-sm text-muted-foreground">
            좌석 점유율 ({inUse}/{totalSeats}석)
          </p>
        </div>

        {/* 도넛 차트 */}
        <SeatPieChart data={chartData} />

        {/* 범례 */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="w-3 h-3 bg-[#5B6A72] rounded-full mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">사용중</p>
            <p className="font-semibold">{inUse}석</p>
          </div>
          <div>
            <div className="w-3 h-3 bg-[#16CDC7] rounded-full mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">사용가능</p>
            <p className="font-semibold">{available}석</p>
          </div>
          <div>
            <div className="w-3 h-3 bg-[#FF6B6B] rounded-full mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">점검중</p>
            <p className="font-semibold">{maintenance}석</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 8. 차트 라이브러리 (Recharts)

### 8.1 설치

```bash
npm install recharts
```

### 8.2 Bar Chart 컴포넌트

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AttendanceBarChartProps {
  data: any[]
}

export function AttendanceBarChart({ data }: AttendanceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="정상" fill="#4CD471" radius={[12, 12, 0, 0]} />
        <Bar dataKey="지각" fill="#F8C653" radius={[12, 12, 0, 0]} />
        <Bar dataKey="결근" fill="#FF6B6B" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

### 8.3 Pie Chart 컴포넌트

```typescript
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface SeatPieChartProps {
  data: any[]
}

export function SeatPieChart({ data }: SeatPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
```

---

## 9. 보안 고려사항

1. **관리자 권한 확인**
   - 모든 API에서 role 확인 필수
   - RLS 정책으로 2중 보안

2. **민감 정보 보호**
   - 개인 식별 정보는 최소한으로 노출
   - 로그에 민감 정보 기록 금지

3. **Rate Limiting**
   - 차트 데이터는 캐시 활용
   - 불필요한 쿼리 최소화

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
