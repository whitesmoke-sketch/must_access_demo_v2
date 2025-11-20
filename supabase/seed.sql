-- Test Data Seed
-- Description: Create test accounts with proper auth and employee data
-- Note: Roles and Departments are created by migration files, not here

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
-- Role IDs from migration:
--   1: 일반사원 (employee, level 1)
--   2: 팀리더 (team_leader, level 2)
--   3: 부서리더 (department_leader, level 3)
--   4: 사업리더 (business_leader, level 4)
--   5: 대표 (ceo, level 5)
--   6: HR (hr, level 5)
-- Department IDs from migration:
--   1: SI사업, 2: AI팀, 3: A-1팀, 8: HR팀 등

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
  ('a1111111-1111-1111-1111-111111111111', 1, 5, '대표', 'admin@must.com', 'KR', '2020-01-01', 'active'),
  ('e2222222-2222-2222-2222-222222222222', 3, 1, '김직원', 'employee@must.com', 'KR', '2023-03-01', 'active'),
  ('d3333333-3333-3333-3333-333333333333', 8, 2, '박팀리더', 'designer@must.com', 'KR', '2022-06-01', 'active')
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
-- Note: Permissions are managed through RLS policies based on role levels
-- Level-based permissions:
--   Level 1-2 (일반사원, 팀리더): employee menus only
--   Level 3-4 (부서리더, 사업리더): admin menus
--   Level 5 (대표, HR): all menus
