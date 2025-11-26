-- Unified RLS Policies
-- Migration: 20250120000001_unified_rls
-- Description: All RLS policies in one file for easier management
-- Created: 2025-11-20

-- ================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ================================================================

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_award ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_of_absence ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 2. EMPLOYEE TABLE POLICIES
-- ================================================================

-- Users can view their own profile
CREATE POLICY employee_select_own
ON employee FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY employee_update_own
ON employee FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can view other active employees (for approval line selection)
CREATE POLICY employee_select_others
ON employee FOR SELECT
TO authenticated
USING (status = 'active');

-- ================================================================
-- 3. ROLE & DEPARTMENT TABLES (Public Read)
-- ================================================================

-- All authenticated users can view roles
CREATE POLICY role_select_all
ON role FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can view departments
CREATE POLICY department_select_all
ON department FOR SELECT
TO authenticated
USING (true);

-- ================================================================
-- 4. LEAVE REQUEST POLICIES
-- ================================================================

-- Users can view their own leave requests
CREATE POLICY leave_request_select_own
ON leave_request FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Users can create their own leave requests
CREATE POLICY leave_request_insert_own
ON leave_request FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Users can update their own pending leave requests
CREATE POLICY leave_request_update_own
ON leave_request FOR UPDATE
TO authenticated
USING (employee_id = auth.uid() AND status = 'pending')
WITH CHECK (employee_id = auth.uid());

-- Approvers can view leave requests they need to approve
CREATE POLICY leave_request_select_as_approver
ON leave_request FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
    AND approval_step.request_id = leave_request.id
    AND approval_step.approver_id = auth.uid()
  )
);

-- Approvers can update leave requests they are assigned to approve
CREATE POLICY leave_request_update_as_approver
ON leave_request FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
    AND approval_step.request_id = leave_request.id
    AND approval_step.approver_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
    AND approval_step.request_id = leave_request.id
    AND approval_step.approver_id = auth.uid()
  )
);

-- ================================================================
-- 5. ANNUAL LEAVE BALANCE POLICIES
-- ================================================================

-- Users can view their own leave balance
CREATE POLICY leave_balance_select_own
ON annual_leave_balance FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- 6. ANNUAL LEAVE GRANT POLICIES
-- ================================================================

-- Users can view their own leave grants
CREATE POLICY leave_grant_select_own
ON annual_leave_grant FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- 7. ANNUAL LEAVE USAGE POLICIES
-- ================================================================

-- Users can view their own leave usage
CREATE POLICY leave_usage_select_own
ON annual_leave_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leave_request
    WHERE leave_request.id = annual_leave_usage.leave_request_id
    AND leave_request.employee_id = auth.uid()
  )
);

-- ================================================================
-- 8. ATTENDANCE AWARD POLICIES
-- ================================================================

-- Users can view their own attendance awards
CREATE POLICY attendance_award_select_own
ON attendance_award FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- 9. OVERTIME CONVERSION POLICIES
-- ================================================================

-- Users can view their own overtime conversions
CREATE POLICY overtime_conversion_select_own
ON overtime_conversion FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- 10. LEAVE OF ABSENCE POLICIES
-- ================================================================

-- Users can view their own leave of absence records
CREATE POLICY leave_of_absence_select_own
ON leave_of_absence FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- 11. APPROVAL STEP POLICIES
-- ================================================================

-- Users can view approval steps where they are the approver
CREATE POLICY approval_step_select_approver
ON approval_step FOR SELECT
TO authenticated
USING (approver_id = auth.uid());

-- Users can update approval steps where they are the approver
CREATE POLICY approval_step_update_approver
ON approval_step FOR UPDATE
TO authenticated
USING (approver_id = auth.uid() AND status = 'pending')
WITH CHECK (approver_id = auth.uid());

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON POLICY employee_select_own ON employee IS
'Users can only view their own employee record';

COMMENT ON POLICY leave_request_select_own ON leave_request IS
'Users can only view their own leave requests';

COMMENT ON POLICY leave_balance_select_own ON annual_leave_balance IS
'Users can only view their own annual leave balance';
