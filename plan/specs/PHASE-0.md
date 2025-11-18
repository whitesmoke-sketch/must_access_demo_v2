# PHASE-0: 인증 및 디자인 시스템

**생성일:** 2025-01-18
**Phase 타입:** [PAGE]
**예상 기간:** 4-5일
**의존성:** 없음

---

## 🎯 Phase Overview

### Goal
사용자가 로그인하여 시스템에 인증되고, 프로젝트 전체에서 일관된 디자인 시스템을 사용할 수 있도록 구현합니다.

### Pages
- `/login` - 로그인 페이지
- `(authenticated)/layout.tsx` - 인증된 사용자용 공통 레이아웃

### User Stories
- [ ] 사용자는 이메일/비밀번호로 로그인할 수 있다
- [ ] 사용자는 Google 계정으로 로그인할 수 있다
- [ ] 로그인 후 역할에 따라 적절한 페이지로 리다이렉트된다
- [ ] 인증되지 않은 사용자는 보호된 페이지에 접근할 수 없다
- [ ] 모든 UI 요소가 일관된 디자인 토큰을 따른다
- [ ] 데스크톱/태블릿/모바일에서 반응형으로 동작한다

### Completion Criteria
- [ ] 이메일 로그인 성공
- [ ] Google OAuth 로그인 성공
- [ ] Protected Route 미들웨어 동작
- [ ] 역할별 리다이렉트 정상 동작
- [ ] 디자인 토큰 모든 컴포넌트 적용
- [ ] 반응형 레이아웃 확인 (Desktop/Tablet/Mobile)

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블 (BASIC.md 참조):**
- `employee` (직원 정보, 인증 연동)
- `role` (역할 정보)
- `department` (부서 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정
- ❌ 마이그레이션 실행

---

## 📄 Page Specifications

### Page 1: Login (`/login`)

#### Route Information
- **Path:** `/login`
- **Layout:** 중앙 정렬 단일 폼
- **Auth Required:** No
- **User Roles:** Public

#### Page Layout
```
┌────────────────────────────────────┐
│                                    │
│         MUST Access Logo           │
│                                    │
│    ┌──────────────────────┐       │
│    │  로그인 폼           │       │
│    │  - 이메일            │       │
│    │  - 비밀번호          │       │
│    │  - 로그인 버튼       │       │
│    │  - Google 로그인     │       │
│    └──────────────────────┘       │
│                                    │
│    테스트 계정 안내                │
│                                    │
│    © 2025 MUST Access             │
└────────────────────────────────────┘
```

#### UI Elements

**1. 로고**
- 위치: 상단 중앙
- 텍스트: "MUST Access"
- 색상: `var(--primary)` (#635BFF)
- 폰트 크기: 32px
- 폰트 두께: 700 (Bold)

**2. 이메일 입력 필드**
- 플레이스홀더: "이메일"
- 타입: `email`
- 필수: Yes
- 유효성: 이메일 형식 검증
- Focus 스타일: `border-color: var(--primary)`

**3. 비밀번호 입력 필드**
- 플레이스홀더: "비밀번호"
- 타입: `password`
- 필수: Yes
- Focus 스타일: `border-color: var(--primary)`

**4. 로그인 버튼**
- 텍스트: "로그인"
- 스타일: Primary (full width)
- 배경색: `var(--primary)`
- Hover: `brightness(0.9)`
- Active: `scale(0.98)`

**5. Google 로그인 버튼**
- 텍스트: "Google로 로그인"
- 아이콘: Google 로고
- 스타일: Outline (full width)
- 배경색: White
- Border: `1px solid var(--border)`

**6. 에러 메시지**
- 배경: `#FFF0ED` (연한 빨강)
- 텍스트 색상: `var(--error)`
- 위치: 폼 상단
- 표시 조건: 로그인 실패 시

**7. 테스트 계정 안내**
- 텍스트: "테스트 계정: test@must.com / password123"
- 색상: `var(--muted-foreground)`
- 폰트 크기: 12px
- 위치: 하단

---

### Page 2: Authenticated Layout (`(authenticated)/layout.tsx`)

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Logo, User Menu, Logout)       │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Page Content                │
│          │                              │
│ - 대시보드│                              │
│ - 연차   │                              │
│ - 자원   │                              │
│ - 관리자 │  (children)                  │
│          │                              │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

#### Header Component
- 높이: 64px
- 배경: White
- Border Bottom: `1px solid var(--border)`
- 요소:
  - 로고 (좌측)
  - 사용자 이름 (우측)
  - 로그아웃 버튼 (우측)

#### Sidebar Component
- 너비: 240px (Desktop), 숨김 (Mobile)
- 배경: `var(--muted)`
- 메뉴 항목:
  - 대시보드 (employee, admin)
  - 내 연차 (employee)
  - 자유석 (employee, admin)
  - 조직 관리 (admin)
  - 연차 관리 (admin)

**역할별 메뉴:**
```typescript
// employee
[
  { icon: 'LayoutDashboard', label: '대시보드', href: '/dashboard' },
  { icon: 'Calendar', label: '내 연차', href: '/leave/my-leave' },
]

// admin
[
  { icon: 'LayoutDashboard', label: '대시보드', href: '/admin/dashboard' },
  { icon: 'Users', label: '조직 관리', href: '/admin/employees' },
  { icon: 'CalendarCheck', label: '연차 관리', href: '/admin/leave-management' },
]
```

#### Mobile Navigation
- 하단 탭 바 (Mobile < 768px)
- 아이콘만 표시
- 활성 탭: `color: var(--primary)`

---

## 🧩 Components

### 1. LoginPage

**File:** `app/(auth)/login/page.tsx`

**Purpose:** 로그인 페이지 - 이메일/비밀번호 + Google OAuth

**Implementation:**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      // 사용자 역할 조회
      const { data: employee } = await supabase
        .from('employee')
        .select('role:role_id(code)')
        .eq('email', email)
        .single()

      // 역할별 리다이렉트
      if (employee?.role?.code === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/dashboard')
      }

      toast.success('로그인 성공!')
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signInError) throw signInError
    } catch (err: any) {
      setError(err.message || 'Google 로그인에 실패했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">MUST Access</h1>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Google 로그인 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            {/* Google 로고 SVG */}
          </svg>
          Google로 로그인
        </Button>

        {/* 테스트 계정 안내 */}
        <div className="text-center text-xs text-muted-foreground">
          <p>테스트 계정: test@must.com / password123</p>
        </div>

        {/* 저작권 */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2025 MUST Access. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
```

---

### 2. AuthenticatedLayout

**File:** `app/(authenticated)/layout.tsx`

**Purpose:** 인증된 사용자용 공통 레이아웃

**Implementation:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/common/Header'
import { Sidebar } from '@/components/common/Sidebar'

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // 사용자 역할 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('name, role:role_id(code)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} employee={employee} />

      <div className="flex">
        <Sidebar role={employee?.role?.code} />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

### 3. Header Component

**File:** `components/common/Header.tsx`

**Implementation:**
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

interface HeaderProps {
  user: any
  employee: any
}

export function Header({ user, employee }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('로그아웃되었습니다')
  }

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-primary">MUST Access</h1>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">
          {employee?.name || user.email}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="로그아웃"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
```

---

### 4. Sidebar Component

**File:** `components/common/Sidebar.tsx`

**Implementation:**
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarCheck
} from 'lucide-react'

interface SidebarProps {
  role?: string
}

const employeeMenu = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: Calendar, label: '내 연차', href: '/leave/my-leave' },
]

