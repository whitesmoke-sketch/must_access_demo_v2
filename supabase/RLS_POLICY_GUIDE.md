# RLS (Row Level Security) 정책 가이드

## 역할(Role) 체계

| Level | Code | Name | 설명 |
|-------|------|------|------|
| 1 | `employee` | 일반사원 | 기본 권한 (본인 데이터만) |
| 2 | `team_leader` | 팀리더 | 팀원 데이터 조회 + 결재 권한 |
| 3 | `department_leader` | 부서리더 | 부서 데이터 조회/수정 + 결재 권한 |
| 4 | `business_leader` | 사업리더 | 사업부 전체 조회 + 결재 권한 |
| 5 | `ceo` / `hr` | 대표/HR | 전체 데이터 접근 + 관리 권한 |

---

## 1. 핵심 테이블 (Core)

### 1.1 employee (직원)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | `id = auth.uid()` | 모든 인증 사용자 |
| SELECT (다른 직원) | `status = 'active'` | 모든 인증 사용자 |
| UPDATE (본인) | `id = auth.uid()` | 모든 인증 사용자 |
| INSERT | `role.level >= 3` | 부서리더 이상 |
| UPDATE (타인) | `role.level >= 3` | 부서리더 이상 |
| DELETE | `role.level >= 3` | 부서리더 이상 |

**현재 상태**: ✅ 구현됨

---

### 1.2 department (부서)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | `deleted_at IS NULL` | 모든 인증 사용자 |
| INSERT | `department:manage` 권한 보유 | 부서리더 이상 |
| UPDATE | `deleted_at IS NULL` + `department:manage` 권한 | 부서리더 이상 |
| DELETE | `department:manage` 권한 | 부서리더 이상 |

**현재 상태**: ✅ 구현됨

---

### 1.3 role (역할)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | 모두 허용 | 모든 인증 사용자 |
| INSERT/UPDATE/DELETE | 없음 (관리자만) | 시스템 관리자 |

**현재 상태**: ✅ 구현됨 (SELECT만)

---

## 2. 휴가 관리 (Leave Management)

### 2.1 leave_request (휴가 신청)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | `employee_id = auth.uid()` | 본인 |
| SELECT (결재자) | approval_step에 결재자로 등록 | 결재 라인 |
| SELECT (HR 전체) | `role.level >= 5` | HR/대표 |
| INSERT | `employee_id = auth.uid()` | 본인만 |
| UPDATE (본인) | `employee_id = auth.uid()` AND `status = 'pending'` | 본인 (대기 중일 때만) |
| UPDATE (결재자) | approval_step에 결재자로 등록 | 결재 라인 |
| UPDATE (HR) | `role.level >= 5` | HR (반려 처리) |

**현재 상태**: 🟡 부분 구현 (HR 전체 조회 정책 추가 필요)

**추가 필요한 정책**:
```sql
-- HR은 모든 휴가 신청 조회 가능
CREATE POLICY leave_request_select_hr ON leave_request FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- HR은 휴가 신청 상태 변경 가능 (반려 등)
CREATE POLICY leave_request_update_hr ON leave_request FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );
```

---

### 2.2 annual_leave_balance (연차 잔액)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | `employee_id = auth.uid()` | 본인 |
| SELECT (전체) | `role.level >= 3` | 부서리더 이상 |
| INSERT | `role.level >= 3` | 부서리더 이상 |
| UPDATE | `role.level >= 3` | 부서리더 이상 |

**현재 상태**: ✅ 구현됨

---

### 2.3 annual_leave_grant (연차 부여)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | `employee_id = auth.uid()` | 본인 |
| SELECT (전체) | `role.level >= 5` | HR |
| INSERT | `role.level >= 5` | HR |

**현재 상태**: 🟡 부분 구현 (HR 전체 조회/INSERT 추가 필요)


**추가 필요한 정책**:
```sql
-- HR은 모든 연차 부여 조회 가능
CREATE POLICY leave_grant_select_hr ON annual_leave_grant FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- HR은 연차 부여 가능
CREATE POLICY leave_grant_insert_hr ON annual_leave_grant FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );
```

---

### 2.4 annual_leave_usage (연차 사용 내역)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | leave_request 통해 본인 확인 | 본인 |
| INSERT | 시스템만 (Edge Function) | - |

**현재 상태**: ✅ 구현됨 (INSERT는 service_role만)

---

## 3. 결재 시스템 (Approval)

