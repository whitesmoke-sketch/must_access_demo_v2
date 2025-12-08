-- ================================================================
-- MIGRATION: Set existing documents visibility to public
-- 기존 문서들의 공개 범위를 전체공개로 설정
-- ================================================================

-- 기존 문서 중 visibility가 NULL이거나 기본값인 경우 'public'으로 설정
-- 단, 연차(leave)와 사직서(resignation)는 'private' 유지
UPDATE document_master
SET visibility = 'public'
WHERE doc_type NOT IN ('leave', 'resignation')
  AND (visibility IS NULL OR visibility != 'private');

-- 연차와 사직서는 비공개로 설정
UPDATE document_master
SET visibility = 'private'
WHERE doc_type IN ('leave', 'resignation');

-- ================================================================
-- END OF MIGRATION
-- ================================================================
