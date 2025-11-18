# 개발 워크플로우 가이드 - 서버리스 풀스택

**아키텍처:** Option A - 서버리스 풀스택 (Next.js + Supabase)
**생성일:** 2025-01-18

---

## 1. 아키텍처 개요

### 구조

```
Next.js 단일 프로젝트
├── Frontend (React Server/Client Components)
├── Backend (Server Actions + Edge Functions)
└── Database (Supabase PostgreSQL + pg_cron)
```

### 특징

- **Server Components:** 서버에서 직접 데이터 조회 (SEO 최적화, 초기 로딩 빠름)
- **Server Actions:** 클라이언트 인터랙션 처리 (폼 제출, 데이터 변경)
- **Edge Functions:** 복잡한 로직, Cron 작업, 외부 API 연동
- **서버리스 배포:** Vercel 자동 스케일링
- **BaaS 통합:** 데이터베이스, 인증, 스토리지가 통합

---

## 2. 데이터 호출 패턴

### 2.1 Server Component에서 직접 조회

```typescript
// app/(authenticated)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 서버에서 직접 데이터 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('*, department(*), annual_leave_balance(*)')
    .single()

  return (
    <div>
      <h1>환영합니다, {employee.name}님</h1>
      <p>잔여 연차: {employee.annual_leave_balance.remaining_days}일</p>
    </div>
  )
}
```

**장점:**
- SEO 최적화
- 초기 로딩 빠름
- 클라이언트 번들 사이즈 감소
- Service Role Key 사용 가능 (RLS 우회)

### 2.2 Client Component + Server Action

```typescript
// app/(authenticated)/leave/request-form.tsx
'use client'

import { requestLeave } from './actions'

export function LeaveRequestForm() {
  async function handleSubmit(formData: FormData) {
    const result = await requestLeave(formData)
    if (result.success) {
      toast.success('연차 신청이 완료되었습니다')
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="startDate" type="date" />
      <input name="endDate" type="date" />
      <button type="submit">신청</button>
    </form>
  )
}
```

```typescript
// app/(authenticated)/leave/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestLeave(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_request')
    .insert({
      employee_id: formData.get('employeeId'),
      start_date: formData.get('startDate'),
      end_date: formData.get('endDate'),
      // ...
    })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
```

**장점:**
- 타입 안전성
- 자동 재검증 (revalidatePath, revalidateTag)
- Progressive Enhancement

### 2.3 Client Component + API Route (외부 연동)

```typescript
// app/api/webhooks/biostar2/route.ts
export async function POST(request: Request) {
  const payload = await request.json()

  // Biostar2에서 들어온 출입 기록 처리
  const supabase = createClient()
  await supabase.from('access_log').insert({
    credential_id: payload.credentialId,
    access_point_id: payload.accessPointId,
    action: payload.action,
    result: payload.result,
    access_time: payload.timestamp,
  })

  return Response.json({ success: true })
}
```

**사용 케이스:**
- 외부 Webhook 수신
- 써드파티 API 프록시
- 파일 업로드

---

## 3. Edge Functions 활용

### 3.1 Cron 작업

#### 매월 1일 연차 부여

```typescript
// supabase/functions/grant-monthly-leave/index.ts
Deno.serve(async (req) => {
  const supabase = createSupabaseClient()

  // 활성 직원 조회
  const { data: employees } = await supabase
    .from('employee')
    .select('*')
    .eq('status', 'active')

  for (const employee of employees) {
    await supabase.from('annual_leave_grant').insert({
      employee_id: employee.id,
      grant_type: 'monthly',
      granted_days: 1.0,
      granted_date: new Date().toISOString().split('T')[0],
      // ...
    })
  }

  return new Response(JSON.stringify({ success: true }))
})
```

#### pg_cron 설정

