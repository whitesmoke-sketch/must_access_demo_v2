-- ================================================================
-- leave_request → document_master 마이그레이션
-- annual_leave_usage 테이블의 외래키 및 RLS 정책 수정
-- ================================================================

-- 1. annual_leave_usage 테이블의 leave_request_id 외래키 제약조건 삭제
-- (leave_request 테이블 대신 document_master를 참조하도록 변경)
ALTER TABLE annual_leave_usage
DROP CONSTRAINT IF EXISTS annual_leave_usage_leave_request_id_fkey;

-- 2. leave_request_id 컬럼명을 document_id로 변경 (명확성을 위해)
-- 주의: 기존 데이터가 있다면 마이그레이션 필요
DO $$
BEGIN
  -- 컬럼이 존재하는 경우에만 이름 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annual_leave_usage' AND column_name = 'leave_request_id'
  ) THEN
    ALTER TABLE annual_leave_usage RENAME COLUMN leave_request_id TO document_id;
  END IF;
END $$;

-- 3. 새로운 외래키 제약조건 추가 (document_master 참조)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'annual_leave_usage_document_id_fkey'
  ) THEN
    ALTER TABLE annual_leave_usage
    ADD CONSTRAINT annual_leave_usage_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES document_master(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. 인덱스 업데이트
DROP INDEX IF EXISTS idx_usage_request;
CREATE INDEX IF NOT EXISTS idx_usage_document ON annual_leave_usage(document_id);

-- ================================================================
-- leave_request 관련 RLS 정책 삭제 (테이블이 없으므로)
-- ================================================================

-- leave_request 테이블의 RLS 정책 삭제 (테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leave_request') THEN
    DROP POLICY IF EXISTS leave_request_select_own ON leave_request;
    DROP POLICY IF EXISTS leave_request_insert_own ON leave_request;
    DROP POLICY IF EXISTS leave_request_update_own ON leave_request;
    DROP POLICY IF EXISTS leave_request_select_as_approver ON leave_request;
    DROP POLICY IF EXISTS leave_request_update_as_approver ON leave_request;
  END IF;
END $$;

-- ================================================================
-- annual_leave_usage RLS 정책 업데이트
-- leave_request 대신 document_master 참조
-- ================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS leave_usage_select_own ON annual_leave_usage;

-- 새 정책 생성 (document_master 참조)
CREATE POLICY leave_usage_select_own
ON annual_leave_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM document_master
    WHERE document_master.id = annual_leave_usage.document_id
    AND document_master.requester_id = auth.uid()
  )
);

-- ================================================================
-- leave_request 테이블 관련 함수 삭제/수정
-- ================================================================

-- is_leave_request_owner 함수 삭제 (더 이상 필요 없음)
DROP FUNCTION IF EXISTS is_leave_request_owner(BIGINT);

-- update_leave_request_modified 트리거 함수 삭제
DROP FUNCTION IF EXISTS update_leave_request_modified() CASCADE;

-- ================================================================
-- 정리: leave_request 테이블 삭제 (데이터 마이그레이션 완료 후)
-- 주의: 기존 데이터가 있다면 먼저 document_master로 마이그레이션 필요
-- ================================================================

-- leave_request 테이블 삭제 (CASCADE로 관련 객체도 함께 삭제)
DROP TABLE IF EXISTS leave_request CASCADE;

-- ================================================================
-- 확인 코멘트
-- ================================================================
COMMENT ON TABLE annual_leave_usage IS 'Annual leave usage records - now references document_master instead of leave_request';
COMMENT ON COLUMN annual_leave_usage.document_id IS 'References document_master.id (previously leave_request_id)';
