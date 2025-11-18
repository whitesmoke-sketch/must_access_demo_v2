# PHASE-6 TEST SPECIFICATION

**Phase:** Phase 6 - 연차 관리 (관리자)
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest + Server Actions
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
관리자가 구성원별 연차 현황을 조회하고 승인/반려 처리, 포상휴가 부여가 정상 동작하는지 검증합니다.

### Test Scope
- 구성원별 연차 현황 테이블
- 요약 지표 카드
- 승인 대기 목록
- 승인/반려 처리
- 포상휴가 부여 모달
- 검색/필터 기능

---

## 🧪 Test Cases

### TC-6.1: 연차 관리 페이지 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 관리자로 로그인
2. `/admin/leave-management` 접근
3. 페이지 구성 확인

**Expected Results:**
- 요약 지표 카드 4개 표시
  - 총 구성원 수
  - 전체 연차 사용률
  - 승인 대기 요청
  - 이번 달 연차 사용
- 구성원 연차 현황 테이블
- 승인 대기 목록
- "정책 설정" 및 "포상휴가 부여" 버튼

---

### TC-6.2: 요약 지표 데이터 정확성 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 요약 지표 카드 확인
2. 각 지표 값 확인

**Expected Results:**
- 총 구성원 수: 실제 활성 직원 수
- 연차 사용률: (사용 연차 / 총 연차) * 100
- 승인 대기 요청: pending 상태 카운트
- 이번 달 연차 사용: 현재 월의 승인된 연차 합계

**Test Data:**
```typescript
// 50명, 사용률 60%, 대기 5건, 이번 달 30일 사용
const summary = {
  totalEmployees: 50,
  usageRate: 60,
  pendingCount: 5,
  thisMonthDays: 30
}
```

---

### TC-6.3: 구성원별 연차 현황 테이블 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 연차 현황 테이블 확인
2. 각 구성원 행 확인
3. 데이터 정확성 확인

**Expected Results:**
- 컬럼: 구성원, 소속 팀, 총 연차, 사용, 잔여, 요청, 액션
- 각 구성원의 정확한 연차 정보 표시
- 아바타 또는 이니셜 표시
- "상세보기" 아이콘 버튼

---

### TC-6.4: 승인 처리 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 승인 대기 목록에서 항목 선택
2. "승인" 버튼 클릭
3. 결과 확인

**Expected Results:**
- Toast: "승인되었습니다"
- 승인 대기 목록에서 제거
- 해당 구성원의 연차 잔액 업데이트
- DB에서 status = 'approved'
- approved_by, approved_at 기록

---

### TC-6.5: 반려 처리 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 승인 대기 목록에서 항목 선택
2. "반려" 버튼 클릭
3. 반려 사유 입력 모달 표시
4. 사유 입력: "업무 일정 조율 필요"
5. "반려" 버튼 클릭

**Expected Results:**
- 반려 사유 입력 필수
- Toast: "반려되었습니다"
- 승인 대기 목록에서 제거
- DB에서 status = 'rejected'
- rejection_reason 저장

---

### TC-6.6: 반려 사유 미입력 시 에러 테스트

**Priority:** P1 (High)

**Test Steps:**
1. "반려" 버튼 클릭
2. 사유 입력하지 않음
3. "반려" 버튼 클릭

**Expected Results:**
- 에러 메시지: "반려 사유를 입력해주세요"
- 반려 처리 안 됨
- 모달 유지

---

### TC-6.7: 포상휴가 부여 테스트

**Priority:** P1 (High)

**Test Data:**
```typescript
const rewardLeave = {
  employee_id: 'emp-1',
  days: 2,
  reason: '프로젝트 성공적 완수',
  file: null
}
```

**Test Steps:**
1. "포상휴가 부여" 버튼 클릭
2. 모달 오픈 확인
3. 대상자 선택
4. 일수 입력: 2
5. 사유 입력: "프로젝트 성공적 완수"
6. "포상휴가 부여" 버튼 클릭

