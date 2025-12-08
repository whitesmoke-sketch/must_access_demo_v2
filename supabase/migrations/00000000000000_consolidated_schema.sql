-- ================================================================
-- MUST ACCESS - CONSOLIDATED DATABASE SCHEMA
-- ================================================================
-- For Supabase CLI deployment (supabase db push)
-- Based on tables.sql + functions + triggers + RLS + seed data
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

-- Add department columns after employee table exists
ALTER TABLE department ADD COLUMN manager_id UUID REFERENCES employee(id);
ALTER TABLE department ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE department ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE department ADD COLUMN deleted_by UUID REFERENCES employee(id);
ALTER TABLE department ADD COLUMN created_by UUID REFERENCES employee(id);
ALTER TABLE department ADD COLUMN updated_by UUID REFERENCES employee(id);

CREATE INDEX idx_dept_manager ON department(manager_id);
CREATE INDEX idx_dept_parent_order ON department(parent_department_id, display_order);
CREATE INDEX idx_dept_deleted ON department(deleted_at) WHERE deleted_at IS NULL;

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
  phone VARCHAR(20),
  location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired')),
  invited_by UUID REFERENCES employee(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  note TEXT
);

CREATE INDEX idx_invited_email ON invited_employees(email);
CREATE INDEX idx_invited_status ON invited_employees(status);
CREATE INDEX idx_invited_by ON invited_employees(invited_by);

COMMENT ON TABLE invited_employees IS 'Invited employees awaiting registration via Google OAuth';

-- ================================================================
-- 2. DOCUMENT TEMPLATE & APPROVAL WORKFLOW
-- ================================================================

CREATE TABLE document_template (
  id BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20),
  requires_approval BOOLEAN DEFAULT TRUE,
  min_approvers INT DEFAULT 1,
  max_approvers INT DEFAULT 10,
  action_type VARCHAR(50) CHECK (action_type IN ('deduct_leave', 'grant_leave', 'process_welfare', 'none', 'custom')),
  action_config JSONB,
  created_by UUID REFERENCES employee(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctemp_type ON document_template(template_type);
CREATE INDEX idx_doctemp_category ON document_template(category);
CREATE INDEX idx_doctemp_active ON document_template(is_active);

CREATE TABLE document_submission (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES document_template(id),
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  submission_title VARCHAR(255) NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  original_approval_line JSONB,
  modified_approval_line JSONB,
  modification_reason TEXT,
  notion_page_id VARCHAR(100),
  notion_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'rejected', 'error')),
  reviewer_id UUID REFERENCES employee(id),
  review_comment TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docsub_template ON document_submission(template_id);
CREATE INDEX idx_docsub_employee ON document_submission(employee_id);
CREATE INDEX idx_docsub_status ON document_submission(status);

CREATE TABLE document_approval_line (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES document_template(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN ('direct_manager', 'department_manager', 'role_based', 'fixed_user')),
  approver_value VARCHAR(255),
  is_required BOOLEAN DEFAULT TRUE,
  can_parallel BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, step_order)
);

CREATE INDEX idx_approval_line_template ON document_approval_line(template_id);

CREATE TABLE document_approval_instance (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES document_submission(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  approver_id UUID NOT NULL REFERENCES employee(id),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  comment TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
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

CREATE TABLE approval_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  request_type text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_default_template UNIQUE NULLS NOT DISTINCT (employee_id, request_type, is_default)
);

CREATE INDEX idx_approval_template_employee ON approval_template(employee_id);
CREATE INDEX idx_approval_template_type ON approval_template(request_type);

CREATE TABLE approval_template_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES approval_template(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_template_step_order UNIQUE (template_id, step_order),
  CONSTRAINT positive_step_order CHECK (step_order > 0)
);

CREATE INDEX idx_approval_template_step_template ON approval_template_step(template_id);

CREATE TABLE approval_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  request_id bigint NOT NULL,
  approver_id uuid REFERENCES employee(id) ON DELETE SET NULL,
  step_order integer NOT NULL,
  approval_type VARCHAR(20) DEFAULT 'single' CHECK (approval_type IN ('single', 'agreement')),
  status text NOT NULL DEFAULT 'waiting',
  comment text,
  approved_at timestamptz,
  is_last_step BOOLEAN DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- retrieved 추가: 문서 회수 시 결재선 상태
  CONSTRAINT valid_approval_status CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'retrieved')),
  CONSTRAINT positive_approval_step_order CHECK (step_order > 0)
);

COMMENT ON COLUMN approval_step.status IS 'waiting: 대기, pending: 결재 차례, approved: 승인, rejected: 반려, retrieved: 회수됨';
COMMENT ON COLUMN approval_step.approval_type IS '결재 유형: single(단독), agreement(합의-전원승인필요)';

CREATE INDEX idx_approval_step_request ON approval_step(request_type, request_id);
CREATE INDEX idx_approval_step_approver ON approval_step(approver_id);
CREATE INDEX idx_approval_step_status ON approval_step(status);

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
  manager_id UUID REFERENCES employee(id),
  manager_name TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_snapshot_step ON approval_organization_snapshot(approval_step_id);
CREATE INDEX idx_approval_snapshot_employee ON approval_organization_snapshot(employee_id);

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