### 3.1 approval_step (결재 단계)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (결재자) | `approver_id = auth.uid()` | 본인이 결재자 |
| SELECT (신청자) | request를 통해 본인 확인 | 신청자 |
| UPDATE | `approver_id = auth.uid()` AND `status = 'pending'` | 본인이 결재자 (대기 중) |
| INSERT | 시스템만 (Edge Function) | - |

**현재 상태**: 🟡 부분 구현 (신청자 조회 정책 추가 필요)

**추가 필요한 정책**:
```sql
-- 신청자도 자신의 요청에 대한 결재 단계 조회 가능
CREATE POLICY approval_step_select_requester ON approval_step FOR SELECT TO authenticated
  USING (
    -- leave_request인 경우
    (request_type = 'leave' AND EXISTS (
      SELECT 1 FROM leave_request lr
      WHERE lr.id = approval_step.request_id
      AND lr.employee_id = auth.uid()
    ))
    -- 다른 request_type도 추가 가능
  );
```

---

### 3.2 approval_template (결재 템플릿)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | `employee_id = auth.uid()` | 본인 |
| INSERT | `employee_id = auth.uid()` | 본인 |
| UPDATE | `employee_id = auth.uid()` | 본인 |
| DELETE | `employee_id = auth.uid()` | 본인 |

**현재 상태**: ❌ 미구현

**추가 필요한 정책**:
```sql
ALTER TABLE approval_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_template_all ON approval_template
  FOR ALL TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());
```

---

## 4. 회의실 예약 (Meeting Room)

### 4.1 meeting_room (회의실)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | `is_active = true` | 모든 인증 사용자 |
| INSERT/UPDATE/DELETE | `role.level >= 5` | HR/관리자 |

**현재 상태**: ❌ 미구현

**추가 필요한 정책**:
```sql
ALTER TABLE meeting_room ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_room_select ON meeting_room FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY meeting_room_manage ON meeting_room FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );
```

---

### 4.2 meeting_room_booking (회의실 예약)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | 모두 허용 | 모든 인증 사용자 (빈 시간 확인용) |
| INSERT | `booked_by = auth.uid()` | 본인만 |
| UPDATE | `booked_by = auth.uid()` | 예약자만 |
| DELETE | `booked_by = auth.uid()` | 예약자만 |

**현재 상태**: ❌ 미구현

**추가 필요한 정책**:
```sql
ALTER TABLE meeting_room_booking ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 예약 조회 가능 (빈 시간 확인용)
CREATE POLICY booking_select_all ON meeting_room_booking FOR SELECT TO authenticated
  USING (true);

-- 본인만 예약 생성
CREATE POLICY booking_insert_own ON meeting_room_booking FOR INSERT TO authenticated
  WITH CHECK (booked_by = auth.uid());

-- 본인만 예약 수정/삭제
CREATE POLICY booking_update_own ON meeting_room_booking FOR UPDATE TO authenticated
  USING (booked_by = auth.uid());

CREATE POLICY booking_delete_own ON meeting_room_booking FOR DELETE TO authenticated
  USING (booked_by = auth.uid());
```

---

### 4.3 meeting_room_booking_attendee (참석자)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | 본인이 참석자 OR 예약자 | 관련자 |
| INSERT | 예약자만 | 예약자 |
| UPDATE | 본인 참석 상태만 | 참석자 본인 |
| DELETE | 예약자만 | 예약자 |

**현재 상태**: ❌ 미구현

---

## 5. 출근 관리 (Attendance)

### 5.1 attendance (출근)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT (본인) | `employee_id = auth.uid()` | 본인 |
| SELECT (전체) | `role.level >= 3` | 부서리더 이상 |
| INSERT | `role.level >= 3` | 부서리더 이상 |
| UPDATE | `role.level >= 3` | 부서리더 이상 |
| DELETE | `role.level >= 3` | 부서리더 이상 |

**현재 상태**: ✅ 구현됨

---

## 6. 알림 (Notification)

### 6.1 notification (알림)

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | `recipient_id = auth.uid()` | 수신자 본인 |
| UPDATE | `recipient_id = auth.uid()` | 수신자 본인 (읽음 처리) |
| INSERT | 시스템/Edge Function | - |

**현재 상태**: ❌ 미구현

> **참고**: INSERT는 Edge Function(service_role)에서만 수행. 일반 사용자가 임의로 알림 생성 방지.

**추가 필요한 정책**:
```sql
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_select_own ON notification FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notification_update_own ON notification FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
```

---

## 7. 초대 직원 (Invited Employees)

