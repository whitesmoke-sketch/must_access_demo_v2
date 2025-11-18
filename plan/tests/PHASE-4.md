# PHASE-4 TEST SPECIFICATION

**Phase:** Phase 4 - 연차 신청
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest + Server Actions
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
직원이 연차/반차/포상휴가를 신청하고, 잔여 연차 확인 및 에러 처리가 정상 동작하는지 검증합니다.

### Test Scope
- 날짜 선택 (시작일, 종료일)
- 휴가 타입 선택
- 사유 입력
- 잔여 연차 실시간 표시
- 신청 Server Action
- 에러 처리

---

## 🧪 Test Cases

### TC-4.1: 연차 신청 폼 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. `/leave/request` 페이지 접근
2. 폼 필드 확인
   - 휴가 타입 선택
   - 시작일 선택
   - 종료일 선택
   - 사유 입력
3. 잔여 연차 정보 표시 확인

**Expected Results:**
- 모든 필드 렌더링
- 필수 필드 표시 (*)
- 잔여 연차/포상휴가 표시
- "취소" 및 "신청하기" 버튼 표시

---

### TC-4.2: 연차 신청 성공 테스트

**Priority:** P0 (Critical)

**Test Data:**
```typescript
const requestData = {
  leave_type: 'annual',
  start_date: '2025-01-25',
  end_date: '2025-01-26',
  days_count: 2,
  reason: '가족 행사'
}
```

**Test Steps:**
1. 휴가 타입: "연차" 선택
2. 시작일: 2025-01-25 선택
3. 종료일: 2025-01-26 선택
4. 사유 입력: "가족 행사"
5. "신청하기" 버튼 클릭

**Expected Results:**
- 신청 일수 자동 계산: "2일"
- 신청 성공 toast: "연차 신청이 완료되었습니다"
- `/leave/my-leave` 페이지로 리다이렉트
- DB에 신청 기록 생성 (status: 'pending')

---

### TC-4.3: 잔여 연차 부족 시 에러 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- 잔여 연차: 5일

**Test Steps:**
1. 휴가 타입: "연차" 선택
2. 시작일: 2025-01-25 선택
3. 종료일: 2025-01-31 선택 (7일)
4. 사유 입력
5. "신청하기" 버튼 클릭

**Expected Results:**
- 에러 메시지 표시: "잔여 연차가 부족합니다. 현재 잔여 연차: 5일"
- 신청 버튼 비활성화
- 페이지 이동 없음

---

### TC-4.4: 반차 신청 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 휴가 타입: "반차" 선택
2. 시작일: 2025-01-25 선택
3. 종료일: 2025-01-25 선택 (같은 날)
4. 사유 입력: "병원 방문"
5. "신청하기" 버튼 클릭

**Expected Results:**
- 신청 일수: "1일" 표시
- 신청 성공
- 반차는 0.5일로 계산됨

---

### TC-4.5: 포상휴가 신청 테스트

**Priority:** P1 (High)

**Pre-conditions:**
- 잔여 포상휴가: 3일

**Test Steps:**
1. 휴가 타입: "포상휴가" 선택
2. 날짜 선택
3. 사유 입력
4. 신청

**Expected Results:**
- 포상휴가 잔액에서 차감
- 일반 연차 잔액 영향 없음

---

### TC-4.6: 날짜 선택 유효성 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 시작일: 2025-01-25 선택
2. 종료일: 2025-01-24 선택 (시작일보다 이전)

**Expected Results:**
- 종료일은 시작일 이후만 선택 가능
- 이전 날짜 비활성화

---

### TC-4.7: 필수 필드 유효성 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 휴가 타입 선택 안 함
2. "신청하기" 버튼 클릭

**Expected Results:**
- Toast 에러: "모든 필드를 입력해주세요"
- 신청 처리 안 됨

---

### TC-4.8: 취소 버튼 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 폼 일부 입력
2. "취소" 버튼 클릭

