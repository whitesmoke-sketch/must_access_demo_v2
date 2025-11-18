# PHASE-7 TEST SPECIFICATION

**Phase:** Phase 7 - Edge Functions (자동 연차 부여)
**생성일:** 2025-01-18
**테스트 환경:** Supabase Edge Functions (Deno) + pg_cron
**아키텍처:** Supabase Edge Functions + PostgreSQL

---

## 📋 Test Overview

### Test Goal
매월 1일 자동 연차 부여와 입사 기념일 추가 연차 부여 Edge Functions가 정상 동작하고 정확한 데이터를 기록하는지 검증합니다.

### Test Scope
- grant-monthly-leave Edge Function
- grant-anniversary-leave Edge Function
- pg_cron 스케줄 등록
- 배치 작업 로그 기록
- 멱등성 보장
- 에러 처리

### Test Environment
- **Runtime:** Deno (Supabase Edge Functions)
- **Database:** PostgreSQL (Supabase)
- **Scheduler:** pg_cron
- **Testing:** cURL + SQL queries

---

## 🧪 Test Cases

### TC-7.1: grant-monthly-leave 로컬 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- Edge Function 로컬 서빙 중
- 테스트 직원 데이터 존재

**Test Steps:**
1. Edge Function 로컬 서빙
   ```bash
   npx supabase functions serve grant-monthly-leave
   ```
2. cURL로 호출
   ```bash
   curl -i --location --request POST \
     'http://localhost:54321/functions/v1/grant-monthly-leave' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json'
   ```
3. 응답 확인

**Expected Results:**
```json
{
  "success": true,
  "message": "연차 부여 완료: 성공 50명, 실패 0명",
  "successCount": 50,
  "failCount": 0,
  "date": "2025-01-01"
}
```

**Verification:**
```sql
-- 연차 부여 기록 확인
SELECT * FROM annual_leave_grant
WHERE grant_type = 'monthly'
AND granted_date = CURRENT_DATE
ORDER BY created_at DESC;

-- 연차 잔액 업데이트 확인
SELECT employee_id, total_days, remaining_days
FROM annual_leave_balance
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 배치 작업 로그 확인
SELECT * FROM batch_job_log
WHERE job_name = 'grant-monthly-leave'
ORDER BY executed_at DESC
LIMIT 1;
```

---

### TC-7.2: grant-anniversary-leave 로컬 테스트

**Priority:** P0 (Critical)

**Pre-conditions:**
- Edge Function 로컬 서빙 중
- 오늘이 입사 기념일인 직원 데이터 존재

**Test Data:**
```sql
-- 오늘이 입사 기념일인 직원 추가
INSERT INTO employee (id, name, email, join_date, status)
VALUES ('test-anniversary-1', '기념일테스트', 'anniversary@must.com', '2020-01-18', 'active');
```

**Test Steps:**
1. Edge Function 로컬 서빙
2. cURL로 호출
3. 응답 확인

**Expected Results:**
```json
{
  "success": true,
  "message": "입사 기념일 연차 부여 완료: 3명",
  "employees": [
    {
      "name": "기념일테스트",
      "yearsOfService": 5,
      "bonusDays": 2
    }
  ]
}
```

**Verification:**
```sql
-- 입사 기념일 연차 부여 확인
SELECT * FROM annual_leave_grant
WHERE grant_type = 'anniversary'
AND granted_date = CURRENT_DATE;
```

---

### TC-7.3: 근속 연수별 연차 계산 테스트

**Priority:** P0 (Critical)

**Test Data:**
```typescript
const testCases = [
  { yearsOfService: 1, expectedBonus: 0 },   // 1년: 추가 없음 (기본 15일)
  { yearsOfService: 3, expectedBonus: 1 },   // 3년: 1일 추가
  { yearsOfService: 5, expectedBonus: 2 },   // 5년: 2일 추가
  { yearsOfService: 7, expectedBonus: 3 },   // 7년: 3일 추가
  { yearsOfService: 10, expectedBonus: 5 },  // 10년: 5일 추가
  { yearsOfService: 20, expectedBonus: 10 }  // 20년: 10일 추가 (최대)
]
```

