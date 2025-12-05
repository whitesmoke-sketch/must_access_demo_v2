-- work_request 테이블: 재택/외근/출장 신청 관리
-- Migration: 20250205100000_work_request_table.sql

-- 1. work_type enum 생성
CREATE TYPE work_type AS ENUM ('remote', 'field_work', 'business_trip');

-- 2. work_request 테이블 생성
CREATE TABLE work_request (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    work_type work_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    destination TEXT,  -- 외근/출장 장소 (재택은 NULL)
    attachment_url VARCHAR(500),

    -- 승인 관련
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approver_id UUID REFERENCES employee(id),
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    -- 결재 연동
    document_submission_id BIGINT REFERENCES document_submission(id),
    current_step INTEGER DEFAULT 1,

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 제약조건
    CONSTRAINT work_request_date_range CHECK (end_date >= start_date)
);

-- 3. 인덱스 생성
CREATE INDEX idx_work_request_employee ON work_request(employee_id);
CREATE INDEX idx_work_request_status ON work_request(status);
CREATE INDEX idx_work_request_start_date ON work_request(start_date);
CREATE INDEX idx_work_request_work_type ON work_request(work_type);
CREATE INDEX idx_work_request_date_range ON work_request(start_date, end_date);

-- 4. updated_at 자동 업데이트 트리거 함수 및 트리거
CREATE OR REPLACE FUNCTION update_work_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_request_updated_at
    BEFORE UPDATE ON work_request
    FOR EACH ROW
    EXECUTE FUNCTION update_work_request_updated_at();

-- 5. RLS 정책
ALTER TABLE work_request ENABLE ROW LEVEL SECURITY;

-- 본인 조회 정책
CREATE POLICY "work_request_select_own" ON work_request
    FOR SELECT TO authenticated
    USING (employee_id = auth.uid());

-- 본인 등록 정책
CREATE POLICY "work_request_insert_own" ON work_request
    FOR INSERT TO authenticated
    WITH CHECK (employee_id = auth.uid());

-- 본인 수정 정책 (pending 상태만)
CREATE POLICY "work_request_update_own" ON work_request
    FOR UPDATE TO authenticated
    USING (employee_id = auth.uid() AND status = 'pending')
    WITH CHECK (employee_id = auth.uid());

-- 승인권자 조회 정책
CREATE POLICY "work_request_select_as_approver" ON work_request
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    );

-- 승인권자 수정 정책
CREATE POLICY "work_request_update_as_approver" ON work_request
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM approval_step
            WHERE approval_step.request_type = 'work'
              AND approval_step.request_id = work_request.id
              AND approval_step.approver_id = auth.uid()
        )
    );

-- 관리자(level >= 3) 전체 조회 정책
CREATE POLICY "work_request_select_admin" ON work_request
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );

-- 6. 코멘트 추가
COMMENT ON TABLE work_request IS '재택/외근/출장 근무 신청 테이블';
COMMENT ON COLUMN work_request.work_type IS '근무 유형: remote(재택), field_work(외근), business_trip(출장)';
COMMENT ON COLUMN work_request.destination IS '외근/출장 장소 (재택은 NULL)';
