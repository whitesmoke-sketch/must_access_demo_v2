# PHASE-0 TEST SPECIFICATION

**Phase:** Phase 0 - 인증 및 디자인 시스템
**생성일:** 2025-01-18
**테스트 환경:** Next.js 15 + Supabase + Playwright/Jest
**아키텍처:** Option A (Next.js Server Components + Supabase)

---

## 📋 Test Overview

### Test Goal
사용자 인증 시스템과 디자인 시스템이 정상적으로 동작하는지 검증합니다.

### Test Scope
- 이메일/비밀번호 로그인
- Google OAuth 로그인
- Protected Route 미들웨어
- 역할별 리다이렉트
- 디자인 토큰 적용
- 반응형 레이아웃

### Test Environment
- **Browser:** Chrome, Safari, Firefox
- **Devices:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Database:** Supabase (Test Environment)

---

## 🧪 Test Cases

### TC-0.1: 이메일 로그인 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- 테스트 계정이 Supabase에 등록되어 있음
- 로그인 페이지 접근 가능

**Test Steps:**
1. `/login` 페이지로 이동
2. 이메일 입력: `test@must.com`
3. 비밀번호 입력: `password123`
4. "로그인" 버튼 클릭

**Expected Results:**
- 로그인 성공 toast 표시
- employee 역할: `/dashboard`로 리다이렉트
- admin 역할: `/admin/dashboard`로 리다이렉트
- 헤더에 사용자 이름 표시

**Test Data:**
```typescript
const testUsers = [
  {
    email: 'employee@must.com',
    password: 'test1234',
    role: 'employee',
    expectedRedirect: '/dashboard'
  },
  {
    email: 'admin@must.com',
    password: 'test1234',
    role: 'admin',
    expectedRedirect: '/admin/dashboard'
  }
]
```

---

### TC-0.2: 로그인 실패 테스트

**Priority:** P1 (High)

**Test Steps:**
1. `/login` 페이지로 이동
2. 잘못된 이메일 입력: `wrong@must.com`
3. 비밀번호 입력: `wrongpassword`
4. "로그인" 버튼 클릭

**Expected Results:**
- 에러 메시지 표시: "로그인에 실패했습니다"
- 로그인 페이지에 유지
- 입력 필드 초기화되지 않음

---

### TC-0.3: Google OAuth 로그인 테스트

**Priority:** P1 (High)

**Pre-conditions:**
- Google OAuth Provider가 Supabase에 설정되어 있음

**Test Steps:**
1. `/login` 페이지로 이동
2. "Google로 로그인" 버튼 클릭
3. Google 로그인 팝업에서 계정 선택
4. 권한 승인

**Expected Results:**
- Google 인증 성공
- `/auth/callback`으로 리다이렉트
- 역할에 따라 대시보드로 이동
- 사용자 정보 표시

---

### TC-0.4: Protected Route 미들웨어 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. 로그아웃 상태 확인
2. `/dashboard` 직접 접근 시도
3. `/admin/dashboard` 직접 접근 시도

**Expected Results:**
- 인증되지 않은 사용자는 `/login`으로 리다이렉트
- 로그인 후 원래 요청한 페이지로 이동

---

### TC-0.5: 로그아웃 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- 사용자가 로그인되어 있음

**Test Steps:**
1. 헤더의 로그아웃 버튼 클릭
2. 로그아웃 확인

**Expected Results:**
- 로그아웃 성공 toast 표시
- `/login` 페이지로 리다이렉트
- 세션 쿠키 삭제
- Protected 페이지 접근 시 로그인 페이지로 이동

---

### TC-0.6: 사이드바 역할별 메뉴 테스트

**Priority:** P1 (High)

**Test Data:**
```typescript
const employeeMenu = [
  { label: '대시보드', href: '/dashboard' },
  { label: '내 연차', href: '/leave/my-leave' }
]

const adminMenu = [
  { label: '대시보드', href: '/admin/dashboard' },
  { label: '조직 관리', href: '/admin/employees' },
  { label: '연차 관리', href: '/admin/leave-management' }
]
```

