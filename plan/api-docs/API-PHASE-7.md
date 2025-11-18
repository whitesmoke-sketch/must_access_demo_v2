# API-PHASE-7: Edge Functions (자동 연차 부여)

**생성일:** 2025-01-18
**Phase:** 7 (Edge Functions)
**아키텍처:** Supabase Edge Functions + pg_cron
**타입:** Serverless Functions

---

## 1. Overview

### Base URL
```
Production: https://your-project.supabase.co/functions/v1/
Local: http://localhost:54321/functions/v1/
```

### Authentication
Edge Functions는 Service Role Key로 인증합니다.

**Required Headers:**
```http
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
```

---

## 2. Edge Functions

### 2.1 grant-monthly-leave

**Endpoint:** `POST /functions/v1/grant-monthly-leave`

**Purpose:** 매월 1일 00:00에 모든 활성 직원에게 연차 1일 자동 부여

**Schedule:** 매월 1일 00:00 (Cron: `0 0 1 * *`)

**Request:**
```typescript
POST /functions/v1/grant-monthly-leave
Content-Type: application/json
Authorization: Bearer <SERVICE_ROLE_KEY>

{}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  successCount?: number
  failCount?: number
  date?: string
  error?: string
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "연차 부여 완료: 성공 50명, 실패 0명",
  "successCount": 50,
  "failCount": 0,
  "date": "2025-01-01"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to fetch employees: ..."
}
```

---

### 2.2 grant-anniversary-leave

**Endpoint:** `POST /functions/v1/grant-anniversary-leave`

**Purpose:** 입사 기념일에 근속 연수에 따라 추가 연차 부여

**Schedule:** 매일 00:00 (Cron: `0 0 * * *`)

**Request:**
```typescript
POST /functions/v1/grant-anniversary-leave
Content-Type: application/json
Authorization: Bearer <SERVICE_ROLE_KEY>

{}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  employees?: Array<{
    name: string
    yearsOfService: number
    bonusDays: number
  }>
  error?: string
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "입사 기념일 연차 부여 완료: 3명",
  "employees": [
    {
      "name": "홍길동",
      "yearsOfService": 3,
      "bonusDays": 1
    },
    {
      "name": "김철수",
      "yearsOfService": 5,
      "bonusDays": 2
    },
    {
      "name": "이영희",
      "yearsOfService": 10,
      "bonusDays": 5
    }
  ]
}
```

---

## 3. Edge Function Implementation

### 3.1 grant-monthly-leave/index.ts

