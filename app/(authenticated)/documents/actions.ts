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

      // 연차 잔액 차감 (직접 DB 업데이트)
      try {
        // 2. 연차 정보 조회
        const { data: leaveRequest, error: leaveError } = await supabase
          .from('leave_request')
          .select('employee_id, requested_days')
          .eq('id', requestId)
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
      } catch (error) {
        console.error('[연차 차감] 처리 오류:', error)
      }
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

export async function withdrawLeaveRequest(requestId: number) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 본인이 작성한 문서인지 확인
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_request')
      .select('id, employee_id, status')
      .eq('id', requestId)
      .single()

    if (leaveError || !leaveRequest) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    // 본인 문서인지 확인
    if (leaveRequest.employee_id !== user.id) {
      return { success: false, error: '본인이 작성한 문서만 회수할 수 있습니다' }
    }

    // pending 상태인지 확인
    if (leaveRequest.status !== 'pending') {
      return { success: false, error: '결재 진행 중인 문서만 회수할 수 있습니다' }
    }

    // leave_request 상태를 'retrieved'로 업데이트
    const { error: updateError } = await supabase
      .from('leave_request')
      .update({
        status: 'retrieved',
        current_step: null
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Failed to withdraw leave request:', updateError)
      return { success: false, error: '회수 처리 중 오류가 발생했습니다' }
    }

    console.log('✅ Leave request withdrawn:', requestId)

    // 페이지 재검증
    revalidatePath('/documents')
    revalidatePath('/documents/my-documents')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Withdraw error:', error)
    return { success: false, error: '회수 처리 중 오류가 발생했습니다' }
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
