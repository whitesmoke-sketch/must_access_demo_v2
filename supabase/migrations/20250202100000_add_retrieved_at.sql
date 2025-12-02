-- Add retrieved_at column to leave_request table
-- This tracks when a leave request was withdrawn/retrieved

ALTER TABLE leave_request
ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN leave_request.retrieved_at IS 'Timestamp when the leave request was withdrawn/retrieved by the employee';
