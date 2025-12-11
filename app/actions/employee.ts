'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 직원 소속 정보 (주 소속 + 추가 소속)
export interface EmployeePosition {
  department_id: number
  department_name: string
  role_id: number
  role_name: string
  is_primary: boolean  // true = 주 소속, false = 추가 소속
}

// 추가 소속 정보 (겸직)
export interface AdditionalPosition {
  department_id: number
  role_id: number
}

export interface CreateEmployeeData {
  email: string
  name: string
  department_id: number
  role_id: number
  employment_date: string
  phone?: string
  location?: string
  note?: string
  additional_positions?: AdditionalPosition[]  // 추가 소속 (겸직)
}

export interface UpdateEmployeeData {
  name: string
  department_id: number
  role_id: number
  employment_date: string
  phone?: string
  location?: string
  annual_leave_days: number
  used_days?: number
  additional_positions?: AdditionalPosition[]  // 추가 소속 (겸직)
}

/**
 * 구성원 초대 (invited_employees에 등록)
 * 실제 계정 생성은 사용자가 구글 로그인 시 자동으로 처리됩니다.
 */
export async function createEmployee(data: CreateEmployeeData) {
  try {
    const supabase = await createClient()

    // 현재 로그인한 사용자 확인 (invited_by 필드용)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증되지 않은 사용자입니다.' }
    }

    // 1. 이메일 중복 확인 (invited_employees)
    const { data: existingInvitation } = await supabase
      .from('invited_employees')
      .select('id, status')
      .eq('email', data.email)
      .single()

    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        return { success: false, error: '이미 초대된 이메일입니다.' }
      } else if (existingInvitation.status === 'registered') {
        return { success: false, error: '이미 등록된 이메일입니다.' }
      }
    }

    // 2. 이메일 중복 확인 (employee)
    const { data: existingEmployee } = await supabase
      .from('employee')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingEmployee) {
      return { success: false, error: '이미 등록된 이메일입니다.' }
    }

    // 3. invited_employees 테이블에 초대 정보 저장
    const { data: invitation, error: invitationError } = await supabase
      .from('invited_employees')
      .insert({
        email: data.email,
        name: data.name,
        department_id: data.department_id,
        role_id: data.role_id,
        employment_date: data.employment_date,
        phone: data.phone,
        location: data.location,
        note: data.note,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      return { success: false, error: `초대 정보 저장 실패: ${invitationError.message}` }
    }

    revalidatePath('/admin/employees')
    return {
      success: true,
      data: invitation,
      message: '구성원 초대가 완료되었습니다. 해당 이메일로 구글 로그인 시 자동으로 가입됩니다.'
    }
  } catch (error: unknown) {
    console.error('Create employee error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 구성원 수정
 */
export async function updateEmployee(id: string, data: UpdateEmployeeData) {
  try {
    const supabase = await createClient()

    // 1. 구성원 정보 수정 (주 소속)
    const { error: employeeError } = await supabase
      .from('employee')
      .update({
        name: data.name,
        department_id: data.department_id,
        role_id: data.role_id,
        employment_date: data.employment_date,
        phone: data.phone,
        location: data.location,
      })
      .eq('id', id)

    if (employeeError) {
      console.error('Employee update error:', employeeError)
      return { success: false, error: employeeError.message }
    }

    // 2. 기존 추가 소속 모두 삭제
    const { error: deleteError } = await supabase
      .from('employee_additional_positions')
      .delete()
      .eq('employee_id', id)

    if (deleteError) {
      console.error('Delete additional positions error:', deleteError)
      // 주 소속은 이미 업데이트되었으므로 계속 진행
    }

    // 3. 새 추가 소속 삽입
    if (data.additional_positions && data.additional_positions.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()

      const additionalRecords = data.additional_positions.map((pos) => ({
        employee_id: id,
        department_id: pos.department_id,
        role_id: pos.role_id,
        assigned_by: user?.id || null,
      }))

      const { error: insertError } = await supabase
        .from('employee_additional_positions')
        .insert(additionalRecords)

      if (insertError) {
        console.error('Insert additional positions error:', insertError)
        // 주 소속은 성공했으므로 경고만 표시
        return {
          success: true,
          warning: '주 소속은 수정되었으나 추가 소속 저장에 실패했습니다.',
        }
      }
    }

    revalidatePath('/admin/employees')
    return { success: true }
  } catch (error: unknown) {
    console.error('Update employee error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 구성원 삭제 (Soft Delete)
 */
export async function deleteEmployee(id: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('employee')
      .update({ status: 'inactive', deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Employee delete error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/employees')
    return { success: true }
  } catch (error: unknown) {
    console.error('Delete employee error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 구성원 목록 조회 (클라이언트에서 사용)
 */
export async function getEmployees() {
  try {
    // 인증 확인
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    // Admin Client 사용하여 모든 데이터 조회
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('employee')
      .select(`
        *,
        department:department_id(id, name, code),
        role:role_id(id, name, code, level)
      `)
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Get employees error:', error)
      return { success: false, error: error.message, data: [] }
    }

    // 모든 직원의 연차 계산
    const employeeIds = data?.map(emp => emp.id) || []

    // 추가 소속(겸직) 조회
    const { data: additionalPositions } = await adminSupabase
      .from('employee_additional_positions')
      .select(`
        employee_id,
        department_id,
        role_id,
        department:department_id(id, name, code),
        role:role_id(id, name, code, level)
      `)
      .in('employee_id', employeeIds)

    // 모든 grant 조회 (연차 + 포상휴가)
    const { data: allGrants } = await adminSupabase
      .from('annual_leave_grant')
      .select('employee_id, grant_type, granted_days, id')
      .eq('approval_status', 'approved')
      .gte('expiration_date', new Date().toISOString().split('T')[0])
      .in('employee_id', employeeIds)

    // 모든 사용 내역 조회
    const grantIds = allGrants?.map(g => g.id) || []
    const { data: allUsage } = await adminSupabase
      .from('annual_leave_usage')
      .select('grant_id, used_days')
      .in('grant_id', grantIds)

    // 각 직원별 연차 및 포상휴가 잔여일수 계산
    const annualBalanceMap = new Map<string, { total: number; remaining: number }>()
    const awardBalanceMap = new Map<string, number>()

    allGrants?.forEach(grant => {
      const usedDays = allUsage
        ?.filter(u => u.grant_id === grant.id)
        .reduce((sum, u) => sum + Number(u.used_days), 0) || 0

      const remaining = Number(grant.granted_days) - usedDays

      if (grant.grant_type === 'award_overtime' || grant.grant_type === 'award_attendance') {
        // 포상휴가
        const currentBalance = awardBalanceMap.get(grant.employee_id) || 0
        awardBalanceMap.set(grant.employee_id, currentBalance + remaining)
      } else {
        // 일반 연차 (monthly, proportional, annual)
        const current = annualBalanceMap.get(grant.employee_id) || { total: 0, remaining: 0 }
        annualBalanceMap.set(grant.employee_id, {
          total: current.total + Number(grant.granted_days),
          remaining: current.remaining + remaining
        })
      }
    })

    // 직원 데이터에 연차 및 포상휴가 잔여일수 + 전체 소속 추가
    const enrichedData = data?.map(emp => {
      const annualBalance = annualBalanceMap.get(emp.id) || { total: 0, remaining: 0 }
      const awardBalance = awardBalanceMap.get(emp.id) || 0

      // 추가 소속 필터링
      const additional = additionalPositions?.filter(p => p.employee_id === emp.id) || []

      // 전체 소속 목록 (주 소속 + 추가 소속)
      const all_positions: EmployeePosition[] = [
        // 주 소속 (항상 첫 번째)
        {
          department_id: emp.department_id,
          department_name: emp.department?.name || '',
          role_id: emp.role_id,
          role_name: emp.role?.name || '',
          is_primary: true
        },
        // 추가 소속들
        ...additional.map(pos => ({
          department_id: pos.department_id,
          department_name: pos.department?.name || '',
          role_id: pos.role_id,
          role_name: pos.role?.name || '',
          is_primary: false
        }))
      ]

      return {
        ...emp,
        annual_leave_balance: [{
          total_days: annualBalance.total,
          used_days: annualBalance.total - annualBalance.remaining,
          remaining_days: annualBalance.remaining
        }],
        award_leave_balance: awardBalance,
        all_positions  // 전체 소속 목록 추가
      }
    })

    return { success: true, data: enrichedData || [] }
  } catch (error: unknown) {
    console.error('Get employees error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 직원 부서 이동 (이력 기록 포함)
 * 부서 변경 시 자동으로 employee_department_history에 기록
 */
export async function updateEmployeeDepartment(
  employeeId: string,
  newDepartmentId: number,
  reason?: string
) {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 권한 확인 (level 3 이상만 부서 이동 가능)
    const { data: currentUser } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!currentUser?.role || currentUser.role.level < 3) {
      return { success: false, error: '권한이 없습니다.' }
    }

    // 현재 부서 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .select('department_id, name')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      console.error('Get employee error:', employeeError)
      return { success: false, error: '직원 정보를 찾을 수 없습니다.' }
    }

    const oldDepartmentId = employee.department_id

    // 같은 부서로 이동하는 경우 무시
    if (oldDepartmentId === newDepartmentId) {
      return { success: true, message: '이미 해당 부서에 소속되어 있습니다.' }
    }

    // 새 부서가 존재하고 활성 상태인지 확인
    const { data: newDept, error: deptError } = await supabase
      .from('department')
      .select('id, name')
      .eq('id', newDepartmentId)
      .is('deleted_at', null)
      .single()

    if (deptError || !newDept) {
      console.error('Get department error:', deptError)
      return { success: false, error: '대상 부서를 찾을 수 없거나 삭제된 부서입니다.' }
    }

    // 진행 중인 결재가 있는지 확인
    const { data: pendingApprovals, error: approvalError } = await supabase
      .from('approval_step')
      .select('id, approval_id')
      .eq('approver_id', employeeId)
      .in('status', ['pending', 'in_progress'])
      .limit(1)

    if (approvalError) {
      console.error('Check approvals error:', approvalError)
    }

    if (pendingApprovals && pendingApprovals.length > 0) {
      return {
        success: false,
        error: `${employee.name}님이 처리 중인 결재가 있습니다. 결재 완료 후 부서를 이동해주세요.`,
        hasPendingApprovals: true
      }
    }

    // 1. 직원 부서 변경
    const { error: updateError } = await supabase
      .from('employee')
      .update({ department_id: newDepartmentId })
      .eq('id', employeeId)

    if (updateError) {
      console.error('Update employee department error:', updateError)
      return { success: false, error: '부서 변경에 실패했습니다.' }
    }

    // 2. 이력 기록
    const { error: historyError } = await supabase
      .from('employee_department_history')
      .insert({
        employee_id: employeeId,
        old_department_id: oldDepartmentId,
        new_department_id: newDepartmentId,
        reason: reason || '부서 이동',
        changed_by: user.user.id
      })

    if (historyError) {
      console.error('Insert department history error:', historyError)
      // 이력 기록 실패해도 부서 변경은 성공으로 처리
    }

    revalidatePath('/admin/employees')
    revalidatePath('/admin/organization-management')

    return {
      success: true,
      message: `${employee.name}님이 ${newDept.name}(으)로 이동되었습니다.`
    }
  } catch (error: unknown) {
    console.error('Update employee department error:', error)
    return { success: false, error: error instanceof Error ? error.message : '부서 변경 중 오류가 발생했습니다.' }
  }
}

/**
 * 여러 직원의 부서 일괄 이동 (이력 기록 포함)
 */
export async function bulkUpdateEmployeeDepartment(
  employeeIds: string[],
  newDepartmentId: number,
  reason?: string
) {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 권한 확인
    const { data: currentUser } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!currentUser?.role || currentUser.role.level < 3) {
      return { success: false, error: '권한이 없습니다.' }
    }

    // 새 부서 확인
    const { data: newDept, error: deptError } = await supabase
      .from('department')
      .select('id, name')
      .eq('id', newDepartmentId)
      .is('deleted_at', null)
      .single()

    if (deptError || !newDept) {
      return { success: false, error: '대상 부서를 찾을 수 없거나 삭제된 부서입니다.' }
    }

    // 각 직원별로 처리
    const results = await Promise.all(
      employeeIds.map(employeeId =>
        updateEmployeeDepartment(employeeId, newDepartmentId, reason)
      )
    )

    // 결과 집계
    const successCount = results.filter(r => r.success).length
    const failedCount = results.length - successCount
    const failedEmployees = results
      .filter(r => !r.success)
      .map(r => r.error)

    if (failedCount === 0) {
      return {
        success: true,
        message: `${successCount}명의 직원이 ${newDept.name}(으)로 이동되었습니다.`
      }
    } else if (successCount === 0) {
      return {
        success: false,
        error: '모든 직원의 부서 이동에 실패했습니다.',
        details: failedEmployees
      }
    } else {
      return {
        success: true,
        message: `${successCount}명 이동 완료, ${failedCount}명 실패`,
        details: failedEmployees
      }
    }
  } catch (error: unknown) {
    console.error('Bulk update employee department error:', error)
    return { success: false, error: error instanceof Error ? error.message : '일괄 부서 변경 중 오류가 발생했습니다.' }
  }
}

/**
 * 직원의 부서 변경 이력 조회
 */
export async function getEmployeeDepartmentHistory(employeeId: string) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    const { data, error } = await supabase
      .from('employee_department_history')
      .select(`
        *,
        old_department:old_department_id(id, name, code),
        new_department:new_department_id(id, name, code),
        changed_by_employee:employee!employee_department_history_changed_by_fkey(
          name,
          email
        )
      `)
      .eq('employee_id', employeeId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Get department history error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('Get department history error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}
