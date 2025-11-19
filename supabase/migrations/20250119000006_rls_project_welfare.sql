-- RLS for Project and Welfare Tables
-- Migration: 20250119000006_rls_project_welfare
-- Description: Row Level Security policies for project, project_member, welfare_request, welfare_approval, notification, batch_job_log

-- ================================================
-- project 테이블 RLS
-- ================================================

ALTER TABLE project ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버는 자신이 속한 프로젝트 조회 가능
CREATE POLICY "Project members can view their projects"
ON project FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_member pm
    INNER JOIN employee e ON pm.user_id = e.id
    WHERE pm.project_id = project.id
    AND e.id = auth.uid()
    AND pm.is_active = TRUE
  )
);

-- 프로젝트 리더는 자신이 리더인 프로젝트 조회 가능
CREATE POLICY "Project leaders can view their projects"
ON project FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = project.leader_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 프로젝트 조회 가능
CREATE POLICY "Admins can view all projects"
ON project FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 프로젝트 리더는 자신의 프로젝트 수정 가능
CREATE POLICY "Project leaders can update their projects"
ON project FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = project.leader_id
    AND employee.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = project.leader_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 프로젝트 생성/수정/삭제 가능
CREATE POLICY "Admins can manage all projects"
ON project FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- project_member 테이블 RLS
-- ================================================

ALTER TABLE project_member ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버는 자신이 속한 프로젝트의 멤버 목록 조회 가능
CREATE POLICY "Project members can view their project members"
ON project_member FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_member pm
    INNER JOIN employee e ON pm.user_id = e.id
    WHERE pm.project_id = project_member.project_id
    AND e.id = auth.uid()
    AND pm.is_active = TRUE
  )
);

-- Admin은 모든 프로젝트 멤버 조회 가능
CREATE POLICY "Admins can view all project members"
ON project_member FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 프로젝트 리더는 자신의 프로젝트 멤버 관리 가능
CREATE POLICY "Project leaders can manage their project members"
ON project_member FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project p
    INNER JOIN employee e ON p.leader_id = e.id
    WHERE p.id = project_member.project_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 프로젝트 멤버 관리 가능
CREATE POLICY "Admins can manage all project members"
ON project_member FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- welfare_request 테이블 RLS
-- ================================================

ALTER TABLE welfare_request ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 복지 신청만 조회 가능
CREATE POLICY "Users can view own welfare requests"
ON welfare_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = welfare_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 복지 신청 조회 가능
CREATE POLICY "Admins can view all welfare requests"
ON welfare_request FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 사용자는 본인의 복지 신청만 생성 가능
CREATE POLICY "Users can create own welfare requests"
ON welfare_request FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = welfare_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- 사용자는 본인의 pending 상태 복지 신청만 수정 가능
CREATE POLICY "Users can update own pending welfare requests"
ON welfare_request FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = welfare_request.employee_id
    AND employee.id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = welfare_request.employee_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 복지 신청 수정 가능
CREATE POLICY "Admins can update all welfare requests"
ON welfare_request FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- welfare_approval 테이블 RLS
-- ================================================

ALTER TABLE welfare_approval ENABLE ROW LEVEL SECURITY;

-- 승인자는 자신의 승인 내역 조회 가능
CREATE POLICY "Approvers can view own welfare approvals"
ON welfare_approval FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = welfare_approval.approver_id
    AND employee.id = auth.uid()
  )
);

-- 신청자는 자신의 복지 신청에 대한 승인 내역 조회 가능
CREATE POLICY "Requesters can view their welfare approvals"
ON welfare_approval FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM welfare_request wr
    INNER JOIN employee e ON wr.employee_id = e.id
    WHERE wr.id = welfare_approval.welfare_request_id
    AND e.id = auth.uid()
  )
);

-- Admin은 모든 복지 승인 내역 조회 가능
CREATE POLICY "Admins can view all welfare approvals"
ON welfare_approval FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- Admin만 복지 승인 생성/수정 가능
CREATE POLICY "Admins can manage welfare approvals"
ON welfare_approval FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- ================================================
-- notification 테이블 RLS
-- ================================================

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인에게 온 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
ON notification FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = notification.recipient_id
    AND employee.id = auth.uid()
  )
);

-- 사용자는 본인의 알림만 수정 가능 (읽음 처리)
CREATE POLICY "Users can update own notifications"
ON notification FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = notification.recipient_id
    AND employee.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee
    WHERE employee.id = notification.recipient_id
    AND employee.id = auth.uid()
  )
);

-- Admin은 모든 알림 조회 가능
CREATE POLICY "Admins can view all notifications"
ON notification FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 시스템이 알림 생성 가능
CREATE POLICY "System can create notifications"
ON notification FOR INSERT
WITH CHECK (true);

-- ================================================
-- batch_job_log 테이블 RLS
-- ================================================

ALTER TABLE batch_job_log ENABLE ROW LEVEL SECURITY;

-- Admin만 배치 작업 로그 조회 가능
CREATE POLICY "Admins can view batch job logs"
ON batch_job_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);

-- 시스템이 배치 작업 로그 생성 가능
CREATE POLICY "System can create batch job logs"
ON batch_job_log FOR INSERT
WITH CHECK (true);

-- Admin만 배치 작업 로그 수정 가능
CREATE POLICY "Admins can update batch job logs"
ON batch_job_log FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employee e
    INNER JOIN role r ON e.role_id = r.id
    WHERE e.id = auth.uid()
    AND r.code IN ('admin', 'super_admin')
  )
);
