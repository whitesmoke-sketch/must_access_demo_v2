'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createApprovalSteps, ApprovalStepInput, ApprovalType } from './approval'
import { createNotification } from './notification'
import type {
  DocumentType,
  DocumentStatus,
  VisibilityScope,
  DocumentMasterWithRequester,
  CreateLeaveDocumentInput,
  CreateOvertimeDocumentInput,
  CreateExpenseDocumentInput,
  CreateWelfareDocumentInput,
  CreateGeneralDocumentInput,
  DocumentTypeLabels,
} from '@/types/document'

// ================================================
// Types (기존 호환용)
// ================================================

interface ApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  approvalType?: ApprovalType
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

// 기존 호환용 인터페이스
interface DocumentSubmissionData {
  employee_id: string
  document_type: string
  title: string
  form_data: Record<string, unknown>
  approval_steps: ApprovalStep[]
  reference_steps: ReferenceStep[]
  visibility?: VisibilityScope
  is_confidential?: boolean
}

// ================================================
// 문서 유형별 한글 레이블
// ================================================

const docTypeLabels: Record<string, string> = {
  leave: '휴가',
  annual_leave: '연차',
  reward_leave: '포상휴가',
  overtime: '야근수당',
  expense: '지출결의',
  welfare: '경조사비',
  general: '일반문서',
  condolence: '경조사비',
  other: '기타',
}

// ================================================
// 통합 문서 생성 (새 시스템)
// ================================================

/**
 * document_master + 상세 테이블에 문서 생성
 */
