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

-- Create approval steps for a request
-- This function creates approval steps for any type of request (leave, document, etc.)
-- and sets up the initial approval flow.
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

  -- Update leave_request current_step
  IF p_request_type = 'leave' THEN
    UPDATE leave_request
    SET current_step = 1
    WHERE id = p_request_id;
  END IF;
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
