# Google 소셜 로그인 구현 가이드

## 📋 목차
1. [개요](#개요)
2. [현재 상황](#현재-상황)
3. [구현 방식](#구현-방식)
4. [설정 방법](#설정-방법)
5. [코드 개선](#코드-개선)
6. [테스트 계획](#테스트-계획)

---

## 개요

### 전제 조건

**관리자가 구성원을 먼저 생성해야 합니다:**

```
1. 관리자가 조직 관리 > 구성원 관리 페이지 접속
   ↓
2. 신규 직원 정보 입력 (이름, 이메일, 부서, 역할 등)
   예: 이름: 홍길동, 이메일: hong@company.com
   ↓
3. 저장 → employee 테이블에 데이터 저장됨
   ↓
4. 이후 직원(홍길동)이 로그인 페이지에서 Google 로그인 가능
   ↓
5. hong@company.com Google 계정으로 로그인 시도
   ↓
6-A. 이메일 일치 → ✅ 로그인 성공, 대시보드로 이동
6-B. 이메일 불일치 → ❌ "등록되지 않은 이메일입니다" 에러
```

### 핵심 원칙

1. **employee 테이블이 인증의 기준입니다**
   - Google 계정의 이메일이 employee 테이블에 있어야 로그인 가능
   - employee 테이블에 없으면 어떤 Google 계정으로도 로그인 불가

2. **이메일이 정확히 일치해야 합니다**
   - employee 테이블: `hong@company.com`
   - Google 계정: `hong@company.com` ✅
   - Google 계정: `hong@gmail.com` ❌

3. **역할 기반 접근 제어**
   - Admin 역할 → `/admin/dashboard` 이동
   - 일반 직원 → `/dashboard` 이동

---

## 현재 상황

### ✅ 이미 구현된 것들

#### 1. 로그인 페이지 (`app/(auth)/login/page.tsx`)
- Google 로그인 버튼 UI 완성 (line 221-257)
- `handleGoogleLogin` 함수 구현됨 (line 62-79)
- `/auth/callback`으로 리다이렉트 설정

```typescript
async function handleGoogleLogin() {
  const { error: signInError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}
```

#### 2. Auth Callback (`app/auth/callback/route.ts`)
- Google OAuth 후 세션 교환
- employee 테이블에서 이메일로 사용자 찾기 (line 28)
- 역할에 따라 admin/일반 대시보드 분기 처리
- employee 없으면 로그인 페이지로 리다이렉트 (line 42)

```typescript
// 사용자 역할 확인
const { data: employee } = await supabase
  .from('employee')
  .select('...')
  .eq('email', data.user.email)
  .single()

// 역할별 리다이렉트
if (employeeData?.role?.code === 'admin') {
  return NextResponse.redirect(`${origin}/admin/dashboard`)
}
return NextResponse.redirect(`${origin}/dashboard`)
```

### ❌ 필요한 것

**Supabase Google OAuth Provider 설정**
- `supabase/config.toml`에 Google 설정 추가 필요
- Google Cloud Console에서 OAuth 2.0 클라이언트 ID 필요

---

## 구현 방식

### 인증 플로우

```
1. 사용자가 "Google로 로그인" 클릭
   ↓
2. Google 인증 페이지로 리다이렉트
   ↓
3. Google 계정 선택 및 권한 승인
   ↓
4. /auth/callback으로 돌아옴 (code와 함께)
   ↓
5. Supabase가 code를 session으로 교환
   ↓
6. employee 테이블에서 이메일로 사용자 검색
   ↓
7-A. 찾음 → 역할에 따라 대시보드 이동
7-B. 못 찾음 → 로그인 페이지로 (에러 메시지와 함께)
```

### 계정 매칭 방식

**이메일 기반 매칭:**
- employee 테이블의 `email` 컬럼과 Google 계정 이메일 비교
- 일치하면 → 로그인 성공
- 불일치하면 → "관리자에게 문의하세요" 메시지

**중요:**
- 각 직원은 employee 테이블에 이메일이 등록되어 있어야 함
- Google 계정의 이메일과 정확히 일치해야 함

### 세션 관리

**Supabase Auth가 자동으로 처리:**
- Access Token: 1시간 (짧은 수명)
- Refresh Token: 30일~1년 (긴 수명, 설정 가능)
- 자동 갱신: Supabase SDK가 알아서 처리

**결과:**
- 한 번 로그인하면 오랫동안 로그인 상태 유지
- 브라우저 닫았다 열어도 로그인 상태 유지
- 일반적인 소셜 로그인 경험 제공

---

## 설정 방법

### 1. Google Cloud Console 설정

#### 1.1 프로젝트 생성 및 OAuth 2.0 클라이언트 ID 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **APIs & Services** → **Credentials** 이동
4. **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID** 선택
5. Application type: **Web application** 선택
6. 이름 입력 (예: "MUST Access Local Dev")

#### 1.2 Redirect URI 설정

**로컬 개발 환경:**
```
http://127.0.0.1:54321/auth/v1/callback
http://localhost:54321/auth/v1/callback
http://127.0.0.1:3000/auth/callback
http://localhost:3000/auth/callback
```

**프로덕션 환경:**
```
https://dpruiclfgmyrzrvbekps.supabase.co/auth/v1/callback
https://your-domain.com/auth/callback
```

#### 1.3 클라이언트 ID와 Secret 복사
- Client ID: `xxxxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxxxx`

### 2. Supabase Config 설정

#### 2.1 환경 변수 추가 (`.env.local`)

```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_SECRET=your-client-secret
```

**⚠️ 주의:** `.env.local` 파일은 절대 Git에 커밋하지 마세요!

#### 2.2 Supabase Config 수정 (`supabase/config.toml`)

Apple OAuth 설정 아래에 추가:

```toml
# Google OAuth Provider
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_SECRET)"
# 로컬 개발용 redirect URI
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
# 로컬 개발 시 nonce 체크 스킵 (필수)
skip_nonce_check = true
```

### 3. Supabase 재시작

```bash
# Supabase 중지
npx supabase stop

# Supabase 재시작 (설정 반영)
npx supabase start
```

---

## 코드 개선

### 1. Callback 에러 처리 개선

**현재 코드 (`app/auth/callback/route.ts`, line 42):**
```typescript
// 실패 시 로그인 페이지로
return NextResponse.redirect(`${origin}/login`)
```

**개선 코드:**
```typescript
// employee를 찾지 못한 경우
if (!employee) {
  return NextResponse.redirect(
    `${origin}/login?error=not_registered&email=${encodeURIComponent(data.user.email || '')}`
  )
}

// 기타 에러
if (error) {
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

### 2. 로그인 페이지 에러 메시지 표시

**추가할 코드 (`app/(auth)/login/page.tsx`):**

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const errorCode = searchParams.get('error')
    const email = searchParams.get('email')

    if (errorCode === 'not_registered') {
      setError(
        `등록되지 않은 이메일입니다${email ? ` (${email})` : ''}. 관리자에게 문의하세요.`
      )
    } else if (errorCode === 'auth_failed') {
      setError('인증에 실패했습니다. 다시 시도해주세요.')
    }
  }, [searchParams])

  // ... 기존 코드
}
```

### 3. 에러 메시지 타입 정의

새 파일 생성: `types/auth.ts`

```typescript
export type AuthError =
  | 'not_registered'  // employee 테이블에 없음
  | 'auth_failed'     // 인증 실패
  | 'no_permission'   // 권한 없음

export const AUTH_ERROR_MESSAGES: Record<AuthError, string> = {
  not_registered: '등록되지 않은 이메일입니다. 관리자에게 문의하세요.',
  auth_failed: '인증에 실패했습니다. 다시 시도해주세요.',
  no_permission: '접근 권한이 없습니다.',
}
```

---

## 테스트 계획

### 1. 로컬 테스트 시나리오

#### 시나리오 A: 등록된 이메일로 로그인
1. employee 테이블에 `test@example.com` 존재
2. Google 로그인 버튼 클릭
3. `test@example.com` Google 계정으로 로그인
4. **예상 결과:** 대시보드로 이동

#### 시나리오 B: 등록되지 않은 이메일로 로그인
1. employee 테이블에 `unknown@example.com` 없음
2. Google 로그인 버튼 클릭
3. `unknown@example.com` Google 계정으로 로그인
4. **예상 결과:** 로그인 페이지로 돌아오며 에러 메시지 표시

#### 시나리오 C: Admin 계정 로그인
1. employee 테이블에 admin role을 가진 계정 존재
2. Google 로그인
3. **예상 결과:** `/admin/dashboard`로 이동

#### 시나리오 D: 일반 직원 로그인
1. employee 테이블에 일반 role을 가진 계정 존재
2. Google 로그인
3. **예상 결과:** `/dashboard`로 이동

### 2. 테스트용 계정 준비

```sql
-- 테스트 계정을 employee 테이블에 추가
INSERT INTO employee (id, name, email, department_id, role_id, status, employment_date)
VALUES
  (gen_random_uuid(), '테스트사용자', 'your-gmail@gmail.com', 1, 1, 'active', NOW());
```

**⚠️ 주의:** Google 계정의 이메일과 정확히 일치해야 합니다!

### 3. 체크리스트

- [ ] Google Cloud Console OAuth 2.0 클라이언트 생성
- [ ] Redirect URI 설정 완료
- [ ] `.env.local`에 클라이언트 ID/Secret 추가
- [ ] `config.toml`에 Google OAuth 설정 추가
- [ ] Supabase 재시작 (`npx supabase stop && npx supabase start`)
- [ ] Callback 에러 처리 코드 추가
- [ ] 로그인 페이지 에러 메시지 표시 추가
- [ ] 테스트 계정 employee 테이블에 추가
- [ ] 로컬에서 Google 로그인 테스트
- [ ] 등록되지 않은 이메일 테스트
- [ ] Admin/일반 사용자 권한 분기 테스트

---

## 추가 고려사항

### 보안

1. **이메일 검증:**
   - 회사 도메인만 허용하려면 추가 검증 로직 필요
   ```typescript
   if (!data.user.email?.endsWith('@company.com')) {
     return NextResponse.redirect(`${origin}/login?error=invalid_domain`)
   }
   ```

2. **계정 상태 체크:**
   ```typescript
   if (employee.status !== 'active') {
     return NextResponse.redirect(`${origin}/login?error=account_inactive`)
   }
   ```

### 확장 가능성

1. **여러 OAuth Provider 지원:**
   - GitHub, Microsoft, Slack 등 추가 가능
   - 같은 방식으로 config.toml에 설정 추가

2. **자동 계정 생성 (선택적):**
   - 신규 Google 로그인 시 pending_users 테이블에 저장
   - 관리자 승인 후 employee 테이블로 이동

3. **계정 연동 페이지:**
   - 사용자가 비밀번호 로그인 후 Google 계정 연결 가능
   - Supabase `linkIdentity` 사용

---

## 문제 해결

### 문제 1: "Invalid redirect URI"
**원인:** Google Cloud Console의 Redirect URI 설정 오류

**해결:**
1. Google Cloud Console에서 정확한 URI 확인
2. `http://` vs `https://` 확인
3. 포트 번호 확인 (54321 vs 3000)

### 문제 2: "Provider not enabled"
**원인:** config.toml에서 Google OAuth가 활성화되지 않음

**해결:**
1. `config.toml`에서 `enabled = true` 확인
2. Supabase 재시작: `npx supabase stop && npx supabase start`

### 문제 3: 로그인 후 계속 로그인 페이지로 돌아감
**원인:** employee 테이블에 이메일이 없거나 에러 발생

**해결:**
1. employee 테이블에 Google 이메일이 등록되어 있는지 확인
2. Supabase logs 확인: `npx supabase logs`
3. 브라우저 콘솔 확인

### 문제 4: 세션이 유지되지 않음
**원인:** 쿠키 설정 문제

**해결:**
1. `createClient`가 올바르게 설정되어 있는지 확인
2. 브라우저 쿠키가 차단되어 있지 않은지 확인
3. HTTPS 사용 여부 확인 (프로덕션)

---

## 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 설정](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

---

## 변경 이력

- 2024-11-23: 초안 작성
