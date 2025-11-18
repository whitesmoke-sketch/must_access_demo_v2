# API-PHASE-0: 인증 및 디자인 시스템

**생성일:** 2025-01-18
**Phase:** 0 (인증 및 디자인 시스템)
**아키텍처:** Next.js + Supabase (Option A)
**타입:** 인증 API

---

## 1. Overview

### Base URL
```
Production: https://your-app.vercel.app
Local: http://localhost:3000
```

### Authentication
Supabase Auth를 사용하여 JWT 기반 인증을 제공합니다.

**인증 방식:**
- Email/Password 로그인
- Google OAuth 로그인
- Session 기반 JWT 토큰

**헤더 구성:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 2. Supabase Queries

### 2.1 사용자 인증 - signInWithPassword

**Query:**
```typescript
await supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| email | string | Yes | 사용자 이메일 |
| password | string | Yes | 사용자 비밀번호 |

**Response:**
```typescript
{
  data: {
    user: {
      id: string,
      email: string,
      user_metadata: object,
      created_at: string
    },
    session: {
      access_token: string,
      refresh_token: string,
      expires_in: number,
      token_type: "bearer"
    }
  },
  error: null | {
    message: string,
    status: number
  }
}
```

**사용 예시:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

if (error) {
  console.error('Login failed:', error.message)
} else {
  console.log('User logged in:', data.user.email)
}
```

---

### 2.2 사용자 인증 - signInWithOAuth (Google)

**Query:**
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: string
  }
})
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| provider | 'google' | Yes | OAuth 제공자 |
| redirectTo | string | Yes | OAuth 콜백 URL |

**Response:**
```typescript
{
  data: {
    provider: 'google',
    url: string  // OAuth 인증 URL
  },
  error: null | {
    message: string
  }
}
```

**사용 예시:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})

if (error) {
  console.error('OAuth failed:', error.message)
}
```

---

### 2.3 사용자 정보 조회 - getUser

**Query:**
```typescript
await supabase.auth.getUser()
```

**Response:**
```typescript
{
  data: {
    user: {
      id: string,
      email: string,
      user_metadata: object,
      created_at: string
    }
  },
  error: null | {
    message: string
  }
}
```

---

### 2.4 로그아웃 - signOut

**Query:**
```typescript
await supabase.auth.signOut()
```

**Response:**
```typescript
{
  error: null | {
    message: string
  }
}
```

---

### 2.5 직원 정보 조회 (역할 확인)

**Query:**
```typescript
await supabase
  .from('employee')
  .select('id, name, email, role:role_id(code, name)')
  .eq('id', userId)
  .single()
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | 사용자 ID (auth.uid()) |

**Response:**
```typescript
{
  data: {
    id: string,
    name: string,
    email: string,
    role: {
      code: 'employee' | 'admin' | 'super_admin',
      name: string
    }
  },
  error: null
}
```

---

### 2.6 부서 목록 조회

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

### 2.7 역할 목록 조회

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

Phase 0에서는 Server Actions를 사용하지 않습니다. 모든 인증은 Supabase Auth SDK를 통해 클라이언트에서 직접 처리됩니다.

---

## 4. RLS Policies

### 4.1 employee 테이블

**Policy: "Users can view own profile"**
```sql
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid()::text = id::text);
```

**설명:** 사용자는 본인의 프로필만 조회 가능

---

### 4.2 role 테이블

**Policy: "All users can view roles"**
```sql
CREATE POLICY "All users can view roles"
ON role FOR SELECT
USING (true);
```

**설명:** 모든 인증된 사용자가 역할 목록 조회 가능

---

### 4.3 department 테이블

**Policy: "All users can view departments"**
```sql
CREATE POLICY "All users can view departments"
ON department FOR SELECT
USING (true);
```

**설명:** 모든 인증된 사용자가 부서 목록 조회 가능

---

## 5. Data Models

### 5.1 User (Supabase Auth)