-- ================================================================
-- 3.5 UNIFIED DOCUMENT SYSTEM
-- ================================================================

-- 문서 공개 범위 ENUM
CREATE TYPE visibility_scope AS ENUM ('private', 'team', 'department', 'company');

-- 문서 종류 ENUM (9개 타입)
CREATE TYPE document_type AS ENUM (
    'leave',             -- 휴가 신청
    'overtime',          -- 연장 근로 신청
    'expense',           -- 지출결의서
    'welfare',           -- 경조사비
    'general',           -- 일반 문서
    'budget',            -- 예산 신청서
    'expense_proposal',  -- 지출 품의서
    'resignation',       -- 사직서
    'overtime_report'    -- 연장 근로 보고
);

-- 통합 문서 마스터 테이블
CREATE TABLE document_master (
    id BIGSERIAL PRIMARY KEY,
    document_number VARCHAR(50) UNIQUE,
    requester_id UUID NOT NULL REFERENCES employee(id),
    department_id BIGINT NOT NULL REFERENCES department(id),
    visibility visibility_scope NOT NULL DEFAULT 'team',
    is_confidential BOOLEAN DEFAULT FALSE,
    doc_type document_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'retrieved')),
    summary_data JSONB,
    current_step INTEGER DEFAULT 1,
    drive_file_id TEXT,
    drive_file_url TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ
);

CREATE INDEX idx_doc_master_visibility ON document_master(visibility, department_id);
CREATE INDEX idx_doc_master_requester ON document_master(requester_id);
CREATE INDEX idx_doc_master_status ON document_master(status);
CREATE INDEX idx_doc_master_created_at ON document_master(created_at DESC);
CREATE INDEX idx_doc_master_doc_type ON document_master(doc_type);

COMMENT ON TABLE document_master IS '통합 문서 마스터 테이블 - 모든 결재 문서의 공통 헤더';

-- 휴가 신청 상세
CREATE TABLE doc_leave (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'half_day', 'quarter_day', 'award')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(4,1) NOT NULL,
    half_day_slot VARCHAR(10) CHECK (half_day_slot IN ('morning', 'afternoon')),
    reason TEXT,
    attachment_url VARCHAR(500),
    deducted_from_grants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_leave_dates ON doc_leave(start_date, end_date);
CREATE INDEX idx_doc_leave_type ON doc_leave(leave_type);

COMMENT ON TABLE doc_leave IS '휴가 신청 상세 (연차, 반차, 포상휴가)';

