-- Fix RLS Infinite Recursion
-- Migration: 20250119000008_fix_rls_recursion
-- Description: Create helper functions to avoid infinite recursion in RLS policies

-- ================================================
-- 1. Helper Functions (SECURITY DEFINER to bypass RLS)
-- ================================================

-- Get current user's role code
CREATE OR REPLACE FUNCTION auth.current_user_role_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT r.code
    FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT r.code IN ('admin', 'super_admin')
    FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Get current user's employee_id
CREATE OR REPLACE FUNCTION auth.current_employee_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

-- Get current user's department_id
CREATE OR REPLACE FUNCTION auth.current_department_id()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT e.department_id
    FROM employee e
    WHERE e.id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- ================================================
-- 2. Fix Employee Table RLS Policies
-- ================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON employee;
DROP POLICY IF EXISTS "Admins can view all employees" ON employee;
DROP POLICY IF EXISTS "Users can update own profile" ON employee;

-- Recreate with helper functions

-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON employee FOR SELECT
USING (auth.uid() = id);

-- Admins can view all employees (using helper function)
CREATE POLICY "Admins can view all employees"
ON employee FOR SELECT
USING (auth.is_admin() = true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON employee FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
