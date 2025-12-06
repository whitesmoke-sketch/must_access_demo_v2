-- ================================================================
-- MIGRATION: 통합 결재 문서 시스템 재설계 (Master-Detail 구조)
-- 목적: 문서별 테이블 분리, 공개범위 설정, 참조 기능, 워터마킹 로그 지원
-- 주의: 기존 문서/휴가 데이터 삭제됨 (테스트 환경용)
-- ================================================================

-- ================================================================
-- STEP 1: 기존 테이블 및 의존성 정리
-- ================================================================

-- 1.1 기존 approval_step 데이터 삭제 (문서/휴가 관련)
DELETE FROM approval_step WHERE request_type IN ('leave', 'document');
DELETE FROM approval_cc WHERE request_type IN ('leave', 'document');

-- 1.2 기존 휴가 관련 데이터 삭제 (의존성 순서대로)
DROP TABLE IF EXISTS annual_leave_usage CASCADE;
DROP TABLE IF EXISTS leave_request CASCADE;

-- 1.3 기존 문서 관련 테이블 삭제
DROP TABLE IF EXISTS document_approval_instance CASCADE;
DROP TABLE IF EXISTS document_approval_line CASCADE;
DROP TABLE IF EXISTS document_submission CASCADE;
DROP TABLE IF EXISTS document_template CASCADE;

-- 1.4 기존 복지 관련 테이블 삭제
DROP TABLE IF EXISTS welfare_approval CASCADE;
DROP TABLE IF EXISTS welfare_request CASCADE;

-- 1.5 annual_leave_grant의 document_submission_id FK 제거
ALTER TABLE annual_leave_grant DROP CONSTRAINT IF EXISTS annual_leave_grant_document_submission_id_fkey;
ALTER TABLE annual_leave_grant DROP COLUMN IF EXISTS document_submission_id;

-- 1.6 overtime_conversion의 document_submission_id FK 제거
ALTER TABLE overtime_conversion DROP CONSTRAINT IF EXISTS overtime_conversion_document_submission_id_fkey;
ALTER TABLE overtime_conversion DROP COLUMN IF EXISTS document_submission_id;

-- ================================================================
-- STEP 2: ENUM 타입 정의
-- ================================================================

