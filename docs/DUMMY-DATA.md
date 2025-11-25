# 더미 데이터 및 테스트 계정 설정 가이드

## 목차
1. [개요](#개요)
2. [계정 생성 문제 이해](#계정-생성-문제-이해)
3. [빠른 시작](#빠른-시작)
4. [테스트 계정 목록](#테스트-계정-목록)
5. [자동화 스크립트](#자동화-스크립트)
6. [문제 해결](#문제-해결)
7. [Google OAuth 테스트](#google-oauth-테스트)

---

## 개요

이 문서는 데이터베이스 리셋 또는 새로운 환경 배포 시 필요한 더미 데이터 설정 방법을 설명합니다.

### 핵심 문제

데이터베이스를 리셋하면 **두 가지 중요한 데이터**가 손실됩니다:

1. **Supabase Auth 사용자** (`auth.users` 테이블)
2. **Employee 레코드** (`public.employee` 테이블)

이 두 데이터는 **반드시 동기화**되어야 하며, 각각의 생성 방법이 다릅니다:

- **Auth 사용자**: Supabase Auth Admin API 사용
- **Employee 레코드**: DB INSERT 또는 Service Role Key로 직접 삽입

---

## 계정 생성 문제 이해

### 문제 시나리오

#### ❌ 잘못된 경우 1: Employee만 존재
```
employee 테이블: ✅ 데이터 있음
auth.users: ❌ 데이터 없음
결과: 로그인 불가 (auth 사용자가 없음)
```

#### ❌ 잘못된 경우 2: Auth 사용자만 존재
```
employee 테이블: ❌ 데이터 없음
auth.users: ✅ 데이터 있음
결과: 로그인은 되지만 권한 오류 (employee 레코드 없음)
```

#### ✅ 올바른 경우: 둘 다 동기화
```
employee 테이블: ✅ 데이터 있음 (ID: uuid-123)
auth.users: ✅ 데이터 있음 (ID: uuid-123, 같은 UUID)
결과: 정상 작동
```

### UUID 동기화 중요성

**반드시 같은 UUID를 사용해야 합니다:**

```typescript
// ✅ 올바른 방법
const userId = '00000000-0000-0000-0000-000000000001'

// 1. Auth 사용자 생성
await supabase.auth.admin.createUser({
  id: userId,  // 명시적으로 ID 지정
  email: 'test@test.com',
  password: 'password'
})

// 2. Employee 레코드 생성 (같은 ID 사용)
await supabase.from('employee').insert({
  id: userId,  // 같은 ID
  email: 'test@test.com',
  name: '테스트'
})
```

---

## 빠른 시작

### ⚡ 한 번에 모두 설정하기 (추천)

```bash
# Supabase 시작
npm run supabase:start

# DB 리셋 + 마스터 계정 + 테스트 계정 생성
./scripts/reset-and-seed.sh
```

**이 스크립트는 다음을 자동으로 수행합니다:**
1. 데이터베이스 리셋
2. `setup_data.sql` 실행 (역할, 부서, 권한, 회의실 생성)
3. 마스터 관리자 계정 생성
4. 테스트 계정 5개 생성

---

### 수동 설정 (단계별)

#### 1단계: 환경 변수 설정

`.env.local` 파일에 다음 변수가 설정되어 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2단계: Supabase 로컬 시작

```bash
npm run supabase:start
```

이 명령어는 자동으로 `setup_data.sql`을 실행합니다.

#### 3단계: 마스터 계정 생성

```bash
npx tsx scripts/create-master-account.ts
```

#### 4단계: 테스트 계정 생성

```bash
# 로컬 환경용
./scripts/create-test-accounts-local.sh

# 또는 직접 실행
npx tsx scripts/create-test-accounts.ts
```

#### 5단계: 확인

```bash
# Auth 사용자 목록 확인
npx tsx scripts/list-auth-users.ts

# 로그인 테스트
npx tsx scripts/test-login.ts
```

---

## 테스트 계정 목록

### 🔐 마스터 관리자 계정

**최고 권한 계정 - 프로덕션에서는 반드시 비밀번호 변경 필요!**

| 이메일 | 이름 | 역할 | 레벨 | 부서 | 비밀번호 |
|--------|------|------|------|------|----------|
| `admin@must-access.com` | 시스템 관리자 | admin | 0 | 본사 | `Admin@2025!` |

**특징:**
- 모든 권한 보유
- 시스템 설정 변경 가능
- 모든 데이터 접근 가능
- UUID: `00000000-0000-0000-0000-000000000000`

**생성 방법:**
```bash
npx tsx scripts/create-master-account.ts
```

---

### 🧪 테스트 계정

**모든 계정의 비밀번호:** `password`

| 이메일 | 이름 | 역할 | 레벨 | 부서 | 설명 |
|--------|------|------|------|------|------|
| `staff@test.com` | 김사원 | employee | 1 | 개발1팀 | 일반 사원 |
| `teamlead@test.com` | 박팀장 | team_leader | 2 | 개발1팀 | 팀 리더 |
| `depthead@test.com` | 최부장 | department_head | 3 | 개발부 | 부서장 |
| `bizhead@test.com` | 정본부장 | business_head | 4 | 본사 | 사업부장 |
| `hr@test.com` | 이인사 | HR | 5 | 인사팀 | HR 담당자 |

**생성 방법:**
```bash
npx tsx scripts/create-test-accounts.ts
```

---

### HR 계정 별도 관리

HR 계정은 시스템 전체 권한을 가지므로 별도 스크립트로 관리:

```bash
# HR 계정 생성 (완전한 레코드 생성)
npx tsx scripts/create-hr-account-full.ts

# HR 계정 비밀번호 리셋
npx tsx scripts/reset-hr-password.ts
```

---

## setup_data.sql - 프로덕션 필수 데이터

`/supabase/setup_data.sql` 파일에는 시스템 운영에 필수적인 마스터 데이터가 포함되어 있습니다.

### 포함된 데이터

1. **역할 (Roles)**
   - Admin (level 0)
   - Employee (level 1)
   - Team Leader (level 2)
   - Department Head (level 3)
   - Business Head (level 4)
   - HR (level 5)

2. **부서 계층 구조 (Departments)**
   ```
   본사 (HQ)
   ├── 개발부 (DEV_DEPT)
   │   ├── 개발1팀 (DEV_TEAM1)
   │   └── 개발2팀 (DEV_TEAM2)
   ├── 디자인부 (DESIGN_DEPT)
   │   └── 디자인1팀 (DESIGN_TEAM1)
   └── 인사팀 (HR)
   ```

3. **권한 (Permissions)**
   - 연차 관리 권한 (leave:*)
   - 직원 관리 권한 (employee:*)
   - 부서 관리 권한 (department:*)
   - 문서 관리 권한 (document:*)
   - 승인 관리 권한 (approval:*)
   - 설정 관리 권한 (settings:*)

4. **역할-권한 매핑 (Role Permissions)**
   - 각 역할에 적절한 권한 자동 할당

5. **회의실 (Meeting Rooms)**
   - Innovation Lab (2층, 6인실)
   - Creative Hub (2층, 8인실)
   - Strategy Room (3층, 10인실)
   - Executive Suite (3층, 12인실)
   - Town Hall (6층, 50인실)
   - Conference A (6층, 20인실)
   - Conference B (6층, 15인실)

### 실행 방법

**자동 실행:**
```bash
npm run supabase:start  # setup_data.sql 자동 실행됨
```

**수동 실행:**
```bash
npx supabase db reset  # setup_data.sql 포함
```

**프로덕션 배포:**
- Supabase 대시보드에서 SQL Editor로 실행
- 또는 migration 파일로 포함

---

## 자동화 스크립트

### 완전한 환경 설정 스크립트

모든 것을 한 번에 설정하려면 다음 스크립트를 생성하세요:

#### `scripts/setup-dummy-data.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDummyData() {
  console.log('🚀 Starting dummy data setup...\n')

  // 1. 테스트 계정 생성
  console.log('1️⃣ Creating test accounts...')
  // ... (create-test-accounts.ts 로직)

  // 2. 부서 및 역할 확인
  console.log('2️⃣ Verifying departments and roles...')
  // ...

  // 3. 연차 잔여일 설정
  console.log('3️⃣ Setting up leave balances...')
  // ...

  // 4. 회의실 데이터
  console.log('4️⃣ Creating meeting rooms...')
  const meetingRooms = [
    { name: '대회의실', code: 'CONF-A', floor: 3, capacity: 20 },
    { name: '중회의실', code: 'CONF-B', floor: 3, capacity: 10 },
    { name: '소회의실 1', code: 'MEET-1', floor: 2, capacity: 6 },
    { name: '소회의실 2', code: 'MEET-2', floor: 2, capacity: 6 }
  ]
  // ...

  // 5. 샘플 휴가 신청
  console.log('5️⃣ Creating sample leave requests...')
  // ...

  console.log('\n✅ Dummy data setup completed!')
}

setupDummyData()
```

### 실행 방법

```bash
npx tsx scripts/setup-dummy-data.ts
```

---

## 문제 해결

### 문제 1: "User not found" 로그인 오류

**원인**: Auth 사용자는 있지만 employee 레코드가 없음

**해결**:
```bash
# Employee 레코드만 재생성
npx tsx scripts/create-test-accounts.ts
```

### 문제 2: "로그인할 수 없습니다"

**원인**: Auth 사용자가 없음

**해결**:
```bash
# Auth 사용자 확인
npx tsx scripts/list-auth-users.ts

# 없으면 재생성
npx tsx scripts/create-test-accounts.ts
```

### 문제 3: UUID 불일치

**증상**: 로그인은 되지만 권한 오류

**진단**:
```sql
-- Auth 사용자 ID 확인
SELECT id, email FROM auth.users WHERE email = 'test@test.com';

-- Employee ID 확인
SELECT id, email FROM employee WHERE email = 'test@test.com';

-- ID가 다르면 문제!
```

**해결**:
```bash
# 모든 테스트 계정 삭제 후 재생성
npx tsx scripts/cleanup-test-accounts.ts  # 필요 시 생성
npx tsx scripts/create-test-accounts.ts
```

### 문제 4: 데이터베이스 리셋 후 계정 사라짐

**원인**: `supabase db reset`은 auth.users도 초기화

**해결책**:

#### A. 리셋 후 항상 계정 재생성

```bash
# 1. DB 리셋
npx supabase db reset

# 2. 테스트 계정 생성
./scripts/create-test-accounts-local.sh
```

#### B. 자동화 스크립트 만들기

`scripts/reset-and-seed.sh`:
```bash
#!/bin/bash
set -e

echo "🔄 Resetting database..."
npx supabase db reset

echo "🌱 Seeding test accounts..."
./scripts/create-test-accounts-local.sh

echo "✅ Database reset and seeded successfully!"
```

사용:
```bash
chmod +x scripts/reset-and-seed.sh
./scripts/reset-and-seed.sh
```

### 문제 5: Google Calendar 테스트

**문제**: 로컬 환경에서 Google Calendar 연동 테스트 불가

**해결**: Google OAuth 로그인 필요

1. Supabase 대시보드에서 Google OAuth 설정
2. Redirect URL에 `http://localhost:3000/auth/callback` 추가
3. 실제 Google 계정으로 로그인하여 테스트

---

## Google OAuth 테스트

### 설정 단계

#### 1. Google Cloud Console 설정

1. https://console.cloud.google.com/ 접속
2. 프로젝트 생성 또는 선택
3. "API 및 서비스" → "OAuth 동의 화면" 설정
4. "API 및 서비스" → "사용자 인증 정보" → OAuth 2.0 클라이언트 ID 생성
5. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/auth/callback`
   - `https://your-supabase-project.supabase.co/auth/v1/callback`

#### 2. Supabase 설정

Supabase 대시보드 → Authentication → Providers → Google:

```
Client ID: YOUR_GOOGLE_CLIENT_ID
Client Secret: YOUR_GOOGLE_CLIENT_SECRET
```

#### 3. 환경 변수 (선택)

`.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

### 테스트 방법

1. 로컬 서버 시작: `npm run dev`
2. `/login` 페이지 접속
3. "Google로 로그인" 버튼 클릭
4. 실제 Google 계정으로 로그인
5. 회의실 예약 생성 → Calendar 이벤트 확인

### Calendar API 권한

Google OAuth 동의 화면에서 다음 스코프 추가:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

---

## 배포 시 체크리스트

### Vercel/Production 배포 전

- [ ] 환경 변수 설정 (Supabase URL, Keys)
- [ ] Google OAuth 설정 (Redirect URIs 추가)
- [ ] 프로덕션 DB에 테스트 계정 생성 (선택)
- [ ] RLS 정책 확인

### 스테이징 환경

```bash
# 스테이징 DB에 테스트 데이터 생성
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-key \
npx tsx scripts/create-test-accounts.ts
```

### 프로덕션 주의사항

⚠️ **프로덕션 환경에는 절대 테스트 계정을 넣지 마세요!**

- 테스트 계정 이메일: `@test.com`, `@example.com` 등
- 비밀번호: `password` 같은 약한 비밀번호

---

## 추가 더미 데이터 스크립트

### 회의실 예약 샘플 데이터

`scripts/seed-meeting-bookings.ts`:
```typescript
// 다양한 시간대의 회의실 예약 생성
const bookings = [
  {
    room_id: 'room-uuid',
    booked_by: 'user-uuid',
    title: '주간 팀 회의',
    booking_date: '2025-01-20',
    start_time: '10:00',
    end_time: '11:00'
  },
  // ...
]
```

### 휴가 신청 샘플 데이터

`scripts/seed-leave-requests.ts`:
```typescript
// 승인 대기, 승인됨, 거절됨 등 다양한 상태의 휴가 신청
```

---

## 참고 문서

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Database Reset](https://supabase.com/docs/reference/cli/supabase-db-reset)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)

---

## 마지막 업데이트

- 작성일: 2025-01-25
- 마지막 수정: 2025-01-25
- 작성자: MUST ACCESS 개발팀
