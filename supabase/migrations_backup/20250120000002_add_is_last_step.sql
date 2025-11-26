-- Add is_last_step column to approval_step table
-- Migration: 20250120000002_add_is_last_step
-- Description: Add boolean flag to identify the last approval step
-- Created: 2025-11-20

ALTER TABLE approval_step
ADD COLUMN is_last_step BOOLEAN DEFAULT false NOT NULL;

-- Add comment
COMMENT ON COLUMN approval_step.is_last_step IS
'Indicates if this is the final approval step for the request';

-- Update existing data: set is_last_step = true for the highest step_order of each request
UPDATE approval_step
SET is_last_step = true
WHERE (request_type, request_id, step_order) IN (
  SELECT request_type, request_id, MAX(step_order)
  FROM approval_step
  GROUP BY request_type, request_id
);
