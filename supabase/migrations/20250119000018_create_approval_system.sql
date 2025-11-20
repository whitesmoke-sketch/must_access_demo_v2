-- 범용 승인 시스템 구축
-- Migration: 20250119000018_create_approval_system
-- Description: 모든 신청서 타입에서 사용 가능한 범용 승인 시스템

-- ================================================
-- 1. approval_template (결재선 템플릿)
-- ================================================
CREATE TABLE approval_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  request_type text NOT NULL, -- 'leave', 'document' 등
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 제약조건: 같은 직원이 같은 request_type에 대해 기본 템플릿은 1개만
  CONSTRAINT unique_default_template UNIQUE NULLS NOT DISTINCT (employee_id, request_type, is_default)
);

CREATE INDEX idx_approval_template_employee ON approval_template(employee_id);
CREATE INDEX idx_approval_template_type ON approval_template(request_type);

COMMENT ON TABLE approval_template IS '사용자가 저장한 결재선 템플릿';
COMMENT ON COLUMN approval_template.request_type IS '신청서 타입: leave(연차), document(문서) 등';
COMMENT ON COLUMN approval_template.is_default IS '기본 템플릿 여부 (사용자당 타입별 1개만)';

-- ================================================
-- 2. approval_template_step (템플릿 승인 단계)
-- ================================================
CREATE TABLE approval_template_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES approval_template(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- 제약조건: 같은 템플릿에서 순서 중복 불가
  CONSTRAINT unique_template_step_order UNIQUE (template_id, step_order),
  -- 제약조건: 순서는 1 이상
  CONSTRAINT positive_step_order CHECK (step_order > 0)
);

CREATE INDEX idx_approval_template_step_template ON approval_template_step(template_id);

COMMENT ON TABLE approval_template_step IS '템플릿에 포함된 승인자와 순서';

-- ================================================
-- 3. approval_step (실제 승인 단계)
-- ================================================
CREATE TABLE approval_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL, -- 'leave', 'document' 등
  request_id bigint NOT NULL, -- 실제 요청의 ID (leave_request.id, document_request.id 등)
  approver_id uuid REFERENCES employee(id) ON DELETE SET NULL,
  step_order integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  comment text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),

  -- 제약조건: 상태값 제한
  CONSTRAINT valid_approval_status CHECK (status IN ('waiting', 'pending', 'approved', 'rejected')),
  -- 제약조건: 같은 요청에서 순서 중복 불가
  CONSTRAINT unique_request_step_order UNIQUE (request_type, request_id, step_order),
  -- 제약조건: 순서는 1 이상
  CONSTRAINT positive_approval_step_order CHECK (step_order > 0)
);

CREATE INDEX idx_approval_step_request ON approval_step(request_type, request_id);
CREATE INDEX idx_approval_step_approver ON approval_step(approver_id);
CREATE INDEX idx_approval_step_status ON approval_step(status);

COMMENT ON TABLE approval_step IS '실제 신청서의 승인 단계 기록';
COMMENT ON COLUMN approval_step.request_type IS '신청서 타입: leave, document 등';
COMMENT ON COLUMN approval_step.request_id IS '실제 요청의 ID (BIGINT - leave_request.id 등)';
COMMENT ON COLUMN approval_step.status IS 'waiting: 대기, pending: 현재 차례, approved: 승인 완료, rejected: 반려';

-- ================================================
-- 4. leave_request 테이블 수정
-- ================================================
-- 현재 승인 단계 추적용 컬럼 추가
ALTER TABLE leave_request
ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 1;

COMMENT ON COLUMN leave_request.current_step IS '현재 진행 중인 승인 단계 (1, 2, 3...)';
