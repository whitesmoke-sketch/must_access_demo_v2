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
ALTER TABLE document_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_award ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_of_absence ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_usage_link ENABLE ROW LEVEL SECURITY;

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
-- [REMOVED] doc_* 테이블 RLS 정책들은 삭제됨
-- 모든 문서 상세 데이터는 document_master.doc_data JSONB에 저장됩니다.
-- document_master 정책만 적용됩니다.
-- ================================================================

-- ================================================================
-- 4-1. APPROVAL_CC POLICIES (결재 참조자)
-- ================================================================

ALTER TABLE approval_cc ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_cc_select_own ON approval_cc FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY approval_cc_select_requester ON approval_cc FOR SELECT TO authenticated
  USING (is_document_requester(request_id));

CREATE POLICY approval_cc_insert_requester ON approval_cc FOR INSERT TO authenticated
  WITH CHECK (is_document_requester(request_id));

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
-- 7. LEAVE USAGE LINK POLICIES (대체: annual_leave_usage)
-- ================================================================

-- Users can view their own leave usage
CREATE POLICY leave_usage_link_select_own
ON leave_usage_link FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = leave_usage_link.document_id
    AND document_master.requester_id = auth.uid()
  )
);

-- Users can insert leave usage for their own documents
CREATE POLICY leave_usage_link_insert_own
ON leave_usage_link FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = document_id
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

-- ================================================================
-- 13. WORK REQUEST POLICIES (재택/외근/출장)
-- ================================================================

-- 본인 조회 정책
CREATE POLICY work_request_select_own ON work_request
    FOR SELECT TO authenticated
    USING (employee_id = auth.uid());

-- 본인 등록 정책
CREATE POLICY work_request_insert_own ON work_request
    FOR INSERT TO authenticated
    WITH CHECK (employee_id = auth.uid());

-- 본인 수정 정책 (pending 상태만)
CREATE POLICY work_request_update_own ON work_request
    FOR UPDATE TO authenticated
    USING (employee_id = auth.uid() AND status = 'pending')
    WITH CHECK (employee_id = auth.uid());

-- 승인권자 조회 정책
CREATE POLICY work_request_select_as_approver ON work_request
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    );

-- 승인권자 수정 정책
CREATE POLICY work_request_update_as_approver ON work_request
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    );

-- 관리자(level >= 3) 전체 조회 정책
CREATE POLICY work_request_select_admin ON work_request
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );

-- ================================================================
-- 14. STUDIO ACCESS POLICIES (스튜디오 출입)
-- ================================================================

-- 모든 인증 사용자 조회 가능
CREATE POLICY studio_access_select_all ON studio_access
    FOR SELECT TO authenticated
    USING (true);

-- 관리자(level >= 3)만 수정 가능
CREATE POLICY studio_access_update_admin ON studio_access
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );

-- 관리자만 등록 가능
CREATE POLICY studio_access_insert_admin ON studio_access
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );
