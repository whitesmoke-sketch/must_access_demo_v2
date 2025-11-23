-- ================================================================
-- SEED EMPLOYEE DUMMY DATA
-- ================================================================
-- This migration creates test employees for development
-- WARNING: Only for development environment!
-- ================================================================

-- ================================================================
-- 1. CREATE TEST USERS IN AUTH.USERS
-- ================================================================

-- Generate some test user IDs
-- Note: In a real scenario, these would be created through Supabase Auth
-- For development, we'll insert directly into auth.users

-- CEO/관리자
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ceo@test.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "김대표"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- HR 담당자
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'hr@test.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "박인사"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- SI사업 리더
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'si.leader@test.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "이SI"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- AI팀 리더
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  'ai.leader@test.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "최AI"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- AI팀 직원들 (A-1팀, A-2팀, A-3팀)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES
  ('00000000-0000-0000-0000-000000000005', 'a1.member1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "김A1"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000006', 'a1.member2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "박A1"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000007', 'a2.member1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "이A2"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000008', 'a2.member2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "최A2"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000009', 'a3.member1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "정A3"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000010', 'a3.member2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "한A3"}', NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- AISUPPORT팀 직원들
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES
  ('00000000-0000-0000-0000-000000000011', 'support1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "김서포트"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000012', 'support2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "박서포트"}', NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 개발사업 리더 및 팀원들
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES
  ('00000000-0000-0000-0000-000000000013', 'dev.leader@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "이개발"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000014', 'backend.leader@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "최백엔드"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000015', 'api.dev1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "김API"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000016', 'api.dev2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "박API"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000017', 'db.dev1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "이DB"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000018', 'db.dev2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "최DB"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000019', 'frontend.leader@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "정프론트"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000020', 'frontend.dev1@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "한프론트"}', NOW(), NOW(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000021', 'frontend.dev2@test.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "오프론트"}', NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 2. CREATE EMPLOYEES
-- ================================================================

-- CEO/관리자 (대표)
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  1, -- SI사업
  5, -- CEO
  '김대표',
  'ceo@test.com',
  '2020-01-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- HR 담당자
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  8, -- HR팀
  6, -- HR
  '박인사',
  'hr@test.com',
  '2020-01-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- SI사업 리더 (사업리더)
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  1, -- SI사업
  4, -- 사업리더
  '이SI',
  'si.leader@test.com',
  '2020-06-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- AI팀 리더 (부서리더)
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  2, -- AI팀
  3, -- 부서리더
  '최AI',
  'ai.leader@test.com',
  '2021-01-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- A-1팀 직원들 (팀리더, 일반사원)
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000005', 3, 2, '김A1', 'a1.member1@test.com', '2021-03-01', 'active'),
  ('00000000-0000-0000-0000-000000000006', 3, 1, '박A1', 'a1.member2@test.com', '2021-06-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- A-2팀 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000007', 4, 2, '이A2', 'a2.member1@test.com', '2021-04-01', 'active'),
  ('00000000-0000-0000-0000-000000000008', 4, 1, '최A2', 'a2.member2@test.com', '2021-07-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- A-3팀 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000009', 5, 2, '정A3', 'a3.member1@test.com', '2021-05-01', 'active'),
  ('00000000-0000-0000-0000-000000000010', 5, 1, '한A3', 'a3.member2@test.com', '2021-08-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- AISUPPORT팀 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000011', 6, 2, '김서포트', 'support1@test.com', '2021-09-01', 'active'),
  ('00000000-0000-0000-0000-000000000012', 6, 1, '박서포트', 'support2@test.com', '2021-10-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- 개발사업 리더
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000013',
  9, -- 개발사업
  4, -- 사업리더
  '이개발',
  'dev.leader@test.com',
  '2020-06-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 백엔드팀 리더
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES (
  '00000000-0000-0000-0000-000000000014',
  10, -- 백엔드팀
  3, -- 부서리더
  '최백엔드',
  'backend.leader@test.com',
  '2021-01-01',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- API개발팀 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000015', 11, 2, '김API', 'api.dev1@test.com', '2021-03-01', 'active'),
  ('00000000-0000-0000-0000-000000000016', 11, 1, '박API', 'api.dev2@test.com', '2021-06-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- DB팀 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000017', 12, 2, '이DB', 'db.dev1@test.com', '2021-04-01', 'active'),
  ('00000000-0000-0000-0000-000000000018', 12, 1, '최DB', 'db.dev2@test.com', '2021-07-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- 프론트엔드팀 리더 및 직원들
INSERT INTO employee (
  id, department_id, role_id, name, email, employment_date, status
) VALUES
  ('00000000-0000-0000-0000-000000000019', 13, 3, '정프론트', 'frontend.leader@test.com', '2021-01-01', 'active'),
  ('00000000-0000-0000-0000-000000000020', 13, 1, '한프론트', 'frontend.dev1@test.com', '2021-05-01', 'active'),
  ('00000000-0000-0000-0000-000000000021', 13, 1, '오프론트', 'frontend.dev2@test.com', '2021-08-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 3. CREATE ANNUAL LEAVE BALANCES
-- ================================================================

-- Create leave balances for all employees
INSERT INTO annual_leave_balance (employee_id, total_days, used_days, remaining_days)
SELECT
  id,
  15.0, -- 기본 15일
  0.0,  -- 사용일 0
  15.0  -- 잔여일 15
FROM employee
WHERE status = 'active'
ON CONFLICT (employee_id) DO NOTHING;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE employee IS '더미 계정 비밀번호: password';