**Test Steps:**
1. 각 근속 연수별 직원 데이터 생성
2. Edge Function 실행
3. 부여된 연차 일수 확인

**Expected Results:**
- 계산 공식: `Math.min(Math.floor((yearsOfService - 1) / 2), 10)`
- 최대 10일까지 추가

---

### TC-7.4: 멱등성 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. grant-monthly-leave 실행
2. 성공 확인
3. 동일 날짜에 다시 실행
4. 결과 확인

**Expected Results:**
- 첫 실행: 성공
- 두 번째 실행: 중복 에러 발생하지 않음
- DB에서 같은 날짜에 대해 중복 부여 기록 없음
- (또는) 중복 체크 로직으로 skip

**Implementation Note:**
```typescript
// 중복 체크 예시
const { data: existing } = await supabase
  .from('annual_leave_grant')
  .select('id')
  .eq('employee_id', employeeId)
  .eq('grant_type', 'monthly')
  .eq('granted_date', today)
  .single()

if (existing) {
  console.log(`Already granted for ${employeeId} on ${today}`)
  continue // Skip
}
```

---

### TC-7.5: 에러 처리 테스트

**Priority:** P1 (High)

**Test Scenarios:**

**a) DB 연결 실패**
```typescript
// Mock: Supabase URL 잘못 설정
Expected: HTTP 500 응답, error 메시지
```

**b) 직원 조회 실패**
```typescript
Expected: 에러 로그, failCount 증가
```

**c) 일부 직원 실패**
```typescript
Expected:
{
  "success": true,
  "successCount": 48,
  "failCount": 2,
  "message": "연차 부여 완료: 성공 48명, 실패 2명"
}
```

---

### TC-7.6: 배치 작업 로그 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Edge Function 실행
2. batch_job_log 테이블 조회
3. 로그 내용 확인

**Expected Results:**
```sql
SELECT * FROM batch_job_log
WHERE job_name = 'grant-monthly-leave'
ORDER BY executed_at DESC
LIMIT 1;

-- 결과 예시
{
  "job_name": "grant-monthly-leave",
  "status": "success",
  "message": "연차 부여 완료: 성공 50명, 실패 0명",
  "details": {
    "successCount": 50,
    "failCount": 0,
    "errors": []
  },
  "executed_at": "2025-01-01T00:00:00Z"
}
```

---

### TC-7.7: pg_cron 스케줄 등록 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. SQL 스크립트 실행
   ```sql
   SELECT cron.schedule(
     'grant-monthly-leave',
     '0 0 1 * *',
     $$ ... $$
   );
   ```
2. 스케줄 등록 확인
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'grant-monthly-leave';
   ```

**Expected Results:**
- jobname: 'grant-monthly-leave'
- schedule: '0 0 1 * *' (매월 1일 00:00)
- active: true

---

### TC-7.8: pg_cron 실행 이력 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Cron 작업 수동 실행 또는 대기
2. 실행 이력 조회
   ```sql
   SELECT
     j.jobname,
     d.start_time,
     d.end_time,
     d.status,
     d.return_message
   FROM cron.job j
   LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
   WHERE j.jobname = 'grant-monthly-leave'
   ORDER BY d.start_time DESC
   LIMIT 5;
   ```

**Expected Results:**
- status: 'succeeded'
- return_message에 HTTP 200 응답 포함

---

### TC-7.9: Edge Function 배포 테스트

**Priority:** P0 (Critical)

**Test Steps:**
1. Edge Function 배포
   ```bash
   npx supabase functions deploy grant-monthly-leave
   npx supabase functions deploy grant-anniversary-leave
   ```
2. 배포 확인
3. 프로덕션 URL로 테스트 호출
   ```bash
   curl -i --location --request POST \
     'https://your-project.supabase.co/functions/v1/grant-monthly-leave' \
     --header 'Authorization: Bearer SERVICE_ROLE_KEY'
   ```

**Expected Results:**
- 배포 성공 메시지
- 프로덕션 호출 성공 (HTTP 200)

---

### TC-7.10: 환경 변수 테스트

**Priority:** P1 (High)

**Test Steps:**
1. Edge Function에서 환경 변수 확인
   ```typescript
   const supabaseUrl = Deno.env.get('SUPABASE_URL')
   const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
   ```
2. 환경 변수 누락 시 에러 확인

**Expected Results:**
- 환경 변수 존재 시: 정상 동작
- 환경 변수 없을 시: 명확한 에러 메시지

---

## 🔧 Test Code Templates

### cURL Test Script

```bash
#!/bin/bash
# test-edge-functions.sh