```sql
-- 매월 1일 00:00 실행
SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-monthly-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### 3.2 복잡한 계산 로직

```typescript
// supabase/functions/grant-attendance-award/index.ts
Deno.serve(async (req) => {
  const supabase = createSupabaseClient()

  // 이전 분기 계산
  const { year, quarter } = getPreviousQuarter()

  // 직원별 만근 여부 계산
  for (const employee of employees) {
    const { lateCount, workDays } = await calculateAttendance(employee.id, year, quarter)

    const isQualified = lateCount === 0 && workDays >= requiredDays

    // 포상휴가 기록 생성
    await supabase.from('attendance_award').insert({
      employee_id: employee.id,
      award_period: `${year}-Q${quarter}`,
      is_qualified: isQualified,
      late_count: lateCount,
      // ...
    })

    // 자격이 있으면 휴가 부여
    if (isQualified) {
      await supabase.from('annual_leave_grant').insert({
        employee_id: employee.id,
        grant_type: 'award_attendance',
        granted_days: 1.0,
        // ...
      })
    }
  }

  return new Response(JSON.stringify({ success: true }))
})
```

### 3.3 외부 API 연동

```typescript
// supabase/functions/sync-hubstaff-attendance/index.ts
Deno.serve(async (req) => {
  const supabase = createSupabaseClient()
  const hubstaffToken = Deno.env.get('HUBSTAFF_API_TOKEN')

  // Hubstaff에서 어제 근태 데이터 가져오기
  const yesterday = getYesterday()
  const hubstaffData = await fetch(
    `https://api.hubstaff.com/v2/activities?date=${yesterday}`,
    {
      headers: { Authorization: `Bearer ${hubstaffToken}` },
    }
  ).then(res => res.json())

  // DB에 저장
  for (const activity of hubstaffData.activities) {
    await supabase.from('attendance').upsert({
      employee_id: activity.user_id,
      date: activity.date,
      start_time: activity.starts_at,
      end_time: activity.stops_at,
      status: calculateStatus(activity),
    })
  }

  return new Response(JSON.stringify({ success: true }))
})
```

---

## 4. 개발 단계별 가이드

### Phase 1: 환경 설정 (15분)

**1.1 Supabase 프로젝트 생성**

1. https://supabase.com 에서 새 프로젝트 생성
2. Project URL과 Anon Key 복사
3. Settings > API > Project URL & anon key 확인

**1.2 환경 변수 설정**

```bash
# .env.local 파일 수정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**1.3 로컬 Supabase 시작 (선택사항)**

```bash
# Supabase CLI 로그인
npx supabase login

# 로컬 Supabase 시작
npm run supabase:start

# 상태 확인
npm run supabase:status
```

**1.4 데이터베이스 마이그레이션**

```bash
# Supabase 프로젝트에 연결
npx supabase link --project-ref your-project-ref

# 마이그레이션 실행
npm run supabase:migrate

# 또는 Supabase Dashboard에서 SQL Editor로 직접 실행
```

**1.5 개발 서버 실행**

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

### Phase 2: API 구현 계획 수립 (30분)

**2.1 Implementation Planner 실행**

```
"API 구현 계획 만들어줘"
```

생성되는 파일:
- `plan/PLAN.md` - 전체 로드맵
- `plan/specs/PHASE-*.md` - Phase별 스펙
- `plan/INTEGRATION-SPECIFICATION.md` - 통합 규정서 ⭐
- `plan/tests/PHASE-*.md` - 테스트 계획
- `plan/api-docs/API-PHASE-*.md` - API 문서

**2.2 Phase 구성 검토**

추천 Phase 구성:
- **Phase 1:** 인증 및 사용자 관리
- **Phase 2:** 연차 관리 (조회, 신청, 승인)
- **Phase 3:** 근태 관리 (조회, 동기화)
- **Phase 4:** 자원 예약 (좌석, 회의실)
- **Phase 5:** 승인 프로세스 (결재선, 문서)
- **Phase 6:** Edge Functions (Cron, 외부 API)

---

### Phase 3: Phase별 구현 (Phase당 2-4일)

**3.1 Phase 구현 시작**

```
"Phase 1 구현"
```

**3.2 구현 프로세스**

1. SPEC-PHASE-X.md의 Task Checklist 확인
2. Server Components 생성 (데이터 조회 페이지)
3. Server Actions 생성 (데이터 변경 로직)
4. Client Components 생성 (인터랙티브 UI)
5. Supabase 쿼리 작성
6. 에러 처리 추가
7. 자동 Codex 리뷰 실행
8. 이슈 수정
9. PHASE-X-REPORT.md 자동 생성

**3.3 각 Phase 완료 후**

- 브라우저에서 기능 테스트
- Supabase Dashboard에서 데이터 확인
- 다음 Phase로 진행

---

### Phase 4: Edge Functions 구현 (2-3일)

**4.1 로컬 Edge Function 테스트**

```bash
# Edge Function 로컬 서빙
npm run edge:serve grant-monthly-leave

# 다른 터미널에서 호출 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/grant-monthly-leave' \
  --header 'Authorization: Bearer your-anon-key' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

**4.2 Edge Function 배포**

```bash
# 특정 함수 배포
npm run edge:deploy grant-monthly-leave

# 모든 함수 배포
npm run edge:deploy
```

**4.3 pg_cron 설정**

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 매월 1일 00:00 연차 부여
SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-monthly-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 분기 첫날 포상휴가 부여
SELECT cron.schedule(
  'grant-attendance-award',
  '0 0 1 */3 *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-attendance-award',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 매일 자정 Hubstaff 동기화
SELECT cron.schedule(
  'sync-hubstaff',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync-hubstaff-attendance',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**4.4 Cron 작업 확인**

```sql
-- 등록된 Cron 작업 조회
SELECT * FROM cron.job;

