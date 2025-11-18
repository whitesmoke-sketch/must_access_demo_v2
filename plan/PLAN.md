# MUST Access - 구현 계획 (1차 기획 범위)

**생성일:** 2025-01-18
**아키텍처:** Option A - 서버리스 풀스택 (Next.js + Supabase)
**Task 구성:** 하이브리드 (페이지 중심 + Edge Functions)
**기획 버전:** v1.0 (1차 범위)

---

## 📌 프로젝트 개요

### 목표
수작업으로 관리되던 인사(HR) 및 총무(GA) 업무를 통합 자동화하는 솔루션을 구축합니다.

### 1차 기획 범위
본 계획서는 다음 항목만 포함합니다:
1. ✅ 로그인 페이지 (Google OAuth 포함)
2. ✅ 사용자 대시보드
3. ✅ 관리자 대시보드
4. ✅ 내 연차 조회
5. ✅ 연차 신청 페이지 (신청 폼)
6. ✅ 조직구성원 관리
7. ✅ 연차 관리 (관리자)
8. ✅ Edge Functions (자동 연차 부여)
9. ✅ 디자인 토큰
10. ✅ 인터랙션 패턴
11. ✅ 모바일 반응형

**추후 추가 예정:**
- 자유석 관리
- 근태 관리
- 포상휴가 계산 (Edge Function)
- 방문자 관리
- 회의실 예약
- 기타 추가 기획 항목

---

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** (React 19, App Router)
- **TypeScript**
- **Tailwind CSS** (디자인 토큰)
- **shadcn/ui** (UI 컴포넌트)
- **Lucide Icons**
- **Recharts** (차트)
- **Sonner** (Toast 알림)

### Backend
- **Next.js Server Components** (서버 직접 데이터 조회)
- **Next.js Server Actions** (클라이언트 인터랙션)
- **Supabase Edge Functions** (복잡한 계산 로직)

### Database
- **Supabase** (PostgreSQL)
- **Row Level Security (RLS)**
- **Realtime** (자유석 실시간 업데이트)

### Deployment
- **Vercel** (프론트엔드)
- **Supabase** (데이터베이스 + Edge Functions)

---

## 📋 Phase 구성 요약

| Phase | 이름 | 타입 | 기간 | 의존성 | Figma 화면 |
|-------|------|------|------|--------|-----------|
| **Phase 0** | 인증 및 디자인 시스템 | [PAGE] | 4-5일 | 없음 | SCRN_AUTH_001 + 디자인 시스템 |
| **Phase 1** | 사용자 대시보드 | [PAGE] | 4-5일 | Phase 0 | SCRN_DASH_001 |
| **Phase 2** | 관리자 대시보드 | [PAGE] | 5-6일 | Phase 0 | SCRN_DASH_002 |
| **Phase 3** | 내 연차 조회 | [PAGE] | 4-5일 | Phase 0 | SCRN_LEAVE_001 |
| **Phase 4** | 연차 신청 | [PAGE] | 3-4일 | Phase 0, 3 | 신규 화면 |
| **Phase 5** | 조직구성원 관리 | [PAGE] | 4-5일 | Phase 0 | SCRN_USER_001 |
| **Phase 6** | 연차 관리 (관리자) | [PAGE] | 5-6일 | Phase 0, 3 | SCRN_LEAVE_002, SCRN_LEAVE_003 |
| **Phase 7** | Edge Functions (자동 연차 부여) | [EDGE] | 3-4일 | Phase 5 | - |

**총 예상 기간:** 32-40일 (약 1.5-2개월)

---

## 🎯 Phase 상세 설명

### Phase 0: 인증 및 디자인 시스템

**목표:** 사용자 인증 및 프로젝트 전체 디자인 시스템 구축

**포함 항목:**
1. 로그인 페이지 (이메일/비밀번호 + Google OAuth)
2. 디자인 토큰 (Tailwind CSS 변수)
3. 인터랙션 패턴 (버튼, 카드, 모달 애니메이션)
4. 모바일 반응형 레이아웃 기준

**Pages:**
- `/login` - 로그인
- `(authenticated)` Layout - 공통 레이아웃

**Features:**
- ✅ 이메일/비밀번호 로그인
- ✅ Google OAuth 로그인
- ✅ Protected Route 미들웨어
- ✅ 역할별 사이드바 (employee, admin)
- ✅ 로그아웃
- ✅ Tailwind 디자인 토큰 설정
- ✅ 공통 인터랙션 패턴

