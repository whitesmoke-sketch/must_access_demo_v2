-- ================================================================
-- MUST ACCESS - DATABASE TABLES AND SCHEMA
-- ================================================================
-- Purpose: All CREATE TABLE, ALTER TABLE, CREATE INDEX, and CREATE EXTENSION statements
-- This file contains the complete database schema including:
-- - PostgreSQL extensions
-- - Core domain tables (employees, departments, roles)
-- - Approval workflow tables
-- - Leave management tables
-- - Access control and resource management tables
-- - Indexes for performance optimization
-- ================================================================

-- ================================================================
-- EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. CORE DOMAIN TABLES
-- ================================================================

-- Department table (manager_id added after employee table is created)
CREATE TABLE department (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  parent_department_id BIGINT REFERENCES department(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dept_code ON department(code);

-- Role table
CREATE TABLE role (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_code ON role(code);
CREATE INDEX idx_role_level ON role(level);

-- Permission table
CREATE TABLE permission (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perm_code ON permission(code);
CREATE INDEX idx_perm_resource ON permission(resource);

-- Role-Permission junction table
CREATE TABLE role_permission (
  role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Employee table (id is UUID that references auth.users(id) directly)
CREATE TABLE employee (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES department(id),
  role_id BIGINT NOT NULL REFERENCES role(id),

  -- Basic information
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  country VARCHAR(50) NOT NULL DEFAULT 'KR',
  location VARCHAR(100),

  -- Employment information
  employment_date DATE NOT NULL,
  resignation_date DATE,

  -- Work information
  working_day VARCHAR(10) NOT NULL DEFAULT 'MF',
  core_time_start TIME,
  core_time_end TIME,
  work_hours DECIMAL(4,2) DEFAULT 8.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- Other
  note TEXT,
  warning_count INT DEFAULT 0,
  is_long_service BOOLEAN DEFAULT FALSE,

  -- External integration IDs
  hubstaff_id VARCHAR(100),
  jira_id VARCHAR(100),
  notion_id VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_department ON employee(department_id);
CREATE INDEX idx_role ON employee(role_id);
CREATE INDEX idx_email ON employee(email);
CREATE INDEX idx_status ON employee(status);
CREATE INDEX idx_employment_date ON employee(employment_date);

-- Leader table (N:N relationship between department and employee)
-- Supports: 1 department : N leaders, 1 person : N departments as leader
CREATE TABLE leader (
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (department_id, employee_id)
);

CREATE INDEX idx_leader_employee ON leader(employee_id);
CREATE INDEX idx_leader_department ON leader(department_id);

COMMENT ON TABLE leader IS '부서-리더 다대다 관계 테이블 (1조직:N리더, 1사람:N조직 리더)';

-- Department history table
CREATE TABLE department_history (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dept_history_dept ON department_history(department_id, changed_at DESC);
CREATE INDEX idx_dept_history_changed_by ON department_history(changed_by);

COMMENT ON TABLE department_history IS 'Audit trail for all department changes';

-- Employee department history table
CREATE TABLE employee_department_history (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  old_department_id BIGINT REFERENCES department(id),
  new_department_id BIGINT REFERENCES department(id),
  reason TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emp_dept_history_emp ON employee_department_history(employee_id, changed_at DESC);
CREATE INDEX idx_emp_dept_history_changed_by ON employee_department_history(changed_by);

COMMENT ON TABLE employee_department_history IS 'History of employee department transfers';

-- Invited employees table (for email-based registration allowlist)
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
  invited_by UUID REFERENCES employee(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ,

  -- Metadata
  note TEXT
);

CREATE INDEX idx_invited_email ON invited_employees(email);
CREATE INDEX idx_invited_status ON invited_employees(status);
CREATE INDEX idx_invited_by ON invited_employees(invited_by);

COMMENT ON TABLE invited_employees IS 'Invited employees awaiting registration via Google OAuth';
COMMENT ON COLUMN invited_employees.status IS 'pending: awaiting registration, registered: completed, expired: invitation expired';
COMMENT ON COLUMN invited_employees.invited_by IS 'Employee who created the invitation (usually HR)';

-- ================================================================
-- 2. DOCUMENT TEMPLATE & APPROVAL WORKFLOW
-- ================================================================

-- Document template table
CREATE TABLE document_template (
  id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  description TEXT,

  -- Notion integration
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),

  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20),

  -- Approval related
  requires_approval BOOLEAN DEFAULT TRUE,
  min_approvers INT DEFAULT 1,
  max_approvers INT DEFAULT 10,

  -- Action processing
  action_type VARCHAR(50) CHECK (action_type IN ('deduct_leave', 'grant_leave', 'process_welfare', 'none', 'custom')),
  action_config JSONB,

  created_by UUID REFERENCES employee(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctemp_type ON document_template(template_type);
CREATE INDEX idx_doctemp_category ON document_template(category);
CREATE INDEX idx_doctemp_active ON document_template(is_active);

-- Document submission table
CREATE TABLE document_submission (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES document_template(id),
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  submission_title VARCHAR(255) NOT NULL,

  -- Form data
  form_data JSONB NOT NULL DEFAULT '{}',

  -- Approval line history
  original_approval_line JSONB,
  modified_approval_line JSONB,
  modification_reason TEXT,

  -- Notion integration
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'rejected', 'error')),
  reviewer_id UUID REFERENCES employee(id),
  review_comment TEXT,

  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- Processing completion
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docsub_template ON document_submission(template_id);
CREATE INDEX idx_docsub_employee ON document_submission(employee_id);
CREATE INDEX idx_docsub_status ON document_submission(status);

-- Document approval line table
CREATE TABLE document_approval_line (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES document_template(id) ON DELETE CASCADE,
  step_order INT NOT NULL,

  -- How to find approver
  approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN ('direct_manager', 'department_manager', 'role_based', 'fixed_user')),
  approver_value VARCHAR(255),

  -- Constraints
  is_required BOOLEAN DEFAULT TRUE,
  can_parallel BOOLEAN DEFAULT FALSE,

  display_name VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, step_order)
);

CREATE INDEX idx_approval_line_template ON document_approval_line(template_id);

-- Document approval instance table
CREATE TABLE document_approval_instance (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES document_submission(id) ON DELETE CASCADE,
  step_order INT NOT NULL,

  -- Actual approver
  approver_id UUID NOT NULL REFERENCES employee(id),

  -- Approval status
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),

  -- Approval/rejection information
  comment TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Notification
  notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, step_order)
);

CREATE INDEX idx_approval_inst_submission ON document_approval_instance(submission_id);
CREATE INDEX idx_approval_inst_approver ON document_approval_instance(approver_id);
CREATE INDEX idx_approval_inst_status ON document_approval_instance(status);

-- ================================================================
-- 3. GENERIC APPROVAL SYSTEM
-- ================================================================

-- Approval template table (user-saved approval lines)
CREATE TABLE approval_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  request_type text NOT NULL, -- 'leave', 'document', etc.
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraint: only 1 default template per employee per request_type
  CONSTRAINT unique_default_template UNIQUE NULLS NOT DISTINCT (employee_id, request_type, is_default)
);

CREATE INDEX idx_approval_template_employee ON approval_template(employee_id);
CREATE INDEX idx_approval_template_type ON approval_template(request_type);

COMMENT ON TABLE approval_template IS 'User-saved approval line templates';
COMMENT ON COLUMN approval_template.request_type IS 'Request type: leave, document, etc.';
COMMENT ON COLUMN approval_template.is_default IS 'Default template flag (1 per user per type)';

-- Approval template step table
CREATE TABLE approval_template_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES approval_template(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  approval_type VARCHAR(20) DEFAULT 'single' CHECK (approval_type IN ('single', 'agreement')),
  created_at timestamptz DEFAULT now(),

  -- Constraint: no duplicate step_order in same template (removed - same step_order allowed for agreement)
  -- Constraint: step_order must be positive
  CONSTRAINT positive_step_order CHECK (step_order > 0)
);

CREATE INDEX idx_approval_template_step_template ON approval_template_step(template_id);

COMMENT ON TABLE approval_template_step IS 'Approvers and order in templates';
COMMENT ON COLUMN approval_template_step.approval_type IS '결재 유형: single(단독), agreement(합의-전원승인필요)';

-- Approval template CC table (참조자)
CREATE TABLE approval_template_cc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES approval_template(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_template_cc UNIQUE(template_id, employee_id)
);

CREATE INDEX idx_approval_template_cc_template ON approval_template_cc(template_id);
CREATE INDEX idx_approval_template_cc_employee ON approval_template_cc(employee_id);

COMMENT ON TABLE approval_template_cc IS '결재선 템플릿의 참조자 목록';

-- Approval step table (actual approval steps for requests)
CREATE TABLE approval_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL, -- 'leave', 'document', etc.
  request_id bigint NOT NULL, -- Actual request ID (leave_request.id, document_request.id, etc.)
  approver_id uuid REFERENCES employee(id) ON DELETE SET NULL,
  step_order integer NOT NULL,
  approval_type VARCHAR(20) DEFAULT 'single' CHECK (approval_type IN ('single', 'agreement')),
  status text NOT NULL DEFAULT 'waiting',
  comment text,
  approved_at timestamptz,
  is_last_step BOOLEAN DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Constraint: valid status values
  CONSTRAINT valid_approval_status CHECK (status IN ('waiting', 'pending', 'approved', 'rejected')),
  -- Constraint: step_order must be positive
  CONSTRAINT positive_approval_step_order CHECK (step_order > 0)
);

CREATE INDEX idx_approval_step_request ON approval_step(request_type, request_id);
CREATE INDEX idx_approval_step_approver ON approval_step(approver_id);
CREATE INDEX idx_approval_step_status ON approval_step(status);

COMMENT ON TABLE approval_step IS 'Actual approval step records for requests';
COMMENT ON COLUMN approval_step.request_type IS 'Request type: leave, document, etc.';
COMMENT ON COLUMN approval_step.request_id IS 'Actual request ID (BIGINT - leave_request.id, etc.)';
COMMENT ON COLUMN approval_step.approval_type IS '결재 유형: single(단독), agreement(합의-전원승인필요)';
COMMENT ON COLUMN approval_step.status IS 'waiting: pending turn, pending: current turn, approved: approved, rejected: rejected';
COMMENT ON COLUMN approval_step.is_last_step IS 'Indicates if this is the final approval step for the request';

-- Approval CC table (참조자)
CREATE TABLE approval_cc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL,
  request_id BIGINT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- 알림 발송 시각
  submitted_notified_at TIMESTAMPTZ,    -- 결재 상신 시 알림
  completed_notified_at TIMESTAMPTZ,    -- 결재 완료 시 알림

  -- 열람 시각
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_approval_cc UNIQUE(request_type, request_id, employee_id)
);

