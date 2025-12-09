'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DocumentType } from '@/types/document'

// ================================================
// 결재 처리 (새 시스템: document_master)
// ================================================

/**
 * 문서 승인 (document_master 기반)
 */
export async function approveDocument(documentId: number, docType?: DocumentType) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 문서 정보 조회
    const { data: document, error: docError } = await supabase
      .from('document_master')
      .select('id, doc_type, status, requester_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    const requestType = docType || document.doc_type

    // 현재 사용자의 pending 상태인 approval_step 찾기
    const { data: myStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order, is_last_step, approval_type')
      .eq('request_type', requestType)
      .eq('request_id', documentId)
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
    const { data: sameStepApprovers, error: sameStepError } = await adminSupabase
      .from('approval_step')
      .select('id, status, is_last_step')
      .eq('request_type', requestType)
      .eq('request_id', documentId)
      .eq('step_order', myStep.step_order)

    if (sameStepError) {
      console.error('Failed to check same step approvers:', sameStepError)
      return { success: false, error: '합의 확인 중 오류가 발생했습니다' }
    }

    const allSameStepApproved = sameStepApprovers?.every(
      step => step.status === 'approved'
    ) ?? false

    console.log('[합의 체크]', {
      documentId,
      stepOrder: myStep.step_order,
      approvers: sameStepApprovers,
      allApproved: allSameStepApproved
    })

    if (!allSameStepApproved) {
      console.log('[합의 대기] 다른 결재자 승인 대기 중')
      return { success: true, message: '승인 완료. 동일 단계의 다른 결재자 승인을 기다리고 있습니다.' }
    }

    const isLastStep = sameStepApprovers?.some(step => step.is_last_step) ?? false
    console.log('[최종 단계 확인]', { isLastStep })

    if (isLastStep) {
      // 최종 승인 → document_master 상태 변경
      const { error: updateDocError } = await supabase
        .from('document_master')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          current_step: null
        })
        .eq('id', documentId)

      if (updateDocError) {
        console.error('Failed to update document:', updateDocError)
        return { success: false, error: '문서 상태 업데이트 중 오류가 발생했습니다' }
      }

      // 휴가 문서인 경우 연차 차감은 트리거에서 자동 처리됨
      // (update_leave_balance_on_approval 트리거)

    } else {
      // 다음 단계 활성화
      const nextStepOrder = myStep.step_order + 1

      const { data: nextStepApprovers, error: nextStepError } = await adminSupabase
        .from('approval_step')
        .select('id')
        .eq('request_type', requestType)
        .eq('request_id', documentId)
        .eq('step_order', nextStepOrder)
        .eq('status', 'waiting')

      if (nextStepError) {
        console.error('Failed to find next step approvers:', nextStepError)
        return { success: false, error: '다음 결재 단계 조회 중 오류가 발생했습니다' }
      }

      if (nextStepApprovers && nextStepApprovers.length > 0) {
        const nextStepIds = nextStepApprovers.map(s => s.id)
        const { error: activateError } = await adminSupabase
          .from('approval_step')
          .update({ status: 'pending' })
          .in('id', nextStepIds)

        if (activateError) {
          console.error('Failed to activate next step approvers:', activateError)
          return { success: false, error: '다음 결재 단계 활성화 중 오류가 발생했습니다' }
        }
      }

      // current_step 업데이트
      const { error: updateDocError } = await adminSupabase
        .from('document_master')
        .update({ current_step: nextStepOrder })
        .eq('id', documentId)

      if (updateDocError) {
        console.error('Failed to update document:', updateDocError)
        return { success: false, error: '문서 상태 업데이트 중 오류가 발생했습니다' }
      }
    }

    revalidatePath('/documents')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Approval error:', error)
    return { success: false, error: '승인 처리 중 오류가 발생했습니다' }
  }
}

/**
 * 문서 반려 (document_master 기반)
 */
export async function rejectDocument(documentId: number, rejectReason: string, docType?: DocumentType) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 문서 정보 조회
    const { data: document, error: docError } = await supabase
      .from('document_master')
      .select('id, doc_type')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    const requestType = docType || document.doc_type

    // 현재 사용자의 pending 상태인 approval_step 찾기
    const { data: myStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order')
      .eq('request_type', requestType)
      .eq('request_id', documentId)
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

    // document_master 상태 업데이트
    const { error: updateDocError } = await supabase
      .from('document_master')
      .update({
        status: 'rejected',
        current_step: null
      })
      .eq('id', documentId)

    if (updateDocError) {
      console.error('Failed to update document:', updateDocError)
      return { success: false, error: '문서 상태 업데이트 중 오류가 발생했습니다' }
    }

    revalidatePath('/documents')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Rejection error:', error)
    return { success: false, error: '반려 처리 중 오류가 발생했습니다' }
  }
}

/**
 * 문서 회수 (document_master 기반)
 */
export async function withdrawDocument(documentId: number, reason?: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: '인증되지 않았습니다' }
  }

  try {
    // 문서 정보 조회
    const { data: document, error: docError } = await supabase
      .from('document_master')
      .select('id, requester_id, status, doc_type')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    if (document.requester_id !== user.id) {
      return { success: false, error: '본인이 작성한 문서만 회수할 수 있습니다' }
    }

    if (document.status !== 'pending') {
      return { success: false, error: '결재 진행 중인 문서만 회수할 수 있습니다' }
    }

    // document_master 상태 업데이트
    const { error: updateError } = await supabase
      .from('document_master')
      .update({
        status: 'retrieved',
        retrieved_at: new Date().toISOString(),
        current_step: null
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to withdraw document:', updateError)
      return { success: false, error: '회수 처리 중 오류가 발생했습니다' }
    }

    // 결재선 상태를 'retrieved'로 변경 (기록 유지)
    await supabase
      .from('approval_step')
      .update({ status: 'retrieved' })
      .eq('request_type', document.doc_type)
      .eq('request_id', documentId)

    // approval_cc 기록은 유지 (삭제하지 않음)

    revalidatePath('/documents')
    revalidatePath('/documents/my-documents')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Withdraw error:', error)
    return { success: false, error: '회수 처리 중 오류가 발생했습니다' }
  }
}

// ================================================
// 기존 함수 호환용 (leave_request 기반 → document_master로 리다이렉트)
// ================================================

/**
 * @deprecated 새 시스템에서는 approveDocument 사용
 */
export async function approveLeaveRequest(requestId: number) {
  return approveDocument(requestId, 'leave')
}

/**
 * @deprecated 새 시스템에서는 rejectDocument 사용
 */
export async function rejectLeaveRequest(requestId: number, rejectReason: string) {
  return rejectDocument(requestId, rejectReason, 'leave')
}

/**
 * @deprecated 새 시스템에서는 withdrawDocument 사용
 */
export async function withdrawLeaveRequest(requestId: number, reason?: string) {
  return withdrawDocument(requestId, reason)
}
