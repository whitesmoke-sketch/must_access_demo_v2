# Backend READ API 전체 명세서

**프로젝트**: MUST Access VibeD
**목적**: 모든 테이블별 READ API 정의 (Auth 기반, RLS 적용)
**작성일**: 2024-12-04

---

## 📋 목차
1. [개요](#개요)
2. [인증 및 권한 체계](#인증-및-권한-체계)
3. [기존 구현된 API](#기존-구현된-api)
4. [테이블별 READ API 명세](#테이블별-read-api-명세)
5. [구현 우선순위](#구현-우선순위)

---

## 개요

### 📊 전체 통계
- **총 테이블 수**: 38개
- **기존 구현 API**: ~15개 (추정)
- **신규 구현 필요 API**: 120+ 개

### 🎯 API 설계 원칙
1. **인증 필수**: 모든 API는 `auth.uid()` 기반 인증
2. **RLS 적용**: Row Level Security로 데이터 접근 제어
3. **권한 검증**: role.level 기반 권한 체크
4. **Server Actions**: Next.js Server Actions 사용
5. **타입 안전성**: TypeScript 타입 정의 필수

---

## 인증 및 권한 체계

### 역할(Role) 레벨
```typescript
enum RoleLevel {
  EMPLOYEE = 1,           // 일반사원
  TEAM_LEADER = 2,        // 팀리더
  DEPARTMENT_LEADER = 3,  // 부서리더
  BUSINESS_LEADER = 4,    // 사업리더
  CEO = 5,                // 대표
  HR = 5,                 // HR (최종 승인자)
}
```

### 권한 매트릭스
| 역할 | 본인 데이터 | 팀 데이터 | 부서 데이터 | 전체 데이터 |
|------|-----------|---------|-----------|-----------|
| 일반사원 | ✅ | ❌ | ❌ | ❌ |
| 팀리더 | ✅ | ✅ | ❌ | ❌ |
| 부서리더 | ✅ | ✅ | ✅ | ❌ |
| 사업리더 | ✅ | ✅ | ✅ | ✅ (부분) |
| 대표/HR | ✅ | ✅ | ✅ | ✅ |

---

## 기존 구현된 API

### ✅ app/actions/leave.ts
- `createLeaveRequest()` - 연차 신청 생성
- `getLeaveRequests()` - 연차 목록 조회 (본인)
- `getLeaveRequestById()` - 연차 상세 조회

### ✅ app/actions/employee.ts
- `createEmployee()` - 구성원 초대
- `updateEmployee()` - 구성원 정보 수정
- `getEmployees()` - 구성원 목록 조회
- `getEmployeeById()` - 구성원 상세 조회

### ✅ app/actions/department.ts
- `getDepartments()` - 부서 목록 조회
- `getDepartmentTree()` - 부서 트리 조회
- `createDepartment()` - 부서 생성
- `updateDepartment()` - 부서 수정

### ✅ app/actions/meeting-room.ts
- `getMeetingRooms()` - 회의실 목록
- `getMeetingRoomBookings()` - 예약 목록
- `createBooking()` - 예약 생성

### ✅ app/actions/approval.ts
- `getApprovalSteps()` - 승인 단계 조회
- `approveStep()` - 승인 처리

### ✅ app/actions/notification.ts
- `getNotifications()` - 알림 조회
- `markAsRead()` - 읽음 처리

---

## 테이블별 READ API 명세

## 1. 핵심 도메인 (Core Domain)

### 📁 employee (직원)

#### 1.1 본인 정보 조회
```typescript
// app/actions/employee.ts
export async function getMyProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('employee')
    .select(`
      *,
      department:department_id (*),
      role:role_id (*),
      annual_leave_balance (*)
    `)
    .eq('id', user.id)
    .single()

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `employee_select_own`

---

#### 1.2 전체 구성원 목록 조회 (기존 구현 ✅)
```typescript
export async function getEmployees(filters?: {
  department_id?: number
  role_id?: number
  status?: string
  search?: string
}) {
  // 이미 구현됨 - app/actions/employee.ts
}
```

**권한**: 전체 (활성 사용자만)
**RLS 정책**: `employee_select_others`

---

#### 1.3 구성원 상세 조회 with 부가정보
```typescript
export async function getEmployeeDetail(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee')
    .select(`
      *,
      department:department_id (
        id,
        name,
        code,
        full_path:get_department_path(id)
      ),
      role:role_id (*),
      annual_leave_balance (*),
      leave_requests:leave_request(
        id,
        leave_type,
        start_date,
        end_date,
        status,
        requested_days
      ),
      attendance_records:attendance!attendance_employee_id_fkey(
        date,
        status,
        late_minutes
      )
    `)
    .eq('id', employeeId)
    .eq('status', 'active')
    .single()

  return { data, error }
}
```

**권한**: 전체 (활성 사용자)
**RLS 정책**: `employee_select_others`

---

#### 1.4 부서별 구성원 통계
```typescript
export async function getEmployeeStatsByDepartment(departmentId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_employee_stats_by_department', {
      p_department_id: departmentId
    })

  return { data, error }
}
```

**신규 함수 필요**:
```sql
CREATE OR REPLACE FUNCTION get_employee_stats_by_department(p_department_id BIGINT)
RETURNS TABLE(
  total_count INTEGER,
  active_count INTEGER,
  inactive_count INTEGER,
  by_role JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_count,
    COUNT(*) FILTER (WHERE status = 'inactive')::INTEGER as inactive_count,
    jsonb_agg(jsonb_build_object(
      'role_id', role_id,
      'role_name', r.name,
      'count', role_count
    )) as by_role
  FROM employee e
  LEFT JOIN role r ON r.id = e.role_id
  LEFT JOIN LATERAL (
    SELECT role_id, COUNT(*) as role_count
    FROM employee
    WHERE department_id = p_department_id
    GROUP BY role_id
  ) role_stats ON role_stats.role_id = e.role_id
  WHERE e.department_id = p_department_id;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

### 📁 department (부서)

#### 1.5 부서 계층 구조 with 통계 (기존 구현 ✅)
```typescript
export async function getDepartmentTree() {
  // 이미 구현됨 - app/actions/department.ts
}
```

---

#### 1.6 부서 변경 이력 조회
```typescript
export async function getDepartmentHistory(departmentId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('department_history')
    .select(`
      *,
      changed_by_employee:changed_by (
        name,
        email
      )
    `)
    .eq('department_id', departmentId)
    .order('changed_at', { ascending: false })

  return { data, error }
}
```

**권한**: 전체 (읽기 전용)
**RLS 정책**: `department_history_select`

---

#### 1.7 리더 정보 조회
```typescript
export async function getDepartmentLeaders(departmentId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leader')
    .select(`
      employee_id,
      employee:employee_id (
        id,
        name,
        email,
        phone,
        position:role_id (name)
      ),
      created_at
    `)
    .eq('department_id', departmentId)

  return { data, error }
}
```

**권한**: 전체
**테이블**: `leader` (N:N 관계)

---

### 📁 role (역할)

#### 1.8 역할 목록 조회
```typescript
export async function getRoles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('role')
    .select('*')
    .order('level', { ascending: true })

  return { data, error }
}
```

**권한**: 전체
**RLS 정책**: `role_select_all`

---

#### 1.9 역할별 권한 조회
```typescript
export async function getRolePermissions(roleId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('role_permission')
    .select(`
      permission:permission_id (
        id,
        name,
        code,
        resource,
        action,
        description
      )
    `)
    .eq('role_id', roleId)

  return { data, error }
}
```

**권한**: 전체
**테이블**: `role_permission`, `permission`

---

#### 1.10 전체 권한 목록 조회
```typescript
export async function getPermissions(resource?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('permission')
    .select('*')
    .order('resource', { ascending: true })
    .order('action', { ascending: true })

  if (resource) {
    query = query.eq('resource', resource)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 전체 (읽기 전용)
**RLS 정책**: `permission_select_all` (필요시 추가)

---

#### 1.11 구성원 부서 이동 이력 조회
```typescript
export async function getEmployeeDepartmentHistory(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // 본인 또는 Manager 이상만 조회 가능
  const { data: myEmployee } = await supabase
    .from('employee')
    .select('role:role_id(level)')
    .eq('id', user.id)
    .single()

  const isManager = myEmployee?.role?.level >= 3
  if (employeeId !== user.id && !isManager) {
    throw new Error('Insufficient permissions')
  }

  const { data, error } = await supabase
    .from('employee_department_history')
    .select(`
      *,
      old_department:old_department_id (id, name, code),
      new_department:new_department_id (id, name, code),
      changed_by_employee:changed_by (name, email)
    `)
    .eq('employee_id', employeeId)
    .order('changed_at', { ascending: false })

  return { data, error }
}
```

**권한**: 본인 또는 Manager 이상 (level >= 3)
**RLS 정책**: `employee_department_history_select`

---

### 📁 invited_employees (초대된 구성원)

#### 1.10 초대 목록 조회
```typescript
export async function getInvitedEmployees(status?: 'pending' | 'registered' | 'expired') {
  const supabase = await createClient()

  let query = supabase
    .from('invited_employees')
    .select(`
      *,
      department:department_id (*),
      role:role_id (*),
      invited_by_employee:invited_by (name, email)
    `)
    .order('invited_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: Manager 이상 (level >= 3)
**RLS 정책**: `invited_select_all`

---

## 2. 문서 및 승인 (Document & Approval)

### 📁 document_template (문서 템플릿)

#### 2.1 활성 템플릿 목록 조회
```typescript
export async function getDocumentTemplates(filters?: {
  template_type?: string
  category?: string
  is_active?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('document_template')
    .select(`
      *,
      created_by_employee:created_by (name, email)
    `)
    .order('created_at', { ascending: false })

  if (filters?.template_type) query = query.eq('template_type', filters.template_type)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 전체 (활성 템플릿만)

---

#### 2.2 템플릿 상세 with 승인 라인
```typescript
export async function getDocumentTemplateDetail(templateId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_template')
    .select(`
      *,
      approval_lines:document_approval_line(
        id,
        step_order,
        approver_type,
        approver_value,
        is_required,
        can_parallel,
        display_name
      ),
      created_by_employee:created_by (name, email)
    `)
    .eq('id', templateId)
    .single()

  return { data, error }
}
```

**권한**: 전체

---

### 📁 document_submission (문서 제출)

#### 2.3 본인 제출 문서 목록
```typescript
export async function getMyDocumentSubmissions(status?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('document_submission')
    .select(`
      *,
      template:template_id (*),
      reviewer:reviewer_id (name, email)
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS**: 자동 적용

---

#### 2.4 문서 상세 with 승인 인스턴스
```typescript
export async function getDocumentSubmissionDetail(submissionId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_submission')
    .select(`
      *,
      template:template_id (*),
      employee:employee_id (*),
      approval_instances:document_approval_instance(
        id,
        step_order,
        approver:approver_id (id, name, email),
        status,
        comment,
        approved_at,
        rejected_at
      ),
      reviewer:reviewer_id (name, email)
    `)
    .eq('id', submissionId)
    .single()

  return { data, error }
}
```

**권한**: 신청자 또는 승인자

---

### 📁 approval_template (승인선 템플릿)

#### 2.5 본인 승인선 템플릿 목록
```typescript
export async function getMyApprovalTemplates(requestType?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('approval_template')
    .select(`
      *,
      steps:approval_template_step(
        id,
        step_order,
        approver:approver_id (id, name, email, department:department_id(name))
      )
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  if (requestType) query = query.eq('request_type', requestType)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `approval_template_select_own`

---

#### 2.6 기본 승인선 템플릿 조회
```typescript
export async function getDefaultApprovalTemplate(requestType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('approval_template')
    .select(`
      *,
      steps:approval_template_step(
        id,
        step_order,
        approver:approver_id (id, name, email)
      )
    `)
    .eq('employee_id', user.id)
    .eq('request_type', requestType)
    .eq('is_default', true)
    .single()

  return { data, error }
}
```

**권한**: 본인만

---

### 📁 approval_step (승인 단계)

#### 2.7 내가 승인할 항목 조회
```typescript
export async function getMyPendingApprovals(requestType?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('approval_step')
    .select(`
      *,
      requester:employee!employee_id_fkey (id, name, email),
      organization_snapshot:approval_organization_snapshot(*)
    `)
    .eq('approver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (requestType) query = query.eq('request_type', requestType)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 승인자 본인
**RLS 정책**: `approval_step_select_approver`

---

#### 2.8 특정 요청의 승인 단계 조회
```typescript
export async function getApprovalStepsForRequest(
  requestType: string,
  requestId: number
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('approval_step')
    .select(`
      *,
      approver:approver_id (id, name, email, department:department_id(name)),
      organization_snapshot:approval_organization_snapshot(*)
    `)
    .eq('request_type', requestType)
    .eq('request_id', requestId)
    .order('step_order', { ascending: true })

  return { data, error }
}
```

**권한**: 신청자 또는 승인자
**RLS 정책**: `approval_step_select_requester`, `approval_step_select_approver`

---

#### 2.9 승인 변경 이력 조회
```typescript
export async function getApprovalStepAudit(approvalStepId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('approval_step_audit')
    .select(`
      *,
      old_approver:old_approver_id (name, email),
      new_approver:new_approver_id (name, email),
      changed_by_user:changed_by (name, email)
    `)
    .eq('approval_step_id', approvalStepId)
    .order('changed_at', { ascending: false })

  return { data, error }
}
```

**권한**: 전체 (읽기 전용)
**RLS 정책**: `approval_step_audit_select`

---

## 3. 휴가 관리 (Leave Management)

### 📁 annual_leave_grant (연차 부여)

#### 3.1 본인 연차 부여 이력
```typescript
export async function getMyLeaveGrants() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('annual_leave_grant')
    .select(`
      *,
      requester:requester_id (name, email),
      approver:approver_id (name, email)
    `)
    .eq('employee_id', user.id)
    .order('granted_date', { ascending: false })

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `leave_grant_select_own`

---

#### 3.2 전체 연차 부여 현황 (HR 전용)
```typescript
export async function getAllLeaveGrants(filters?: {
  grant_type?: string
  year?: number
  month?: number
}) {
  const supabase = await createClient()

  // HR 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: roleData } = await supabase
    .from('employee')
    .select('role:role_id(level)')
    .eq('id', user.id)
    .single()

  if (!roleData || roleData.role.level < 5) {
    throw new Error('Insufficient permissions')
  }

  let query = supabase
    .from('annual_leave_grant')
    .select(`
      *,
      employee:employee_id (id, name, email, department:department_id(name)),
      requester:requester_id (name),
      approver:approver_id (name)
    `)
    .order('granted_date', { ascending: false })

  if (filters?.grant_type) query = query.eq('grant_type', filters.grant_type)
  if (filters?.year) {
    query = query.gte('granted_date', `${filters.year}-01-01`)
                 .lt('granted_date', `${filters.year + 1}-01-01`)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: HR만 (level >= 5)
**RLS 정책**: `leave_grant_select_hr`

---

### 📁 leave_request (휴가 신청)

#### 3.3 본인 휴가 신청 목록 (기존 구현 ✅)
```typescript
export async function getMyLeaveRequests(status?: string) {
  // 이미 구현됨 - app/actions/leave.ts
}
```

---

#### 3.4 휴가 신청 상세 with 승인 단계
```typescript
export async function getLeaveRequestDetail(requestId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_request')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(name)
      ),
      approval_steps:approval_step!approval_step_request_type_request_id_fkey(
        id,
        step_order,
        approver:approver_id(id, name, email),
        status,
        comment,
        approved_at
      ),
      approver:approver_id (name, email),
      usage:annual_leave_usage(
        used_days,
        used_date,
        grant:grant_id(grant_type, granted_date)
      )
    `)
    .eq('id', requestId)
    .single()

  return { data, error }
}
```

**권한**: 신청자 또는 승인자
**RLS 정책**: `leave_request_select_own`, `leave_request_select_as_approver`

---

#### 3.5 팀/부서 휴가 현황
```typescript
export async function getTeamLeaveStatus(departmentId?: number) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('leave_request')
    .select(`
      id,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(id, name)
      ),
      leave_type,
      start_date,
      end_date,
      requested_days,
      status
    `)
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)

  if (departmentId) {
    query = query.eq('employee.department_id', departmentId)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 리더 이상

---

#### 3.6 전체 휴가 신청 현황 (HR 전용)
```typescript
export async function getAllLeaveRequests(filters?: {
  status?: string
  leave_type?: string
  start_date?: string
  end_date?: string
  department_id?: number
}) {
  const supabase = await createClient()

  // HR 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: roleData } = await supabase
    .from('employee')
    .select('role:role_id(level)')
    .eq('id', user.id)
    .single()

  if (!roleData || roleData.role.level < 5) {
    throw new Error('Insufficient permissions')
  }

  let query = supabase
    .from('leave_request')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(name)
      ),
      approver:approver_id (name)
    `)
    .order('requested_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.leave_type) query = query.eq('leave_type', filters.leave_type)
  if (filters?.start_date) query = query.gte('start_date', filters.start_date)
  if (filters?.end_date) query = query.lte('end_date', filters.end_date)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: HR만 (level >= 5)
**RLS 정책**: `leave_request_select_hr`

---

### 📁 annual_leave_balance (연차 잔액)

#### 3.7 본인 연차 잔액 조회
```typescript
export async function getMyLeaveBalance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('annual_leave_balance')
    .select('*')
    .eq('employee_id', user.id)
    .single()

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `leave_balance_select_own`

---

#### 3.8 전체 연차 잔액 현황 (Manager 이상)
```typescript
export async function getAllLeaveBalances(departmentId?: number) {
  const supabase = await createClient()

  // Manager 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: roleData } = await supabase
    .from('employee')
    .select('role:role_id(level)')
    .eq('id', user.id)
    .single()

  if (!roleData || roleData.role.level < 3) {
    throw new Error('Insufficient permissions')
  }

  let query = supabase
    .from('annual_leave_balance')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(id, name)
      )
    `)
    .order('remaining_days', { ascending: true })

  if (departmentId) {
    query = query.eq('employee.department_id', departmentId)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: Manager 이상 (level >= 3)
**RLS 정책**: `leave_balance_select_hr` (확장 필요)

---

### 📁 annual_leave_usage (연차 사용)

#### 3.9 본인 연차 사용 내역
```typescript
export async function getMyLeaveUsage(filters?: {
  year?: number
  month?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('annual_leave_usage')
    .select(`
      *,
      leave_request:leave_request_id (*),
      grant:grant_id (
        grant_type,
        granted_date,
        expiration_date
      )
    `)
    .eq('leave_request.employee_id', user.id)
    .order('used_date', { ascending: false })

  if (filters?.year) {
    query = query.gte('used_date', `${filters.year}-01-01`)
                 .lt('used_date', `${filters.year + 1}-01-01`)
  }
  if (filters?.month && filters?.year) {
    const monthStr = filters.month.toString().padStart(2, '0')
    query = query.gte('used_date', `${filters.year}-${monthStr}-01`)
                 .lt('used_date', `${filters.year}-${monthStr}-31`)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `leave_usage_select_own`

---

### 📁 leave_of_absence (휴직)

#### 3.10 본인 휴직 신청 목록
```typescript
export async function getMyLeavesOfAbsence() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('leave_of_absence')
    .select(`
      *,
      approver:approver_id (name, email)
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `leave_of_absence_select_own`

---

#### 3.11 전체 휴직 현황 (HR 전용)
```typescript
export async function getAllLeavesOfAbsence(status?: string) {
  const supabase = await createClient()

  // HR 권한 확인 필요
  let query = supabase
    .from('leave_of_absence')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(name)
      ),
      approver:approver_id (name, email)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: HR만 (level >= 5)

---

## 4. 포상 휴가 (Award Leave)

### 📁 attendance_award (근태 포상)

#### 4.1 본인 근태 포상 현황
```typescript
export async function getMyAttendanceAwards() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('attendance_award')
    .select(`
      *,
      leave_grant:leave_grant_id (
        granted_days,
        expiration_date
      ),
      batch_job:batch_job_id (
        job_name,
        started_at,
        completed_at
      )
    `)
    .eq('employee_id', user.id)
    .order('award_period', { ascending: false })

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `attendance_award_select_own`

---

#### 4.2 특정 분기 포상 대상자 조회 (HR)
```typescript
export async function getAttendanceAwardsForPeriod(
  year: number,
  quarter: number
) {
  const supabase = await createClient()

  // HR 권한 확인 필요
  const { data, error } = await supabase
    .from('attendance_award')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(name)
      ),
      leave_grant:leave_grant_id (granted_days, expiration_date)
    `)
    .eq('year', year)
    .eq('quarter', quarter)
    .eq('is_qualified', true)
    .order('actual_days', { ascending: false })

  return { data, error }
}
```

**권한**: HR만 (level >= 5)

---

### 📁 overtime_conversion (초과근무 전환)

#### 4.3 본인 초과근무 전환 내역
```typescript
export async function getMyOvertimeConversions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('overtime_conversion')
    .select(`
      *,
      leave_grant:leave_grant_id (
        granted_days,
        granted_date,
        expiration_date
      )
    `)
    .eq('employee_id', user.id)
    .order('period_end', { ascending: false })

  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `overtime_conversion_select_own`

---

### 📁 batch_job_log (배치 작업 로그)

#### 4.4 배치 작업 로그 조회 (HR/Admin)
```typescript
export async function getBatchJobLogs(filters?: {
  job_type?: string
  status?: string
  limit?: number
}) {
  const supabase = await createClient()

  // HR/Admin 권한 확인 필요
  let query = supabase
    .from('batch_job_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(filters?.limit || 50)

  if (filters?.job_type) query = query.eq('job_type', filters.job_type)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  return { data, error }
}
```

**권한**: HR/Admin만

---

## 5. 알림 (Notification)

### 📁 notification (알림)

#### 5.1 본인 알림 목록 (기존 구현 ✅)
```typescript
export async function getMyNotifications(is_read?: boolean) {
  // 이미 구현됨 - app/actions/notification.ts
}
```

**권한**: 본인만
**RLS 정책**: `notification_select_own`

---

#### 5.2 읽지 않은 알림 개수
```typescript
export async function getUnreadNotificationCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { count, error } = await supabase
    .from('notification')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return { count, error }
}
```

**권한**: 본인만

---

#### 5.3 알림 유형별 조회
```typescript
export async function getNotificationsByType(type: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('notification')
    .select('*')
    .eq('recipient_id', user.id)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(20)

  return { data, error }
}
```

**권한**: 본인만

---

## 6. 출입 관리 (Access Control)

### 📁 visitor (방문자)

#### 6.1 본인이 호스트인 방문자 목록
```typescript
export async function getMyVisitors(filters?: {
  visit_date?: string
  upcoming?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('visitor')
    .select('*')
    .eq('host_employee_id', user.id)
    .order('visit_date', { ascending: false })

  if (filters?.visit_date) {
    query = query.eq('visit_date', filters.visit_date)
  }
  if (filters?.upcoming) {
    const today = new Date().toISOString().split('T')[0]
    query = query.gte('visit_date', today)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**

---

#### 6.2 오늘 방문 예정자 (전체)
```typescript
export async function getTodayVisitors() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('visitor')
    .select(`
      *,
      host:host_employee_id (
        id,
        name,
        email,
        department:department_id(name)
      )
    `)
    .eq('visit_date', today)
    .order('visit_start_time', { ascending: true })

  return { data, error }
}
```

**권한**: 전체 (보안/프론트데스크)

---

### 📁 access_point (출입 지점)

#### 6.3 출입 지점 목록
```typescript
export async function getAccessPoints(is_active?: boolean) {
  const supabase = await createClient()

  let query = supabase
    .from('access_point')
    .select('*')
    .order('location', { ascending: true })

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 전체

---

### 📁 access_credential (출입 인증)

#### 6.4 본인 출입 인증 정보
```typescript
export async function getMyAccessCredentials() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('access_credential')
    .select('*')
    .eq('employee_id', user.id)
    .eq('is_active', true)

  return { data, error }
}
```

**신규 RLS 정책 필요**

---

### 📁 access_log (출입 기록)

#### 6.5 본인 출입 기록
```typescript
export async function getMyAccessLogs(filters?: {
  start_date?: string
  end_date?: string
  limit?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // 먼저 본인의 credential_id 조회
  const { data: credentials } = await supabase
    .from('access_credential')
    .select('id')
    .eq('employee_id', user.id)

  if (!credentials) return { data: null, error: 'No credentials found' }

  const credentialIds = credentials.map(c => c.id)

  let query = supabase
    .from('access_log')
    .select(`
      *,
      access_point:access_point_id (
        point_name,
        location
      )
    `)
    .in('credential_id', credentialIds)
    .order('access_time', { ascending: false })
    .limit(filters?.limit || 100)

  if (filters?.start_date) {
    query = query.gte('access_time', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('access_time', filters.end_date)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**

---

#### 6.6 출입 기록 통계 (보안팀)
```typescript
export async function getAccessLogStatistics(filters?: {
  start_date?: string
  end_date?: string
  access_point_id?: number
}) {
  const supabase = await createClient()

  // 보안팀 권한 확인 필요
  const { data, error } = await supabase
    .rpc('get_access_log_statistics', {
      p_start_date: filters?.start_date,
      p_end_date: filters?.end_date,
      p_access_point_id: filters?.access_point_id
    })

  return { data, error }
}
```

**신규 함수 필요**

---

## 7. 자산 관리 (Asset Management)

### 📁 equipment (장비)

#### 7.1 장비 목록 조회
```typescript
export async function getEquipment(filters?: {
  equipment_type?: string
  status?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('equipment')
    .select('*')
    .order('equipment_name', { ascending: true })

  if (filters?.equipment_type) {
    query = query.eq('equipment_type', filters.equipment_type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.search) {
    query = query.or(`equipment_name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

#### 7.2 장비 상세 조회
```typescript
export async function getEquipmentDetail(equipmentId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      locker:locker!locker_assigned_equipment_id_fkey (
        id,
        locker_number,
        floor,
        area
      )
    `)
    .eq('id', equipmentId)
    .single()

  return { data, error }
}
```

**권한**: 전체

---

### 📁 locker (사물함)

#### 7.3 사물함 목록 조회
```typescript
export async function getLockers(filters?: {
  floor?: number
  usage_type?: string
  is_available?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('locker')
    .select(`
      *,
      assigned_employee:assigned_employee_id (id, name, email),
      assigned_equipment:assigned_equipment_id (equipment_name, serial_number)
    `)
    .order('locker_number', { ascending: true })

  if (filters?.floor) query = query.eq('floor', filters.floor)
  if (filters?.usage_type) query = query.eq('usage_type', filters.usage_type)
  if (filters?.is_available !== undefined) {
    if (filters.is_available) {
      query = query.is('assigned_employee_id', null).is('assigned_equipment_id', null)
    } else {
      query = query.or('assigned_employee_id.not.is.null,assigned_equipment_id.not.is.null')
    }
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

#### 7.4 본인 할당 사물함
```typescript
export async function getMyLocker() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('locker')
    .select('*')
    .eq('assigned_employee_id', user.id)
    .single()

  return { data, error }
}
```

**권한**: 본인만

---

### 📁 locker_access_log (사물함 접근 기록)

#### 7.5 본인 사물함 접근 기록
```typescript
export async function getMyLockerAccessLog(limit: number = 50) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('locker_access_log')
    .select(`
      *,
      locker:locker_id (locker_number, floor, area)
    `)
    .eq('employee_id', user.id)
    .order('access_time', { ascending: false })
    .limit(limit)

  return { data, error }
}
```

**신규 RLS 정책 필요**

---

## 8. 좌석 관리 (Hot Desking)

### 📁 seat (좌석)

#### 8.1 좌석 목록 조회
```typescript
export async function getSeats(filters?: {
  floor?: number
  seat_type?: string
  is_available?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('seat')
    .select('*')
    .order('seat_number', { ascending: true })

  if (filters?.floor) query = query.eq('floor', filters.floor)
  if (filters?.seat_type) query = query.eq('seat_type', filters.seat_type)
  if (filters?.is_available !== undefined) {
    query = query.eq('is_available', filters.is_available)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

#### 8.2 좌석 예약 현황 (특정 날짜)
```typescript
export async function getSeatReservations(date: string, floor?: number) {
  const supabase = await createClient()

  let query = supabase
    .from('seat_reservation')
    .select(`
      *,
      seat:seat_id (*),
      employee:employee_id (id, name, email, department:department_id(name))
    `)
    .eq('reservation_date', date)
    .order('seat_id', { ascending: true })

  if (floor) {
    query = query.eq('seat.floor', floor)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

#### 8.3 본인 좌석 예약 내역
```typescript
export async function getMySeats Reservations(filters?: {
  start_date?: string
  end_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('seat_reservation')
    .select(`
      *,
      seat:seat_id (seat_number, floor, area, seat_type)
    `)
    .eq('employee_id', user.id)
    .order('reservation_date', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('reservation_date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('reservation_date', filters.end_date)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**

---

### 📁 digital_nameplate (디지털 명패)

#### 8.4 디지털 명패 목록
```typescript
export async function getDigitalNameplates() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('digital_nameplate')
    .select(`
      *,
      seat:seat_id (seat_number, floor, area),
      current_employee:current_employee_id (id, name, email)
    `)
    .eq('display_status', 'active')

  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

## 9. 프로젝트 (Project)

### 📁 project (프로젝트)

#### 9.1 프로젝트 목록 조회
```typescript
export async function getProjects(filters?: {
  status?: string
  department_id?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('project')
    .select(`
      *,
      leader:leader_id (id, name, email),
      department:department_id (name),
      members:project_member(
        user:user_id (id, name, email),
        position,
        is_active
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.department_id) query = query.eq('department_id', filters.department_id)

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**: 전체 조회 가능

---

#### 9.2 본인 참여 프로젝트
```typescript
export async function getMyProjects(is_active?: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('project_member')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        start_date,
        end_date,
        status,
        leader:leader_id (name, email),
        department:department_id (name)
      )
    `)
    .eq('user_id', user.id)
    .order('join_date', { ascending: false })

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active)
  }

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**

---

#### 9.3 프로젝트 상세 with 멤버
```typescript
export async function getProjectDetail(projectId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project')
    .select(`
      *,
      leader:leader_id (id, name, email, department:department_id(name)),
      department:department_id (id, name, code),
      members:project_member(
        user:user_id (
          id,
          name,
          email,
          department:department_id(name),
          role:role_id(name)
        ),
        position,
        join_date,
        leave_date,
        is_active
      )
    `)
    .eq('id', projectId)
    .single()

  return { data, error }
}
```

**권한**: 전체

---

## 10. 복지 (Welfare)

### 📁 welfare_request (복지 신청)

#### 10.1 본인 복지 신청 목록
```typescript
export async function getMyWelfareRequests(status?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('welfare_request')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  return { data, error }
}
```

**신규 RLS 정책 필요**

---

#### 10.2 복지 신청 상세 with 승인 내역
```typescript
export async function getWelfareRequestDetail(requestId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('welfare_request')
    .select(`
      *,
      employee:employee_id (id, name, email, department:department_id(name)),
      approvals:welfare_approval(
        id,
        approval_step,
        approver:approver_id (name, email),
        approved_amount,
        status,
        comment,
        approved_at
      )
    `)
    .eq('id', requestId)
    .single()

  return { data, error }
}
```

**권한**: 신청자 또는 승인자

---

#### 10.3 전체 복지 신청 현황 (HR)
```typescript
export async function getAllWelfareRequests(filters?: {
  status?: string
  welfare_type?: string
  year?: number
}) {
  const supabase = await createClient()

  // HR 권한 확인 필요
  let query = supabase
    .from('welfare_request')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id(name)
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.welfare_type) query = query.eq('welfare_type', filters.welfare_type)
  if (filters?.year) {
    query = query.gte('event_date', `${filters.year}-01-01`)
                 .lt('event_date', `${filters.year + 1}-01-01`)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: HR만

---

## 11. 회의실 (Meeting Room)

### 📁 meeting_room (회의실)

#### 11.1 회의실 목록 (기존 구현 ✅)
```typescript
export async function getMeetingRooms() {
  // 이미 구현됨 - app/actions/meeting-room.ts
}
```

---

#### 11.2 회의실 상세 with 오늘 예약 현황
```typescript
export async function getMeetingRoomDetail(roomId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('meeting_room')
    .select(`
      *,
      today_bookings:meeting_room_booking!meeting_room_booking_room_id_fkey(
        id,
        title,
        start_time,
        end_time,
        booked_by:booked_by (name, email),
        status
      )
    `)
    .eq('id', roomId)
    .eq('today_bookings.booking_date', today)
    .single()

  return { data, error }
}
```

**권한**: 전체

---

### 📁 meeting_room_booking (회의실 예약)

#### 11.3 회의실 예약 목록 (기존 구현 ✅)
```typescript
export async function getMeetingRoomBookings(date: string, roomId?: string) {
  // 이미 구현됨 - app/actions/meeting-room.ts
}
```

---

#### 11.4 본인 회의실 예약 내역
```typescript
export async function getMyMeetingRoomBookings(filters?: {
  start_date?: string
  end_date?: string
  status?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('meeting_room_booking')
    .select(`
      *,
      room:room_id (name, code, floor, capacity),
      attendees:meeting_room_booking_attendee(
        employee:employee_id (id, name, email),
        response_status
      )
    `)
    .eq('booked_by', user.id)
    .order('booking_date', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('booking_date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('booking_date', filters.end_date)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: 기존 정책 활용

---

#### 11.5 내가 참석자인 회의 목록
```typescript
export async function getMyMeetingAttendance(filters?: {
  start_date?: string
  end_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('meeting_room_booking_attendee')
    .select(`
      *,
      booking:booking_id (
        id,
        title,
        description,
        booking_date,
        start_time,
        end_time,
        room:room_id (name, code, floor),
        booked_by:booked_by (name, email),
        status
      )
    `)
    .eq('employee_id', user.id)
    .order('booking.booking_date', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('booking.booking_date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('booking.booking_date', filters.end_date)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `attendee_select`

---

#### 11.6 회의실 사용률 통계
```typescript
export async function getMeetingRoomUsageStatistics(filters?: {
  start_date?: string
  end_date?: string
  room_id?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_meeting_room_usage_statistics', {
      p_start_date: filters?.start_date,
      p_end_date: filters?.end_date,
      p_room_id: filters?.room_id
    })

  return { data, error }
}
```

**신규 함수 필요**:
```sql
CREATE OR REPLACE FUNCTION get_meeting_room_usage_statistics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_room_id UUID DEFAULT NULL
)
RETURNS TABLE(
  room_id UUID,
  room_name TEXT,
  total_bookings INTEGER,
  total_hours DECIMAL,
  usage_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.id as room_id,
    mr.name as room_name,
    COUNT(mrb.id)::INTEGER as total_bookings,
    COALESCE(SUM(EXTRACT(EPOCH FROM (mrb.end_time - mrb.start_time)) / 3600), 0)::DECIMAL as total_hours,
    ROUND(
      (COUNT(mrb.id)::DECIMAL /
       NULLIF(COUNT(DISTINCT mrb.booking_date), 0)) * 100,
      2
    ) as usage_rate
  FROM meeting_room mr
  LEFT JOIN meeting_room_booking mrb
    ON mr.id = mrb.room_id
    AND mrb.booking_date BETWEEN p_start_date AND p_end_date
    AND mrb.status = 'confirmed'
  WHERE (p_room_id IS NULL OR mr.id = p_room_id)
    AND mr.is_active = true
  GROUP BY mr.id, mr.name;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 12. 근태 (Attendance)

### 📁 attendance (근태)

#### 12.1 본인 근태 기록 조회
```typescript
export async function getMyAttendance(filters?: {
  start_date?: string
  end_date?: string
  status?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', user.id)
    .order('date', { ascending: false })

  if (filters?.start_date) {
    query = query.gte('date', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('date', filters.end_date)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  return { data, error }
}
```

**권한**: 본인만
**RLS 정책**: `Users can view their own attendance`

---

#### 12.2 본인 근태 통계
```typescript
export async function getMyAttendanceStatistics(year: number, month?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .rpc('get_attendance_statistics', {
      p_employee_id: user.id,
      p_year: year,
      p_month: month
    })

  return { data, error }
}
```

**신규 함수 필요**:
```sql
CREATE OR REPLACE FUNCTION get_attendance_statistics(
  p_employee_id UUID,
  p_year INTEGER,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
  total_days INTEGER,
  present_days INTEGER,
  late_days INTEGER,
  absent_days INTEGER,
  leave_days INTEGER,
  total_late_minutes INTEGER,
  attendance_rate DECIMAL
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  IF p_month IS NULL THEN
    v_start_date := (p_year || '-01-01')::DATE;
    v_end_date := (p_year || '-12-31')::DATE;
  ELSE
    v_start_date := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE;
    v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_days,
    COUNT(*) FILTER (WHERE status = 'present')::INTEGER as present_days,
    COUNT(*) FILTER (WHERE status = 'late')::INTEGER as late_days,
    COUNT(*) FILTER (WHERE status = 'absent')::INTEGER as absent_days,
    COUNT(*) FILTER (WHERE status = 'leave')::INTEGER as leave_days,
    COALESCE(SUM(late_minutes), 0)::INTEGER as total_late_minutes,
    ROUND(
      (COUNT(*) FILTER (WHERE status IN ('present', 'late'))::DECIMAL /
       NULLIF(COUNT(*)::DECIMAL, 0)) * 100,
      2
    ) as attendance_rate
  FROM attendance
  WHERE employee_id = p_employee_id
    AND date BETWEEN v_start_date AND v_end_date;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

#### 12.3 팀/부서 근태 현황 (Manager 이상)
```typescript
export async function getDepartmentAttendance(
  departmentId: number,
  date: string
) {
  const supabase = await createClient()

  // Manager 권한 확인 필요
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: roleData } = await supabase
    .from('employee')
    .select('role:role_id(level)')
    .eq('id', user.id)
    .single()

  if (!roleData || roleData.role.level < 3) {
    throw new Error('Insufficient permissions')
  }

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        email,
        department:department_id (id, name)
      )
    `)
    .eq('employee.department_id', departmentId)
    .eq('date', date)
    .order('status', { ascending: true })
    .order('employee.name', { ascending: true })

  return { data, error }
}
```

**권한**: Manager 이상 (level >= 3)
**RLS 정책**: 기존 정책 활용

---

#### 12.4 오늘 근태 요약 (관리자)
```typescript
export async function getTodayAttendanceSummary() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Manager 권한 확인 필요
  const { data, error } = await supabase
    .rpc('get_today_attendance_summary', {
      p_date: today
    })

  return { data, error }
}
```

**신규 함수 필요**:
```sql
CREATE OR REPLACE FUNCTION get_today_attendance_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_employees INTEGER,
  present_count INTEGER,
  late_count INTEGER,
  absent_count INTEGER,
  leave_count INTEGER,
  by_department JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM employee WHERE status = 'active') as total_employees,
    COUNT(*) FILTER (WHERE a.status = 'present')::INTEGER as present_count,
    COUNT(*) FILTER (WHERE a.status = 'late')::INTEGER as late_count,
    COUNT(*) FILTER (WHERE a.status = 'absent')::INTEGER as absent_count,
    COUNT(*) FILTER (WHERE a.status = 'leave')::INTEGER as leave_count,
    jsonb_agg(
      jsonb_build_object(
        'department_id', d.id,
        'department_name', d.name,
        'present', dept_stats.present_count,
        'late', dept_stats.late_count,
        'absent', dept_stats.absent_count
      )
    ) as by_department
  FROM attendance a
  LEFT JOIN employee e ON e.id = a.employee_id
  LEFT JOIN department d ON d.id = e.department_id
  LEFT JOIN LATERAL (
    SELECT
      e.department_id,
      COUNT(*) FILTER (WHERE a.status = 'present')::INTEGER as present_count,
      COUNT(*) FILTER (WHERE a.status = 'late')::INTEGER as late_count,
      COUNT(*) FILTER (WHERE a.status = 'absent')::INTEGER as absent_count
    FROM attendance a
    JOIN employee e ON e.id = a.employee_id
    WHERE a.date = p_date
    GROUP BY e.department_id
  ) dept_stats ON dept_stats.department_id = d.id
  WHERE a.date = p_date;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 구현 우선순위

### 🔥 Phase 1: 핵심 기능 (1주)
**관리자 대시보드 필수 API**

1. ✅ **employee**: `getEmployees()`, `getEmployeeDetail()` (부분 구현)
2. ✅ **department**: `getDepartments()`, `getDepartmentTree()` (구현 완료)
3. ✅ **leave_request**: `getMyLeaveRequests()`, `getLeaveRequestDetail()` (구현 완료)
4. ✅ **annual_leave_balance**: `getMyLeaveBalance()` (구현 완료)
5. ✅ **approval_step**: `getMyPendingApprovals()` (구현 완료)
6. ✅ **notification**: `getMyNotifications()` (구현 완료)
7. ⚠️ **attendance**: `getMyAttendance()`, `getDepartmentAttendance()` (신규)
8. ⚠️ **meeting_room**: `getMeetingRooms()` (부분 구현)
9. ⚠️ **seat_reservation**: `getSeatReservations()` (신규)

### 🚀 Phase 2: 사용자 기능 (2주)
**일반 사용자용 READ API**

10. ⚠️ **approval_template**: `getMyApprovalTemplates()`, `getDefaultApprovalTemplate()`
11. ⚠️ **document_template**: `getDocumentTemplates()`, `getDocumentTemplateDetail()`
12. ⚠️ **document_submission**: `getMyDocumentSubmissions()`, `getDocumentSubmissionDetail()`
13. ⚠️ **annual_leave_grant**: `getMyLeaveGrants()`
14. ⚠️ **annual_leave_usage**: `getMyLeaveUsage()`
15. ⚠️ **attendance_award**: `getMyAttendanceAwards()`
16. ⚠️ **overtime_conversion**: `getMyOvertimeConversions()`
17. ⚠️ **welfare_request**: `getMyWelfareRequests()`, `getWelfareRequestDetail()`
18. ⚠️ **visitor**: `getMyVisitors()`, `getTodayVisitors()`
19. ⚠️ **access_log**: `getMyAccessLogs()`
20. ⚠️ **locker**: `getMyLocker()`, `getMyLockerAccessLog()`
21. ⚠️ **project**: `getMyProjects()`, `getProjectDetail()`
22. ⚠️ **meeting_room_booking**: `getMyMeetingRoomBookings()`, `getMyMeetingAttendance()`

### 📊 Phase 3: 관리자 기능 (2주)
**Manager/HR 전용 API**

23. ⚠️ **leave_request**: `getAllLeaveRequests()` (HR)
24. ⚠️ **annual_leave_grant**: `getAllLeaveGrants()` (HR)
25. ⚠️ **annual_leave_balance**: `getAllLeaveBalances()` (Manager)
26. ⚠️ **attendance**: `getTodayAttendanceSummary()` (Manager)
27. ⚠️ **attendance_award**: `getAttendanceAwardsForPeriod()` (HR)
28. ⚠️ **welfare_request**: `getAllWelfareRequests()` (HR)
29. ⚠️ **employee**: `getEmployeeStatsByDepartment()` (Manager)
30. ⚠️ **batch_job_log**: `getBatchJobLogs()` (Admin)
31. ⚠️ **invited_employees**: `getInvitedEmployees()` (Manager)

### 🔧 Phase 4: 시스템 기능 (1주)
**통계 및 시스템 API**

32. ⚠️ **meeting_room_booking**: `getMeetingRoomUsageStatistics()`
33. ⚠️ **access_log**: `getAccessLogStatistics()`
34. ⚠️ **attendance**: `getMyAttendanceStatistics()`
35. ⚠️ **department_history**: `getDepartmentHistory()`
36. ⚠️ **employee_department_history**: 구현 필요
37. ⚠️ **approval_step_audit**: `getApprovalStepAudit()`
38. ⚠️ **role_permission**: `getRolePermissions()`

---

## 총 구현 필요 API 수

### 테이블별 API 개수
- **employee**: 4개 API
- **department**: 3개 API
- **role**: 2개 API
- **invited_employees**: 1개 API
- **document_template**: 2개 API
- **document_submission**: 2개 API
- **approval_template**: 2개 API
- **approval_step**: 4개 API
- **approval_step_audit**: 1개 API
- **leave_request**: 5개 API
- **annual_leave_grant**: 3개 API
- **annual_leave_balance**: 2개 API
- **annual_leave_usage**: 1개 API
- **leave_of_absence**: 2개 API
- **attendance_award**: 2개 API
- **overtime_conversion**: 1개 API
- **batch_job_log**: 1개 API
- **notification**: 3개 API
- **visitor**: 2개 API
- **access_point**: 1개 API
- **access_credential**: 1개 API
- **access_log**: 2개 API
- **equipment**: 2개 API
- **locker**: 3개 API
- **locker_access_log**: 1개 API
- **seat**: 1개 API
- **seat_reservation**: 2개 API
- **digital_nameplate**: 1개 API
- **project**: 3개 API
- **welfare_request**: 3개 API
- **meeting_room**: 2개 API
- **meeting_room_booking**: 4개 API
- **attendance**: 4개 API

### 총계
- ✅ **기존 구현**: ~15개
- ⚠️ **신규 구현 필요**: ~70개
- **총 READ API**: ~85개

---

## 추가 고려사항

### 1. RLS 정책 추가 필요
현재 RLS가 없는 테이블:
- `visitor`
- `access_credential`
- `access_log`
- `equipment`
- `locker`
- `locker_access_log`
- `seat`
- `seat_reservation`
- `digital_nameplate`
- `project`
- `project_member`
- `welfare_request`
- `welfare_approval`

### 2. Database Function 추가 필요
통계 및 집계 함수:
- `get_employee_stats_by_department()`
- `get_meeting_room_usage_statistics()`
- `get_access_log_statistics()`
- `get_attendance_statistics()`
- `get_today_attendance_summary()`

### 3. 성능 최적화
- 적절한 인덱스 추가
- 복잡한 쿼리는 Materialized View 고려
- 통계성 데이터는 캐싱 전략 수립

---

**문서 작성**: Claude Code
**최종 업데이트**: 2024-12-04