**Expected Results:**
- 이전 페이지로 이동
- 입력 데이터 저장 안 됨

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-4.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 4: Leave Request', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('TC-4.1: Leave request form renders', async ({ page }) => {
    await page.goto('/leave/request')

    // Check all form fields
    await expect(page.locator('text=휴가 타입')).toBeVisible()
    await expect(page.locator('text=시작일')).toBeVisible()
    await expect(page.locator('text=종료일')).toBeVisible()
    await expect(page.locator('text=사유')).toBeVisible()

    // Check remaining leave info
    await expect(page.locator('text=잔여 연차')).toBeVisible()
    await expect(page.locator('text=잔여 포상휴가')).toBeVisible()

    // Check buttons
    await expect(page.locator('button:has-text("취소")')).toBeVisible()
    await expect(page.locator('button:has-text("신청하기")')).toBeVisible()
  })

  test('TC-4.2: Submit annual leave successfully', async ({ page }) => {
    await page.goto('/leave/request')

    // Select leave type
    await page.click('button:has-text("휴가 타입을 선택하세요")')
    await page.click('text=연차')

    // Select start date
    await page.click('button:has-text("날짜를 선택하세요")').first()
    await page.waitForTimeout(500)
    // Click a date (implementation specific)
    await page.click('[role="gridcell"]:has-text("25")').first()

    // Select end date
    await page.click('button:has-text("날짜를 선택하세요")').last()
    await page.waitForTimeout(500)
    await page.click('[role="gridcell"]:has-text("26")').first()

    // Enter reason
    await page.fill('textarea', '가족 행사')

    // Submit
    await page.click('button:has-text("신청하기")')

    // Check success
    await expect(page.locator('text=연차 신청이 완료되었습니다')).toBeVisible()
    await page.waitForURL('/leave/my-leave')
  })

  test('TC-4.3: Show error when insufficient leave', async ({ page }) => {
    await page.goto('/leave/request')

    // Select annual leave
    await page.click('button:has-text("휴가 타입을 선택하세요")')
    await page.click('text=연차')

    // Select dates that exceed remaining leave
    // (Implementation specific - select many days)

    // Should show error message
    await expect(page.locator('text=/잔여 연차가 부족합니다/')).toBeVisible()

    // Submit button should be disabled
    const submitButton = page.locator('button:has-text("신청하기")')
    await expect(submitButton).toBeDisabled()
  })

  test('TC-4.7: Validate required fields', async ({ page }) => {
    await page.goto('/leave/request')

    // Try to submit without filling anything
    await page.click('button:has-text("신청하기")')

    // Should show error toast
    await expect(page.locator('text=모든 필드를 입력해주세요')).toBeVisible()

    // Should stay on same page
    expect(page.url()).toContain('/leave/request')
  })

  test('TC-4.8: Cancel button works', async ({ page }) => {
    await page.goto('/leave/request')

    // Fill some data
    await page.fill('textarea', 'Test reason')

    // Click cancel
    await page.click('button:has-text("취소")')

    // Should go back
    await page.waitForURL(/\/(dashboard|leave\/my-leave)/)
  })
})
```

---

### Jest Server Action Test

```typescript
// __tests__/unit/phase-4/actions.test.ts
import { submitLeaveRequest } from '@/app/actions/leave'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('submitLeaveRequest Server Action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should submit leave request successfully', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          remaining_days: 15,
          reward_leave_balance: 3
        },
        error: null
      }),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: { id: 'new-request-1' },
        error: null
      })
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const result = await submitLeaveRequest({
      employee_id: 'test-user-1',
      leave_type: 'annual',
      start_date: '2025-01-25',
      end_date: '2025-01-26',
      days_count: 2,
      reason: '가족 행사',
      status: 'pending'
    })

    expect(result.success).toBe(true)
  })

  it('should fail when insufficient leave', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          remaining_days: 1,
          reward_leave_balance: 0
        },
        error: null
      })
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const result = await submitLeaveRequest({
      employee_id: 'test-user-1',
      leave_type: 'annual',
      start_date: '2025-01-25',
      end_date: '2025-01-31',
      days_count: 7,
      reason: 'Test',
      status: 'pending'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('잔여 연차가 부족합니다')
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-4.1: 폼 렌더링
- [ ] TC-4.2: 연차 신청 성공
- [ ] TC-4.3: 잔여 연차 부족 에러

### Should Pass (P1)
- [ ] TC-4.4: 반차 신청
- [ ] TC-4.5: 포상휴가 신청
- [ ] TC-4.6: 날짜 선택 유효성
- [ ] TC-4.7: 필수 필드 유효성

### Nice to Pass (P2)
- [ ] TC-4.8: 취소 버튼

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 4

-- 1. Employee with leave balance
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES ('test-user-1', 2025, 20, 10, 10, 3);

-- Verify no pending requests
DELETE FROM leave_request WHERE employee_id = 'test-user-1' AND status = 'pending';
```

---

**Phase 4 Test 완료 후 Phase 5 Test 진행**
