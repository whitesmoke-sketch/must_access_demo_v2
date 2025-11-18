# Frontend-Backend 통합 연결 규정서

**생성일:** 2025-01-18
**버전:** 1.0
**프로젝트:** MUST Access
**아키텍처:** Option A - 서버리스 풀스택 (Next.js + Supabase)

---

## 📌 문서 목적

본 문서는 **Figma 디자인**과 **Backend 구현**을 정확하게 연결하기 위한 규정서입니다.

### 대상
- 👨‍🎨 **Figma 디자이너**: 디자인 작업 전 필수 확인
- 👨‍💻 **Backend 개발자**: phase-implementer 실행 전 확인
- 👨‍💻 **Frontend 개발자**: 컴포넌트 개발 시 API 매핑 참고
- 🔗 **통합 담당자**: 프론트-백 연결 시 검증 기준

### 특징 (Option A)
본 프로젝트는 **서버리스 풀스택 아키텍처**를 사용하므로:
- ✅ 프론트엔드에서 Supabase 직접 호출
- ✅ RLS(Row Level Security)로 권한 제어
- ✅ Server Components와 Client Components 혼용
- ✅ Server Actions로 데이터 변경
- ✅ Edge Functions로 복잡한 계산 처리

---

## 🗺️ 역할별 화면 구조

### Employee (직원)
```
/dashboard                  사용자 대시보드
  ├─ 근무 상태 카드
  ├─ 연차 요약 카드
  ├─ 퀵 액션
  ├─ 나의 예약 현황
  └─ 결재 현황

/leave/my-leave            내 연차 조회
  ├─ 연차 정보 카드 4개
  └─ 연차 캘린더

/leave/request             연차 신청
  ├─ 날짜 선택
  ├─ 휴가 타입 선택
  └─ 사유 입력
```

### Admin (관리자)
```
/admin/dashboard           관리자 대시보드
  ├─ 근태 현황 차트
  ├─ 좌석 사용 현황 차트
  ├─ 승인 대기 목록
  └─ 이상 상황 알림

/admin/employees           조직구성원 관리
  ├─ 구성원 목록 테이블
  └─ 구성원 추가/수정/삭제 모달

/admin/leave-management    연차 관리
  ├─ 구성원별 연차 현황
  ├─ 승인 대기 목록
  └─ 포상휴가 부여 모달
```

---

## 🎯 기능별 연결 규정

### 기능 1: 로그인

**기능 ID:** AUTH-LOGIN

| 항목 | 내용 |
|------|------|
| **역할** | Public |
| **화면 경로** | / → /login |
| **Figma 화면** | SCRN_AUTH_001 |
| **UI 요소** | 이메일/비밀번호 입력, "로그인" 버튼, "Google로 로그인" 버튼 |
| **Figma 권장 레이어명** | `btn-login`, `btn-google-login`, `input-email`, `input-password` |
| **Supabase API** | `supabase.auth.signInWithPassword()`, `supabase.auth.signInWithOAuth()` |
| **테이블** | `employee` (역할 조회) |
| **권한** | Public |
| **성공 시** | 역할별 리다이렉트 (employee → /dashboard, admin → /admin/dashboard) |

---

### 기능 2: 근무 상태 조회

**기능 ID:** DASH-WORK-STATUS

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 대시보드 > 근무 상태 카드 |
| **Figma 화면** | SCRN_DASH_001 |
| **UI 요소** | 상태 뱃지, 출근 시간, 누적 근무 시간 |
| **Figma 권장 레이어명** | `card-work-status`, `badge-status`, `text-work-hours` |
| **Supabase Query** | `SELECT * FROM attendance WHERE employee_id = ? AND date = ?` |
| **테이블** | `attendance` |
| **RLS 정책** | 본인 근태만 조회 가능 |

---

### 기능 3: 연차 잔액 조회

**기능 ID:** DASH-LEAVE-BALANCE

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 대시보드 > 연차 요약 카드 |
| **Figma 화면** | SCRN_DASH_001 |
| **UI 요소** | 잔여 연차 박스 (보라색), 잔여 포상휴가 박스 (분홍색), 총 연차 부여일 |
| **Figma 권장 레이어명** | `card-leave-balance`, `box-remaining`, `box-reward` |
| **Supabase Query** | `SELECT * FROM annual_leave_balance WHERE employee_id = ? AND year = ?` |
| **테이블** | `annual_leave_balance` |
| **RLS 정책** | 본인 연차만 조회 가능 |

