-- annual_leave_balance 테이블에 INSERT 정책 추가
-- 관리자(level >= 3)만 연차 잔액 생성 가능

CREATE POLICY "Managers can insert leave balances"
ON annual_leave_balance FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);
