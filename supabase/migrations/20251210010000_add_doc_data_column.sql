-- ================================================================
-- MIGRATION: Add doc_data JSONB column to document_master
-- document_master에 doc_data JSONB 컬럼 추가
-- ================================================================

-- 1. doc_data JSONB 컬럼 추가
ALTER TABLE document_master
ADD COLUMN IF NOT EXISTS doc_data JSONB DEFAULT '{}'::jsonb;

-- 2. GIN 인덱스 추가 (JSONB 검색 성능)
CREATE INDEX IF NOT EXISTS idx_doc_master_doc_data
ON document_master USING GIN (doc_data);

-- 3. COMMENT 추가
COMMENT ON COLUMN document_master.doc_data IS '문서 유형별 상세 데이터 (JSONB) - doc_type에 따라 구조가 다름';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
