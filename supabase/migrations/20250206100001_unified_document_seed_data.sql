-- ================================================================
-- SEED DATA: 통합 문서 시스템 테스트 데이터
-- 목적: 다양한 문서 유형별 테스트 데이터 생성
-- ================================================================

-- ================================================================
-- 1. 휴가 신청 문서 (leave) - 다양한 상태
-- ================================================================

-- 1.1 승인된 연차 신청
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at, approved_at
)
SELECT
    e.id,
    e.department_id,
    'team',
    false,
    'leave',
    e.name || '님 연차 신청 (12/9-12/10)',
    'approved',
    2,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days'
FROM employee e
WHERE e.status = 'active'
LIMIT 3;

-- 휴가 상세 데이터
INSERT INTO doc_leave (document_id, leave_type, start_date, end_date, days_count, reason)
SELECT
    dm.id,
    'annual',
    '2025-12-09',
    '2025-12-10',
    2.0,
    '개인 사유로 인한 연차 사용'
FROM document_master dm
WHERE dm.doc_type = 'leave' AND dm.status = 'approved';

-- 1.2 결재 대기 중인 반차 신청
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at
)
SELECT
    e.id,
    e.department_id,
    'team',
    false,
    'leave',
    e.name || '님 오전 반차 신청 (12/15)',
    'pending',
    1,
    NOW() - INTERVAL '1 day'
FROM employee e
WHERE e.status = 'active'
OFFSET 3 LIMIT 2;

INSERT INTO doc_leave (document_id, leave_type, start_date, end_date, days_count, half_day_slot, reason)
SELECT
    dm.id,
    'half_day',
    '2025-12-15',
    '2025-12-15',
    0.5,
    'morning',
    '병원 방문'
FROM document_master dm
WHERE dm.doc_type = 'leave' AND dm.status = 'pending';

-- 1.3 임시저장 연차
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at
)
SELECT
    e.id,
    e.department_id,
    'private',
    false,
    'leave',
    '연차 신청 (작성 중)',
    'draft',
    0,
    NOW()
FROM employee e
WHERE e.status = 'active'
OFFSET 5 LIMIT 1;

INSERT INTO doc_leave (document_id, leave_type, start_date, end_date, days_count, reason)
SELECT
    dm.id,
    'annual',
    '2025-12-20',
    '2025-12-24',
    5.0,
    ''
FROM document_master dm
WHERE dm.doc_type = 'leave' AND dm.status = 'draft';

-- ================================================================
-- 2. 야근 수당 신청 (overtime)
-- ================================================================

-- 2.1 승인된 야근 신청
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at, approved_at
)
SELECT
    e.id,
    e.department_id,
    'team',
    true,  -- 급여 관련이므로 기밀
    'overtime',
    e.name || '님 야근수당 신청 (11월)',
    'approved',
    2,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '7 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 1 LIMIT 2;

INSERT INTO doc_overtime (document_id, work_date, start_time, end_time, total_hours, work_content, transportation_fee)
SELECT
    dm.id,
    '2025-11-28',
    '18:00',
    '22:00',
    4.0,
    '긴급 배포 작업 및 모니터링',
    15000
FROM document_master dm
WHERE dm.doc_type = 'overtime' AND dm.status = 'approved';

-- 2.2 결재 대기 중인 야근 신청
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at
)
SELECT
    e.id,
    e.department_id,
    'team',
    true,
    'overtime',
    e.name || '님 야근수당 신청 (12월 1주차)',
    'pending',
    1,
    NOW() - INTERVAL '2 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 3 LIMIT 1;

INSERT INTO doc_overtime (document_id, work_date, start_time, end_time, total_hours, work_content, transportation_fee)
SELECT
    dm.id,
    '2025-12-03',
    '19:00',
    '23:00',
    4.0,
    '분기 마감 데이터 정리',
    15000
FROM document_master dm
WHERE dm.doc_type = 'overtime' AND dm.status = 'pending';

-- ================================================================
-- 3. 지출 결의서 (expense)
-- ================================================================

-- 3.1 승인된 지출 결의
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at, approved_at
)
SELECT
    e.id,
    e.department_id,
    'department',
    false,
    'expense',
    '팀 회식비 지출 결의',
    'approved',
    3,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '12 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 0 LIMIT 1;

