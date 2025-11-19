-- RLS for Asset Management Tables
-- Migration: 20250119000005_rls_assets
-- Description: Row Level Security policies for equipment, locker, seat, and related tables

-- ================================================
-- equipment 테이블 RLS
-- ================================================

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 장비 조회 가능
CREATE POLICY "All users can view equipment"
ON equipment FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 장비 관리 가능
CREATE POLICY "Admins can manage equipment"
ON equipment FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- locker 테이블 RLS
-- ================================================

ALTER TABLE locker ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 사물함 목록 조회 가능 (사용 가능 여부 확인용)
CREATE POLICY "All users can view lockers"
ON locker FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 사물함 관리 가능
CREATE POLICY "Admins can manage lockers"
ON locker FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- locker_access_log 테이블 RLS
-- ================================================

ALTER TABLE locker_access_log ENABLE ROW LEVEL SECURITY;

-- 직원은 본인의 사물함 접근 로그만 조회 가능
CREATE POLICY "Employees can view own locker access logs"
ON locker_access_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = locker_access_log.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 사물함 접근 로그 조회 가능
CREATE POLICY "Admins can view all locker access logs"
ON locker_access_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 시스템이 자동으로 로그 생성 (제한 없음)
CREATE POLICY "System can create locker access logs"
ON locker_access_log FOR INSERT
WITH CHECK (true);

-- ================================================
-- seat 테이블 RLS
-- ================================================

ALTER TABLE seat ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 좌석 조회 가능
CREATE POLICY "All users can view seats"
ON seat FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 좌석 관리 가능
CREATE POLICY "Admins can manage seats"
ON seat FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- seat_reservation 테이블 RLS
-- ================================================

ALTER TABLE seat_reservation ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 좌석 예약 현황 조회 가능 (예약된 좌석 파악용)
CREATE POLICY "All users can view seat reservations"
ON seat_reservation FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 직원은 본인의 좌석 예약만 생성 가능
CREATE POLICY "Employees can create own seat reservations"
ON seat_reservation FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = seat_reservation.employee_id
    AND employee.id = auth.uid()
  )
);

-- 직원은 본인의 예약만 수정/취소 가능
CREATE POLICY "Employees can update own seat reservations"
ON seat_reservation FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = seat_reservation.employee_id
    AND employee.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = seat_reservation.employee_id
    AND employee.id = auth.uid()
  )
);

-- 직원은 본인의 예약만 삭제 가능
CREATE POLICY "Employees can delete own seat reservations"
ON seat_reservation FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = seat_reservation.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 좌석 예약 관리 가능
CREATE POLICY "Admins can manage all seat reservations"
ON seat_reservation FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- digital_nameplate 테이블 RLS
-- ================================================

ALTER TABLE digital_nameplate ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 디지털 네임플레이트 조회 가능
CREATE POLICY "All users can view digital nameplates"
ON digital_nameplate FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 디지털 네임플레이트 관리 가능
CREATE POLICY "Admins can manage digital nameplates"
ON digital_nameplate FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
