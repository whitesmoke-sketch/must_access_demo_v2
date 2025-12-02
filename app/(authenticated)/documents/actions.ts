'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveLeaveRequest(requestId: number) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 현재 사용자의 pending 상태인 approval_step 찾기
    const { data: myStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order, is_last_step, approval_type')
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

    // 합의(agreement) 로직: 같은 step_order의 모든 결재자가 승인했는지 확인
    // RLS 우회를 위해 adminSupabase 사용
    const { data: sameStepApprovers, error: sameStepError } = await adminSupabase
      .from('approval_step')
      .select('id, status, is_last_step')
      .eq('request_type', 'leave')
      .eq('request_id', requestId)
      .eq('step_order', myStep.step_order)

    if (sameStepError) {
      console.error('Failed to check same step approvers:', sameStepError)
      return { success: false, error: '합의 확인 중 오류가 발생했습니다' }
    }

    // 같은 단계의 모든 결재자가 승인했는지 확인
    const allSameStepApproved = sameStepApprovers?.every(
      step => step.status === 'approved'
    ) ?? false

    console.log('[합의 체크]', {
      requestId,
      stepOrder: myStep.step_order,
      approvers: sameStepApprovers,
      allApproved: allSameStepApproved
    })

    // 같은 단계에 아직 승인하지 않은 결재자가 있으면 대기
    if (!allSameStepApproved) {
      console.log('[합의 대기] 다른 결재자 승인 대기 중')
      return { success: true, message: '승인 완료. 동일 단계의 다른 결재자 승인을 기다리고 있습니다.' }
    }

    // 모든 결재자가 승인함 - is_last_step 플래그로 최종 단계 확인
    // 같은 단계의 결재자 중 하나라도 is_last_step이면 최종 단계
    const isLastStep = sameStepApprovers?.some(step => step.is_last_step) ?? false
    console.log('[최종 단계 확인]', { isLastStep })

    // leave_request 업데이트
    if (isLastStep) {
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

      // 연차 잔액 차감 (직접 DB 업데이트)
      try {
        // 2. 연차 정보 조회
        const { data: leaveRequest, error: leaveError } = await supabase
          .from('leave_request')
          .select('employee_id, requested_days')
          .eq('id', requestId)
          .single()

        if (leaveRequest) {
          // 3. 연차 잔액 차감
          const { data: currentBalance } = await supabase
            .from('annual_leave_balance')
            .select('used_days, remaining_days')
            .eq('employee_id', leaveRequest.employee_id)
            .single()

          if (currentBalance) {
            const newUsedDays = Number(currentBalance.used_days) + Number(leaveRequest.requested_days)
            const newRemainingDays = Number(currentBalance.remaining_days) - Number(leaveRequest.requested_days)

            await supabase
              .from('annual_leave_balance')
              .update({
                used_days: newUsedDays,
                remaining_days: newRemainingDays,
                updated_at: new Date().toISOString()
              })
              .eq('employee_id', leaveRequest.employee_id)
          }
        }
      } catch {
        // 연차 차감 실패해도 승인은 완료된 것으로 처리
      }
    } else {
      // 최종 승인자가 아닌 경우 → 다음 단계의 모든 결재자 활성화
      const nextStepOrder = myStep.step_order + 1

      // 다음 단계의 모든 결재자를 pending으로 변경 (합의 지원)
      const { data: nextStepApprovers, error: nextStepError } = await supabase
        .from('approval_step')
        .select('id')
        .eq('request_type', 'leave')
        .eq('request_id', requestId)
        .eq('step_order', nextStepOrder)
        .eq('status', 'waiting')

      if (nextStepError) {
        console.error('Failed to find next step approvers:', nextStepError)
        return { success: false, error: '다음 결재 단계 조회 중 오류가 발생했습니다' }
      }

      // 다음 단계 결재자들을 pending으로 활성화
      if (nextStepApprovers && nextStepApprovers.length > 0) {
        const nextStepIds = nextStepApprovers.map(s => s.id)
        const { error: activateError } = await supabase
          .from('approval_step')
          .update({ status: 'pending' })
          .in('id', nextStepIds)

        if (activateError) {
          console.error('Failed to activate next step approvers:', activateError)
          return { success: false, error: '다음 결재 단계 활성화 중 오류가 발생했습니다' }
        }
      }

      // current_step 업데이트
      const { error: updateRequestError } = await supabase
        .from('leave_request')
        .update({
          current_step: nextStepOrder
        })
        .eq('id', requestId)

      if (updateRequestError) {
        console.error('Failed to update leave request:', updateRequestError)
        return { success: false, error: '연차 신청 상태 업데이트 중 오류가 발생했습니다' }
      }
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

export async function withdrawLeaveRequest(requestId: number, reason?: string) {
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
        current_step: null,
        retrieved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Failed to withdraw leave request:', updateError)
      return { success: false, error: '회수 처리 중 오류가 발생했습니다' }
    }

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
