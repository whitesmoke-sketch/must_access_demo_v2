-- RLS for Permission Tables
-- Migration: 20250119000007_rls_permissions
-- Description: Row Level Security policies for permission and role_permission tables

-- ================================================
-- permission 테이블 RLS
-- ================================================

ALTER TABLE permission ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 권한 목록 조회 가능 (UI에서 권한 표시용)
CREATE POLICY "All authenticated users can view permissions"
ON permission FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 권한 관리 가능
CREATE POLICY "Admins can manage permissions"
ON permission FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- role_permission 테이블 RLS
-- ================================================

ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 역할-권한 매핑 조회 가능
CREATE POLICY "All authenticated users can view role permissions"
ON role_permission FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 역할-권한 매핑 관리 가능
CREATE POLICY "Admins can manage role permissions"
ON role_permission FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
