# Must Access - Edge Functions 문서

**작성일:** 2025-01-24
**프로젝트:** Must Access (HR/GA 통합 관리 시스템)

---

## 개요

이 문서는 Must Access 프로젝트에서 사용하는 Supabase Edge Functions의 전체 목록과 상세 정보를 정리합니다.

**Edge Functions 개수:** 14개
**위치:** `/supabase/functions/`
**실행 환경:** Deno Runtime

---

## Edge Functions 목록

### 1. 휴가 관리 (Leave Management)

#### 1.1 approve-leave-request
**목적:** 휴가 신청 승인 처리

**입력 파라미터:**
- `leaveRequestId` (number): 휴가 신청 ID

**주요 기능:**
- 휴가 신청 상태를 'approved'로 변경
- 승인자 정보 기록
- 다음 승인 단계로 진행 또는 최종 승인 처리

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

#### 1.2 reject-leave-request
**목적:** 휴가 신청 거절 처리

**입력 파라미터:**
- `leaveRequestId` (number): 휴가 신청 ID
- `rejectReason` (string): 거절 사유

**주요 기능:**
- 휴가 신청 상태를 'rejected'로 변경
- 거절 사유 기록
- 승인 프로세스 중단

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

#### 1.3 deduct-leave-balance
**목적:** 승인된 휴가 신청에 대한 연차 차감 처리

**입력 파라미터:**
- `requestId` (number): 휴가 신청 ID

**주요 기능:**
- FIFO 방식으로 연차 차감
- annual_leave_usage 테이블에 사용 기록 생성
- annual_leave_balance 업데이트

**실행 방식:** API 호출 (승인 완료 후 자동 호출)
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

#### 1.4 grant-reward-leave
**목적:** 포상 휴가 부여 (수동)

**입력 파라미터:**
- `employeeId` (string): 직원 ID (UUID)
- `days` (number): 부여할 휴가 일수
- `reason` (string): 부여 사유

**주요 기능:**
- 포상 휴가 부여 기록 생성
- 유효기간 설정 (1년)
- annual_leave_balance 업데이트

**실행 방식:** API 호출
**인증:** Required (Authorization header, 관리자 권한)
**상태:** ✅ 구현 완료

---

#### 1.5 grant-monthly-leave
**목적:** 매월 1일 자동 연차 부여 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- 활성 직원에게 월간 연차 부여 (1일)
- 입사 기념일인 경우 비례 연차 추가 부여
- 유효기간 설정 (1년)
- annual_leave_grant 테이블에 기록

**실행 방식:** Cron (매월 1일 00:00)
**인증:** Not required (Cron job)
**상태:** ✅ 구현 완료

---

#### 1.6 grant-attendance-award
**목적:** 분기별 만근 포상휴가 계산 및 부여 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- 이전 분기 근태 기록 조회
- 만근 여부 판단 (지각 2회 이하)
- 만근 직원에게 포상 휴가 0.5일 부여
- attendance_award 테이블에 기록

**실행 방식:** Cron (분기 첫날: 1/1, 4/1, 7/1, 10/1)
**인증:** Not required (Cron job)
**상태:** ✅ 구현 완료

---

#### 1.7 get-leave-management-data
**목적:** 휴가 관리 데이터 조회 (대시보드용)

**입력 파라미터:**
- `employeeId` (string, optional): 특정 직원 조회

**주요 기능:**
- 연차 잔액 조회
- 휴가 신청 내역 조회
- 사용 내역 조회
- 포상 휴가 내역 조회

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

### 2. 승인 프로세스 (Approval Process)

#### 2.1 create-approval-steps
**목적:** 문서/휴가 신청 시 승인 단계 생성

**입력 파라미터:**
- `requestType` (string): 요청 타입 ('leave', 'document', etc.)
- `requestId` (number): 요청 ID
- `approverIds` (string[]): 승인자 ID 배열 (순서대로)

**주요 기능:**
- approval_step 테이블에 승인 단계 생성
- 첫 번째 승인자 상태를 'pending'으로 설정
- 나머지는 'waiting'으로 설정
- 마지막 단계에 is_last_step 플래그 설정

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

#### 2.2 get-approval-steps
**목적:** 특정 요청의 승인 단계 조회

**입력 파라미터:**
- `requestType` (string): 요청 타입
- `requestId` (number): 요청 ID

**주요 기능:**
- approval_step 조회
- 승인자 정보 포함 (employee join)
- 승인 진행 상태 반환

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

### 3. 좌석/예약 관리 (Seat & Booking)

#### 3.1 get-my-bookings
**목적:** 내 예약 목록 조회 (회의실, 좌석 등)

**입력 파라미터:**
- `employeeId` (string): 직원 ID (UUID)

**주요 기능:**
- 회의실 예약 조회
- 좌석 예약 조회
- 향후 예약 및 과거 예약 구분

