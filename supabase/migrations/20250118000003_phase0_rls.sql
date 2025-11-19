-- Phase 0: Authentication & Layout RLS Policies
-- Created: 2025-01-18
-- Updated: 2025-01-19 (employee.id changed to UUID)

-- ================================================
-- employee 테이블 RLS
-- ================================================

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

-- NOTE: employee 상세 RLS 정책은 20250119000008_fix_rls_recursion.sql에서 설정됨

-- ================================================
-- role 테이블 RLS
-- ================================================

ALTER TABLE role ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 역할 목록 조회 가능
CREATE POLICY "All authenticated users can view roles"
ON role FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ================================================
-- department 테이블 RLS
-- ================================================

ALTER TABLE department ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 부서 목록 조회 가능
CREATE POLICY "All authenticated users can view departments"
ON department FOR SELECT
USING (auth.uid() IS NOT NULL);
