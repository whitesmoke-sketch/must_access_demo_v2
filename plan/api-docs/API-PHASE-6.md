# API-PHASE-6: 연차 관리 (관리자)

**생성일:** 2025-01-18
**Phase:** 6 (연차 관리)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries + Server Actions

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/admin/leave-management
Local: http://localhost:3000/admin/leave-management
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

### 2.1 요약 지표 - 총 구성원 수

**Query:**
```typescript
await supabase
  .from('employee')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')
```

**Response:**
```typescript
{
  count: number,
  error: null
}
```

---

### 2.2 요약 지표 - 전체 연차 사용률

**Query:**
```typescript
await supabase
  .from('annual_leave_balance')
  .select('total_days, used_days')
  .eq('year', currentYear)
```

**Response:**
```typescript
{
  data: Array<{
    total_days: number,
    used_days: number
  }>,
  error: null
}
```

**계산:**
```typescript
const totalDays = balances?.reduce((sum, b) => sum + (b.total_days || 0), 0) || 0
const usedDays = balances?.reduce((sum, b) => sum + (b.used_days || 0), 0) || 0
const usageRate = totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0
```

---

### 2.3 요약 지표 - 승인 대기 요청

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')
```

**Response:**
```typescript
{
  count: number,
  error: null
}
```

---

### 2.4 요약 지표 - 이번 달 연차 사용

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('days_count')
  .eq('status', 'approved')
  .gte('start_date', `${currentYear}-${currentMonth}-01`)
  .lt('start_date', `${currentYear}-${nextMonth}-01`)
```

**Response:**
```typescript
{
  data: Array<{
    days_count: number
  }>,
  error: null
}
```

**계산:**
```typescript
const thisMonthDays = thisMonthRequests?.reduce(
  (sum, r) => sum + (r.days_count || 0),
  0
) || 0
```

---

### 2.5 구성원별 연차 현황

**Query:**
```typescript
await supabase
  .from('annual_leave_balance')
  .select(`
    *,
    employee:employee_id(
      id,
      name,
      position,
      team,
      department:department_id(name)
    )
  `)
  .eq('year', currentYear)
  .order('employee_id')
```

**Response:**
```typescript
{
  data: Array<{
    id: string,
    employee_id: string,
    year: number,
    total_days: number,
    used_days: number,
    remaining_days: number,
    reward_leave_balance: number,
    created_at: string,
    updated_at: string,
    employee: {
      id: string,
      name: string,
      position: string,
      team: string,
      department: {
        name: string
      }
    }
  }>,
  error: null
}
```

**RLS Policy:** Admin만 조회 가능

---

### 2.6 승인 대기 목록

**Query:**
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
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

## 3. Server Actions

### 3.1 approveLeaveRequest

**File:** `app/actions/leave.ts`

**Function:**
```typescript
export async function approveLeaveRequest(requestId: string)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| requestId | string | Yes | 연차 신청 ID |

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

**Implementation:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveLeaveRequest(requestId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증되지 않았습니다' }
    }

    // 1. 승인 처리
    const { error } = await supabase
      .from('leave_request')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/leave-management')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

### 3.2 rejectLeaveRequest

**Function:**
```typescript
export async function rejectLeaveRequest(requestId: string, reason: string)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| requestId | string | Yes | 연차 신청 ID |
| reason | string | Yes | 반려 사유 |

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

