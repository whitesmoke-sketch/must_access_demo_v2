-- ================================================================
-- MIGRATION: approval_cc 테이블 RLS 정책 추가
-- ================================================================
-- Purpose: 참조자(CC)가 자신의 열람 상태를 업데이트할 수 있도록 RLS 정책 추가
-- ================================================================

-- ================================================================
-- STEP 1: approval_cc 테이블 RLS 활성화
-- ================================================================

ALTER TABLE approval_cc ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 2: approval_cc SELECT 정책
-- ================================================================

-- 참조자는 자신이 참조된 문서를 조회할 수 있음
CREATE POLICY approval_cc_select_own
ON approval_cc FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- ================================================================
-- STEP 3: approval_cc UPDATE 정책
-- ================================================================

-- 참조자는 자신의 열람 상태(read_at)를 업데이트할 수 있음
CREATE POLICY approval_cc_update_own
ON approval_cc FOR UPDATE
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- ================================================================
-- STEP 4: approval_template_cc 테이블 RLS 정책
-- ================================================================

ALTER TABLE approval_template_cc ENABLE ROW LEVEL SECURITY;

-- 템플릿 소유자만 참조자 목록 조회 가능
CREATE POLICY approval_template_cc_select_own
ON approval_template_cc FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_cc.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- 템플릿 소유자만 참조자 추가 가능
CREATE POLICY approval_template_cc_insert_own
ON approval_template_cc FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- 템플릿 소유자만 참조자 삭제 가능
CREATE POLICY approval_template_cc_delete_own
ON approval_template_cc FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_template
    WHERE approval_template.id = approval_template_cc.template_id
    AND approval_template.employee_id = auth.uid()
  )
);

-- ================================================================
-- VERIFICATION: 마이그레이션 검증 쿼리
-- ================================================================

-- 아래 쿼리로 RLS 정책 확인 가능:
-- SELECT * FROM pg_policies WHERE tablename = 'approval_cc';
-- SELECT * FROM pg_policies WHERE tablename = 'approval_template_cc';
