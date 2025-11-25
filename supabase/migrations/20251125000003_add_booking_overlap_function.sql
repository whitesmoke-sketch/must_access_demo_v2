-- RPC function to check if there's an overlapping booking
CREATE OR REPLACE FUNCTION check_booking_overlap(
  p_room_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overlap_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_overlap_count
  FROM meeting_room_booking
  WHERE room_id = p_room_id
    AND booking_date = p_booking_date
    AND status != 'cancelled'
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Check if there's any time overlap
      (p_start_time >= start_time AND p_start_time < end_time)
      OR (p_end_time > start_time AND p_end_time <= end_time)
      OR (p_start_time <= start_time AND p_end_time >= end_time)
    );

  RETURN v_overlap_count > 0;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION check_booking_overlap IS 'Check if there is an overlapping meeting room booking for the specified time slot';