-- 야근 수당 신청 상세
CREATE TABLE doc_overtime (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours DECIMAL(4,1) NOT NULL,
    work_content TEXT NOT NULL,
    meal_expense DECIMAL(10,0) DEFAULT 0,
    transportation_expense DECIMAL(10,0) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_overtime_date ON doc_overtime(work_date);

COMMENT ON TABLE doc_overtime IS '야근 수당 신청 상세 (연장 근로 신청)';

-- 지출결의서 상세
CREATE TABLE doc_expense (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    expense_category VARCHAR(50) NOT NULL,
    amount DECIMAL(15,0) NOT NULL,
    vendor VARCHAR(200),
    description TEXT,
    receipt_url VARCHAR(500),
    payment_method VARCHAR(50) CHECK (payment_method IN ('corporate_card', 'bank_transfer', 'personal_card')),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_holder VARCHAR(100),
    linked_proposal_id BIGINT REFERENCES document_master(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_expense_date ON doc_expense(expense_date);
CREATE INDEX idx_doc_expense_category ON doc_expense(expense_category);
CREATE INDEX idx_doc_expense_payment ON doc_expense(payment_method);
CREATE INDEX idx_doc_expense_linked ON doc_expense(linked_proposal_id);

COMMENT ON TABLE doc_expense IS '지출결의서 상세';
COMMENT ON COLUMN doc_expense.payment_method IS '지급 방식: corporate_card(법인카드), bank_transfer(계좌이체/입금), personal_card(개인카드)';

-- 경조사비 상세
CREATE TABLE doc_welfare (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    relationship VARCHAR(100),
    amount DECIMAL(10,0) DEFAULT 0,
    description TEXT,
    attachment_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_welfare_event ON doc_welfare(event_type);
CREATE INDEX idx_doc_welfare_date ON doc_welfare(event_date);

COMMENT ON TABLE doc_welfare IS '경조사비 신청 상세';

-- 예산 신청서 상세
CREATE TABLE doc_budget (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    budget_department_id BIGINT NOT NULL REFERENCES department(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculation_basis TEXT NOT NULL,
    total_amount DECIMAL(15,0) NOT NULL,
    approved_amount DECIMAL(15,0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT budget_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX idx_doc_budget_dept ON doc_budget(budget_department_id);
CREATE INDEX idx_doc_budget_period ON doc_budget(period_start, period_end);

COMMENT ON TABLE doc_budget IS '예산 신청서 상세';
COMMENT ON COLUMN doc_budget.budget_department_id IS '예산 편성 부서';
COMMENT ON COLUMN doc_budget.calculation_basis IS '산정 근거';

-- 지출 품의서 상세
CREATE TABLE doc_expense_proposal (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    expense_reason TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    supply_amount DECIMAL(15,0) NOT NULL,
    vat_amount DECIMAL(15,0) NOT NULL,
    total_amount DECIMAL(15,0) NOT NULL,
    vendor_name VARCHAR(200),
    linked_expense_id BIGINT REFERENCES document_master(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_expense_proposal_date ON doc_expense_proposal(expense_date);
CREATE INDEX idx_doc_expense_proposal_vendor ON doc_expense_proposal(vendor_name);

COMMENT ON TABLE doc_expense_proposal IS '지출 품의서 상세';
COMMENT ON COLUMN doc_expense_proposal.items IS '품목 목록 [{item: string, quantity: number, unit_price: number}, ...]';
COMMENT ON COLUMN doc_expense_proposal.linked_expense_id IS '승인 후 생성된 지출결의서 문서 ID';

-- 사직서 상세
CREATE TABLE doc_resignation (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    employment_date DATE NOT NULL,
    resignation_date DATE NOT NULL,
    resignation_type VARCHAR(50) NOT NULL CHECK (resignation_type IN ('personal', 'contract_end', 'recommended', 'other')),
    detail_reason TEXT,
    handover_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confidentiality_agreed BOOLEAN NOT NULL DEFAULT FALSE,
    voluntary_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    last_working_date DATE,
    hr_processed_at TIMESTAMPTZ,
    hr_processor_id UUID REFERENCES employee(id),
    hr_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT resignation_date_valid CHECK (resignation_date > employment_date)
);

CREATE INDEX idx_doc_resignation_type ON doc_resignation(resignation_type);
CREATE INDEX idx_doc_resignation_date ON doc_resignation(resignation_date);

COMMENT ON TABLE doc_resignation IS '사직서 상세';
COMMENT ON COLUMN doc_resignation.resignation_type IS '퇴직 유형: personal(개인사유), contract_end(계약만료), recommended(권고사직), other(기타)';
COMMENT ON COLUMN doc_resignation.handover_confirmed IS '인수인계 확인 서약';
COMMENT ON COLUMN doc_resignation.confidentiality_agreed IS '비밀 유지 서약';
COMMENT ON COLUMN doc_resignation.voluntary_confirmed IS '자발적 의사 확인';

-- 연장 근로 보고 상세
CREATE TABLE doc_overtime_report (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours DECIMAL(4,1) NOT NULL,
    work_content TEXT NOT NULL,
    linked_overtime_request_id BIGINT REFERENCES document_master(id),
    transportation_fee DECIMAL(10,0) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_overtime_report_date ON doc_overtime_report(work_date);
CREATE INDEX idx_doc_overtime_report_linked ON doc_overtime_report(linked_overtime_request_id);

COMMENT ON TABLE doc_overtime_report IS '연장 근로 보고 상세 (사후 보고)';
COMMENT ON COLUMN doc_overtime_report.linked_overtime_request_id IS '관련 연장 근로 신청 문서 ID';

-- 결재 참조자 테이블
CREATE TABLE approval_cc (
    id BIGSERIAL PRIMARY KEY,
    request_type TEXT NOT NULL,
    request_id BIGINT NOT NULL,
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    submitted_notified_at TIMESTAMPTZ,
    approved_notified_at TIMESTAMPTZ,
    rejected_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_cc_request ON approval_cc(request_type, request_id);
CREATE INDEX idx_approval_cc_employee ON approval_cc(employee_id);

COMMENT ON TABLE approval_cc IS '결재 참조자 테이블';

-- ================================================================
-- 4. LEAVE MANAGEMENT
-- ================================================================

CREATE TABLE annual_leave_grant (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  grant_type VARCHAR(20) NOT NULL CHECK (grant_type IN ('monthly', 'proportional', 'annual', 'award_overtime', 'award_attendance')),
  granted_days DECIMAL(4,1) NOT NULL,
  granted_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  calculation_basis JSONB,
  reason VARCHAR(255),
  requester_id UUID REFERENCES employee(id),
  approver_id UUID REFERENCES employee(id),
  approval_status VARCHAR(20) DEFAULT 'approved',
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  document_submission_id BIGINT REFERENCES document_submission(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grant_employee ON annual_leave_grant(employee_id);
CREATE INDEX idx_grant_type ON annual_leave_grant(grant_type);
CREATE INDEX idx_grant_date ON annual_leave_grant(granted_date);
CREATE INDEX idx_grant_expiry ON annual_leave_grant(expiration_date);

-- ================================================================
-- [DEPRECATED] leave_request 테이블
-- 이제 document_master + doc_leave 테이블을 사용합니다.
-- ================================================================
-- CREATE TABLE leave_request (
--   id BIGSERIAL PRIMARY KEY,
--   employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
--   leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual', 'half_day', 'quarter_day', 'award')),
--   requested_days DECIMAL(4,1) NOT NULL,
--   start_date DATE NOT NULL,
--   end_date DATE NOT NULL,
--   half_day_slot VARCHAR(10) CHECK (half_day_slot IN ('morning', 'afternoon')),
--   reason TEXT,
--   attachment_url VARCHAR(500),
--   status VARCHAR(20) NOT NULL DEFAULT 'pending',
--   approver_id UUID REFERENCES employee(id),
--   rejection_reason TEXT,
--   requested_at TIMESTAMPTZ NOT NULL,
--   approved_at TIMESTAMPTZ,
--   rejected_at TIMESTAMPTZ,
--   document_submission_id BIGINT REFERENCES document_submission(id),
--   current_step integer DEFAULT 1,
--   drive_file_id TEXT,
--   drive_file_url TEXT,
--   pdf_url TEXT,
--   drive_shared_with JSONB DEFAULT '[]'::jsonb,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
--
-- 새 시스템에서는 document_master + doc_leave 사용:
-- - document_master.requester_id = leave_request.employee_id
-- - document_master.status = leave_request.status
-- - doc_leave.days_count = leave_request.requested_days
-- - doc_leave.leave_type = leave_request.leave_type

-- Annual leave usage table (document_master 참조)
CREATE TABLE annual_leave_usage (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
  grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id) ON DELETE CASCADE,
  used_days DECIMAL(4,1) NOT NULL,
  used_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_document ON annual_leave_usage(document_id);
CREATE INDEX idx_usage_grant ON annual_leave_usage(grant_id);
CREATE INDEX idx_usage_date ON annual_leave_usage(used_date);

COMMENT ON TABLE annual_leave_usage IS 'Annual leave usage records - references document_master';
COMMENT ON COLUMN annual_leave_usage.document_id IS 'References document_master.id (휴가 문서)';

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

CREATE TABLE attendance_award (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  award_period VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  is_qualified BOOLEAN NOT NULL,
  required_days INT NOT NULL,
  actual_days INT NOT NULL,
  late_count INT NOT NULL DEFAULT 0,
  awarded BOOLEAN DEFAULT FALSE,
  leave_grant_id BIGINT REFERENCES annual_leave_grant(id),
  awarded_at TIMESTAMPTZ,
  batch_job_id BIGINT REFERENCES batch_job_log(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, award_period)
);

CREATE INDEX idx_award_period ON attendance_award(award_period);
CREATE INDEX idx_award_qualified ON attendance_award(is_qualified);

CREATE TABLE overtime_conversion (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_overtime_hours DECIMAL(5,2) NOT NULL,
  converted_days DECIMAL(4,1) NOT NULL,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  leave_grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id),
  document_submission_id BIGINT REFERENCES document_submission(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversion_employee ON overtime_conversion(employee_id);
CREATE INDEX idx_conversion_period ON overtime_conversion(period_start, period_end);

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
  is_read BOOLEAN GENERATED ALWAYS AS (read_at IS NOT NULL) STORED,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON notification(recipient_id);
CREATE INDEX idx_notif_status ON notification(status);
CREATE INDEX idx_notif_read ON notification(read_at);
CREATE INDEX idx_notif_metadata_gin ON notification USING GIN (metadata);
CREATE INDEX idx_notif_is_read ON notification(is_read);
CREATE INDEX idx_notif_recipient_read ON notification(recipient_id, is_read);

-- ================================================================
-- 7. ACCESS CONTROL
-- ================================================================

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

CREATE TABLE meeting_room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  location VARCHAR(200),
  description TEXT,
  photo_url TEXT,
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

CREATE TABLE meeting_room_booking_attendee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES meeting_room_booking(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  response_status TEXT DEFAULT 'needsAction',
  responded_at TIMESTAMPTZ,
  calendar_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, employee_id)
);

CREATE INDEX idx_attendee_booking ON meeting_room_booking_attendee(booking_id);
CREATE INDEX idx_attendee_employee ON meeting_room_booking_attendee(employee_id);

-- btree_gist extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Note: Overlap checking is handled by check_booking_overlap() function
-- The exclusion constraint is removed due to IMMUTABLE function requirement
-- Overlap prevention is enforced at application level via Edge Function

-- ================================================================
-- 13. ATTENDANCE
-- ================================================================

CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'leave', 'holiday');

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
  CONSTRAINT attendance_employee_date_unique UNIQUE (employee_id, date),
  CONSTRAINT attendance_checkout_after_checkin CHECK (check_out IS NULL OR check_out >= check_in),
  CONSTRAINT attendance_late_minutes_positive CHECK (late_minutes >= 0)
);

CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ================================================================
-- 14. FUNCTIONS
-- ================================================================

-- Get department hierarchy path
CREATE OR REPLACE FUNCTION get_department_path(dept_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id BIGINT := dept_id;
  current_name TEXT;
  loop_count INT := 0;
  max_depth INT := 20;
BEGIN
  WHILE current_id IS NOT NULL AND loop_count < max_depth LOOP
    SELECT name, parent_department_id
    INTO current_name, current_id
    FROM department
    WHERE id = current_id AND deleted_at IS NULL;

    IF current_name IS NULL THEN
      EXIT;
    END IF;

    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;

    loop_count := loop_count + 1;
  END LOOP;

  RETURN COALESCE(path, '');
END;
$$ LANGUAGE plpgsql STABLE;

-- Update attendance updated_at trigger function
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [DEPRECATED] sync_pdf_url 함수
-- leave_request 테이블이 document_master + doc_leave로 대체되어 더 이상 사용하지 않음
-- CREATE OR REPLACE FUNCTION sync_pdf_url()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.drive_file_url IS DISTINCT FROM OLD.drive_file_url THEN
--     NEW.pdf_url := NEW.drive_file_url;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- SECURITY DEFINER function to check document requester (avoids RLS recursion)
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

-- Create approval steps function (document_master 참조)
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
  v_total integer := array_length(p_approver_ids, 1);
BEGIN
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
      CASE WHEN v_order = v_total THEN true ELSE false END
    );

    v_order := v_order + 1;
  END LOOP;

  -- Update document_master current_step (새 시스템)
  UPDATE document_master
  SET current_step = 1
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO service_role;

-- Check booking overlap function
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
      (p_start_time >= start_time AND p_start_time < end_time)
      OR (p_end_time > start_time AND p_end_time <= end_time)
      OR (p_start_time <= start_time AND p_end_time >= end_time)
    );

  RETURN v_overlap_count > 0;
END;
$$;

-- ================================================================
-- 15. TRIGGERS
-- ================================================================

CREATE TRIGGER trigger_update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- [DEPRECATED] sync_pdf_url_trigger
-- leave_request 테이블이 document_master + doc_leave로 대체되어 더 이상 사용하지 않음
-- CREATE TRIGGER sync_pdf_url_trigger
--   BEFORE INSERT OR UPDATE ON leave_request
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_pdf_url();

-- ================================================================
-- 16. VIEWS
-- ================================================================

CREATE OR REPLACE VIEW department_with_stats AS
SELECT
  d.id,
  d.name,
  d.code,
  d.parent_department_id,
  d.manager_id,
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
  COALESCE(m.name, ''::VARCHAR) AS manager_name,
  COALESCE(cb.name, ''::VARCHAR) AS created_by_name,
  COALESCE(ub.name, ''::VARCHAR) AS updated_by_name
FROM department d
LEFT JOIN employee e ON e.department_id = d.id
LEFT JOIN department child ON child.parent_department_id = d.id
LEFT JOIN employee m ON m.id = d.manager_id
LEFT JOIN employee cb ON cb.id = d.created_by
LEFT JOIN employee ub ON ub.id = d.updated_by
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.code, d.parent_department_id, d.manager_id, d.display_order,
         d.created_at, d.updated_at, d.created_by, d.updated_by, d.deleted_at, d.deleted_by,
         m.name, cb.name, ub.name;

-- ================================================================
-- 17. ENABLE RLS ON ALL TABLES
-- ================================================================

ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
-- [DEPRECATED] leave_request는 document_master + doc_leave로 대체됨
-- ALTER TABLE leave_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_welfare ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_expense_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_resignation ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_overtime_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_cc ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_leave_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_award ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_of_absence ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_template_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_department_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_organization_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_booking_attendee ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_employees ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 18. RLS POLICIES
-- ================================================================

-- Employee Policies
CREATE POLICY employee_select_own ON employee FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY employee_select_others ON employee FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY employee_update_own ON employee FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Managers can insert employees" ON employee FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can update employees" ON employee FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can delete employees" ON employee FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

-- Role & Department Policies
CREATE POLICY role_select_all ON role FOR SELECT TO authenticated USING (true);

CREATE POLICY department_select_all ON department FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- ================================================================
-- Document Master Policies (replaces leave_request)
-- ================================================================

-- Users can view their own documents
CREATE POLICY document_master_select_own ON document_master FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Users can create their own documents
CREATE POLICY document_master_insert_own ON document_master FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Users can update their own documents (draft, pending for retrieval, retrieved)
CREATE POLICY document_master_update_own ON document_master FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() AND status IN ('draft', 'pending', 'retrieved'))
  WITH CHECK (requester_id = auth.uid());

-- Approvers can view documents they need to approve
CREATE POLICY document_master_select_as_approver ON document_master FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_step
      WHERE approval_step.request_id = document_master.id
      AND approval_step.approver_id = auth.uid()
    )
  );

-- Approvers can update documents they are assigned to approve
CREATE POLICY document_master_update_as_approver ON document_master FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_step
      WHERE approval_step.request_id = document_master.id
      AND approval_step.approver_id = auth.uid()
      AND approval_step.status = 'pending'
    )
  );

-- ================================================================
-- Doc Leave Policies (document detail for leave)
-- ================================================================

-- Users can view their own leave documents
CREATE POLICY doc_leave_select_own ON doc_leave FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_master
      WHERE document_master.id = doc_leave.document_id
      AND document_master.requester_id = auth.uid()
    )
  );

-- Users can create leave documents for their own documents
CREATE POLICY doc_leave_insert_own ON doc_leave FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_master
      WHERE document_master.id = document_id
      AND document_master.requester_id = auth.uid()
    )
  );

-- Approvers can view leave documents they need to approve
CREATE POLICY doc_leave_select_as_approver ON doc_leave FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_step
      WHERE approval_step.request_id = doc_leave.document_id
      AND approval_step.approver_id = auth.uid()
    )
  );

