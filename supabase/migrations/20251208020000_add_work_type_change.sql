-- ================================================================
-- MIGRATION: Add work_type_change document type
-- ================================================================

-- ================================================================
-- STEP 1: Add new document_type ENUM value
-- ================================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'work_type_change';

-- ================================================================
-- STEP 2: Create work_type ENUM
-- ================================================================

DO $$ BEGIN
    CREATE TYPE work_type AS ENUM (
        'unpaid_sick_leave',      -- 무급병가 (연 60일)
        'public_duty',            -- 공가 휴가 (예비군/민방위 등)
        'leave_of_absence',       -- 휴직 (무급)
        'parental_leave',         -- 육아 휴직
        'family_event_leave',     -- 경조사 휴가
        'maternity_leave',        -- 출산전후 휴가 (90일)
        'paternity_leave',        -- 배우자출산휴가 (20일)
        'pregnancy_reduced_hours',-- 임신 중 단축근무
        'work_schedule_change',   -- 근무 변경 (재택 등)
        'business_trip',          -- 출장/외근
        'menstrual_leave'         -- 여성 보건 휴가
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- STEP 3: Create doc_work_type_change table
-- ================================================================

CREATE TABLE IF NOT EXISTS doc_work_type_change (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    work_type work_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    detail_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT work_type_change_date_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_doc_work_type_change_type ON doc_work_type_change(work_type);
CREATE INDEX IF NOT EXISTS idx_doc_work_type_change_dates ON doc_work_type_change(start_date, end_date);

COMMENT ON TABLE doc_work_type_change IS 'Work type change request document detail';
COMMENT ON COLUMN doc_work_type_change.work_type IS 'Type of work arrangement change';
COMMENT ON COLUMN doc_work_type_change.start_date IS 'Start date of the change';
COMMENT ON COLUMN doc_work_type_change.end_date IS 'End date of the change';
COMMENT ON COLUMN doc_work_type_change.detail_description IS 'Detailed description of the request';

-- ================================================================
-- STEP 4: RLS Policies
-- ================================================================

ALTER TABLE doc_work_type_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_type_change_select" ON doc_work_type_change FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_work_type_change.document_id));

CREATE POLICY "work_type_change_insert" ON doc_work_type_change FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_work_type_change.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "work_type_change_update" ON doc_work_type_change FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_work_type_change.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- ================================================================
-- END OF MIGRATION
-- ================================================================
