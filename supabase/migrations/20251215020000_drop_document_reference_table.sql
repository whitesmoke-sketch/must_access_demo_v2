-- ================================================================
-- MIGRATION: Remove document_reference table
-- summary_data.attached_documents 필드를 활용하여 첨부 문서 관리
-- ================================================================

-- RLS 정책 삭제
DROP POLICY IF EXISTS "참조 조회" ON document_reference;
DROP POLICY IF EXISTS "참조 생성" ON document_reference;

-- 인덱스 삭제
DROP INDEX IF EXISTS idx_doc_ref_source;
DROP INDEX IF EXISTS idx_doc_ref_target;

-- 테이블 삭제
DROP TABLE IF EXISTS document_reference;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
