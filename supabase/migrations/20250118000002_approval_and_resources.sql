-- Must Access - Access Control, Assets, and Resources
-- Migration: 20250118000002_approval_and_resources
-- Description: Access control, visitor management, assets, and hot desking

-- ============================================
-- 1. ACCESS CONTROL (출입 관리)
-- ============================================

-- Visitor table
CREATE TABLE visitor (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  purpose TEXT,
  host_employee_id BIGINT NOT NULL REFERENCES employee(id),
  visit_date DATE NOT NULL,
  visit_start_time TIME,
  visit_end_time TIME,
  actual_checkin TIMESTAMPTZ,
  actual_checkout TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitor_host ON visitor(host_employee_id);
CREATE INDEX idx_visitor_date ON visitor(visit_date);
CREATE INDEX idx_visitor_email ON visitor(email);

-- Access point table
CREATE TABLE access_point (
  id BIGSERIAL PRIMARY KEY,
  point_name VARCHAR(100) NOT NULL,
  point_type VARCHAR(20) NOT NULL,
  location VARCHAR(100),
  device_id VARCHAR(100) UNIQUE,
  device_ip VARCHAR(45),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_point_device ON access_point(device_id);
CREATE INDEX idx_point_active ON access_point(is_active);

-- Access credential table
CREATE TABLE access_credential (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employee(id) ON DELETE CASCADE,
  visitor_id BIGINT REFERENCES visitor(id) ON DELETE CASCADE,
  credential_type VARCHAR(20) NOT NULL,
  credential_value VARCHAR(255) NOT NULL UNIQUE,
  qr_code_data TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((employee_id IS NOT NULL AND visitor_id IS NULL) OR (employee_id IS NULL AND visitor_id IS NOT NULL))
);

CREATE INDEX idx_cred_employee ON access_credential(employee_id);
CREATE INDEX idx_cred_visitor ON access_credential(visitor_id);
CREATE INDEX idx_cred_value ON access_credential(credential_value);
CREATE INDEX idx_cred_active ON access_credential(is_active);

-- Access log table
CREATE TABLE access_log (
  id BIGSERIAL PRIMARY KEY,
  credential_id BIGINT NOT NULL REFERENCES access_credential(id),
  access_point_id BIGINT NOT NULL REFERENCES access_point(id),
  action VARCHAR(10) NOT NULL,
  result VARCHAR(10) NOT NULL,
  access_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_log_credential ON access_log(credential_id);
CREATE INDEX idx_log_point ON access_log(access_point_id);
CREATE INDEX idx_log_time ON access_log(access_time);

-- ============================================
-- 2. ASSET MANAGEMENT (자산/장비)
-- ============================================

-- Equipment table
CREATE TABLE equipment (
  id BIGSERIAL PRIMARY KEY,
  equipment_name VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(20) NOT NULL,
  serial_number VARCHAR(100) UNIQUE,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  purchase_date DATE,
  status VARCHAR(20) DEFAULT 'available',
  specifications JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equip_serial ON equipment(serial_number);
CREATE INDEX idx_equip_type ON equipment(equipment_type);
CREATE INDEX idx_equip_status ON equipment(status);
CREATE INDEX idx_equip_specs_gin ON equipment USING GIN (specifications);

-- Locker table
CREATE TABLE locker (
  id BIGSERIAL PRIMARY KEY,
  locker_number VARCHAR(20) NOT NULL UNIQUE,
  floor INT NOT NULL,
  area VARCHAR(50),
  locker_type VARCHAR(20) DEFAULT 'medium',
  usage_type VARCHAR(20) DEFAULT 'equipment' CHECK (usage_type IN ('equipment', 'personal')),
  assigned_employee_id BIGINT REFERENCES employee(id),
  assigned_equipment_id BIGINT REFERENCES equipment(id),
  is_locked BOOLEAN DEFAULT TRUE,
  lock_device_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locker_number ON locker(locker_number);
CREATE INDEX idx_locker_employee ON locker(assigned_employee_id);
CREATE INDEX idx_locker_usage ON locker(usage_type);

-- Locker access log table
CREATE TABLE locker_access_log (
  id BIGSERIAL PRIMARY KEY,
  locker_id BIGINT NOT NULL REFERENCES locker(id),
  employee_id BIGINT NOT NULL REFERENCES employee(id),
  credential_id BIGINT NOT NULL REFERENCES access_credential(id),
  action VARCHAR(10) NOT NULL,
  result VARCHAR(10) NOT NULL,
  access_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laccess_locker ON locker_access_log(locker_id);
CREATE INDEX idx_laccess_employee ON locker_access_log(employee_id);
CREATE INDEX idx_laccess_time ON locker_access_log(access_time);

-- ============================================
-- 3. HOT DESKING (자유좌석)
-- ============================================

-- Seat table
CREATE TABLE seat (
  id BIGSERIAL PRIMARY KEY,
  seat_number VARCHAR(20) NOT NULL UNIQUE,
  floor INT NOT NULL,
  area VARCHAR(50),
  seat_type VARCHAR(20) DEFAULT 'standard',
  amenities JSONB,
  is_available BOOLEAN DEFAULT TRUE,
  nameplate_device_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seat_number ON seat(seat_number);
CREATE INDEX idx_seat_available ON seat(is_available);
CREATE INDEX idx_seat_amenities_gin ON seat USING GIN (amenities);

-- Seat reservation table
CREATE TABLE seat_reservation (
  id BIGSERIAL PRIMARY KEY,
  seat_id BIGINT NOT NULL REFERENCES seat(id),
  employee_id BIGINT NOT NULL REFERENCES employee(id),
  reservation_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seat_id, reservation_date, start_time)
);

CREATE INDEX idx_res_seat ON seat_reservation(seat_id);
CREATE INDEX idx_res_employee ON seat_reservation(employee_id);
CREATE INDEX idx_res_date ON seat_reservation(reservation_date);

-- Digital nameplate table
CREATE TABLE digital_nameplate (
  id BIGSERIAL PRIMARY KEY,
  seat_id BIGINT NOT NULL UNIQUE REFERENCES seat(id),
  device_id VARCHAR(100) NOT NULL UNIQUE,
  device_ip VARCHAR(45),
  api_endpoint VARCHAR(255),
  current_employee_id BIGINT REFERENCES employee(id),
  display_status VARCHAR(20) DEFAULT 'active',
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nameplate_seat ON digital_nameplate(seat_id);
CREATE INDEX idx_nameplate_device ON digital_nameplate(device_id);

-- ============================================
-- 4. PROJECT (프로젝트)
-- ============================================

-- Project table
CREATE TABLE project (
  id BIGSERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  leader_id BIGINT NOT NULL REFERENCES employee(id),
  department_id BIGINT REFERENCES department(id),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'planning',
  description TEXT,
  jira_project_key VARCHAR(50),
  notion_page_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proj_leader ON project(leader_id);
CREATE INDEX idx_proj_status ON project(status);

-- Project member table
CREATE TABLE project_member (
  project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  position VARCHAR(100),
  join_date DATE,
  leave_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_pm_user ON project_member(user_id);
CREATE INDEX idx_pm_project ON project_member(project_id);

-- ============================================
-- 5. WELFARE (복지)
-- ============================================

-- Welfare request table
CREATE TABLE welfare_request (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  welfare_type VARCHAR(20) NOT NULL,
  event_type VARCHAR(50),
  event_date DATE NOT NULL,
  requested_amount DECIMAL(10,2),
  reason TEXT,
  attachment_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_welfare_employee ON welfare_request(employee_id);
CREATE INDEX idx_welfare_type ON welfare_request(welfare_type);
CREATE INDEX idx_welfare_status ON welfare_request(status);

-- Welfare approval table
CREATE TABLE welfare_approval (
  id BIGSERIAL PRIMARY KEY,
  welfare_request_id BIGINT NOT NULL REFERENCES welfare_request(id) ON DELETE CASCADE,
  approver_id BIGINT NOT NULL REFERENCES employee(id),
  approval_step INT NOT NULL,
  approved_amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL,
  comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wappr_request ON welfare_approval(welfare_request_id);
CREATE INDEX idx_wappr_approver ON welfare_approval(approver_id);
