'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface Department {
  id: number
  name: string
  code: string
  parent_department_id: number | null
  manager_id: string | null
  display_order: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface DepartmentWithStats extends Department {
  full_path: string
  active_member_count: number
  child_count: number
  manager_name: string
  created_by_name: string
  updated_by_name: string
}

export interface DepartmentHistory {
  id: number
  department_id: number
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
}

export interface CreateDepartmentData {
  name: string
  code: string
  parent_department_id: number | null
  manager_id?: string | null
  display_order?: number
}

export interface UpdateDepartmentData {
  name?: string
  code?: string
  parent_department_id?: number | null
  manager_id?: string | null
  display_order?: number
}

export interface ReorderUpdate {
  id: number
  display_order: number
}

// =====================================================
// QUERY ACTIONS
// =====================================================

/**
 * Get all departments with statistics
 */
export async function getDepartments() {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('department_with_stats')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Get departments error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as DepartmentWithStats[] }
  } catch (err) {
    console.error('Get departments exception:', err)
    return { success: false, error: 'Failed to fetch departments' }
  }
}

/**
 * Get department by ID
 */
export async function getDepartmentById(id: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('department_with_stats')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get department error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as DepartmentWithStats }
  } catch (err) {
    console.error('Get department exception:', err)
    return { success: false, error: 'Failed to fetch department' }
  }
}

/**
 * Search departments by name, code, or member name
 */
export async function searchDepartments(query: string) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Search in department names and codes
    const { data: deptData, error: deptError } = await supabase
      .from('department_with_stats')
      .select('*')
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .order('display_order')

    if (deptError) {
      console.error('Search departments error:', deptError)
      return { success: false, error: deptError.message }
    }

    // Also search by member names
    const { data: employeeData, error: employeeError } = await supabase
      .from('employee')
      .select('department_id, name')
      .ilike('name', `%${query}%`)
      .not('deleted_at', 'is', null)

    if (employeeError) {
      console.error('Search employees error:', employeeError)
      return { success: false, error: employeeError.message }
    }

    // Get unique department IDs from employee search
    const deptIdsFromEmployees = [...new Set(employeeData?.map(e => e.department_id) || [])]

    // Combine results
    const allDeptIds = new Set([
      ...deptData.map(d => d.id),
      ...deptIdsFromEmployees
    ])

    // Fetch complete data for all matching departments
    const { data: finalData, error: finalError } = await supabase
      .from('department_with_stats')
      .select('*')
      .in('id', Array.from(allDeptIds))
      .order('display_order')

    if (finalError) {
      console.error('Final search error:', finalError)
      return { success: false, error: finalError.message }
    }

    return { success: true, data: finalData as DepartmentWithStats[] }
  } catch (err) {
    console.error('Search exception:', err)
    return { success: false, error: 'Failed to search departments' }
  }
}

/**
 * Get department members
 */
