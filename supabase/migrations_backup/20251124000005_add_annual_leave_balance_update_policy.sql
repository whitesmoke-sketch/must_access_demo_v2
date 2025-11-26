-- ================================================================
-- Add UPDATE and SELECT policies for annual_leave_balance table
-- ================================================================
-- Purpose: Allow managers to update and view all annual leave balances
-- Issue: updateEmployee action was failing with RLS error
-- ================================================================

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
