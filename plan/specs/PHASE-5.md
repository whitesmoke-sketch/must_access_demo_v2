# PHASE-5: 조직구성원 관리

**생성일:** 2025-11-18
**Phase 타입:** [PAGE]
**예상 기간:** 4-5일
**의존성:** Phase 0

---

## 🎯 Phase Overview

### Goal
관리자가 구성원 정보를 CRUD(생성, 조회, 수정, 삭제)할 수 있는 페이지를 구현합니다.

### Pages
- `/admin/employees` - 조직구성원 관리

### User Stories
- [ ] 관리자는 구성원 목록을 테이블로 확인할 수 있다
- [ ] 관리자는 구성원을 검색할 수 있다
- [ ] 관리자는 새로운 구성원을 추가할 수 있다
- [ ] 관리자는 구성원 정보를 수정할 수 있다
- [ ] 관리자는 구성원을 삭제(비활성화)할 수 있다

### Completion Criteria
- [ ] 구성원 목록 정상 렌더링
- [ ] 구성원 추가 성공
- [ ] 구성원 수정 성공
- [ ] 구성원 삭제(soft) 성공
- [ ] 검색/필터 동작

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `employee` (직원 정보)
- `department` (부서)
- `role` (역할)
- `annual_leave_balance` (연차 잔액)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Employees Management (`/admin/employees`)

#### Layout
```
┌────────────────────────────────────────────────┐
│ "조직구성원 관리" + 설명 + 구성원 추가 버튼    │
├────────────────────────────────────────────────┤
│ [검색창]                          [필터]       │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐│
│ │이름│이메일│부서│팀│역할│입사일│연차│작업││
│ ├────────────────────────────────────────────┤│
│ │홍길동│hong@│개발│...│admin│...│15/20│✏️🗑️││
│ │...│...│...│...│...│...│...│...││
│ └────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

---

## 🧩 Components

### 1. EmployeesPage

**File:** `app/(authenticated)/admin/employees/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EmployeeTable } from '@/components/admin/EmployeeTable'
import { EmployeeModal } from '@/components/admin/EmployeeModal'

export default async function EmployeesPage() {
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
          <h1 className="text-2xl font-bold">조직구성원 관리</h1>
          <p className="text-muted-foreground">
            구성원 정보를 등록, 수정, 조회, 삭제할 수 있습니다
          </p>
        </div>
        <EmployeeModal mode="create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            구성원 추가
          </Button>
        </EmployeeModal>
      </div>

      {/* 구성원 테이블 */}
      <EmployeeTable />
    </div>
  )
}
```

---

### 2. EmployeeTable

**File:** `components/admin/EmployeeTable.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
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
import { Search, Edit, Trash2 } from 'lucide-react'
import { EmployeeModal } from './EmployeeModal'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { toast } from 'sonner'

