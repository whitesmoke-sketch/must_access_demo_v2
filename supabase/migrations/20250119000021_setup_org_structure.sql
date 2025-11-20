-- Setup Organization Structure
-- Migration: 20250119000021_setup_org_structure
-- Description: Create proper role levels and department hierarchy

-- ============================================
-- 1. Setup Role Levels
-- ============================================

-- 모든 필요한 role을 UPSERT (INSERT ... ON CONFLICT ... UPDATE)
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

-- Sequence 조정
SELECT setval('role_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM role));

-- ============================================
-- 2. Setup Department Hierarchy
-- ============================================

-- 모든 필요한 department를 UPSERT
-- 계층 구조: 본사 > 부서 > 팀
INSERT INTO department (name, code, parent_department_id) VALUES
  ('본사', 'HQ', NULL),
  ('개발부', 'DEV_DEPT', NULL),  -- parent는 나중에 UPDATE
  ('디자인부', 'DESIGN_DEPT', NULL),  -- parent는 나중에 UPDATE
  ('개발1팀', 'DEV_TEAM1', NULL),  -- parent는 나중에 UPDATE
  ('개발2팀', 'DEV_TEAM2', NULL),  -- parent는 나중에 UPDATE
  ('디자인1팀', 'DESIGN_TEAM1', NULL),  -- parent는 나중에 UPDATE
  ('인사팀', 'HR', NULL)  -- parent는 나중에 UPDATE
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name;

-- 계층 구조 설정 (parent_department_id)
UPDATE department SET parent_department_id = NULL WHERE code = 'HQ';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'DEV_DEPT';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'DESIGN_DEPT';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'HQ') WHERE code = 'HR';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DEV_DEPT') WHERE code = 'DEV_TEAM1';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DEV_DEPT') WHERE code = 'DEV_TEAM2';
UPDATE department SET parent_department_id = (SELECT id FROM department WHERE code = 'DESIGN_DEPT') WHERE code = 'DESIGN_TEAM1';

-- Sequence 조정
SELECT setval('department_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM department));
