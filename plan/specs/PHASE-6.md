# PHASE-6: 연차 관리 (관리자)

**생성일:** 2025-11-18
**Phase 타입:** [PAGE]
**예상 기간:** 5-6일
**의존성:** Phase 0, Phase 3

---

## 🎯 Phase Overview

### Goal
관리자가 구성원별 연차 현황을 조회하고 승인 처리를 할 수 있는 페이지를 구현합니다.

### Pages
- `/admin/leave-management` - 연차 관리

### User Stories
- [ ] 관리자는 구성원별 연차 현황을 테이블로 확인할 수 있다
- [ ] 관리자는 승인 대기 목록을 확인할 수 있다
- [ ] 관리자는 연차 신청을 승인할 수 있다
- [ ] 관리자는 연차 신청을 반려할 수 있다 (사유 필수)
- [ ] 관리자는 포상휴가를 부여할 수 있다

### Completion Criteria
- [ ] 구성원별 연차 현황 정확성
- [ ] 승인 처리 성공
- [ ] 반려 처리 성공 (사유 필수)
- [ ] 포상휴가 부여 성공
- [ ] 검색/필터 동작

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `annual_leave_balance` (연차 잔액)
- `leave_request` (연차 신청)
- `annual_leave_grant` (연차 부여 기록)
- `employee` (직원 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Leave Management (`/admin/leave-management`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "연차 관리" + 설명 + [정책설정] [포상휴가부여]│
├────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │총인원│ │사용률│ │승인  │ │이번달│          │
│ └──────┘ └──────┘ └──────┘ └──────┘          │
├────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────┐│
│ │구성원 연차 현황 (2열)  │ │승인 대기 (1열)││
│ │                        │ │                ││
│ │                        │ │                ││
│ └────────────────────────┘ └────────────────┘│
└────────────────────────────────────────────────┘
```

---

## 🧩 Components

### 1. LeaveManagementPage

**File:** `app/(authenticated)/admin/leave-management/page.tsx`

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

  if (employee?.role?.code !== 'admin') {
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

### 2. LeaveSummaryCards

**File:** `components/admin/LeaveSummaryCards.tsx`

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

### 3. LeaveBalanceTable

**File:** `components/admin/LeaveBalanceTable.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Eye, Filter } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmployeeLeaveDetailModal } from './EmployeeLeaveDetailModal'

export function LeaveBalanceTable() {
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBalances()
  }, [])

  async function loadBalances() {
    setLoading(true)
    const supabase = createClient()

    const currentYear = new Date().getFullYear()

    const { data, error } = await supabase
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

    if (!error) {
      setBalances(data || [])
    }

    setLoading(false)
  }

  const filteredBalances = balances.filter((balance) => {
    const query = searchQuery.toLowerCase()
    return (
      balance.employee?.name?.toLowerCase().includes(query) ||
      balance.employee?.team?.toLowerCase().includes(query)
    )
  })

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
        <CardTitle>구성원 연차 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 검색 및 필터 */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름 or 팀명 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구성원</TableHead>
                <TableHead>소속 팀</TableHead>
                <TableHead className="text-center">총 연차</TableHead>
                <TableHead className="text-center">사용</TableHead>
                <TableHead className="text-center">잔여</TableHead>
                <TableHead className="text-center">요청</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBalances.map((balance) => {
                const employee = balance.employee

                return (
                  <TableRow
                    key={balance.id}
                    className="hover:bg-muted cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {employee?.name?.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee?.position}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee?.team || '-'}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {balance.total_days}일
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {balance.used_days}일
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-primary font-semibold">
                        {balance.remaining_days}일
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {balance.pending_requests_count > 0 ? (
                        <Badge className="bg-yellow-100 text-warning">
                          {balance.pending_requests_count}건
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <EmployeeLeaveDetailModal employee={employee} balance={balance}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </EmployeeLeaveDetailModal>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### 4. LeaveApprovalQueue

**File:** `components/admin/LeaveApprovalQueue.tsx`

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

            <Button variant="outline" className="w-full">
              전체 목록 보기
            </Button>
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

### 5. RewardLeaveModal

**File:** `components/admin/RewardLeaveModal.tsx`

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
import { toast } from 'sonner'
import { grantRewardLeave } from '@/app/actions/leave'
import { useRouter } from 'next/navigation'

interface RewardLeaveModalProps {
  children: React.ReactNode
}

export function RewardLeaveModal({ children }: RewardLeaveModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    employee_id: '',
    days: 1,
    reason: '',
    file: null as File | null,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await grantRewardLeave({
        employee_id: formData.employee_id,
        days: formData.days,
        reason: formData.reason,
      })

      if (result.success) {
        toast.success('포상휴가가 부여되었습니다')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || '포상휴가 부여에 실패했습니다')
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
          <DialogTitle>포상휴가 부여</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 대상자 */}
          <div>
            <Label htmlFor="employee">대상자 *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) =>
                setFormData({ ...formData, employee_id: value })
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="대상자 선택" />
              </SelectTrigger>
              <SelectContent>
                {/* TODO: 실제 구성원 목록 로드 */}
                <SelectItem value="emp1">홍길동</SelectItem>
                <SelectItem value="emp2">김철수</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 일수 */}
          <div>
            <Label htmlFor="days">일수 *</Label>
            <Input
              id="days"
              type="number"
              min={1}
              value={formData.days}
              onChange={(e) =>
                setFormData({ ...formData, days: Number(e.target.value) })
              }
              required
              className="mt-1.5"
            />
          </div>

          {/* 사유 */}
          <div>
            <Label htmlFor="reason">사유 *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="포상휴가 부여 사유를 입력하세요"
              rows={3}
              required
              className="mt-1.5"
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <Label htmlFor="file">첨부파일 (선택)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.png"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  file: e.target.files?.[0] || null,
                })
              }
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              허용 형식: PDF, DOC, DOCX, JPG, PNG
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '부여 중...' : '포상휴가 부여'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

