-- Test Data Seed
-- Description: Create test accounts with proper auth and employee data

-- ================================================
-- 1. Roles (역할)
-- ================================================
INSERT INTO role (id, name, code, level, description) VALUES
(1, 'Super Admin', 'super_admin', 100, '시스템 최고 관리자'),
(2, 'Admin', 'admin', 90, '관리자'),
(3, 'Manager', 'manager', 50, '매니저'),
(4, 'Employee', 'employee', 10, '일반 직원'),
(5, 'Designer', 'designer', 10, '디자이너')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 2. Departments (부서)
-- ================================================
INSERT INTO department (id, name, code) VALUES
(1, '경영지원팀', 'ADMIN'),
(2, '개발팀', 'DEV'),
(3, '디자인팀', 'DESIGN')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 3. Create Test Users using Supabase Auth Admin API
-- Note: We'll create users with a simpler method
-- ================================================

-- First, let's create the auth users with proper password hashing
DO $$
DECLARE
  admin_user_id uuid := 'a1111111-1111-1111-1111-111111111111';
  employee_user_id uuid := 'e2222222-2222-2222-2222-222222222222';
  designer_user_id uuid := 'd3333333-3333-3333-3333-333333333333';
BEGIN
  -- Admin user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    'admin@must.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Employee user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    employee_user_id,
    'authenticated',
    'authenticated',
    'employee@must.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Designer user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    designer_user_id,
    'authenticated',
    'authenticated',
    'designer@must.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
    (
      admin_user_id,
      admin_user_id,
      admin_user_id,
      'email',
      format('{"sub":"%s","email":"%s"}', admin_user_id, 'admin@must.com')::jsonb,
      NOW(),
      NOW(),
      NOW()
    ),
    (
      employee_user_id,
      employee_user_id,
      employee_user_id,
      'email',
      format('{"sub":"%s","email":"%s"}', employee_user_id, 'employee@must.com')::jsonb,
      NOW(),
      NOW(),
      NOW()
    ),
    (
      designer_user_id,
      designer_user_id,
      designer_user_id,
      'email',
      format('{"sub":"%s","email":"%s"}', designer_user_id, 'designer@must.com')::jsonb,
      NOW(),
      NOW(),
      NOW()
    )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ================================================
-- 4. Employees (직원 정보)
-- ================================================
INSERT INTO employee (
  id,
  department_id,
  role_id,
  name,
  email,
  country,
  employment_date,
  status
) VALUES
  ('a1111111-1111-1111-1111-111111111111', 1, 2, '관리자', 'admin@must.com', 'KR', '2024-01-01', 'active'),
  ('e2222222-2222-2222-2222-222222222222', 2, 4, '김직원', 'employee@must.com', 'KR', '2024-03-01', 'active'),
  ('d3333333-3333-3333-3333-333333333333', 3, 5, '박디자이너', 'designer@must.com', 'KR', '2024-06-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 5. Annual Leave Balance (연차 잔액)
-- ================================================
INSERT INTO annual_leave_balance (
  employee_id,
  total_days,
  used_days,
  remaining_days,
  expiring_soon_days
) VALUES
  ('a1111111-1111-1111-1111-111111111111', 15, 3, 12, 0),
  ('e2222222-2222-2222-2222-222222222222', 15, 5, 10, 0),
  ('d3333333-3333-3333-3333-333333333333', 11, 2, 9, 0)
ON CONFLICT (employee_id) DO NOTHING;

-- ================================================
-- 6. Permissions (권한)
-- ================================================
INSERT INTO permission (id, name, code, resource, action) VALUES
(1, '직원 조회', 'employee.read', 'employee', 'read'),
(2, '직원 생성', 'employee.create', 'employee', 'create'),
(3, '직원 수정', 'employee.update', 'employee', 'update'),
(4, '직원 삭제', 'employee.delete', 'employee', 'delete'),
(5, '연차 조회', 'leave.read', 'leave', 'read'),
(6, '연차 승인', 'leave.approve', 'leave', 'approve')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 7. Role-Permission Mapping (역할-권한 매핑)
-- ================================================
INSERT INTO role_permission (role_id, permission_id) VALUES
-- Admin: all permissions
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6),
-- Employee: basic permissions
(4, 1), (4, 5),
-- Designer: basic permissions
(5, 1), (5, 5)
ON CONFLICT DO NOTHING;