CREATE INDEX idx_approval_cc_request ON approval_cc(request_type, request_id);
CREATE INDEX idx_approval_cc_employee ON approval_cc(employee_id);
CREATE INDEX idx_approval_cc_unread ON approval_cc(employee_id) WHERE read_at IS NULL;

COMMENT ON TABLE approval_cc IS '결재 요청의 참조자 목록';
COMMENT ON COLUMN approval_cc.request_type IS '요청 유형: leave, document 등';
COMMENT ON COLUMN approval_cc.request_id IS '실제 요청 ID (leave_request.id 등)';
COMMENT ON COLUMN approval_cc.submitted_notified_at IS '결재 상신 시 알림 발송 시각';
COMMENT ON COLUMN approval_cc.completed_notified_at IS '결재 완료 시 알림 발송 시각';
COMMENT ON COLUMN approval_cc.read_at IS '참조자가 문서를 열람한 시각';

-- Approval organization snapshot table
CREATE TABLE approval_organization_snapshot (
  id BIGSERIAL PRIMARY KEY,
  approval_step_id UUID NOT NULL REFERENCES approval_step(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id),
  employee_name TEXT NOT NULL,
  department_id BIGINT NOT NULL,
  department_name TEXT NOT NULL,
  department_path TEXT NOT NULL,
  role_id BIGINT NOT NULL,
  role_name TEXT NOT NULL,
  role_level INTEGER NOT NULL,
  leaders JSONB DEFAULT '[]'::jsonb,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_snapshot_step ON approval_organization_snapshot(approval_step_id);
CREATE INDEX idx_approval_snapshot_employee ON approval_organization_snapshot(employee_id);

COMMENT ON TABLE approval_organization_snapshot IS 'Snapshot of organization structure at approval creation time';
COMMENT ON COLUMN approval_organization_snapshot.leaders IS '승인 시점의 부서 리더 목록 [{id, name}, ...]';

-- Approval step audit table
CREATE TABLE approval_step_audit (
  id BIGSERIAL PRIMARY KEY,
  approval_step_id UUID NOT NULL REFERENCES approval_step(id) ON DELETE CASCADE,
  old_approver_id UUID REFERENCES employee(id),
  new_approver_id UUID REFERENCES employee(id),
  change_reason TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_step_audit_step ON approval_step_audit(approval_step_id, changed_at DESC);

COMMENT ON TABLE approval_step_audit IS 'Audit trail for approval step changes (e.g., approver reassignment)';

-- ================================================================
-- 4. LEAVE MANAGEMENT
-- ================================================================

-- Annual leave grant table
CREATE TABLE annual_leave_grant (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Grant type
  grant_type VARCHAR(20) NOT NULL CHECK (grant_type IN ('monthly', 'proportional', 'annual', 'award_overtime', 'award_attendance')),

  -- Granted days
  granted_days DECIMAL(4,1) NOT NULL,

  -- Grant date & expiration date
  granted_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- Calculation basis
  calculation_basis JSONB,

  reason VARCHAR(255),

  -- Approval related (for award leave grant requests)
  requester_id UUID REFERENCES employee(id),
  approver_id UUID REFERENCES employee(id),
  approval_status VARCHAR(20) DEFAULT 'approved',
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Document connection
  document_submission_id BIGINT REFERENCES document_submission(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grant_employee ON annual_leave_grant(employee_id);
CREATE INDEX idx_grant_type ON annual_leave_grant(grant_type);
CREATE INDEX idx_grant_date ON annual_leave_grant(granted_date);
CREATE INDEX idx_grant_expiry ON annual_leave_grant(expiration_date);

-- Leave request table
CREATE TABLE leave_request (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Leave type
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual', 'half_day', 'quarter_day', 'award')),

  -- Days
  requested_days DECIMAL(4,1) NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Half day slot
  half_day_slot VARCHAR(10) CHECK (half_day_slot IN ('morning', 'afternoon')),

  reason TEXT,

  -- Attachment
  attachment_url VARCHAR(500),

  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'retrieved')),
  approver_id UUID REFERENCES employee(id),
  rejection_reason TEXT,

  requested_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Document connection
  document_submission_id BIGINT REFERENCES document_submission(id),

  -- Current approval step
  current_step integer DEFAULT 1,

  -- Google Drive integration
  drive_file_id TEXT,
  drive_file_url TEXT,
  pdf_url TEXT,
  drive_shared_with JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_req_employee ON leave_request(employee_id);
CREATE INDEX idx_req_status ON leave_request(status);
CREATE INDEX idx_req_start ON leave_request(start_date);
CREATE INDEX idx_req_submission ON leave_request(document_submission_id);
CREATE INDEX idx_leave_request_drive_file_id ON leave_request(drive_file_id) WHERE drive_file_id IS NOT NULL;
CREATE INDEX idx_leave_request_rejected_at ON leave_request(rejected_at) WHERE rejected_at IS NOT NULL;

COMMENT ON TABLE leave_request IS 'Leave requests (no modification/deletion after submission)';
COMMENT ON COLUMN leave_request.current_step IS 'Current approval step in progress (1, 2, 3...)';
COMMENT ON COLUMN leave_request.rejected_at IS 'Timestamp when the leave request was rejected';
COMMENT ON COLUMN leave_request.drive_file_id IS 'Google Drive file ID';
COMMENT ON COLUMN leave_request.drive_file_url IS 'Google Drive file web view URL';
COMMENT ON COLUMN leave_request.pdf_url IS 'PDF URL (synced with drive_file_url for backward compatibility)';
COMMENT ON COLUMN leave_request.drive_shared_with IS 'Array of email addresses that have access to the Drive file';

-- Annual leave usage table
CREATE TABLE annual_leave_usage (
  id BIGSERIAL PRIMARY KEY,
  leave_request_id BIGINT NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
  grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id) ON DELETE CASCADE,
  used_days DECIMAL(4,1) NOT NULL,
  used_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_request ON annual_leave_usage(leave_request_id);
CREATE INDEX idx_usage_grant ON annual_leave_usage(grant_id);
CREATE INDEX idx_usage_date ON annual_leave_usage(used_date);

-- Annual leave balance table
CREATE TABLE annual_leave_balance (
  employee_id UUID PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
  total_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  remaining_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  expiring_soon_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  expiring_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 5. AWARD LEAVE (Bonus Leave)
-- ================================================================

-- Batch job log table
CREATE TABLE batch_job_log (
  id BIGSERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  affected_rows INT,
  execution_details JSONB
);

CREATE INDEX idx_job_type ON batch_job_log(job_type);
CREATE INDEX idx_job_status ON batch_job_log(status);
CREATE INDEX idx_job_started ON batch_job_log(started_at);

-- Attendance award table
CREATE TABLE attendance_award (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Award period
  award_period VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,

  -- Qualification
  is_qualified BOOLEAN NOT NULL,

  -- Attendance statistics
  required_days INT NOT NULL,
  actual_days INT NOT NULL,
  late_count INT NOT NULL DEFAULT 0,

  -- Grant information
  awarded BOOLEAN DEFAULT FALSE,
  leave_grant_id BIGINT REFERENCES annual_leave_grant(id),
  awarded_at TIMESTAMPTZ,

  -- Batch job tracking
  batch_job_id BIGINT REFERENCES batch_job_log(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, award_period)
);

CREATE INDEX idx_award_period ON attendance_award(award_period);
CREATE INDEX idx_award_qualified ON attendance_award(is_qualified);

-- Overtime conversion table
CREATE TABLE overtime_conversion (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Conversion period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Conversion details
  total_overtime_hours DECIMAL(5,2) NOT NULL,
  converted_days DECIMAL(4,1) NOT NULL,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Conversion rate
  conversion_rate DECIMAL(4,2) NOT NULL DEFAULT 8.00,

  -- Grant connection
  leave_grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id),

  -- Document connection
  document_submission_id BIGINT REFERENCES document_submission(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversion_employee ON overtime_conversion(employee_id);
CREATE INDEX idx_conversion_period ON overtime_conversion(period_start, period_end);

-- Leave of absence table
CREATE TABLE leave_of_absence (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  absence_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  actual_return_date DATE,
  reason TEXT,
  attachment_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  approver_id UUID REFERENCES employee(id),
  approval_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_absence_employee ON leave_of_absence(employee_id);
CREATE INDEX idx_absence_status ON leave_of_absence(status);

-- ================================================================
-- 6. NOTIFICATION
-- ================================================================

CREATE TABLE notification (
  id BIGSERIAL PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON notification(recipient_id);
CREATE INDEX idx_notif_status ON notification(status);
CREATE INDEX idx_notif_read ON notification(read_at);
CREATE INDEX idx_notif_metadata_gin ON notification USING GIN (metadata);

-- ================================================================
-- 7. ACCESS CONTROL
-- ================================================================

-- Visitor table
CREATE TABLE visitor (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  purpose TEXT,
  host_employee_id UUID NOT NULL REFERENCES employee(id),
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
  employee_id UUID REFERENCES employee(id) ON DELETE CASCADE,
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

-- ================================================================
-- 8. ASSET MANAGEMENT
-- ================================================================

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
  assigned_employee_id UUID REFERENCES employee(id),
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
  employee_id UUID NOT NULL REFERENCES employee(id),
  credential_id BIGINT NOT NULL REFERENCES access_credential(id),
  action VARCHAR(10) NOT NULL,
  result VARCHAR(10) NOT NULL,
  access_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laccess_locker ON locker_access_log(locker_id);
CREATE INDEX idx_laccess_employee ON locker_access_log(employee_id);
CREATE INDEX idx_laccess_time ON locker_access_log(access_time);

-- ================================================================
-- 9. HOT DESKING
-- ================================================================

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
  employee_id UUID NOT NULL REFERENCES employee(id),
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
  current_employee_id UUID REFERENCES employee(id),
  display_status VARCHAR(20) DEFAULT 'active',
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nameplate_seat ON digital_nameplate(seat_id);
CREATE INDEX idx_nameplate_device ON digital_nameplate(device_id);

-- ================================================================
-- 10. PROJECT
-- ================================================================

-- Project table
CREATE TABLE project (
  id BIGSERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  leader_id UUID NOT NULL REFERENCES employee(id),
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
  user_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
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

-- ================================================================
-- 11. WELFARE
-- ================================================================

-- Welfare request table
CREATE TABLE welfare_request (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
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
  approver_id UUID NOT NULL REFERENCES employee(id),
  approval_step INT NOT NULL,
  approved_amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL,
  comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wappr_request ON welfare_approval(welfare_request_id);
CREATE INDEX idx_wappr_approver ON welfare_approval(approver_id);

-- ================================================================
-- 12. MEETING ROOM BOOKING
-- ================================================================

-- Meeting room table
CREATE TABLE meeting_room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  location VARCHAR(200),
  description TEXT,
  photo_url TEXT,

  -- Equipment
  has_whiteboard BOOLEAN DEFAULT false,
  has_monitor BOOLEAN DEFAULT false,
  has_camera BOOLEAN DEFAULT false,
  has_outlet BOOLEAN DEFAULT false,
  has_hdmi BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_room_code ON meeting_room(code);
CREATE INDEX idx_meeting_room_floor ON meeting_room(floor);
CREATE INDEX idx_meeting_room_active ON meeting_room(is_active);

-- Meeting room booking table
CREATE TABLE meeting_room_booking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES meeting_room(id) ON DELETE CASCADE,
  booked_by UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  title VARCHAR(200) NOT NULL,
  description TEXT,

  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  status VARCHAR(20) DEFAULT 'confirmed',

  -- Google Calendar integration
  calendar_event_id TEXT,
  calendar_event_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_booking_room_date ON meeting_room_booking(room_id, booking_date);
CREATE INDEX idx_booking_date_time ON meeting_room_booking(booking_date, start_time, end_time);
CREATE INDEX idx_booking_employee ON meeting_room_booking(booked_by);
CREATE INDEX idx_booking_status ON meeting_room_booking(status);

-- Meeting room booking attendee table
CREATE TABLE meeting_room_booking_attendee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES meeting_room_booking(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Response status
  response_status TEXT DEFAULT 'needsAction',
  responded_at TIMESTAMPTZ,
  calendar_synced BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(booking_id, employee_id)
);

CREATE INDEX idx_attendee_booking ON meeting_room_booking_attendee(booking_id);
CREATE INDEX idx_attendee_employee ON meeting_room_booking_attendee(employee_id);

-- Add btree_gist extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping bookings
ALTER TABLE meeting_room_booking
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  room_id WITH =,
  booking_date WITH =,
  tsrange(
    (booking_date || ' ' || start_time::text)::timestamp,
    (booking_date || ' ' || end_time::text)::timestamp
  ) WITH &&
)
WHERE (status = 'confirmed');

-- ================================================================
-- 13. ATTENDANCE
-- ================================================================

-- Attendance status enum type
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'leave', 'holiday');

-- Attendance table
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

CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_status ON attendance(status);

COMMENT ON TABLE attendance IS 'Employee attendance records';
COMMENT ON COLUMN attendance.employee_id IS 'Reference to employee who this attendance record belongs to';
COMMENT ON COLUMN attendance.date IS 'Date of the attendance record';
COMMENT ON COLUMN attendance.check_in IS 'Time when employee checked in';
COMMENT ON COLUMN attendance.check_out IS 'Time when employee checked out';
COMMENT ON COLUMN attendance.status IS 'Attendance status: present, late, absent, leave, holiday';
COMMENT ON COLUMN attendance.late_minutes IS 'Number of minutes late (0 if on time)';
COMMENT ON COLUMN attendance.notes IS 'Additional notes about this attendance record';

-- ================================================================
-- 14. VIEWS
-- ================================================================

-- Department with stats view (requires get_department_path function)
-- Note: This view depends on the get_department_path() function defined in functions.sql
CREATE OR REPLACE VIEW department_with_stats AS
SELECT
  d.id,
  d.name,
  d.code,
  d.parent_department_id,
  d.display_order,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.updated_by,
  d.deleted_at,
  d.deleted_by,
  get_department_path(d.id) AS full_path,
  COUNT(DISTINCT e.id) FILTER (WHERE e.deleted_at IS NULL AND e.status::text = 'active'::text) AS active_member_count,
  COUNT(DISTINCT child.id) FILTER (WHERE child.deleted_at IS NULL) AS child_count,
  -- 리더 정보를 JSON 배열로 반환
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('id', le.id, 'name', le.name))
      FROM leader l
      JOIN employee le ON le.id = l.employee_id
      WHERE l.department_id = d.id
    ),
    '[]'::jsonb
  ) AS leaders,
  COALESCE(cb.name, ''::VARCHAR) AS created_by_name,
  COALESCE(ub.name, ''::VARCHAR) AS updated_by_name
FROM department d
LEFT JOIN employee e ON e.department_id = d.id
LEFT JOIN department child ON child.parent_department_id = d.id
LEFT JOIN employee cb ON cb.id = d.created_by
LEFT JOIN employee ub ON ub.id = d.updated_by
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.code, d.parent_department_id, d.display_order,
         d.created_at, d.updated_at, d.created_by, d.updated_by, d.deleted_at, d.deleted_by,
         cb.name, ub.name;
