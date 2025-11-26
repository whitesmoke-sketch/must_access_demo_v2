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

  -- 2. Calculate total used days from usage records
  SELECT COALESCE(SUM(u.used_days), 0)
  INTO v_used
  FROM annual_leave_usage u
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
    FROM annual_leave_usage
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