**실행 방식:** API 호출
**인증:** Required (Authorization header)
**상태:** ✅ 구현 완료

---

#### 3.2 auto-release-seats
**목적:** 퇴근 시간 이후 자동 좌석 반납 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- 당일 좌석 예약 조회
- 퇴근 시간 지난 예약 자동 반납
- seat_reservation 상태 업데이트

**실행 방식:** Cron (매일 20:00)
**인증:** Not required (Cron job)
**상태:** ❌ 미구현 (폴더만 존재)

---

### 4. 근태 관리 (Attendance)

#### 4.1 sync-hubstaff-attendance
**목적:** Hubstaff API에서 근태 데이터 동기화 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- Hubstaff API 호출
- 근태 데이터 가져오기
- attendance 테이블에 저장/업데이트

**실행 방식:** Cron (매시간 또는 매일)
**인증:** Not required (Cron job)
**상태:** ❌ 미구현 (폴더만 존재)

---

#### 4.2 detect-attendance-anomaly
**목적:** 근태 편차 감지 및 알림 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- Hubstaff 근태와 Biostar2 출입 기록 비교
- 15분 이상 편차 발생 시 관리자 알림
- Slack으로 알림 발송

**실행 방식:** Cron (매일 20:00)
**인증:** Not required (Cron job)
**상태:** ❌ 미구현 (폴더만 존재)

---

#### 4.3 daily-attendance-report
**목적:** 일일 근태 리포트 생성 및 Slack 발송 (Cron)

**입력 파라미터:** 없음 (Cron 자동 실행)

**주요 기능:**
- 당일 출근/지각/결근 현황 집계
- Slack으로 일일 리포트 발송
- 특이사항 하이라이트

**실행 방식:** Cron (매일 09:30)
**인증:** Not required (Cron job)
**상태:** ❌ 미구현 (폴더만 존재)

---

## 사용 방법

### 로컬 개발

```bash
# 모든 Edge Functions 서빙
npm run edge:serve

# 특정 함수만 서빙
supabase functions serve approve-leave-request --env-file .env.local
```

### API 호출 예시

```bash
# approve-leave-request 호출
curl -X POST http://127.0.0.1:54321/functions/v1/approve-leave-request \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"leaveRequestId": 123}'

# get-my-bookings 호출
curl -X POST http://127.0.0.1:54321/functions/v1/get-my-bookings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "uuid-here"}'
```

### 배포

```bash
# 모든 함수 배포
supabase functions deploy

# 특정 함수만 배포
supabase functions deploy approve-leave-request
```

---

## 구현 상태 요약

| 함수 | 상태 | 비고 |
|------|------|------|
| approve-leave-request | ✅ 완료 | 휴가 승인 |
| reject-leave-request | ✅ 완료 | 휴가 거절 |
| create-approval-steps | ✅ 완료 | 승인 단계 생성 |
| get-approval-steps | ✅ 완료 | 승인 단계 조회 |
| deduct-leave-balance | ✅ 완료 | 연차 차감 |
| grant-reward-leave | ✅ 완료 | 포상 휴가 부여 |
| get-leave-management-data | ✅ 완료 | 휴가 데이터 조회 |
| get-my-bookings | ✅ 완료 | 예약 조회 |
| grant-monthly-leave | ✅ 완료 | 월간 연차 부여 (Cron) |
| grant-attendance-award | ✅ 완료 | 출석 포상 (Cron) |
| auto-release-seats | ❌ 미구현 | 폴더만 존재 |
| sync-hubstaff-attendance | ❌ 미구현 | 폴더만 존재 |
| detect-attendance-anomaly | ❌ 미구현 | 폴더만 존재 |
| daily-attendance-report | ❌ 미구현 | 폴더만 존재 |

**구현 완료:** 10개
**미구현 (폴더만):** 4개

---

## Cron 작업 설정

Supabase의 pg_cron 확장을 사용하여 정기 실행:

```sql
-- 매월 1일 00:00 - 월간 연차 부여
SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 1 * *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/grant-monthly-leave',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);

-- 분기 첫날 00:00 - 출석 포상 부여
SELECT cron.schedule(
  'grant-attendance-award',
  '0 0 1 1,4,7,10 *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/grant-attendance-award',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);
```

---

## 보안 고려사항

1. **인증:** API 함수는 Authorization 헤더 필수
2. **권한 검증:** 함수 내부에서 사용자 권한 확인
3. **RLS:** Supabase RLS 정책과 함께 동작
4. **Service Role Key:** Cron 작업은 service_role key 사용
5. **CORS:** 모든 함수에 CORS 헤더 설정

---

## 참고 자료

- **Supabase Functions 문서:** https://supabase.com/docs/guides/functions
- **Deno 런타임:** https://deno.land/
- **pg_cron 설정:** https://supabase.com/docs/guides/database/extensions/pg_cron

---

## 변경 이력

- **2025-01-24:** 초기 문서 작성 (14개 함수 정리)
