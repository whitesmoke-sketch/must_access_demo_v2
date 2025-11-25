-- ================================================================
-- 테스트 데이터 준비
-- ================================================================

-- 1. 테스트용 직원 추가 (1년 미만 - 월차 테스트용)
INSERT INTO employee (id, department_id, role_id, name, email, employment_date, status)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  1,
  1,
  '신입사원',
  'newbie@test.com',
  CURRENT_DATE - INTERVAL '6 months',  -- 6개월 전 입사
  'active'
) ON CONFLICT (id) DO UPDATE SET
  employment_date = EXCLUDED.employment_date,
  status = EXCLUDED.status;

-- 2. 테스트용 직원 추가 (오늘이 입사 기념일 - 연차 테스트용)
-- 3년 전 오늘 입사
INSERT INTO employee (id, department_id, role_id, name, email, employment_date, status)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  1,
  1,
  '3년차직원',
  'third.year@test.com',
  CURRENT_DATE - INTERVAL '3 years',  -- 3년 전 오늘 입사
  'active'
) ON CONFLICT (id) DO UPDATE SET
  employment_date = EXCLUDED.employment_date,
  status = EXCLUDED.status;

-- 3. 근태 데이터 추가 (신입사원 - 만근)
-- 지난달 만근 데이터
DO $$
DECLARE
  v_date DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
BEGIN
  -- 지난달 첫날과 마지막날
  v_last_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  v_last_month_end := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  -- 지난달 모든 평일에 출근 기록 생성 (주말 제외)
  FOR v_date IN
    SELECT generate_series(v_last_month_start, v_last_month_end, '1 day'::interval)::DATE
  LOOP
    -- 주말(토요일=6, 일요일=0) 제외
    IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN
      INSERT INTO attendance (employee_id, date, check_in, check_out, status, late_minutes)
      VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
        v_date,
        v_date + TIME '09:00:00',
        v_date + TIME '18:00:00',
        'present',
        0
      ) ON CONFLICT (employee_id, date) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 4. 테스트용 연차 부여 기록 (FIFO 테스트용)
-- 3년차직원에게 여러 개의 연차 부여 (만료일이 다른)
INSERT INTO annual_leave_grant (employee_id, grant_type, granted_days, granted_date, expiration_date, reason, approval_status)
VALUES
  -- 2022년 입사 기념일 연차 (곧 만료)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'annual', 15.0, '2022-11-24', '2023-11-23', '2022년 입사 기념일 연차', 'approved'),
  -- 2023년 입사 기념일 연차 (내년 만료)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'annual', 15.0, '2023-11-24', '2024-11-23', '2023년 입사 기념일 연차', 'approved'),
  -- 2024년 입사 기념일 연차 (가장 나중 만료)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'annual', 16.0, '2024-11-24', '2025-11-23', '2024년 입사 기념일 연차 (3년차)', 'approved')
ON CONFLICT DO NOTHING;

-- 5. 연차 잔액 초기화
SELECT update_leave_balance('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
SELECT update_leave_balance('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);

-- 6. 테스트용 휴가 신청 생성 (승인 테스트용)
INSERT INTO leave_request (employee_id, leave_type, start_date, end_date, requested_days, reason, status, current_step)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'annual',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '9 days',
  3.0,
  '휴가 테스트',
  'pending',
  1
) ON CONFLICT DO NOTHING
RETURNING id;

-- 데이터 확인
SELECT '=== 테스트 직원 ===' AS section;
SELECT id, name, email, employment_date,
       EXTRACT(YEAR FROM AGE(CURRENT_DATE, employment_date)) AS years_of_service
FROM employee
WHERE email IN ('newbie@test.com', 'third.year@test.com');

SELECT '=== 근태 기록 (신입사원) ===' AS section;
SELECT COUNT(*) as total_days,
       COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
       COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days
FROM attendance
WHERE employee_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT '=== 연차 부여 내역 (3년차직원) ===' AS section;
SELECT id, grant_type, granted_days, granted_date, expiration_date
FROM annual_leave_grant
WHERE employee_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
ORDER BY expiration_date;

SELECT '=== 연차 잔액 ===' AS section;
SELECT e.name, b.total_days, b.used_days, b.remaining_days, b.expiring_soon_days
FROM annual_leave_balance b
JOIN employee e ON b.employee_id = e.id
WHERE e.email IN ('newbie@test.com', 'third.year@test.com');