**Design Tokens:**
```css
/* 색상 */
--primary: #635BFF
--secondary: #16CDC7
--success: #4CD471
--error: #FF6B6B
--warning: #F8C653

/* 타이포그래피 */
--font-h1: 32px
--font-h2: 24px
--font-body: 14px

/* 간격 */
--space-1: 4px
--space-2: 8px
--space-4: 16px
--space-6: 24px
```

**RLS Policies:**
```sql
-- employee: 본인 정보만 조회
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid()::text = id::text);
```

**Files:**
- `app/(auth)/login/page.tsx`
- `app/(authenticated)/layout.tsx`
- `components/common/Header.tsx`
- `components/common/Sidebar.tsx`
- `tailwind.config.ts` (디자인 토큰)
- `middleware.ts` (Protected Route)

**Completion Criteria:**
- [ ] 이메일 로그인 성공
- [ ] Google OAuth 로그인 성공
- [ ] 역할별 리다이렉트 (employee → /dashboard, admin → /admin/dashboard)
- [ ] 모든 디자인 토큰 적용 확인
- [ ] 데스크톱/태블릿/모바일 반응형 확인

---

### Phase 1: 사용자 대시보드

**목표:** 직원이 자신의 근무 상태, 연차, 예약 현황을 한눈에 확인

**Pages:**
- `/dashboard` - 사용자 대시보드

**Features:**
- 근무 상태 카드 (출근/퇴근/자리비움/재택)
- 연차 요약 카드 (잔여 연차, 포상휴가)
- 퀵 액션 버튼 (회의실 예약, 좌석 등록, 결재 문서)
- 나의 예약 현황 (좌석, 회의실)
- 결재 현황 카드 (내가 요청한 문서, 결재 대기)

**Components:**
- `components/dashboard/WorkStatusCard.tsx`
- `components/dashboard/LeaveBalanceCard.tsx`
- `components/dashboard/QuickActions.tsx`
- `components/dashboard/ReservationStatus.tsx`
- `components/dashboard/ApprovalStatus.tsx`

**Supabase Queries:**
```typescript
// 1. 프로필 조회
await supabase
  .from('employee')
  .select('id, name, email, department:department_id(name)')
  .eq('id', user.id)
  .single()

// 2. 연차 잔액 조회
await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', user.id)
  .eq('year', new Date().getFullYear())
  .single()

// 3. 좌석 예약 조회
await supabase
  .from('seat_reservation')
  .select('*, seat:seat_id(name, location)')
  .eq('employee_id', user.id)
  .eq('reservation_date', today)

// 4. 결재 현황 조회
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', user.id)
  .order('created_at', { ascending: false })
  .limit(3)
```

**RLS Policies:**
```sql
-- annual_leave_balance: 본인 연차만 조회
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- seat_reservation: 본인 예약만 조회
CREATE POLICY "Users can view own reservations"
ON seat_reservation FOR SELECT
USING (auth.uid()::text = employee_id::text);
```

**Completion Criteria:**
- [ ] 모든 위젯이 정상 렌더링
- [ ] 데이터 정확성 확인
- [ ] 반응형 레이아웃 (3열 → 2열 → 1열)
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리

---

### Phase 2: 관리자 대시보드

**목표:** 관리자가 근태 현황, 좌석 사용률, 승인 대기를 한눈에 확인

**Pages:**
- `/admin/dashboard` - 관리자 대시보드

**Features:**
- 근태 현황 위젯 (Stacked Bar Chart)
- 좌석 사용 현황 위젯 (Pie Chart)
- 승인 대기 목록
- 이상 상황 알림

**Components:**
- `components/admin/AttendanceChart.tsx` (Recharts)
- `components/admin/SeatUsageChart.tsx` (Recharts)
- `components/admin/ApprovalQueue.tsx`
- `components/admin/AlertWidget.tsx`

**Supabase Queries:**
```typescript
// 1. 근태 집계 (최근 7일)
await supabase
  .from('attendance')
  .select('date, status, count')
  .gte('date', sevenDaysAgo)
  .order('date', { ascending: true })

// 2. 좌석 사용 통계
await supabase
  .from('seat')
  .select('id, status, seat_reservation(*)')

// 3. 승인 대기 목록
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
```

