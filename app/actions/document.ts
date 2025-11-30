'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createApprovalSteps, ApprovalStepInput, ApprovalType } from './approval'
import { createNotification } from './notification'

interface ApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  approvalType?: ApprovalType  // 'single' | 'agreement'
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
}

interface DocumentSubmissionData {
  employee_id: string
  document_type: string
  title: string
  form_data: Record<string, unknown>
  approval_steps: ApprovalStep[]
  reference_steps: ReferenceStep[]
}

export async function submitDocumentRequest(data: DocumentSubmissionData) {
  try {
    const supabase = await createClient()

    // 연차 신청의 경우 새로운 승인 시스템 사용
    if (['annual_leave', 'half_day', 'reward_leave'].includes(data.document_type)) {
      // 1. leave_request 생성
      const { data: leaveRequest, error: leaveError } = await supabase
        .from('leave_request')
        .insert({
          employee_id: data.employee_id,
          leave_type: data.form_data.leave_type as string,
          requested_days: data.form_data.requested_days as number,
          start_date: data.form_data.start_date as string,
          end_date: data.form_data.end_date as string,
          half_day_slot: data.form_data.half_day_slot as string | undefined,
          reason: data.form_data.reason as string,
          status: 'pending',
          requested_at: new Date().toISOString(),
          current_step: 1,
        })
        .select('id')
        .single()

      if (leaveError) {
        console.error('Leave request creation error:', leaveError)
        return { success: false, error: leaveError.message }
      }

      // 2. 승인 단계 생성 (새로운 approval_step 테이블 사용, 합의 + 참조자 지원)
      const approvalSteps: ApprovalStepInput[] = data.approval_steps.map(step => ({
        approver_id: step.isDelegated && step.delegateId ? step.delegateId : step.approverId,
        step_order: step.order,
        approval_type: step.approvalType || 'single'
      }))

      // 참조자 ID 추출
      const ccEmployeeIds = data.reference_steps.map(ref => ref.memberId)

      const approvalResult = await createApprovalSteps(
        'leave',
        leaveRequest.id,
        approvalSteps,
        ccEmployeeIds
      )

      if (!approvalResult.success) {
        console.error('Approval steps creation error:', approvalResult.error)
        return { success: false, error: approvalResult.error || '승인 단계 생성 실패' }
      }

      // 2-1. 알림 발송: 신청자 이름 조회
      const { data: requester } = await supabase
        .from('employee')
        .select('name')
        .eq('id', data.employee_id)
        .single()
      const requesterName = requester?.name || '알 수 없음'

      // 문서 유형 한글명
      const documentTypeLabels: Record<string, string> = {
        annual_leave: '연차',
        half_day: '반차',
        reward_leave: '포상휴가',
        condolence: '경조사비',
        overtime: '야근수당',
        expense: '지출결의서',
        other: '기타',
      }
      const docTypeLabel = documentTypeLabels[data.document_type] || data.document_type

      // 2-2. 참조자에게 알림 발송
      for (const ref of data.reference_steps) {
        await createNotification({
          recipient_id: ref.memberId,
          type: 'document_cc',
          title: `[참조] ${docTypeLabel} 신청서`,
          message: `${requesterName}님이 ${docTypeLabel} 신청서를 상신했습니다.`,
          metadata: {
            request_type: 'leave',
            request_id: leaveRequest.id,
            requester_id: data.employee_id,
            requester_name: requesterName,
          },
          action_url: `/documents`,
        })
      }

      // 2-3. 1순위 결재/합의자에게 알림 발송
      const firstOrderApprovers = data.approval_steps.filter(step => step.order === 1)
      for (const approver of firstOrderApprovers) {
        const approverId = approver.isDelegated && approver.delegateId ? approver.delegateId : approver.approverId
        await createNotification({
          recipient_id: approverId,
          type: 'approval_request',
          title: `[결재요청] ${docTypeLabel} 신청서`,
          message: `${requesterName}님의 ${docTypeLabel} 신청서가 결재 대기중입니다.`,
          metadata: {
            request_type: 'leave',
            request_id: leaveRequest.id,
            requester_id: data.employee_id,
            requester_name: requesterName,
            step_order: 1,
          },
          action_url: `/documents`,
        })
      }

      // 3. PDF 생성 및 Google Drive 업로드
      let pdfUrl = null
      try {
        const { data: { session } } = await supabase.auth.getSession()

        console.log('[Document Action] 연차 신청 생성 성공, PDF 생성 시작')
        console.log('[Document Action] Leave Request ID:', leaveRequest.id)
        console.log('[Document Action] Provider Token 존재?', !!session?.provider_token)
        console.log('[Document Action] Provider Token 길이:', session?.provider_token?.length || 0)

        if (session?.provider_token) {
          const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
            'generate-leave-pdf',
            {
              body: {
                leaveRequestId: leaveRequest.id,
                accessToken: session.provider_token,
              },
            }
          )

          console.log('[Document Action] Edge Function 응답:', { pdfResult, pdfError })

          if (pdfError) {
            console.error('[Document Action] PDF generation failed:', pdfError)
          } else if (pdfResult) {
            pdfUrl = pdfResult.fileUrl
            console.log('[Document Action] ✅ PDF generated successfully:', pdfUrl)
          }
        } else {
          console.warn('[Document Action] ⚠️ Provider token이 없습니다. 재로그인이 필요합니다.')
        }
      } catch (pdfError) {
        console.error('[Document Action] PDF generation error:', pdfError)
        // PDF 생성 실패해도 신청은 유지
      }

      // 4. 캐시 재검증
      revalidatePath('/request')
      revalidatePath('/leave/my-leave')
      revalidatePath('/dashboard')

      return { success: true, data: leaveRequest, pdfUrl }
    }

    // 다른 문서 타입은 기존 방식 유지 (추후 마이그레이션 필요)
    // 1. 문서 제출 생성
    const { data: submission, error: submissionError } = await supabase
      .from('document_submission')
      .insert({
        template_id: 1, // TODO: 문서 유형별 template_id 매핑 필요
        employee_id: data.employee_id,
        submission_title: data.title,
        form_data: data.form_data,
        original_approval_line: data.approval_steps,
        modified_approval_line: data.approval_steps,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      return { success: false, error: submissionError.message }
    }

    // 2. 결재 인스턴스 생성
    const approvalInstances = data.approval_steps.map((step) => ({
      submission_id: submission.id,
      step_order: step.order,
      approver_id: step.isDelegated ? step.delegateId : step.approverId,
      status: step.order === 1 ? 'pending' : 'waiting',
    }))

    const { error: instanceError } = await supabase
      .from('document_approval_instance')
      .insert(approvalInstances)

    if (instanceError) {
      console.error('Approval instance error:', instanceError)
      return { success: false, error: instanceError.message }
    }

    // 3. 캐시 재검증
    revalidatePath('/request')
    revalidatePath('/dashboard')

    return { success: true, data: submission }
  } catch (error: unknown) {
    console.error('Submit document request error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' }
  }
}