---

### 기능 4: 퀵 액션

**기능 ID:** DASH-QUICK-ACTIONS

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 대시보드 > 퀵 액션 |
| **Figma 화면** | SCRN_DASH_001 |
| **UI 요소** | 회의실 예약 버튼, 좌석 등록 버튼, 결재 문서 버튼 |
| **Figma 권장 레이어명** | `btn-meeting-room`, `btn-seat`, `btn-documents` |
| **동작** | 각 버튼 클릭 시 해당 페이지로 이동 (Link) |
| **테이블** | 없음 (Navigation만) |

---

### 기능 5: 나의 예약 현황

**기능 ID:** DASH-MY-RESERVATIONS

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 대시보드 > 나의 예약 현황 |
| **Figma 화면** | SCRN_DASH_001 |
| **UI 요소** | 좌석명, 시간, 위치 정보 OR "오늘 예약 없음" |
| **Figma 권장 레이어명** | `card-reservations`, `text-no-reservation` |
| **Supabase Query** | `SELECT * FROM seat_reservation WHERE employee_id = ? AND reservation_date = ?` |
| **테이블** | `seat_reservation`, `seat` (JOIN) |
| **RLS 정책** | 본인 예약만 조회 가능 |

---

### 기능 6: 결재 현황

**기능 ID:** DASH-APPROVAL-STATUS

| 항목 | 내용 |
|------|------|
| **역할** | Employee, Admin |
| **화면 경로** | Employee > 대시보드 > 결재 현황 |
| **Figma 화면** | SCRN_DASH_001 |
| **UI 요소** | 내가 요청한 문서 (최근 3건), 결재 대기 문서 (관리자만, 최근 3건) |
| **Figma 권장 레이어명** | `card-approval-status`, `list-my-requests`, `list-pending-approvals` |
| **Supabase Query** | `SELECT * FROM leave_request WHERE employee_id = ? ORDER BY created_at DESC LIMIT 3` |
| **테이블** | `leave_request` |
| **RLS 정책** | 본인 신청 조회, Admin은 모든 신청 조회 |

---

### 기능 7: 근태 현황 차트

**기능 ID:** ADMIN-ATTENDANCE-CHART

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 관리자 대시보드 > 근태 현황 위젯 |
| **Figma 화면** | SCRN_DASH_002 |
| **UI 요소** | 근태 준수율 (%), 지표 카드 3개 (지각/조퇴/결근), Stacked Bar Chart |
| **Figma 권장 레이어명** | `widget-attendance`, `chart-attendance-trend` |
| **Supabase Query** | `SELECT date, status, COUNT(*) FROM attendance WHERE date >= ? GROUP BY date, status` |
| **테이블** | `attendance` |
| **차트 라이브러리** | Recharts (BarChart, Bar) |
| **RLS 정책** | Admin만 조회 가능 |

---

### 기능 8: 좌석 사용 현황 차트

**기능 ID:** ADMIN-SEAT-USAGE-CHART

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 관리자 대시보드 > 좌석 사용 현황 위젯 |
| **Figma 화면** | SCRN_DASH_002 |
| **UI 요소** | 좌석 점유율 (%), Pie Chart, 사용 중인 좌석 목록 (최근 5개) |
| **Figma 권장 레이어명** | `widget-seat-usage`, `chart-seat-pie` |
| **Supabase Query** | `SELECT status, COUNT(*) FROM seat GROUP BY status` |
| **테이블** | `seat`, `seat_reservation` |
| **차트 라이브러리** | Recharts (PieChart, Pie) |
| **RLS 정책** | Admin만 조회 가능 |

---

### 기능 9: 승인 대기 목록

**기능 ID:** ADMIN-APPROVAL-QUEUE

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 관리자 대시보드 > 승인 대기 목록 위젯 |
| **Figma 화면** | SCRN_DASH_002 |
| **UI 요소** | 승인 항목 카드, 승인 버튼 (초록), 반려 버튼 (빨강) |
| **Figma 권장 레이어명** | `widget-approval-queue`, `btn-approve`, `btn-reject` |
| **Supabase Query** | `SELECT * FROM leave_request WHERE status = 'pending'` |
| **Server Action** | `approveLeaveRequest(id)`, `rejectLeaveRequest(id, reason)` |
| **테이블** | `leave_request` |
| **RLS 정책** | Admin만 수정 가능 |

