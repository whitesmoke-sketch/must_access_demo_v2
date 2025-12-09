-- ================================================================
-- MIGRATION: Migrate existing doc_* table data to doc_data JSONB
-- 기존 doc_* 테이블 데이터를 doc_data JSONB로 이전
-- ================================================================

-- 1. 휴가 데이터 마이그레이션 (doc_leave → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'leave_type', dl.leave_type,
  'start_date', dl.start_date,
  'end_date', dl.end_date,
  'days_count', dl.days_count,
  'half_day_slot', dl.half_day_slot,
  'reason', dl.reason,
  'attachment_url', dl.attachment_url,
  'deducted_from_grants', COALESCE(dl.deducted_from_grants, '[]'::jsonb)
)
FROM doc_leave dl
WHERE dm.id = dl.document_id
  AND dm.doc_type = 'leave'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 2. 야근수당 데이터 마이그레이션 (doc_overtime → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'work_date', do2.work_date,
  'start_time', do2.start_time::text,
  'end_time', do2.end_time::text,
  'total_hours', do2.total_hours,
  'work_content', do2.work_content,
  'transportation_fee', COALESCE(do2.transportation_fee, 0)
)
FROM doc_overtime do2
WHERE dm.id = do2.document_id
  AND dm.doc_type = 'overtime'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 3. 지출결의서 데이터 마이그레이션 (doc_expense → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'expense_date', de.expense_date,
  'category', de.category,
  'amount', de.amount,
  'merchant_name', de.merchant_name,
  'usage_purpose', de.usage_purpose,
  'receipt_url', de.receipt_url,
  'expense_items', COALESCE(de.expense_items, '[]'::jsonb),
  'payment_method', de.payment_method,
  'bank_name', de.bank_name,
  'account_number', de.account_number,
  'account_holder', de.account_holder
)
FROM doc_expense de
WHERE dm.id = de.document_id
  AND dm.doc_type = 'expense'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 4. 경조사비 데이터 마이그레이션 (doc_welfare → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'event_type', dw.event_type,
  'event_date', dw.event_date,
  'target_name', dw.target_name,
  'relationship', dw.relationship,
  'amount', dw.amount,
  'attachment_url', dw.attachment_url,
  'approved_amount', dw.approved_amount
)
FROM doc_welfare dw
WHERE dm.id = dw.document_id
  AND dm.doc_type = 'welfare'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 5. 일반문서 데이터 마이그레이션 (doc_general → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'content_body', dg.content_body,
  'attachment_urls', COALESCE(dg.attachment_urls, '[]'::jsonb),
  'template_type', dg.template_type,
  'form_data', COALESCE(dg.form_data, '{}'::jsonb)
)
FROM doc_general dg
WHERE dm.id = dg.document_id
  AND dm.doc_type = 'general'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 6. 예산신청서 데이터 마이그레이션 (doc_budget → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'budget_department_id', db.budget_department_id,
  'period_start', db.period_start,
  'period_end', db.period_end,
  'calculation_basis', db.calculation_basis,
  'total_amount', db.total_amount,
  'approved_amount', db.approved_amount
)
FROM doc_budget db
WHERE dm.id = db.document_id
  AND dm.doc_type = 'budget'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 7. 지출품의서 데이터 마이그레이션 (doc_expense_proposal → doc_data)
-- Note: expense_reason, supply_amount, vat_amount 컬럼은 이전 마이그레이션에서 삭제됨
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'expense_date', dep.expense_date,
  'items', COALESCE(dep.items, '[]'::jsonb),
  'total_amount', dep.total_amount,
  'vendor_name', dep.vendor_name
)
FROM doc_expense_proposal dep
WHERE dm.id = dep.document_id
  AND dm.doc_type = 'expense_proposal'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 8. 사직서 데이터 마이그레이션 (doc_resignation → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'employment_date', dr.employment_date,
  'resignation_date', dr.resignation_date,
  'resignation_type', dr.resignation_type,
  'handover_confirmed', COALESCE(dr.handover_confirmed, false),
  'confidentiality_agreed', COALESCE(dr.confidentiality_agreed, false),
  'voluntary_confirmed', COALESCE(dr.voluntary_confirmed, false),
  'last_working_date', dr.last_working_date,
  'hr_processed_at', dr.hr_processed_at,
  'hr_processor_id', dr.hr_processor_id,
  'hr_notes', dr.hr_notes
)
FROM doc_resignation dr
WHERE dm.id = dr.document_id
  AND dm.doc_type = 'resignation'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 9. 연장근로보고 데이터 마이그레이션 (doc_overtime_report → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'work_date', dor.work_date,
  'start_time', dor.start_time::text,
  'end_time', dor.end_time::text,
  'total_hours', dor.total_hours,
  'work_content', dor.work_content,
  'transportation_fee', COALESCE(dor.transportation_fee, 0),
  'meal_fee', COALESCE(dor.meal_fee, 0)
)
FROM doc_overtime_report dor
WHERE dm.id = dor.document_id
  AND dm.doc_type = 'overtime_report'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- 10. 근로형태변경 데이터 마이그레이션 (doc_work_type_change → doc_data)
UPDATE document_master dm
SET doc_data = jsonb_build_object(
  'work_type', dwtc.work_type::text,
  'start_date', dwtc.start_date,
  'end_date', dwtc.end_date
)
FROM doc_work_type_change dwtc
WHERE dm.id = dwtc.document_id
  AND dm.doc_type = 'work_type_change'
  AND (dm.doc_data IS NULL OR dm.doc_data = '{}'::jsonb);

-- ================================================================
-- 검증: doc_data가 비어있는 문서 확인
-- ================================================================
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM document_master
  WHERE doc_data IS NULL OR doc_data = '{}'::jsonb;

  IF missing_count > 0 THEN
    RAISE NOTICE '경고: %개의 문서에 doc_data가 없습니다. 확인이 필요합니다.', missing_count;
  ELSE
    RAISE NOTICE '마이그레이션 완료: 모든 문서에 doc_data가 설정되었습니다.';
  END IF;
END $$;

-- ================================================================
-- END OF MIGRATION
-- ================================================================
