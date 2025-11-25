-- Add rejected_at column to leave_request table
ALTER TABLE leave_request
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add pdf_url as alias/synonym for drive_file_url
ALTER TABLE leave_request
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create trigger to sync pdf_url with drive_file_url
CREATE OR REPLACE FUNCTION sync_pdf_url()
RETURNS TRIGGER AS $$
BEGIN
  -- drive_file_url이 업데이트되면 pdf_url도 동일하게 설정
  IF NEW.drive_file_url IS DISTINCT FROM OLD.drive_file_url THEN
    NEW.pdf_url := NEW.drive_file_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_pdf_url_trigger
BEFORE INSERT OR UPDATE ON leave_request
FOR EACH ROW
EXECUTE FUNCTION sync_pdf_url();

-- 기존 데이터 동기화 (drive_file_url 값을 pdf_url에 복사)
UPDATE leave_request
SET pdf_url = drive_file_url
WHERE drive_file_url IS NOT NULL AND pdf_url IS NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_leave_request_rejected_at
ON leave_request(rejected_at)
WHERE rejected_at IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN leave_request.rejected_at IS 'Timestamp when the leave request was rejected';
COMMENT ON COLUMN leave_request.pdf_url IS 'PDF URL (synced with drive_file_url for backward compatibility)';