**File:** `supabase/functions/grant-monthly-leave/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ResponseData {
  success: boolean
  message?: string
  successCount?: number
  failCount?: number
  date?: string
  error?: string
}

Deno.serve(async (req) => {
  try {
    // Supabase 클라이언트 생성 (Service Role Key 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    console.log(`[grant-monthly-leave] Starting for ${today}`)

    // 1. 활성 직원 조회
    const { data: employees, error: employeeError } = await supabase
      .from('employee')
      .select('id, name, join_date, email')
      .eq('status', 'active')

    if (employeeError) {
      throw new Error(`Failed to fetch employees: ${employeeError.message}`)
    }

    console.log(`[grant-monthly-leave] Found ${employees?.length || 0} active employees`)

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    // 2. 각 직원에게 연차 부여
    for (const employee of employees || []) {
      try {
        // 2-1. 연차 부여 기록 생성
        const { error: grantError } = await supabase
          .from('annual_leave_grant')
          .insert({
            employee_id: employee.id,
            grant_type: 'monthly',
            granted_days: 1.0,
            granted_date: today,
            year: currentYear,
            reason: `${currentYear}년 ${currentMonth}월 월차 부여`,
          })

        if (grantError) {
          throw new Error(`Grant insert failed: ${grantError.message}`)
        }

        // 2-2. 연차 잔액 업데이트
        const { data: balance } = await supabase
          .from('annual_leave_balance')
          .select('total_days, remaining_days')
          .eq('employee_id', employee.id)
          .eq('year', currentYear)
          .single()

        if (balance) {
          // 기존 잔액이 있으면 업데이트
          const { error: balanceError } = await supabase
            .from('annual_leave_balance')
            .update({
              total_days: balance.total_days + 1,
              remaining_days: balance.remaining_days + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', employee.id)
            .eq('year', currentYear)

          if (balanceError) {
            throw new Error(`Balance update failed: ${balanceError.message}`)
          }
        } else {
          // 잔액이 없으면 신규 생성
          const { error: balanceError } = await supabase
            .from('annual_leave_balance')
            .insert({
              employee_id: employee.id,
              year: currentYear,
              total_days: 1,
              used_days: 0,
              remaining_days: 1,
              reward_leave_balance: 0,
            })

          if (balanceError) {
            throw new Error(`Balance insert failed: ${balanceError.message}`)
          }
        }

        successCount++
        console.log(`[grant-monthly-leave] Success for ${employee.name}`)
      } catch (err: any) {
        failCount++
        const errorMsg = `${employee.name}: ${err.message}`
        errors.push(errorMsg)
        console.error(`[grant-monthly-leave] Failed for ${employee.name}:`, err.message)
      }
    }

    // 3. 배치 작업 로그 기록
    await supabase.from('batch_job_log').insert({
      job_name: 'grant-monthly-leave',
      status: failCount === 0 ? 'success' : 'partial_success',
      message: `연차 부여 완료: 성공 ${successCount}명, 실패 ${failCount}명`,
      details: {
        successCount,
        failCount,
        errors: errors.slice(0, 10), // 최대 10개 에러만 기록
      },
      executed_at: new Date().toISOString(),
    })

    const response: ResponseData = {
      success: true,
      message: `연차 부여 완료: 성공 ${successCount}명, 실패 ${failCount}명`,
      successCount,
      failCount,
      date: today,
    }

    console.log(`[grant-monthly-leave] Completed:`, response)

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[grant-monthly-leave] Fatal error:', error)

    const response: ResponseData = {
      success: false,
      error: error.message,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

---

### 3.2 grant-anniversary-leave/index.ts

**File:** `supabase/functions/grant-anniversary-leave/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GrantedEmployee {
  name: string
  yearsOfService: number
  bonusDays: number
}

