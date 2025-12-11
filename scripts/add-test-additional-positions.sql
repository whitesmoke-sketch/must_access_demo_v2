-- ================================================================
-- 테스트용 겸직 데이터 추가 스크립트
-- ================================================================
-- 사용법:
-- 1. Supabase Dashboard → SQL Editor에서 실행
-- 2. 또는 psql로 실행: psql [연결문자열] -f add-test-additional-positions.sql

-- 먼저 기존 직원과 부서/직급 확인
SELECT
  e.id as employee_id,
  e.name,
  e.email,
  e.department_id as primary_dept_id,
  d.name as primary_dept_name,
  e.role_id as primary_role_id,
  r.name as primary_role_name
FROM employee e
JOIN department d ON e.department_id = d.id
JOIN role r ON e.role_id = r.id
WHERE e.status = 'active'
LIMIT 5;

-- 부서 목록 확인
SELECT id, name, code FROM department ORDER BY id LIMIT 10;

-- 직급 목록 확인
SELECT id, name, code, level FROM role ORDER BY id LIMIT 10;

-- ================================================================
-- 아래는 실제 데이터 확인 후 주석 해제하여 사용하세요
-- ================================================================

-- 예시: 첫 번째 직원에게 추가 소속 부여
-- INSERT INTO employee_additional_positions (employee_id, department_id, role_id)
-- VALUES (
--   '실제_직원_UUID',  -- employee.id
--   2,                 -- 추가 소속 부서 ID
--   3                  -- 추가 소속 직급 ID
-- );

-- 겸직 데이터 조회
SELECT
  eap.id,
  e.name as employee_name,
  d.name as additional_dept,
  r.name as additional_role,
  eap.assigned_at
FROM employee_additional_positions eap
JOIN employee e ON eap.employee_id = e.id
JOIN department d ON eap.department_id = d.id
JOIN role r ON eap.role_id = r.id
ORDER BY eap.assigned_at DESC;