-- 2.1 문서 공개 범위 (비공개, 팀, 부서, 본부, 전사)
DO $$ BEGIN
    CREATE TYPE visibility_scope AS ENUM ('private', 'team', 'department', 'division', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.2 문서 유형 정의
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM (
        'leave',        -- 연차/포상휴가 (휴가 계열)
        'overtime',     -- 야근수당
        'expense',      -- 지출결의
        'welfare',      -- 경조사비
        'general'       -- 기타/일반 공문
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- STEP 3: Document Master (공통 헤더 테이블)
-- ================================================================

CREATE TABLE document_master (
    id BIGSERIAL PRIMARY KEY,
    document_number VARCHAR(50) UNIQUE, -- 문서번호 (예: 2024-DEV-001)

    -- 작성자 정보 (검색 및 RLS용)
    requester_id UUID NOT NULL REFERENCES employee(id),
    department_id BIGINT NOT NULL REFERENCES department(id),

    -- 공개 및 보안 설정
    visibility visibility_scope NOT NULL DEFAULT 'team',
    is_confidential BOOLEAN DEFAULT FALSE,

    -- 문서 기본 정보
    doc_type document_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'retrieved')),

    -- 검색 최적화를 위한 스냅샷
    summary_data JSONB,

    -- 결재선 정보
    current_step INTEGER DEFAULT 1,

    -- Google Drive 연동
    drive_file_id TEXT,
    drive_file_url TEXT,
    pdf_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_doc_master_visibility ON document_master(visibility, department_id);
CREATE INDEX idx_doc_master_requester ON document_master(requester_id);
CREATE INDEX idx_doc_master_status ON document_master(status);
CREATE INDEX idx_doc_master_created_at ON document_master(created_at DESC);
CREATE INDEX idx_doc_master_doc_type ON document_master(doc_type);
CREATE INDEX idx_doc_master_drive_file ON document_master(drive_file_id) WHERE drive_file_id IS NOT NULL;

COMMENT ON TABLE document_master IS '통합 문서 마스터 테이블 - 모든 결재 문서의 공통 헤더';

-- ================================================================
-- STEP 4: Document Details (문서별 상세 테이블 - 1:1 관계)
-- ================================================================

-- 4.1 휴가 신청 (연차, 포상휴가 통합)
CREATE TABLE doc_leave (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'half_day', 'quarter_day', 'award')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(4,1) NOT NULL,
    half_day_slot VARCHAR(10) CHECK (half_day_slot IN ('morning', 'afternoon')),
    reason TEXT,
    attachment_url VARCHAR(500),

    -- 휴가 차감 관련 (승인 후 처리)
    deducted_from_grants JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_leave_dates ON doc_leave(start_date, end_date);
CREATE INDEX idx_doc_leave_type ON doc_leave(leave_type);

COMMENT ON TABLE doc_leave IS '휴가 신청 상세 (연차, 반차, 포상휴가)';

-- 4.2 야근 수당 신청
CREATE TABLE doc_overtime (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours DECIMAL(4,1) NOT NULL,
    work_content TEXT NOT NULL,
    transportation_fee DECIMAL(10,0) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_overtime_date ON doc_overtime(work_date);

COMMENT ON TABLE doc_overtime IS '야근 수당 신청 상세';

-- 4.3 지출 결의서
CREATE TABLE doc_expense (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(15,0) NOT NULL,
    merchant_name VARCHAR(100),
    usage_purpose TEXT,
    receipt_url VARCHAR(500),

    -- 다중 지출 항목 지원
    expense_items JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_expense_date ON doc_expense(expense_date);
CREATE INDEX idx_doc_expense_category ON doc_expense(category);

COMMENT ON TABLE doc_expense IS '지출 결의서 상세';

-- 4.4 경조사비 신청 (Welfare)
CREATE TABLE doc_welfare (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    target_name VARCHAR(100),
    relationship VARCHAR(50),
    amount DECIMAL(15,0) NOT NULL,
    attachment_url VARCHAR(500),

    -- 승인된 금액 (HR 검토 후)
    approved_amount DECIMAL(15,0),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_welfare_date ON doc_welfare(event_date);
CREATE INDEX idx_doc_welfare_type ON doc_welfare(event_type);

COMMENT ON TABLE doc_welfare IS '경조사비 신청 상세';

-- 4.5 기타 일반 문서 (General)
CREATE TABLE doc_general (
    document_id BIGINT PRIMARY KEY REFERENCES document_master(id) ON DELETE CASCADE,
    content_body TEXT NOT NULL,
    attachment_urls JSONB DEFAULT '[]'::jsonb,

    -- 템플릿 참조 (선택사항)
    template_type VARCHAR(50),
    form_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doc_general IS '기타/일반 문서 상세';

-- ================================================================
-- STEP 5: 문서 참조 기능 (Reference System)
-- ================================================================

CREATE TABLE document_reference (
    id BIGSERIAL PRIMARY KEY,
    source_doc_id BIGINT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
    target_doc_id BIGINT NOT NULL REFERENCES document_master(id),

    -- 참조 시점의 원본 데이터 스냅샷
    snapshot_title VARCHAR(255),
    snapshot_content JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source_doc_id, target_doc_id)
);

CREATE INDEX idx_doc_ref_source ON document_reference(source_doc_id);
CREATE INDEX idx_doc_ref_target ON document_reference(target_doc_id);

COMMENT ON TABLE document_reference IS '문서 참조 관계 (내용 스냅샷 포함)';

-- ================================================================
-- STEP 6: 워터마킹용 접근 로그 (Access Log)
-- ================================================================

CREATE TABLE document_access_log (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES employee(id),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    action_type VARCHAR(20) DEFAULT 'view' CHECK (action_type IN ('view', 'print', 'download'))
);

CREATE INDEX idx_doc_access_log_doc ON document_access_log(document_id);
CREATE INDEX idx_doc_access_log_viewer ON document_access_log(viewer_id);
CREATE INDEX idx_doc_access_log_time ON document_access_log(viewed_at DESC);

COMMENT ON TABLE document_access_log IS '문서 접근 로그 (워터마킹/감사용)';

-- 접근 로그는 수정/삭제 불가능하게 설정
CREATE OR REPLACE FUNCTION prevent_access_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'document_access_log records cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_access_log_update
    BEFORE UPDATE OR DELETE ON document_access_log
    FOR EACH ROW EXECUTE FUNCTION prevent_access_log_modification();

-- ================================================================
-- STEP 7: approval_step 연결을 위한 CHECK 제약조건 수정
-- ================================================================

-- 기존 request_type 값에 새로운 문서 유형 추가 허용
-- (approval_step은 text 타입이므로 자유롭게 사용 가능)

-- approval_template의 request_type도 확장 가능하도록 유지
-- 기존: 'leave', 'document'
-- 추가: 'overtime', 'expense', 'welfare', 'general'

COMMENT ON COLUMN approval_step.request_type IS '문서 유형: leave, overtime, expense, welfare, general';
COMMENT ON COLUMN approval_step.request_id IS 'document_master.id 참조';

-- ================================================================
-- STEP 8: 휴가 차감 연동을 위한 연결 테이블
-- ================================================================

CREATE TABLE leave_usage_link (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES document_master(id) ON DELETE CASCADE,
    grant_id BIGINT NOT NULL REFERENCES annual_leave_grant(id) ON DELETE CASCADE,
    used_days DECIMAL(4,1) NOT NULL,
    used_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(document_id, grant_id)
);

CREATE INDEX idx_leave_usage_doc ON leave_usage_link(document_id);
CREATE INDEX idx_leave_usage_grant ON leave_usage_link(grant_id);

COMMENT ON TABLE leave_usage_link IS '휴가 사용 내역 (document_master - annual_leave_grant 연결)';

-- ================================================================
-- STEP 9: RLS (Row Level Security) 정책 설정
-- ================================================================

ALTER TABLE document_master ENABLE ROW LEVEL SECURITY;

-- 9.1 조회 정책: 복합 조건
CREATE POLICY "문서 조회 권한" ON document_master FOR SELECT
USING (
    -- 1. 본인이 작성자
    requester_id = auth.uid()

    -- 2. 본인이 현재 결재 대기자이거나 과거 결재자
    OR EXISTS (
        SELECT 1 FROM approval_step
        WHERE request_type = document_master.doc_type::text
        AND request_id = document_master.id
        AND approver_id = auth.uid()
    )

    -- 3. 참조자로 지정된 경우
    OR EXISTS (
        SELECT 1 FROM approval_cc
        WHERE request_type = document_master.doc_type::text
        AND request_id = document_master.id
        AND employee_id = auth.uid()
    )

    -- 4. HR 권한자 (role level >= 5)
    OR EXISTS (
        SELECT 1 FROM employee e
        JOIN role r ON e.role_id = r.id
        WHERE e.id = auth.uid() AND r.level >= 5
    )

    -- 5. 공개 범위에 따른 조회 (승인된 문서만, 비밀문서 제외)
    OR (
        status = 'approved' AND is_confidential = FALSE AND (
            visibility = 'public'
            OR (visibility = 'division' AND department_id IN (
                SELECT d.id FROM department d
                WHERE d.parent_department_id = (
                    SELECT parent_department_id FROM department
                    WHERE id = (SELECT department_id FROM employee WHERE id = auth.uid())
                )
            ))
            OR (visibility = 'department' AND department_id = (
                SELECT department_id FROM employee WHERE id = auth.uid()
            ))
            OR (visibility = 'team' AND department_id = (
                SELECT department_id FROM employee WHERE id = auth.uid()
            ))
        )
    )
);

-- 9.2 생성 정책
CREATE POLICY "문서 생성 권한" ON document_master FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- 9.3 수정 정책: 임시저장(draft) 또는 회수(retrieved) 상태인 본인 문서만
CREATE POLICY "문서 수정 권한" ON document_master FOR UPDATE
USING (requester_id = auth.uid() AND status IN ('draft', 'retrieved'));

-- 9.4 삭제 정책: draft 상태인 본인 문서만
CREATE POLICY "문서 삭제 권한" ON document_master FOR DELETE
USING (requester_id = auth.uid() AND status = 'draft');

-- ================================================================
-- STEP 10: 상세 테이블 RLS 정책
-- ================================================================

-- doc_leave RLS
ALTER TABLE doc_leave ENABLE ROW LEVEL SECURITY;

CREATE POLICY "휴가상세 조회" ON doc_leave FOR SELECT
USING (EXISTS (
    SELECT 1 FROM document_master dm
    WHERE dm.id = doc_leave.document_id
));

CREATE POLICY "휴가상세 생성" ON doc_leave FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM document_master dm
    WHERE dm.id = doc_leave.document_id
    AND dm.requester_id = auth.uid()
));

CREATE POLICY "휴가상세 수정" ON doc_leave FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM document_master dm
    WHERE dm.id = doc_leave.document_id
    AND dm.requester_id = auth.uid()
    AND dm.status IN ('draft', 'retrieved')
));

