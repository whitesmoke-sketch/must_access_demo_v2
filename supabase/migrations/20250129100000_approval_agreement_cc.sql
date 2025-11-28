-- ================================================================
-- MIGRATION: 결재선 합의(Agreement) + 참조자(CC) 기능 추가
-- ================================================================
-- Purpose:
--   1. 합의 결재 지원 (같은 단계에서 여러 명이 동시에 결재, 전원 승인 필요)
--   2. 참조자 기능 추가 (결재 권한 없이 알림만 받음)
-- ================================================================

-- ================================================================
-- STEP 1: approval_template_step에 approval_type 컬럼 추가
-- ================================================================

-- 기존 unique constraint 제거 (합의 시 같은 step_order에 여러 명 가능)
ALTER TABLE approval_template_step
DROP CONSTRAINT IF EXISTS unique_template_step_order;

ALTER TABLE approval_template_step
ADD COLUMN IF NOT EXISTS approval_type VARCHAR(20) DEFAULT 'single';

-- CHECK constraint 추가
ALTER TABLE approval_template_step
DROP CONSTRAINT IF EXISTS approval_template_step_approval_type_check;

ALTER TABLE approval_template_step
ADD CONSTRAINT approval_template_step_approval_type_check
CHECK (approval_type IN ('single', 'agreement'));

COMMENT ON COLUMN approval_template_step.approval_type IS '결재 유형: single(단독), agreement(합의-전원승인필요)';

-- ================================================================
-- STEP 2: approval_step에 approval_type 컬럼 추가
-- ================================================================

-- 기존 unique constraint 제거 (합의 시 같은 step_order에 여러 명 가능)
ALTER TABLE approval_step
DROP CONSTRAINT IF EXISTS unique_request_step_order;

ALTER TABLE approval_step
ADD COLUMN IF NOT EXISTS approval_type VARCHAR(20) DEFAULT 'single';

-- CHECK constraint 추가
ALTER TABLE approval_step
DROP CONSTRAINT IF EXISTS approval_step_approval_type_check;

ALTER TABLE approval_step
ADD CONSTRAINT approval_step_approval_type_check
CHECK (approval_type IN ('single', 'agreement'));

COMMENT ON COLUMN approval_step.approval_type IS '결재 유형: single(단독), agreement(합의-전원승인필요)';

-- ================================================================
-- STEP 3: 템플릿 참조자 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS approval_template_cc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES approval_template(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_template_cc UNIQUE(template_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_template_cc_template ON approval_template_cc(template_id);
CREATE INDEX IF NOT EXISTS idx_approval_template_cc_employee ON approval_template_cc(employee_id);

COMMENT ON TABLE approval_template_cc IS '결재선 템플릿의 참조자 목록';
COMMENT ON COLUMN approval_template_cc.template_id IS '결재선 템플릿 ID';
COMMENT ON COLUMN approval_template_cc.employee_id IS '참조자 직원 ID';

-- ================================================================
-- STEP 4: 실제 요청 참조자 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS approval_cc (
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

CREATE INDEX IF NOT EXISTS idx_approval_cc_request ON approval_cc(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_approval_cc_employee ON approval_cc(employee_id);
CREATE INDEX IF NOT EXISTS idx_approval_cc_unread ON approval_cc(employee_id) WHERE read_at IS NULL;

COMMENT ON TABLE approval_cc IS '결재 요청의 참조자 목록';
COMMENT ON COLUMN approval_cc.request_type IS '요청 유형: leave, document 등';
COMMENT ON COLUMN approval_cc.request_id IS '실제 요청 ID (leave_request.id 등)';
COMMENT ON COLUMN approval_cc.employee_id IS '참조자 직원 ID';
COMMENT ON COLUMN approval_cc.submitted_notified_at IS '결재 상신 시 알림 발송 시각';
COMMENT ON COLUMN approval_cc.completed_notified_at IS '결재 완료 시 알림 발송 시각';
COMMENT ON COLUMN approval_cc.read_at IS '참조자가 문서를 열람한 시각';

-- ================================================================
-- VERIFICATION: 마이그레이션 검증 쿼리
-- ================================================================

-- 아래 쿼리로 마이그레이션 결과 확인 가능:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'approval_template_step' AND column_name = 'approval_type';
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'approval_step' AND column_name = 'approval_type';
-- SELECT * FROM approval_template_cc LIMIT 5;
-- SELECT * FROM approval_cc LIMIT 5;
