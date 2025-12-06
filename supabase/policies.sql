-- ================================================================
-- MUST ACCESS - ROW LEVEL SECURITY POLICIES
-- ================================================================
-- Purpose: All RLS policies for database security
-- This file contains:
-- - ALTER TABLE ENABLE ROW LEVEL SECURITY statements
-- - CREATE POLICY statements for all tables
-- - Access control rules for different user roles and permissions
-- ================================================================
-- Source: Unified from 20250120000001_unified_rls.sql
-- Created: 2025-11-20
-- ================================================================

-- ================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ================================================================

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
-- [DEPRECATED] leave_request는 document_master + doc_leave로 대체됨
-- ALTER TABLE leave_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_leave ENABLE ROW LEVEL SECURITY;
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

-- Managers (level >= 3) can insert employees
CREATE POLICY "Managers can insert employees"
ON employee FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

-- Managers (level >= 3) can update employees
CREATE POLICY "Managers can update employees"
ON employee FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

-- Managers (level >= 3) can delete employees
CREATE POLICY "Managers can delete employees"
ON employee FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

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
-- 4. DOCUMENT MASTER POLICIES (replaces leave_request)
-- ================================================================

-- Helper function to check if user is the document requester (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION is_document_requester(p_request_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM document_master
    WHERE id = p_request_id
    AND requester_id = auth.uid()
  );
$$;

-- Users can view their own documents
CREATE POLICY document_master_select_own
ON document_master FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

-- Users can create their own documents
CREATE POLICY document_master_insert_own
ON document_master FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

-- Users can update their own documents (draft, pending for retrieval, retrieved)
CREATE POLICY document_master_update_own
ON document_master FOR UPDATE
TO authenticated
USING (requester_id = auth.uid() AND status IN ('draft', 'pending', 'retrieved'))
WITH CHECK (requester_id = auth.uid());

-- Approvers can view documents they need to approve
CREATE POLICY document_master_select_as_approver
ON document_master FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_id = document_master.id
    AND approval_step.approver_id = auth.uid()
  )
);

-- Approvers can update documents they are assigned to approve
CREATE POLICY document_master_update_as_approver
ON document_master FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_id = document_master.id
    AND approval_step.approver_id = auth.uid()
    AND approval_step.status = 'pending'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_id = document_master.id
    AND approval_step.approver_id = auth.uid()
  )
);

-- ================================================================
-- 4-1. DOC_LEAVE POLICIES (document detail for leave)
-- ================================================================

-- Users can view their own leave documents
CREATE POLICY doc_leave_select_own
ON doc_leave FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = doc_leave.document_id
    AND document_master.requester_id = auth.uid()
  )
);

-- Users can create leave documents for their own documents
CREATE POLICY doc_leave_insert_own
ON doc_leave FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = document_id
    AND document_master.requester_id = auth.uid()
  )
);

-- Approvers can view leave documents they need to approve
CREATE POLICY doc_leave_select_as_approver
ON doc_leave FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_id = doc_leave.document_id
    AND approval_step.approver_id = auth.uid()
  )
);

-- ================================================================
-- [DEPRECATED] LEAVE REQUEST POLICIES
-- 이제 document_master + doc_leave 정책으로 대체됨
-- ================================================================
-- CREATE POLICY leave_request_select_own ON leave_request ...
-- CREATE POLICY leave_request_insert_own ON leave_request ...
-- CREATE POLICY leave_request_update_own ON leave_request ...
-- CREATE POLICY leave_request_select_as_approver ON leave_request ...
-- CREATE POLICY leave_request_update_as_approver ON leave_request ...

-- ================================================================
-- 5. ANNUAL LEAVE BALANCE POLICIES
-- ================================================================

-- Users can view their own leave balance
CREATE POLICY leave_balance_select_own
ON annual_leave_balance FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Managers (level >= 3) can insert leave balances
CREATE POLICY "Managers can insert leave balances"
ON annual_leave_balance FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

-- Managers (level >= 3) can update leave balances
CREATE POLICY "Managers can update leave balances"
ON annual_leave_balance FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

-- Managers (level >= 3) can view all leave balances
CREATE POLICY "Managers can view all leave balances"
ON annual_leave_balance FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);

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

