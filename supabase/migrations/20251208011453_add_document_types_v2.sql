-- ================================================================
-- MIGRATION: Add new document types (budget, expense_proposal, resignation, overtime_report)
-- ================================================================

-- ================================================================
-- STEP 1: Add new document_type ENUM values
-- ================================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'budget';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'expense_proposal';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'resignation';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'overtime_report';

-- ================================================================
-- STEP 2: Create doc_budget table (Budget Request)
-- ================================================================

CREATE TABLE IF NOT EXISTS doc_budget (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    budget_department_id BIGINT NOT NULL REFERENCES department(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculation_basis TEXT NOT NULL,
    total_amount DECIMAL(15,0) NOT NULL,
    approved_amount DECIMAL(15,0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT budget_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_doc_budget_dept ON doc_budget(budget_department_id);
CREATE INDEX IF NOT EXISTS idx_doc_budget_period ON doc_budget(period_start, period_end);

COMMENT ON TABLE doc_budget IS 'Budget request document detail';
COMMENT ON COLUMN doc_budget.budget_department_id IS 'Department for budget allocation';
COMMENT ON COLUMN doc_budget.calculation_basis IS 'Calculation basis description';

-- ================================================================
-- STEP 3: Create doc_expense_proposal table (Expense Proposal)
-- ================================================================

CREATE TABLE IF NOT EXISTS doc_expense_proposal (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    expense_reason TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    supply_amount DECIMAL(15,0) NOT NULL,
    vat_amount DECIMAL(15,0) NOT NULL,
    total_amount DECIMAL(15,0) NOT NULL,
    vendor_name VARCHAR(200),
    linked_expense_id BIGINT REFERENCES document_master(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_expense_proposal_date ON doc_expense_proposal(expense_date);
CREATE INDEX IF NOT EXISTS idx_doc_expense_proposal_vendor ON doc_expense_proposal(vendor_name);

COMMENT ON TABLE doc_expense_proposal IS 'Expense proposal document detail';
COMMENT ON COLUMN doc_expense_proposal.items IS 'Item list [{item: string, quantity: number, unit_price: number}, ...]';
COMMENT ON COLUMN doc_expense_proposal.linked_expense_id IS 'Linked expense document ID after approval';

-- ================================================================
-- STEP 4: Create doc_resignation table (Resignation Letter)
-- ================================================================

CREATE TABLE IF NOT EXISTS doc_resignation (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    employment_date DATE NOT NULL,
    resignation_date DATE NOT NULL,
    resignation_type VARCHAR(50) NOT NULL CHECK (resignation_type IN ('personal', 'contract_end', 'recommended', 'other')),
    detail_reason TEXT,
    handover_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confidentiality_agreed BOOLEAN NOT NULL DEFAULT FALSE,
    voluntary_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    last_working_date DATE,
    hr_processed_at TIMESTAMPTZ,
    hr_processor_id UUID REFERENCES employee(id),
    hr_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT resignation_date_valid CHECK (resignation_date > employment_date)
);

CREATE INDEX IF NOT EXISTS idx_doc_resignation_type ON doc_resignation(resignation_type);
CREATE INDEX IF NOT EXISTS idx_doc_resignation_date ON doc_resignation(resignation_date);

COMMENT ON TABLE doc_resignation IS 'Resignation letter document detail';
COMMENT ON COLUMN doc_resignation.resignation_type IS 'Resignation type: personal, contract_end, recommended, other';
COMMENT ON COLUMN doc_resignation.handover_confirmed IS 'Handover confirmation pledge';
COMMENT ON COLUMN doc_resignation.confidentiality_agreed IS 'Confidentiality agreement';
COMMENT ON COLUMN doc_resignation.voluntary_confirmed IS 'Voluntary resignation confirmation';

-- ================================================================
-- STEP 5: Create doc_overtime_report table (Overtime Report)
-- ================================================================

CREATE TABLE IF NOT EXISTS doc_overtime_report (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours DECIMAL(4,1) NOT NULL,
    work_content TEXT NOT NULL,
    linked_overtime_request_id BIGINT REFERENCES document_master(id),
    transportation_fee DECIMAL(10,0) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_overtime_report_date ON doc_overtime_report(work_date);
CREATE INDEX IF NOT EXISTS idx_doc_overtime_report_linked ON doc_overtime_report(linked_overtime_request_id);

COMMENT ON TABLE doc_overtime_report IS 'Overtime report document detail (post-work report)';
COMMENT ON COLUMN doc_overtime_report.linked_overtime_request_id IS 'Related overtime request document ID';

-- ================================================================
-- STEP 6: Extend doc_expense table (payment method, bank info)
-- ================================================================

ALTER TABLE doc_expense ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)
    CHECK (payment_method IN ('corporate_card', 'bank_transfer', 'personal_card'));

ALTER TABLE doc_expense ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE doc_expense ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE doc_expense ADD COLUMN IF NOT EXISTS account_holder VARCHAR(100);

ALTER TABLE doc_expense ADD COLUMN IF NOT EXISTS linked_proposal_id BIGINT REFERENCES document_master(id);

CREATE INDEX IF NOT EXISTS idx_doc_expense_payment ON doc_expense(payment_method);
CREATE INDEX IF NOT EXISTS idx_doc_expense_linked ON doc_expense(linked_proposal_id);

COMMENT ON COLUMN doc_expense.payment_method IS 'Payment method: corporate_card, bank_transfer, personal_card';
COMMENT ON COLUMN doc_expense.bank_name IS 'Bank name (for transfer)';
COMMENT ON COLUMN doc_expense.account_number IS 'Account number (for transfer)';
COMMENT ON COLUMN doc_expense.account_holder IS 'Account holder (for transfer)';
COMMENT ON COLUMN doc_expense.linked_proposal_id IS 'Related expense proposal document ID';

-- ================================================================
-- STEP 7: RLS Policies
-- ================================================================

-- doc_budget RLS
ALTER TABLE doc_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_select" ON doc_budget FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_budget.document_id));

CREATE POLICY "budget_insert" ON doc_budget FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_budget.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "budget_update" ON doc_budget FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_budget.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_expense_proposal RLS
ALTER TABLE doc_expense_proposal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_proposal_select" ON doc_expense_proposal FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense_proposal.document_id));

CREATE POLICY "expense_proposal_insert" ON doc_expense_proposal FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense_proposal.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "expense_proposal_update" ON doc_expense_proposal FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense_proposal.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_resignation RLS
ALTER TABLE doc_resignation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resignation_select" ON doc_resignation FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_resignation.document_id));

CREATE POLICY "resignation_insert" ON doc_resignation FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_resignation.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "resignation_update" ON doc_resignation FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_resignation.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_overtime_report RLS
ALTER TABLE doc_overtime_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_report_select" ON doc_overtime_report FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime_report.document_id));

CREATE POLICY "overtime_report_insert" ON doc_overtime_report FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime_report.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "overtime_report_update" ON doc_overtime_report FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime_report.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- ================================================================
-- STEP 8: Update approval_step comment
-- ================================================================

COMMENT ON COLUMN approval_step.request_type IS 'Document type: leave, overtime, expense, welfare, general, budget, expense_proposal, resignation, overtime_report';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
