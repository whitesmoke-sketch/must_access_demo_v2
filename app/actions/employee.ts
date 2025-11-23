'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateEmployeeData {
  email: string
  name: string
  department_id: number
  role_id: number
  employment_date: string
  phone?: string
  location?: string
  annual_leave_days: number
  used_days?: number
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
}

/**
 * 구성원 생성
 * 주의: employee.id는 auth.users(id)를 참조하므로,
 * 먼저 Supabase Auth에서 사용자를 생성해야 합니다.
 */
export async function createEmployee(data: CreateEmployeeData) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Supabase Auth에서 사용자 생성 (임시 비밀번호 자동 생성)
    const temporaryPassword = Math.random().toString(36).slice(-12) + 'Aa1!'

    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: temporaryPassword,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name: data.name,
      },
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return { success: false, error: `사용자 계정 생성 실패: ${authError.message}` }
    }

    if (!authUser.user) {
      return { success: false, error: '사용자 생성 실패' }
    }

    // 2. employee 테이블에 구성원 정보 저장
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .insert({
        id: authUser.user.id, // auth.users에서 생성된 UUID
        name: data.name,
        email: data.email,
        department_id: data.department_id,
        role_id: data.role_id,
        employment_date: data.employment_date,
        phone: data.phone,
        location: data.location,
        status: 'active',
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      // 롤백: auth 사용자 삭제
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: `구성원 정보 저장 실패: ${employeeError.message}` }
    }

    // 3. annual_leave_balance 초기화
    const { error: balanceError } = await supabase
      .from('annual_leave_balance')
      .insert({
        employee_id: employee.id,
        total_days: data.annual_leave_days,
        used_days: data.used_days || 0,
        remaining_days: data.annual_leave_days - (data.used_days || 0),
      })

    if (balanceError) {
      console.error('Balance creation error:', balanceError)
      // 롤백: employee 및 auth 사용자 삭제
      await supabase.from('employee').delete().eq('id', employee.id)
      await adminClient.auth.admin.deleteUser(employee.id)
      return { success: false, error: `연차 잔액 초기화 실패: ${balanceError.message}` }
    }

    revalidatePath('/admin/employees')
    return { success: true, data: employee }
  } catch (error: any) {
    console.error('Create employee error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 구성원 수정
 */
export async function updateEmployee(id: string, data: UpdateEmployeeData) {
  try {
    const supabase = await createClient()

    // 1. 구성원 정보 수정
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

    // 2. 연차 잔액 수정 (upsert 사용)
    const { error: balanceError } = await supabase
      .from('annual_leave_balance')
      .upsert({
        employee_id: id,
        total_days: data.annual_leave_days,
        used_days: data.used_days || 0,
        remaining_days: data.annual_leave_days - (data.used_days || 0),
      })

    if (balanceError) {
      console.error('Balance update error:', balanceError)
      return { success: false, error: balanceError.message }
    }

    revalidatePath('/admin/employees')
    return { success: true }
  } catch (error: any) {
    console.error('Update employee error:', error)
    return { success: false, error: error.message }
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
  } catch (error: any) {
    console.error('Delete employee error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 구성원 목록 조회 (클라이언트에서 사용)
 */
export async function getEmployees() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('employee')
      .select(`
        *,
        department:department_id(id, name, code),
        role:role_id(id, name, code, level),
        annual_leave_balance(
          total_days,
          used_days,
          remaining_days
        )
      `)
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Get employees error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Get employees error:', error)
    return { success: false, error: error.message, data: [] }
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
  } catch (error: any) {
    console.error('Update employee department error:', error)
    return { success: false, error: error.message || '부서 변경 중 오류가 발생했습니다.' }
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
  } catch (error: any) {
    console.error('Bulk update employee department error:', error)
    return { success: false, error: error.message || '일괄 부서 변경 중 오류가 발생했습니다.' }
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
  } catch (error: any) {
    console.error('Get department history error:', error)
    return { success: false, error: error.message, data: [] }
  }
}