**Test Steps:**
1. employee 계정으로 로그인
2. 사이드바 메뉴 확인
3. 로그아웃
4. admin 계정으로 로그인
5. 사이드바 메뉴 확인

**Expected Results:**
- employee: 2개 메뉴 표시
- admin: 3개 메뉴 표시
- 현재 페이지 하이라이트

---

### TC-0.7: 디자인 토큰 적용 테스트

**Priority:** P2 (Medium)

**Test Steps:**
1. 로그인 페이지 렌더링
2. 브라우저 개발자 도구 열기
3. 버튼 요소의 computed styles 확인
4. Primary 버튼 색상 확인

**Expected Results:**
- Primary 버튼: `background-color: #635BFF`
- Hover 시: `filter: brightness(0.9)`
- Border radius: `8px`
- 모든 컴포넌트가 일관된 디자인 토큰 사용

---

### TC-0.8: 반응형 레이아웃 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Desktop (1920x1080) 사이즈로 로그인
2. 사이드바 표시 확인
3. Tablet (768x1024) 사이즈로 변경
4. Mobile (375x667) 사이즈로 변경

**Expected Results:**
- Desktop: 사이드바 좌측에 고정 표시 (240px)
- Tablet: 사이드바 좌측에 고정 표시
- Mobile: 사이드바 숨김, 하단 탭 바 표시

---

## 🔧 Test Code Templates

### Playwright E2E Test

```typescript
// tests/e2e/phase-0.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 0: Authentication', () => {
  test('TC-0.1: Email login success', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill login form
    await page.fill('input[type="email"]', 'test@must.com')
    await page.fill('input[type="password"]', 'password123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL('/dashboard')

    // Verify success
    expect(page.url()).toContain('/dashboard')

    // Verify user name in header
    const userName = await page.textContent('header')
    expect(userName).toContain('테스트 사용자')
  })

  test('TC-0.2: Login failure with wrong credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'wrong@must.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForSelector('.error-message')

    // Verify error message
    const errorMessage = await page.textContent('.error-message')
    expect(errorMessage).toContain('로그인에 실패했습니다')

    // Still on login page
    expect(page.url()).toContain('/login')
  })

  test('TC-0.4: Protected route redirect', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/dashboard')

    // Should redirect to login
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')
  })

  test('TC-0.5: Logout', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@must.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Click logout button
    await page.click('button[title="로그아웃"]')

    // Should redirect to login
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')

    // Verify session cleared
    await page.goto('/dashboard')
    await page.waitForURL('/login')
  })

  test('TC-0.8: Responsive layout', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@must.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Desktop: sidebar visible
    await page.setViewportSize({ width: 1920, height: 1080 })
    const sidebarDesktop = await page.locator('aside').isVisible()
    expect(sidebarDesktop).toBe(true)

    // Mobile: sidebar hidden
    await page.setViewportSize({ width: 375, height: 667 })
    const sidebarMobile = await page.locator('aside').isVisible()
    expect(sidebarMobile).toBe(false)
  })
})
```

---

### Jest Unit Test (Server Components)

```typescript
// __tests__/unit/phase-0/login.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createClient } from '@/lib/supabase/client'
import LoginPage from '@/app/(auth)/login/page'

// Mock Supabase client
jest.mock('@/lib/supabase/client')

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render login form', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument()
    expect(screen.getByText('로그인')).toBeInTheDocument()
    expect(screen.getByText('Google로 로그인')).toBeInTheDocument()
  })

  it('should show error on invalid credentials', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({
      data: null,
      error: { message: '로그인에 실패했습니다' }
    })

    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn
      }
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('이메일'), {
      target: { value: 'wrong@must.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), {
      target: { value: 'wrongpassword' }
    })
    fireEvent.click(screen.getByText('로그인'))

    await waitFor(() => {
      expect(screen.getByText('로그인에 실패했습니다')).toBeInTheDocument()
    })
  })
})
```