**Chart 설정:**
```typescript
// Stacked Bar Chart
<BarChart data={attendanceData}>
  <Bar dataKey="정상" fill="#4CD471" />
  <Bar dataKey="지각" fill="#F8C653" />
  <Bar dataKey="결근" fill="#FF6B6B" />
</BarChart>

// Pie Chart
<PieChart>
  <Pie data={seatData} innerRadius={50} outerRadius={70} />
</PieChart>
```

**RLS Policies:**
```sql
-- Admin만 모든 데이터 조회 가능
CREATE POLICY "Admins can view all data"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

**Completion Criteria:**
- [ ] 모든 차트 정상 렌더링
- [ ] 데이터 정확성 확인
- [ ] 반응형 레이아웃
- [ ] 승인/반려 버튼 동작

---

### Phase 3: 내 연차 조회

**목표:** 직원이 자신의 연차 현황과 캘린더를 확인

**Pages:**
- `/leave/my-leave` - 내 연차 조회

**Features:**
- 연차 정보 카드 4개 (총 연차, 사용, 잔여, 포상휴가)
- 연차 캘린더 (멀티데이 연차 표시)
- 범례 (연차, 반차, 포상휴가)

**Components:**
- `components/leave/LeaveInfoCards.tsx`
- `components/leave/LeaveCalendar.tsx`

**Supabase Queries:**
```typescript
// 1. 연차 잔액
await supabase
  .from('annual_leave_balance')
  .select('*')
  .eq('employee_id', user.id)
  .eq('year', currentYear)
  .single()

// 2. 연차 신청 내역 (캘린더)
await supabase
  .from('leave_request')
  .select('*')
  .eq('employee_id', user.id)
  .gte('start_date', startOfMonth)
  .lte('end_date', endOfMonth)
  .in('status', ['approved', 'pending'])
```

**Calendar 로직:**
```typescript
// 멀티데이 연차 처리
function renderLeaveOnCalendar(leave) {
  const days = getDaysBetween(leave.start_date, leave.end_date)

  days.forEach((day, index) => {
    if (index === 0) {
      // 시작일: 왼쪽 라운드 + 제목
      renderLeaveStart(day, leave)
    } else if (index === days.length - 1) {
      // 종료일: 오른쪽 라운드
      renderLeaveEnd(day, leave)
    } else {
      // 중간일: 양쪽 사각형
      renderLeaveMiddle(day, leave)
    }
  })
}
```

**Completion Criteria:**
- [ ] 연차 카드 4개 정확한 데이터 표시
- [ ] 캘린더 멀티데이 연차 정상 렌더링
- [ ] 월 이동 버튼 동작
- [ ] 툴팁 정상 표시

---

### Phase 4: 연차 신청

**목표:** 직원이 연차/반차/포상휴가를 신청

**Pages:**
- `/leave/request` - 연차 신청

**Features:**
- 날짜 선택 (시작일, 종료일)
- 휴가 타입 선택 (연차, 반차, 포상휴가)
- 사유 입력
- 잔여 연차 확인
- 신청 버튼

**Components:**
- `components/leave/LeaveRequestForm.tsx`
- `components/leave/LeaveDatePicker.tsx`
- `components/leave/LeaveTypeSelector.tsx`

**Supabase Queries:**
```typescript
// 1. 잔여 연차 확인
await supabase
  .from('annual_leave_balance')
  .select('remaining_days, reward_leave_balance')
  .eq('employee_id', user.id)
  .eq('year', currentYear)
  .single()

// 2. 연차 신청 (Server Action)
await supabase
  .from('leave_request')
  .insert({
    employee_id: user.id,
    leave_type,
    start_date,
    end_date,
    days_count,
    reason,
    status: 'pending'
  })

// 3. 연차 사용 기록 생성 (승인 시 - Phase 6에서)
// FIFO 방식으로 연차 차감
```

**Server Action:**
```typescript
'use server'

