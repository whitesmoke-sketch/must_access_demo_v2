'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveLeaveRequest(requestId: number) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 현재 사용자의 pending 상태인 approval_step 찾기
    const { data: myStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order, is_last_step')
      .eq('request_type', 'leave')
      .eq('request_id', requestId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (stepError || !myStep) {
      return { success: false, error: '결재 권한이 없습니다' }
    }

    // approval_step 상태 업데이트
    const { error: updateStepError } = await supabase
      .from('approval_step')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        comment: '승인되었습니다'
      })
      .eq('id', myStep.id)

    if (updateStepError) {
      console.error('Failed to update approval step:', updateStepError)
      return { success: false, error: '승인 처리 중 오류가 발생했습니다' }
    }

    // is_last_step 플래그로 최종 승인자 확인
    const isLastApprover = myStep.is_last_step

    console.log('🔍 Approval check:', {
      requestId,
      myStepOrder: myStep.step_order,
      isLastStep: myStep.is_last_step,
      isLastApprover
    })

    // leave_request 업데이트
    if (isLastApprover) {
      // 최종 승인자인 경우 → 문서 전체를 approved로
      const { error: updateRequestError } = await supabase
        .from('leave_request')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          current_step: null
        })
        .eq('id', requestId)

      if (updateRequestError) {
        console.error('Failed to update leave request:', updateRequestError)
        return { success: false, error: '연차 신청 상태 업데이트 중 오류가 발생했습니다' }
      }

      console.log('✅ Final approval - Document approved!')
    } else {
      // 최종 승인자가 아닌 경우 → current_step만 다음으로 이동
      const { error: updateRequestError } = await supabase
        .from('leave_request')
        .update({
          current_step: myStep.step_order + 1
        })
        .eq('id', requestId)

      if (updateRequestError) {
        console.error('Failed to update leave request:', updateRequestError)
        return { success: false, error: '연차 신청 상태 업데이트 중 오류가 발생했습니다' }
      }

      console.log('➡️ Moving to next step:', myStep.step_order + 1)
    }

    // 페이지 재검증
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Approval error:', error)
    return { success: false, error: '승인 처리 중 오류가 발생했습니다' }
  }
}

export async function rejectLeaveRequest(requestId: number, rejectReason: string) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 현재 사용자의 pending 상태인 approval_step 찾기
    const { data: myStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order')
      .eq('request_type', 'leave')
      .eq('request_id', requestId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (stepError || !myStep) {
      return { success: false, error: '결재 권한이 없습니다' }
    }

    // approval_step 상태 업데이트
    const { error: updateStepError } = await supabase
      .from('approval_step')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString(),
        comment: rejectReason
      })
      .eq('id', myStep.id)

    if (updateStepError) {
      console.error('Failed to update approval step:', updateStepError)
      return { success: false, error: '반려 처리 중 오류가 발생했습니다' }
    }

    // leave_request 상태도 rejected로 업데이트
    const { error: updateRequestError } = await supabase
      .from('leave_request')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason
      })
      .eq('id', requestId)

    if (updateRequestError) {
      console.error('Failed to update leave request:', updateRequestError)
      return { success: false, error: '연차 신청 상태 업데이트 중 오류가 발생했습니다' }
    }

    // 페이지 재검증
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Rejection error:', error)
    return { success: false, error: '반려 처리 중 오류가 발생했습니다' }
  }
}
