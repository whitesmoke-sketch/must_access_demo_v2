-- ============================================
-- 더미 데이터: Department (조직 계층 구조)
-- ============================================

-- 1. SI사업 (최상위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(1, 'SI사업', 'SI', NULL);

-- 2. AI팀 (SI사업 하위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(2, 'AI팀', 'SI-AI', 1);

-- 3. AI팀 하위 팀들
INSERT INTO department (id, name, code, parent_department_id) VALUES
(3, 'A-1팀', 'SI-AI-A1', 2),
(4, 'A-2팀', 'SI-AI-A2', 2),
(5, 'A-3팀', 'SI-AI-A3', 2);

-- 4. AISUPPORT팀 (SI사업 하위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(6, 'AISUPPORT팀', 'SI-AISUPPORT', 1);

-- 5. 경영지원 (최상위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(7, '경영지원', 'MGMT', NULL);

-- 6. HR팀 (경영지원 하위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(8, 'HR팀', 'MGMT-HR', 7);

-- 7. 개발사업 (최상위) - 추가 예시
INSERT INTO department (id, name, code, parent_department_id) VALUES
(9, '개발사업', 'DEV', NULL);

-- 8. 백엔드팀 (개발사업 하위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(10, '백엔드팀', 'DEV-BACKEND', 9);

-- 9. 백엔드팀 하위
INSERT INTO department (id, name, code, parent_department_id) VALUES
(11, 'API개발팀', 'DEV-BACKEND-API', 10),
(12, 'DB팀', 'DEV-BACKEND-DB', 10);

-- 10. 프론트엔드팀 (개발사업 하위)
INSERT INTO department (id, name, code, parent_department_id) VALUES
(13, '프론트엔드팀', 'DEV-FRONTEND', 9);

-- department id 시퀀스 업데이트
SELECT setval('department_id_seq', 13, true);

-- ============================================
-- 더미 데이터: Role (역할/직책)
-- ============================================

INSERT INTO role (id, name, code, level, description) VALUES
(1, '일반사원', 'employee', 1, '일반 구성원'),
(2, '팀리더', 'team_leader', 2, '팀을 이끄는 리더'),
(3, '부서리더', 'department_leader', 3, '부서를 이끄는 리더'),
(4, '사업리더', 'business_leader', 4, '사업부를 이끄는 리더'),
(5, '대표', 'ceo', 5, '최고 경영자'),
(6, 'HR', 'hr', 5, '인사 담당자 (최종 승인자)');

-- role id 시퀀스 업데이트
SELECT setval('role_id_seq', 6, true);

-- ============================================
-- 조직 트리 구조 확인용 뷰 (선택사항)
-- ============================================

COMMENT ON TABLE department IS '조직 계층 구조
예시:
- SI사업
  ├─ AI팀
  │   ├─ A-1팀
  │   ├─ A-2팀
  │   └─ A-3팀
  └─ AISUPPORT팀
- 경영지원
  └─ HR팀
- 개발사업
  ├─ 백엔드팀
  │   ├─ API개발팀
  │   └─ DB팀
  └─ 프론트엔드팀
';
