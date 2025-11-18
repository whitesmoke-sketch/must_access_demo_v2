# API-PHASE-5: 조직구성원 관리

**생성일:** 2025-01-18
**Phase:** 5 (조직구성원 관리)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** Supabase Queries + Server Actions

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app/admin/employees
Local: http://localhost:3000/admin/employees
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

### 2.1 구성원 목록 조회

**Query:**
```typescript
await supabase
  .from('employee')
  .select(`
    *,
    department:department_id(name),
    role:role_id(name, code),
    annual_leave_balance(
      total_days,
      used_days,
      remaining_days,
      reward_leave_balance
    )
  `)
  .eq('status', 'active')
  .order('name')
```

**Response:**
```typescript
{
  data: Array<{
    id: string,
    name: string,
    email: string,
    department_id: string,
    team: string | null,
    position: string | null,
    role_id: string,
    join_date: string | null,
    status: 'active',
    created_at: string,
    updated_at: string,
    department: {
      name: string
    },
    role: {
      name: string,
      code: 'employee' | 'admin' | 'super_admin'
    },
    annual_leave_balance: Array<{
      total_days: number,
      used_days: number,
      remaining_days: number,
      reward_leave_balance: number
    }>
  }>,
  error: null
}
```

**RLS Policy:** Admin만 조회 가능

---

### 2.2 부서 목록 조회

**Query:**
```typescript
await supabase
  .from('department')
  .select('*')
  .order('name')
```

**Response:**
```typescript
{
  data: Array<{
    id: string,
    name: string,
    created_at: string
  }>,
  error: null
}
```

---

### 2.3 역할 목록 조회

**Query:**
```typescript
await supabase
  .from('role')
  .select('*')
  .order('code')
```

**Response:**
```typescript
{
  data: Array<{
    id: string,
    code: 'employee' | 'admin' | 'super_admin',
    name: string,
    created_at: string
  }>,
  error: null
}
```

---

## 3. Server Actions

### 3.1 createEmployee

**File:** `app/actions/employee.ts`

**Function:**
```typescript
export async function createEmployee(data: any)
```

**Parameters:**
```typescript
interface EmployeeData {
  name: string
  email: string
  department_id: string
  team: string
  position: string
  role_id: string
  join_date: string | null
  annual_leave_days: number
  used_days: number
  reward_leave: number
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
```

---

### 3.2 updateEmployee

**Function:**
```typescript
export async function updateEmployee(id: string, data: any)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | 직원 ID |
| data | EmployeeData | Yes | 수정할 데이터 |

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

**Implementation:**
```typescript
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
```

---

### 3.3 deleteEmployee

**Function:**
```typescript
export async function deleteEmployee(id: string)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | 직원 ID |

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

**Implementation:**
```typescript
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

## 4. RLS Policies

### 4.1 employee 테이블

**Policy: "Admins can manage employees"**
```sql
CREATE POLICY "Admins can manage employees"
ON employee FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 구성원 관리 가능 (CRUD)

---

### 4.2 annual_leave_balance 테이블

**Policy: "Admins can manage all leave balances"**
```sql
CREATE POLICY "Admins can manage all leave balances"
ON annual_leave_balance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code IN ('admin', 'super_admin'))
  )
);
```

**설명:** 관리자만 모든 연차 잔액 관리 가능

---

## 5. Data Models

### 5.1 Employee

```typescript
interface Employee {
  id: string                    // UUID
  name: string                  // 이름
  email: string                 // 이메일
  department_id: string         // 부서 ID
  team: string | null           // 팀명
  position: string | null       // 직급
  role_id: string               // 역할 ID
  join_date: string | null      // 입사일 (YYYY-MM-DD)
  status: 'active' | 'inactive' // 상태
  created_at: string            // 생성일
  updated_at: string            // 수정일
}
```

---

### 5.2 EmployeeWithDetails

```typescript
interface EmployeeWithDetails extends Employee {
  department: {
    name: string
  }
  role: {
    name: string
    code: 'employee' | 'admin' | 'super_admin'
  }
  annual_leave_balance: Array<{
    total_days: number
    used_days: number
    remaining_days: number
    reward_leave_balance: number
  }>
}
```

---

### 5.3 Department

```typescript
interface Department {
  id: string          // UUID
  name: string        // 부서명
  created_at: string  // 생성일
}
```

---

### 5.4 Role

```typescript
interface Role {
  id: string                               // UUID
  code: 'employee' | 'admin' | 'super_admin' // 역할 코드
  name: string                             // 역할명
  created_at: string                       // 생성일
}
```

---

## 6. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `23505` | Duplicate key value | 중복 이메일 |
| `23503` | Foreign key violation | 잘못된 department_id 또는 role_id |
| `PGRST116` | No rows found | 구성원을 찾을 수 없음 |
| `PGRST301` | Row level security violation | RLS 정책 위반 (권한 없음) |
| `42501` | Insufficient privilege | 권한 부족 |

---

## 7. Usage Examples

### 7.1 구성원 관리 페이지

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

  if (employee?.role?.code !== 'admin' && employee?.role?.code !== 'super_admin') {
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

### 7.2 구성원 테이블 (Client Component)

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
          used_days,
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

### 7.3 구성원 추가/수정 모달

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
    join_date: employee?.join_date || null,
    annual_leave_days: employee?.annual_leave_balance?.[0]?.total_days || 15,
    used_days: employee?.annual_leave_balance?.[0]?.used_days || 0,
    reward_leave: employee?.annual_leave_balance?.[0]?.reward_leave_balance || 0,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (mode === 'create') {
        result = await createEmployee(formData)
      } else {
        result = await updateEmployee(employee.id, formData)
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

            {/* 기타 필드 생략 */}
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

## 8. UI 컴포넌트

### 8.1 shadcn/ui 설치

```bash
# Table
npx shadcn-ui@latest add table

# Dialog
npx shadcn-ui@latest add dialog

# Alert Dialog
npx shadcn-ui@latest add alert-dialog
```

---

## 9. 검색 및 필터링

### 9.1 클라이언트 필터링

```typescript
const filteredEmployees = employees.filter((emp) => {
  const query = searchQuery.toLowerCase()
  return (
    emp.name?.toLowerCase().includes(query) ||
    emp.email?.toLowerCase().includes(query) ||
    emp.department?.name?.toLowerCase().includes(query) ||
    emp.team?.toLowerCase().includes(query)
  )
})
```

### 9.2 서버 필터링 (권장)

```typescript
const { data } = await supabase
  .from('employee')
  .select('*')
  .eq('status', 'active')
  .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
  .order('name')
```

---

## 10. 보안 고려사항

1. **관리자 권한 확인**
   - 모든 CRUD 작업에서 권한 확인
   - RLS 정책으로 2중 보안

2. **이메일 중복 방지**
   - 데이터베이스 UNIQUE 제약
   - 클라이언트/서버 검증

3. **Soft Delete**
   - 물리 삭제 대신 status='inactive' 처리
   - 데이터 복구 가능

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
