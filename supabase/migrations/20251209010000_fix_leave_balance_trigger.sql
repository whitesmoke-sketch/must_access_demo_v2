-- ================================================================
-- MIGRATION: Fix leave balance trigger to use doc_data instead of doc_leave
-- doc_leave 테이블이 삭제되었으므로 doc_data JSONB 컬럼 사용
-- ================================================================

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS tr_leave_approval_balance_update ON document_master;

-- 수정된 함수 생성 (doc_data 컬럼 사용)
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
        -- doc_data JSONB 컬럼에서 휴가 일수 가져오기
        v_days := COALESCE((NEW.doc_data->>'days_count')::DECIMAL(4,1), 0);

        -- 일수가 0이면 summary_data에서도 시도
        IF v_days = 0 THEN
            v_days := COALESCE((NEW.summary_data->>'requested_days')::DECIMAL(4,1), 0);
        END IF;

        -- 일수가 없으면 리턴
        IF v_days = 0 THEN
            RETURN NEW;
        END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재생성
CREATE TRIGGER tr_leave_approval_balance_update
    AFTER UPDATE ON document_master
    FOR EACH ROW
    WHEN (NEW.doc_type = 'leave' AND NEW.status = 'approved')
    EXECUTE FUNCTION update_leave_balance_on_approval();

-- ================================================================
-- END OF MIGRATION
-- ================================================================
