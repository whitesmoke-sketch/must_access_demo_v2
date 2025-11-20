-- Create approval_steps function
CREATE OR REPLACE FUNCTION create_approval_steps(
  p_request_type text,
  p_request_id bigint,
  p_approver_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid;
  v_order integer := 1;
BEGIN
  -- 승인자 배열을 순회하면서 approval_step 생성
  FOREACH v_approver_id IN ARRAY p_approver_ids
  LOOP
    INSERT INTO approval_step (
      request_type,
      request_id,
      approver_id,
      step_order,
      status
    ) VALUES (
      p_request_type,
      p_request_id,
      v_approver_id,
      v_order,
      CASE WHEN v_order = 1 THEN 'pending' ELSE 'waiting' END
    );
    
    v_order := v_order + 1;
  END LOOP;
  
  -- leave_request의 current_step 업데이트
  IF p_request_type = 'leave' THEN
    UPDATE leave_request
    SET current_step = 1
    WHERE id = p_request_id;
  END IF;
END;
$$;

-- authenticated 역할에 실행 권한 부여
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION create_approval_steps(text, bigint, uuid[]) TO service_role;
