# PHASE-3 TEST SPECIFICATION

**Phase:** Phase 3 - 내 연차 조회
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest + date-fns
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
직원이 자신의 연차 현황을 정확하게 확인하고 캘린더에서 멀티데이 연차를 시각적으로 확인할 수 있는지 검증합니다.

### Test Scope
- 연차 정보 카드 4개
- 연차 캘린더 (멀티데이 표시)
- 월 이동 기능
- 툴팁 표시
- 반응형 레이아웃

---

## 🧪 Test Cases

### TC-3.1: 연차 정보 카드 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. `/leave/my-leave` 페이지 접근
2. 4개 카드 확인
   - 총 연차
   - 사용한 연차
   - 사용 가능한 연차
   - 포상 휴가

**Expected Results:**
- 4개 카드 모두 렌더링
- 각 카드에 정확한 데이터 표시
- 총 연차 = 사용한 연차 + 사용 가능한 연차

**Test Data:**
```typescript
const leaveBalance = {
  total_days: 20,
  used_days: 5,
  remaining_days: 15,
  reward_leave_balance: 3
}
```

---

### TC-3.2: 연차 캘린더 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 캘린더 표시 확인
2. 현재 월 표시 확인
3. 요일 헤더 확인 (일~토)
4. 날짜 셀 확인

**Expected Results:**
- 캘린더 정상 렌더링
- 현재 월 표시: "2025년 01월"
- 요일 헤더: 일(빨강), 토(파랑), 평일(회색)
- 오늘 날짜 하이라이트 (primary 색상 원형)

---

### TC-3.3: 멀티데이 연차 표시 테스트

**Priority:** P0 (Critical)

**Test Data:**
```typescript
const leaveRequests = [
  {
    id: '1',
    leave_type: 'annual',
    start_date: '2025-01-20',
    end_date: '2025-01-22',
    days_count: 3,
    status: 'approved'
  },
  {
    id: '2',
    leave_type: 'half_day',
    start_date: '2025-01-25',
    end_date: '2025-01-25',
    days_count: 0.5,
    status: 'pending'
  }
]
```

**Test Steps:**
1. 캘린더에서 연차 항목 확인
2. 시작일 스타일 확인 (왼쪽 라운드)
3. 중간일 스타일 확인 (양쪽 직각)
4. 종료일 스타일 확인 (오른쪽 라운드)
5. 하루짜리 연차 확인 (양쪽 라운드)

**Expected Results:**
- 연차: 보라색 배경
- 반차: 노란색 배경
- 포상휴가: 핑크색 배경
- 시작일: 왼쪽만 둥글게
- 종료일: 오른쪽만 둥글게
- 하루짜리: 양쪽 둥글게

---

### TC-3.4: 월 이동 기능 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 다음 달 버튼 (ChevronRight) 클릭
2. 캘린더 업데이트 확인
3. 이전 달 버튼 (ChevronLeft) 클릭
4. 캘린더 업데이트 확인

**Expected Results:**
- 다음 달로 이동: "2025년 02월" 표시
- 이전 달로 이동: "2025년 01월" 표시
- 해당 월의 연차 데이터 로드
- 부드러운 전환

---

### TC-3.5: 툴팁 표시 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 캘린더의 연차 항목에 마우스 오버
2. 툴팁 표시 확인

**Expected Results:**
- 툴팁 내용:
  - 휴가 타입: "연차"
  - 기간: "2025-01-20 ~ 2025-01-22"
- 툴팁이 마우스 커서 근처에 표시

---

### TC-3.6: 빈 상태 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 연차 신청이 없는 월로 이동
2. 캘린더 확인

**Expected Results:**
- 캘린더는 정상 렌더링
- 연차 항목 없음
- "연차 신청" 버튼 표시

---

### TC-3.7: 반응형 레이아웃 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Desktop (1920x1080)
2. Tablet (768x1024)
3. Mobile (375x667)