---

### 기능 10: 연차 캘린더

**기능 ID:** LEAVE-CALENDAR

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 내 연차 조회 > 연차 캘린더 |
| **Figma 화면** | SCRN_LEAVE_001 |
| **UI 요소** | 캘린더 그리드, 연차 표시 (멀티데이 처리), 월 이동 버튼, 범례 |
| **Figma 권장 레이어명** | `calendar-leave`, `cell-date`, `btn-prev-month`, `btn-next-month` |
| **Supabase Query** | `SELECT * FROM leave_request WHERE employee_id = ? AND start_date >= ? AND end_date <= ?` |
| **테이블** | `leave_request` |
| **특수 처리** | 멀티데이 연차 (시작일/중간일/종료일 스타일 분리) |

---

### 기능 11: 연차 신청

**기능 ID:** LEAVE-REQUEST

| 항목 | 내용 |
|------|------|
| **역할** | Employee |
| **화면 경로** | Employee > 연차 신청 |
| **Figma 화면** | 신규 화면 |
| **UI 요소** | 날짜 선택 (시작일/종료일), 휴가 타입 선택, 사유 입력, 신청 버튼 |
| **Figma 권장 레이어명** | `form-leave-request`, `input-start-date`, `select-leave-type`, `btn-submit` |
| **Server Action** | `submitLeaveRequest(formData)` |
| **테이블** | `leave_request` (INSERT) |
| **유효성 검증** | 잔여 연차 확인, 날짜 유효성, 중복 신청 방지 |

---

### 기능 12: 조직구성원 추가

**기능 ID:** ORG-MEMBER-ADD

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 조직구성원 관리 |
| **Figma 화면** | SCRN_USER_001 |
| **UI 요소** | "구성원 추가 +" 버튼, 추가 모달 (이름, 이메일, 부서, 팀, 직급, 역할, 입사일) |
| **Figma 권장 레이어명** | `btn-add-employee`, `modal-employee-form` |
| **Server Action** | `addEmployee(formData)` |
| **테이블** | `employee` (INSERT) |
| **자동 처리** | 초기 연차 잔액 생성 (`annual_leave_balance`) |

---

### 기능 13: 조직구성원 수정

**기능 ID:** ORG-MEMBER-EDIT

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 조직구성원 관리 > 수정 아이콘 클릭 |
| **Figma 화면** | SCRN_USER_001 |
| **UI 요소** | Edit 아이콘 버튼, 수정 모달 |
| **Figma 권장 레이어명** | `btn-edit-employee`, `modal-employee-edit` |
| **Server Action** | `updateEmployee(id, formData)` |
| **테이블** | `employee` (UPDATE) |

---

### 기능 14: 조직구성원 삭제

**기능 ID:** ORG-MEMBER-DELETE

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 조직구성원 관리 > 삭제 아이콘 클릭 |
| **Figma 화면** | SCRN_USER_001 |
| **UI 요소** | Trash2 아이콘 버튼, 삭제 확인 모달 |
| **Figma 권장 레이어명** | `btn-delete-employee`, `modal-confirm-delete` |
| **Server Action** | `deleteEmployee(id)` |
| **테이블** | `employee` (UPDATE status = 'inactive') |
| **처리 방식** | Soft Delete (완전 삭제 아님) |

---

### 기능 15: 연차 승인

**기능 ID:** LEAVE-APPROVE

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 연차 관리 > 승인 대기 목록 > 승인 버튼 |
| **Figma 화면** | SCRN_LEAVE_002 |
| **UI 요소** | 승인 버튼 (초록색 배경, Check 아이콘) |
| **Figma 권장 레이어명** | `btn-approve-leave` |
| **Server Action** | `approveLeaveRequest(id)` |
| **테이블** | `leave_request` (UPDATE status = 'approved'), `annual_leave_usage` (INSERT) |
| **자동 처리** | FIFO 방식 연차 차감 |

---

### 기능 16: 연차 반려

**기능 ID:** LEAVE-REJECT

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 연차 관리 > 승인 대기 목록 > 반려 버튼 |
| **Figma 화면** | SCRN_LEAVE_002 |
| **UI 요소** | 반려 버튼 (빨간색 보더, X 아이콘), 반려 사유 입력 모달 |
| **Figma 권장 레이어명** | `btn-reject-leave`, `modal-reject-reason` |
| **Server Action** | `rejectLeaveRequest(id, reason)` |
| **테이블** | `leave_request` (UPDATE status = 'rejected', rejected_reason) |
| **필수 입력** | 반려 사유 (required) |

