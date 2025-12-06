-- ================================================================
-- MUST ACCESS - PRODUCTION SETUP DATA
-- ================================================================
-- Purpose: Production-required data for role levels and department hierarchy
-- This file contains:
-- - Role definitions with hierarchy levels
-- - Department structure with parent-child relationships
-- - Permission definitions
-- - Role-permission assignments
-- ================================================================
-- Source: Combined from setup_org_structure and setup_permissions migrations
-- Created: 2025-11-20
-- ================================================================

-- ================================================================
-- 1. ROLE LEVELS SETUP
-- ================================================================

-- Insert all required roles with UPSERT (INSERT ... ON CONFLICT ... UPDATE)
INSERT INTO role (name, code, level, description) VALUES
  ('관리자', 'admin', 0, '시스템 관리자'),
  ('직원', 'employee', 1, '일반 사원'),
  ('팀리더', 'team_leader', 2, '팀을 관리하는 리더'),
  ('부서장', 'department_head', 3, '부서를 관리하는 책임자'),
  ('사업부장', 'business_head', 4, '사업부를 총괄하는 책임자'),
  ('HR', 'hr', 5, '인사팀')
ON CONFLICT (code) DO UPDATE SET
  level = EXCLUDED.level,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Adjust sequence
SELECT setval('role_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM role));

-- ================================================================
-- 2. DEPARTMENT HIERARCHY SETUP
-- ================================================================

-- Insert all required departments with UPSERT
-- Hierarchy structure: HQ > Department > Team
INSERT INTO department (name, code, parent_department_id) VALUES
  ('본사', 'HQ', NULL),
  ('개발부', 'DEV_DEPT', NULL),  -- parent will be updated later
  ('디자인부', 'DESIGN_DEPT', NULL),  -- parent will be updated later
  ('개발1팀', 'DEV_TEAM1', NULL),  -- parent will be updated later
  ('개발2팀', 'DEV_TEAM2', NULL),  -- parent will be updated later
  ('디자인1팀', 'DESIGN_TEAM1', NULL),  -- parent will be updated later
  ('인사팀', 'HR', NULL)  -- parent will be updated later
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name;

-- Set up hierarchy structure (parent_department_id)
UPDATE department SET parent_department_id = NULL WHERE code = 'HQ';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'DEV_DEPT';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'DESIGN_DEPT';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'HR';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DEV_DEPT') WHERE code = 'DEV_TEAM1';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DEV_DEPT') WHERE code = 'DEV_TEAM2';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DESIGN_DEPT') WHERE code = 'DESIGN_TEAM1';

-- Adjust sequence
SELECT setval('department_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM department));

-- ================================================================
-- 3. PERMISSIONS SETUP
-- ================================================================

INSERT INTO permission (name, code, resource, action, description) VALUES
  -- Leave permissions
  ('연차 생성', 'leave:create', 'leave', 'create', '연차 신청 생성'),
  ('연차 조회', 'leave:read', 'leave', 'read', '연차 신청 조회'),
  ('연차 수정', 'leave:update', 'leave', 'update', '연차 신청 수정'),
  ('연차 삭제', 'leave:delete', 'leave', 'delete', '연차 신청 삭제'),
  ('연차 승인', 'leave:approve', 'leave', 'approve', '연차 신청 승인/반려'),
  ('연차 전체 조회', 'leave:read_all', 'leave', 'read_all', '모든 연차 신청 조회'),

  -- Employee permissions
  ('직원 조회', 'employee:read', 'employee', 'read', '직원 정보 조회'),
  ('직원 수정', 'employee:update', 'employee', 'update', '직원 정보 수정'),
  ('직원 생성', 'employee:create', 'employee', 'create', '직원 생성'),
  ('직원 삭제', 'employee:delete', 'employee', 'delete', '직원 삭제'),

  -- Department permissions
  ('부서 조회', 'department:read', 'department', 'read', '부서 정보 조회'),
  ('부서 관리', 'department:manage', 'department', 'manage', '부서 생성/수정/삭제'),

  -- Document permissions
  ('문서 생성', 'document:create', 'document', 'create', '문서 생성'),
  ('문서 조회', 'document:read', 'document', 'read', '문서 조회'),
  ('문서 수정', 'document:update', 'document', 'update', '문서 수정'),
  ('문서 삭제', 'document:delete', 'document', 'delete', '문서 삭제'),
  ('문서 승인', 'document:approve', 'document', 'approve', '문서 승인/반려'),

  -- Approval permissions
  ('승인 조회', 'approval:read', 'approval', 'read', '승인 내역 조회'),
  ('승인 처리', 'approval:process', 'approval', 'process', '승인/반려 처리'),

  -- Settings permissions
  ('설정 조회', 'settings:read', 'settings', 'read', '시스템 설정 조회'),
  ('설정 관리', 'settings:manage', 'settings', 'manage', '시스템 설정 관리')
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- 4. ROLE-PERMISSION ASSIGNMENTS
-- ================================================================

-- Employee (level 1) - Basic permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'employee'),
  p.id
FROM permission p
WHERE p.code IN (
  'leave:create',
  'leave:read',
  'employee:read',
  'department:read',
  'document:create',
  'document:read',
  'approval:read'
)
ON CONFLICT DO NOTHING;

-- Team Leader (level 2) - Employee permissions + Approval permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'team_leader'),
  p.id
FROM permission p
WHERE p.code IN (
  'leave:create',
  'leave:read',
  'leave:approve',
  'employee:read',
  'department:read',
  'document:create',
  'document:read',
  'document:approve',
  'approval:read',
  'approval:process'
)
ON CONFLICT DO NOTHING;

-- Department Head (level 3) - Team leader permissions + Department management
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'department_head'),
  p.id
