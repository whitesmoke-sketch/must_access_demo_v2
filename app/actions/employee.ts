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