-- doc_overtime RLS
ALTER TABLE doc_overtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "야근상세 조회" ON doc_overtime FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime.document_id));

CREATE POLICY "야근상세 생성" ON doc_overtime FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "야근상세 수정" ON doc_overtime FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_overtime.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_expense RLS
ALTER TABLE doc_expense ENABLE ROW LEVEL SECURITY;

CREATE POLICY "지출상세 조회" ON doc_expense FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense.document_id));

CREATE POLICY "지출상세 생성" ON doc_expense FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "지출상세 수정" ON doc_expense FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_expense.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_welfare RLS
ALTER TABLE doc_welfare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "경조사상세 조회" ON doc_welfare FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_welfare.document_id));

CREATE POLICY "경조사상세 생성" ON doc_welfare FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_welfare.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "경조사상세 수정" ON doc_welfare FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_welfare.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- doc_general RLS
ALTER TABLE doc_general ENABLE ROW LEVEL SECURITY;

CREATE POLICY "일반문서상세 조회" ON doc_general FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_general.document_id));

CREATE POLICY "일반문서상세 생성" ON doc_general FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_general.document_id AND dm.requester_id = auth.uid()));

CREATE POLICY "일반문서상세 수정" ON doc_general FOR UPDATE
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = doc_general.document_id AND dm.requester_id = auth.uid() AND dm.status IN ('draft', 'retrieved')));

