-- ================================================================
-- MIGRATION: Remove expense_reason from doc_expense_proposal
-- 지출 사유 필드 제거
-- ================================================================

-- Drop expense_reason column (no longer needed)
ALTER TABLE doc_expense_proposal DROP COLUMN IF EXISTS expense_reason;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
