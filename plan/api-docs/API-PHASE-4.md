# API-PHASE-4: 연차 신청

**생성일:** 2025-01-18
**Phase:** 4 (연차 신청)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries + Server Actions

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/leave/request
Local: http://localhost:3000/leave/request
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
  .select('remaining_days, reward_leave_balance')
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
    remaining_days: number,       // 잔여 연차 일수
    reward_leave_balance: number  // 포상휴가 잔액
  },
  error: null
}
```

**RLS Policy:** 본인 연차만 조회 가능

---

### 2.2 연차 신청 생성

**Query:**
```typescript
await supabase
  .from('leave_request')
  .insert(data)
  .select()
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| employee_id | string | Yes | 직원 ID |
| leave_type | string | Yes | 휴가 타입 ('annual' \| 'half_day' \| 'reward') |
| start_date | string | Yes | 시작일 (YYYY-MM-DD) |
| end_date | string | Yes | 종료일 (YYYY-MM-DD) |
| days_count | number | Yes | 일수 |
| reason | string | Yes | 사유 |
| status | string | Yes | 상태 ('pending') |

**Response:**
```typescript
{
  data: {
    id: string,
    employee_id: string,
    leave_type: 'annual' | 'half_day' | 'reward',
    start_date: string,
    end_date: string,
    days_count: number,
    reason: string,
    status: 'pending',
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: string
  },
  error: null
}
```

**RLS Policy:** 본인만 신청 가능

---

## 3. Server Actions

### 3.1 submitLeaveRequest

**File:** `app/actions/leave.ts`

**Function:**
```typescript
export async function submitLeaveRequest(data: LeaveRequestData)
```

**Parameters:**
```typescript
interface LeaveRequestData {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: string
}
```

**Response:**
```typescript
{
  success: boolean
  data?: any
  error?: string
}
```

**Implementation:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface LeaveRequestData {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: string
}

export async function submitLeaveRequest(data: LeaveRequestData) {
  try {
    const supabase = await createClient()

    // 1. 잔여 연차 확인
    const currentYear = new Date().getFullYear()
    const { data: balance } = await supabase
      .from('annual_leave_balance')
      .select('remaining_days, reward_leave_balance')
      .eq('employee_id', data.employee_id)
      .eq('year', currentYear)
      .single()

    if (!balance) {
      return { success: false, error: '연차 정보를 찾을 수 없습니다' }
    }

    // 2. 잔여 연차 부족 확인
    if (data.leave_type === 'annual' && balance.remaining_days < data.days_count) {
      return { success: false, error: '잔여 연차가 부족합니다' }
    }

    if (data.leave_type === 'reward' && balance.reward_leave_balance < data.days_count) {
      return { success: false, error: '잔여 포상휴가가 부족합니다' }
    }

    // 3. 연차 신청 생성
    const { data: request, error } = await supabase
      .from('leave_request')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Leave request error:', error)
      return { success: false, error: error.message }
    }

    // 4. 캐시 재검증
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true, data: request }
  } catch (error: any) {
    console.error('Submit leave request error:', error)
    return { success: false, error: error.message || '알 수 없는 오류가 발생했습니다' }
  }
}
```

**사용 예시:**
```typescript
const result = await submitLeaveRequest({
  employee_id: user.id,
  leave_type: 'annual',
  start_date: '2025-01-20',
  end_date: '2025-01-22',
  days_count: 3,
  reason: '가족 여행',
  status: 'pending',
})

if (result.success) {
  toast.success('연차 신청이 완료되었습니다')
} else {
  toast.error(result.error)
}
```

---

## 4. RLS Policies

### 4.1 leave_request 테이블

**Policy: "Users can create own leave requests"**
```sql
CREATE POLICY "Users can create own leave requests"
ON leave_request FOR INSERT
WITH CHECK (auth.uid()::text = employee_id::text);
```

**설명:** 본인만 연차 신청 가능

---

**Policy: "Users can view own leave requests"**
```sql
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**설명:** 본인 신청만 조회 가능

---

### 4.2 annual_leave_balance 테이블

**Policy: "Users can view own leave balance"**
```sql
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**설명:** 본인 연차 잔액만 조회 가능

---

## 5. Data Models

### 5.1 LeaveRequestData

```typescript
interface LeaveRequestData {
  employee_id: string               // 직원 ID
  leave_type: 'annual' | 'half_day' | 'reward'
  start_date: string                // 시작일 (YYYY-MM-DD)
  end_date: string                  // 종료일 (YYYY-MM-DD)
  days_count: number                // 일수
  reason: string                    // 사유
  status: 'pending'                 // 상태 (항상 'pending')
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

## 6. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `PGRST116` | No rows found | 연차 잔액이 없음 |
| `PGRST301` | Row level security violation | RLS 정책 위반 (권한 없음) |
| `23505` | Duplicate key value | 중복 신청 |
| `INSUFFICIENT_LEAVE` | 잔여 연차가 부족합니다 | 잔여 연차 부족 |
| `INSUFFICIENT_REWARD` | 잔여 포상휴가가 부족합니다 | 잔여 포상휴가 부족 |

---

## 7. Usage Examples

### 7.1 연차 신청 페이지

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm'

export default async function LeaveRequestPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 및 연차 잔액 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('id, name')
    .eq('id', user.id)
    .single()

  const currentYear = new Date().getFullYear()

  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('*')
    .eq('employee_id', user.id)
    .eq('year', currentYear)
    .single()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">연차 신청</h1>
        <p className="text-muted-foreground">
          연차, 반차, 포상휴가를 신청하세요
        </p>
      </div>