```typescript
interface User {
  id: string                    // UUID
  email: string                 // 이메일
  user_metadata: {
    name?: string
    avatar_url?: string
  }
  created_at: string            // ISO 8601
}
```

---

### 5.2 Session (Supabase Auth)

```typescript
interface Session {
  access_token: string          // JWT 토큰
  refresh_token: string         // 갱신 토큰
  expires_in: number            // 만료 시간 (초)
  token_type: 'bearer'
  user: User
}
```

---

### 5.3 Employee

```typescript
interface Employee {
  id: string                    // UUID (auth.users.id와 동일)
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

### 5.5 Department

```typescript
interface Department {
  id: string          // UUID
  name: string        // 부서명
  created_at: string  // 생성일
}
```

---

## 6. Error Codes

### 6.1 인증 에러

| Code | Message | Description |
|------|---------|-------------|
| `invalid_credentials` | Invalid login credentials | 이메일 또는 비밀번호가 잘못됨 |
| `email_not_confirmed` | Email not confirmed | 이메일 인증이 완료되지 않음 |
| `user_not_found` | User not found | 사용자를 찾을 수 없음 |
| `weak_password` | Password is too weak | 비밀번호 강도가 약함 |
| `invalid_grant` | Invalid refresh token | 리프레시 토큰이 유효하지 않음 |

---

### 6.2 권한 에러

| Code | Message | Description |
|------|---------|-------------|
| `unauthorized` | Unauthorized | 인증되지 않은 사용자 |
| `forbidden` | Forbidden | 권한이 없음 |
| `session_expired` | Session expired | 세션이 만료됨 |

---

### 6.3 RLS 에러

| Code | Message | Description |
|------|---------|-------------|
| `PGRST301` | Row level security violation | RLS 정책 위반 |

---

## 7. Usage Examples

### 7.1 로그인 플로우 (Email/Password)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. 이메일/비밀번호 로그인
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      // 2. 사용자 역할 조회
      const { data: employee } = await supabase
        .from('employee')
        .select('role:role_id(code)')
        .eq('email', email)
        .single()

      // 3. 역할별 리다이렉트
      if (employee?.role?.code === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
```

---

### 7.2 Google OAuth 로그인

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton() {
  const supabase = createClient()

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      console.error('Google login failed:', error.message)
    }
  }

  return (
    <button onClick={handleGoogleLogin}>
      Google로 로그인
    </button>
  )
}
```

---

### 7.3 Server Component에서 인증 확인

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // 사용자 정보 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('name, role:role_id(code)')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <h1>안녕하세요 {employee?.name}님!</h1>
      <p>역할: {employee?.role?.code}</p>
    </div>
  )
}
```

---

### 7.4 Middleware에서 Protected Route 처리

```typescript
import { createServerClient } from '@supabase/ssr'
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
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 보호된 경로
  const protectedPaths = ['/dashboard', '/admin', '/leave']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // 인증되지 않은 사용자가 보호된 페이지 접근 시
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 이미 로그인한 사용자가 로그인 페이지 접근 시
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

### 7.5 로그아웃

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleLogout}>
      로그아웃
    </button>
  )
}
```

---

## 8. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (Supabase Dashboard에서 설정)
# Client ID와 Secret은 Supabase에서 관리
```

---

## 9. 보안 고려사항

1. **비밀번호 정책**
   - 최소 6자 이상
   - 영문, 숫자, 특수문자 조합 권장

2. **JWT 토큰**
   - Access Token 만료: 1시간
   - Refresh Token 만료: 30일
   - HttpOnly 쿠키에 저장

3. **RLS 정책**
   - 모든 테이블에 RLS 활성화
   - 본인 데이터만 조회 가능
   - Admin은 모든 데이터 조회 가능

4. **OAuth 설정**
   - Redirect URL 화이트리스트 등록 필수
   - Supabase Dashboard에서 Google OAuth 설정

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