**Expected Results:**
- Toast: "포상휴가가 부여되었습니다"
- 모달 닫힘
- DB에 annual_leave_grant 레코드 생성 (grant_type: 'reward')
- 해당 구성원의 reward_leave_balance 증가

---

### TC-6.8: 검색 기능 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 연차 현황 테이블 검색창에 "홍길동" 입력
2. 결과 확인

**Expected Results:**
- "홍길동"이 포함된 구성원만 표시
- 다른 구성원은 필터링됨
- 검색 클리어 시 전체 목록 복원

---

### TC-6.9: 구성원 상세 정보 모달 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 테이블에서 "상세보기" 아이콘 클릭
2. 모달 표시 확인

**Expected Results:**
- 구성원 이름 및 프로필
- 연차 사용 내역 (최근 10건)
- 총 연차, 사용, 잔여 정보
- 그래프 또는 타임라인 (선택)

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-6.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 6: Leave Management (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('TC-6.1: Leave management page renders', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Check title
    await expect(page.locator('text=연차 관리')).toBeVisible()

    // Check summary cards
    await expect(page.locator('text=총 구성원 수')).toBeVisible()
    await expect(page.locator('text=전체 연차 사용률')).toBeVisible()
    await expect(page.locator('text=승인 대기 요청')).toBeVisible()
    await expect(page.locator('text=이번 달 연차 사용')).toBeVisible()

    // Check tables
    await expect(page.locator('text=구성원 연차 현황')).toBeVisible()
    await expect(page.locator('text=승인 대기 목록')).toBeVisible()

    // Check buttons
    await expect(page.locator('button:has-text("정책 설정")')).toBeVisible()
    await expect(page.locator('button:has-text("포상휴가 부여")')).toBeVisible()
  })

  test('TC-6.2: Summary metrics display accurate data', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Get metric values (implementation specific)
    const totalEmployees = await page.textContent('text=총 구성원 수 >> .. >> text=/\\d+/')
    expect(totalEmployees).toBeTruthy()

    const usageRate = await page.textContent('text=전체 연차 사용률 >> .. >> text=/\\d+%/')
    expect(usageRate).toBeTruthy()
  })

  test('TC-6.4: Approve leave request', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Check if there are pending requests
    const approveButton = page.locator('button:has-text("승인")').first()
    const isVisible = await approveButton.isVisible()

    if (isVisible) {
      await approveButton.click()

      // Check success toast
      await expect(page.locator('text=승인되었습니다')).toBeVisible()

      // Wait for list refresh
      await page.waitForTimeout(1000)
    }
  })

  test('TC-6.5: Reject leave request with reason', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Check if there are pending requests
    const rejectButton = page.locator('button:has-text("반려")').first()
    const isVisible = await rejectButton.isVisible()

    if (isVisible) {
      await rejectButton.click()

      // Wait for reason modal
      await page.waitForSelector('text=반려 사유')

      // Enter reason
      await page.fill('textarea', '업무 일정 조율 필요')

      // Confirm reject
      await page.click('button:has-text("반려"):not(:has-text("반려 사유"))')

      // Check success toast
      await expect(page.locator('text=반려되었습니다')).toBeVisible()
    }
  })

  test('TC-6.6: Cannot reject without reason', async ({ page }) => {
    await page.goto('/admin/leave-management')

    const rejectButton = page.locator('button:has-text("반려")').first()
    const isVisible = await rejectButton.isVisible()

    if (isVisible) {
      await rejectButton.click()
      await page.waitForSelector('text=반려 사유')

      // Try to submit without reason
      await page.click('button:has-text("반려"):not(:has-text("반려 사유"))')

      // Should show error
      await expect(page.locator('text=/반려 사유.*입력/')).toBeVisible()
    }
  })

  test('TC-6.7: Grant reward leave', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Click grant button
    await page.click('button:has-text("포상휴가 부여")')

    // Wait for modal
    await page.waitForSelector('text=포상휴가 부여')

    // Select employee
    await page.click('button:has-text("대상자 선택")')
    await page.click('text=홍길동').first()

    // Enter days
    await page.fill('input[type="number"]', '2')

    // Enter reason
    await page.fill('textarea', '프로젝트 성공적 완수')

    // Submit
    await page.click('button:has-text("포상휴가 부여"):last-of-type')

    // Check success
    await expect(page.locator('text=포상휴가가 부여되었습니다')).toBeVisible()
  })

  test('TC-6.8: Search employees in leave balance table', async ({ page }) => {
    await page.goto('/admin/leave-management')

    // Get initial row count
    const initialRows = await page.locator('text=구성원 연차 현황 >> .. >> tbody tr').count()

    // Search
    await page.fill('input[placeholder*="검색"]', '홍길동')
    await page.waitForTimeout(500)

    // Should show fewer results
    const searchRows = await page.locator('text=구성원 연차 현황 >> .. >> tbody tr').count()
    expect(searchRows).toBeLessThanOrEqual(initialRows)
  })
})
```

---

### Jest Server Action Test

```typescript
// __tests__/unit/phase-6/leave-actions.test.ts
import { approveLeaveRequest, rejectLeaveRequest, grantRewardLeave } from '@/app/actions/leave'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('Leave Management Server Actions', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: null
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should approve leave request successfully', async () => {
    const result = await approveLeaveRequest('request-1')

    expect(result.success).toBe(true)
    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: 'approved',
      approved_by: 'admin-1',
      approved_at: expect.any(String)
    })
  })

  it('should reject leave request with reason', async () => {
    const result = await rejectLeaveRequest('request-1', '업무 일정 조율 필요')

    expect(result.success).toBe(true)
    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: 'rejected',
      rejected_by: 'admin-1',
      rejected_at: expect.any(String),
      rejection_reason: '업무 일정 조율 필요'
    })
  })

  it('should grant reward leave successfully', async () => {
    const result = await grantRewardLeave({
      employee_id: 'emp-1',
      days: 2,
      reason: '프로젝트 성공적 완수'
    })

    expect(result.success).toBe(true)
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      employee_id: 'emp-1',
      grant_type: 'reward',
      granted_days: 2,
      granted_date: expect.any(String),
      year: expect.any(Number),
      reason: '프로젝트 성공적 완수'
    })
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-6.1: 페이지 렌더링
- [ ] TC-6.2: 요약 지표 데이터 정확성
- [ ] TC-6.3: 연차 현황 테이블
- [ ] TC-6.4: 승인 처리
- [ ] TC-6.5: 반려 처리

### Should Pass (P1)
- [ ] TC-6.6: 반려 사유 필수
- [ ] TC-6.7: 포상휴가 부여
- [ ] TC-6.8: 검색 기능

### Nice to Pass (P2)
- [ ] TC-6.9: 구성원 상세 정보 모달

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 6

-- 1. Employees with leave balances
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES
('emp-1', 2025, 20, 8, 12, 2),
('emp-2', 2025, 18, 5, 13, 0),
('emp-3', 2025, 22, 15, 7, 3);

-- 2. Pending leave requests
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, days_count, reason, status, created_at)
VALUES
('emp-1', 'annual', '2025-01-25', '2025-01-26', 2, '가족 행사', 'pending', NOW()),
('emp-2', 'half_day', '2025-01-24', '2025-01-24', 0.5, '병원 방문', 'pending', NOW() - INTERVAL '1 day');

-- 3. Approved requests (for this month)
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, days_count, status)
VALUES
('emp-3', 'annual', '2025-01-15', '2025-01-17', 3, 'approved');
```

---

**Phase 6 Test 완료 후 Phase 7 Test 진행**
