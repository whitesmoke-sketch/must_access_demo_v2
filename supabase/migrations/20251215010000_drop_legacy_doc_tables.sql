-- ================================================================
-- MIGRATION: Drop legacy doc_* tables
-- 기존 doc_* 테이블 삭제 (안정화 후 수동 실행)
--
-- 주의: 이 마이그레이션은 데이터 검증 완료 후 수동으로 실행하세요!
-- 실행 전 반드시 백업을 수행하세요!
-- ================================================================

-- RLS 정책 먼저 제거 (테이블 삭제 시 자동으로 제거되지만 명시적으로)
DROP POLICY IF EXISTS "leave_select" ON doc_leave;
DROP POLICY IF EXISTS "leave_insert" ON doc_leave;
DROP POLICY IF EXISTS "leave_update" ON doc_leave;

DROP POLICY IF EXISTS "overtime_select" ON doc_overtime;
DROP POLICY IF EXISTS "overtime_insert" ON doc_overtime;
DROP POLICY IF EXISTS "overtime_update" ON doc_overtime;

DROP POLICY IF EXISTS "expense_select" ON doc_expense;
DROP POLICY IF EXISTS "expense_insert" ON doc_expense;
DROP POLICY IF EXISTS "expense_update" ON doc_expense;

DROP POLICY IF EXISTS "welfare_select" ON doc_welfare;
DROP POLICY IF EXISTS "welfare_insert" ON doc_welfare;
DROP POLICY IF EXISTS "welfare_update" ON doc_welfare;

DROP POLICY IF EXISTS "general_select" ON doc_general;
DROP POLICY IF EXISTS "general_insert" ON doc_general;
DROP POLICY IF EXISTS "general_update" ON doc_general;

DROP POLICY IF EXISTS "budget_select" ON doc_budget;
DROP POLICY IF EXISTS "budget_insert" ON doc_budget;
DROP POLICY IF EXISTS "budget_update" ON doc_budget;

DROP POLICY IF EXISTS "expense_proposal_select" ON doc_expense_proposal;
DROP POLICY IF EXISTS "expense_proposal_insert" ON doc_expense_proposal;
DROP POLICY IF EXISTS "expense_proposal_update" ON doc_expense_proposal;

DROP POLICY IF EXISTS "resignation_select" ON doc_resignation;
DROP POLICY IF EXISTS "resignation_insert" ON doc_resignation;
DROP POLICY IF EXISTS "resignation_update" ON doc_resignation;

DROP POLICY IF EXISTS "overtime_report_select" ON doc_overtime_report;
DROP POLICY IF EXISTS "overtime_report_insert" ON doc_overtime_report;
DROP POLICY IF EXISTS "overtime_report_update" ON doc_overtime_report;

DROP POLICY IF EXISTS "work_type_change_select" ON doc_work_type_change;
DROP POLICY IF EXISTS "work_type_change_insert" ON doc_work_type_change;
DROP POLICY IF EXISTS "work_type_change_update" ON doc_work_type_change;

-- 테이블 삭제 (CASCADE로 인덱스, 제약조건 등 함께 삭제)
DROP TABLE IF EXISTS doc_leave CASCADE;
DROP TABLE IF EXISTS doc_overtime CASCADE;
DROP TABLE IF EXISTS doc_expense CASCADE;
DROP TABLE IF EXISTS doc_welfare CASCADE;
DROP TABLE IF EXISTS doc_general CASCADE;
DROP TABLE IF EXISTS doc_budget CASCADE;
DROP TABLE IF EXISTS doc_expense_proposal CASCADE;
DROP TABLE IF EXISTS doc_resignation CASCADE;
DROP TABLE IF EXISTS doc_overtime_report CASCADE;
DROP TABLE IF EXISTS doc_work_type_change CASCADE;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
