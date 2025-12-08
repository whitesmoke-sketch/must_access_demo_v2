-- ================================================================
-- MIGRATION: Update payment_method CHECK constraint
-- Change 'bank_transfer' to 'tax_invoice' (세금계산서/이체)
-- ================================================================

-- Drop existing CHECK constraint
ALTER TABLE doc_expense DROP CONSTRAINT IF EXISTS doc_expense_payment_method_check;

-- Add new CHECK constraint with updated values
ALTER TABLE doc_expense ADD CONSTRAINT doc_expense_payment_method_check
    CHECK (payment_method IN ('corporate_card', 'personal_card', 'tax_invoice'));

-- Update any existing 'bank_transfer' records to 'tax_invoice'
UPDATE doc_expense SET payment_method = 'tax_invoice' WHERE payment_method = 'bank_transfer';

-- Update comment
COMMENT ON COLUMN doc_expense.payment_method IS 'Payment method: corporate_card (법인카드), personal_card (개인카드), tax_invoice (세금계산서/이체)';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
