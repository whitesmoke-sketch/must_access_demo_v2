-- ================================================================
-- MIGRATION: Update doc_expense_proposal table
-- - Drop supply_amount and vat_amount columns (부가세 계산 제거)
-- - Make vendor_name required (거래 예정처 필수)
-- ================================================================

-- Drop supply_amount and vat_amount columns
ALTER TABLE doc_expense_proposal DROP COLUMN IF EXISTS supply_amount;
ALTER TABLE doc_expense_proposal DROP COLUMN IF EXISTS vat_amount;

-- Make vendor_name NOT NULL (with default for existing records)
UPDATE doc_expense_proposal SET vendor_name = '미지정' WHERE vendor_name IS NULL;
ALTER TABLE doc_expense_proposal ALTER COLUMN vendor_name SET NOT NULL;

-- Update comment
COMMENT ON COLUMN doc_expense_proposal.vendor_name IS 'Vendor name (required) - 거래 예정처';
COMMENT ON COLUMN doc_expense_proposal.total_amount IS 'Total amount without VAT - 총 금액 (부가세 미포함)';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
