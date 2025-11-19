-- Fix employee visibility for approval line selection
-- Regular employees need to see all active employees to select them as approvers

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON employee;
DROP POLICY IF EXISTS "Admins can view all employees" ON employee;

-- Create new comprehensive SELECT policies

-- 1. Users can always view their own profile (even if inactive)
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid() = id);

-- 2. Admins can view all employees (active and inactive)
CREATE POLICY "Admins can view all employees"
ON employee FOR SELECT
USING (auth.is_admin() = true);

-- 3. All authenticated users can view active employees (for approval line selection)
CREATE POLICY "All users can view active employees"
ON employee FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND status = 'active'
);

-- Add comment explaining the policy
COMMENT ON POLICY "All users can view active employees" ON employee IS
'Allows all authenticated users to view active employees for approval line selection and collaboration features';