export async function getDepartmentMembers(departmentId: number) {
  try {
    // 먼저 사용자 인증 확인
    const userSupabase = await createClient()
    const { data: user } = await userSupabase.auth.getUser()
    if (!user.user) {
      console.error('❌ getDepartmentMembers: Unauthorized')
      return { success: false, error: 'Unauthorized' }
    }

    console.log('🔍 getDepartmentMembers: Querying for department ID:', departmentId)
    console.log('👤 getDepartmentMembers: User ID:', user.user.id)

    // 관리 권한이 필요한 쿼리이므로 Admin Client 사용
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('employee')
      .select(`
        id,
        name,
        email,
        status,
        employment_date,
        role:role_id (
          name,
          code,
          level
        )
      `)
      .eq('department_id', departmentId)
      .is('deleted_at', null)
      .order('name')

    console.log('📊 getDepartmentMembers: Query result:', {
      departmentId,
      dataCount: data?.length || 0,
      data,
      error
    })

    if (error) {
      console.error('❌ Get department members error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('❌ Get department members exception:', err)
    return { success: false, error: 'Failed to fetch department members' }
  }
}

/**
 * Get department hierarchy (ancestors and descendants)
 */
export async function getDepartmentHierarchy(departmentId: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get descendants using database function
    const { data: descendants, error: descError } = await supabase
      .rpc('get_department_descendants', { dept_id: departmentId })

    if (descError) {
      console.error('Get descendants error:', descError)
      return { success: false, error: descError.message }
    }

    // Get ancestors by walking up the tree
    const { data: currentDept, error: currentError } = await supabase
      .from('department')
      .select('*')
      .eq('id', departmentId)
      .is('deleted_at', null)
      .single()

    if (currentError) {
      console.error('Get current department error:', currentError)
      return { success: false, error: currentError.message }
    }

    const ancestors = []
    let parentId = currentDept.parent_department_id

    while (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('department')
        .select('*')
        .eq('id', parentId)
        .is('deleted_at', null)
        .single()

      if (parentError || !parent) break

      ancestors.unshift(parent)
      parentId = parent.parent_department_id
    }

    return {
      success: true,
      data: {
        ancestors,
        current: currentDept,
        descendants: descendants || []
      }
    }
  } catch (err) {
    console.error('Get hierarchy exception:', err)
    return { success: false, error: 'Failed to fetch department hierarchy' }
  }
}

/**
 * Get department change history
 */
export async function getDepartmentHistory(departmentId: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('department_history')
      .select(`
        *,
        changed_by_employee:employee!department_history_changed_by_fkey (
          name,
          email
        )
      `)
      .eq('department_id', departmentId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Get department history error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Get department history exception:', err)
    return { success: false, error: 'Failed to fetch department history' }
  }
}

// =====================================================
// CREATE/UPDATE/DELETE ACTIONS
// =====================================================

/**
 * Create new department
 */
export async function createDepartment(data: CreateDepartmentData) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // If display_order not provided, get max order in parent group
    let displayOrder = data.display_order ?? 0
    if (displayOrder === 0) {
      const { data: maxOrder } = await supabase
        .from('department')
        .select('display_order')
        .eq('parent_department_id', data.parent_department_id)
        .is('deleted_at', null)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      displayOrder = maxOrder ? maxOrder.display_order + 1 : 0
    }

    const { data: department, error } = await supabase
      .from('department')
      .insert({
        name: data.name,
        code: data.code,
        parent_department_id: data.parent_department_id,
        manager_id: data.manager_id,
        display_order: displayOrder,
        created_by: user.user.id,
        updated_by: user.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Create department error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/organization-management')
    return { success: true, data: department }
  } catch (err) {
    console.error('Create department exception:', err)
    return { success: false, error: 'Failed to create department' }
  }
}

/**
 * Update department
 */
export async function updateDepartment(id: number, data: UpdateDepartmentData) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { data: department, error } = await supabase
      .from('department')
      .update({
        ...data,
        updated_by: user.user.id
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      console.error('Update department error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/organization-management')
    return { success: true, data: department }
  } catch (err) {
    console.error('Update department exception:', err)
    return { success: false, error: 'Failed to update department' }
  }
}

/**
 * Soft delete department
 */
export async function softDeleteDepartment(id: number, reason?: string) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Validate deletion is allowed (triggers will also check this)
    const validation = await validateDepartmentDeletion(id)
    if (!validation.success) {
      return validation
    }

    const { data: department, error } = await supabase
      .from('department')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.user.id
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      console.error('Soft delete department error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/organization-management')
    return { success: true, data: department }
  } catch (err: any) {
    console.error('Soft delete department exception:', err)
    return { success: false, error: err.message || 'Failed to delete department' }
  }
}

/**
 * Restore soft-deleted department
 */
export async function restoreDepartment(id: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { data: department, error } = await supabase
      .from('department')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_by: user.user.id
      })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select()
      .single()

    if (error) {
      console.error('Restore department error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/organization-management')
    return { success: true, data: department }
  } catch (err) {
    console.error('Restore department exception:', err)
    return { success: false, error: 'Failed to restore department' }
  }
}

// =====================================================
// REORDERING ACTIONS
// =====================================================

/**
 * Reorder departments (batch update display_order)
 */
export async function reorderDepartments(updates: ReorderUpdate[]) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update each department's display_order
    const updatePromises = updates.map(update =>
      supabase
        .from('department')
        .update({
          display_order: update.display_order,
          updated_by: user.user.id
        })
        .eq('id', update.id)
        .is('deleted_at', null)
    )

    const results = await Promise.all(updatePromises)

    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Reorder departments errors:', errors)
      return { success: false, error: 'Failed to reorder some departments' }
    }

    revalidatePath('/admin/organization-management')
    return { success: true }
  } catch (err) {
    console.error('Reorder departments exception:', err)
    return { success: false, error: 'Failed to reorder departments' }
  }
}

/**
 * Move department to new parent
 */