export async function submitLeaveRequest(data) {
  const supabase = createClient()

  // 1. 잔여 연차 확인
  const balance = await checkLeaveBalance(data.employee_id)

  if (balance.remaining_days < data.days_count) {
    return { success: false, error: '잔여 연차가 부족합니다' }
  }

  // 2. 신청 생성
  const { data: request, error } = await supabase
    .from('leave_request')
    .insert(data)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, data: request }
}
```

**RLS Policies:**
```sql
-- 본인만 신청 가능
CREATE POLICY "Users can create own leave requests"
ON leave_request FOR INSERT
WITH CHECK (auth.uid()::text = employee_id::text);
```

**Completion Criteria:**
- [ ] 날짜 선택 정상 동작
- [ ] 휴가 타입 선택 정상 동작
- [ ] 잔여 연차 실시간 표시
- [ ] 신청 성공 toast 표시
- [ ] 잔여 연차 부족 시 에러 처리

---

### Phase 5: 조직구성원 관리

**목표:** 관리자가 구성원 정보를 CRUD

**Pages:**
- `/admin/employees` - 조직구성원 관리

**Features:**
- 구성원 목록 테이블
- 구성원 추가/수정/삭제 모달
- 검색 및 필터 (부서, 팀, 역할)
- 연차 일수 설정

**Components:**
- `components/admin/EmployeeTable.tsx`
- `components/admin/EmployeeModal.tsx`

**Supabase Queries:**
```typescript
// 1. 구성원 목록
await supabase
  .from('employee')
  .select(`
    *,
    department:department_id(name),
    role:role_id(name, code),
    annual_leave_balance(*)
  `)
  .order('name')

// 2. 구성원 추가
await supabase
  .from('employee')
  .insert({
    name,
    email,
    department_id,
    role_id,
    join_date,
    // ...
  })

// 3. 구성원 수정
await supabase
  .from('employee')
  .update(data)
  .eq('id', employeeId)

// 4. 구성원 삭제 (soft delete)
await supabase
  .from('employee')
  .update({ status: 'inactive' })
  .eq('id', employeeId)
```

**RLS Policies:**
```sql
-- Admin만 구성원 관리 가능
CREATE POLICY "Admins can manage employees"
ON employee FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

**Completion Criteria:**
- [ ] 구성원 목록 정상 렌더링
- [ ] 구성원 추가 성공
- [ ] 구성원 수정 성공
- [ ] 구성원 삭제 (soft) 성공
- [ ] 검색/필터 동작

---

### Phase 6: 연차 관리 (관리자)

**목표:** 관리자가 구성원별 연차 현황 조회 및 승인 처리

**Pages:**
- `/admin/leave-management` - 연차 관리

**Features:**
- 구성원별 연차 현황 테이블
- 승인 대기 목록
- 승인/반려 처리
- 포상휴가 부여 모달

**Components:**
- `components/admin/LeaveBalanceTable.tsx`
- `components/admin/LeaveApprovalQueue.tsx`
- `components/admin/RewardLeaveModal.tsx`

**Supabase Queries:**
```typescript
// 1. 구성원별 연차 현황
await supabase
  .from('annual_leave_balance')
  .select(`
    *,
    employee:employee_id(name, department:department_id(name))
  `)
  .eq('year', currentYear)
  .order('employee_id')

// 2. 승인 대기 목록
await supabase
  .from('leave_request')
  .select('*, employee:employee_id(name)')
  .eq('status', 'pending')
  .order('created_at')

// 3. 승인 처리
await supabase
  .from('leave_request')
  .update({
    status: 'approved',
    approved_by: adminId,
    approved_at: now
  })
  .eq('id', requestId)

// 4. 포상휴가 부여 (즉시)
await supabase
  .from('annual_leave_grant')
  .insert({
    employee_id,
    grant_type: 'reward',
    granted_days: days,
    reason,
    granted_date: today
  })
```

**RLS Policies:**
```sql
-- Admin만 모든 연차 관리 가능
CREATE POLICY "Admins can manage all leave"
ON leave_request FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE id = auth.uid()::text
    AND role_id IN (SELECT id FROM role WHERE code = 'admin')
  )
);
```

**Completion Criteria:**
- [ ] 구성원별 연차 현황 정확성
- [ ] 승인 처리 성공
- [ ] 반려 처리 성공 (사유 필수)
- [ ] 포상휴가 부여 성공
- [ ] 검색/필터 동작

---

## 🔗 Phase 의존성 그래프

---

### Phase 7: Edge Functions (자동 연차 부여)

**목표:** 매월 1일 자동 연차 부여 및 입사 기념일 연차 부여

**Edge Functions:**
1. `grant-monthly-leave` - 매월 1일 전체 직원에게 연차 1일 부여
2. `grant-anniversary-leave` - 입사 기념일 추가 연차 부여

**Function 1: grant-monthly-leave**