### 6. Server Actions (추가)

**File:** `app/actions/leave.ts` (추가)

```typescript
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

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rejectLeaveRequest(requestId: string, reason: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증되지 않았습니다' }
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
    const { error: balanceError } = await supabase.rpc(
      'update_reward_leave_balance',
      {
        p_employee_id: data.employee_id,
        p_year: currentYear,
        p_days: data.days,
      }
    )

    if (balanceError) {
      return { success: false, error: balanceError.message }
    }

    revalidatePath('/admin/leave-management')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## 📊 Supabase Queries Summary

### 1. 구성원별 연차 현황
```typescript
await supabase
  .from('annual_leave_balance')
  .select(`
    *,
    employee:employee_id(name, position, team, department:department_id(name))
  `)
  .eq('year', currentYear)
  .order('employee_id')
```

### 2. 승인 대기 목록
```typescript
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
```

### 3. 승인 처리
```typescript
await supabase
  .from('leave_request')
  .update({
    status: 'approved',
    approved_by: adminId,
    approved_at: now,
  })
  .eq('id', requestId)
```

### 4. 포상휴가 부여
```typescript
await supabase
  .from('annual_leave_grant')
  .insert({
    employee_id,
    grant_type: 'reward',
    granted_days: days,
    reason,
    granted_date: today,
  })
```

---

## 🔒 RLS Policies

```sql
-- leave_request: 관리자는 모든 신청 관리 가능
CREATE POLICY "Admins can manage all leave requests"
ON leave_request FOR ALL
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
- [ ] `app/(authenticated)/admin/leave-management/page.tsx` 생성
- [ ] `components/admin/LeaveSummaryCards.tsx` 생성
- [ ] `components/admin/LeaveBalanceTable.tsx` 생성
- [ ] `components/admin/LeaveApprovalQueue.tsx` 생성
- [ ] `components/admin/RewardLeaveModal.tsx` 생성
- [ ] `components/admin/RejectReasonModal.tsx` 생성
- [ ] `components/admin/EmployeeLeaveDetailModal.tsx` 생성

### Server Actions
- [ ] `approveLeaveRequest` 구현
- [ ] `rejectLeaveRequest` 구현
- [ ] `grantRewardLeave` 구현

### Data Integration
- [ ] RLS 정책 적용
- [ ] 캐시 재검증

### UI/UX
- [ ] 검색/필터 기능
- [ ] 승인/반려 모달
- [ ] 포상휴가 부여 모달

### Testing
- [ ] 연차 현황 조회
- [ ] 승인 처리
- [ ] 반려 처리 (사유 필수)
- [ ] 포상휴가 부여

---

## 📁 File Structure

```
app/
├── (authenticated)/
│   └── admin/
│       └── leave-management/
│           └── page.tsx              [CREATE]
└── actions/
    └── leave.ts                      [MODIFY]
components/
└── admin/
    ├── LeaveSummaryCards.tsx         [CREATE]
    ├── LeaveBalanceTable.tsx         [CREATE]
    ├── LeaveApprovalQueue.tsx        [CREATE]
    ├── RewardLeaveModal.tsx          [CREATE]
    ├── RejectReasonModal.tsx         [CREATE]
    └── EmployeeLeaveDetailModal.tsx  [CREATE]
```

---

**Phase 6 완료 후:**
```
"Phase 7 구현"
```
