-- Fix auth helper functions to properly bypass RLS
-- This prevents infinite recursion when RLS policies call these functions

-- Recreate auth.is_admin() with explicit RLS bypass
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Temporarily disable RLS for this query to avoid recursion
  SET LOCAL row_security = off;

  SELECT r.code IN ('admin', 'super_admin')
  INTO result
  FROM employee e
  INNER JOIN role r ON e.role_id = r.id
  WHERE e.id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(result, false);
END;
$$;

-- Recreate auth.current_user_role_code() with explicit RLS bypass
CREATE OR REPLACE FUNCTION auth.current_user_role_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Temporarily disable RLS for this query to avoid recursion
  SET LOCAL row_security = off;

  SELECT r.code
  INTO result
  FROM employee e
  INNER JOIN role r ON e.role_id = r.id
  WHERE e.id = auth.uid()
  LIMIT 1;

  RETURN result;
END;
$$;

-- Recreate auth.current_department_id() with explicit RLS bypass
CREATE OR REPLACE FUNCTION auth.current_department_id()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
BEGIN
  -- Temporarily disable RLS for this query to avoid recursion
  SET LOCAL row_security = off;

  SELECT e.department_id
  INTO result
  FROM employee e
  WHERE e.id = auth.uid()
  LIMIT 1;

  RETURN result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION auth.is_admin() IS
'Returns true if current user is admin or super_admin. Uses SET LOCAL row_security = off to bypass RLS and prevent infinite recursion.';

COMMENT ON FUNCTION auth.current_user_role_code() IS
'Returns current user role code. Uses SET LOCAL row_security = off to bypass RLS and prevent infinite recursion.';

COMMENT ON FUNCTION auth.current_department_id() IS
'Returns current user department_id. Uses SET LOCAL row_security = off to bypass RLS and prevent infinite recursion.';
