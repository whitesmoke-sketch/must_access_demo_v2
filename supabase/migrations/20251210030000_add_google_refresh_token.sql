-- Google Refresh Token 영구 저장을 위한 컬럼 추가
-- 세션 만료 후에도 Google API 접근을 위해 사용

ALTER TABLE employee
ADD COLUMN IF NOT EXISTS google_refresh_token text;

-- 컬럼에 대한 설명 추가
COMMENT ON COLUMN employee.google_refresh_token IS 'Google OAuth refresh token for persistent API access';

-- 인덱스 추가 (토큰 조회 성능 개선, NULL이 아닌 경우만)
CREATE INDEX IF NOT EXISTS idx_employee_google_refresh_token
ON employee (id)
WHERE google_refresh_token IS NOT NULL;