---

### RLS Policy Test

```sql
-- tests/sql/phase-0-rls.test.sql

-- Test 1: 사용자는 본인 정보만 조회 가능
BEGIN;
  SET LOCAL "request.jwt.claims" = '{"sub": "user-1"}';

  -- Should return only own profile
  SELECT COUNT(*) FROM employee WHERE id = 'user-1';
  -- Expected: 1

  -- Should not return other profiles
  SELECT COUNT(*) FROM employee WHERE id = 'user-2';
  -- Expected: 0

ROLLBACK;

-- Test 2: 모든 사용자는 role 테이블 조회 가능
BEGIN;
  SET LOCAL "request.jwt.claims" = '{"sub": "user-1"}';

  SELECT COUNT(*) FROM role;
  -- Expected: > 0

ROLLBACK;

-- Test 3: 모든 사용자는 department 테이블 조회 가능
BEGIN;
  SET LOCAL "request.jwt.claims" = '{"sub": "user-1"}';

  SELECT COUNT(*) FROM department;
  -- Expected: > 0

ROLLBACK;
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-0.1: 이메일 로그인 성공
- [ ] TC-0.4: Protected Route 미들웨어 동작
- [ ] TC-0.5: 로그아웃 성공

### Should Pass (P1)
- [ ] TC-0.2: 로그인 실패 에러 처리
- [ ] TC-0.3: Google OAuth 로그인
- [ ] TC-0.6: 역할별 사이드바 메뉴
- [ ] TC-0.8: 반응형 레이아웃

### Nice to Pass (P2)
- [ ] TC-0.7: 디자인 토큰 적용

### Test Coverage
- [ ] Unit Tests: ≥ 80%
- [ ] E2E Tests: 모든 Critical Path
- [ ] RLS Policies: 모든 테이블

---

## 🐛 Known Issues & Troubleshooting

### Issue 1: Google OAuth Redirect 실패
**Symptom:** Google 로그인 후 에러 발생
**Solution:** Supabase Dashboard에서 Redirect URL 확인 및 추가

### Issue 2: Middleware 무한 리다이렉트
**Symptom:** 로그인 후 계속 `/login`으로 리다이렉트
**Solution:** middleware.ts에서 `/login` 경로 예외 처리 확인

### Issue 3: 디자인 토큰 미적용
**Symptom:** 컴포넌트에서 색상이 표시되지 않음
**Solution:** `tailwind.config.ts`에서 content 경로 확인

---

## 📊 Test Execution Report Template

```markdown
# Phase 0 Test Report

**실행일:** 2025-01-XX
**실행자:** [이름]
**환경:** Development / Staging / Production

## Test Results

| Test Case | Status | Duration | Notes |
|-----------|--------|----------|-------|
| TC-0.1 | ✅ Pass | 2.5s | - |
| TC-0.2 | ✅ Pass | 1.8s | - |
| TC-0.3 | ⚠️ Skip | - | Google OAuth 미설정 |
| TC-0.4 | ✅ Pass | 1.2s | - |
| TC-0.5 | ✅ Pass | 3.1s | - |
| TC-0.6 | ✅ Pass | 2.0s | - |
| TC-0.7 | ✅ Pass | 0.5s | - |
| TC-0.8 | ✅ Pass | 4.2s | - |

## Summary

- **Total:** 8 tests
- **Pass:** 7 (87.5%)
- **Fail:** 0 (0%)
- **Skip:** 1 (12.5%)

## Issues Found

1. [Issue description]
2. [Issue description]

## Next Steps

- [ ] Fix remaining issues
- [ ] Proceed to Phase 1
```

---

**Phase 0 Test 완료 후 Phase 1 Test 진행**