const adminMenu = [
  { icon: LayoutDashboard, label: '대시보드', href: '/admin/dashboard' },
  { icon: Users, label: '조직 관리', href: '/admin/employees' },
  { icon: CalendarCheck, label: '연차 관리', href: '/admin/leave-management' },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const menu = role === 'admin' ? adminMenu : employeeMenu

  return (
    <aside className="w-60 bg-muted border-r border-border hidden lg:block">
      <nav className="p-4 space-y-2">
        {menu.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted-dark text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

---

## 🎨 디자인 시스템

### Tailwind Config

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### CSS Variables

**File:** `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors */
    --background: 0 0% 100%;
    --foreground: 210 11% 15%;

    --primary: 245 58% 67%;         /* #635BFF */
    --primary-foreground: 0 0% 100%;

    --secondary: 177 79% 46%;       /* #16CDC7 */
    --secondary-foreground: 0 0% 100%;

    --accent: 43 96% 65%;           /* #F8C653 */
    --accent-foreground: 210 11% 15%;

    --success: 141 71% 58%;         /* #4CD471 */
    --error: 0 79% 71%;             /* #FF6B6B */
    --warning: 43 96% 65%;          /* #F8C653 */

    --muted: 210 17% 97%;           /* #F6F8F9 */
    --muted-foreground: 207 11% 40%; /* #5B6A72 */

    --border: 210 16% 87%;          /* #D3D9DC */
    --input: 210 16% 87%;
    --ring: 245 58% 67%;

    /* Border Radius */
    --radius: 1rem;                 /* 16px */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 🔐 Middleware (Protected Routes)

**File:** `middleware.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 인증이 필요한 페이지
  const protectedPaths = ['/dashboard', '/admin', '/leave', '/resources']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // 인증되지 않은 사용자가 보호된 페이지 접근 시 로그인으로 리다이렉트
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 이미 로그인한 사용자가 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 🔒 RLS Policies

**File:** `supabase/migrations/00X_phase0_rls.sql`

```sql
-- Phase 0: Authentication & Layout RLS Policies

-- employee 테이블
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 정보만 조회 가능
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid()::text = id::text);

-- role 테이블 (모든 사용자 조회 가능)
ALTER TABLE role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view roles"
ON role FOR SELECT
USING (true);

-- department 테이블 (모든 사용자 조회 가능)
ALTER TABLE department ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view departments"
ON department FOR SELECT
USING (true);
```

---

## 📋 Task Checklist

### 환경 설정
- [ ] Supabase 프로젝트 연결 확인
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] Google OAuth Provider 설정 (Supabase Dashboard)

### Pages & Routing
- [ ] `app/(auth)/login/page.tsx` 생성
- [ ] `app/(authenticated)/layout.tsx` 생성
- [ ] `middleware.ts` 생성

### Components
- [ ] `components/common/Header.tsx` 생성
- [ ] `components/common/Sidebar.tsx` 생성

### 디자인 시스템
- [ ] `tailwind.config.ts` 업데이트 (디자인 토큰)
- [ ] `app/globals.css` 업데이트 (CSS Variables)
- [ ] shadcn/ui 컴포넌트 설치 (Button, Input)

### Supabase Integration
- [ ] Supabase client 생성 (`lib/supabase/client.ts`)
- [ ] Supabase server 생성 (`lib/supabase/server.ts`)
- [ ] Supabase middleware 생성 (`lib/supabase/middleware.ts`)

### RLS Policies
- [ ] RLS SQL 파일 생성
- [ ] employee RLS 정책 작성
- [ ] role, department RLS 정책 작성
- [ ] Supabase Dashboard에서 SQL 실행

### UI/UX
- [ ] 반응형 디자인 적용 (Desktop/Tablet/Mobile)
- [ ] 로딩 상태 UI
- [ ] 에러 상태 UI
- [ ] Toast 알림 설정 (Sonner)

### Testing
- [ ] 이메일 로그인 테스트
- [ ] Google OAuth 로그인 테스트
- [ ] Protected Route 동작 테스트
- [ ] 역할별 리다이렉트 테스트
- [ ] 로그아웃 테스트
- [ ] 반응형 레이아웃 테스트

---

## 📁 File Structure

Phase 0에서 생성/수정할 파일:

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx              [CREATE]
├── (authenticated)/
│   └── layout.tsx                [CREATE]
├── globals.css                   [MODIFY]
components/
├── common/
│   ├── Header.tsx                [CREATE]
│   └── Sidebar.tsx               [CREATE]
├── ui/
│   ├── button.tsx                [CREATE - shadcn]
│   └── input.tsx                 [CREATE - shadcn]
lib/
├── supabase/
│   ├── client.ts                 [MODIFY]
│   ├── server.ts                 [MODIFY]
│   └── middleware.ts             [MODIFY]
└── utils.ts                      [CREATE]
supabase/
└── migrations/
    └── 00X_phase0_rls.sql        [CREATE]
middleware.ts                     [CREATE]
tailwind.config.ts                [MODIFY]
```

---

## 🔗 Phase Connection

### Phase -1 → Phase 0
초기 셋업에서 재사용:
- ✅ Supabase 프로젝트 연결
- ✅ 데이터베이스 스키마
- ✅ 기본 패키지 설치

### Phase 0 → Phase 1+
다음 Phase에서 재사용:
- ✅ 인증 시스템
- ✅ Authenticated Layout
- ✅ Header, Sidebar
- ✅ 디자인 토큰
- ✅ RLS 정책

---

## 💡 Implementation Tips

### Google OAuth 설정
1. Google Cloud Console에서 OAuth 클라이언트 ID 발급
2. Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase Dashboard > Authentication > Providers > Google 활성화

### 디자인 토큰 사용
```typescript
// Good
<div className="bg-primary text-primary-foreground">

// Bad
<div className="bg-[#635BFF] text-white">
```

### RLS 정책 테스트
```sql
-- 현재 사용자로 쿼리 테스트
SELECT * FROM employee WHERE auth.uid()::text = id::text;
```

---

**Phase 0 완료 후 다음 Phase 시작:**
```
"Phase 1 구현"
```

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
