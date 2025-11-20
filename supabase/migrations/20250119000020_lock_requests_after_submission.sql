-- 제출 후 수정/삭제 불가 정책
-- Migration: 20250119000020_lock_requests_after_submission
-- Description: 신청서 제출 후 수정/삭제 불가, 승인 후 코멘트 수정 불가

-- ================================================
-- leave_request 테이블 수정/삭제 불가
-- ================================================

-- 기존 UPDATE 정책 제거 (있다면)
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON leave_request;

-- 기존 DELETE 정책 유지하되, 승인 단계가 있으면 삭제 불가로 변경
DROP POLICY IF EXISTS "Users can delete own leave requests" ON leave_request;

-- 삭제 불가 (제출 후 취소 불가)
-- 조회만 가능하도록 SELECT 정책만 유지

COMMENT ON TABLE leave_request IS '연차 신청 (제출 후 수정/삭제 불가)';

-- ================================================
-- approval_step: 승인/반려 후 수정 불가 강화
-- ================================================

-- 기존 UPDATE 정책 제거
DROP POLICY IF EXISTS "Approvers can update assigned approval steps" ON approval_step;

-- 새로운 UPDATE 정책: status가 'pending'일 때만 승인/반려 가능
-- 한번 approved/rejected로 변경되면 다시 변경 불가
CREATE POLICY "Approvers can approve or reject pending steps only once"
ON approval_step FOR UPDATE
USING (
  approver_id = auth.uid()
  AND status = 'pending' -- 현재 pending 상태인 것만
)
WITH CHECK (
  approver_id = auth.uid()
  AND status IN ('approved', 'rejected') -- approved 또는 rejected로만 변경 가능
  AND comment IS NOT NULL -- 코멘트 필수
);

COMMENT ON COLUMN approval_step.comment IS '승인/반려 사유 (필수, 변경 불가)';
COMMENT ON COLUMN approval_step.status IS 'pending일 때만 approved/rejected로 변경 가능 (이후 변경 불가)';
