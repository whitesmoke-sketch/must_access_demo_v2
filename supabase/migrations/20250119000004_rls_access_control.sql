-- RLS for Access Control Tables
-- Migration: 20250119000004_rls_access_control
-- Description: Row Level Security policies for visitor, access_point, access_credential, access_log

-- ================================================
-- visitor 테이블 RLS
-- ================================================

ALTER TABLE visitor ENABLE ROW LEVEL SECURITY;

-- 호스트 직원은 자신이 호스트인 방문자 정보 조회 가능
CREATE POLICY "Host employees can view their visitors"
ON visitor FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = visitor.host_employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 방문자 정보 조회 가능
CREATE POLICY "Admins can view all visitors"
ON visitor FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 직원은 자신이 호스트인 방문자만 등록 가능
CREATE POLICY "Employees can register visitors"
ON visitor FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = visitor.host_employee_id
    AND employee.id = auth.uid()
  )
);

-- 호스트 직원은 자신의 방문자 정보 수정 가능
CREATE POLICY "Host employees can update their visitors"
ON visitor FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = visitor.host_employee_id
    AND employee.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = visitor.host_employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 방문자 관리 가능
CREATE POLICY "Admins can manage all visitors"
ON visitor FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- access_point 테이블 RLS
-- ================================================

ALTER TABLE access_point ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 출입 지점 조회 가능
CREATE POLICY "All users can view access points"
ON access_point FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 출입 지점 관리 가능
CREATE POLICY "Admins can manage access points"
ON access_point FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- access_credential 테이블 RLS
-- ================================================

ALTER TABLE access_credential ENABLE ROW LEVEL SECURITY;

-- 직원은 본인의 출입 인증 정보만 조회 가능
CREATE POLICY "Employees can view own credentials"
ON access_credential FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = access_credential.employee_id
    AND employee.id = auth.uid()
  )
);

-- 호스트 직원은 자신의 방문자 인증 정보 조회 가능
CREATE POLICY "Host employees can view visitor credentials"
ON access_credential FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM visitor v
    INNER JOIN employee e ON v.host_employee_id = e.id
    WHERE v.id = access_credential.visitor_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 출입 인증 정보 조회 가능
CREATE POLICY "Admins can view all credentials"
ON access_credential FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 출입 인증 정보 관리 가능
CREATE POLICY "Admins can manage credentials"
ON access_credential FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- access_log 테이블 RLS
-- ================================================

ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;

-- 직원은 본인의 출입 로그만 조회 가능
CREATE POLICY "Employees can view own access logs"
ON access_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM access_credential ac
    INNER JOIN employee e ON ac.employee_id = e.id
    WHERE ac.id = access_log.credential_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 출입 로그 조회 가능
CREATE POLICY "Admins can view all access logs"
ON access_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 시스템/Admin만 출입 로그 생성 가능 (자동 기록)
CREATE POLICY "System can create access logs"
ON access_log FOR INSERT
WITH CHECK (true); -- 출입 장치에서 자동으로 기록되므로 제한 없음

-- Admin만 출입 로그 수정 가능 (일반적으로 수정하지 않음)
CREATE POLICY "Admins can update access logs"
ON access_log FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
