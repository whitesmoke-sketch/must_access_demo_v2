# PHASE-5 TEST SPECIFICATION

**Phase:** Phase 5 - 조직구성원 관리
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest + Server Actions
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
관리자가 구성원 정보를 CRUD(생성, 조회, 수정, 삭제)할 수 있고, 검색 및 필터 기능이 정상 동작하는지 검증합니다.

### Test Scope
- 구성원 목록 테이블
- 구성원 추가 모달
- 구성원 수정 모달
- 구성원 삭제 (Soft Delete)
- 검색 기능
- 필터 기능

---

## 🧪 Test Cases

### TC-5.1: 구성원 목록 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 관리자로 로그인
2. `/admin/employees` 접근
3. 테이블 렌더링 확인
4. 테이블 컬럼 확인

**Expected Results:**
- 테이블 정상 렌더링
- 컬럼: 이름, 이메일, 부서, 팀, 직급, 역할, 입사일, 잔여 연차, 포상휴가, 작업
- 모든 활성 구성원 표시
- "구성원 추가" 버튼 표시

---

### TC-5.2: 구성원 추가 성공 테스트

**Priority:** P0 (Critical)

**Test Data:**
```typescript
const newEmployee = {
  name: '김철수',
  email: 'kim@must.com',
  department_id: 'dept-dev',
  team: '백엔드팀',
  position: '선임연구원',
  role_id: 'role-employee',
  join_date: '2025-01-20',
  annual_leave_days: 15,
  used_days: 0,
  reward_leave: 0
}
```

**Test Steps:**
1. "구성원 추가" 버튼 클릭
2. 모달 오픈 확인
3. 모든 필드 입력
4. "추가" 버튼 클릭

**Expected Results:**
- 모달 닫힘
- Toast: "구성원이 추가되었습니다"
- 테이블에 새 구성원 표시
- DB에 employee 레코드 생성
- DB에 annual_leave_balance 레코드 생성

---

### TC-5.3: 구성원 수정 성공 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 테이블에서 구성원 선택
2. 수정 버튼 (연필 아이콘) 클릭
3. 모달에서 정보 수정
   - 팀: "프론트엔드팀" → "백엔드팀"
   - 직급: "주임" → "선임"
4. "수정" 버튼 클릭

**Expected Results:**
- 모달 닫힘
- Toast: "구성원 정보가 수정되었습니다"
- 테이블에서 변경사항 반영
- DB 업데이트 확인

---

### TC-5.4: 구성원 삭제 (Soft Delete) 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 테이블에서 구성원 선택
2. 삭제 버튼 (휴지통 아이콘) 클릭
3. 확인 다이얼로그 표시 확인
4. "삭제" 버튼 클릭

**Expected Results:**
- 다이얼로그 닫힘
- Toast: "구성원이 삭제되었습니다"
- 테이블에서 해당 구성원 제거
- DB에서 status = 'inactive'로 업데이트 (Hard Delete 아님)

---

### TC-5.5: 검색 기능 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 검색창에 "홍길동" 입력
2. 결과 확인
3. 검색창에 "개발" 입력
4. 결과 확인

**Expected Results:**
- "홍길동" 검색: 이름이 "홍길동"인 구성원만 표시
- "개발" 검색: 부서 또는 팀에 "개발"이 포함된 구성원 표시
- 검색어 클리어 시 전체 목록 복원

---

### TC-5.6: 필수 필드 유효성 테스트

**Priority:** P1 (High)

**Test Steps:**
1. "구성원 추가" 버튼 클릭
2. 이름만 입력 (이메일 미입력)
3. "추가" 버튼 클릭

**Expected Results:**
- Form validation 에러
- 필수 필드 하이라이트
- "추가" 버튼 비활성화 또는 에러 메시지

---

### TC-5.7: 이메일 중복 체크 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 이미 존재하는 이메일로 구성원 추가 시도

**Expected Results:**
- Toast: "이미 존재하는 이메일입니다" (또는 DB 에러)
- 구성원 추가 안 됨

---

### TC-5.8: 연차 일수 자동 계산 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 구성원 추가 모달에서
2. 연차 일수: 20 입력
3. 사용한 연차: 5 입력

**Expected Results:**
- 잔여 연차 자동 계산: 15일
- DB에 정확한 값 저장

---

### TC-5.9: 역할별 배지 표시 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 테이블에서 역할 컬럼 확인
2. 각 역할에 따른 배지 확인

