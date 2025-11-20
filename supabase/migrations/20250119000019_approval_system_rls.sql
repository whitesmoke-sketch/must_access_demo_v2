-- RLS for Approval System Tables
-- Migration: 20250119000019_approval_system_rls
-- Description: Row Level Security policies for approval_template, approval_template_step, approval_step

-- ================================================
-- approval_template 테이블 RLS
-- ================================================

ALTER TABLE approval_template ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인이 만든 템플릿만 조회 가능
CREATE POLICY "Users can view own approval templates"
ON approval_template FOR SELECT
USING (
  employee_id = auth.uid()
);

-- 사용자는 본인의 템플릿 생성 가능
CREATE POLICY "Users can create own approval templates"
ON approval_template FOR INSERT
WITH CHECK (
  employee_id = auth.uid()
);

-- 사용자는 본인의 템플릿 수정 가능
CREATE POLICY "Users can update own approval templates"
ON approval_template FOR UPDATE
USING (
  employee_id = auth.uid()
)
WITH CHECK (
  employee_id = auth.uid()
);

-- 사용자는 본인의 템플릿 삭제 가능
CREATE POLICY "Users can delete own approval templates"
ON approval_template FOR DELETE
USING (
  employee_id = auth.uid()
);

-- ================================================
-- approval_template_step 테이블 RLS
-- ================================================

ALTER TABLE approval_template_step ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인이 만든 템플릿의 단계만 조회 가능
CREATE POLICY "Users can view own template steps"
ON approval_template_step FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_step.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- 사용자는 본인의 템플릿에 단계 추가 가능
CREATE POLICY "Users can create own template steps"
ON approval_template_step FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_step.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- 사용자는 본인의 템플릿 단계 수정 가능
CREATE POLICY "Users can update own template steps"
ON approval_template_step FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_step.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- 사용자는 본인의 템플릿 단계 삭제 가능
CREATE POLICY "Users can delete own template steps"
ON approval_template_step FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_step.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- ================================================
-- approval_step 테이블 RLS
-- ================================================

ALTER TABLE approval_step ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인이 신청한 요청의 승인 단계 조회 가능
CREATE POLICY "Users can view own request approvals"
ON approval_step FOR SELECT
USING (
  -- 연차 신청의 경우
  (request_type = 'leave' AND EXISTS (
    SELECT 1 FROM leave_request
    WHERE leave_request.id = approval_step.request_id
    AND leave_request.employee_id = auth.uid()
  ))
  -- TODO: 문서 신청 등 다른 request_type 추가 시 OR 조건 추가
);

-- 승인자는 자신이 승인해야 하는 요청의 승인 단계 조회 가능
CREATE POLICY "Approvers can view assigned approvals"
ON approval_step FOR SELECT
USING (
  approver_id = auth.uid()
);

-- 사용자는 본인이 신청한 요청에 승인 단계 생성 가능
CREATE POLICY "Users can create approval steps for own requests"
ON approval_step FOR INSERT
WITH CHECK (
  -- 연차 신청의 경우
  (request_type = 'leave' AND EXISTS (
    SELECT 1 FROM leave_request
    WHERE leave_request.id = approval_step.request_id
    AND leave_request.employee_id = auth.uid()
  ))
  -- TODO: 문서 신청 등 다른 request_type 추가 시 OR 조건 추가
);

-- 승인자는 자신이 승인해야 하는 단계만 수정 가능 (승인/반려)
CREATE POLICY "Approvers can update assigned approval steps"
ON approval_step FOR UPDATE
USING (
  approver_id = auth.uid()
  AND status = 'pending' -- 현재 승인 차례인 것만
)
WITH CHECK (
  approver_id = auth.uid()
  AND status IN ('approved', 'rejected') -- 승인 또는 반려로만 변경 가능
);

-- Admin은 모든 승인 단계 조회 가능
CREATE POLICY "Admins can view all approval steps"
ON approval_step FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 5 -- CEO, HR
    AND e.status = 'active'
  )
);
