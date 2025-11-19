'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
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

    // 3. 연차 신청인 경우 leave_request 테이블에도 저장
    if (['annual_leave', 'half_day', 'reward_leave'].includes(data.document_type)) {
      const { error: leaveError } = await supabase
        .from('leave_request')
        .insert({
          employee_id: data.employee_id,
          leave_type: data.form_data.leave_type,
          requested_days: data.form_data.requested_days,
          start_date: data.form_data.start_date,
          end_date: data.form_data.end_date,
          half_day_slot: data.form_data.half_day_slot,
          reason: data.form_data.reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
          document_submission_id: submission.id,
        })

      if (leaveError) {
        console.error('Leave request creation error:', leaveError)
        // 연차 요청 생성 실패는 에러로 처리하지 않고 로그만 기록
      }
    }

    // 4. 캐시 재검증
    revalidatePath('/request')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true, data: submission }
  } catch (error: unknown) {
    console.error('Submit document request error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' }
  }
}