**Expected Results:**
- 최고관리자: 보라색 배지
- 관리자: 파란색 배지
- 구성원: 회색 배지

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-5.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 5: Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('TC-5.1: Employee list renders', async ({ page }) => {
    await page.goto('/admin/employees')

    // Check page title
    await expect(page.locator('text=조직구성원 관리')).toBeVisible()

    // Check add button
    await expect(page.locator('button:has-text("구성원 추가")')).toBeVisible()

    // Check table headers
    await expect(page.locator('th:has-text("이름")')).toBeVisible()
    await expect(page.locator('th:has-text("이메일")')).toBeVisible()
    await expect(page.locator('th:has-text("부서")')).toBeVisible()
  })

  test('TC-5.2: Add employee successfully', async ({ page }) => {
    await page.goto('/admin/employees')

    // Click add button
    await page.click('button:has-text("구성원 추가")')

    // Wait for modal
    await page.waitForSelector('text=구성원 추가')

    // Fill form
    await page.fill('input[name="name"]', '김철수')
    await page.fill('input[name="email"]', `test-${Date.now()}@must.com`)
    await page.fill('input[name="department"]', '개발')
    await page.fill('input[name="team"]', '백엔드팀')
    await page.fill('input[name="position"]', '선임연구원')

    // Select role
    await page.click('button:has-text("역할 선택")')
    await page.click('text=구성원')

    // Submit
    await page.click('button:has-text("추가")')

    // Check success
    await expect(page.locator('text=구성원이 추가되었습니다')).toBeVisible()

    // Verify in table
    await page.waitForTimeout(1000)
    await expect(page.locator('td:has-text("김철수")')).toBeVisible()
  })

  test('TC-5.3: Update employee successfully', async ({ page }) => {
    await page.goto('/admin/employees')

    // Click first edit button
    const editButton = page.locator('button[title="수정"]').first()
    await editButton.click()

    // Wait for modal
    await page.waitForSelector('text=구성원 수정')

    // Update team
    await page.fill('input[name="team"]', '프론트엔드팀')

    // Submit
    await page.click('button:has-text("수정")')

    // Check success
    await expect(page.locator('text=구성원 정보가 수정되었습니다')).toBeVisible()
  })

  test('TC-5.4: Delete employee (soft delete)', async ({ page }) => {
    await page.goto('/admin/employees')

    // Get employee count before delete
    const rowsBefore = await page.locator('tbody tr').count()

    // Click first delete button
    const deleteButton = page.locator('button[title="삭제"]').first()
    await deleteButton.click()

    // Wait for confirmation dialog
    await page.waitForSelector('text=구성원 삭제')

    // Confirm delete
    await page.click('button:has-text("삭제")')

    // Check success
    await expect(page.locator('text=구성원이 삭제되었습니다')).toBeVisible()

    // Verify row count decreased
    await page.waitForTimeout(1000)
    const rowsAfter = await page.locator('tbody tr').count()
    expect(rowsAfter).toBe(rowsBefore - 1)
  })

  test('TC-5.5: Search employees', async ({ page }) => {
    await page.goto('/admin/employees')

    // Get initial row count
    const initialRows = await page.locator('tbody tr').count()

    // Search by name
    await page.fill('input[placeholder*="검색"]', '홍길동')
    await page.waitForTimeout(500)

    // Should show fewer results
    const searchRows = await page.locator('tbody tr').count()
    expect(searchRows).toBeLessThanOrEqual(initialRows)

    // Clear search
    await page.fill('input[placeholder*="검색"]', '')
    await page.waitForTimeout(500)

    // Should show all results again
    const finalRows = await page.locator('tbody tr').count()
    expect(finalRows).toBe(initialRows)
  })
})
```

---

### Jest Server Action Test

```typescript
// __tests__/unit/phase-5/employee-actions.test.ts
import { createEmployee, updateEmployee, deleteEmployee } from '@/app/actions/employee'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('Employee Server Actions', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should create employee successfully', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { id: 'new-emp-1', name: '김철수' },
      error: null
    })

    const result = await createEmployee({
      name: '김철수',
      email: 'kim@must.com',
      department_id: 'dept-1',
      team: '백엔드팀',
      position: '선임',
      role_id: 'role-1',
      join_date: '2025-01-20',
      annual_leave_days: 15,
      used_days: 0,
      reward_leave: 0
    })

    expect(result.success).toBe(true)
    expect(mockSupabase.insert).toHaveBeenCalled()
  })

  it('should update employee successfully', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: null
    })

    const result = await updateEmployee('emp-1', {
      team: '프론트엔드팀'
    })

    expect(result.success).toBe(true)
    expect(mockSupabase.update).toHaveBeenCalled()
  })

  it('should soft delete employee', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: null
    })

    const result = await deleteEmployee('emp-1')

    expect(result.success).toBe(true)
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'inactive' })
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-5.1: 구성원 목록 렌더링
- [ ] TC-5.2: 구성원 추가 성공
- [ ] TC-5.3: 구성원 수정 성공
- [ ] TC-5.4: 구성원 삭제 (Soft)

### Should Pass (P1)
- [ ] TC-5.5: 검색 기능
- [ ] TC-5.6: 필수 필드 유효성
- [ ] TC-5.7: 이메일 중복 체크

### Nice to Pass (P2)
- [ ] TC-5.8: 연차 일수 자동 계산
- [ ] TC-5.9: 역할별 배지 표시

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 5

-- 1. Departments
INSERT INTO department (id, name) VALUES
('dept-dev', '개발팀'),
('dept-hr', '인사팀');

-- 2. Roles
INSERT INTO role (id, name, code) VALUES
('role-employee', '구성원', 'employee'),
('role-admin', '관리자', 'admin');

-- 3. Sample employees
INSERT INTO employee (id, name, email, department_id, team, position, role_id, join_date, status)
VALUES
('emp-1', '홍길동', 'hong@must.com', 'dept-dev', '백엔드팀', '선임', 'role-employee', '2020-01-01', 'active'),
('emp-2', '김영희', 'kim@must.com', 'dept-dev', '프론트엔드팀', '주임', 'role-employee', '2021-06-01', 'active'),
('emp-3', '이철수', 'lee@must.com', 'dept-hr', 'HR팀', '과장', 'role-admin', '2019-03-15', 'active');

-- 4. Leave balances
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES
('emp-1', 2025, 20, 5, 15, 2),
('emp-2', 2025, 18, 3, 15, 0),
('emp-3', 2025, 22, 10, 12, 3);
```

---

**Phase 5 Test 완료 후 Phase 6 Test 진행**
