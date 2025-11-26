-- Setup Permissions and Role Permissions
-- Migration: 20250119000023_setup_permissions
-- Description: Create permissions and assign them to roles

-- ============================================
-- 1. Create Permissions
-- ============================================

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

-- ============================================
-- 2. Assign Permissions to Roles
-- ============================================

-- 직원 (employee, level 1) - 기본 권한
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

-- 팀리더 (team_leader, level 2) - 직원 권한 + 승인 권한
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

-- 부서장 (department_head, level 3) - 팀리더 권한 + 부서 관리
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

-- 사업부장 (business_head, level 4) - 부서장 권한 + 전체 조회
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

-- HR (hr, level 5) - 전체 인사 관리 권한
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

-- 관리자 (admin, level 0) - 모든 권한
INSERT INTO role_permission (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE code = 'admin'),
  p.id
FROM permission p
ON CONFLICT DO NOTHING;
