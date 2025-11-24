-- ================================================================
-- ATTENDANCE TABLE MIGRATION
-- ================================================================
-- Purpose: Create attendance table for tracking employee attendance
-- Required by: grant-attendance-award edge function
-- ================================================================

-- Create attendance status enum
CREATE TYPE attendance_status AS ENUM (
  'present',    -- 정상 출근
  'late',       -- 지각
  'absent',     -- 결근
  'leave',      -- 휴가
  'holiday'     -- 공휴일
);

-- Create attendance table
CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'present',
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT attendance_employee_date_unique UNIQUE (employee_id, date),
  CONSTRAINT attendance_checkout_after_checkin CHECK (check_out IS NULL OR check_out >= check_in),
  CONSTRAINT attendance_late_minutes_positive CHECK (late_minutes >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);

-- Enable Row Level Security
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own attendance records
CREATE POLICY "Users can view their own attendance"
  ON attendance
  FOR SELECT
  USING (
    auth.uid() = employee_id
    OR
    EXISTS (
      SELECT 1
      FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid()
      AND r.level >= 3
      AND e.status = 'active'
    )
  );

-- RLS Policy: Only managers (level >= 3) can insert attendance records
CREATE POLICY "Managers can insert attendance"
  ON attendance
  FOR INSERT
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

-- RLS Policy: Only managers (level >= 3) can update attendance records
CREATE POLICY "Managers can update attendance"
  ON attendance
  FOR UPDATE
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

-- RLS Policy: Only managers (level >= 3) can delete attendance records
CREATE POLICY "Managers can delete attendance"
  ON attendance
  FOR DELETE
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- Add comments
COMMENT ON TABLE attendance IS 'Employee attendance records for tracking check-in/check-out times and attendance status';
COMMENT ON COLUMN attendance.employee_id IS 'Reference to employee who this attendance record belongs to';
COMMENT ON COLUMN attendance.date IS 'Date of the attendance record';
COMMENT ON COLUMN attendance.check_in IS 'Time when employee checked in';
COMMENT ON COLUMN attendance.check_out IS 'Time when employee checked out';
COMMENT ON COLUMN attendance.status IS 'Attendance status: present, late, absent, leave, holiday';
COMMENT ON COLUMN attendance.late_minutes IS 'Number of minutes late (0 if on time)';
COMMENT ON COLUMN attendance.notes IS 'Additional notes about this attendance record';