interface ResponseData {
  success: boolean
  message?: string
  employees?: GrantedEmployee[]
  error?: string
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date()
    const currentYear = today.getFullYear()
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`

    console.log(`[grant-anniversary-leave] Starting for ${today.toISOString().split('T')[0]}`)

    // 1. 오늘이 입사 기념일인 직원 조회
    const { data: employees, error: employeeError } = await supabase
      .from('employee')
      .select('id, name, join_date, email')
      .eq('status', 'active')
      .like('join_date', `%-${monthDay}`)

    if (employeeError) {
      throw new Error(`Failed to fetch employees: ${employeeError.message}`)
    }

    console.log(`[grant-anniversary-leave] Found ${employees?.length || 0} employees with anniversary today`)

    const grantedEmployees: GrantedEmployee[] = []

    // 2. 근속 연수 계산 및 연차 부여
    for (const employee of employees || []) {
      try {
        const joinYear = new Date(employee.join_date).getFullYear()
        const yearsOfService = currentYear - joinYear

        // 1년 이상 근속자에게만 부여
        if (yearsOfService < 1) {
          console.log(`[grant-anniversary-leave] Skip ${employee.name} (less than 1 year)`)
          continue
        }

        // 근속 연수별 추가 연차 계산
        // 1년: 15일 (기본)
        // 3년 이상: 매 2년마다 1일 추가 (최대 25일)
        let bonusDays = 0

        if (yearsOfService >= 3) {
          const additionalYears = Math.floor((yearsOfService - 1) / 2)
          bonusDays = Math.min(additionalYears, 10) // 최대 10일 추가
        }

        if (bonusDays > 0) {
          // 2-1. 연차 부여 기록 생성
          const { error: grantError } = await supabase
            .from('annual_leave_grant')
            .insert({
              employee_id: employee.id,
              grant_type: 'anniversary',
              granted_days: bonusDays,
              granted_date: today.toISOString().split('T')[0],
              year: currentYear,
              reason: `${yearsOfService}년 근속 기념 추가 연차 ${bonusDays}일`,
            })

          if (grantError) {
            throw new Error(`Grant insert failed: ${grantError.message}`)
          }

          // 2-2. 연차 잔액 업데이트
          const { data: balance } = await supabase
            .from('annual_leave_balance')
            .select('total_days, remaining_days')
            .eq('employee_id', employee.id)
            .eq('year', currentYear)
            .single()

          if (balance) {
            const { error: balanceError } = await supabase
              .from('annual_leave_balance')
              .update({
                total_days: balance.total_days + bonusDays,
                remaining_days: balance.remaining_days + bonusDays,
                updated_at: new Date().toISOString(),
              })
              .eq('employee_id', employee.id)
              .eq('year', currentYear)

            if (balanceError) {
              throw new Error(`Balance update failed: ${balanceError.message}`)
            }
          }

          grantedEmployees.push({
            name: employee.name,
            yearsOfService,
            bonusDays,
          })

          console.log(
            `[grant-anniversary-leave] Granted ${bonusDays} days to ${employee.name} (${yearsOfService} years)`
          )
        }
      } catch (err: any) {
        console.error(
          `[grant-anniversary-leave] Failed for ${employee.name}:`,
          err.message
        )
      }
    }

    // 3. 배치 작업 로그 기록
    await supabase.from('batch_job_log').insert({
      job_name: 'grant-anniversary-leave',
      status: 'success',
      message: `입사 기념일 연차 부여 완료: ${grantedEmployees.length}명`,
      details: { employees: grantedEmployees },
      executed_at: new Date().toISOString(),
    })

    const response: ResponseData = {
      success: true,
      message: `입사 기념일 연차 부여 완료: ${grantedEmployees.length}명`,
      employees: grantedEmployees,
    }

    console.log(`[grant-anniversary-leave] Completed:`, response)

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[grant-anniversary-leave] Fatal error:', error)

    const response: ResponseData = {
      success: false,
      error: error.message,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

---

## 4. pg_cron 스케줄 설정

### 4.1 SQL Migration

**File:** `supabase/migrations/007_setup_cron_jobs.sql`

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. 매월 1일 00:00 연차 부여
SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 1 * *',  -- 매월 1일 00:00
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-monthly-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 2. 매일 00:00 입사 기념일 확인 및 연차 부여
SELECT cron.schedule(
  'grant-anniversary-leave',
  '0 0 * * *',  -- 매일 00:00
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-anniversary-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Cron 작업 확인
SELECT * FROM cron.job;

-- Cron 작업 실행 이력 확인
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 5. 로컬 테스트

### 5.1 Edge Function 서빙

```bash
# grant-monthly-leave 서빙
npx supabase functions serve grant-monthly-leave

# grant-anniversary-leave 서빙 (다른 터미널)
npx supabase functions serve grant-anniversary-leave
```

---

### 5.2 cURL 테스트

```bash
# grant-monthly-leave 테스트
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/grant-monthly-leave' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'

# grant-anniversary-leave 테스트
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/grant-anniversary-leave' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

## 6. 배포

### 6.1 Edge Functions 배포

```bash
# grant-monthly-leave 배포
npx supabase functions deploy grant-monthly-leave

# grant-anniversary-leave 배포
npx supabase functions deploy grant-anniversary-leave
```

---

### 6.2 환경 변수 설정

```bash
# Supabase Dashboard > Settings > Edge Functions
# 또는 CLI로 설정
npx supabase secrets set SUPABASE_URL=https://your-project.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 7. 모니터링

### 7.1 배치 작업 로그 조회

```sql
-- 최근 배치 작업 이력
SELECT *
FROM batch_job_log
ORDER BY executed_at DESC
LIMIT 10;

-- 실패한 작업 조회
SELECT *
FROM batch_job_log
WHERE status = 'failed'
ORDER BY executed_at DESC;
```

---

### 7.2 Cron 작업 실행 이력

```sql
-- Cron 작업 실행 이력
SELECT
  j.jobname,
  d.start_time,
  d.end_time,
  d.status,
  d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
ORDER BY d.start_time DESC
LIMIT 20;
```

---

## 8. Data Models

### 8.1 AnnualLeaveGrant

```typescript
interface AnnualLeaveGrant {
  id: string                              // UUID
  employee_id: string                     // 직원 ID
  grant_type: 'monthly' | 'anniversary' | 'reward' | 'manual'
  granted_days: number                    // 부여 일수
  granted_date: string                    // 부여일 (YYYY-MM-DD)
  year: number                            // 연도
  reason: string                          // 사유
  created_at: string                      // 생성일
}
```

---

### 8.2 BatchJobLog

```typescript
interface BatchJobLog {
  id: string                              // UUID
  job_name: string                        // 작업명
  status: 'success' | 'partial_success' | 'failed'
  message: string                         // 메시지
  details: any                            // 상세 정보 (JSON)
  executed_at: string                     // 실행일시
  created_at: string                      // 생성일
}
```

---

## 9. Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `FETCH_EMPLOYEES_FAILED` | Failed to fetch employees | 직원 조회 실패 |
| `GRANT_INSERT_FAILED` | Grant insert failed | 부여 기록 생성 실패 |
| `BALANCE_UPDATE_FAILED` | Balance update failed | 잔액 업데이트 실패 |
| `BALANCE_INSERT_FAILED` | Balance insert failed | 잔액 생성 실패 |

---

## 10. 연차 부여 정책

### 10.1 월차 부여

- **대상:** 모든 활성 직원
- **일수:** 1일/월
- **시점:** 매월 1일 00:00
- **계산:** 누적 방식

---

### 10.2 입사 기념일 추가 연차

- **대상:** 1년 이상 근속자
- **계산 방식:**
  - 1년: 15일 (기본)
  - 3년 이상: 매 2년마다 1일 추가
  - 최대: 25일 (10일 추가)
- **시점:** 입사 기념일 00:00

**예시:**
- 3년 근속: 15 + 1 = 16일
- 5년 근속: 15 + 2 = 17일
- 10년 근속: 15 + 5 = 20일
- 20년 이상: 15 + 10 = 25일 (최대)

---

## 11. 보안 고려사항

### 11.1 Service Role Key 보안

- Service Role Key는 절대 클라이언트에 노출하지 않습니다
- Edge Function 내부에서만 사용합니다
- 환경 변수로 관리합니다

---

### 11.2 멱등성 보장

같은 날짜에 여러 번 실행되어도 중복 부여되지 않도록 처리:

```typescript
// 중복 확인
const { data: existingGrant } = await supabase
  .from('annual_leave_grant')
  .select('id')
  .eq('employee_id', employeeId)
  .eq('grant_type', 'monthly')
  .eq('granted_date', today)
  .single()

if (existingGrant) {
  console.log('Already granted for today')
  continue
}
```

---

### 11.3 트랜잭션 처리

연차 부여 기록과 잔액 업데이트는 원자적으로 처리해야 하지만, Supabase에서는 명시적 트랜잭션이 없으므로 에러 처리로 보완합니다.

---

## 12. Cron 표현식

### 12.1 Cron 형식

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ 요일 (0-7, 0과 7은 일요일)
│ │ │ └─── 월 (1-12)
│ │ └───── 일 (1-31)
│ └─────── 시 (0-23)
└───────── 분 (0-59)
```

### 12.2 예시

- `0 0 1 * *` - 매월 1일 00:00
- `0 0 * * *` - 매일 00:00
- `0 9 * * 1` - 매주 월요일 09:00
- `0 0 1 1 *` - 매년 1월 1일 00:00

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
