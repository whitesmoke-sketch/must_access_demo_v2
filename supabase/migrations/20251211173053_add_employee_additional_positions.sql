-- ================================================================
-- 직원 겸직 지원 테이블 추가
-- ================================================================
-- 이 마이그레이션은 직원의 겸직(추가 소속)을 지원하기 위한 테이블을 추가합니다.
-- 주 소속은 employee.department_id, employee.role_id로 유지됩니다.

-- 겸직(추가 소속)만 관리하는 테이블
CREATE TABLE employee_additional_positions (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES employee(id),

  -- 동일한 employee_id, department_id, role_id 조합은 중복 불가
  UNIQUE(employee_id, department_id, role_id)
);

-- 인덱스 생성
CREATE INDEX idx_emp_add_pos_employee ON employee_additional_positions(employee_id);
CREATE INDEX idx_emp_add_pos_department ON employee_additional_positions(department_id);
CREATE INDEX idx_emp_add_pos_role ON employee_additional_positions(role_id);

-- 테이블 설명
COMMENT ON TABLE employee_additional_positions IS '직원 겸직 추가 소속 (주 소속은 employee 테이블)';
COMMENT ON COLUMN employee_additional_positions.employee_id IS '직원 ID';
COMMENT ON COLUMN employee_additional_positions.department_id IS '추가 소속 부서 ID';
COMMENT ON COLUMN employee_additional_positions.role_id IS '추가 소속 직급 ID';
COMMENT ON COLUMN employee_additional_positions.assigned_at IS '추가 소속 배정 일시';
COMMENT ON COLUMN employee_additional_positions.assigned_by IS '추가 소속 배정자 ID';

-- RLS 정책 활성화
ALTER TABLE employee_additional_positions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자는 모두 조회 가능
CREATE POLICY employee_add_pos_select ON employee_additional_positions
  FOR SELECT TO authenticated
  USING (true);

-- RLS 정책: 인증된 사용자는 모두 추가 가능 (실제로는 권한 체크 필요)
CREATE POLICY employee_add_pos_insert ON employee_additional_positions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS 정책: 인증된 사용자는 모두 수정 가능 (실제로는 권한 체크 필요)
CREATE POLICY employee_add_pos_update ON employee_additional_positions
  FOR UPDATE TO authenticated
  USING (true);

-- RLS 정책: 인증된 사용자는 모두 삭제 가능 (실제로는 권한 체크 필요)
CREATE POLICY employee_add_pos_delete ON employee_additional_positions
  FOR DELETE TO authenticated
  USING (true);