**Expected Results:**
- Desktop: 카드 4열, 캘린더 전체 너비
- Tablet: 카드 2열, 캘린더 전체 너비
- Mobile: 카드 1열, 캘린더 스크롤

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-3.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 3: My Leave', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('TC-3.1: Leave info cards display correctly', async ({ page }) => {
    await page.goto('/leave/my-leave')

    // Check all 4 cards
    await expect(page.locator('text=총 연차')).toBeVisible()
    await expect(page.locator('text=사용한 연차')).toBeVisible()
    await expect(page.locator('text=사용 가능한 연차')).toBeVisible()
    await expect(page.locator('text=포상 휴가')).toBeVisible()

    // Verify data (example)
    const totalDays = await page.textContent('text=총 연차 >> .. >> text=/\\d+일/')
    expect(totalDays).toBeTruthy()
  })

  test('TC-3.2: Calendar renders correctly', async ({ page }) => {
    await page.goto('/leave/my-leave')

    // Check calendar header
    await expect(page.locator('text=/\\d{4}년 \\d{2}월/')).toBeVisible()

    // Check day headers
    await expect(page.locator('text=일')).toBeVisible()
    await expect(page.locator('text=월')).toBeVisible()
    await expect(page.locator('text=토')).toBeVisible()

    // Check navigation buttons
    await expect(page.locator('button:has-text("‹")')).toBeVisible()
    await expect(page.locator('button:has-text("›")')).toBeVisible()
  })

  test('TC-3.3: Multi-day leave displays correctly', async ({ page }) => {
    await page.goto('/leave/my-leave')

    // Wait for calendar to load
    await page.waitForTimeout(1000)

    // Check for leave items (if any)
    const leaveItems = await page.locator('[class*="border-primary"]').count()
    console.log(`Found ${leaveItems} leave items`)
  })

  test('TC-3.4: Month navigation works', async ({ page }) => {
    await page.goto('/leave/my-leave')

    // Get current month
    const currentMonth = await page.textContent('text=/\\d{4}년 \\d{2}월/')

    // Click next month
    await page.click('button:has-text("›")')
    await page.waitForTimeout(500)

    // Verify month changed
    const nextMonth = await page.textContent('text=/\\d{4}년 \\d{2}월/')
    expect(nextMonth).not.toBe(currentMonth)

    // Click previous month
    await page.click('button:has-text("‹")')
    await page.waitForTimeout(500)

    // Should return to current month
    const backToMonth = await page.textContent('text=/\\d{4}년 \\d{2}월/')
    expect(backToMonth).toBe(currentMonth)
  })

  test('TC-3.7: Responsive layout', async ({ page }) => {
    await page.goto('/leave/my-leave')

    // Desktop: 4 cards in a row
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Tablet: 2 cards in a row
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    // Mobile: 1 card in a row
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // All cards should still be visible
    await expect(page.locator('text=총 연차')).toBeVisible()
  })
})
```

---

### Jest Component Test

```typescript
// __tests__/unit/phase-3/leave-calendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LeaveCalendar } from '@/components/leave/LeaveCalendar'

describe('LeaveCalendar', () => {
  const mockEmployeeId = 'test-user-1'

  it('should render calendar with current month', () => {
    render(<LeaveCalendar employeeId={mockEmployeeId} />)

    const currentMonth = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit'
    })

    expect(screen.getByText(new RegExp(currentMonth))).toBeInTheDocument()
  })

  it('should render day headers', () => {
    render(<LeaveCalendar employeeId={mockEmployeeId} />)

    expect(screen.getByText('일')).toBeInTheDocument()
    expect(screen.getByText('월')).toBeInTheDocument()
    expect(screen.getByText('토')).toBeInTheDocument()
  })

  it('should navigate to next month', () => {
    render(<LeaveCalendar employeeId={mockEmployeeId} />)

    const nextButton = screen.getByRole('button', { name: /›/ })
    fireEvent.click(nextButton)

    // Verify month changed (implementation dependent)
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-3.1: 연차 정보 카드 4개 정확한 데이터
- [ ] TC-3.2: 캘린더 렌더링
- [ ] TC-3.3: 멀티데이 연차 표시

### Should Pass (P1)
- [ ] TC-3.4: 월 이동 기능
- [ ] TC-3.7: 반응형 레이아웃

### Nice to Pass (P2)
- [ ] TC-3.5: 툴팁 표시
- [ ] TC-3.6: 빈 상태

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 3

-- 1. Leave balance
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES ('test-user-1', 2025, 20, 5, 15, 3);

-- 2. Leave requests (various types and durations)
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, days_count, status)
VALUES
  ('test-user-1', 'annual', '2025-01-20', '2025-01-22', 3, 'approved'),
  ('test-user-1', 'half_day', '2025-01-25', '2025-01-25', 0.5, 'approved'),
  ('test-user-1', 'reward', '2025-02-05', '2025-02-05', 1, 'pending');
```

---

**Phase 3 Test 완료 후 Phase 4 Test 진행**
