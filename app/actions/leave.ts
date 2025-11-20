'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateLeaveRequestParams {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}

export async function createLeaveRequest(params: CreateLeaveRequestParams) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인의 신청만 가능
    if (params.employee_id !== user.id) {
      return { success: false, error: '본인의 신청만 가능합니다' }
    }

    // 연차 신청 생성
    const { data, error } = await supabase
      .from('leave_request')
      .insert({
        employee_id: params.employee_id,
        leave_type: params.leave_type,
        start_date: params.start_date,
        end_date: params.end_date,
        reason: params.reason,
        status: 'pending',
        current_step: 1,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Create leave request error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error: unknown) {
    console.error('Create leave request error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
