# PHASE-2: 관리자 대시보드

**생성일:** 2025-11-18
**Phase 타입:** [PAGE]
**예상 기간:** 5-6일
**의존성:** Phase 0

---

## 🎯 Phase Overview

### Goal
관리자가 근태 현황, 좌석 사용률, 승인 대기를 한눈에 확인할 수 있는 대시보드를 구현합니다.

### Pages
- `/admin/dashboard` - 관리자 대시보드

### User Stories
- [ ] 관리자는 근태 현황을 차트로 확인할 수 있다
- [ ] 관리자는 좌석 사용 현황을 차트로 확인할 수 있다
- [ ] 관리자는 승인 대기 목록을 확인하고 처리할 수 있다
- [ ] 관리자는 이상 상황 알림을 확인할 수 있다

### Completion Criteria
- [ ] 모든 차트 정상 렌더링
- [ ] 데이터 정확성 확인
- [ ] 반응형 레이아웃
- [ ] 승인/반려 버튼 동작

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `attendance` (근태 기록)
- `seat` (좌석)
- `seat_reservation` (좌석 예약)
- `leave_request` (연차 신청)
- `employee` (직원 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Admin Dashboard (`/admin/dashboard`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "관리자 대시보드" + 설명                       │
├────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────┐│
│ │근태 현황 위젯 (2열)     │ │좌석 사용 현황  ││
│ │- 준수율                 │ │                ││
│ │- 지각/조퇴/결근         │ │                ││
│ │- 트렌드 차트            │ │                ││
│ └────────────────────────┘ └────────────────┘│
│ ┌────────────────────────────────────────────┐│
│ │승인 대기 목록 (2열 span)                   ││
│ └────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────┐│
│ │이상 상황 알림 (2열 span)                   ││
│ └────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

#### Grid Configuration
- **Desktop (≥1024px):** 3열 그리드
- **Tablet (≥768px):** 2열 그리드
- **Mobile (<768px):** 1열 스택

---

## 🧩 Components

### 1. AdminDashboardPage

**File:** `app/(authenticated)/admin/dashboard/page.tsx`

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

  if (employee?.role?.code !== 'admin') {
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

### 2. AttendanceChart

**File:** `components/admin/AttendanceChart.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        <CardTitle className="flex items-center justify-between">
          <span>근태 현황</span>
          <Select defaultValue="7">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">최근 7일</SelectItem>
              <SelectItem value="14">최근 14일</SelectItem>
              <SelectItem value="30">최근 30일</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
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

### 3. AttendanceBarChart (Client Component)

**File:** `components/admin/AttendanceBarChart.tsx`

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
        <Tooltip
          contentStyle={{
            backgroundColor: '#29363D',
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
          }}
        />
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

### 4. SeatUsageChart

**File:** `components/admin/SeatUsageChart.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeatPieChart } from '@/components/admin/SeatPieChart'
import { Armchair } from 'lucide-react'

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

  // 사용 중인 좌석 목록 (최근 5개)
  const { data: activeReservations } = await supabase
    .from('seat_reservation')
    .select('*, seat:seat_id(name, location), employee:employee_id(name)')
    .eq('reservation_date', today)
    .eq('status', 'active')
    .order('start_time', { ascending: false })
    .limit(5)

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

        {/* 사용 중인 좌석 목록 */}
        {activeReservations && activeReservations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">사용 중인 좌석</h4>
            <div className="space-y-2">
              {activeReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg hover:brightness-97"
                >
                  <div className="flex items-center space-x-3">
                    <Armchair className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{reservation.seat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {reservation.seat.location}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-primary font-medium">
                    {reservation.employee.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### 5. SeatPieChart (Client Component)

**File:** `components/admin/SeatPieChart.tsx`

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

### 6. ApprovalQueue

**File:** `components/admin/ApprovalQueue.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, Check, X } from 'lucide-react'

export async function ApprovalQueue() {
  const supabase = await createClient()

  // 승인 대기 목록
  const { data: pendingRequests } = await supabase
    .from('leave_request')
    .select('*, employee:employee_id(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  const hasPendingRequests = pendingRequests && pendingRequests.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인 대기 목록</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPendingRequests ? (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold">{request.employee.name}</span>
                    <Badge variant="outline">
                      {getLeaveTypeLabel(request.leave_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {request.start_date} ~ {request.end_date}
                    </div>
                    <span className="text-secondary font-medium">
                      {request.days_count}일
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    신청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    className="bg-green-50 hover:bg-green-100 text-success border-0"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-error text-error hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    반려
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mb-3" />
            <h4 className="font-semibold text-lg mb-1">모든 승인 완료</h4>
            <p className="text-sm text-muted-foreground">
              대기 중인 승인 항목이 없습니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getLeaveTypeLabel(type: string): string {
  const labels = {
    annual: '연차',
    half_day: '반차',
    reward: '포상휴가',
  }
  return labels[type] || type
}
```

---

### 7. AlertWidget

**File:** `components/admin/AlertWidget.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export async function AlertWidget() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // 이상 상황 감지
  const alerts = []

  // 1. 미출근 체크
  const { count: notCheckedInCount } = await supabase
    .from('employee')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('id', 'in', `(
      SELECT employee_id FROM attendance WHERE date = '${today}'
    )`)

  if (notCheckedInCount && notCheckedInCount > 0) {
    alerts.push({
      severity: 'warning',
      category: '근태',
      message: `출근 미체크 ${notCheckedInCount}건 발생`,
      time: '방금 전',
    })
  }

  // 2. 승인 대기
  const { count: pendingCount } = await supabase
    .from('leave_request')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (pendingCount && pendingCount > 0) {
    alerts.push({
      severity: 'info',
      category: '승인',
      message: `연차 신청 ${pendingCount}건 대기 중`,
      time: '1시간 전',
    })
  }

  // 3. 점검 중인 좌석
  const { data: maintenanceSeats } = await supabase
    .from('seat')
    .select('name')
    .eq('status', 'maintenance')

  if (maintenanceSeats && maintenanceSeats.length > 0) {
    alerts.push({
      severity: 'warning',
      category: '좌석',
      message: `좌석 점검 필요 (${maintenanceSeats[0].name} 외 ${maintenanceSeats.length - 1}건)`,
      time: '2시간 전',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>이상 상황 알림</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${getSeverityBgColor(
                  alert.severity
                )}`}
              >
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${getSeverityColor(alert.severity)}`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-semibold">{alert.message}</span>
                    <span className="text-xs px-2 py-0.5 bg-white/50 rounded">
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            이상 상황이 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function getSeverityBgColor(severity: string): string {
  const colors = {
    critical: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-cyan-50',
  }
  return colors[severity] || colors.info
}

function getSeverityColor(severity: string): string {
  const colors = {
    critical: 'text-error',
    warning: 'text-warning',
    info: 'text-secondary',
  }
  return colors[severity] || colors.info
}
```

---

## 📊 Supabase Queries Summary

### 1. 오늘 근태 요약
```typescript
await supabase
  .from('attendance')
  .select('*', { count: 'exact' })
  .eq('date', today)
```

### 2. 근태 트렌드 (최근 7일)
```typescript
await supabase
  .from('attendance')
  .select('date, status, is_late')
  .gte('date', sevenDaysAgo)
  .order('date', { ascending: true })
```

### 3. 좌석 통계
```typescript
await supabase
  .from('seat')
  .select('*, seat_reservation(*)')
```

### 4. 승인 대기 목록
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
```

---

## 🔒 RLS Policies

```sql
-- attendance: 관리자만 모든 근태 조회
CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);

-- seat: 관리자만 모든 좌석 조회
CREATE POLICY "Admins can view all seats"
ON seat FOR SELECT
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
- [ ] `app/(authenticated)/admin/dashboard/page.tsx` 생성
- [ ] `components/admin/AttendanceChart.tsx` 생성
- [ ] `components/admin/AttendanceBarChart.tsx` 생성
- [ ] `components/admin/SeatUsageChart.tsx` 생성
- [ ] `components/admin/SeatPieChart.tsx` 생성
- [ ] `components/admin/ApprovalQueue.tsx` 생성
- [ ] `components/admin/AlertWidget.tsx` 생성

### External Libraries
- [ ] Recharts 설치 확인
- [ ] 차트 스타일링 적용

### Data Integration
- [ ] 모든 Supabase 쿼리 테스트
- [ ] RLS 정책 적용 및 테스트
- [ ] 승인/반려 Server Action 구현

### UI/UX
- [ ] 반응형 레이아웃 테스트
- [ ] 차트 로딩 상태
- [ ] 빈 상태 UI

### Testing
- [ ] 모든 차트 렌더링 확인
- [ ] 데이터 정확성 검증
- [ ] 승인/반려 버튼 동작 확인

---

## 📁 File Structure

```
app/
└── (authenticated)/
    └── admin/
        └── dashboard/
            └── page.tsx              [CREATE]
components/
└── admin/
    ├── AttendanceChart.tsx           [CREATE]
    ├── AttendanceBarChart.tsx        [CREATE]
    ├── SeatUsageChart.tsx            [CREATE]
    ├── SeatPieChart.tsx              [CREATE]
    ├── ApprovalQueue.tsx             [CREATE]
    └── AlertWidget.tsx               [CREATE]
```

---

**Phase 2 완료 후:**
```
"Phase 3 구현"
```