INSERT INTO doc_expense (document_id, expense_date, category, amount, merchant_name, usage_purpose, expense_items)
SELECT
    dm.id,
    '2025-11-22',
    '회식비',
    450000,
    '고기굽는집',
    '11월 팀 회식',
    '[{"item": "저녁식사", "amount": 350000}, {"item": "2차", "amount": 100000}]'::jsonb
FROM document_master dm
WHERE dm.doc_type = 'expense' AND dm.status = 'approved';

-- 3.2 결재 대기 중인 비품 구매
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at
)
SELECT
    e.id,
    e.department_id,
    'department',
    false,
    'expense',
    '사무용품 구매 결의',
    'pending',
    1,
    NOW() - INTERVAL '1 day'
FROM employee e
WHERE e.status = 'active'
OFFSET 2 LIMIT 1;

INSERT INTO doc_expense (document_id, expense_date, category, amount, merchant_name, usage_purpose, expense_items)
SELECT
    dm.id,
    '2025-12-04',
    '비품',
    89000,
    '오피스디포',
    '팀 사무용품 보충',
    '[{"item": "A4용지 5박스", "amount": 45000}, {"item": "형광펜세트", "amount": 24000}, {"item": "포스트잇", "amount": 20000}]'::jsonb
FROM document_master dm
WHERE dm.doc_type = 'expense' AND dm.status = 'pending';

-- ================================================================
-- 4. 경조사비 신청 (welfare)
-- ================================================================

-- 4.1 승인된 경조사비
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at, approved_at
)
SELECT
    e.id,
    e.department_id,
    'private',
    true,  -- 개인 정보
    'welfare',
    '결혼 경조금 신청',
    'approved',
    2,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '18 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 4 LIMIT 1;

INSERT INTO doc_welfare (document_id, event_type, event_date, target_name, relationship, amount, approved_amount)
SELECT
    dm.id,
    '결혼',
    '2025-11-30',
    '본인',
    '본인',
    500000,
    500000
FROM document_master dm
WHERE dm.doc_type = 'welfare' AND dm.status = 'approved';

-- 4.2 결재 대기 중인 조의금
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at
)
SELECT
    e.id,
    e.department_id,
    'private',
    true,
    'welfare',
    '조의금 신청',
    'pending',
    1,
    NOW() - INTERVAL '3 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 1 LIMIT 1;

INSERT INTO doc_welfare (document_id, event_type, event_date, target_name, relationship, amount)
SELECT
    dm.id,
    '조의',
    '2025-12-02',
    '김OO',
    '조부',
    300000
FROM document_master dm
WHERE dm.doc_type = 'welfare' AND dm.status = 'pending'
AND EXISTS (SELECT 1 FROM doc_welfare WHERE document_id = dm.id) = false;

-- ================================================================
-- 5. 일반 문서 (general)
-- ================================================================

-- 5.1 승인된 일반 공문
INSERT INTO document_master (
    requester_id, department_id, visibility, is_confidential,
    doc_type, title, status, current_step, created_at, approved_at
)
SELECT
    e.id,
    e.department_id,
    'public',
    false,
    'general',
    '2025년 연말 행사 계획 공유',
    'approved',
    2,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '5 days'
FROM employee e
WHERE e.status = 'active'
OFFSET 0 LIMIT 1;

INSERT INTO doc_general (document_id, content_body, template_type)
SELECT
    dm.id,
    '## 2025년 연말 행사 계획

### 일정
- 날짜: 2025년 12월 20일 (금)
- 시간: 18:00 ~ 21:00
- 장소: 본사 대회의실

### 프로그램
1. 올해의 성과 발표
2. 시상식
3. 저녁 식사
4. 경품 추첨

문의: 경영지원팀',
    'notice'
FROM document_master dm
WHERE dm.doc_type = 'general' AND dm.status = 'approved';

-- ================================================================
-- 6. 결재선 데이터 (approval_step) 생성
-- ================================================================

-- 결재 대기 중인 문서에 대한 결재선 생성
DO $$
DECLARE
    v_doc RECORD;
    v_manager RECORD;
    v_hr RECORD;
