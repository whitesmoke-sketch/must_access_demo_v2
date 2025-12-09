-- ================================================================
-- MUST ACCESS - DATABASE FUNCTIONS
-- ================================================================
-- Purpose: All CREATE FUNCTION statements
-- This file contains all database functions including:
-- - Approval workflow functions
-- - Helper functions
-- - Trigger functions
-- ================================================================

-- ================================================================
-- 1. APPROVAL SYSTEM FUNCTIONS
-- ================================================================

-- Helper function to check if current user is the document requester
-- SECURITY DEFINER to avoid infinite recursion in RLS policies
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

GRANT EXECUTE ON FUNCTION is_document_requester(BIGINT) TO authenticated;

COMMENT ON FUNCTION is_document_requester IS 'SECURITY DEFINER function to check if current user is the document requester (avoids infinite recursion in RLS)';

-- Create approval steps for a request
-- This function creates approval steps for any type of request (leave, document, etc.)
-- and sets up the initial approval flow.
-- 변경: leave_request → document_master 참조
CREATE OR REPLACE FUNCTION create_approval_steps(
  p_request_type text,
  p_request_id bigint,
  p_approver_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid;
  v_order integer := 1;
  v_total_steps integer;
BEGIN
  -- Get total number of steps
  v_total_steps := array_length(p_approver_ids, 1);

  -- Iterate through approver array and create approval_step records
  FOREACH v_approver_id IN ARRAY p_approver_ids
  LOOP
    INSERT INTO approval_step (
      request_type,
      request_id,
      approver_id,
      step_order,
      status,
      is_last_step
    ) VALUES (
      p_request_type,
      p_request_id,
      v_approver_id,
      v_order,
      CASE WHEN v_order = 1 THEN 'pending' ELSE 'waiting' END,
      CASE WHEN v_order = v_total_steps THEN true ELSE false END
    );

    v_order := v_order + 1;
  END LOOP;

  -- Update document_master current_step (새 시스템)
  UPDATE document_master
  SET current_step = 1
  WHERE id = p_request_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO service_role;

COMMENT ON FUNCTION create_approval_steps IS 'Creates approval steps for a request with specified approvers in order';

-- ================================================================
-- 2. MEETING ROOM FUNCTIONS
-- ================================================================

-- Check for overlapping bookings
-- Returns true if there's an overlap, false otherwise
CREATE OR REPLACE FUNCTION check_booking_overlap(
  p_room_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM meeting_room_booking
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'confirmed'
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        (p_start_time >= start_time AND p_start_time < end_time)
        OR (p_end_time > start_time AND p_end_time <= end_time)
        OR (p_start_time <= start_time AND p_end_time >= end_time)
      )
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION check_booking_overlap(UUID, DATE, TIME, TIME, UUID) TO authenticated;

COMMENT ON FUNCTION check_booking_overlap IS 'Checks if a booking time overlaps with existing confirmed bookings';

-- ================================================================
-- 3. ANNUAL LEAVE FUNCTIONS
-- ================================================================

-- Update leave balance for an employee
-- This function recalculates and updates the annual_leave_balance table
-- based on grants and usages
CREATE OR REPLACE FUNCTION update_leave_balance(p_employee_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total DECIMAL(6,2);
  v_used DECIMAL(6,2);
  v_expiring_soon DECIMAL(6,2);
  v_expiring_date DATE;
BEGIN
  -- 1. Calculate total granted days (only non-expired grants)
  SELECT COALESCE(SUM(granted_days), 0)
  INTO v_total
  FROM annual_leave_grant
  WHERE employee_id = p_employee_id
    AND expiration_date >= CURRENT_DATE
    AND approval_status = 'approved';

  -- 2. Calculate total used days from usage records (leave_usage_link 사용)
  SELECT COALESCE(SUM(u.used_days), 0)
  INTO v_used
  FROM leave_usage_link u
  JOIN annual_leave_grant g ON u.grant_id = g.id
  WHERE g.employee_id = p_employee_id;

  -- 3. Calculate expiring soon days (within 30 days)
  SELECT
    COALESCE(SUM(
      g.granted_days - COALESCE(usage.total_used, 0)
    ), 0),
    MIN(g.expiration_date)
  INTO v_expiring_soon, v_expiring_date
  FROM annual_leave_grant g
  LEFT JOIN (
    SELECT grant_id, SUM(used_days) as total_used
    FROM leave_usage_link
    GROUP BY grant_id
  ) usage ON g.id = usage.grant_id
  WHERE g.employee_id = p_employee_id
    AND g.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND g.approval_status = 'approved';

  -- 4. Update or insert into annual_leave_balance
  INSERT INTO annual_leave_balance (
    employee_id,
    total_days,
    used_days,
    remaining_days,
    expiring_soon_days,
    expiring_date,
    updated_at
  )
  VALUES (
    p_employee_id,
    v_total,
    v_used,
    v_total - v_used,
    v_expiring_soon,
    v_expiring_date,
    NOW()
  )
  ON CONFLICT (employee_id) DO UPDATE SET
    total_days = EXCLUDED.total_days,
    used_days = EXCLUDED.used_days,
    remaining_days = EXCLUDED.remaining_days,
    expiring_soon_days = EXCLUDED.expiring_soon_days,
    expiring_date = EXCLUDED.expiring_date,
    updated_at = NOW();
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION update_leave_balance(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_leave_balance(UUID) TO authenticated;

COMMENT ON FUNCTION update_leave_balance IS 'Recalculates and updates leave balance for an employee based on grants and usage';

-- ================================================================
-- 4. WORK REQUEST FUNCTIONS
-- ================================================================

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_work_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 존재하면 무시)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_work_request_updated_at') THEN
        CREATE TRIGGER trigger_update_work_request_updated_at
            BEFORE UPDATE ON work_request
            FOR EACH ROW
            EXECUTE FUNCTION update_work_request_updated_at();
    END IF;
END $$;

COMMENT ON FUNCTION update_work_request_updated_at IS 'Automatically updates updated_at timestamp for work_request table';

-- ================================================================
-- 5. STUDIO ACCESS FUNCTIONS
-- ================================================================

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_studio_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 존재하면 무시)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'studio_access_updated_at') THEN
        CREATE TRIGGER studio_access_updated_at
            BEFORE UPDATE ON studio_access
            FOR EACH ROW
            EXECUTE FUNCTION update_studio_access_updated_at();
    END IF;
END $$;

COMMENT ON FUNCTION update_studio_access_updated_at IS 'Automatically updates updated_at timestamp for studio_access table';

-- ================================================================
-- 6. DEPARTMENT PATH FUNCTION
-- ================================================================

-- 부서 경로 조회 함수 (department_with_stats 뷰에서 사용)
CREATE OR REPLACE FUNCTION get_department_path(p_department_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_path TEXT := '';
  v_current_id BIGINT := p_department_id;
  v_name TEXT;
  v_parent_id BIGINT;
BEGIN
  WHILE v_current_id IS NOT NULL LOOP
    SELECT name, parent_department_id
    INTO v_name, v_parent_id
    FROM department
    WHERE id = v_current_id;

    IF v_path = '' THEN
      v_path := v_name;
    ELSE
      v_path := v_name || ' > ' || v_path;
    END IF;

    v_current_id := v_parent_id;
  END LOOP;

  RETURN v_path;
END;
$$;

GRANT EXECUTE ON FUNCTION get_department_path(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_path(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION get_department_path(BIGINT) TO service_role;

COMMENT ON FUNCTION get_department_path IS 'Returns full path of department from root to given department_id';
