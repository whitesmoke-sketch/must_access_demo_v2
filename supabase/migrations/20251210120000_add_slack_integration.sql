-- =============================================
-- Slack Integration Migration
-- employee 테이블에 슬랙 연동 정보 컬럼 추가
-- =============================================

-- 슬랙 연동 정보 컬럼 추가
ALTER TABLE employee
ADD COLUMN IF NOT EXISTS slack_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS slack_access_token TEXT,
ADD COLUMN IF NOT EXISTS slack_email TEXT,
ADD COLUMN IF NOT EXISTS slack_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS slack_connected_at TIMESTAMPTZ;

-- 인덱스 생성 (슬랙 사용자 ID로 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_employee_slack_user_id ON employee(slack_user_id) WHERE slack_user_id IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN employee.slack_user_id IS '슬랙 멤버 ID (알림 발송용)';
COMMENT ON COLUMN employee.slack_access_token IS '슬랙 사용자 토큰';
COMMENT ON COLUMN employee.slack_email IS '슬랙 계정 이메일 (검증용)';
COMMENT ON COLUMN employee.slack_avatar_url IS '슬랙 프로필 이미지 URL';
COMMENT ON COLUMN employee.slack_connected_at IS '슬랙 연동 시간';