FROM permission p
WHERE p.code IN (
  'leave:create',
  'leave:read',
  'leave:approve',
  'employee:read',
  'employee:update',
  'department:read',
  'department:manage',
  'document:create',
  'document:read',
  'document:approve',
  'approval:read',
  'approval:process'
)
ON CONFLICT DO NOTHING;

-- Business Head (level 4) - Department head permissions + Full view access
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'business_head'),
  p.id
FROM permission p
WHERE p.code IN (
  'leave:create',
  'leave:read',
  'leave:read_all',
  'leave:approve',
  'employee:read',
  'employee:update',
  'department:read',
  'department:manage',
  'document:create',
  'document:read',
  'document:approve',
  'approval:read',
  'approval:process'
)
ON CONFLICT DO NOTHING;

-- HR (level 5) - Full HR management permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'hr'),
  p.id
FROM permission p
WHERE p.code IN (
  'leave:create',
  'leave:read',
  'leave:read_all',
  'leave:update',
  'leave:delete',
  'leave:approve',
  'employee:read',
  'employee:create',
  'employee:update',
  'employee:delete',
  'department:read',
  'department:manage',
  'document:create',
  'document:read',
  'document:update',
  'document:delete',
  'document:approve',
  'approval:read',
  'approval:process'
)
ON CONFLICT DO NOTHING;

-- Admin (level 0) - All permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'admin'),
  p.id
FROM permission p
ON CONFLICT DO NOTHING;

-- ================================================================
-- ORGANIZATION STRUCTURE VISUALIZATION
-- ================================================================
-- 본사 (HQ)
-- ├── 개발부 (DEV_DEPT)
-- │   ├── 개발1팀 (DEV_TEAM1)
-- │   └── 개발2팀 (DEV_TEAM2)
-- ├── 디자인부 (DESIGN_DEPT)
-- │   └── 디자인1팀 (DESIGN_TEAM1)
-- └── 인사팀 (HR)
-- ================================================================

-- ================================================================
-- 5. MASTER ADMIN EMPLOYEE RECORD (WITHOUT AUTH)
-- ================================================================
-- NOTE: This is the employee record only. Auth user must be created separately
-- using scripts/create-master-account.ts
--
-- WHY? Auth users require Supabase Auth Admin API for proper password hashing,
-- email verification, and token management. Direct SQL INSERT into auth.users
-- will not work correctly.
--
-- For test accounts, use scripts/create-test-accounts.ts
-- ================================================================

-- Master Admin Employee Record
INSERT INTO employee (
  id,
  department_id,
  role_id,
  name,
  email,
  phone,
  employment_date,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM department WHERE code = 'HQ'),
  (SELECT id FROM role WHERE code = 'admin'),
  '시스템 관리자',
  'admin@must-access.com',
  '02-0000-0000',
  '2025-01-01',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Annual Leave Balance for Master Admin
-- 주의: annual_leave_balance 테이블은 year 컬럼 없이 employee_id가 PK임
INSERT INTO annual_leave_balance (employee_id, total_days, used_days, remaining_days) VALUES
  ('00000000-0000-0000-0000-000000000000', 25, 0, 25)
ON CONFLICT (employee_id) DO UPDATE SET
  total_days = EXCLUDED.total_days,
  remaining_days = EXCLUDED.remaining_days;

-- ================================================================
-- IMPORTANT: CREATE AUTH USERS
-- ================================================================
-- After running this SQL, you MUST create auth users:
--
-- Method 1 (Recommended): Use the automated script
--   ./scripts/reset-and-seed.sh
--
-- Method 2: Create auth users manually
--   npx tsx scripts/create-master-account.ts    # Master admin
--   npx tsx scripts/create-test-accounts.ts     # Test accounts
--
-- Master account credentials:
--   - Email: admin@must-access.com
--   - Password: Admin@2025!
--
-- Test accounts are created via scripts, not in this SQL file.
-- ================================================================

-- ================================================================
-- 6. MEETING ROOMS SETUP
-- ================================================================

INSERT INTO meeting_room (code, name, floor, capacity, location, description, photo_url, has_whiteboard, has_monitor, has_camera, has_outlet, has_hdmi) VALUES
  ('ROOM_2_1', 'Innovation Lab', 2, 6, '2층 동쪽', '혁신적인 아이디어 회의를 위한 공간', NULL, true, true, false, true, true),
  ('ROOM_2_2', 'Creative Hub', 2, 8, '2층 서쪽', '창의적인 브레인스토밍을 위한 공간', NULL, true, true, true, true, true),
  ('ROOM_3_1', 'Strategy Room', 3, 10, '3층 동쪽', '전략 회의를 위한 중형 회의실', NULL, true, true, true, true, true),
  ('ROOM_3_2', 'Executive Suite', 3, 12, '3층 서쪽', '임원 회의를 위한 고급 회의실', NULL, true, true, true, true, true),
  ('ROOM_6_1', 'Town Hall', 6, 50, '6층 중앙', '전사 회의를 위한 대형 홀', NULL, true, true, true, true, true),
  ('ROOM_6_2', 'Conference A', 6, 20, '6층 동쪽', '대규모 컨퍼런스룸', NULL, true, true, true, true, true),
  ('ROOM_6_3', 'Conference B', 6, 15, '6층 서쪽', '중대형 컨퍼런스룸', NULL, true, true, false, true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  floor = EXCLUDED.floor,
  capacity = EXCLUDED.capacity,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  has_whiteboard = EXCLUDED.has_whiteboard,
  has_monitor = EXCLUDED.has_monitor,
  has_camera = EXCLUDED.has_camera,
  has_outlet = EXCLUDED.has_outlet,
  has_hdmi = EXCLUDED.has_hdmi;
