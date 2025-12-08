-- ================================================================
-- MIGRATION: Remove reason fields from document tables
-- - doc_resignation: remove detail_reason
-- - doc_work_type_change: remove detail_description
-- ================================================================

-- Remove detail_reason from doc_resignation
ALTER TABLE doc_resignation DROP COLUMN IF EXISTS detail_reason;

-- Remove detail_description from doc_work_type_change
ALTER TABLE doc_work_type_change DROP COLUMN IF EXISTS detail_description;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
