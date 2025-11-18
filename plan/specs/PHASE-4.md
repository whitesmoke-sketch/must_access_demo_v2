# PHASE-4: 연차 신청

**생성일:** 2025-11-18
**Phase 타입:** [PAGE]
**예상 기간:** 3-4일
**의존성:** Phase 0, Phase 3

---

## 🎯 Phase Overview

### Goal
직원이 연차/반차/포상휴가를 신청할 수 있는 페이지를 구현합니다.

### Pages
- `/leave/request` - 연차 신청

### User Stories
- [ ] 사용자는 시작일과 종료일을 선택할 수 있다
- [ ] 사용자는 휴가 타입을 선택할 수 있다
- [ ] 사용자는 신청 사유를 입력할 수 있다
- [ ] 사용자는 잔여 연차를 실시간으로 확인할 수 있다
- [ ] 사용자는 신청 버튼을 클릭하여 연차를 신청할 수 있다

### Completion Criteria
- [ ] 날짜 선택 정상 동작
- [ ] 휴가 타입 선택 정상 동작
- [ ] 잔여 연차 실시간 표시
- [ ] 신청 성공 toast 표시
- [ ] 잔여 연차 부족 시 에러 처리

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `leave_request` (연차 신청)
- `annual_leave_balance` (연차 잔액)
- `employee` (직원 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Leave Request (`/leave/request`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "연차 신청" + 설명                             │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐│
│ │                                            ││
│ │   연차 신청 폼                             ││
│ │   - 휴가 타입                              ││
│ │   - 시작일                                 ││
│ │   - 종료일                                 ││
│ │   - 일수 (자동 계산)                       ││
│ │   - 사유                                   ││
│ │                                            ││
│ │   잔여 연차: N일                           ││
│ │                                            ││
│ │   [취소] [신청하기]                        ││
│ │                                            ││
│ └────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

---

## 🧩 Components

### 1. LeaveRequestPage

**File:** `app/(authenticated)/leave/request/page.tsx`

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

### 2. LeaveRequestForm

**File:** `components/leave/LeaveRequestForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

### 3. Server Action: submitLeaveRequest

**File:** `app/actions/leave.ts`

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

---

## 📊 Supabase Queries Summary

### 1. 연차 잔액 조회
```typescript
await supabase
  .from('annual_leave_balance')
  .select('remaining_days, reward_leave_balance')
  .eq('employee_id', employeeId)
  .eq('year', currentYear)
  .single()
```

### 2. 연차 신청 생성
```typescript
await supabase
  .from('leave_request')
  .insert(data)
  .select()
  .single()
```

---

## 🔒 RLS Policies

```sql
-- leave_request: 본인만 신청 가능
CREATE POLICY "Users can create own leave requests"
ON leave_request FOR INSERT
WITH CHECK (auth.uid()::text = employee_id::text);

-- leave_request: 본인 신청 조회
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

---

## 📋 Task Checklist

### Pages & Components
- [ ] `app/(authenticated)/leave/request/page.tsx` 생성
- [ ] `components/leave/LeaveRequestForm.tsx` 생성
- [ ] `app/actions/leave.ts` 생성

### UI Components
- [ ] Calendar 컴포넌트 추가 (shadcn/ui)
- [ ] Popover 컴포넌트 추가 (shadcn/ui)
- [ ] Textarea 컴포넌트 추가 (shadcn/ui)

### Data Integration
- [ ] Server Action 구현
- [ ] RLS 정책 적용
- [ ] 캐시 재검증

### UI/UX
- [ ] 날짜 선택 UX
- [ ] 일수 자동 계산
- [ ] 잔여 연차 실시간 표시
- [ ] 에러 메시지 표시

### Testing
- [ ] 연차 신청 성공
- [ ] 잔여 연차 부족 시 에러
- [ ] 날짜 선택 동작
- [ ] Toast 알림 표시

---

## 📁 File Structure

```
app/
├── (authenticated)/
│   └── leave/
│       └── request/
│           └── page.tsx              [CREATE]
└── actions/
    └── leave.ts                      [CREATE]
components/
└── leave/
    └── LeaveRequestForm.tsx          [CREATE]
```

---

**Phase 4 완료 후:**
```
"Phase 5 구현"
```
