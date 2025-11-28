-- ================================================================
-- MIGRATION: department.manager_id → leader 테이블 분리
-- ================================================================
-- Purpose: 1조직:N리더, 1사람:N조직 리더 관계 지원
-- ================================================================

-- ================================================================
-- STEP 1: leader 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS leader (
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (department_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_leader_employee ON leader(employee_id);
CREATE INDEX IF NOT EXISTS idx_leader_department ON leader(department_id);

COMMENT ON TABLE leader IS '부서-리더 다대다 관계 테이블 (1조직:N리더, 1사람:N조직 리더)';

-- ================================================================
-- STEP 2: 기존 department.manager_id 데이터를 leader 테이블로 이관
-- ================================================================

INSERT INTO leader (department_id, employee_id, created_at)
SELECT id, manager_id, NOW()
FROM department
WHERE manager_id IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (department_id, employee_id) DO NOTHING;

-- ================================================================
-- STEP 3: approval_organization_snapshot에 leaders JSONB 컬럼 추가
-- ================================================================

ALTER TABLE approval_organization_snapshot
ADD COLUMN IF NOT EXISTS leaders JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN approval_organization_snapshot.leaders IS '승인 시점의 부서 리더 목록 [{id, name}, ...]';

-- ================================================================
-- STEP 4: 기존 manager_id/manager_name 데이터를 leaders JSONB로 이관
-- ================================================================

UPDATE approval_organization_snapshot
SET leaders = CASE
  WHEN manager_id IS NOT NULL AND manager_name IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object('id', manager_id, 'name', manager_name))
  WHEN manager_id IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object('id', manager_id, 'name', ''))
  ELSE '[]'::jsonb
END
WHERE leaders = '[]'::jsonb OR leaders IS NULL;

-- ================================================================
-- STEP 5: department_with_stats VIEW 수정
-- ================================================================

DROP VIEW IF EXISTS department_with_stats;

CREATE OR REPLACE VIEW department_with_stats AS
SELECT
  d.id,
  d.name,
  d.code,
  d.parent_department_id,
  d.display_order,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.updated_by,
  d.deleted_at,
  d.deleted_by,
  get_department_path(d.id) AS full_path,
  COUNT(DISTINCT e.id) FILTER (WHERE e.deleted_at IS NULL AND e.status::text = 'active'::text) AS active_member_count,
  COUNT(DISTINCT child.id) FILTER (WHERE child.deleted_at IS NULL) AS child_count,
  -- 리더 정보를 JSON 배열로 반환
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('id', le.id, 'name', le.name))
      FROM leader l
      JOIN employee le ON le.id = l.employee_id
      WHERE l.department_id = d.id
    ),
    '[]'::jsonb
  ) AS leaders,
  COALESCE(cb.name, ''::VARCHAR) AS created_by_name,
  COALESCE(ub.name, ''::VARCHAR) AS updated_by_name
FROM department d
LEFT JOIN employee e ON e.department_id = d.id
LEFT JOIN department child ON child.parent_department_id = d.id
LEFT JOIN employee cb ON cb.id = d.created_by
LEFT JOIN employee ub ON ub.id = d.updated_by
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.code, d.parent_department_id, d.display_order,
         d.created_at, d.updated_at, d.created_by, d.updated_by, d.deleted_at, d.deleted_by,
         cb.name, ub.name;

-- ================================================================
-- STEP 6: department.manager_id 컬럼 제거
-- ================================================================

-- 인덱스 먼저 제거
DROP INDEX IF EXISTS idx_dept_manager;

-- 컬럼 제거
ALTER TABLE department DROP COLUMN IF EXISTS manager_id;

-- ================================================================
-- STEP 7: approval_organization_snapshot의 manager_id, manager_name 제거
-- ================================================================

ALTER TABLE approval_organization_snapshot DROP COLUMN IF EXISTS manager_id;
ALTER TABLE approval_organization_snapshot DROP COLUMN IF EXISTS manager_name;

-- ================================================================
-- VERIFICATION: 마이그레이션 검증 쿼리
-- ================================================================

-- 아래 쿼리로 마이그레이션 결과 확인 가능:
-- SELECT * FROM leader;
-- SELECT id, name, leaders FROM department_with_stats LIMIT 5;
-- SELECT id, leaders FROM approval_organization_snapshot LIMIT 5;