### 7.1 invited_employees

| 작업 | 조건 | 대상 Role |
|------|------|-----------|
| SELECT | 모두 허용 | 모든 인증 사용자 (동료 확인용) |
| INSERT | `role.level >= 3` | 부서리더 이상 |
| UPDATE | `role.level >= 3` | 부서리더 이상 |
| DELETE | `role.level >= 5` | HR만 |

**현재 상태**: ❌ 미구현

**추가 필요한 정책**:
```sql
ALTER TABLE invited_employees ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 초대 직원 조회 가능
CREATE POLICY invited_select_all ON invited_employees FOR SELECT TO authenticated
  USING (true);

-- 부서리더 이상만 초대 가능
CREATE POLICY invited_insert_manager ON invited_employees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3
    )
  );

-- 부서리더 이상만 수정 가능
CREATE POLICY invited_update_manager ON invited_employees FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3
    )
  );

-- HR만 삭제 가능
CREATE POLICY invited_delete_hr ON invited_employees FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );
```


---

## 요약: Edge Function vs RLS

### RLS로 대체 가능한 Edge Functions

| Function | 현재 로직 | RLS 대체 방안 |
|----------|----------|--------------|
| `get-approval-steps` | 신청자/결재자만 조회 | `approval_step` SELECT 정책 (신청자+결재자) |
| `get-my-bookings` | 본인 예약 + 참석 회의 조회 | `meeting_room_booking` SELECT 전체 허용 → **삭제 가능** |
| `get-leave-management-data` | HR만 전체 조회 | `leave_request`, `employee` SELECT (HR level) |
| `reject-leave-request` | HR만 반려 처리 | `leave_request` UPDATE (HR level) |

**대체 후 클라이언트 변경**:
```ts
// 기존: Edge Function 호출
const { data } = await supabase.functions.invoke('get-my-bookings', { body: { employeeId } })

// 변경: 직접 쿼리 (RLS가 자동 필터링)
const { data } = await supabase
  .from('meeting_room_booking')
  .select('*, room:room_id(name), attendees:meeting_room_booking_attendee(employee:employee_id(id, name))')
  .or(`booked_by.eq.${userId},meeting_room_booking_attendee.employee_id.eq.${userId}`)
  .gte('booking_date', today)
```

---

### Edge Function 유지 필요

| Function | 이유 |
|----------|------|
| `approve-leave-request` | 다음 단계 활성화 + 연차 차감 함수 호출 (다중 테이블 업데이트) |
| `create-approval-steps` | 여러 approval_step INSERT + leave_request UPDATE (트랜잭션) |
| `deduct-leave-balance` | FIFO 연차 차감 계산 로직 (복잡한 비즈니스 로직) |
| `create-meeting-reservation` | **Google Calendar API 연동** |
| `cancel-meeting-reservation` | **Google Calendar API 연동** |
| `respond-to-meeting` | **Google Calendar API 연동** (참석 응답) |
| `generate-leave-pdf` | **외부 PDF 생성 서비스** |
| `grant-annual-leave` | 연차 부여 계산 + balance 업데이트 |
| `grant-monthly-leave` | 월별 연차 부여 계산 |
| `grant-reward-leave` | 포상 연차 부여 |
| `grant-attendance-award` | 출결 포상 연차 부여 |
| `validate-and-register-employee` | 초대 확인 + auth.users 생성 + employee INSERT (트랜잭션) |

---

### Edge Function 삭제 가능 (RLS 적용 후)

| Function | 대체 방법 |
|----------|----------|
| `get-approval-steps` | 클라이언트에서 직접 `approval_step` 쿼리 |
| `get-my-bookings` | 클라이언트에서 직접 `meeting_room_booking` 쿼리 |
| `get-leave-management-data` | 클라이언트에서 직접 쿼리 (HR RLS 적용) |
| `reject-leave-request` | 클라이언트에서 직접 `leave_request` UPDATE |

---

## 구현 우선순위

1. **높음** (필수):
   - `leave_request` - HR 전체 조회/수정 정책
   - `approval_step` - 신청자 조회 정책

2. **중간**:
   - `meeting_room_booking` - 전체 조회 정책
   - `meeting_room_booking_attendee` - 관련자 조회 정책
   - `notification` - 본인만 조회/수정 정책

3. **낮음**:
   - `approval_template` - 본인만 CRUD 정책
   - `invited_employees` - 전체 조회 + 권한별 CUD 정책
   - `annual_leave_grant` - HR 전체 조회/INSERT 정책