export async function createDocument(
  data: DocumentSubmissionData
): Promise<{ success: boolean; data?: { id: number }; error?: string; pdfUrl?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 사용자 정보 조회
    const { data: employee } = await supabase
      .from('employee')
      .select('id, name, department_id')
      .eq('id', user.id)
      .single()

    if (!employee) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다' }
    }

    // 문서 유형 매핑 (기존 -> 새 시스템)
    const docTypeMap: Record<string, DocumentType> = {
      annual_leave: 'leave',
      reward_leave: 'leave',
      leave: 'leave',
      overtime: 'overtime',
      expense: 'expense',
      welfare: 'welfare',
      condolence: 'welfare',
      general: 'general',
      other: 'general',
    }

    const docType = docTypeMap[data.document_type] || 'general'

    // 1. document_master 생성
    const { data: docMaster, error: masterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: data.employee_id,
        department_id: employee.department_id,
        doc_type: docType,
        title: data.title,
        status: 'pending',
        visibility: data.visibility || 'team',
        is_confidential: data.is_confidential || (docType === 'overtime' || docType === 'welfare'),
        current_step: 1,
        summary_data: data.form_data,
      })
      .select('id')
      .single()

    if (masterError) {
      console.error('[Document] Master creation error:', masterError)
      return { success: false, error: masterError.message }
    }

    // 2. 상세 테이블 생성
    const detailResult = await createDocumentDetail(supabase, docMaster.id, docType, data.form_data)
    if (!detailResult.success) {
      // 롤백: master 삭제
      await supabase.from('document_master').delete().eq('id', docMaster.id)
      return { success: false, error: detailResult.error }
    }

    // 3. 결재선 생성
    const approvalSteps: ApprovalStepInput[] = data.approval_steps.map(step => ({
      approver_id: step.isDelegated && step.delegateId ? step.delegateId : step.approverId,
      step_order: step.order,
      approval_type: step.approvalType || 'single'
    }))

    const ccEmployeeIds = data.reference_steps.map(ref => ref.memberId)

    const approvalResult = await createApprovalSteps(
      docType, // 새 시스템: document_type 사용
      docMaster.id,
      approvalSteps,
      ccEmployeeIds
    )

    if (!approvalResult.success) {
      console.error('[Document] Approval steps creation error:', approvalResult.error)
      return { success: false, error: approvalResult.error || '결재선 생성 실패' }
    }

    // 4. 알림 발송
    const docTypeLabel = docTypeLabels[data.document_type] || data.document_type

    // 참조자 알림
    for (const ref of data.reference_steps) {
      await createNotification({
        recipient_id: ref.memberId,
        type: 'document_cc',
        title: `[참조] ${docTypeLabel} 신청서`,
        message: `${employee.name}님이 ${docTypeLabel} 신청서를 상신했습니다.`,
        metadata: {
          request_type: docType,
          request_id: docMaster.id,
          requester_id: data.employee_id,
          requester_name: employee.name,
        },
        action_url: `/documents`,
      })
    }

    // 1순위 결재자 알림
    const firstOrderApprovers = data.approval_steps.filter(step => step.order === 1)
    for (const approver of firstOrderApprovers) {
      const approverId = approver.isDelegated && approver.delegateId ? approver.delegateId : approver.approverId
      await createNotification({
        recipient_id: approverId,
        type: 'approval_request',
        title: `[결재요청] ${docTypeLabel} 신청서`,
        message: `${employee.name}님의 ${docTypeLabel} 신청서가 결재 대기중입니다.`,
        metadata: {
          request_type: docType,
          request_id: docMaster.id,
          requester_id: data.employee_id,
          requester_name: employee.name,
          step_order: 1,
        },
        action_url: `/documents`,
      })
    }

    // 5. PDF 생성 (휴가 문서인 경우)
    let pdfUrl = null
    if (docType === 'leave') {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
            'generate-leave-pdf',
            {
              body: {
                documentId: docMaster.id, // 새 시스템: document_master.id
                accessToken: session.provider_token,
              },
            }
          )

          if (!pdfError && pdfResult?.fileUrl) {
            pdfUrl = pdfResult.fileUrl
            console.log('[Document] PDF generated:', pdfUrl)
          }
        }
      } catch (pdfError) {
        console.error('[Document] PDF generation error:', pdfError)
      }
    }

    // 6. 캐시 재검증
    revalidatePath('/request')
    revalidatePath('/leave/my-leave')
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { success: true, data: docMaster, pdfUrl }
  } catch (error: unknown) {
    console.error('[Document] Create error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

/**
 * 문서 유형별 상세 테이블 생성
 */
async function createDocumentDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: number,
  docType: DocumentType,
  formData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (docType) {
      case 'leave': {
        const { error } = await supabase.from('doc_leave').insert({
          document_id: documentId,
          leave_type: formData.leave_type as string,
          start_date: formData.start_date as string,
          end_date: formData.end_date as string,
          days_count: formData.requested_days as number || formData.days_count as number,
          half_day_slot: formData.half_day_slot as string || null,
          reason: formData.reason as string || null,
          attachment_url: formData.attachment_url as string || null,
        })
        if (error) return { success: false, error: error.message }
        break
      }

      case 'overtime': {
        const { error } = await supabase.from('doc_overtime').insert({
          document_id: documentId,
          work_date: formData.work_date as string,
          start_time: formData.start_time as string,
          end_time: formData.end_time as string,
          total_hours: formData.total_hours as number,
          work_content: formData.work_content as string,
          transportation_fee: formData.transportation_fee as number || 0,
        })
        if (error) return { success: false, error: error.message }
        break
      }

      case 'expense': {
        const { error } = await supabase.from('doc_expense').insert({
          document_id: documentId,
          expense_date: formData.expense_date as string,
          category: formData.category as string,
          amount: formData.amount as number,
          merchant_name: formData.merchant_name as string || null,
          usage_purpose: formData.usage_purpose as string || null,
          receipt_url: formData.receipt_url as string || null,
          expense_items: formData.expense_items || [],
        })
        if (error) return { success: false, error: error.message }
        break
      }

      case 'welfare': {
        const { error } = await supabase.from('doc_welfare').insert({
          document_id: documentId,
          event_type: formData.event_type as string,
          event_date: formData.event_date as string,
          target_name: formData.target_name as string || null,
          relationship: formData.relationship as string || null,
          amount: formData.amount as number,
          attachment_url: formData.attachment_url as string || null,
        })
        if (error) return { success: false, error: error.message }
        break
      }

      case 'general':
      default: {
        const { error } = await supabase.from('doc_general').insert({
          document_id: documentId,
          content_body: formData.content_body as string || formData.reason as string || '',
          attachment_urls: formData.attachment_urls || [],
          template_type: formData.template_type as string || null,
          form_data: formData,
        })
        if (error) return { success: false, error: error.message }
        break
      }
    }

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 기존 함수 호환 (submitDocumentRequest -> createDocument)
// ================================================

export async function submitDocumentRequest(data: DocumentSubmissionData) {
  return createDocument(data)
}

// ================================================
// 문서 조회
// ================================================

/**
 * 문서 목록 조회 (결재 대기/완료 등)
 */
export async function getDocuments(options?: {
  status?: DocumentStatus | DocumentStatus[]
  docType?: DocumentType
  requesterId?: string
  page?: number
  perPage?: number
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    const page = options?.page || 1
    const perPage = options?.perPage || 20
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase
      .from('document_master')
      .select(`
        *,
        requester:requester_id (
          id,
          name,
          email,
          department:department_id (id, name, code),
          role:role_id (id, name, code, level)
        ),
        doc_leave (*),
        doc_overtime (*),
        doc_expense (*),
        doc_welfare (*),
        doc_general (*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    // 필터 적용
    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    if (options?.docType) {
      query = query.eq('doc_type', options.docType)
    }

    if (options?.requesterId) {
      query = query.eq('requester_id', options.requesterId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Document] Get documents error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return {
      success: true,
      data: data || [],
      total: count || 0,
      page,
      perPage,
    }
  } catch (error: unknown) {
    console.error('[Document] Get documents error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 단일 문서 상세 조회
 */
export async function getDocument(documentId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const { data, error } = await supabase
      .from('document_master')
      .select(`
        *,
        requester:requester_id (
          id,
          name,
          email,
          department:department_id (id, name, code),
          role:role_id (id, name, code, level)
        ),
        doc_leave (*),
        doc_overtime (*),
        doc_expense (*),
        doc_welfare (*),
        doc_general (*)
      `)
      .eq('id', documentId)
      .single()

    if (error) {
      console.error('[Document] Get document error:', error)
      return { success: false, error: error.message }
    }

    // 접근 로그 기록
    await supabase.from('document_access_log').insert({
      document_id: documentId,
      viewer_id: user.id,
      action_type: 'view',
    })

    return { success: true, data }
  } catch (error: unknown) {
    console.error('[Document] Get document error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 내가 결재해야 할 문서 목록
 */
export async function getPendingApprovalsForMe() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    // 내가 pending 상태인 결재 단계 조회
    const { data: pendingSteps, error: stepsError } = await supabase
      .from('approval_step')
      .select('request_type, request_id')
      .eq('approver_id', user.id)
      .eq('status', 'pending')

    if (stepsError) {
      return { success: false, error: stepsError.message, data: [] }
    }

    if (!pendingSteps || pendingSteps.length === 0) {
      return { success: true, data: [] }
    }

    // 해당 문서들 조회
    const documentIds = pendingSteps.map(s => s.request_id)

    const { data: documents, error: docsError } = await supabase
      .from('document_master')
      .select(`
        *,
        requester:requester_id (
          id,
          name,
          email,
          department:department_id (id, name, code),
          role:role_id (id, name, code, level)
        ),
        doc_leave (*),
        doc_overtime (*),
        doc_expense (*),
        doc_welfare (*),
        doc_general (*)
      `)
      .in('id', documentIds)
      .order('created_at', { ascending: false })

    if (docsError) {
      return { success: false, error: docsError.message, data: [] }
    }

    return { success: true, data: documents || [] }
  } catch (error: unknown) {
    console.error('[Document] Get pending approvals error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 내가 작성한 문서 목록
 */
export async function getMyDocuments(options?: {
  status?: DocumentStatus | DocumentStatus[]
  docType?: DocumentType
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    return getDocuments({
      ...options,
      requesterId: user.id,
    })
  } catch (error: unknown) {
    console.error('[Document] Get my documents error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// ================================================
// 문서 상태 변경
// ================================================

/**
 * 문서 회수
 */
export async function retrieveDocument(documentId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인 문서인지, pending 상태인지 확인
    const { data: doc, error: docError } = await supabase
      .from('document_master')
      .select('id, requester_id, status')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    if (doc.requester_id !== user.id) {
      return { success: false, error: '본인의 문서만 회수할 수 있습니다' }
    }

    if (doc.status !== 'pending') {
      return { success: false, error: '결재 대기 중인 문서만 회수할 수 있습니다' }
    }

    // 상태 변경
    const { error: updateError } = await supabase
      .from('document_master')
      .update({
        status: 'retrieved',
        retrieved_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // 결재선 삭제
    await supabase
      .from('approval_step')
      .delete()
      .eq('request_id', documentId)

    await supabase
      .from('approval_cc')
      .delete()
      .eq('request_id', documentId)

    revalidatePath('/documents')
    revalidatePath('/leave/my-leave')

    return { success: true }
  } catch (error: unknown) {
    console.error('[Document] Retrieve error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 임시저장 문서 삭제
 */
export async function deleteDraftDocument(documentId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const { error } = await supabase
      .from('document_master')
      .delete()
      .eq('id', documentId)
      .eq('requester_id', user.id)
      .eq('status', 'draft')

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/documents')

    return { success: true }
  } catch (error: unknown) {
    console.error('[Document] Delete draft error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 임시저장
 */
export async function saveDraft(data: DocumentSubmissionData) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const { data: employee } = await supabase
      .from('employee')
      .select('department_id')
      .eq('id', user.id)
      .single()

    if (!employee) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다' }
    }

    const docTypeMap: Record<string, DocumentType> = {
      annual_leave: 'leave',
      reward_leave: 'leave',
      leave: 'leave',
      overtime: 'overtime',
      expense: 'expense',
      welfare: 'welfare',
      condolence: 'welfare',
      general: 'general',
      other: 'general',
    }

    const docType = docTypeMap[data.document_type] || 'general'

    // document_master 생성 (draft 상태)
    const { data: docMaster, error: masterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: data.employee_id,
        department_id: employee.department_id,
        doc_type: docType,
        title: data.title || '임시저장',
        status: 'draft',
        visibility: data.visibility || 'private',
        is_confidential: data.is_confidential || false,
        current_step: 0,
        summary_data: data.form_data,
      })
      .select('id')
      .single()

    if (masterError) {
      return { success: false, error: masterError.message }
    }

    // 상세 테이블 생성
    await createDocumentDetail(supabase, docMaster.id, docType, data.form_data)

    revalidatePath('/documents')

    return { success: true, data: docMaster }
  } catch (error: unknown) {
    console.error('[Document] Save draft error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