-- ================================================================
-- Doc Overtime Policies (연장 근로 신청)
-- ================================================================

CREATE POLICY doc_overtime_select_own ON doc_overtime FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_overtime.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_overtime_insert_own ON doc_overtime FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_overtime_update_own ON doc_overtime FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_overtime_select_as_approver ON doc_overtime FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_overtime.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Expense Policies (지출결의서)
-- ================================================================

CREATE POLICY doc_expense_select_own ON doc_expense FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_expense.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_expense_insert_own ON doc_expense FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_expense_update_own ON doc_expense FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_expense_select_as_approver ON doc_expense FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_expense.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Welfare Policies (경조사비)
-- ================================================================

CREATE POLICY doc_welfare_select_own ON doc_welfare FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_welfare.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_welfare_insert_own ON doc_welfare FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_welfare_update_own ON doc_welfare FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_welfare.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_welfare_select_as_approver ON doc_welfare FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_welfare.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Budget Policies (예산 신청서)
-- ================================================================

CREATE POLICY doc_budget_select_own ON doc_budget FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_budget.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_budget_insert_own ON doc_budget FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_budget_update_own ON doc_budget FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_budget.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_budget_select_as_approver ON doc_budget FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_budget.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Expense Proposal Policies (지출 품의서)
-- ================================================================

