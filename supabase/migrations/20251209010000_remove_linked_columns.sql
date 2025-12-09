-- ================================================================
-- MIGRATION: Remove linked_ columns from expense tables
-- 지출 관련 테이블에서 linked_ 컬럼 제거
-- document_reference 테이블의 "기존 문서 첨부" 기능으로 대체
-- ================================================================

-- Remove linked_proposal_id from doc_expense
-- 지출 결의서에서 품의서 연결 컬럼 제거
ALTER TABLE doc_expense DROP COLUMN IF EXISTS linked_proposal_id;

-- Remove linked_expense_id from doc_expense_proposal
-- 지출 품의서에서 결의서 연결 컬럼 제거
ALTER TABLE doc_expense_proposal DROP COLUMN IF EXISTS linked_expense_id;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
