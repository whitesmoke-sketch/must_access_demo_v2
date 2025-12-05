-- studio_access 테이블: 스튜디오 출입 상태 관리
-- Migration: 20250205100001_studio_access_table.sql

-- 1. studio_access 테이블 생성
CREATE TABLE studio_access (
    id BIGSERIAL PRIMARY KEY,
    location VARCHAR(50) NOT NULL DEFAULT 'B1F_STUDIO',  -- 위치 식별자
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'restricted')),
    reason TEXT,  -- 제한 사유 (예: "브랜드 리뉴얼 프로젝트 촬영")
    restricted_until TIMESTAMPTZ,  -- 제한 종료 시각 (NULL이면 무기한)
    updated_by UUID REFERENCES employee(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 동일 location에 대해 하나의 레코드만 유지
    CONSTRAINT studio_access_location_unique UNIQUE (location)
);

-- 2. 인덱스 생성
CREATE INDEX idx_studio_access_location ON studio_access(location);
CREATE INDEX idx_studio_access_status ON studio_access(status);

-- 3. updated_at 자동 업데이트 트리거 함수 및 트리거
CREATE OR REPLACE FUNCTION update_studio_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER studio_access_updated_at
    BEFORE UPDATE ON studio_access
    FOR EACH ROW
    EXECUTE FUNCTION update_studio_access_updated_at();

-- 4. RLS 정책
ALTER TABLE studio_access ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 조회 가능
CREATE POLICY "studio_access_select_all" ON studio_access
    FOR SELECT TO authenticated
    USING (true);

-- 관리자(level >= 3)만 수정 가능
CREATE POLICY "studio_access_update_admin" ON studio_access
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );

-- 관리자만 등록 가능
CREATE POLICY "studio_access_insert_admin" ON studio_access
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.id = auth.uid() AND r.level >= 3
        )
    );

-- 5. 기본 데이터 삽입 (지하1층 스튜디오)
INSERT INTO studio_access (location, status, reason)
VALUES ('B1F_STUDIO', 'available', NULL);

-- 6. 코멘트 추가
COMMENT ON TABLE studio_access IS '스튜디오 출입 상태 관리 테이블';
COMMENT ON COLUMN studio_access.location IS '위치 식별자 (예: B1F_STUDIO)';
COMMENT ON COLUMN studio_access.status IS '출입 상태: available(출입 가능), restricted(출입 제한)';
COMMENT ON COLUMN studio_access.reason IS '제한 사유';
COMMENT ON COLUMN studio_access.restricted_until IS '제한 종료 시각 (NULL이면 무기한)';
