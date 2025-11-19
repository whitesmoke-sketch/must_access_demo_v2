-- Simplify employee RLS to completely avoid recursion
-- Root cause: Complex policies with subqueries cause recursion
-- Solution: Use simple, non-recursive policies

-- Drop all current SELECT policies on employee
DROP POLICY IF EXISTS "Users can view own profile" ON employee;
DROP POLICY IF EXISTS "Admins can view all employees" ON employee;
DROP POLICY IF EXISTS "Admins can view all employees inline" ON employee;
DROP POLICY IF EXISTS "Users can view department members" ON employee;
DROP POLICY IF EXISTS "Users can view employees for approval" ON employee;
DROP POLICY IF EXISTS "All users can view active employees" ON employee;
DROP POLICY IF EXISTS "Authenticated users view active employees" ON employee;

-- Create new simplified policies

-- 1. All authenticated users can view active employees
-- This is the simplest policy that doesn't cause recursion
CREATE POLICY "View active employees"
ON employee FOR SELECT
USING (
  status = 'active'
  AND auth.uid() IS NOT NULL
);

-- 2. Users can view their own profile even if inactive
CREATE POLICY "View own profile"
ON employee FOR SELECT
USING (id = auth.uid());

-- Comments
COMMENT ON POLICY "View active employees" ON employee IS
'Simple policy allowing all authenticated users to view active employees without recursion';

COMMENT ON POLICY "View own profile" ON employee IS
'Allows users to view their own profile regardless of status';