CREATE POLICY doc_expense_proposal_select_own ON doc_expense_proposal FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_expense_proposal.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_expense_proposal_insert_own ON doc_expense_proposal FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_expense_proposal_update_own ON doc_expense_proposal FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense_proposal.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_expense_proposal_select_as_approver ON doc_expense_proposal FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_expense_proposal.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Resignation Policies (사직서)
-- ================================================================

CREATE POLICY doc_resignation_select_own ON doc_resignation FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_resignation.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_resignation_insert_own ON doc_resignation FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_resignation_update_own ON doc_resignation FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_resignation.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_resignation_select_as_approver ON doc_resignation FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_resignation.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Doc Overtime Report Policies (연장 근로 보고)
-- ================================================================

CREATE POLICY doc_overtime_report_select_own ON doc_overtime_report FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master WHERE id = doc_overtime_report.document_id AND requester_id = auth.uid()));

CREATE POLICY doc_overtime_report_insert_own ON doc_overtime_report FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM document_master WHERE id = document_id AND requester_id = auth.uid()));

CREATE POLICY doc_overtime_report_update_own ON doc_overtime_report FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime_report.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

CREATE POLICY doc_overtime_report_select_as_approver ON doc_overtime_report FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM approval_step WHERE request_id = doc_overtime_report.document_id AND approver_id = auth.uid()));

