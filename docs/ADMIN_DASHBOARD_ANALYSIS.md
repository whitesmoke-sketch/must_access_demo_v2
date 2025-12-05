# 관리자 대시보드 - 데이터베이스 및 기능 분석 보고서

**프로젝트**: MUST Access VibeD
**분석 대상**: 관리자 대시보드 (AdminDashboard.tsx)
**분석 일시**: 2024-12-04
**데이터베이스**: Supabase PostgreSQL

---

## 📋 목차
1. [현재 상태 요약](#현재-상태-요약)
2. [화면 구성 분석](#화면-구성-분석)
3. [필요한 데이터베이스 테이블](#필요한-데이터베이스-테이블)
4. [필요한 API/기능](#필요한-api기능)
5. [더미 데이터 vs 실제 데이터 매핑](#더미-데이터-vs-실제-데이터-매핑)
6. [구현 우선순위](#구현-우선순위)

---

## 현재 상태 요약

### ✅ 이미 구축된 것
- **데이터베이스 스키마**: 완전히 구축됨 (tables.sql)
  - 14개 주요 도메인 영역의 테이블
  - 총 40개 이상의 테이블
  - RLS 정책, 함수, 트리거 구현됨
- **UI 컴포넌트**: Figma에서 생성된 AdminDashboard.tsx
- **더미 데이터**: demoData.tsx에 Mock 데이터 준비됨

### ⚠️ 구현 필요한 것
- 실제 데이터베이스 쿼리 로직
- API 엔드포인트 또는 서버 액션
- 실시간 데이터 업데이트 기능
- 통계 계산 로직
- 알림 시스템

---

## 화면 구성 분석

관리자 대시보드는 **4개의 주요 카드**로 구성되어 있습니다:

### 1️⃣ 오늘의 근무 현황 (2 column span)

**표시 데이터:**
- 외근 인원 (7명)
- 재택 인원 (7명)
- 연차 인원 (6명)

**필요한 정보:**
```typescript
interface WorkStatusMember {
  id: string
  name: string
  department: string
  profileImage: string
}
```

**데이터 소스:**
- `employee` 테이블
- `attendance` 테이블 (근태 상태)
- `leave_request` 테이블 (연차 승인 내역)

### 2️⃣ 자원 사용 현황 (1 column)

**표시 데이터:**
- 좌석 점유율: 130/200석 (65%)
- 회의실 사용률: 평균 52.5%
- 층별 혼잡도 (2F, 3F, 4F, 5F)
- 지하1층 스튜디오 출입 상태

**필요한 정보:**
```typescript
interface FloorStatus {
  floor: string
  usedSeats: number
  totalSeats: number
  meetingRoomUsage: number
  status: 'busy' | 'moderate' | 'available'
}

interface ResourceStatus {
  overallOccupancyRate: number
  overallMeetingRoomUsage: number
  floorData: FloorStatus[]
  studioAccessStatus: 'available' | 'restricted'
}
```

**데이터 소스:**
- `seat` 테이블
- `seat_reservation` 테이블
- `meeting_room` 테이블
- `meeting_room_booking` 테이블

### 3️⃣ 승인 대기 목록 (2 column span)

**표시 데이터:**
- 대기 중인 휴가 신청 목록
- 신청자 정보, 휴가 종류, 기간, 일수

**필요한 정보:**
```typescript
interface PendingApproval {
  id: string
  userName: string
  type: '연차' | '포상휴가'
  requestDate: string
  startDate: string
  endDate: string
  days: number
}
```

**데이터 소스:**
- `leave_request` 테이블 (status = 'pending')
- `approval_step` 테이블 (승인 단계)
- `employee` 테이블 (신청자 정보)

### 4️⃣ 이상 상황 알림 (1 column)

**표시 데이터:**
- Hubstaff vs Biostar2 근태 편차
- 장시간 자리비움 감지
- 무단 미출근
- 방문자 QR 발급 실패

**필요한 정보:**
```typescript
interface Alert {
  id: number
  severity: 'critical' | 'warning' | 'info'
  message: string
  time: string
  category: '근태' | '시스템'
  icon: LucideIcon
}
```

**데이터 소스:**
- `notification` 테이블
- `attendance` 테이블 (근태 이상 감지)
- `access_log` 테이블 (출입 이상 감지)
- `visitor` 테이블 (방문자 관련)

---

## 필요한 데이터베이스 테이블

### 이미 존재하는 테이블 ✅

| 테이블명 | 용도 | 위치 |
|---------|------|------|
| `employee` | 직원 정보 | tables.sql:74-111 |
| `department` | 부서 정보 | tables.sql:26-33 |
| `role` | 역할 정보 | tables.sql:38-46 |
| `attendance` | 근태 기록 | tables.sql:1114-1136 |
| `leave_request` | 휴가 신청 | tables.sql:526-575 |
| `approval_step` | 승인 단계 | tables.sql:385-413 |
| `seat` | 좌석 정보 | tables.sql:880-891 |
| `seat_reservation` | 좌석 예약 | tables.sql:898-909 |
| `meeting_room` | 회의실 정보 | tables.sql:1015-1035 |
| `meeting_room_booking` | 회의실 예약 | tables.sql:1042-1064 |
| `notification` | 알림 | tables.sql:718-731 |
| `access_log` | 출입 기록 | tables.sql:801-809 |
| `visitor` | 방문자 정보 | tables.sql:742-757 |

### 테이블 관계도

```
┌─────────────────────────────────────────────────────────────┐
│                     관리자 대시보드                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ 오늘의 근무 현황 │    │  자원 사용 현황  │    │  승인 대기 목록  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ├─ attendance         ├─ seat              └─ leave_request
        ├─ employee           ├─ seat_reservation      ├─ approval_step
        └─ leave_request      ├─ meeting_room          └─ employee
                              └─ meeting_room_booking

        ┌───────────────────┐
        │  이상 상황 알림     │
        └───────────────────┘
                │
                ├─ notification
                ├─ attendance
                ├─ access_log
                └─ visitor
```

---

## 필요한 API/기능

### 1. 오늘의 근무 현황 API

#### 📍 엔드포인트: `GET /api/admin/work-status/today`

**반환 데이터:**
```typescript
{
  fieldWork: Member[]      // 외근 인원
  remote: Member[]         // 재택 인원
  vacation: Member[]       // 연차 인원
}
```

**필요한 쿼리:**
```sql
-- 외근 인원 (attendance.status에 'fieldwork' 타입 필요)
SELECT e.id, e.name, d.name as department, e.profile_image
FROM employee e
JOIN department d ON e.department_id = d.id
JOIN attendance a ON a.employee_id = e.id
WHERE a.date = CURRENT_DATE
  AND a.status = 'fieldwork';

-- 재택 인원
SELECT e.id, e.name, d.name as department, e.profile_image
FROM employee e
JOIN department d ON e.department_id = d.id
JOIN attendance a ON a.employee_id = e.id
WHERE a.date = CURRENT_DATE
  AND a.status = 'remote';

-- 연차 인원
SELECT e.id, e.name, d.name as department, e.profile_image
FROM employee e
JOIN department d ON e.department_id = d.id
JOIN leave_request lr ON lr.employee_id = e.id
WHERE lr.status = 'approved'
  AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date;
```

**⚠️ 현재 스키마 문제:**
- `attendance.status` ENUM이 'present', 'late', 'absent', 'leave', 'holiday'만 정의됨
- 'fieldwork', 'remote' 상태 추가 필요

**해결 방안:**
```sql
-- Option 1: ENUM 확장
ALTER TYPE attendance_status ADD VALUE 'fieldwork';
ALTER TYPE attendance_status ADD VALUE 'remote';

-- Option 2: 별도 work_type 컬럼 추가
ALTER TABLE attendance ADD COLUMN work_type VARCHAR(20) DEFAULT 'office';
```

### 2. 자원 사용 현황 API

#### 📍 엔드포인트: `GET /api/admin/resource-status`

**반환 데이터:**
```typescript
{
  seats: {
    total: number
    used: number
    occupancyRate: number
  }
  meetingRooms: {
    averageUsage: number
  }
  floors: Array<{
    floor: string
    usedSeats: number
    totalSeats: number
    meetingRoomUsage: number
    status: 'busy' | 'moderate' | 'available'
  }>
  studio: {
    status: 'available' | 'restricted'
    reason?: string
  }
}
```

**필요한 쿼리:**
```sql
-- 층별 좌석 통계
SELECT
  s.floor,
  COUNT(*) as total_seats,
  COUNT(sr.id) FILTER (WHERE sr.reservation_date = CURRENT_DATE) as used_seats,
  ROUND(COUNT(sr.id) FILTER (WHERE sr.reservation_date = CURRENT_DATE)::numeric / COUNT(*)::numeric * 100) as occupancy_rate
FROM seat s
LEFT JOIN seat_reservation sr ON sr.seat_id = s.id AND sr.reservation_date = CURRENT_DATE
WHERE s.is_available = true
GROUP BY s.floor;

-- 층별 회의실 사용률
SELECT
  mr.floor,
  ROUND(
    COUNT(mrb.id) FILTER (WHERE mrb.booking_date = CURRENT_DATE)::numeric /
    COUNT(DISTINCT mr.id)::numeric * 100
  ) as meeting_room_usage
FROM meeting_room mr
LEFT JOIN meeting_room_booking mrb ON mrb.room_id = mr.id AND mrb.booking_date = CURRENT_DATE
WHERE mr.is_active = true
GROUP BY mr.floor;
```

**⚠️ 현재 스키마 문제:**
- 스튜디오 출입 제한 상태를 관리하는 테이블이 없음

**해결 방안:**
```sql
-- 새 테이블 생성
CREATE TABLE facility_status (
  id BIGSERIAL PRIMARY KEY,
  facility_name VARCHAR(100) NOT NULL,
  facility_type VARCHAR(50) NOT NULL, -- 'studio', 'office', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'restricted', 'maintenance'
  reason TEXT,
  restricted_until TIMESTAMPTZ,
  updated_by UUID REFERENCES employee(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. 승인 대기 목록 API

#### 📍 엔드포인트: `GET /api/admin/approvals/pending`

**반환 데이터:**
```typescript
{
  pending: Array<{
    id: string
    userName: string
    type: '연차' | '포상휴가'
    requestDate: string
    startDate: string
    endDate: string
    days: number
  }>
  count: number
}
```

**필요한 쿼리:**
```sql
SELECT
  lr.id,
  e.name as user_name,
  CASE
    WHEN lr.leave_type = 'annual' THEN '연차'
    WHEN lr.leave_type = 'award' THEN '포상휴가'
    ELSE lr.leave_type
  END as type,
  lr.requested_at as request_date,
  lr.start_date,
  lr.end_date,
  lr.requested_days as days
FROM leave_request lr
JOIN employee e ON e.id = lr.employee_id
WHERE lr.status = 'pending'
ORDER BY lr.requested_at DESC
LIMIT 5;
```

### 4. 이상 상황 알림 API

#### 📍 엔드포인트: `GET /api/admin/alerts`

**반환 데이터:**
```typescript
{
  alerts: Array<{
    id: number
    severity: 'critical' | 'warning' | 'info'
    message: string
    time: string
    category: '근태' | '시스템'
  }>
}
```

**필요한 기능:**
1. **Hubstaff vs Biostar2 근태 편차 감지**
   - 외부 시스템 연동 필요
   - `attendance` 테이블에 `source` 컬럼 추가 고려

2. **장시간 자리비움 감지**
   - 실시간 좌석 센서 데이터 필요
   - `seat_reservation`의 체크인/체크아웃 타임스탬프 추가

3. **무단 미출근 감지**
   ```sql
   SELECT e.id, e.name
   FROM employee e
   LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = CURRENT_DATE
   WHERE e.status = 'active'
     AND a.id IS NULL
     AND e.working_day LIKE '%' || TO_CHAR(CURRENT_DATE, 'DY') || '%';
   ```

4. **방문자 QR 발급 실패**
   - `visitor` 테이블에 `qr_status` 컬럼 추가 필요

---

## 더미 데이터 vs 실제 데이터 매핑

### 현재 더미 데이터 (demoData.tsx)

| 더미 타입 | 실제 테이블 | 매핑 상태 |
|----------|------------|----------|
| `Member` | `employee` | ⚠️ 필드명 불일치 |
| `Seat` | `seat` | ⚠️ 구조 차이 |
| `Locker` | `locker` | ✅ 매핑 가능 |
| `AccessRecord` | `access_log` | ⚠️ 구조 차이 |
| `LeaveRequest` | `leave_request` | ✅ 거의 일치 |
| `Department` | `department` | ✅ 일치 |

### 필드 매핑 상세

#### Member → employee

| 더미 필드 | 실제 필드 | 변환 필요 |
|---------|----------|---------|
| `id` | `id` | ✅ |
| `name` | `name` | ✅ |
| `email` | `email` | ✅ |
| `department` | `department.name` (JOIN 필요) | ⚠️ |
| `team` | ❌ 없음 | ❌ |
| `position` | `role.name` (JOIN 필요) | ⚠️ |
| `role` | `role.code` | ⚠️ |
| `joinDate` | `employment_date` | ⚠️ 필드명 변경 |
| `annualLeave` | `annual_leave_balance.total_days` (JOIN 필요) | ⚠️ |

#### Seat → seat

| 더미 필드 | 실제 필드 | 변환 필요 |
|---------|----------|---------|
| `id` | `id` | ✅ |
| `name` | `seat_number` | ⚠️ 필드명 변경 |
| `location` | `floor + area` | ⚠️ 조합 필요 |
| `status` | `is_available + seat_reservation` | ⚠️ 계산 필요 |
| `currentUserId` | `seat_reservation.employee_id` | ⚠️ |
| `startTime` | `seat_reservation.start_time` | ⚠️ |

---

## 구현 우선순위

### Phase 1: 핵심 기능 (1-2주)
**목표**: 관리자 대시보드 기본 표시

1. ✅ **데이터베이스 스키마 보완**
   - [ ] `attendance` 테이블에 `work_type` 컬럼 추가
   - [ ] `facility_status` 테이블 생성
   - [ ] `visitor` 테이블에 `qr_status` 컬럼 추가

2. ✅ **API 엔드포인트 구현**
   - [ ] `/api/admin/work-status/today` - 오늘의 근무 현황
   - [ ] `/api/admin/resource-status` - 자원 사용 현황
   - [ ] `/api/admin/approvals/pending` - 승인 대기 목록

3. ✅ **UI 연동**
   - [ ] 더미 데이터를 실제 API 호출로 교체
   - [ ] 로딩 상태 처리
   - [ ] 에러 핸들링

### Phase 2: 실시간 기능 (2-3주)
**목표**: 실시간 업데이트 및 알림

1. ✅ **Supabase Realtime 설정**
   - [ ] `attendance` 테이블 실시간 구독
   - [ ] `leave_request` 테이블 실시간 구독
   - [ ] `seat_reservation` 테이블 실시간 구독

2. ✅ **알림 시스템**
   - [ ] 이상 상황 감지 로직 (Edge Function)
   - [ ] 알림 생성 및 저장
   - [ ] 관리자 대시보드 알림 표시

### Phase 3: 고급 기능 (3-4주)
**목표**: 외부 시스템 연동 및 분석

1. ✅ **외부 시스템 연동**
   - [ ] Hubstaff API 연동
   - [ ] Biostar2 API 연동
   - [ ] 근태 데이터 비교 로직

2. ✅ **통계 및 분석**
   - [ ] 층별 혼잡도 계산 로직
   - [ ] 트렌드 분석 (7일/14일/30일)
   - [ ] 대시보드 성능 최적화

---

## 추가 고려사항

### 1. 성능 최적화
- **인덱스 확인**: 자주 조회되는 컬럼에 인덱스 추가
  ```sql
  CREATE INDEX idx_attendance_date_status ON attendance(date, status);
  CREATE INDEX idx_seat_reservation_date ON seat_reservation(reservation_date);
  CREATE INDEX idx_leave_request_status_date ON leave_request(status, start_date, end_date);
  ```

### 2. 캐싱 전략
- Redis 또는 Supabase 캐싱 활용
- 층별 통계는 5분마다 갱신
- 승인 대기 목록은 실시간 업데이트

### 3. 보안
- RLS (Row Level Security) 정책 확인
- 관리자 권한 체크
- API 접근 권한 제어

### 4. 모니터링
- API 응답 시간 측정
- 데이터베이스 쿼리 성능 모니터링
- 에러 로깅 및 알림

---

## 결론

### ✅ 긍정적인 점
1. **데이터베이스 스키마가 매우 잘 설계**되어 있음
2. 대부분의 **필요한 테이블이 이미 존재**함
3. UI 컴포넌트는 **Figma에서 생성**되어 바로 사용 가능

### ⚠️ 보완 필요한 점
1. `attendance` 테이블에 외근/재택 상태 추가
2. 스튜디오 출입 제한 상태 관리 테이블 추가
3. 방문자 QR 상태 관리 필드 추가
4. 실제 API 구현 및 UI 연동

### 🎯 다음 단계
1. **즉시 시작 가능**: 스키마 보완 및 API 엔드포인트 구현
2. **1-2주 내 완료 가능**: 기본 관리자 대시보드 구현
3. **점진적 개선**: 실시간 기능 및 외부 연동 추가

---

**문서 작성**: Claude Code
**최종 업데이트**: 2024-12-04
