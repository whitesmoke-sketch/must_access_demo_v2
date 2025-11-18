-- Phase 0: Authentication & Layout RLS Policies
-- Created: 2025-01-18
-- Updated: 2025-01-18 (Post-Codex Review)

-- ================================================
-- employee 테이블 RLS
-- ================================================

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 정보만 조회 가능
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid()::text = id::text);

-- Admin은 모든 employee 조회 가능
CREATE POLICY "Admins can view all employees"
ON employee FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()::text
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 사용자는 본인 정보 수정 가능 (이름, 팀, 포지션 등)
CREATE POLICY "Users can update own profile"
ON employee FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

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
