# PHASE-2 TEST SPECIFICATION

**Phase:** Phase 2 - 관리자 대시보드
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest + Recharts
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
관리자 대시보드의 차트, 통계, 승인 대기 목록이 정확하게 표시되고 동작하는지 검증합니다.

### Test Scope
- 근태 현황 위젯 (Stacked Bar Chart)
- 좌석 사용 현황 위젯 (Pie Chart)
- 승인 대기 목록
- 이상 상황 알림
- 관리자 권한 확인

---

## 🧪 Test Cases

### TC-2.1: 관리자 권한 확인 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 일반 직원 계정으로 로그인
2. `/admin/dashboard` 직접 접근 시도
3. 관리자 계정으로 로그인
4. `/admin/dashboard` 접근

**Expected Results:**
- 일반 직원: `/dashboard`로 리다이렉트
- 관리자: 정상 접근, 대시보드 표시

---

### TC-2.2: 근태 현황 차트 렌더링 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 관리자로 로그인
2. `/admin/dashboard` 접근
3. 근태 현황 위젯 확인
4. 오늘 근태 준수율 확인
5. 지각/조퇴/결근 지표 확인
6. 트렌드 차트 확인

**Expected Results:**
- 근태 준수율: 80% (예시, 실제 계산 값)
- 지각/조퇴/결근 건수 표시
- Stacked Bar Chart 렌더링
- 최근 7일 데이터 표시

**Test Data:**
```typescript
const attendanceData = [
  { date: '2025-01-12', 정상: 45, 지각: 3, 결근: 2 },
  { date: '2025-01-13', 정상: 48, 지각: 1, 결근: 1 },
  { date: '2025-01-14', 정상: 47, 지각: 2, 결근: 1 },
  // ... 7일 데이터
]
```

---

### TC-2.3: 좌석 사용 현황 차트 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 좌석 사용 현황 위젯 확인
2. 점유율 확인
3. Pie Chart 렌더링 확인
4. 범례 확인 (사용중/사용가능/점검중)
5. 사용 중인 좌석 목록 확인

**Expected Results:**
- 점유율: 65% (예시)
- Pie Chart 3개 섹션 표시
- 사용 중인 좌석 최대 5개 표시
- 각 좌석에 담당자 이름 표시

---

### TC-2.4: 승인 대기 목록 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 승인 대기 목록 위젯 확인
2. 대기 중인 연차 신청 표시 확인
3. 승인 버튼 클릭
4. 반려 버튼 클릭

**Expected Results:**
- 최대 5건의 대기 항목 표시
- 각 항목: 이름, 휴가 타입, 기간, 신청일
- 승인 버튼: 녹색 배경
- 반려 버튼: 빨간색 테두리
- 대기 항목 없을 경우: "모든 승인 완료" 메시지

---

### TC-2.5: 이상 상황 알림 테스트

**Priority:** P1 (High)

**Test Steps:**
1. 이상 상황 알림 위젯 확인
2. 알림 항목 확인
   - 미출근 체크
   - 승인 대기
   - 점검 중인 좌석

**Expected Results:**
- 이상 상황이 있을 경우: 목록 표시
- 각 알림: 심각도 색상, 카테고리, 시간
- 이상 상황 없을 경우: "이상 상황이 없습니다"

---

### TC-2.6: 차트 필터 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 근태 현황 차트의 기간 필터 확인
2. "최근 7일" 선택
3. "최근 14일" 선택
4. "최근 30일" 선택
5. 차트 데이터 변경 확인

**Expected Results:**
- 필터 선택 시 차트 데이터 업데이트
- X축 레이블 변경
- 데이터 포인트 개수 변경

---

### TC-2.7: 승인/반려 액션 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 승인 대기 목록에서 항목 선택
2. 승인 버튼 클릭
3. Toast 알림 확인
4. 목록에서 해당 항목 제거 확인
5. 다른 항목 선택
6. 반려 버튼 클릭
7. 반려 사유 입력
8. 확인