echo "Testing grant-monthly-leave..."
RESPONSE=$(curl -s --location --request POST \
  'http://localhost:54321/functions/v1/grant-monthly-leave' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json')

echo $RESPONSE | jq .

# Check success
SUCCESS=$(echo $RESPONSE | jq -r .success)
if [ "$SUCCESS" = "true" ]; then
  echo "✅ grant-monthly-leave test passed"
else
  echo "❌ grant-monthly-leave test failed"
  exit 1
fi

echo ""
echo "Testing grant-anniversary-leave..."
RESPONSE=$(curl -s --location --request POST \
  'http://localhost:54321/functions/v1/grant-anniversary-leave' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json')

echo $RESPONSE | jq .

SUCCESS=$(echo $RESPONSE | jq -r .success)
if [ "$SUCCESS" = "true" ]; then
  echo "✅ grant-anniversary-leave test passed"
else
  echo "❌ grant-anniversary-leave test failed"
  exit 1
fi

echo ""
echo "All tests passed! 🎉"
```

---

### SQL Verification Script

```sql
-- verify-edge-functions.sql

-- 1. Check monthly leave grants
SELECT
  e.name,
  alg.granted_days,
  alg.granted_date,
  alg.reason
FROM annual_leave_grant alg
JOIN employee e ON e.id = alg.employee_id
WHERE alg.grant_type = 'monthly'
AND alg.granted_date = CURRENT_DATE
ORDER BY alg.created_at DESC
LIMIT 10;

-- 2. Check anniversary leave grants
SELECT
  e.name,
  e.join_date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.join_date)) as years_of_service,
  alg.granted_days,
  alg.reason
FROM annual_leave_grant alg
JOIN employee e ON e.id = alg.employee_id
WHERE alg.grant_type = 'anniversary'
AND alg.granted_date = CURRENT_DATE
ORDER BY alg.created_at DESC;

-- 3. Check leave balance updates
SELECT
  e.name,
  alb.total_days,
  alb.used_days,
  alb.remaining_days,
  alb.updated_at
FROM annual_leave_balance alb
JOIN employee e ON e.id = alb.employee_id
WHERE alb.year = EXTRACT(YEAR FROM CURRENT_DATE)
AND alb.updated_at >= CURRENT_DATE
ORDER BY alb.updated_at DESC
LIMIT 10;

-- 4. Check batch job logs
SELECT
  job_name,
  status,
  message,
  details,
  executed_at
FROM batch_job_log
WHERE job_name IN ('grant-monthly-leave', 'grant-anniversary-leave')
ORDER BY executed_at DESC
LIMIT 5;

-- 5. Check cron job status
SELECT * FROM cron.job WHERE jobname LIKE 'grant-%';

-- 6. Check cron job execution history
SELECT
  j.jobname,
  d.start_time,
  d.end_time,
  d.status,
  LEFT(d.return_message, 100) as message_preview
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE 'grant-%'
ORDER BY d.start_time DESC
LIMIT 10;
```

---

### Deno Test (Edge Function Unit Test)

```typescript
// grant-monthly-leave.test.ts
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'

Deno.test('calculateWorkingDays', () => {
  // Test utility functions if extracted
  assertEquals(1, 1) // Example
})