-- document_reference RLS
ALTER TABLE document_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "참조 조회" ON document_reference FOR SELECT
USING (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = document_reference.source_doc_id));

CREATE POLICY "참조 생성" ON document_reference FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = document_reference.source_doc_id AND dm.requester_id = auth.uid()));

-- document_access_log RLS
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "접근로그 조회" ON document_access_log FOR SELECT
USING (
    viewer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM document_master dm
        WHERE dm.id = document_access_log.document_id
        AND dm.requester_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM employee e
        JOIN role r ON e.role_id = r.id
        WHERE e.id = auth.uid() AND r.level >= 5
    )
);

CREATE POLICY "접근로그 생성" ON document_access_log FOR INSERT
WITH CHECK (viewer_id = auth.uid());

-- leave_usage_link RLS
ALTER TABLE leave_usage_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "휴가사용내역 조회" ON leave_usage_link FOR SELECT
USING (
    EXISTS (SELECT 1 FROM document_master dm WHERE dm.id = leave_usage_link.document_id AND dm.requester_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employee e JOIN role r ON e.role_id = r.id WHERE e.id = auth.uid() AND r.level >= 5)
);

-- ================================================================
-- STEP 11: 문서번호 자동 생성 함수
-- ================================================================

CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_dept_code TEXT;
    v_seq INT;
    v_doc_number TEXT;
