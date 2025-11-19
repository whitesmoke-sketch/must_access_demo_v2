-- RLS for Leave Management Tables
-- Migration: 20250119000003_rls_leave
-- Description: Row Level Security policies for leave_request, annual_leave_grant, annual_leave_balance, annual_leave_usage

-- ================================================
-- leave_request 테이블 RLS
-- ================================================

ALTER TABLE leave_request ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 연차 요청만 조회 가능
CREATE POLICY "Users can view own leave requests"
ON leave_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- 승인자는 자신이 승인해야 하는 연차 요청 조회 가능
CREATE POLICY "Approvers can view requests to approve"
ON leave_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.approver_id
    AND employee.id = auth.uid()
  )
);

-- 같은 팀원들은 승인된 연차 요청 조회 가능 (휴가 일정 파악용)
CREATE POLICY "Team members can view approved leave requests"
ON leave_request FOR SELECT
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1 FROM employee e1
    INNER JOIN employee e2 ON e1.department_id = e2.department_id
    WHERE e1.id = leave_request.employee_id
    AND e2.id = auth.uid()
  )
);

-- Admin은 모든 연차 요청 조회 가능
CREATE POLICY "Admins can view all leave requests"
ON leave_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 사용자는 본인의 연차 요청만 생성 가능
CREATE POLICY "Users can create own leave requests"
ON leave_request FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- 사용자는 본인의 pending 상태 연차 요청만 수정/삭제 가능
CREATE POLICY "Users can update own pending leave requests"
ON leave_request FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.employee_id
    AND employee.id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- 승인자는 자신이 승인해야 하는 요청 수정 가능 (승인/반려)
CREATE POLICY "Approvers can update leave requests"
ON leave_request FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_request.approver_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 연차 요청 수정 가능
CREATE POLICY "Admins can update all leave requests"
ON leave_request FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- annual_leave_grant 테이블 RLS
-- ================================================

ALTER TABLE annual_leave_grant ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 연차 부여 내역만 조회 가능
CREATE POLICY "Users can view own leave grants"
ON annual_leave_grant FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = annual_leave_grant.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 연차 부여 내역 조회 가능
CREATE POLICY "Admins can view all leave grants"
ON annual_leave_grant FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 연차 부여 생성/수정 가능
CREATE POLICY "Admins can manage leave grants"
ON annual_leave_grant FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- annual_leave_balance 테이블 RLS
-- ================================================

ALTER TABLE annual_leave_balance ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 연차 잔여 현황만 조회 가능
CREATE POLICY "Users can view own leave balance"
ON annual_leave_balance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = annual_leave_balance.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 연차 잔여 현황 조회 가능
CREATE POLICY "Admins can view all leave balances"
ON annual_leave_balance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 연차 잔여 현황 수정 가능 (시스템이 자동으로 업데이트)
CREATE POLICY "Admins can update leave balances"
ON annual_leave_balance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- annual_leave_usage 테이블 RLS
-- ================================================

ALTER TABLE annual_leave_usage ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 연차 사용 내역만 조회 가능
CREATE POLICY "Users can view own leave usage"
ON annual_leave_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leave_request lr
    INNER JOIN employee e ON lr.employee_id = e.id
    WHERE lr.id = annual_leave_usage.leave_request_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 연차 사용 내역 조회 가능
CREATE POLICY "Admins can view all leave usage"
ON annual_leave_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 시스템/Admin만 연차 사용 내역 생성 가능
CREATE POLICY "Admins can create leave usage"
ON annual_leave_usage FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- attendance_award 테이블 RLS
-- ================================================

ALTER TABLE attendance_award ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 만근 포상 내역만 조회 가능
CREATE POLICY "Users can view own attendance awards"
ON attendance_award FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = attendance_award.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 만근 포상 내역 조회 가능
CREATE POLICY "Admins can view all attendance awards"
ON attendance_award FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 만근 포상 관리 가능
CREATE POLICY "Admins can manage attendance awards"
ON attendance_award FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- overtime_conversion 테이블 RLS
-- ================================================

ALTER TABLE overtime_conversion ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 초과근무 전환 내역만 조회 가능
CREATE POLICY "Users can view own overtime conversions"
ON overtime_conversion FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = overtime_conversion.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 초과근무 전환 내역 조회 가능
CREATE POLICY "Admins can view all overtime conversions"
ON overtime_conversion FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 초과근무 전환 관리 가능
CREATE POLICY "Admins can manage overtime conversions"
ON overtime_conversion FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- leave_of_absence 테이블 RLS
-- ================================================

ALTER TABLE leave_of_absence ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 휴직 내역만 조회 가능
CREATE POLICY "Users can view own leave of absence"
ON leave_of_absence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = leave_of_absence.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 휴직 내역 조회 가능
CREATE POLICY "Admins can view all leave of absence"
ON leave_of_absence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 휴직 관리 가능
CREATE POLICY "Admins can manage leave of absence"
ON leave_of_absence FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
