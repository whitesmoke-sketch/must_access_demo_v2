# PHASE-1 TEST SPECIFICATION

**Phase:** Phase 1 - 사용자 대시보드
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
사용자 대시보드의 모든 위젯이 정확한 데이터를 표시하고 정상적으로 동작하는지 검증합니다.

### Test Scope
- 근무 상태 카드
- 연차 요약 카드
- 퀵 액션 버튼
- 예약 현황
- 결재 현황
- 반응형 그리드 레이아웃

### Test Environment
- **Browser:** Chrome, Safari, Firefox
- **Devices:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Database:** Supabase (Test Environment with sample data)

---

## 🧪 Test Cases

### TC-1.1: 근무 상태 카드 렌더링 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- 사용자가 로그인되어 있음
- attendance 테이블에 오늘 날짜 데이터 존재

**Test Steps:**
1. `/dashboard` 페이지 접근
2. 근무 상태 카드 확인
3. 출근 시간 표시 확인
4. 누적 근무 시간 확인
5. 상태 뱃지 확인

**Expected Results:**
- 근무 상태 카드가 렌더링됨
- 출근 시간: `09:00` (예시)
- 누적 근무 시간: `4시간` (실시간 계산)
- 상태 뱃지: 출근/퇴근/자리비움/재택 중 하나

**Test Data:**
```typescript
const attendanceData = {
  employee_id: 'test-user-1',
  date: '2025-01-18',
  status: 'checked_in',
  start_time: '2025-01-18T09:00:00Z',
  end_time: null,
  is_late: false,
  is_early_leave: false
}
```

---

### TC-1.2: 연차 요약 카드 데이터 정확성 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- annual_leave_balance 테이블에 현재 연도 데이터 존재

**Test Steps:**
1. `/dashboard` 페이지 접근
2. 연차 요약 카드 확인
3. 잔여 연차 표시 확인
4. 잔여 포상휴가 표시 확인
5. 총 연차 부여일 확인

**Expected Results:**
- 잔여 연차: 15일 (실제 DB 값)
- 잔여 포상휴가: 3일 (실제 DB 값)
- 총 연차 부여일: 20일
- "연차신청" 버튼 표시

**Test Data:**
```typescript
const leaveBalance = {
  employee_id: 'test-user-1',
  year: 2025,
  total_days: 20,
  used_days: 5,
  remaining_days: 15,
  reward_leave_balance: 3
}
```

---

### TC-1.3: 퀵 액션 버튼 테스트

**Priority:** P1 (High)

**Test Steps:**
1. `/dashboard` 페이지 접근
2. 퀵 액션 카드 확인
3. 각 버튼 클릭 테스트
   - 회의실 예약 버튼
   - 좌석 등록 버튼
   - 결재 문서 버튼

**Expected Results:**
- 3개의 퀵 액션 버튼 표시
- 각 버튼 클릭 시 해당 페이지로 이동
- Hover 시 배경색 변경

---

### TC-1.4: 나의 예약 현황 테스트

**Priority:** P1 (High)

**Pre-conditions:**
- seat_reservation 테이블에 오늘 날짜 예약 존재

**Test Steps:**
1. `/dashboard` 페이지 접근
2. 나의 예약 현황 카드 확인
3. 좌석 정보 확인
   - 좌석 이름
   - 위치
   - 시작 시간
   - 종료 시간

**Expected Results:**
- 예약이 있을 경우: 좌석 정보 표시
- 예약이 없을 경우: "오늘 예약 없음" 메시지 표시

**Test Data:**
```typescript
const seatReservation = {
  employee_id: 'test-user-1',
  seat_id: 'seat-001',
  reservation_date: '2025-01-18',
  start_time: '09:00',
  end_time: '18:00',
  status: 'active',
  seat: {
    name: 'A-101',
    location: '3층 개발실'
  }
}
```

---

### TC-1.5: 결재 현황 카드 테스트 (직원)

**Priority:** P1 (High)

**Pre-conditions:**
- leave_request 테이블에 신청 내역 존재

**Test Steps:**
1. 직원 계정으로 로그인
2. `/dashboard` 페이지 접근
3. 결재 현황 카드 확인
4. "내가 요청한 문서" 섹션 확인

**Expected Results:**
- 최근 3건의 연차 신청 표시
- 각 신청 항목에 다음 정보 표시:
  - 휴가 타입 (연차/반차/포상휴가)
  - 시작일 ~ 종료일
  - 상태 뱃지 (대기/승인/반려)