BEGIN
    -- 연도
    v_year := TO_CHAR(NOW(), 'YYYY');

    -- 부서 코드
    SELECT code INTO v_dept_code FROM department WHERE id = NEW.department_id;

    -- 시퀀스 (해당 연도+부서의 다음 번호)
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(document_number, '-', 3) AS INT)
    ), 0) + 1 INTO v_seq
    FROM document_master
    WHERE document_number LIKE v_year || '-' || v_dept_code || '-%';

    -- 문서번호 생성
    v_doc_number := v_year || '-' || v_dept_code || '-' || LPAD(v_seq::TEXT, 4, '0');

    NEW.document_number := v_doc_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_document_number
    BEFORE INSERT ON document_master
    FOR EACH ROW
    WHEN (NEW.document_number IS NULL AND NEW.status = 'pending')
    EXECUTE FUNCTION generate_document_number();

-- ================================================================
-- STEP 12: updated_at 자동 갱신 트리거
-- ================================================================

CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_document_master_updated_at
    BEFORE UPDATE ON document_master
    FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

-- ================================================================
-- STEP 13: 연차 잔액 업데이트 함수 수정
-- ================================================================

CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_id UUID;
    v_days DECIMAL(4,1);
    v_grant RECORD;
    v_remaining DECIMAL(4,1);
    v_to_deduct DECIMAL(4,1);
BEGIN
    -- 휴가 문서가 승인된 경우에만 처리
    IF NEW.doc_type = 'leave' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- 휴가 상세 정보 가져오기
        SELECT dl.days_count INTO v_days
        FROM doc_leave dl
        WHERE dl.document_id = NEW.id;

        v_employee_id := NEW.requester_id;
        v_remaining := v_days;

        -- FIFO 방식으로 연차 차감
        FOR v_grant IN
            SELECT g.id, g.granted_days,
                   COALESCE(SUM(lul.used_days), 0) as used_days
            FROM annual_leave_grant g
            LEFT JOIN leave_usage_link lul ON lul.grant_id = g.id
            WHERE g.employee_id = v_employee_id
            AND g.expiration_date >= CURRENT_DATE
            AND g.approval_status = 'approved'
            GROUP BY g.id, g.granted_days, g.expiration_date
            HAVING g.granted_days > COALESCE(SUM(lul.used_days), 0)
            ORDER BY g.expiration_date ASC
        LOOP
            EXIT WHEN v_remaining <= 0;

            v_to_deduct := LEAST(v_remaining, v_grant.granted_days - v_grant.used_days);

            INSERT INTO leave_usage_link (document_id, grant_id, used_days, used_date)
            VALUES (NEW.id, v_grant.id, v_to_deduct, CURRENT_DATE);

            v_remaining := v_remaining - v_to_deduct;
        END LOOP;

        -- 잔액 테이블 업데이트
        UPDATE annual_leave_balance
        SET used_days = used_days + v_days,
            remaining_days = remaining_days - v_days,
            updated_at = NOW()
        WHERE employee_id = v_employee_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leave_approval_balance_update
    AFTER UPDATE ON document_master
    FOR EACH ROW
    WHEN (NEW.doc_type = 'leave' AND NEW.status = 'approved')
    EXECUTE FUNCTION update_leave_balance_on_approval();

-- ================================================================
-- 완료
-- ================================================================

COMMENT ON SCHEMA public IS '통합 문서 시스템 v2.0 - Master-Detail 구조';
