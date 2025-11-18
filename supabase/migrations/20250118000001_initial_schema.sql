-- Must Access - Initial Database Schema
-- Migration: 20250118000001_initial_schema
-- Description: Core domain tables, leave management, approval workflow, and access control

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. CORE DOMAIN (핵심 인사 정보)
-- ============================================

-- Department table (manager_id는 나중에 추가)
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

-- Employee table
CREATE TABLE employee (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES department(id),
  role_id BIGINT NOT NULL REFERENCES role(id),

  -- 기본 정보
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  country VARCHAR(50) NOT NULL DEFAULT 'KR',
  location VARCHAR(100),

  -- 재직 정보
  employment_date DATE NOT NULL,
  resignation_date DATE,

  -- 근무 정보
  working_day VARCHAR(10) NOT NULL DEFAULT 'MF',
  core_time_start TIME,
  core_time_end TIME,
  work_hours DECIMAL(4,2) DEFAULT 8.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- 기타
  note TEXT,
  warning_count INT DEFAULT 0,
  is_long_service BOOLEAN DEFAULT FALSE,

  -- 외부 연동 ID
  hubstaff_id VARCHAR(100),
  jira_id VARCHAR(100),
  notion_id VARCHAR(100),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_department ON employee(department_id);
CREATE INDEX idx_role ON employee(role_id);
CREATE INDEX idx_email ON employee(email);
CREATE INDEX idx_status ON employee(status);
CREATE INDEX idx_employment_date ON employee(employment_date);

-- 이제 department.manager_id 추가 가능
ALTER TABLE department ADD COLUMN manager_id BIGINT REFERENCES employee(id);
CREATE INDEX idx_dept_manager ON department(manager_id);

-- ============================================
-- 2. APPROVAL WORKFLOW (승인 프로세스)
-- Document submission을 먼저 생성해야 함
-- ============================================

-- Document template table
CREATE TABLE document_template (
  id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  description TEXT,

  -- Notion 연동
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),

  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20),

  -- 승인 관련
  requires_approval BOOLEAN DEFAULT TRUE,
  min_approvers INT DEFAULT 1,
  max_approvers INT DEFAULT 10,

  -- 액션 처리
  action_type VARCHAR(50) CHECK (action_type IN ('deduct_leave', 'grant_leave', 'process_welfare', 'none', 'custom')),
  action_config JSONB,

  created_by BIGINT REFERENCES employee(id),
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
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  submission_title VARCHAR(255) NOT NULL,

  -- 폼 데이터
  form_data JSONB NOT NULL DEFAULT '{}',

  -- 결재선 이력
  original_approval_line JSONB,
  modified_approval_line JSONB,
  modification_reason TEXT,

  -- Notion 연동
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),

  -- 상태
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'rejected', 'error')),
  reviewer_id BIGINT REFERENCES employee(id),
  review_comment TEXT,

  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- 처리 완료
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

  -- 승인자 찾는 방법
  approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN ('direct_manager', 'department_manager', 'role_based', 'fixed_user')),
  approver_value VARCHAR(255),

  -- 제약 조건
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

  -- 실제 승인자
  approver_id BIGINT NOT NULL REFERENCES employee(id),

  -- 승인 상태
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),

  -- 승인/반려 정보
  comment TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- 알림
  notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, step_order)
);

CREATE INDEX idx_approval_inst_submission ON document_approval_instance(submission_id);
CREATE INDEX idx_approval_inst_approver ON document_approval_instance(approver_id);
CREATE INDEX idx_approval_inst_status ON document_approval_instance(status);

-- ============================================
-- 3. LEAVE MANAGEMENT (연차/휴가)
-- ============================================

-- Annual leave grant table
CREATE TABLE annual_leave_grant (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- 연차 유형
  grant_type VARCHAR(20) NOT NULL CHECK (grant_type IN ('monthly', 'proportional', 'annual', 'award_overtime', 'award_attendance')),

  -- 부여 일수
  granted_days DECIMAL(4,1) NOT NULL,

  -- 부여일 & 소멸일
  granted_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- 계산 근거
  calculation_basis JSONB,

  reason VARCHAR(255),

  -- 승인 관련 (포상휴가 부여 신청)
  requester_id BIGINT REFERENCES employee(id),
  approver_id BIGINT REFERENCES employee(id),
  approval_status VARCHAR(20) DEFAULT 'approved',
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,

  -- 문서 연결
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
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- 연차 타입
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual', 'half_day', 'quarter_day', 'award')),

  -- 일수
  requested_days DECIMAL(4,1) NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 반차 구분
  half_day_slot VARCHAR(10) CHECK (half_day_slot IN ('morning', 'afternoon')),

  reason TEXT,

  -- 첨부파일
  attachment_url VARCHAR(500),

  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id BIGINT REFERENCES employee(id),
  rejection_reason TEXT,

  requested_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,

  -- 문서 연결
  document_submission_id BIGINT REFERENCES document_submission(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_req_employee ON leave_request(employee_id);
CREATE INDEX idx_req_status ON leave_request(status);
CREATE INDEX idx_req_start ON leave_request(start_date);
CREATE INDEX idx_req_submission ON leave_request(document_submission_id);

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

-- Annual leave balance
CREATE TABLE annual_leave_balance (
  employee_id BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
  total_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  remaining_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  expiring_soon_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  expiring_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. AWARD LEAVE (포상휴가)
-- ============================================

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
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- 평가 기간
  award_period VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,

  -- 만근 여부
  is_qualified BOOLEAN NOT NULL,

  -- 출근 통계
  required_days INT NOT NULL,
  actual_days INT NOT NULL,
  late_count INT NOT NULL DEFAULT 0,

  -- 부여 정보
  awarded BOOLEAN DEFAULT FALSE,
  leave_grant_id BIGINT REFERENCES annual_leave_grant(id),
  awarded_at TIMESTAMPTZ,

  -- 배치 작업 추적
  batch_job_id BIGINT REFERENCES batch_job_log(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, award_period)
);

CREATE INDEX idx_award_period ON attendance_award(award_period);
CREATE INDEX idx_award_qualified ON attendance_award(is_qualified);

-- Overtime conversion table
CREATE TABLE overtime_conversion (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- 전환 기간
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- 전환 내역
  total_overtime_hours DECIMAL(5,2) NOT NULL,
  converted_days DECIMAL(4,1) NOT NULL,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- 전환 비율
  conversion_rate DECIMAL(4,2) NOT NULL DEFAULT 8.00,

  -- 부여 연결
  leave_grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id),

  -- 문서 연결
  document_submission_id BIGINT REFERENCES document_submission(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversion_employee ON overtime_conversion(employee_id);
CREATE INDEX idx_conversion_period ON overtime_conversion(period_start, period_end);

-- Leave of absence table
CREATE TABLE leave_of_absence (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  absence_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  actual_return_date DATE,
  reason TEXT,
  attachment_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  approver_id BIGINT REFERENCES employee(id),
  approval_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_absence_employee ON leave_of_absence(employee_id);
CREATE INDEX idx_absence_status ON leave_of_absence(status);

-- ============================================
-- 5. NOTIFICATION (알림)
-- ============================================

CREATE TABLE notification (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
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
