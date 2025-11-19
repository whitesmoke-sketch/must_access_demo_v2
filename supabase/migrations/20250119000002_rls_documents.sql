-- RLS for Document Management Tables
-- Migration: 20250119000002_rls_documents
-- Description: Row Level Security policies for document_template, document_submission, and document_approval_instance

-- ================================================
-- document_template 테이블 RLS
-- ================================================

ALTER TABLE document_template ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 활성화된 템플릿 조회 가능
CREATE POLICY "All users can view active templates"
ON document_template FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_active = TRUE
);

-- Admin은 모든 템플릿 조회 가능 (비활성 포함)
CREATE POLICY "Admins can view all templates"
ON document_template FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 템플릿 생성/수정/삭제 가능
CREATE POLICY "Admins can manage templates"
ON document_template FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- document_submission 테이블 RLS
-- ================================================

ALTER TABLE document_submission ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인이 제출한 문서 조회 가능
CREATE POLICY "Users can view own submissions"
ON document_submission FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_submission.employee_id
    AND employee.id = auth.uid()
  )
);

-- 승인자는 자신이 승인해야 하는 문서 조회 가능
CREATE POLICY "Approvers can view submissions to approve"
ON document_submission FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_approval_instance dai
    INNER JOIN employee e ON dai.approver_id = e.id
    WHERE dai.submission_id = document_submission.id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 문서 조회 가능
CREATE POLICY "Admins can view all submissions"
ON document_submission FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 사용자는 본인의 문서만 생성 가능
CREATE POLICY "Users can create own submissions"
ON document_submission FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_submission.employee_id
    AND employee.id = auth.uid()
  )
);

-- 사용자는 본인의 draft 상태 문서만 수정 가능
CREATE POLICY "Users can update own draft submissions"
ON document_submission FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_submission.employee_id
    AND employee.id = auth.uid()
  )
  AND status = 'draft'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_submission.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 문서 수정 가능
CREATE POLICY "Admins can update all submissions"
ON document_submission FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- document_approval_instance 테이블 RLS
-- ================================================

ALTER TABLE document_approval_instance ENABLE ROW LEVEL SECURITY;

-- 승인자는 자신의 승인 인스턴스만 조회 가능
CREATE POLICY "Approvers can view own approval instances"
ON document_approval_instance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_approval_instance.approver_id
    AND employee.id = auth.uid()
  )
);

-- 문서 제출자는 자신의 문서 승인 인스턴스 조회 가능
CREATE POLICY "Submitters can view their document approvals"
ON document_approval_instance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_submission ds
    INNER JOIN employee e ON ds.employee_id = e.id
    WHERE ds.id = document_approval_instance.submission_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 승인 인스턴스 조회 가능
CREATE POLICY "Admins can view all approval instances"
ON document_approval_instance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 승인자는 자신의 승인 인스턴스만 수정 가능 (승인/반려)
CREATE POLICY "Approvers can update own approval instances"
ON document_approval_instance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_approval_instance.approver_id
    AND employee.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = document_approval_instance.approver_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 승인 인스턴스 수정 가능
CREATE POLICY "Admins can update all approval instances"
ON document_approval_instance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- document_approval_line 테이블 RLS
-- ================================================

ALTER TABLE document_approval_line ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 승인 라인 조회 가능
CREATE POLICY "All users can view approval lines"
ON document_approval_line FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admin만 승인 라인 관리 가능
CREATE POLICY "Admins can manage approval lines"
ON document_approval_line FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