      {/* 연차 신청 폼 */}
      <LeaveRequestForm
        employeeId={user.id}
        employeeName={employee?.name || ''}
        balance={balance}
      />
    </div>
  )
}
```

---

### 7.2 연차 신청 폼 컴포넌트

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { submitLeaveRequest } from '@/app/actions/leave'

interface LeaveRequestFormProps {
  employeeId: string
  employeeName: string
  balance: any
}

export function LeaveRequestForm({
  employeeId,
  employeeName,
  balance,
}: LeaveRequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [leaveType, setLeaveType] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [reason, setReason] = useState('')

  // 일수 계산
  const daysCount =
    startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0

  // 잔여 연차 확인
  const remainingDays = balance?.remaining_days || 0
  const rewardLeaveBalance = balance?.reward_leave_balance || 0
  const isInsufficientLeave =
    leaveType === 'annual' && daysCount > remainingDays

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error('모든 필드를 입력해주세요')
      return
    }

    if (isInsufficientLeave) {
      toast.error('잔여 연차가 부족합니다')
      return
    }

    setLoading(true)

    try {
      const result = await submitLeaveRequest({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        days_count: daysCount,
        reason,
        status: 'pending',
      })

      if (result.success) {
        toast.success('연차 신청이 완료되었습니다')
        router.push('/leave/my-leave')
      } else {
        toast.error(result.error || '연차 신청에 실패했습니다')
      }
    } catch (error) {
      toast.error('연차 신청 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    router.back()
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 휴가 타입 */}
          <div>
            <Label htmlFor="leave_type">휴가 타입 *</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="휴가 타입을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">연차</SelectItem>
                <SelectItem value="half_day">반차</SelectItem>
                <SelectItem value="reward">포상휴가</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 시작일 */}
          <div>
            <Label>시작일 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1.5"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, 'PPP', { locale: ko })
                  ) : (
                    <span>날짜를 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 종료일 */}
          <div>
            <Label>종료일 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1.5"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, 'PPP', { locale: ko })
                  ) : (
                    <span>날짜를 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  disabled={(date) =>
                    startDate ? date < startDate : false
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 일수 (자동 계산) */}
          {daysCount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">신청 일수</p>
              <p className="text-lg font-semibold text-primary">
                {daysCount}일
              </p>
            </div>
          )}

          {/* 사유 */}
          <div>
            <Label htmlFor="reason">사유 *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="연차 신청 사유를 입력하세요"
              rows={4}
              className="mt-1.5"
            />
          </div>

          {/* 잔여 연차 정보 */}
          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">잔여 연차</span>
              <span className="font-semibold text-primary">
                {remainingDays}일
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                잔여 포상휴가
              </span>
              <span className="font-semibold text-pink-600">
                {rewardLeaveBalance}일
              </span>
            </div>
          </div>

          {/* 에러 메시지 */}
          {isInsufficientLeave && (
            <div className="p-3 bg-red-50 text-error rounded-lg text-sm">
              잔여 연차가 부족합니다. 현재 잔여 연차: {remainingDays}일
            </div>
          )}

          {/* 버튼 */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || isInsufficientLeave}
            >
              {loading ? '신청 중...' : '신청하기'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

---

## 8. UI 컴포넌트

### 8.1 shadcn/ui 설치

```bash
# Calendar
npx shadcn-ui@latest add calendar

# Popover
npx shadcn-ui@latest add popover

# Textarea
npx shadcn-ui@latest add textarea
```

---

## 9. 날짜 계산 (date-fns)

### 9.1 일수 계산

```typescript
import { differenceInDays } from 'date-fns'

const daysCount = differenceInDays(endDate, startDate) + 1
```

### 9.2 날짜 포맷팅

```typescript
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// YYYY-MM-DD 형식
const formattedDate = format(date, 'yyyy-MM-dd')

// 한국어 긴 형식
const longDate = format(date, 'PPP', { locale: ko })
// 예: "2025년 1월 20일"
```

---

## 10. 유효성 검증

### 10.1 클라이언트 검증

```typescript
// 필수 필드 확인
if (!leaveType || !startDate || !endDate || !reason) {
  toast.error('모든 필드를 입력해주세요')
  return
}

// 잔여 연차 확인
if (leaveType === 'annual' && daysCount > remainingDays) {
  toast.error('잔여 연차가 부족합니다')
  return
}

// 날짜 검증
if (endDate < startDate) {
  toast.error('종료일은 시작일 이후여야 합니다')
  return
}
```

### 10.2 서버 검증

```typescript
// Server Action에서 재검증
const { data: balance } = await supabase
  .from('annual_leave_balance')
  .select('remaining_days, reward_leave_balance')
  .eq('employee_id', data.employee_id)
  .eq('year', currentYear)
  .single()

if (!balance) {
  return { success: false, error: '연차 정보를 찾을 수 없습니다' }
}

if (data.leave_type === 'annual' && balance.remaining_days < data.days_count) {
  return { success: false, error: '잔여 연차가 부족합니다' }
}
```

---

## 11. 보안 고려사항

1. **이중 검증**
   - 클라이언트와 서버 양쪽에서 검증
   - RLS 정책으로 권한 확인

2. **SQL Injection 방지**
   - Supabase 클라이언트 사용 (파라미터화된 쿼리)

3. **CSRF 방지**
   - Next.js Server Actions 자동 처리

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
