-- ================================================
-- 통합 결재 문서 시스템 - 시드 데이터
-- 실제 스키마 제약조건에 맞게 수정됨
-- ================================================
-- approval_type: 'single' | 'agreement'
-- leave_type: 'annual' | 'half_day' | 'quarter_day' | 'award'
-- status: 'waiting' | 'pending' | 'approved' | 'rejected'

DO $$
DECLARE
  v_employee_id UUID;
  v_department_id INTEGER;
  v_manager_id UUID;
  v_doc_id INTEGER;
  v_employee_name TEXT;
BEGIN
  -- 승인자 (department_head) 먼저 찾기
  SELECT e.id INTO v_manager_id
  FROM employee e
  JOIN role r ON e.role_id = r.id
  WHERE r.code = 'department_head'
  LIMIT 1;

  -- 1. HR 직원의 휴가 신청 (pending)
  SELECT e.id, e.department_id, e.name INTO v_employee_id, v_department_id, v_employee_name
  FROM employee e
  JOIN role r ON e.role_id = r.id
  WHERE r.code = 'hr'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    INSERT INTO document_master (
      requester_id, department_id, doc_type, title, status, visibility, current_step
    ) VALUES (
      v_employee_id, v_department_id, 'leave',
      v_employee_name || '님의 연차 신청',
      'pending', 'department', 1
    ) RETURNING id INTO v_doc_id;

    INSERT INTO doc_leave (
      document_id, leave_type, start_date, end_date, days_count, reason
    ) VALUES (
      v_doc_id, 'annual',
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '8 days',
      2,
      '개인 사유로 인한 연차 사용'
    );

    IF v_manager_id IS NOT NULL THEN
      INSERT INTO approval_step (
        request_type, request_id, step_order, approver_id, approval_type, status, is_last_step
      ) VALUES (
        'leave', v_doc_id, 1, v_manager_id, 'single', 'pending', true
      );
    END IF;
  END IF;

  -- 2. HR 직원 2 - approved 상태
  SELECT e.id, e.department_id, e.name INTO v_employee_id, v_department_id, v_employee_name
  FROM employee e
  JOIN role r ON e.role_id = r.id
  WHERE r.code = 'hr'
  OFFSET 1 LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    INSERT INTO document_master (
      requester_id, department_id, doc_type, title, status, visibility, current_step, approved_at
    ) VALUES (
      v_employee_id, v_department_id, 'leave',
      v_employee_name || '님의 연차 신청',
      'approved', 'department', NULL, NOW() - INTERVAL '2 days'
    ) RETURNING id INTO v_doc_id;

    INSERT INTO doc_leave (
      document_id, leave_type, start_date, end_date, days_count, reason
    ) VALUES (
      v_doc_id, 'annual',
      CURRENT_DATE - INTERVAL '5 days',
      CURRENT_DATE - INTERVAL '4 days',
      2,
      '가족 행사 참석'
    );

    IF v_manager_id IS NOT NULL THEN
      INSERT INTO approval_step (
        request_type, request_id, step_order, approver_id, approval_type, status, is_last_step, approved_at
      ) VALUES (
        'leave', v_doc_id, 1, v_manager_id, 'single', 'approved', true, NOW() - INTERVAL '2 days'
      );
    END IF;
  END IF;

  -- 3. HR 직원 3 - 반차 pending
  SELECT e.id, e.department_id, e.name INTO v_employee_id, v_department_id, v_employee_name
  FROM employee e
  JOIN role r ON e.role_id = r.id
  WHERE r.code = 'hr'
  OFFSET 2 LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    INSERT INTO document_master (
      requester_id, department_id, doc_type, title, status, visibility, current_step
    ) VALUES (
      v_employee_id, v_department_id, 'leave',
      v_employee_name || '님의 반차 신청',
      'pending', 'department', 1
    ) RETURNING id INTO v_doc_id;

    INSERT INTO doc_leave (
      document_id, leave_type, start_date, end_date, days_count, half_day_slot, reason
    ) VALUES (
      v_doc_id, 'half_day',
      CURRENT_DATE + INTERVAL '3 days',
      CURRENT_DATE + INTERVAL '3 days',
      0.5,
      'morning',
      '병원 진료'
    );

    IF v_manager_id IS NOT NULL THEN
      INSERT INTO approval_step (
        request_type, request_id, step_order, approver_id, approval_type, status, is_last_step
      ) VALUES (
        'leave', v_doc_id, 1, v_manager_id, 'single', 'pending', true
      );
    END IF;
  END IF;

  -- 4. HR 직원 4 - 연차 rejected
  SELECT e.id, e.department_id, e.name INTO v_employee_id, v_department_id, v_employee_name
  FROM employee e
  JOIN role r ON e.role_id = r.id
  WHERE r.code = 'hr'
  OFFSET 3 LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    INSERT INTO document_master (
      requester_id, department_id, doc_type, title, status, visibility, current_step
    ) VALUES (
      v_employee_id, v_department_id, 'leave',
      v_employee_name || '님의 연차 신청',
      'rejected', 'department', NULL
    ) RETURNING id INTO v_doc_id;

    INSERT INTO doc_leave (
      document_id, leave_type, start_date, end_date, days_count, reason
    ) VALUES (
      v_doc_id, 'annual',
      CURRENT_DATE - INTERVAL '3 days',
      CURRENT_DATE - INTERVAL '1 day',
      3,
      '개인 사유'
    );

    IF v_manager_id IS NOT NULL THEN
      INSERT INTO approval_step (
        request_type, request_id, step_order, approver_id, approval_type, status, is_last_step, approved_at, comment
      ) VALUES (
        'leave', v_doc_id, 1, v_manager_id, 'single', 'rejected', true, NOW() - INTERVAL '1 day', '일정 조정 필요'
      );
    END IF;
  END IF;
END $$;

-- 결과 확인
SELECT '총 문서 수' as metric, COUNT(*)::text as value FROM document_master
UNION ALL SELECT '휴가 문서', COUNT(*)::text FROM document_master WHERE doc_type = 'leave'
UNION ALL SELECT '결재 단계', COUNT(*)::text FROM approval_step WHERE request_type = 'leave';