-- ================================================================
-- Approval CC Policies (결재 참조자)
-- ================================================================

CREATE POLICY approval_cc_select_own ON approval_cc FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY approval_cc_select_requester ON approval_cc FOR SELECT TO authenticated
  USING (is_document_requester(request_id));

CREATE POLICY approval_cc_insert_requester ON approval_cc FOR INSERT TO authenticated
  WITH CHECK (is_document_requester(request_id));

-- ================================================================
-- [DEPRECATED] LEAVE REQUEST POLICIES
-- 이제 document_master + doc_leave 정책으로 대체됨
-- ================================================================
-- CREATE POLICY leave_request_select_own ON leave_request ...
-- CREATE POLICY leave_request_insert_own ON leave_request ...
-- CREATE POLICY leave_request_update_own ON leave_request ...
-- CREATE POLICY leave_request_select_as_approver ON leave_request ...
-- CREATE POLICY leave_request_update_as_approver ON leave_request ...

-- Annual Leave Balance Policies
CREATE POLICY leave_balance_select_own ON annual_leave_balance FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can insert leave balances" ON annual_leave_balance FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can update leave balances" ON annual_leave_balance FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can view all leave balances" ON annual_leave_balance FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

-- Annual Leave Grant Policies
CREATE POLICY leave_grant_select_own ON annual_leave_grant FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- Annual Leave Usage Policies (document_master 참조)
CREATE POLICY leave_usage_select_own ON annual_leave_usage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_master
      WHERE document_master.id = annual_leave_usage.document_id
      AND document_master.requester_id = auth.uid()
    )
  );

-- Attendance Award Policies
CREATE POLICY attendance_award_select_own ON attendance_award FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- Overtime Conversion Policies
CREATE POLICY overtime_conversion_select_own ON overtime_conversion FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- Leave of Absence Policies
CREATE POLICY leave_of_absence_select_own ON leave_of_absence FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- Approval Step Policies
CREATE POLICY approval_step_select_approver ON approval_step FOR SELECT TO authenticated
  USING (approver_id = auth.uid());

CREATE POLICY approval_step_update_approver ON approval_step FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (approver_id = auth.uid());

-- Attendance Policies
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT
  USING (
    auth.uid() = employee_id
    OR EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can insert attendance" ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can update attendance" ON attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

CREATE POLICY "Managers can delete attendance" ON attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3 AND e.status = 'active'
    )
  );

-- Audit Table Policies
CREATE POLICY department_history_select ON department_history FOR SELECT TO authenticated USING (true);
CREATE POLICY employee_dept_history_select ON employee_department_history FOR SELECT TO authenticated USING (true);
CREATE POLICY approval_step_audit_select ON approval_step_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY approval_snapshot_select ON approval_organization_snapshot FOR SELECT TO authenticated USING (true);

CREATE POLICY department_history_insert ON department_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY employee_dept_history_insert ON employee_department_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY approval_step_audit_insert ON approval_step_audit FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY approval_snapshot_insert ON approval_organization_snapshot FOR INSERT TO authenticated WITH CHECK (true);

