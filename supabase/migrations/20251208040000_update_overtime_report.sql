-- ================================================================
-- MIGRATION: Update doc_overtime_report table
-- - Add meal_fee column (식대)
-- - Drop linked_overtime_request_id column (기존문서 첨부로 대체)
-- ================================================================

-- Add meal_fee column
ALTER TABLE doc_overtime_report ADD COLUMN IF NOT EXISTS meal_fee INTEGER DEFAULT 0;

COMMENT ON COLUMN doc_overtime_report.meal_fee IS 'Meal allowance amount (식대)';

-- Drop linked_overtime_request_id column
ALTER TABLE doc_overtime_report DROP COLUMN IF EXISTS linked_overtime_request_id;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