---

### 기능 17: 포상휴가 부여

**기능 ID:** LEAVE-GRANT-REWARD

| 항목 | 내용 |
|------|------|
| **역할** | Admin |
| **화면 경로** | Admin > 연차 관리 > "포상휴가 부여" 버튼 |
| **Figma 화면** | SCRN_LEAVE_002 |
| **UI 요소** | "포상휴가 부여" 버튼 (Gift 아이콘), 부여 모달 (대상자, 일수, 사유, 첨부파일) |
| **Figma 권장 레이어명** | `btn-grant-reward`, `modal-reward-grant` |
| **Server Action** | `grantRewardLeave(employeeId, days, reason, file)` |
| **테이블** | `annual_leave_grant` (INSERT) |
| **처리 방식** | 즉시 부여 (승인 프로세스 없음) |

---

### 기능 18: 자동 연차 부여 (매월 1일)

**기능 ID:** EDGE-MONTHLY-GRANT

| 항목 | 내용 |
|------|------|
| **역할** | System (Cron) |
| **실행 시점** | 매월 1일 00:00 |
| **Edge Function** | `grant-monthly-leave` |
| **처리 로직** | 전체 활성 직원에게 연차 1일 부여 |
| **테이블** | `employee` (SELECT), `annual_leave_grant` (INSERT) |
| **스케줄** | pg_cron: `0 0 1 * *` |

---

### 기능 19: 입사 기념일 연차 부여

**기능 ID:** EDGE-ANNIVERSARY-GRANT

| 항목 | 내용 |
|------|------|
| **역할** | System (Cron) |
| **실행 시점** | 매일 00:00 (입사 기념일 확인) |
| **Edge Function** | `grant-anniversary-leave` |
| **처리 로직** | 근속 연수에 따라 추가 연차 부여 (3년 이상: 매 2년마다 1일) |
| **테이블** | `employee` (SELECT), `annual_leave_grant` (INSERT) |
| **스케줄** | pg_cron: `0 0 * * *` |

---

## 📊 유사 기능 비교표

### "조회" 기능 비교

| 기능 | 기능 ID | 화면 | 테이블 | 조회 대상 | RLS |
|------|---------|------|--------|-----------|-----|
| 내 연차 조회 | LEAVE-MY-BALANCE | /leave/my-leave | annual_leave_balance | 본인만 | 본인만 |
| 구성원 연차 조회 (관리자) | ADMIN-LEAVE-ALL | /admin/leave-management | annual_leave_balance | 전체 | Admin |
| 대시보드 연차 요약 | DASH-LEAVE-BALANCE | /dashboard | annual_leave_balance | 본인만 | 본인만 |

### "추가" 기능 비교

| 기능 | 기능 ID | 화면 | 버튼 텍스트 | Server Action | 테이블 |
|------|---------|------|------------|---------------|--------|
| 조직구성원 추가 | ORG-MEMBER-ADD | /admin/employees | "구성원 추가 +" | addEmployee | employee |
| 연차 신청 | LEAVE-REQUEST | /leave/request | "신청" | submitLeaveRequest | leave_request |
| 포상휴가 부여 | LEAVE-GRANT-REWARD | /admin/leave-management | "포상휴가 부여" | grantRewardLeave | annual_leave_grant |

---

## 🎨 디자이너 가이드

### Figma 레이어 명명 규칙

**페이지:**
- `page-{기능명}` (예: `page-dashboard`, `page-leave-request`)

**카드/위젯:**
- `card-{위젯명}` (예: `card-work-status`, `card-leave-balance`)

**버튼:**
- `btn-{동작}-{대상}` (예: `btn-add-employee`, `btn-approve-leave`)

**입력 필드:**
- `input-{필드명}` (예: `input-email`, `input-start-date`)

**모달:**
- `modal-{모달명}` (예: `modal-employee-form`, `modal-reject-reason`)

### 상태별 색상 가이드

**연차 타입:**
- 연차: #635BFF (보라색)
- 반차: #FFAE1F (노란색)
- 포상휴가: #FF6692 (분홍색)