export function EmployeeTable() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('employee')
      .select(`
        *,
        department:department_id(name),
        role:role_id(name, code),
        annual_leave_balance(
          total_days,
          remaining_days,
          reward_leave_balance
        )
      `)
      .eq('status', 'active')
      .order('name')

    if (error) {
      toast.error('구성원 목록을 불러오는데 실패했습니다')
      console.error(error)
    } else {
      setEmployees(data || [])
    }

    setLoading(false)
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.name?.toLowerCase().includes(query) ||
      emp.team?.toLowerCase().includes(query)
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
      <CardContent className="p-6 space-y-4">
        {/* 검색 */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일, 부서, 팀으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>팀</TableHead>
                <TableHead>직급</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>입사일</TableHead>
                <TableHead className="text-center">잔여 연차</TableHead>
                <TableHead className="text-center">포상휴가</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const balance = employee.annual_leave_balance?.[0]
                  const remainingDays = balance?.remaining_days || 0
                  const totalDays = balance?.total_days || 0
                  const rewardLeave = balance?.reward_leave_balance || 0

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department?.name || '-'}</TableCell>
                      <TableCell>{employee.team || '-'}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>
                        <RoleBadge role={employee.role?.code} />
                      </TableCell>
                      <TableCell>
                        {employee.join_date
                          ? new Date(employee.join_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {remainingDays}/{totalDays}일
                      </TableCell>
                      <TableCell className="text-center text-pink-600 font-medium">
                        {rewardLeave}일
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <EmployeeModal mode="edit" employee={employee}>
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </EmployeeModal>
                          <DeleteEmployeeDialog
                            employeeId={employee.id}
                            employeeName={employee.name}
                            onSuccess={loadEmployees}
                          >
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DeleteEmployeeDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? '검색 결과가 없습니다'
                        : '등록된 구성원이 없습니다'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function RoleBadge({ role }: { role: string }) {
  const configs = {
    super_admin: {
      label: '최고관리자',
      className: 'bg-purple-100 text-purple-700',
    },
    admin: {
      label: '관리자',
      className: 'bg-blue-100 text-blue-700',
    },
    employee: {
      label: '구성원',
      className: 'bg-gray-100 text-gray-700',
    },
  }

  const config = configs[role] || configs.employee

  return <Badge className={config.className}>{config.label}</Badge>
}
```

---

### 3. EmployeeModal

**File:** `components/admin/EmployeeModal.tsx`

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
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { createEmployee, updateEmployee } from '@/app/actions/employee'
import { useRouter } from 'next/navigation'

interface EmployeeModalProps {
  mode: 'create' | 'edit'
  employee?: any
  children: React.ReactNode
}

export function EmployeeModal({ mode, employee, children }: EmployeeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    department_id: employee?.department_id || '',
    team: employee?.team || '',
    position: employee?.position || '',
    role_id: employee?.role_id || '',
    join_date: employee?.join_date ? new Date(employee.join_date) : undefined,
    annual_leave_days: employee?.annual_leave_balance?.[0]?.total_days || 15,
    used_days: employee?.annual_leave_balance?.[0]?.used_days || 0,
    reward_leave: employee?.annual_leave_balance?.[0]?.reward_leave_balance || 0,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        join_date: formData.join_date
          ? format(formData.join_date, 'yyyy-MM-dd')
          : null,
      }

      let result
      if (mode === 'create') {
        result = await createEmployee(data)
      } else {
        result = await updateEmployee(employee.id, data)
      }

      if (result.success) {
        toast.success(
          mode === 'create'
            ? '구성원이 추가되었습니다'
            : '구성원 정보가 수정되었습니다'
        )
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || '작업에 실패했습니다')
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '구성원 추가' : '구성원 수정'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 이름 */}
            <div>
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="홍길동"
                required
                className="mt-1.5"
              />
            </div>

            {/* 이메일 */}
            <div>
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="hong@must.com"
                required
                className="mt-1.5"
              />
            </div>

            {/* 부서 */}
            <div>
              <Label htmlFor="department">부서 *</Label>
              <Input
                id="department"
                value={formData.department_id}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
                placeholder="개발"
                required
                className="mt-1.5"
              />
            </div>

            {/* 팀 */}
            <div>
              <Label htmlFor="team">팀 *</Label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) =>
                  setFormData({ ...formData, team: e.target.value })
                }
                placeholder="백엔드팀"
                required
                className="mt-1.5"
              />
            </div>

            {/* 직급 */}
            <div>
              <Label htmlFor="position">직급</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="선임연구원"
                className="mt-1.5"
              />
            </div>

            {/* 역할 */}
            <div>
              <Label>역할 *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, role_id: value })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">구성원</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="super_admin">최고관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 입사일 */}
            <div>
              <Label>입사일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1.5"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.join_date ? (
                      format(formData.join_date, 'PPP', { locale: ko })
                    ) : (
                      <span>날짜를 선택하세요</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.join_date}
                    onSelect={(date) =>
                      setFormData({ ...formData, join_date: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 연차 일수 */}
            <div>
              <Label htmlFor="annual_leave">연차 일수</Label>
              <Input
                id="annual_leave"
                type="number"
                value={formData.annual_leave_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    annual_leave_days: Number(e.target.value),
                  })
                }
                min={0}
                className="mt-1.5"
              />
            </div>

            {/* 사용한 연차 */}
            <div>
              <Label htmlFor="used_days">사용한 연차</Label>
              <Input
                id="used_days"
                type="number"
                value={formData.used_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    used_days: Number(e.target.value),
                  })
                }
                min={0}
                className="mt-1.5"
              />
            </div>

            {/* 포상휴가 */}
            <div>
              <Label htmlFor="reward_leave">포상휴가 일수</Label>
              <Input
                id="reward_leave"
                type="number"
                value={formData.reward_leave}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reward_leave: Number(e.target.value),
                  })
                }
                min={0}
                className="mt-1.5"
              />
            </div>
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
              {loading
                ? mode === 'create'
                  ? '추가 중...'
                  : '수정 중...'
                : mode === 'create'
                ? '추가'
                : '수정'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

### 4. DeleteEmployeeDialog

**File:** `components/admin/DeleteEmployeeDialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { deleteEmployee } from '@/app/actions/employee'

interface DeleteEmployeeDialogProps {
  employeeId: string
  employeeName: string
  onSuccess: () => void
  children: React.ReactNode
}

export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  onSuccess,
  children,
}: DeleteEmployeeDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)

    try {
      const result = await deleteEmployee(employeeId)

      if (result.success) {
        toast.success('구성원이 삭제되었습니다')
        onSuccess()
      } else {
        toast.error(result.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>구성원 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{employeeName}</strong> 구성원을 삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-error hover:bg-error/90"
          >
            {loading ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

### 5. Server Actions

**File:** `app/actions/employee.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createEmployee(data: any) {
  try {
    const supabase = await createClient()

    // 1. 구성원 추가
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .insert({
        name: data.name,
        email: data.email,
        department_id: data.department_id,
        team: data.team,
        position: data.position,
        role_id: data.role_id,
        join_date: data.join_date,
        status: 'active',
      })
      .select()
      .single()

    if (employeeError) {
      return { success: false, error: employeeError.message }
    }

    // 2. 연차 잔액 초기화
    const currentYear = new Date().getFullYear()
    const { error: balanceError } = await supabase
      .from('annual_leave_balance')
      .insert({
        employee_id: employee.id,
        year: currentYear,
        total_days: data.annual_leave_days,
        used_days: data.used_days,
        remaining_days: data.annual_leave_days - data.used_days,
        reward_leave_balance: data.reward_leave,
      })

    if (balanceError) {
      return { success: false, error: balanceError.message }
    }

    revalidatePath('/admin/employees')

    return { success: true, data: employee }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEmployee(id: string, data: any) {
  try {
    const supabase = await createClient()

    // 1. 구성원 정보 수정
    const { error: employeeError } = await supabase
      .from('employee')
      .update({
        name: data.name,
        email: data.email,
        department_id: data.department_id,
        team: data.team,
        position: data.position,
        role_id: data.role_id,
        join_date: data.join_date,
      })
      .eq('id', id)

    if (employeeError) {
      return { success: false, error: employeeError.message }
    }

    // 2. 연차 잔액 수정
    const currentYear = new Date().getFullYear()
    const { error: balanceError } = await supabase
      .from('annual_leave_balance')
      .update({
        total_days: data.annual_leave_days,
        used_days: data.used_days,
        remaining_days: data.annual_leave_days - data.used_days,
        reward_leave_balance: data.reward_leave,
      })
      .eq('employee_id', id)
      .eq('year', currentYear)

    if (balanceError) {
      return { success: false, error: balanceError.message }
    }

    revalidatePath('/admin/employees')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEmployee(id: string) {
  try {
    const supabase = await createClient()

    // Soft delete
    const { error } = await supabase
      .from('employee')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/employees')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

---

## 📊 Supabase Queries Summary

### 1. 구성원 목록 조회
```typescript
await supabase
  .from('employee')
  .select(`
    *,
    department:department_id(name),
    role:role_id(name, code),
    annual_leave_balance(total_days, remaining_days, reward_leave_balance)
  `)
  .eq('status', 'active')
  .order('name')
```

### 2. 구성원 추가
```typescript
await supabase
  .from('employee')
  .insert(data)
  .select()
  .single()
```

### 3. 구성원 수정
```typescript
await supabase
  .from('employee')
  .update(data)
  .eq('id', employeeId)
```

### 4. 구성원 삭제 (Soft Delete)
```typescript
await supabase
  .from('employee')
  .update({ status: 'inactive' })
  .eq('id', employeeId)
```

---

## 🔒 RLS Policies

```sql
-- employee: 관리자만 모든 구성원 관리 가능
CREATE POLICY "Admins can manage employees"
ON employee FOR ALL
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
- [ ] `app/(authenticated)/admin/employees/page.tsx` 생성
- [ ] `components/admin/EmployeeTable.tsx` 생성
- [ ] `components/admin/EmployeeModal.tsx` 생성
- [ ] `components/admin/DeleteEmployeeDialog.tsx` 생성
- [ ] `app/actions/employee.ts` 생성

### UI Components
- [ ] Table 컴포넌트 추가
- [ ] Dialog 컴포넌트 추가
- [ ] AlertDialog 컴포넌트 추가

### Data Integration
- [ ] Server Actions 구현
- [ ] RLS 정책 적용
- [ ] 캐시 재검증

### UI/UX
- [ ] 검색 기능
- [ ] 모달 UX
- [ ] 삭제 확인 다이얼로그

### Testing
- [ ] 구성원 목록 조회
- [ ] 구성원 추가
- [ ] 구성원 수정
- [ ] 구성원 삭제
- [ ] 검색 기능

---

## 📁 File Structure

```
app/
├── (authenticated)/
│   └── admin/
│       └── employees/
│           └── page.tsx              [CREATE]
└── actions/
    └── employee.ts                   [CREATE]
components/
└── admin/
    ├── EmployeeTable.tsx             [CREATE]
    ├── EmployeeModal.tsx             [CREATE]
    └── DeleteEmployeeDialog.tsx      [CREATE]
```

---

**Phase 5 완료 후:**
```
"Phase 6 구현"
```
