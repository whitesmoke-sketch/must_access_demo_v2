-- ================================================================
-- leave_request 참조 완전 정리
-- 이 스크립트는 Supabase SQL Editor에서 직접 실행해야 합니다
-- ================================================================

-- ================================================================
-- 1. approval_step 테이블 관련 정책 삭제 (leave_request 참조하는 것들)
-- ================================================================

-- approval_step 테이블의 문제가 되는 정책 삭제
DROP POLICY IF EXISTS "approval_step_select_by_request_owner" ON approval_step;
DROP POLICY IF EXISTS "approval_step_insert_by_request_owner" ON approval_step;

-- ================================================================
-- 2. leave_request 테이블 관련 모든 정책 삭제
-- ================================================================

-- leave_request 테이블이 존재하는 경우 정책 삭제
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leave_request') THEN
    EXECUTE 'DROP POLICY IF EXISTS leave_request_select_own ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_insert_own ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_update_own ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_select_as_approver ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_update_as_approver ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_select_hr ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS leave_request_update_hr ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS "leave_request_select_own" ON leave_request';
    EXECUTE 'DROP POLICY IF EXISTS "leave_request_insert_own" ON leave_request';
  END IF;
END $$;

-- ================================================================
-- 3. leave_request 참조하는 함수 삭제
-- ================================================================

DROP FUNCTION IF EXISTS is_leave_request_owner(BIGINT);
DROP FUNCTION IF EXISTS update_leave_request_modified() CASCADE;
DROP FUNCTION IF EXISTS sync_pdf_url() CASCADE;

-- ================================================================
-- 4. leave_request 테이블 삭제 (CASCADE로 모든 종속 객체 삭제)
-- ================================================================

DROP TABLE IF EXISTS leave_request CASCADE;

-- ================================================================
-- 5. annual_leave_usage 테이블 정리
-- ================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS leave_usage_select_own ON annual_leave_usage;

-- annual_leave_usage 테이블이 존재하고 document_id 컬럼이 있는 경우 새 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annual_leave_usage' AND column_name = 'document_id'
  ) THEN
    -- document_master 참조하는 새 정책 생성
    CREATE POLICY leave_usage_select_own ON annual_leave_usage FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM document_master
        WHERE document_master.id = annual_leave_usage.document_id
        AND document_master.requester_id = auth.uid()
      )
    );
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annual_leave_usage' AND column_name = 'leave_request_id'
  ) THEN
    -- leave_request_id 컬럼을 document_id로 이름 변경
    ALTER TABLE annual_leave_usage RENAME COLUMN leave_request_id TO document_id;

    -- 새 정책 생성
    CREATE POLICY leave_usage_select_own ON annual_leave_usage FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM document_master
        WHERE document_master.id = annual_leave_usage.document_id
        AND document_master.requester_id = auth.uid()
      )
    );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- 정책이 이미 존재하면 무시
END $$;

-- ================================================================
-- 6. approval_step 테이블에 document_master 참조 정책 확인
-- ================================================================

-- approval_step 기본 정책 확인 및 재생성
DO $$
BEGIN
  -- 기존 select 정책이 없으면 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'approval_step' AND policyname = 'approval_step_select_approver'
  ) THEN
    CREATE POLICY approval_step_select_approver ON approval_step FOR SELECT TO authenticated
    USING (approver_id = auth.uid());
  END IF;
END $$;

-- ================================================================
-- 7. 확인 쿼리
-- ================================================================

-- leave_request를 참조하는 정책이 남아있는지 확인
DO $$
DECLARE
  policy_record RECORD;
  has_issues BOOLEAN := FALSE;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE qual::text ILIKE '%leave_request%'
       OR with_check::text ILIKE '%leave_request%'
  LOOP
    RAISE NOTICE 'Found policy referencing leave_request: %.% - %',
      policy_record.schemaname, policy_record.tablename, policy_record.policyname;
    has_issues := TRUE;
  END LOOP;

  IF NOT has_issues THEN
    RAISE NOTICE 'No policies referencing leave_request found. Cleanup successful!';
  END IF;
END $$;

-- ================================================================
-- 완료 메시지
-- ================================================================

SELECT 'leave_request 참조 정리가 완료되었습니다.' AS status;