-- Document Master: HR 전체 조회/수정 정책 (replaces leave_request)
CREATE POLICY document_master_select_hr ON document_master FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

CREATE POLICY document_master_update_hr ON document_master FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- Doc Leave: HR 전체 조회 정책
CREATE POLICY doc_leave_select_hr ON doc_leave FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- Annual Leave Grant: HR 전체 조회/INSERT 정책
CREATE POLICY leave_grant_select_hr ON annual_leave_grant FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

CREATE POLICY leave_grant_insert_hr ON annual_leave_grant FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- Approval Step: 신청자 조회/INSERT/UPDATE 정책 (uses SECURITY DEFINER function to avoid RLS recursion)
CREATE POLICY approval_step_select_by_requester ON approval_step FOR SELECT TO authenticated
  USING (is_document_requester(request_id));

CREATE POLICY approval_step_insert_by_requester ON approval_step FOR INSERT TO authenticated
  WITH CHECK (is_document_requester(request_id));

CREATE POLICY approval_step_update_by_requester ON approval_step FOR UPDATE TO authenticated
  USING (is_document_requester(request_id))
  WITH CHECK (is_document_requester(request_id));

-- Approval Template: 본인 CRUD 정책
CREATE POLICY approval_template_select_own ON approval_template FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY approval_template_insert_own ON approval_template FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY approval_template_update_own ON approval_template FOR UPDATE TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY approval_template_delete_own ON approval_template FOR DELETE TO authenticated
  USING (employee_id = auth.uid());

-- Approval Template Step: 템플릿 소유자만
CREATE POLICY approval_template_step_select ON approval_template_step FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_template at
      WHERE at.id = approval_template_step.template_id
      AND at.employee_id = auth.uid()
    )
  );

CREATE POLICY approval_template_step_insert ON approval_template_step FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM approval_template at
      WHERE at.id = approval_template_step.template_id
      AND at.employee_id = auth.uid()
    )
  );

CREATE POLICY approval_template_step_update ON approval_template_step FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_template at
      WHERE at.id = approval_template_step.template_id
      AND at.employee_id = auth.uid()
    )
  );

CREATE POLICY approval_template_step_delete ON approval_template_step FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_template at
      WHERE at.id = approval_template_step.template_id
      AND at.employee_id = auth.uid()
    )
  );

-- Meeting Room: 활성 회의실 전체 조회 + HR 관리
CREATE POLICY meeting_room_select ON meeting_room FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY meeting_room_insert_hr ON meeting_room FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

CREATE POLICY meeting_room_update_hr ON meeting_room FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

CREATE POLICY meeting_room_delete_hr ON meeting_room FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- Meeting Room Booking: 전체 조회 + 본인 CUD (빈 시간 확인용)
CREATE POLICY booking_select_all ON meeting_room_booking FOR SELECT TO authenticated
  USING (true);

CREATE POLICY booking_insert_own ON meeting_room_booking FOR INSERT TO authenticated
  WITH CHECK (booked_by = auth.uid());

CREATE POLICY booking_update_own ON meeting_room_booking FOR UPDATE TO authenticated
  USING (booked_by = auth.uid())
  WITH CHECK (booked_by = auth.uid());

CREATE POLICY booking_delete_own ON meeting_room_booking FOR DELETE TO authenticated
  USING (booked_by = auth.uid());

-- Meeting Room Booking Attendee: 예약자 또는 참석자 조회
CREATE POLICY attendee_select ON meeting_room_booking_attendee FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meeting_room_booking mrb
      WHERE mrb.id = meeting_room_booking_attendee.booking_id
      AND mrb.booked_by = auth.uid()
    )
  );

CREATE POLICY attendee_insert_booker ON meeting_room_booking_attendee FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meeting_room_booking mrb
      WHERE mrb.id = meeting_room_booking_attendee.booking_id
      AND mrb.booked_by = auth.uid()
    )
  );

CREATE POLICY attendee_update_own ON meeting_room_booking_attendee FOR UPDATE TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY attendee_delete_booker ON meeting_room_booking_attendee FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meeting_room_booking mrb
      WHERE mrb.id = meeting_room_booking_attendee.booking_id
      AND mrb.booked_by = auth.uid()
    )
  );

-- Notification: 본인만 조회/수정 (INSERT는 service_role만)
CREATE POLICY notification_select_own ON notification FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notification_update_own ON notification FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Invited Employees: 전체 조회 + 권한별 CUD
CREATE POLICY invited_select_all ON invited_employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY invited_insert_manager ON invited_employees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3
    )
  );

CREATE POLICY invited_update_manager ON invited_employees FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 3
    )
  );

CREATE POLICY invited_delete_hr ON invited_employees FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee e
      JOIN role r ON e.role_id = r.id
      WHERE e.id = auth.uid() AND r.level >= 5
    )
  );

-- ================================================================
-- 19. SEED DATA (Role & Department)
-- ================================================================