-- Cron 작업 실행 이력 조회
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Cron 작업 삭제
SELECT cron.unschedule('grant-monthly-leave');
```

---

### Phase 5: 코드 개선 (1-2일)

모든 Phase 구현 완료 후:

```
"개선사항 적용"
```

적용 항목:
- P1 (High) 우선순위 개선
- P2 (Medium) 선택적 개선
- 코드 중복 제거
- 보안 강화
- 성능 최적화

---

### Phase 6: 외부 API 연동 (2-3일)

**6.1 Hubstaff 연동**

```typescript
// lib/external/hubstaff.ts
export async function fetchHubstaffActivities(date: string) {
  const token = process.env.HUBSTAFF_API_TOKEN

  const response = await fetch(
    `https://api.hubstaff.com/v2/activities?date=${date}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.json()
}
```

**6.2 Slack 알림**

```typescript
// lib/external/slack.ts
export async function sendSlackNotification(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  })
}
```

**6.3 Notion 연동**

```typescript
// lib/external/notion.ts
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

export async function createNotionPage(data: any) {
  return notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID! },
    properties: {
      Title: { title: [{ text: { content: data.title } }] },
      // ...
    },
  })
}
```

---

### Phase 7: 통합 테스트 (1-2일)

**7.1 테스트 생성**

```
"API 테스트 생성해줘"
```

**7.2 수동 테스트 체크리스트**

- [ ] 로그인/로그아웃
- [ ] 연차 신청 및 승인
- [ ] 포상휴가 부여 및 사용
- [ ] 좌석 예약 및 자동 반납
- [ ] 근태 데이터 동기화
- [ ] Slack 알림 발송
- [ ] Notion 연동

---

### Phase 8: 배포 (1일)

**8.1 Vercel 배포**

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

**8.2 환경 변수 설정**

Vercel Dashboard > Settings > Environment Variables에서 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HUBSTAFF_API_TOKEN`
- `BIOSTAR2_API_URL`
- `BIOSTAR2_API_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_WEBHOOK_URL`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`

**8.3 도메인 연결**

Vercel Dashboard > Settings > Domains에서 커스텀 도메인 추가

---

## 5. 개발 팁

### 5.1 Server Components vs Client Components

**Server Components 사용 시기:**
- 데이터 조회만 필요한 경우
- SEO가 중요한 페이지
- 민감한 정보 (API Keys, Service Role Key)

**Client Components 사용 시기:**
- 사용자 인터랙션 (onClick, onChange 등)
- useState, useEffect 등 React Hooks 사용
- 브라우저 API 사용 (localStorage, window 등)

### 5.2 Supabase RLS (Row Level Security)

**RLS 정책 예시:**

```sql
-- 직원은 본인의 연차만 조회 가능
CREATE POLICY "Employees can view own leaves"
ON leave_request
FOR SELECT
USING (auth.uid() = employee_id);

-- 관리자는 모든 연차 조회 가능
CREATE POLICY "Admins can view all leaves"
ON leave_request
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

### 5.3 에러 처리

```typescript
// Server Action 에러 처리
'use server'

import { z } from 'zod'

const LeaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(10),
})

export async function requestLeave(formData: FormData) {
  try {
    // 유효성 검증
    const parsed = LeaveSchema.parse({
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      reason: formData.get('reason'),
    })

    // DB 작업
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leave_request')
      .insert(parsed)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors }
    }
    return { success: false, error: error.message }
  }
}
```

---

## 6. 트러블슈팅

### 문제: Supabase 연결 실패

**해결:**
```bash
# .env.local 확인
cat .env.local | grep SUPABASE

# Supabase 프로젝트 상태 확인
npm run supabase:status
```

### 문제: Edge Function 로컬 테스트 실패

**해결:**
```bash
# Docker 실행 확인
docker ps

# Supabase 재시작
npm run supabase:stop
npm run supabase:start
```

### 문제: 타입 에러

**해결:**
```bash
# Supabase 타입 재생성
npm run supabase:types

# TypeScript 체크
npm run type-check
```

---

## 7. 다음 단계

### 프로덕션 체크리스트

- [ ] 모든 환경 변수 Vercel에 설정
- [ ] Supabase RLS 정책 활성화
- [ ] Edge Functions 배포
- [ ] pg_cron 작업 등록
- [ ] 에러 모니터링 (Sentry 등)
- [ ] 성능 모니터링 (Vercel Analytics)
- [ ] SEO 최적화 (메타 태그, sitemap)
- [ ] 보안 감사 (npm audit)

---

**작성일:** 2025-01-18
**다음 업데이트:** 프로젝트 진행 중 필요 시
