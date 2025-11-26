'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * 연차 관리 데이터 조회 (인사과 전용)
 */
export async function getLeaveManagementData() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-leave-management-data`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch leave management data')
  }

  return result.data
}

/**
 * 연차 승인
 */
export async function approveLeaveRequest(leaveRequestId: number) {
  try {
    const supabase = await createClient()

    // getUser()로 인증 확인 후 세션 토큰 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[approveLeaveRequest] User error:', userError)
      throw new Error('Unauthorized')
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.error('[approveLeaveRequest] Session not found')
      throw new Error('Session not found')
    }

    console.log('[approveLeaveRequest] Calling Edge Function with leaveRequestId:', leaveRequestId)

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-leave-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leaveRequestId }),
    })

    const result = await response.json()
    console.log('[approveLeaveRequest] Edge Function response:', result)

    if (!result.success) {
      throw new Error(result.error || 'Failed to approve leave request')
    }

    revalidatePath('/admin/leave-management')
    return result
  } catch (error) {
    console.error('[approveLeaveRequest] Error:', error)
    throw error
  }
}

/**
 * 연차 반려
 */
export async function rejectLeaveRequest(leaveRequestId: number, rejectReason: string) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reject-leave-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ leaveRequestId, rejectReason }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to reject leave request')
  }

  revalidatePath('/admin/leave-management')
  return result
}

/**
 * 포상휴가 부여
 */
export async function grantRewardLeave(employeeId: string, days: number, reason: string) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/grant-reward-leave`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employeeId, days, reason }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to grant reward leave')
  }

  revalidatePath('/admin/leave-management')
  return result
}

/**
 * 연차 수동 추가 부여
 */
export async function addLeaveManual(employeeId: string, days: number, reason: string) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add-leave-manual`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employeeId, days, reason }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to add leave manually')
  }

  revalidatePath('/admin/leave-management')
  return result
}

/**
 * 연차 수동 차감
 */
export async function deductLeaveManual(employeeId: string, days: number, reason: string) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deduct-leave-manual`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employeeId, days, reason }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to deduct leave manually')
  }

  revalidatePath('/admin/leave-management')
  return result
}