**파일:** `supabase/functions/grant-monthly-leave/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]
    const currentYear = new Date().getFullYear()

    // 1. 활성 직원 조회
    const { data: employees, error: employeeError } = await supabase
      .from('employee')
      .select('id, name, join_date')
      .eq('status', 'active')

    if (employeeError) throw employeeError

    let successCount = 0
    let failCount = 0

    // 2. 각 직원에게 연차 부여
    for (const employee of employees) {
      // 연차 부여 기록 생성
      const { error: grantError } = await supabase
        .from('annual_leave_grant')
        .insert({
          employee_id: employee.id,
          grant_type: 'monthly',
          granted_days: 1.0,
          granted_date: today,
          year: currentYear,
          reason: `${currentYear}년 ${new Date().getMonth() + 1}월 월차 부여`
        })

      if (grantError) {
        console.error(`Failed for ${employee.name}:`, grantError)
        failCount++
      } else {
        successCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `연차 부여 완료: 성공 ${successCount}명, 실패 ${failCount}명`,
        successCount,
        failCount,
        date: today
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

**Function 2: grant-anniversary-leave**

**파일:** `supabase/functions/grant-anniversary-leave/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date()
    const currentYear = today.getFullYear()
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // 1. 오늘이 입사 기념일인 직원 조회
    const { data: employees, error: employeeError } = await supabase
      .from('employee')
      .select('id, name, join_date')
      .eq('status', 'active')
      .like('join_date', `%-${monthDay}`)

    if (employeeError) throw employeeError

    let grantedEmployees = []

    // 2. 근속 연수 계산 및 연차 부여
    for (const employee of employees) {
      const joinYear = new Date(employee.join_date).getFullYear()
      const yearsOfService = currentYear - joinYear

      // 1년 이상 근속자에게만 부여
      if (yearsOfService >= 1) {
        let bonusDays = 0

        // 1년 근속: 15일
        // 3년 이상: 매 2년마다 1일 추가 (최대 25일)
        if (yearsOfService >= 3) {
          const additionalYears = Math.floor((yearsOfService - 1) / 2)
          bonusDays = Math.min(additionalYears, 10)
        }

        if (bonusDays > 0) {
          await supabase
            .from('annual_leave_grant')
            .insert({
              employee_id: employee.id,
              grant_type: 'anniversary',
              granted_days: bonusDays,
              granted_date: today.toISOString().split('T')[0],
              year: currentYear,
              reason: `${yearsOfService}년 근속 기념 추가 연차 ${bonusDays}일`
            })

          grantedEmployees.push({
            name: employee.name,
            yearsOfService,
            bonusDays
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `입사 기념일 연차 부여 완료: ${grantedEmployees.length}명`,
        employees: grantedEmployees
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

**pg_cron 스케줄 설정:**

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 1. 매월 1일 00:00 연차 부여
SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-monthly-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 2. 매일 00:00 입사 기념일 확인 및 연차 부여
SELECT cron.schedule(
  'grant-anniversary-leave',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-anniversary-leave',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**로컬 테스트:**
```bash
# Edge Function 로컬 서빙
npm run edge:serve grant-monthly-leave

# 다른 터미널에서 호출 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/grant-monthly-leave' \
  --header 'Authorization: Bearer your-anon-key' \
  --header 'Content-Type: application/json'
```

**배포:**
```bash
# Function 배포
npm run edge:deploy grant-monthly-leave
npm run edge:deploy grant-anniversary-leave
```

**Completion Criteria:**
- [ ] grant-monthly-leave Function 정상 동작
- [ ] grant-anniversary-leave Function 정상 동작
- [ ] pg_cron 스케줄 등록 완료
- [ ] 로컬 테스트 성공
- [ ] 프로덕션 배포 성공
- [ ] Cron 작업 실행 이력 확인

---

## 🔗 Phase 의존성 그래프

```
Phase 0 (인증 + 디자인)
  ├─→ Phase 1 (사용자 대시보드)
  ├─→ Phase 2 (관리자 대시보드)
  ├─→ Phase 3 (내 연차 조회)
  │    ├─→ Phase 4 (연차 신청)
  │    └─→ Phase 6 (연차 관리)
  └─→ Phase 5 (조직구성원 관리)
       └─→ Phase 7 (Edge Functions)
```

**병렬 처리 가능:**
- Phase 0 완료 후: Phase 1, 2, 3, 5 동시 진행 가능
- Phase 3 완료 후: Phase 4, 6 진행 가능
- Phase 5 완료 후: Phase 7 진행

---

## 🎨 디자인 시스템 (Phase 0에 포함)

### 색상 팔레트
```css
:root {
  /* Primary Colors */
  --primary: #635BFF;
  --primary-foreground: #FFFFFF;
  --secondary: #16CDC7;
  --accent: #F8C653;

  /* Semantic Colors */
  --success: #4CD471;
  --error: #FF6B6B;
  --warning: #F8C653;
  --info: #16CDC7;

  /* Neutral Colors */
  --card-foreground: #29363D;
  --muted-foreground: #5B6A72;
  --muted: #F6F8F9;
  --border: #D3D9DC;

  /* Special */
  --reward-leave: #FF6692;
  --reward-leave-bg: #FFE5EC;
}
```

### 타이포그래피
```css
:root {
  --font-h1: 32px;
  --font-h2: 24px;
  --font-h3: 20px;
  --font-h4: 18px;
  --font-body: 14px;
  --font-caption: 12px;

  --weight-bold: 700;
  --weight-semibold: 600;
  --weight-medium: 500;
  --weight-regular: 400;
}
```

### 간격 시스템
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

### Border Radius
```css
:root {
  --radius: 16px;      /* Card */
  --radius-sm: 8px;    /* Button, Input */
  --radius-xs: 4px;    /* Badge */
}
```

### 인터랙션 패턴

#### 버튼
```typescript
// Primary Button
<Button className="
  bg-primary hover:brightness-90
  active:scale-98
  transition-all duration-150
">
  버튼
</Button>

// Ghost Button
<Button variant="ghost" className="
  hover:bg-muted
  active:bg-muted-dark
">
  버튼
</Button>
```

#### 카드
```typescript
<Card className="
  hover:shadow-md
  transition-shadow duration-150
">
  카드 내용
</Card>
```

#### 모달
```typescript
// Open Animation
<Dialog className="
  animate-in fade-in-0 zoom-in-95
  duration-200
">
  모달 내용
</Dialog>
```

### 반응형 브레이크포인트
```typescript
const breakpoints = {
  mobile: '< 768px',   // 1열 스택
  tablet: '≥ 768px',   // 2열 그리드
  desktop: '≥ 1024px'  // 3열 그리드
}
```

---

## ⚠️ 중요 제약사항

### 데이터베이스 스키마 고정 원칙

**Phase 실행 중:**
- ✅ 기존 테이블/필드 사용
- ✅ 기존 관계 활용
- ❌ 테이블 추가/삭제 금지
- ❌ 컬럼 추가/삭제/수정 금지
- ❌ 타입 변경 금지
- ❌ 마이그레이션 실행 금지

**스키마가 부족할 경우:**
1. 해당 기능을 현재 Phase에서 제외
2. BASIC.md로 돌아가 스키마 재설계
3. 초기 셋업부터 재시작

---

## 📚 실행 순서 추천

### 1단계: 환경 설정 (완료)
- ✅ Supabase 프로젝트 생성
- ✅ 환경 변수 설정
- ✅ 데이터베이스 마이그레이션

### 2단계: Phase별 구현
```bash
# Phase 0
"Phase 0 구현"

# Phase 1
"Phase 1 구현"

# Phase 2
"Phase 2 구현"

# ... 순차 진행
```

### 3단계: 통합 테스트
- 모든 Phase 완료 후 E2E 테스트
- Supabase RLS 정책 검증
- 반응형 레이아웃 확인

---

## 🔄 추후 추가 예정 (2차 기획)

다음 항목들은 추가 기획 후 별도 Phase로 구성:
- 자유석 관리 (평면도/목록 뷰, Realtime 구독, QR 스캔)
- 근태 관리 (Hubstaff 연동, 편차 감지)
- 포상휴가 계산 (Edge Function)
- 방문자 관리 (QR 발급)
- 회의실 예약
- 경조사비 신청
- Slack 알림 연동
- Notion 연동

---

## 📝 다음 단계

계획서 검토 후:
```
"Phase 0 구현"
```

명령어를 입력하여 구현을 시작하세요.

---

**문서 버전:** 1.0 (1차 기획 범위)
**최종 수정일:** 2025-01-18
**다음 업데이트:** 2차 기획 완료 후
