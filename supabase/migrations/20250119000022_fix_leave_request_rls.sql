-- Fix Leave Request RLS for New Approval System
-- Migration: 20250119000022_fix_leave_request_rls
-- Description: Update RLS policies to work with approval_step table

-- Drop old policies that use leave_request.approver_id
DROP POLICY IF EXISTS "Approvers can view requests to approve" ON leave_request;
DROP POLICY IF EXISTS "Approvers can update leave requests" ON leave_request;

-- Create new policies that use approval_step table
CREATE POLICY "Approvers can view requests via approval_step"
ON leave_request FOR SELECT
USING (
  -- Approvers can see requests where they have an approval step
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
      AND approval_step.request_id = leave_request.id
      AND approval_step.approver_id = auth.uid()
  )
);

CREATE POLICY "Approvers can update requests via approval_step"
ON leave_request FOR UPDATE
USING (
  -- Approvers can update requests where they have a pending approval step
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
      AND approval_step.request_id = leave_request.id
      AND approval_step.approver_id = auth.uid()
      AND approval_step.status = 'pending'
  )
)
WITH CHECK (
  -- Same check for WITH CHECK clause
  EXISTS (
    SELECT 1 FROM approval_step
    WHERE approval_step.request_type = 'leave'
      AND approval_step.request_id = leave_request.id
      AND approval_step.approver_id = auth.uid()
      AND approval_step.status = 'pending'
  )
);