**승인 상태:**
- 대기: #FEF3C7 (연노랑)
- 승인: #D1FAE5 (연초록)
- 반려: #FEE2E2 (연빨강)

**좌석 상태:**
- 사용가능: #16CDC7 (청록)
- 사용중: #5B6A72 (회색)
- 점검중: #FF6B6B (빨강)

---

## 👨‍💻 Backend 개발자 가이드

### Supabase Client 사용

**Server Component (데이터 조회):**
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('employee').select('*')

  return <div>{/* JSX */}</div>
}
```

**Client Component (인터랙티브):**
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export function Component() {
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('employee').select('*')
    }
    fetchData()
  }, [])
}
```

**Server Action (데이터 변경):**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitForm(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_request')
    .insert({ /* data */ })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
```

### RLS 정책 패턴

**본인만 조회:**
```sql
CREATE POLICY "policy_name"
ON table_name FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**Admin만 조회:**
```sql
CREATE POLICY "policy_name"
ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

---

## 👨‍💻 Frontend 개발자 가이드

### 컴포넌트 구조

**Server Component (추천):**
- 데이터 조회만 필요한 경우
- SEO가 중요한 페이지
- 초기 로딩 속도 중요

**Client Component:**
- 사용자 인터랙션 (onClick, onChange 등)
- useState, useEffect 사용
- Realtime 구독

### 데이터 패칭 패턴

**Server Component:**
```typescript
// app/(authenticated)/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('employee').select('*')

  return <ClientComponent data={data} />
}
```

**Client Component with Server Action:**
```typescript
'use client'

import { submitForm } from './actions'

export function Form() {
  return (
    <form action={submitForm}>
      {/* inputs */}
    </form>
  )
}
```

---

## 🔗 통합 체크리스트

### Phase 0 (인증 및 디자인)
- [ ] Google OAuth 설정 완료
- [ ] 디자인 토큰 Tailwind Config에 적용
- [ ] 모든 색상 변수 정의
- [ ] Protected Route 미들웨어 동작 확인

### Phase 1 (사용자 대시보드)
- [ ] 모든 카드 컴포넌트 Figma 디자인과 일치
- [ ] 데이터 정확성 확인
- [ ] 반응형 그리드 동작 (3열 → 2열 → 1열)

### Phase 2 (관리자 대시보드)
- [ ] Recharts 차트 Figma 디자인과 일치
- [ ] 차트 색상 디자인 토큰 사용
- [ ] 승인/반려 버튼 동작

### Phase 3 (내 연차 조회)
- [ ] 연차 카드 색상 정확성
- [ ] 멀티데이 연차 캘린더 정상 렌더링
- [ ] 범례 표시

### Phase 4 (연차 신청)
- [ ] 날짜 선택 유효성 검증
- [ ] 잔여 연차 실시간 표시
- [ ] 신청 성공 toast

### Phase 5 (조직구성원 관리)
- [ ] 테이블 검색/필터 동작
- [ ] 모달 폼 유효성 검증
- [ ] CRUD 동작 확인

### Phase 6 (연차 관리)
- [ ] 구성원별 연차 현황 정확성
- [ ] 승인/반려 처리 동작
- [ ] 포상휴가 부여 즉시 반영

### Phase 7 (Edge Functions)
- [ ] grant-monthly-leave Function 테스트
- [ ] grant-anniversary-leave Function 테스트
- [ ] pg_cron 스케줄 등록 확인

---

## 🚨 주의사항

### 1. 유사 기능 혼동 방지

**연차 조회 vs 연차 관리:**
- **연차 조회 (Employee)**: 본인 연차만, 캘린더 중심, 읽기 전용
- **연차 관리 (Admin)**: 전체 구성원, 테이블 중심, 승인/반려 가능

**내가 요청한 문서 vs 결재 대기 문서:**
- **내가 요청한 문서**: 본인이 신청한 문서 (employee_id = 본인)
- **결재 대기 문서**: 모든 대기 문서 (status = 'pending'), Admin만 조회

### 2. RLS 정책 필수

모든 테이블에 RLS 정책이 적용되어야 합니다. 정책 없이 쿼리하면 빈 결과 반환됩니다.

### 3. Server vs Client Component

- **Server Component**: async/await 가능, Supabase Service Role Key 사용 가능
- **Client Component**: useState/useEffect 사용, Supabase Anon Key만 사용

---

**문서 버전:** 1.0
**최종 수정일:** 2025-01-18
