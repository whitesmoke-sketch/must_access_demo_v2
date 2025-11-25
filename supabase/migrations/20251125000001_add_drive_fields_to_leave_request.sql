-- Add Google Drive fields to leave_request table
-- 연차 신청서가 구글 드라이브에 저장될 때 필요한 정보

ALTER TABLE leave_request
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_file_url TEXT,
ADD COLUMN IF NOT EXISTS drive_shared_with JSONB DEFAULT '[]'::jsonb;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_leave_request_drive_file_id
ON leave_request(drive_file_id)
WHERE drive_file_id IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN leave_request.drive_file_id IS 'Google Drive file ID';
COMMENT ON COLUMN leave_request.drive_file_url IS 'Google Drive file web view URL';
COMMENT ON COLUMN leave_request.drive_shared_with IS 'Array of email addresses that have access to the Drive file';
