-- employee 테이블에 INSERT/DELETE 정책 추가
-- 관리자(level >= 3)만 구성원 추가/삭제 가능

-- INSERT 정책: 부서리더 이상(level >= 3)만 구성원 추가 가능
CREATE POLICY "Managers can insert employees"
ON employee FOR INSERT
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

-- UPDATE 정책: 부서리더 이상(level >= 3)만 구성원 정보 수정 가능
CREATE POLICY "Managers can update employees"
ON employee FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
)
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

-- DELETE 정책: 부서리더 이상(level >= 3)만 구성원 삭제 가능
CREATE POLICY "Managers can delete employees"
ON employee FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM employee e
    JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.level >= 3
    AND e.status = 'active'
  )
);
