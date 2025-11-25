# Scripts Directory

이 디렉토리에는 개발 및 테스트를 위한 유틸리티 스크립트가 포함되어 있습니다.

## 주요 스크립트

### 데이터베이스 관리

#### `reset-and-seed.sh` ⭐ 추천
데이터베이스를 리셋하고 테스트 계정을 자동으로 생성합니다.

```bash
./scripts/reset-and-seed.sh
```

**작업 내용:**
1. 로컬 Supabase DB 리셋
2. 테스트 계정 생성 (staff, teamlead, depthead, bizhead, hr)
3. 계정 확인

---

### 계정 생성

#### `create-test-accounts.ts`
기본 테스트 계정 5개를 생성합니다.

```bash
npx tsx scripts/create-test-accounts.ts
```

**생성되는 계정:**
- `staff@test.com` - 김사원 (일반 사원)
- `teamlead@test.com` - 박팀장 (팀 리더)
- `depthead@test.com` - 최부장 (부서장)
- `bizhead@test.com` - 정본부장 (사업부장)
- `hr@test.com` - 이인사 (HR)

#### `create-test-accounts-local.sh`
로컬 환경용 계정 생성 스크립트 (환경변수 자동 로드)

```bash
./scripts/create-test-accounts-local.sh
```

#### `create-hr-account-full.ts`
HR 계정을 완전한 레코드로 생성합니다.

```bash
npx tsx scripts/create-hr-account-full.ts
```

#### `create-hr-account.ts`
기존 employee 레코드에 대한 auth 사용자만 생성합니다.

```bash
npx tsx scripts/create-hr-account.ts
```

---

### 계정 관리

#### `list-auth-users.ts`
현재 등록된 auth 사용자 목록을 확인합니다.

```bash
npx tsx scripts/list-auth-users.ts
```

#### `reset-hr-password.ts`
HR 계정의 비밀번호를 리셋합니다.

```bash
npx tsx scripts/reset-hr-password.ts
```

#### `reset-test-passwords.ts`
모든 테스트 계정의 비밀번호를 리셋합니다.

```bash
npx tsx scripts/reset-test-passwords.ts
```

#### `update-passwords.ts`
특정 계정의 비밀번호를 업데이트합니다.

```bash
npx tsx scripts/update-passwords.ts
```

---

### 테스트

#### `test-login.ts`
테스트 계정으로 로그인을 시도합니다.

```bash
npx tsx scripts/test-login.ts
```

#### `signup-test.ts`
회원가입 플로우를 테스트합니다.

```bash
npx tsx scripts/signup-test.ts
```

---

## 일반적인 워크플로우

### 1. 새로운 개발 환경 설정

```bash
# 1. Supabase 시작
npm run supabase:start

# 2. 데이터베이스 리셋 & 시드
./scripts/reset-and-seed.sh

# 3. 개발 서버 시작
npm run dev
```

### 2. 데이터베이스 리셋 후 재설정

```bash
# DB 리셋
npx supabase db reset

# 테스트 계정 재생성
./scripts/create-test-accounts-local.sh
```

### 3. 계정 문제 해결

```bash
# 현재 auth 사용자 확인
npx tsx scripts/list-auth-users.ts

# 계정이 없으면 재생성
npx tsx scripts/create-test-accounts.ts

# 로그인 테스트
npx tsx scripts/test-login.ts
```

---

## 환경 변수

스크립트 실행 전 `.env.local` 파일에 다음 변수가 설정되어 있어야 합니다:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 문제 해결

### "User not found" 오류

**원인:** Auth 사용자는 있지만 employee 레코드가 없음

**해결:**
```bash
npx tsx scripts/create-test-accounts.ts
```

### "로그인할 수 없습니다" 오류

**원인:** Auth 사용자가 없음

**해결:**
```bash
npx tsx scripts/create-test-accounts.ts
```

### UUID 불일치

**원인:** Auth 사용자 ID와 employee ID가 다름

**해결:**
```bash
# 데이터베이스 리셋 후 재생성
./scripts/reset-and-seed.sh
```

---

## 추가 정보

더 자세한 정보는 [`docs/DUMMY-DATA.md`](../docs/DUMMY-DATA.md)를 참조하세요.

- 계정 생성 문제 이해
- UUID 동기화 중요성
- Google OAuth 테스트
- 배포 시 체크리스트
