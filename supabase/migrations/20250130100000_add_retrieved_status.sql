-- Add 'retrieved' status to leave_request table
-- This allows users to withdraw their pending leave requests

-- Drop the existing CHECK constraint and recreate with 'retrieved' status
ALTER TABLE leave_request
DROP CONSTRAINT IF EXISTS leave_request_status_check;

ALTER TABLE leave_request
ADD CONSTRAINT leave_request_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'retrieved'));