-- Users can view their own leave usage (document_master 참조)
CREATE POLICY leave_usage_select_own
ON annual_leave_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = annual_leave_usage.document_id
    AND document_master.requester_id = auth.uid()
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

-- Users can view approval steps for their own documents (using SECURITY DEFINER function)
CREATE POLICY approval_step_select_by_requester
ON approval_step FOR SELECT
TO authenticated
USING (is_document_requester(request_id));

-- Users can insert approval steps for their own documents
CREATE POLICY approval_step_insert_by_requester
ON approval_step FOR INSERT
TO authenticated
WITH CHECK (is_document_requester(request_id));

-- Users can update approval steps for their own documents (for retrieval)
CREATE POLICY approval_step_update_by_requester
ON approval_step FOR UPDATE
TO authenticated
USING (is_document_requester(request_id))
WITH CHECK (is_document_requester(request_id));

-- Users can update approval steps where they are the approver
-- Only when status is 'pending' (from 20250119000020_lock_requests_after_submission.sql)
CREATE POLICY approval_step_update_approver
ON approval_step FOR UPDATE
TO authenticated
USING (approver_id = auth.uid() AND status = 'pending')
WITH CHECK (approver_id = auth.uid());

-- Approvers can approve or reject pending steps only once
-- Once approved/rejected, cannot be changed again
CREATE POLICY "Approvers can approve or reject pending steps only once"
ON approval_step FOR UPDATE
USING (
  approver_id = auth.uid()
  AND status = 'pending' -- Only pending status
)
WITH CHECK (
  approver_id = auth.uid()
  AND status IN ('approved', 'rejected') -- Can only change to approved or rejected
  AND comment IS NOT NULL -- Comment is required
);

-- ================================================================
-- POLICY COMMENTS
-- ================================================================

COMMENT ON POLICY employee_select_own ON employee IS
'Users can only view their own employee record';

COMMENT ON POLICY document_master_select_own ON document_master IS
'Users can only view their own documents';

COMMENT ON POLICY leave_balance_select_own ON annual_leave_balance IS
'Users can only view their own annual leave balance';

COMMENT ON COLUMN approval_step.comment IS 'Approval/rejection reason (required, cannot be changed)';
COMMENT ON COLUMN approval_step.status IS 'waiting: 대기, pending: 결재 차례, approved: 승인, rejected: 반려, retrieved: 회수됨';

COMMENT ON FUNCTION is_document_requester(BIGINT) IS 'SECURITY DEFINER function to check if current user is the document requester (avoids infinite recursion in RLS)';

-- ================================================================
-- 12. MEETING ROOM POLICIES
-- ================================================================

ALTER TABLE meeting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_booking_attendee ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all active meeting rooms
CREATE POLICY meeting_room_select_all
ON meeting_room FOR SELECT
TO authenticated
USING (is_active = true);

-- All authenticated users can view all bookings
CREATE POLICY booking_select_all
ON meeting_room_booking FOR SELECT
TO authenticated
USING (true);

-- Users can create bookings
CREATE POLICY booking_insert_own
ON meeting_room_booking FOR INSERT
TO authenticated
WITH CHECK (booked_by = auth.uid());

-- Users can update their own bookings
CREATE POLICY booking_update_own
ON meeting_room_booking FOR UPDATE
TO authenticated
USING (booked_by = auth.uid())
WITH CHECK (booked_by = auth.uid());

-- Users can delete their own bookings
CREATE POLICY booking_delete_own
ON meeting_room_booking FOR DELETE
TO authenticated
USING (booked_by = auth.uid());

-- All authenticated users can view attendees
CREATE POLICY attendee_select_all
ON meeting_room_booking_attendee FOR SELECT
TO authenticated
USING (true);

-- Only booking owner can add attendees
CREATE POLICY attendee_insert_by_owner
ON meeting_room_booking_attendee FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meeting_room_booking
    WHERE meeting_room_booking.id = booking_id
    AND meeting_room_booking.booked_by = auth.uid()
  )
);

-- Only booking owner can remove attendees
CREATE POLICY attendee_delete_by_owner
ON meeting_room_booking_attendee FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM meeting_room_booking
    WHERE meeting_room_booking.id = booking_id
    AND meeting_room_booking.booked_by = auth.uid()
  )
);