BEGIN
    -- HR 담당자 찾기 (role level >= 5)
    SELECT e.id INTO v_hr
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE r.level >= 5 AND e.status = 'active'
    LIMIT 1;

    -- pending 상태인 모든 문서에 결재선 추가
    FOR v_doc IN
        SELECT dm.id, dm.doc_type, dm.requester_id, dm.department_id
        FROM document_master dm
        WHERE dm.status = 'pending'
    LOOP
        -- 부서 리더 찾기
        SELECT l.employee_id INTO v_manager
        FROM leader l
        WHERE l.department_id = v_doc.department_id
        AND l.employee_id != v_doc.requester_id
        LIMIT 1;

        -- 리더가 없으면 다른 직원 중 상위자
        IF v_manager IS NULL THEN
            SELECT e.id INTO v_manager
            FROM employee e
            JOIN role r ON e.role_id = r.id
            WHERE e.department_id = v_doc.department_id
            AND e.id != v_doc.requester_id
            AND e.status = 'active'
            ORDER BY r.level DESC
            LIMIT 1;
        END IF;

        -- 1단계: 팀장/매니저
        IF v_manager IS NOT NULL THEN
            INSERT INTO approval_step (
                request_type, request_id, approver_id, step_order, status, is_last_step
            ) VALUES (
                v_doc.doc_type::text, v_doc.id, v_manager.employee_id, 1, 'pending',
                CASE WHEN v_hr IS NULL THEN true ELSE false END
            )
            ON CONFLICT (request_type, request_id, step_order) DO NOTHING;
        END IF;

        -- 2단계: HR (경조사/급여 관련만)
        IF v_hr IS NOT NULL AND v_doc.doc_type IN ('welfare', 'overtime') THEN
            INSERT INTO approval_step (
                request_type, request_id, approver_id, step_order, status, is_last_step
            ) VALUES (
                v_doc.doc_type::text, v_doc.id, v_hr.id, 2, 'waiting', true
            )
            ON CONFLICT (request_type, request_id, step_order) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 승인된 문서의 결재선 (이미 완료됨)
DO $$
DECLARE
    v_doc RECORD;
    v_manager UUID;
BEGIN
    FOR v_doc IN
        SELECT dm.id, dm.doc_type, dm.department_id
        FROM document_master dm
        WHERE dm.status = 'approved'
    LOOP
        -- 부서 리더
        SELECT l.employee_id INTO v_manager
        FROM leader l
        WHERE l.department_id = v_doc.department_id
        LIMIT 1;

        IF v_manager IS NOT NULL THEN
            INSERT INTO approval_step (
                request_type, request_id, approver_id, step_order, status,
                is_last_step, approved_at
            ) VALUES (
                v_doc.doc_type::text, v_doc.id, v_manager, 1, 'approved',
                true, NOW() - INTERVAL '3 days'
            )
            ON CONFLICT (request_type, request_id, step_order) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ================================================================
-- 7. 문서 접근 로그 샘플
-- ================================================================

INSERT INTO document_access_log (document_id, viewer_id, viewed_at, action_type)
SELECT
    dm.id,
    dm.requester_id,
    dm.created_at + INTERVAL '1 hour',
    'view'
FROM document_master dm
WHERE dm.status IN ('approved', 'pending')
LIMIT 5;

-- ================================================================
-- 완료: 데이터 확인
-- ================================================================

-- 생성된 문서 수 확인
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM document_master;
    RAISE NOTICE '총 생성된 문서 수: %', v_count;

    SELECT COUNT(*) INTO v_count FROM document_master WHERE doc_type = 'leave';
    RAISE NOTICE '- 휴가 신청: %', v_count;

    SELECT COUNT(*) INTO v_count FROM document_master WHERE doc_type = 'overtime';
    RAISE NOTICE '- 야근 수당: %', v_count;

    SELECT COUNT(*) INTO v_count FROM document_master WHERE doc_type = 'expense';
    RAISE NOTICE '- 지출 결의: %', v_count;

    SELECT COUNT(*) INTO v_count FROM document_master WHERE doc_type = 'welfare';
    RAISE NOTICE '- 경조사비: %', v_count;

    SELECT COUNT(*) INTO v_count FROM document_master WHERE doc_type = 'general';
    RAISE NOTICE '- 일반 문서: %', v_count;

    SELECT COUNT(*) INTO v_count FROM approval_step;
    RAISE NOTICE '총 결재 단계: %', v_count;
END $$;