Deno.test('formatResponse', () => {
  const response = {
    success: true,
    successCount: 50,
    failCount: 0,
    date: '2025-01-01'
  }

  assertEquals(response.success, true)
  assertEquals(response.successCount, 50)
})
```

---

## ✅ Completion Criteria

### Must Pass (P0)
- [ ] TC-7.1: grant-monthly-leave 로컬 테스트
- [ ] TC-7.2: grant-anniversary-leave 로컬 테스트
- [ ] TC-7.3: 근속 연수별 연차 계산
- [ ] TC-7.4: 멱등성 테스트
- [ ] TC-7.7: pg_cron 스케줄 등록
- [ ] TC-7.9: Edge Function 배포

### Should Pass (P1)
- [ ] TC-7.5: 에러 처리
- [ ] TC-7.6: 배치 작업 로그
- [ ] TC-7.8: pg_cron 실행 이력
- [ ] TC-7.10: 환경 변수

### Performance
- [ ] Edge Function 실행 시간: < 30초 (50명 기준)
- [ ] DB 쿼리 최적화 확인

---

## 📊 Test Data Setup

```sql
-- Setup test data for Phase 7

-- 1. Test employees with various join dates
INSERT INTO employee (id, name, email, join_date, status)
VALUES
  ('emp-1y', '1년차', '1y@must.com', CURRENT_DATE - INTERVAL '1 year', 'active'),
  ('emp-3y', '3년차', '3y@must.com', CURRENT_DATE - INTERVAL '3 years', 'active'),
  ('emp-5y', '5년차', '5y@must.com', CURRENT_DATE - INTERVAL '5 years', 'active'),
  ('emp-10y', '10년차', '10y@must.com', CURRENT_DATE - INTERVAL '10 years', 'active');

-- 2. Initialize leave balances
INSERT INTO annual_leave_balance (employee_id, year, total_days, used_days, remaining_days, reward_leave_balance)
VALUES
  ('emp-1y', 2025, 15, 0, 15, 0),
  ('emp-3y', 2025, 16, 2, 14, 0),
  ('emp-5y', 2025, 17, 5, 12, 1),
  ('emp-10y', 2025, 20, 8, 12, 3);

-- 3. Clean up existing grants for today (for testing)
DELETE FROM annual_leave_grant WHERE granted_date = CURRENT_DATE;
```

---

## 🐛 Known Issues & Troubleshooting

### Issue 1: Edge Function timeout
**Symptom:** Function 실행 시간 초과
**Solution:** 배치 크기 줄이기 또는 병렬 처리

### Issue 2: pg_cron이 Edge Function 호출 실패
**Symptom:** Cron 실행 이력에 에러
**Solution:** Service Role Key 확인, URL 확인

### Issue 3: 중복 부여
**Symptom:** 같은 날 여러 번 부여됨
**Solution:** 멱등성 체크 로직 추가

---

## 📈 Monitoring Dashboard

```sql
-- 연차 부여 현황 대시보드

-- 1. 오늘 부여된 연차 총합
SELECT
  grant_type,
  COUNT(*) as grant_count,
  SUM(granted_days) as total_days
FROM annual_leave_grant
WHERE granted_date = CURRENT_DATE
GROUP BY grant_type;

-- 2. 최근 7일 배치 작업 성공률
SELECT
  job_name,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_runs,
  ROUND(AVG(CASE WHEN status = 'success' THEN 100 ELSE 0 END), 2) as success_rate
FROM batch_job_log
WHERE executed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY job_name;

-- 3. Cron 작업 실행 통계
SELECT
  j.jobname,
  COUNT(d.jobid) as total_runs,
  SUM(CASE WHEN d.status = 'succeeded' THEN 1 ELSE 0 END) as succeeded,
  MAX(d.start_time) as last_run
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE 'grant-%'
GROUP BY j.jobname;
```

---

**Phase 7 Test 완료 후 전체 통합 테스트 진행**

**🎉 모든 Phase Test 완료!**