**Expected Results:**
- 승인 성공: "승인되었습니다" toast
- 목록 자동 갱신
- 반려 시: 사유 입력 필수
- 반려 성공: "반려되었습니다" toast

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-2.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 2: Admin Dashboard', () => {
  test('TC-2.1: Non-admin cannot access admin dashboard', async ({ page }) => {
    // Login as employee
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Try to access admin dashboard
    await page.goto('/admin/dashboard')
    await page.waitForURL('/dashboard')

    // Should redirect to employee dashboard
    expect(page.url()).toContain('/dashboard')
    expect(page.url()).not.toContain('/admin')
  })

  test('TC-2.2: Admin can access and see attendance chart', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // Check attendance widget
    await expect(page.locator('text=근태 현황')).toBeVisible()
    await expect(page.locator('text=오늘 근태 준수율')).toBeVisible()

    // Check metrics
    await expect(page.locator('text=지각')).toBeVisible()
    await expect(page.locator('text=조퇴')).toBeVisible()
    await expect(page.locator('text=결근')).toBeVisible()

    // Check chart exists (Recharts)
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
  })

  test('TC-2.3: Seat usage chart displays correctly', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // Check seat usage widget
    await expect(page.locator('text=좌석 사용 현황')).toBeVisible()
    await expect(page.locator('text=좌석 점유율')).toBeVisible()

    // Check pie chart
    const pieChart = page.locator('.recharts-pie')
    await expect(pieChart).toBeVisible()

    // Check legend
    await expect(page.locator('text=사용중')).toBeVisible()
    await expect(page.locator('text=사용가능')).toBeVisible()
    await expect(page.locator('text=점검중')).toBeVisible()
  })

  test('TC-2.4: Approval queue displays pending requests', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // Check approval queue
    await expect(page.locator('text=승인 대기 목록')).toBeVisible()

    // Check if there are pending requests or empty state
    const emptyState = await page.locator('text=모든 승인 완료').isVisible()

    if (!emptyState) {
      // Check approval buttons
      await expect(page.locator('button:has-text("승인")')).toBeVisible()
      await expect(page.locator('button:has-text("반려")')).toBeVisible()
    }
  })

  test('TC-2.7: Approve leave request', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // Find first approval button
    const approveButton = page.locator('button:has-text("승인")').first()
    const isVisible = await approveButton.isVisible()

    if (isVisible) {
      await approveButton.click()

      // Wait for toast notification
      await expect(page.locator('text=승인되었습니다')).toBeVisible()

      // Wait for list to refresh
      await page.waitForTimeout(1000)
    }
  })
})
```

---

### Jest Integration Test

```typescript
// __tests__/integration/phase-2/queries.test.ts
import { createClient } from '@/lib/supabase/server'

describe('Admin Dashboard Queries', () => {
  const supabase = createClient()

  it('should fetch attendance summary', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error, count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('date', today)

    expect(error).toBeNull()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('should fetch attendance trend', async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select('date, status, is_late')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true })

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should fetch seat statistics', async () => {
    const { data, error } = await supabase
      .from('seat')
      .select('*, seat_reservation(*)')

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should fetch pending leave requests', async () => {
    const { data, error } = await supabase
      .from('leave_request')
      .select('*, employee:employee_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-2.1: 관리자 권한 확인
- [ ] TC-2.2: 근태 현황 차트 렌더링
- [ ] TC-2.3: 좌석 사용 현황 차트
- [ ] TC-2.7: 승인/반려 액션

### Should Pass (P1)
- [ ] TC-2.4: 승인 대기 목록
- [ ] TC-2.5: 이상 상황 알림

### Nice to Pass (P2)
- [ ] TC-2.6: 차트 필터

### Performance
- [ ] 차트 렌더링: < 1초
- [ ] 대시보드 로딩: < 3초

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 2

-- 1. Attendance data (last 7 days)
INSERT INTO attendance (employee_id, date, status, start_time, is_late)
VALUES
  ('emp-1', CURRENT_DATE - INTERVAL '6 days', 'checked_in', '09:00:00', false),
  ('emp-2', CURRENT_DATE - INTERVAL '6 days', 'checked_in', '09:15:00', true),
  ('emp-3', CURRENT_DATE - INTERVAL '6 days', 'checked_in', '09:00:00', false);
  -- Continue for 7 days...

-- 2. Seats
INSERT INTO seat (id, name, location, status)
VALUES
  ('seat-1', 'A-101', '3층', 'available'),
  ('seat-2', 'A-102', '3층', 'available'),
  ('seat-3', 'B-201', '4층', 'maintenance');

-- 3. Pending leave requests
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, status)
VALUES
  ('emp-1', 'annual', '2025-01-25', '2025-01-26', 'pending'),
  ('emp-2', 'half_day', '2025-01-24', '2025-01-24', 'pending');
```

---

**Phase 2 Test 완료 후 Phase 3 Test 진행**
