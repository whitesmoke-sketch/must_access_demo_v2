-- ================================================================
-- CREATE INVITED EMPLOYEES TABLE
-- ================================================================
-- Purpose: Store invited employees before they register via Google OAuth
-- This enables email-based allowlist for registration
-- ================================================================

CREATE TABLE invited_employees (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department_id BIGINT NOT NULL REFERENCES department(id),
  role_id BIGINT NOT NULL REFERENCES role(id),
  employment_date DATE NOT NULL,

  -- Optional information
  phone VARCHAR(20),
  location VARCHAR(100),

  -- Invitation management
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired')),
  invited_by UUID REFERENCES employee(id), -- Who sent the invitation
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ, -- When the user registered

  -- Metadata
  note TEXT
);

-- Indexes
CREATE INDEX idx_invited_email ON invited_employees(email);
CREATE INDEX idx_invited_status ON invited_employees(status);
CREATE INDEX idx_invited_by ON invited_employees(invited_by);

-- Comments
COMMENT ON TABLE invited_employees IS 'Invited employees awaiting registration via Google OAuth';
COMMENT ON COLUMN invited_employees.status IS 'pending: awaiting registration, registered: completed, expired: invitation expired';
COMMENT ON COLUMN invited_employees.invited_by IS 'Employee who created the invitation (usually HR)';