- 신청 내역이 없을 경우: "신청 내역이 없습니다"

---

### TC-1.6: 결재 현황 카드 테스트 (관리자)

**Priority:** P1 (High)

**Pre-conditions:**
- 관리자 계정으로 로그인
- leave_request 테이블에 pending 상태 신청 존재

**Test Steps:**
1. 관리자 계정으로 로그인
2. `/dashboard` 페이지 접근
3. 결재 현황 카드 확인
4. "결재 대기 문서" 섹션 추가 표시 확인

**Expected Results:**
- "내가 요청한 문서" 섹션 표시
- "결재 대기 문서" 섹션 추가 표시
- 각 섹션에 최대 3건씩 표시

---

### TC-1.7: 반응형 그리드 레이아웃 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Desktop (1920x1080)에서 대시보드 접근
2. 그리드 레이아웃 확인 (3열)
3. Tablet (768x1024)로 변경
4. 그리드 레이아웃 확인 (2열)
5. Mobile (375x667)로 변경
6. 그리드 레이아웃 확인 (1열)

**Expected Results:**
- Desktop: 3열 그리드 (근무 상태, 연차 요약, 퀵 액션)
- Tablet: 2열 그리드
- Mobile: 1열 스택
- 모든 카드가 정렬되어 표시

---

### TC-1.8: 로딩 상태 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 네트워크 속도를 "Slow 3G"로 설정
2. `/dashboard` 페이지 접근
3. 로딩 중 UI 확인

**Expected Results:**
- 로딩 스켈레톤 또는 스피너 표시
- 데이터 로드 완료 후 실제 콘텐츠로 교체
- 로딩 중 레이아웃 시프트 최소화

---

### TC-1.9: 에러 상태 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 네트워크 연결 끊기 (Offline 모드)
2. `/dashboard` 페이지 접근
3. 에러 메시지 확인
4. 재시도 버튼 클릭

**Expected Results:**
- 에러 메시지 표시
- 재시도 버튼 제공
- 재시도 시 데이터 다시 로드

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-1.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 1: User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee
    await page.goto('/login')
    await page.fill('input[type="email"]', 'employee@must.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('TC-1.1: Work status card renders correctly', async ({ page }) => {
    // Check if work status card is visible
    await expect(page.locator('text=근무 상태')).toBeVisible()

    // Check status badge
    await expect(page.locator('[class*="badge"]').first()).toBeVisible()

    // Check work hours
    const workHours = await page.textContent('text=누적 근무 시간')
    expect(workHours).toBeTruthy()
  })

  test('TC-1.2: Leave balance card shows accurate data', async ({ page }) => {
    // Check leave balance card
    await expect(page.locator('text=연차 요약')).toBeVisible()

    // Check remaining days
    const remainingDays = await page.textContent('text=잔여 연차')
    expect(remainingDays).toContain('일')

    // Check reward leave
    const rewardLeave = await page.textContent('text=잔여 포상휴가')
    expect(rewardLeave).toContain('일')

    // Check apply button
    await expect(page.locator('text=연차신청')).toBeVisible()
  })

  test('TC-1.3: Quick action buttons work', async ({ page }) => {
    // Check quick actions card
    await expect(page.locator('text=퀵 액션')).toBeVisible()

    // Count action buttons
    const buttons = await page.locator('[class*="p-3 rounded-lg hover:bg-muted"]')
    const count = await buttons.count()
    expect(count).toBe(3)

    // Click first action
    await buttons.first().click()
    // Verify navigation (depends on implementation)
  })

  test('TC-1.4: Reservation status displays correctly', async ({ page }) => {
    const reservationCard = page.locator('text=나의 예약 현황')
    await expect(reservationCard).toBeVisible()

    // Check if reservation exists or shows empty state
    const hasReservation = await page.locator('text=오늘 예약 없음').isVisible()

    if (!hasReservation) {
      // Verify reservation details
      await expect(page.locator('[class*="seat-reservation"]')).toBeVisible()
    }
  })

  test('TC-1.7: Responsive grid layout', async ({ page }) => {
    // Desktop: 3 columns
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Tablet: 2 columns
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    // Mobile: 1 column
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Verify all cards are still visible
    await expect(page.locator('text=근무 상태')).toBeVisible()
    await expect(page.locator('text=연차 요약')).toBeVisible()
    await expect(page.locator('text=퀵 액션')).toBeVisible()
  })
})
```

---

### Jest Unit Test

```typescript
// __tests__/unit/phase-1/dashboard.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import { createClient } from '@/lib/supabase/server'
import DashboardPage from '@/app/(authenticated)/dashboard/page'