-- Role seed data
INSERT INTO role (id, name, code, level, description) VALUES
(1, '일반사원', 'employee', 1, '일반 구성원'),
(2, '팀리더', 'team_leader', 2, '팀을 이끄는 리더'),
(3, '부서리더', 'department_leader', 3, '부서를 이끄는 리더'),
(4, '사업리더', 'business_leader', 4, '사업부를 이끄는 리더'),
(5, '대표', 'ceo', 5, '최고 경영자'),
(6, 'HR', 'hr', 5, '인사 담당자 (최종 승인자)')
ON CONFLICT (code) DO UPDATE SET
  level = EXCLUDED.level,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

SELECT setval('role_id_seq', 6, true);

-- Department seed data
INSERT INTO department (id, name, code, parent_department_id) VALUES
(1, 'SI사업', 'SI', NULL),
(2, 'AI팀', 'SI-AI', 1),
(3, 'A-1팀', 'SI-AI-A1', 2),
(4, 'A-2팀', 'SI-AI-A2', 2),
(5, 'A-3팀', 'SI-AI-A3', 2),
(6, 'AISUPPORT팀', 'SI-AISUPPORT', 1),
(7, '경영지원', 'MGMT', NULL),
(8, 'HR팀', 'MGMT-HR', 7),
(9, '개발사업', 'DEV', NULL),
(10, '백엔드팀', 'DEV-BACKEND', 9),
(11, 'API개발팀', 'DEV-BACKEND-API', 10),
(12, 'DB팀', 'DEV-BACKEND-DB', 10),
(13, '프론트엔드팀', 'DEV-FRONTEND', 9)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

SELECT setval('department_id_seq', 13, true);

-- Permission seed data
INSERT INTO permission (name, code, resource, action, description) VALUES
  ('연차 생성', 'leave:create', 'leave', 'create', '연차 신청 생성'),
  ('연차 조회', 'leave:read', 'leave', 'read', '연차 신청 조회'),
  ('연차 수정', 'leave:update', 'leave', 'update', '연차 신청 수정'),
  ('연차 삭제', 'leave:delete', 'leave', 'delete', '연차 신청 삭제'),
  ('연차 승인', 'leave:approve', 'leave', 'approve', '연차 신청 승인/반려'),
  ('연차 전체 조회', 'leave:read_all', 'leave', 'read_all', '모든 연차 신청 조회'),
  ('직원 조회', 'employee:read', 'employee', 'read', '직원 정보 조회'),
  ('직원 수정', 'employee:update', 'employee', 'update', '직원 정보 수정'),
  ('직원 생성', 'employee:create', 'employee', 'create', '직원 생성'),
  ('직원 삭제', 'employee:delete', 'employee', 'delete', '직원 삭제'),
  ('부서 조회', 'department:read', 'department', 'read', '부서 정보 조회'),
  ('부서 관리', 'department:manage', 'department', 'manage', '부서 생성/수정/삭제'),
  ('문서 생성', 'document:create', 'document', 'create', '문서 생성'),
  ('문서 조회', 'document:read', 'document', 'read', '문서 조회'),
  ('문서 수정', 'document:update', 'document', 'update', '문서 수정'),
  ('문서 삭제', 'document:delete', 'document', 'delete', '문서 삭제'),
  ('문서 승인', 'document:approve', 'document', 'approve', '문서 승인/반려'),
  ('승인 조회', 'approval:read', 'approval', 'read', '승인 내역 조회'),
  ('승인 처리', 'approval:process', 'approval', 'process', '승인/반려 처리'),
  ('설정 조회', 'settings:read', 'settings', 'read', '시스템 설정 조회'),
  ('설정 관리', 'settings:manage', 'settings', 'manage', '시스템 설정 관리')
ON CONFLICT (code) DO NOTHING;

-- Role-Permission assignments
INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code = 'employee'), p.id
FROM permission p
WHERE p.code IN ('leave:create', 'leave:read', 'employee:read', 'department:read', 'document:create', 'document:read', 'approval:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code = 'team_leader'), p.id
FROM permission p
WHERE p.code IN ('leave:create', 'leave:read', 'leave:approve', 'employee:read', 'department:read', 'document:create', 'document:read', 'document:approve', 'approval:read', 'approval:process')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code = 'department_leader'), p.id
FROM permission p
WHERE p.code IN ('leave:create', 'leave:read', 'leave:approve', 'employee:read', 'employee:update', 'department:read', 'department:manage', 'document:create', 'document:read', 'document:approve', 'approval:read', 'approval:process')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code = 'business_leader'), p.id
FROM permission p
WHERE p.code IN ('leave:create', 'leave:read', 'leave:read_all', 'leave:approve', 'employee:read', 'employee:update', 'department:read', 'department:manage', 'document:create', 'document:read', 'document:approve', 'approval:read', 'approval:process')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code = 'hr'), p.id
FROM permission p
WHERE p.code IN ('leave:create', 'leave:read', 'leave:read_all', 'leave:update', 'leave:delete', 'leave:approve', 'employee:read', 'employee:create', 'employee:update', 'employee:delete', 'department:read', 'department:manage', 'document:create', 'document:read', 'document:update', 'document:delete', 'document:approve', 'approval:read', 'approval:process')
ON CONFLICT DO NOTHING;

-- ================================================================
-- SECTION: FUNCTIONS - Leave Balance Management
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

-- ================================================================
-- END OF CONSOLIDATED MIGRATION
-- ================================================================
