-- ================================================================
-- PG_CRON SETUP FOR LEAVE MANAGEMENT (실제 정책 기준)
-- ================================================================
-- Purpose: Set up automated cron jobs for leave grant functions
-- Edge Functions will be called via HTTP requests
-- ================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================================
-- 1. GRANT MONTHLY LEAVE (매일 00:00)
-- ================================================================
-- 월차 부여: 입사일 기준 매월 같은 날짜, 1년 미만 직원에게 부여 (만근 조건)

SELECT cron.schedule(
  'grant-monthly-leave',
  '0 0 * * *',  -- 매일 00:00
  $$
  SELECT net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/grant-monthly-leave',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- COMMENT: 매일 입사일 기준으로 월차 부여 대상 직원 체크 및 부여

-- ================================================================
-- 2. GRANT ANNUAL LEAVE (매년 1월 1일 00:00)
-- ================================================================
-- 연차 부여: 회계연도 기준, 전년도 근속일수 비례 계산하여 부여

SELECT cron.schedule(
  'grant-annual-leave',
  '0 0 1 1 *',  -- 매년 1월 1일 00:00
  $$
  SELECT net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/grant-annual-leave',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- COMMENT: 매년 1월 1일 전년도 근속일수 비례 계산하여 연차 자동 부여

-- ================================================================
-- 3. GRANT ATTENDANCE AWARD (분기 첫날 00:00)
-- ================================================================
-- 출석 포상: 분기별 만근자에게 포상 휴가 0.5일 부여

SELECT cron.schedule(
  'grant-attendance-award',
  '0 0 1 1,4,7,10 *',  -- 1월/4월/7월/10월 1일 00:00
  $$
  SELECT net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/grant-attendance-award',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- COMMENT: 분기별 만근자 포상 휴가 자동 부여 (0.5일)

-- ================================================================
-- CRON JOB 관리 쿼리 (참고용)
-- ================================================================

-- 모든 cron job 조회
-- SELECT * FROM cron.job;

-- 특정 cron job 삭제
-- SELECT cron.unschedule('grant-monthly-leave');
-- SELECT cron.unschedule('grant-annual-leave');
-- SELECT cron.unschedule('grant-attendance-award');

-- cron job 실행 이력 조회
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ================================================================
-- PRODUCTION 배포 시 주의사항
-- ================================================================
-- 1. URL을 실제 Supabase 프로젝트 URL로 변경:
--    http://127.0.0.1:54321 -> https://your-project.supabase.co
--
-- 2. Authorization Bearer token을 실제 service_role key로 변경:
--    로컬 토큰 -> 실제 SUPABASE_SERVICE_ROLE_KEY
--
-- 3. 타임존 확인:
--    pg_cron은 서버 타임존 기준으로 실행됨
--    필요시 타임존 변경: SET timezone = 'Asia/Seoul';
-- ================================================================