jest.mock('@/lib/supabase/server')

describe('Dashboard Page', () => {
  const mockUser = {
    id: 'test-user-1',
    email: 'test@must.com'
  }

  const mockEmployee = {
    id: 'test-user-1',
    name: '홍길동',
    department: { name: '개발팀' }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    ;(createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockEmployee,
        error: null
      })
    })
  })

  it('should render greeting message', async () => {
    const page = await DashboardPage()
    render(page)

    await waitFor(() => {
      expect(screen.getByText(/안녕하세요 홍길동님/)).toBeInTheDocument()
    })
  })

  it('should render all dashboard widgets', async () => {
    const page = await DashboardPage()
    render(page)

    await waitFor(() => {
      expect(screen.getByText('근무 상태')).toBeInTheDocument()
      expect(screen.getByText('연차 요약')).toBeInTheDocument()
      expect(screen.getByText('퀵 액션')).toBeInTheDocument()
    })
  })
})
```

---

### Supabase Query Test

```typescript
// __tests__/integration/phase-1/queries.test.ts
import { createClient } from '@/lib/supabase/server'

describe('Dashboard Supabase Queries', () => {
  const supabase = createClient()
  const testUserId = 'test-user-1'

  it('should fetch employee profile', async () => {
    const { data, error } = await supabase
      .from('employee')
      .select('id, name, department:department_id(name)')
      .eq('id', testUserId)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.name).toBeTruthy()
  })

  it('should fetch leave balance', async () => {
    const currentYear = new Date().getFullYear()

    const { data, error } = await supabase
      .from('annual_leave_balance')
      .select('*')
      .eq('employee_id', testUserId)
      .eq('year', currentYear)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.total_days).toBeGreaterThan(0)
  })

  it('should fetch today attendance', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', testUserId)
      .eq('date', today)
      .single()

    // May be null if no attendance today
    expect(error).toBeNull()
  })

  it('should fetch seat reservations', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('seat_reservation')
      .select('*, seat:seat_id(name, location)')
      .eq('employee_id', testUserId)
      .eq('reservation_date', today)
      .eq('status', 'active')

    expect(error).toBeNull()
    // data can be empty array
  })
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-1.1: 근무 상태 카드 렌더링
- [ ] TC-1.2: 연차 요약 카드 데이터 정확성

### Should Pass (P1)
- [ ] TC-1.3: 퀵 액션 버튼 동작
- [ ] TC-1.4: 예약 현황 표시
- [ ] TC-1.5: 결재 현황 (직원)
- [ ] TC-1.6: 결재 현황 (관리자)
- [ ] TC-1.7: 반응형 그리드 레이아웃

### Nice to Pass (P2)
- [ ] TC-1.8: 로딩 상태
- [ ] TC-1.9: 에러 상태

### Performance
- [ ] 대시보드 로딩 시간: < 2초
- [ ] 모든 위젯 렌더링: < 3초
- [ ] Lighthouse Score: ≥ 90

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 1

-- 1. Employee
INSERT INTO employee (id, name, email, department_id, role_id, status)
VALUES ('test-user-1', '홍길동', 'employee@must.com', 'dept-1', 'role-employee', 'active');

-- 2. Attendance (today)
INSERT INTO attendance (employee_id, date, status, start_time, is_late)
VALUES ('test-user-1', CURRENT_DATE, 'checked_in', '2025-01-18T09:00:00Z', false);

-- 3. Leave balance
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES ('test-user-1', 2025, 20, 5, 15, 3);

-- 4. Seat reservation
INSERT INTO seat_reservation (employee_id, seat_id, reservation_date, start_time, end_time, status)
VALUES ('test-user-1', 'seat-001', CURRENT_DATE, '09:00', '18:00', 'active');

-- 5. Leave requests
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, days_count, reason, status)
VALUES
  ('test-user-1', 'annual', '2025-01-20', '2025-01-21', 2, '개인 사유', 'pending'),
  ('test-user-1', 'half_day', '2025-01-15', '2025-01-15', 0.5, '병원 방문', 'approved'),
  ('test-user-1', 'reward', '2025-01-10', '2025-01-10', 1, '포상휴가', 'approved');
```

---

**Phase 1 Test 완료 후 Phase 2 Test 진행**