export async function moveDepartmentToParent(id: number, newParentId: number | null) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate permission
    const { data: employee } = await supabase
      .from('employee')
      .select('role:role_id(code, level)')
      .eq('id', user.user.id)
      .single()

    if (!employee?.role || employee.role.level < 3) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Validate move
    const validation = await validateDepartmentMove(id, newParentId)
    if (!validation.success) {
      return validation
    }

    // Get max display_order in new parent group
    const { data: maxOrder } = await supabase
      .from('department')
      .select('display_order')
      .eq('parent_department_id', newParentId)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const newDisplayOrder = maxOrder ? maxOrder.display_order + 1 : 0

    const { data: department, error } = await supabase
      .from('department')
      .update({
        parent_department_id: newParentId,
        display_order: newDisplayOrder,
        updated_by: user.user.id
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      console.error('Move department error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/organization-management')
    return { success: true, data: department }
  } catch (err: any) {
    console.error('Move department exception:', err)
    return { success: false, error: err.message || 'Failed to move department' }
  }
}

// =====================================================
// VALIDATION ACTIONS
// =====================================================

/**
 * Validate if department can be deleted
 */
export async function validateDepartmentDeletion(id: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check for active employees
    const { data: employees, error: empError } = await supabase
      .from('employee')
      .select('id, name')
      .eq('department_id', id)
      .is('deleted_at', null)

    if (empError) {
      console.error('Check employees error:', empError)
      return { success: false, error: empError.message }
    }

    if (employees && employees.length > 0) {
      return {
        success: false,
        error: `부서에 ${employees.length}명의 직원이 있습니다. 먼저 직원을 다른 부서로 이동시켜주세요.`
      }
    }

    // Check for child departments
    const { data: children, error: childError } = await supabase
      .from('department')
      .select('id, name')
      .eq('parent_department_id', id)
      .is('deleted_at', null)

    if (childError) {
      console.error('Check children error:', childError)
      return { success: false, error: childError.message }
    }

    if (children && children.length > 0) {
      return {
        success: false,
        error: `하위 부서가 ${children.length}개 있습니다. 먼저 하위 부서를 삭제하거나 이동시켜주세요.`
      }
    }

    // Check for pending approvals
    const { data: approvals, error: approvalError } = await supabase
      .from('approval_step')
      .select('id')
      .in('status', ['pending', 'in_progress'])
      .in('approver_id',
        supabase
          .from('employee')
          .select('id')
          .eq('department_id', id)
          .is('deleted_at', null)
      )
      .limit(1)

    if (approvalError) {
      console.error('Check approvals error:', approvalError)
      return { success: false, error: approvalError.message }
    }

    if (approvals && approvals.length > 0) {
      return {
        success: false,
        error: '이 부서 소속 직원이 처리 중인 결재가 있습니다. 결재 완료 후 삭제해주세요.'
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Validate deletion exception:', err)
    return { success: false, error: 'Failed to validate deletion' }
  }
}

/**
 * Validate if department can be moved to new parent
 */
export async function validateDepartmentMove(id: number, newParentId: number | null) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Can't move to itself
    if (id === newParentId) {
      return { success: false, error: '부서를 자기 자신의 하위로 이동할 수 없습니다.' }
    }

    // If moving to a parent, check it's not a descendant
    if (newParentId) {
      const { data: descendants, error } = await supabase
        .rpc('get_department_descendants', { dept_id: id })

      if (error) {
        console.error('Get descendants error:', error)
        return { success: false, error: error.message }
      }

      const descendantIds = descendants?.map((d: any) => d.id) || []
      if (descendantIds.includes(newParentId)) {
        return {
          success: false,
          error: '부서를 자신의 하위 부서로 이동할 수 없습니다.'
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Validate move exception:', err)
    return { success: false, error: 'Failed to validate move' }
  }
}

/**
 * Check for pending approvals in department
 */
export async function checkPendingApprovals(departmentId: number) {
  try {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('approval_step')
      .select(`
        id,
        status,
        approval:approval_id (
          id,
          employee:employee_id (
            name,
            email
          )
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .in('approver_id',
        supabase
          .from('employee')
          .select('id')
          .eq('department_id', departmentId)
          .is('deleted_at', null)
      )

    if (error) {
      console.error('Check pending approvals error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [], hasPendingApprovals: data && data.length > 0 }
  } catch (err) {
    console.error('Check pending approvals exception:', err)
    return { success: false, error: 'Failed to check pending approvals' }
  }
}