**Implementation:**
```typescript
export async function rejectLeaveRequest(requestId: string, reason: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증되지 않았습니다' }
    }

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: '반려 사유를 입력해주세요' }
    }

    // 1. 반려 처리
    const { error } = await supabase
      .from('leave_request')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', requestId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/leave-management')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

### 3.3 grantRewardLeave

**Function:**
```typescript
export async function grantRewardLeave(data: {
  employee_id: string
  days: number
  reason: string
})
```

**Parameters:**
```typescript
interface RewardLeaveData {
  employee_id: string  // 직원 ID
  days: number         // 포상휴가 일수
  reason: string       // 사유
}
```

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

**Implementation:**
```typescript
export async function grantRewardLeave(data: {
  employee_id: string
  days: number
  reason: string
}) {
  try {
    const supabase = await createClient()

    const currentYear = new Date().getFullYear()

    // 1. 포상휴가 부여 기록 생성
    const { error: grantError } = await supabase
      .from('annual_leave_grant')
      .insert({
        employee_id: data.employee_id,
        grant_type: 'reward',
        granted_days: data.days,
        granted_date: new Date().toISOString().split('T')[0],
        year: currentYear,
        reason: data.reason,
      })

    if (grantError) {
      return { success: false, error: grantError.message }
    }

    // 2. 연차 잔액 업데이트
    const { data: balance } = await supabase
      .from('annual_leave_balance')
      .select('reward_leave_balance')
      .eq('employee_id', data.employee_id)
      .eq('year', currentYear)
      .single()

    if (balance) {
      const { error: balanceError } = await supabase
        .from('annual_leave_balance')
        .update({
          reward_leave_balance: balance.reward_leave_balance + data.days,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', data.employee_id)
        .eq('year', currentYear)

      if (balanceError) {
        return { success: false, error: balanceError.message }
      }
    }

    revalidatePath('/admin/leave-management')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## 4. RLS Policies

### 4.1 leave_request 테이블

**Policy: "Admins can manage all leave requests"**
```sql
CREATE POLICY "Admins can manage all leave requests"
ON leave_request FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 연차 신청 관리 가능

---

### 4.2 annual_leave_balance 테이블

**Policy: "Admins can view all leave balances"**
```sql
CREATE POLICY "Admins can view all leave balances"
ON annual_leave_balance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 연차 잔액 조회 가능

---

### 4.3 annual_leave_grant 테이블

**Policy: "Admins can insert grant records"**
```sql
CREATE POLICY "Admins can insert grant records"
ON annual_leave_grant FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 연차 부여 기록 생성 가능

---

## 5. Data Models

### 5.1 LeaveBalanceWithEmployee

```typescript
interface LeaveBalanceWithEmployee {
  id: string
  employee_id: string
  year: number
  total_days: number
  used_days: number
  remaining_days: number
  reward_leave_balance: number
  created_at: string
  updated_at: string
  employee: {
    id: string
    name: string
    position: string
    team: string
    department: {
      name: string
    }
  }
}
```

---

### 5.2 LeaveRequestWithEmployee

```typescript
interface LeaveRequestWithEmployee {
  id: string
  employee_id: string
  leave_type: 'annual' | 'half_day' | 'reward'
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  employee: {
    name: string
  }
}
```

---

### 5.3 AnnualLeaveGrant

```typescript
interface AnnualLeaveGrant {
  id: string                              // UUID
  employee_id: string                     // 직원 ID
  grant_type: 'monthly' | 'anniversary' | 'reward' | 'manual'
  granted_days: number                    // 부여 일수
  granted_date: string                    // 부여일 (YYYY-MM-DD)
  year: number                            // 연도
  reason: string                          // 사유
  created_at: string                      // 생성일
}
```

---

### 5.4 LeaveSummary

```typescript
interface LeaveSummary {
  totalEmployees: number      // 총 구성원 수
  usageRate: number           // 전체 연차 사용률 (%)
  pendingCount: number        // 승인 대기 요청
  thisMonthDays: number       // 이번 달 연차 사용 일수
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
| `MISSING_REASON` | 반려 사유를 입력해주세요 | 반려 사유 누락 |

---

## 7. Usage Examples

### 7.1 연차 관리 페이지

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings, Gift } from 'lucide-react'
import { LeaveSummaryCards } from '@/components/admin/LeaveSummaryCards'
import { LeaveBalanceTable } from '@/components/admin/LeaveBalanceTable'
import { LeaveApprovalQueue } from '@/components/admin/LeaveApprovalQueue'
import { RewardLeaveModal } from '@/components/admin/RewardLeaveModal'

export default async function LeaveManagementPage() {
  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">연차 관리</h1>
          <p className="text-muted-foreground">
            구성원별 연차 현황을 확인하고 승인을 처리하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            정책 설정
          </Button>
          <RewardLeaveModal>
            <Button>
              <Gift className="w-4 h-4 mr-2" />
              포상휴가 부여
            </Button>
          </RewardLeaveModal>
        </div>
      </div>

      {/* 요약 지표 */}
      <LeaveSummaryCards />

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeaveBalanceTable />
        </div>
        <LeaveApprovalQueue />
      </div>
    </div>
  )
}
```

---

### 7.2 요약 카드 컴포넌트

```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Users, TrendingUp, Clock, CalendarCheck } from 'lucide-react'

export async function LeaveSummaryCards() {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // 총 구성원 수
  const { count: totalEmployees } = await supabase
    .from('employee')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // 전체 연차 사용률
  const { data: balances } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days')
    .eq('year', currentYear)

  const totalDays = balances?.reduce((sum, b) => sum + (b.total_days || 0), 0) || 0
  const usedDays = balances?.reduce((sum, b) => sum + (b.used_days || 0), 0) || 0
  const usageRate = totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0

  // 승인 대기 요청
  const { count: pendingCount } = await supabase
    .from('leave_request')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // 이번 달 연차 사용
  const { data: thisMonthRequests } = await supabase
    .from('leave_request')
    .select('days_count')
    .eq('status', 'approved')
    .gte('start_date', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
    .lt('start_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)

  const thisMonthDays = thisMonthRequests?.reduce(
    (sum, r) => sum + (r.days_count || 0),
    0
  ) || 0

  const cards = [
    {
      icon: Users,
      label: '총 구성원 수',
      value: `${totalEmployees || 0}명`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: TrendingUp,
      label: '전체 연차 사용률',
      value: `${usageRate}%`,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      icon: Clock,
      label: '승인 대기 요청',
      value: `${pendingCount || 0}건`,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: CalendarCheck,
      label: '이번 달 연차 사용',
      value: `${thisMonthDays}일`,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

---

### 7.3 승인 대기 큐 컴포넌트 (Client)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/actions/leave'
import { RejectReasonModal } from './RejectReasonModal'

export function LeaveApprovalQueue() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('leave_request')
      .select('*, employee:employee_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error) {
      setRequests(data || [])
    }

    setLoading(false)
  }

  async function handleApprove(requestId: string) {
    const result = await approveLeaveRequest(requestId)

    if (result.success) {
      toast.success('승인되었습니다')
      loadRequests()
    } else {
      toast.error(result.error || '승인에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인 대기 목록</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold">{request.employee.name}</span>
                    <Badge variant="outline">
                      {getLeaveTypeLabel(request.leave_type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.start_date} ~ {request.end_date}
                  </p>
                  <p className="text-sm text-secondary font-medium">
                    {request.days_count}일
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    신청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-50 hover:bg-green-100 text-success border-0"
                    onClick={() => handleApprove(request.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    승인
                  </Button>
                  <RejectReasonModal
                    requestId={request.id}
                    onSuccess={loadRequests}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-error text-error hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      반려
                    </Button>
                  </RejectReasonModal>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">대기 중인 요청이 없습니다</p>
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

## 8. 반려 사유 모달

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { rejectLeaveRequest } from '@/app/actions/leave'

interface RejectReasonModalProps {
  requestId: string
  onSuccess: () => void
  children: React.ReactNode
}

export function RejectReasonModal({
  requestId,
  onSuccess,
  children,
}: RejectReasonModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error('반려 사유를 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const result = await rejectLeaveRequest(requestId, reason)

      if (result.success) {
        toast.success('반려되었습니다')
        setOpen(false)
        setReason('')
        onSuccess()
      } else {
        toast.error(result.error || '반려에 실패했습니다')
      }
    } catch (error) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>연차 신청 반려</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reason">반려 사유 *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              rows={4}
              required
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-error hover:bg-error/90"
            >
              {loading ? '반려 중...' : '반려하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 9. 보안 고려사항

1. **관리자 권한 확인**
   - 모든 승인/반려 작업에서 권한 확인
   - RLS 정책으로 2중 보안

2. **반려 사유 필수**
   - 반려 시 반드시 사유 입력
   - 클라이언트/서버 검증

3. **Audit Trail**
   - approved_by, rejected_by 기록
   - approved_at, rejected_at 타임스탬프

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
