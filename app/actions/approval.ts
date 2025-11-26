'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ================================================
// Types
// ================================================

export interface ApprovalTemplate {
  id: string
  employee_id: string
  name: string
  request_type: 'leave' | 'document'
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ApprovalTemplateStep {
  id: string
  template_id: string
  approver_id: string
  step_order: number
  approver?: {
    id: string
    name: string
    email: string
    role: {
      name: string
      code: string
      level: number
    }
  }
}

export interface ApprovalStep {
  id: string
  request_type: string
  request_id: number
  approver_id: string
  step_order: number
  status: 'waiting' | 'pending' | 'approved' | 'rejected'
  comment: string | null
  approved_at: string | null
  approver?: {
    id: string
    name: string
    email: string
    role: {
      name: string
      code: string
    }
  }
}

export interface Approver {
  id: string
  name: string
  email: string
  department_id: number
  department: {
    id: number
    name: string
    code: string
    parent_department_id: number | null
  }
  role: {
    id: number
    name: string
    code: string
    level: number
  }
}

// ================================================
// 템플릿 관리
// ================================================

/**
 * 사용자의 결재선 템플릿 목록 조회
 */
export async function getApprovalTemplates(requestType: 'leave' | 'document') {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    const { data, error } = await supabase
      .from('approval_template')
      .select(`
        *,
        approval_template_step (
          *,
          approver:approver_id (
            id,
            name,
            email,
            role:role_id (name, code, level)
          )
        )
      `)
      .eq('employee_id', user.id)
      .eq('request_type', requestType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get templates error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get templates error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 결재선 템플릿 저장
 */
export async function createApprovalTemplate(
  name: string,
  requestType: 'leave' | 'document',
  approvers: string[], // approver_id 배열
  isDefault: boolean = false
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    if (approvers.length === 0) {
      return { success: false, error: '최소 1명의 승인자가 필요합니다' }
    }

    // 기본 템플릿으로 설정하는 경우, 기존 기본 템플릿 해제
    if (isDefault) {
      await supabase
        .from('approval_template')
        .update({ is_default: false })
        .eq('employee_id', user.id)
        .eq('request_type', requestType)
    }

    // 템플릿 생성
    const { data: template, error: templateError } = await supabase
      .from('approval_template')
      .insert({
        employee_id: user.id,
        name,
        request_type: requestType,
        is_default: isDefault,
      })
      .select()
      .single()

    if (templateError) {
      console.error('Create template error:', templateError)
      return { success: false, error: templateError.message }
    }

    // 템플릿 단계 생성
    const steps = approvers.map((approverId, index) => ({
      template_id: template.id,
      approver_id: approverId,
      step_order: index + 1,
    }))

    const { error: stepsError } = await supabase
      .from('approval_template_step')
      .insert(steps)

    if (stepsError) {
      console.error('Create template steps error:', stepsError)
      // 롤백: 템플릿 삭제
      await supabase.from('approval_template').delete().eq('id', template.id)
      return { success: false, error: stepsError.message }
    }

    return { success: true, data: template }
  } catch (error: unknown) {
    console.error('Create template error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 결재선 템플릿 삭제
 */
export async function deleteApprovalTemplate(templateId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('approval_template')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Delete template error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Delete template error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 승인자 조회
// ================================================

/**
 * 선택 가능한 승인자 목록 조회 (본인 팀 팀리더 이상)
 */
export async function getEligibleApprovers() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    // 본인 정보 조회 (RLS 우회를 위해 adminSupabase 사용)
    const { data: currentEmployee } = await adminSupabase
      .from('employee')
      .select('department_id, role:role_id(level)')
      .eq('id', user.id)
      .single()

    if (!currentEmployee) {
      return { success: false, error: '직원 정보를 찾을 수 없습니다', data: [] }
    }

    // 본인의 level 추출
    const currentRole = Array.isArray(currentEmployee.role)
      ? currentEmployee.role[0]
      : currentEmployee.role
    const currentLevel = (currentRole as { level: number })?.level || 0

    // 모든 활성 직원 조회 (본인 제외) - RLS 우회를 위해 adminSupabase 사용
    const { data, error } = await adminSupabase
      .from('employee')
      .select(`
        id,
        name,
        email,
        department_id,
        department:department_id (id, name, code, parent_department_id),
        role:role_id (id, name, code, level)
      `)
      .eq('status', 'active')
      .neq('id', user.id) // 본인 제외

    if (error) {
      console.error('Get eligible approvers error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
    }

    // Map database response to Approver type
    const allApprovers: Approver[] = (data || []).map((emp: {
      id: string
      name: string
      email: string
      department_id: number
      department: unknown
      role: unknown
    }) => ({
      ...emp,
      department: Array.isArray(emp.department) ? emp.department[0] : emp.department,
      role: Array.isArray(emp.role) ? emp.role[0] : emp.role
    }) as Approver)

    // JavaScript로 본인보다 상위 직급만 필터링
    const approvers = allApprovers.filter(
      (approver) => (approver.role?.level || 0) > currentLevel
    )

    // JavaScript로 정렬 (role.level 내림차순, name 오름차순)
    approvers.sort((a, b) => {
      const levelDiff = (b.role?.level || 0) - (a.role?.level || 0)
      if (levelDiff !== 0) return levelDiff
      return (a.name || '').localeCompare(b.name || '')
    })

    return { success: true, data: approvers }
  } catch (error: unknown) {
    console.error('Get eligible approvers error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 자동 결재선 생성 (계층 구조 기반)
 */
export async function generateDefaultApprovers(
  requestType: 'leave' | 'document'
): Promise<{ success: boolean; data?: Approver[]; error?: string }> {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인 정보 조회 (RLS 우회를 위해 adminSupabase 사용)
    const { data: currentEmployee } = await adminSupabase
      .from('employee')
      .select(`
        id,
        name,
        department_id,
        department:department_id (id, name, code, parent_department_id),
        role:role_id (id, name, code, level)
      `)
      .eq('id', user.id)
      .single()

    if (!currentEmployee) {
      return { success: false, error: '직원 정보를 찾을 수 없습니다' }
    }

    const approvers: Approver[] = []
    const currentDeptId = currentEmployee.department_id
    const currentRole = Array.isArray(currentEmployee.role)
      ? currentEmployee.role[0]
      : currentEmployee.role

    // 전체 부서 목록 조회 (RLS 우회를 위해 adminSupabase 사용)
    const { data: allDepartments } = await adminSupabase
      .from('department')
      .select('*')

    if (!allDepartments) {
      return { success: false, error: '부서 정보를 조회할 수 없습니다' }
    }

    // 부서 계층 구조 탐색
    const deptMap = new Map(allDepartments.map(d => [d.id, d]))
    const currentDept = deptMap.get(currentDeptId)

    if (!currentDept) {
      return { success: false, error: '부서 정보를 찾을 수 없습니다' }
    }

    // 1. 현재 부서의 팀리더 찾기 (본인이 일반사원인 경우)
    if (currentRole.level === 1) {
      // 팀리더 role ID 조회 (RLS 우회를 위해 adminSupabase 사용)
      const { data: teamLeaderRole } = await adminSupabase
        .from('role')
        .select('id')
        .eq('level', 2)
        .single()

      if (teamLeaderRole) {
        const { data: teamLeader } = await adminSupabase
          .from('employee')
          .select(`
            id, name, email, department_id,
            department:department_id (id, name, code, parent_department_id),
            role:role_id (id, name, code, level)
          `)
          .eq('department_id', currentDeptId)
          .eq('role_id', teamLeaderRole.id)
          .eq('status', 'active')
          .maybeSingle()

        if (teamLeader && teamLeader.department && teamLeader.role) {
          const dept = Array.isArray(teamLeader.department) ? teamLeader.department[0] : teamLeader.department
          const role = Array.isArray(teamLeader.role) ? teamLeader.role[0] : teamLeader.role
          approvers.push({
            ...teamLeader,
            department: dept,
            role: role
          })
        }
      }
    }

    // 2. 상위 부서 체인을 따라 올라가며 리더 찾기
    let parentDept = currentDept.parent_department_id ? deptMap.get(currentDept.parent_department_id) : null

    // 최대 2단계 상위 부서까지 탐색 (부서장, 본부장)
    for (let i = 0; i < 2; i++) {
      if (parentDept) {
        // 해당 부서에 소속된 모든 직원 조회 (RLS 우회를 위해 adminSupabase 사용)
        const { data: deptEmployees } = await adminSupabase
          .from('employee')
          .select(`
            id, name, email, department_id,
            department:department_id (id, name, code, parent_department_id),
            role:role_id (id, name, code, level)
          `)
          .eq('department_id', parentDept.id)
          .eq('status', 'active')

        if (deptEmployees && deptEmployees.length > 0) {
          // 가장 높은 level을 가진 직원 찾기
          let highestLevelEmployee = deptEmployees[0]

          for (const emp of deptEmployees) {
            const empRole = Array.isArray(emp.role) ? emp.role[0] : emp.role
            const highestRole = Array.isArray(highestLevelEmployee.role)
              ? highestLevelEmployee.role[0]
              : highestLevelEmployee.role

            if (empRole && highestRole && empRole.level > highestRole.level) {
              highestLevelEmployee = emp
            }
          }

          if (highestLevelEmployee.department && highestLevelEmployee.role) {
            const dept = Array.isArray(highestLevelEmployee.department)
              ? highestLevelEmployee.department[0]
              : highestLevelEmployee.department
            const role = Array.isArray(highestLevelEmployee.role)
              ? highestLevelEmployee.role[0]
              : highestLevelEmployee.role

            approvers.push({
              ...highestLevelEmployee,
              department: dept,
              role: role
            })
          }
        }

        // 다음 상위 부서로
        parentDept = parentDept.parent_department_id ? deptMap.get(parentDept.parent_department_id) : null
      }
    }

    // 3. 연차 신청인 경우 HR 추가
    if (requestType === 'leave') {
      // HR role ID 조회 (RLS 우회를 위해 adminSupabase 사용)
      const { data: hrRole } = await adminSupabase
        .from('role')
        .select('id')
        .eq('code', 'hr')
        .single()

      if (hrRole) {
        const { data: hrEmployee } = await adminSupabase
          .from('employee')
          .select(`
            id, name, email, department_id,
            department:department_id (id, name, code, parent_department_id),
            role:role_id (id, name, code, level)
          `)
          .eq('role_id', hrRole.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (hrEmployee && hrEmployee.department && hrEmployee.role) {
          const dept = Array.isArray(hrEmployee.department) ? hrEmployee.department[0] : hrEmployee.department
          const role = Array.isArray(hrEmployee.role) ? hrEmployee.role[0] : hrEmployee.role
          approvers.push({
            ...hrEmployee,
            department: dept,
            role: role
          })
        }
      }
    }

    return { success: true, data: approvers }
  } catch (error: unknown) {
    console.error('Generate default approvers error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 승인 단계 생성 및 처리
// ================================================

/**
 * 신청서에 대한 승인 단계 생성 (Edge Function 사용)
 */
export async function createApprovalSteps(
  requestType: 'leave' | 'document',
  requestId: number,
  approvers: string[] // approver_id 배열
) {
  try {
    const supabase = await createClient()

    if (approvers.length === 0) {
      return { success: false, error: '최소 1명의 승인자가 필요합니다' }
    }

    // Get current user session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // Edge Function 호출
    console.log('ENV NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
    console.log('supabaseUrl:', supabaseUrl)
    // REST API URL에서 /rest/v1 제거 (있는 경우에만)
    const baseUrl = supabaseUrl.replace('/rest/v1', '')
    console.log('baseUrl:', baseUrl)
    const edgeFunctionUrl = `${baseUrl}/functions/v1/create-approval-steps`

    console.log('Edge Function URL:', edgeFunctionUrl)

    const requestBody = {
      requestType,
      requestId,
      approvalSteps: approvers.map((approverId, index) => ({
        order: index + 1,
        approverId,
        approverName: '', // Edge Function에서 채울 필요 없음 (DB에서 관계로 조회 가능)
        approverPosition: '',
      }))
    }

    console.log('Sending to Edge Function:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestBody)
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('Edge Function error:', result.error)
      return { success: false, error: result.error || 'Edge Function 호출 실패' }
    }

    revalidatePath('/leave/my-leave')
    revalidatePath('/leave/approval-inbox')

    return { success: true }
  } catch (error: unknown) {
    console.error('Create approval steps error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 승인 단계 조회
 */
export async function getApprovalSteps(
  requestType: 'leave' | 'document',
  requestId: number
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('approval_step')
      .select(`
        *,
        approver:approver_id (
          id,
          name,
          email,
          role:role_id (name, code)
        )
      `)
      .eq('request_type', requestType)
      .eq('request_id', requestId)
      .order('step_order')

    if (error) {
      console.error('Get approval steps error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get approval steps error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 승인 또는 반려 처리
 */
export async function processApproval(
  stepId: string,
  action: 'approved' | 'rejected',
  comment: string
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    if (!comment || comment.trim() === '') {
      return { success: false, error: '승인/반려 사유를 입력해주세요' }
    }

    // 현재 단계 조회
    const { data: step, error: fetchError } = await supabase
      .from('approval_step')
      .select('*')
      .eq('id', stepId)
      .single()

    if (fetchError || !step) {
      return { success: false, error: '승인 단계를 찾을 수 없습니다' }
    }

    // 권한 확인
    if (step.approver_id !== user.id) {
      return { success: false, error: '승인 권한이 없습니다' }
    }

    if (step.status !== 'pending') {
      return { success: false, error: '현재 승인 차례가 아닙니다' }
    }

    // 승인/반려 처리
    const { error: updateError } = await supabase
      .from('approval_step')
      .update({
        status: action,
        comment: comment.trim(),
        approved_at: new Date().toISOString(),
      })
      .eq('id', stepId)

    if (updateError) {
      console.error('Process approval error:', updateError)
      return { success: false, error: updateError.message }
    }

    // 승인인 경우, 다음 단계를 pending으로 변경
    if (action === 'approved') {
      const { data: nextStep } = await supabase
        .from('approval_step')
        .select('id')
        .eq('request_type', step.request_type)
        .eq('request_id', step.request_id)
        .eq('step_order', step.step_order + 1)
        .single()

      if (nextStep) {
        // 다음 단계가 있으면 pending으로 변경
        await supabase
          .from('approval_step')
          .update({ status: 'pending' })
          .eq('id', nextStep.id)

        // current_step 업데이트
        if (step.request_type === 'leave') {
          await supabase
            .from('leave_request')
            .update({ current_step: step.step_order + 1 })
            .eq('id', step.request_id)
        }
      } else {
        // 마지막 단계였으면 요청 승인 완료
        if (step.request_type === 'leave') {
          // 1. 연차 신청 상태를 'approved'로 변경
          await supabase
            .from('leave_request')
            .update({ status: 'approved', approved_at: new Date().toISOString() })
            .eq('id', step.request_id)

          // 2. 연차 정보 조회
          const { data: leaveRequest, error: leaveError } = await supabase
            .from('leave_request')
            .select('employee_id, requested_days')
            .eq('id', step.request_id)
            .single()

          if (leaveError) {
            console.error('[연차 차감] 연차 정보 조회 실패:', leaveError)
          }

          if (leaveRequest) {
            console.log('[연차 차감] 연차 정보:', leaveRequest)

            // 3. 연차 잔액 차감
            const { data: currentBalance, error: balanceError } = await supabase
              .from('annual_leave_balance')
              .select('used_days, remaining_days')
              .eq('employee_id', leaveRequest.employee_id)
              .single()

            if (balanceError) {
              console.error('[연차 차감] 잔액 조회 실패:', balanceError)
            }

            if (currentBalance) {
              const newUsedDays = Number(currentBalance.used_days) + Number(leaveRequest.requested_days)
              const newRemainingDays = Number(currentBalance.remaining_days) - Number(leaveRequest.requested_days)

              console.log('[연차 차감] 현재:', currentBalance)
              console.log('[연차 차감] 신청일수:', leaveRequest.requested_days)
              console.log('[연차 차감] 새로운 값:', { newUsedDays, newRemainingDays })

              const { error: updateError } = await supabase
                .from('annual_leave_balance')
                .update({
                  used_days: newUsedDays,
                  remaining_days: newRemainingDays,
                  updated_at: new Date().toISOString()
                })
                .eq('employee_id', leaveRequest.employee_id)

              if (updateError) {
                console.error('[연차 차감] 업데이트 실패:', updateError)
              } else {
                console.log('[연차 차감] 성공!')
              }
            }
          }
        }
      }
    } else {
      // 반려인 경우, 요청 상태를 rejected로 변경
      if (step.request_type === 'leave') {
        await supabase
          .from('leave_request')
          .update({ status: 'rejected' })
          .eq('id', step.request_id)
      }
    }

    revalidatePath('/leave/my-leave')
    revalidatePath('/leave/approval-inbox')

    return { success: true }
  } catch (error: unknown) {
    console.error('Process approval error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// =====================================================
// ORGANIZATION SNAPSHOT & VALIDATION FUNCTIONS
// =====================================================

/**
 * Create organization snapshot for approval step
 * Stores the employee's department, role, and hierarchy at approval creation time
 */
export async function createApprovalSnapshotForStep(
  approvalStepId: string,
  employeeId: string
) {
  try {
    const supabase = await createClient()

    // Get employee with department and role info
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .select(`
        id,
        name,
        department_id,
        department:department_id (
          id,
          name,
          manager_id,
          manager:manager_id (
            name
          )
        ),
        role:role_id (
          id,
          name,
          level
        )
      `)
      .eq('id', employeeId)
      .is('deleted_at', null)
      .single()

    if (employeeError || !employee) {
      console.error('Get employee for snapshot error:', employeeError)
      return { success: false, error: 'Failed to get employee info' }
    }

    // Get department path
    const { data: pathData, error: pathError } = await supabase
      .rpc('get_department_path', { dept_id: employee.department_id })

    const departmentPath = pathError ? employee.department.name : pathData

    // Create snapshot
    const { error: snapshotError } = await supabase
      .from('approval_organization_snapshot')
      .insert({
        approval_step_id: approvalStepId,
        employee_id: employee.id,
        employee_name: employee.name,
        department_id: employee.department_id,
        department_name: employee.department.name,
        department_path: departmentPath || employee.department.name,
        role_id: employee.role.id,
        role_name: employee.role.name,
        role_level: employee.role.level,
        manager_id: employee.department.manager_id,
        manager_name: employee.department.manager?.name || null
      })

    if (snapshotError) {
      console.error('Create snapshot error:', snapshotError)
      return { success: false, error: snapshotError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Create approval snapshot exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Validate approval chain
 * Checks if all approvers in the approval steps are still valid
 */
export async function validateApprovalChain(approvalId: string) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get all approval steps
    const { data: steps, error: stepsError } = await supabase
      .from('approval_step')
      .select(`
        id,
        approver_id,
        status,
        step_order,
        approver:approver_id (
          id,
          name,
          status,
          deleted_at,
          department:department_id (
            id,
            name,
            deleted_at
          )
        )
      `)
      .eq('approval_id', approvalId)
      .order('step_order')

    if (stepsError) {
      console.error('Get approval steps error:', stepsError)
      return { success: false, error: stepsError.message }
    }

    const issues = []

    for (const step of steps || []) {
      // Check if approver exists
      if (!step.approver_id) {
        issues.push({
          step_id: step.id,
          step_order: step.step_order,
          issue: 'NO_APPROVER',
          message: '결재자가 지정되지 않았습니다.'
        })
        continue
      }

      const approver = step.approver

      // Check if approver is deleted/inactive
      if (!approver || approver.deleted_at || approver.status !== 'active') {
        issues.push({
          step_id: step.id,
          step_order: step.step_order,
          approver_name: approver?.name || 'Unknown',
          issue: 'INVALID_APPROVER',
          message: '결재자가 비활성화 되었거나 퇴사했습니다.'
        })
      }

      // Check if approver's department is deleted
      if (approver && approver.department && approver.department.deleted_at) {
        issues.push({
          step_id: step.id,
          step_order: step.step_order,
          approver_name: approver.name,
          department_name: approver.department.name,
          issue: 'DELETED_DEPARTMENT',
          message: '결재자의 부서가 삭제되었습니다.'
        })
      }
    }

    return {
      success: true,
      isValid: issues.length === 0,
      issues,
      message: issues.length === 0
        ? '결재선이 유효합니다.'
        : `${issues.length}개의 문제가 발견되었습니다.`
    }
  } catch (error: any) {
    console.error('Validate approval chain exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get approval snapshot
 * Returns the organization structure at the time of approval step creation
 */
export async function getApprovalSnapshot(approvalStepId: string) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized', data: null }
    }

    const { data, error } = await supabase
      .from('approval_organization_snapshot')
      .select('*')
      .eq('approval_step_id', approvalStepId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Get approval snapshot error:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Get approval snapshot exception:', error)
    return { success: false, error: error.message, data: null }
  }
}

/**
 * Bulk validate multiple approval chains
 * Useful for checking multiple pending approvals at once
 */
export async function bulkValidateApprovalChains(approvalIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const results = await Promise.all(
      approvalIds.map(id => validateApprovalChain(id))
    )

    const validCount = results.filter(r => r.success && r.isValid).length
    const invalidCount = results.filter(r => r.success && !r.isValid).length
    const errorCount = results.filter(r => !r.success).length

    return {
      success: true,
      validCount,
      invalidCount,
      errorCount,
      results
    }
  } catch (error: any) {
    console.error('Bulk validate exception:', error)
    return { success: false, error: error.message }
  }
}
