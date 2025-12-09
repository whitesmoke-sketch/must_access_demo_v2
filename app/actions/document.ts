'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
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
  DocDataUnion,
  DocLeaveData,
  DocOvertimeData,
  DocExpenseData,
  DocWelfareData,
  DocGeneralData,
  DocBudgetData,
  DocExpenseProposalData,
  DocResignationData,
  DocOvertimeReportData,
  DocWorkTypeChangeData,
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
  budget: '예산 신청',
  expense_proposal: '지출 품의',
  resignation: '사직서',
  overtime_report: '연장 근로 보고',
  work_type_change: '근로형태 변경',
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
      budget: 'budget',
      expense_proposal: 'expense_proposal',
      resignation: 'resignation',
      overtime_report: 'overtime_report',
      work_type_change: 'work_type_change',
      other: 'general',
    }

    const docType = docTypeMap[data.document_type] || 'general'

    // doc_data 구성 (문서 유형별)
    const docData = buildDocData(docType, data.form_data)

    // 1. document_master 생성 (doc_data 포함 - 단일 INSERT)
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
        doc_data: docData,  // JSONB로 직접 저장
      })
      .select('id')
      .single()

    if (masterError) {
      console.error('[Document] Master creation error:', masterError)
      return { success: false, error: masterError.message }
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
 * 문서 유형별 doc_data 빌더
 * JSONB로 저장할 상세 데이터를 구성
 */
function buildDocData(
  docType: DocumentType,
  formData: Record<string, unknown>
): DocDataUnion {
  switch (docType) {
    case 'leave':
      return {
        leave_type: formData.leave_type as string,
        start_date: formData.start_date as string,
        end_date: formData.end_date as string,
        days_count: (formData.requested_days as number) || (formData.days_count as number),
        half_day_slot: (formData.half_day_slot as string) || null,
        reason: (formData.reason as string) || null,
        attachment_url: (formData.attachment_url as string) || null,
        deducted_from_grants: [],
      } as DocLeaveData

    case 'overtime':
      return {
        work_date: formData.work_date as string,
        start_time: formData.start_time as string,
        end_time: formData.end_time as string,
        total_hours: formData.total_hours as number,
        work_content: formData.work_content as string,
        transportation_fee: (formData.transportation_fee as number) || 0,
      } as DocOvertimeData

    case 'expense':
      return {
        expense_date: formData.expense_date as string,
        category: formData.category as string,
        amount: formData.amount as number,
        merchant_name: (formData.merchant_name as string) || null,
        usage_purpose: (formData.usage_purpose as string) || null,
        receipt_url: (formData.receipt_url as string) || null,
        expense_items: (formData.expense_items as Array<{ item: string; amount: number }>) || [],
        payment_method: (formData.payment_method as string) || null,
        bank_name: (formData.bank_name as string) || null,
        account_number: (formData.account_number as string) || null,
        account_holder: (formData.account_holder as string) || null,
      } as DocExpenseData

    case 'welfare':
      return {
        event_type: formData.event_type as string,
        event_date: formData.event_date as string,
        target_name: (formData.target_name as string) || null,
        relationship: (formData.relationship as string) || null,
        amount: formData.amount as number,
        attachment_url: (formData.attachment_url as string) || null,
        approved_amount: null,
      } as DocWelfareData

    case 'budget':
      return {
        budget_department_id: formData.budget_department_id as number,
        period_start: formData.period_start as string,
        period_end: formData.period_end as string,
        calculation_basis: formData.calculation_basis as string,
        total_amount: formData.total_amount as number,
        approved_amount: null,
      } as DocBudgetData

    case 'expense_proposal':
      return {
        expense_date: formData.expense_date as string,
        items: (formData.items as Array<{ item: string; quantity: number; unit_price: number }>) || [],
        total_amount: formData.total_amount as number,
        vendor_name: formData.vendor_name as string,
      } as DocExpenseProposalData

    case 'resignation':
      return {
        employment_date: formData.employment_date as string,
        resignation_date: formData.resignation_date as string,
        resignation_type: formData.resignation_type as string,
        handover_confirmed: (formData.handover_confirmed as boolean) || false,
        confidentiality_agreed: (formData.confidentiality_agreed as boolean) || false,
        voluntary_confirmed: (formData.voluntary_confirmed as boolean) || false,
        last_working_date: null,
        hr_processed_at: null,
        hr_processor_id: null,
        hr_notes: null,
      } as DocResignationData

    case 'overtime_report':
      return {
        work_date: formData.work_date as string,
        start_time: formData.start_time as string,
        end_time: formData.end_time as string,
        total_hours: formData.total_hours as number,
        work_content: formData.work_content as string,
        transportation_fee: (formData.transportation_fee as number) || 0,
        meal_fee: (formData.meal_fee as number) || 0,
      } as DocOvertimeReportData

    case 'work_type_change':
      return {
        work_type: formData.work_type as string,
        start_date: formData.start_date as string,
        end_date: formData.end_date as string,
      } as DocWorkTypeChangeData

    case 'general':
    default:
      return {
        content_body: (formData.content_body as string) || (formData.reason as string) || '',
        attachment_urls: (formData.attachment_urls as string[]) || [],
        template_type: (formData.template_type as string) || null,
        form_data: formData,
      } as DocGeneralData
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
        )
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
        )
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
        )
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

    // 결재선 상태를 'retrieved'로 변경 (기록 유지)
    await supabase
      .from('approval_step')
      .update({ status: 'retrieved' })
      .eq('request_id', documentId)

    // approval_cc 기록은 유지 (삭제하지 않음)

    revalidatePath('/documents')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

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
      budget: 'budget',
      expense_proposal: 'expense_proposal',
      resignation: 'resignation',
      overtime_report: 'overtime_report',
      work_type_change: 'work_type_change',
      other: 'general',
    }

    const docType = docTypeMap[data.document_type] || 'general'

    // doc_data 구성 (문서 유형별)
    const docData = buildDocData(docType, data.form_data)

    // document_master 생성 (draft 상태, doc_data 포함 - 단일 INSERT)
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
        doc_data: docData,  // JSONB로 직접 저장
      })
      .select('id')
      .single()

    if (masterError) {
      return { success: false, error: masterError.message }
    }

    revalidatePath('/documents')

    return { success: true, data: docMaster }
  } catch (error: unknown) {
    console.error('[Document] Save draft error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 접근 가능한 문서 검색 (기존 문서 첨부용)
// ================================================

interface AccessibleDocument {
  id: string
  title: string
  type: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  requesterName: string
  visibility: string
}

/**
 * 공개 범위에 따라 접근 가능한 문서 목록 조회
 * - 본인 문서는 항상 볼 수 있음
 * - 비공개(private): 본인 문서만
 * - 팀(team): 같은 department_id의 직원 문서
 * - 부서(department): 같은 부서 또는 하위 부서의 직원 문서
 * - 사업부(division): 같은 사업부(상위 부서 기준) 계열의 직원 문서
 * - 전사(public): 모든 문서
 */
export async function searchAccessibleDocuments(options?: {
  search?: string
  page?: number
  perPage?: number
}): Promise<{ success: boolean; data: AccessibleDocument[]; total: number; error?: string }> {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient() // RLS 우회를 위해 admin client 사용

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [], total: 0 }
    }

    // 현재 사용자 정보 조회 (admin client로 RLS 우회)
    const { data: currentEmployee } = await adminSupabase
      .from('employee')
      .select('id, department_id')
      .eq('id', user.id)
      .single()

    if (!currentEmployee) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다', data: [], total: 0 }
    }

    // 현재 사용자의 부서 계층 정보 조회
    const { data: currentDept } = await adminSupabase
      .from('department')
      .select('id, parent_department_id')
      .eq('id', currentEmployee.department_id)
      .single()

    // 같은 부서의 하위 부서들 (department 범위용)
    const { data: childDepts } = await adminSupabase
      .from('department')
      .select('id')
      .eq('parent_department_id', currentEmployee.department_id)

    const departmentIds = [
      currentEmployee.department_id,
      ...(childDepts?.map(d => d.id) || [])
    ]

    // 같은 사업부 계열 부서들 (division 범위용)
    // 상위 부서가 같거나, 상위 부서가 없으면 같은 최상위 부서
    let divisionDeptIds: number[] = [currentEmployee.department_id]

    if (currentDept?.parent_department_id) {
      // 같은 상위 부서를 가진 모든 부서
      const { data: siblingDepts } = await adminSupabase
        .from('department')
        .select('id')
        .eq('parent_department_id', currentDept.parent_department_id)

      divisionDeptIds = siblingDepts?.map(d => d.id) || []

      // 상위 부서 자체도 포함
      divisionDeptIds.push(currentDept.parent_department_id)

      // 각 sibling의 하위 부서들도 포함
      const { data: nephewDepts } = await adminSupabase
        .from('department')
        .select('id')
        .in('parent_department_id', divisionDeptIds)

      if (nephewDepts) {
        divisionDeptIds = [...divisionDeptIds, ...nephewDepts.map(d => d.id)]
      }
    } else {
      // 최상위 부서인 경우, 자신과 하위 부서들
      divisionDeptIds = departmentIds
    }

    // 같은 팀(부서)의 직원 ID들
    const { data: teamMembers } = await adminSupabase
      .from('employee')
      .select('id')
      .eq('department_id', currentEmployee.department_id)
      .eq('status', 'active')

    const teamMemberIds = teamMembers?.map(m => m.id) || []

    // 같은 부서 계열의 직원 ID들
    const { data: deptMembers } = await adminSupabase
      .from('employee')
      .select('id')
      .in('department_id', departmentIds)
      .eq('status', 'active')

    const deptMemberIds = deptMembers?.map(m => m.id) || []

    // 같은 사업부 계열의 직원 ID들
    const { data: divisionMembers } = await adminSupabase
      .from('employee')
      .select('id')
      .in('department_id', divisionDeptIds)
      .eq('status', 'active')

    const divisionMemberIds = divisionMembers?.map(m => m.id) || []

    const page = options?.page || 1
    const perPage = options?.perPage || 50
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // 문서 조회 - 공개 범위에 따른 필터링 (RLS 우회)
    let query = adminSupabase
      .from('document_master')
      .select(`
        id,
        title,
        doc_type,
        status,
        visibility,
        created_at,
        requester:requester_id (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('status', 'approved') // 승인된 문서만
      .order('created_at', { ascending: false })

    // 검색어 필터
    if (options?.search) {
      query = query.ilike('title', `%${options.search}%`)
    }

    const { data: allDocs, error, count } = await query.range(from, to)

    if (error) {
      console.error('[Document] Search accessible documents error:', error)
      return { success: false, error: error.message, data: [], total: 0 }
    }

    // 클라이언트 측에서 공개 범위 필터링
    const accessibleDocs = (allDocs || []).filter(doc => {
      const requesterId = (doc.requester as any)?.id

      // 본인 문서는 항상 접근 가능
      if (requesterId === user.id) return true

      // 공개 범위에 따른 필터링
      switch (doc.visibility) {
        case 'public':
          return true
        case 'division':
          return divisionMemberIds.includes(requesterId)
        case 'department':
          return deptMemberIds.includes(requesterId)
        case 'team':
          return teamMemberIds.includes(requesterId)
        case 'private':
          return false // 본인 문서만 (위에서 이미 처리됨)
        default:
          return false
      }
    })

    // 결과 변환
    const result: AccessibleDocument[] = accessibleDocs.map(doc => ({
      id: String(doc.id),
      title: doc.title,
      type: doc.doc_type,
      submittedAt: doc.created_at,
      status: doc.status as 'pending' | 'approved' | 'rejected',
      requesterName: (doc.requester as any)?.name || '알 수 없음',
      visibility: doc.visibility,
    }))

    return {
      success: true,
      data: result,
      total: count || 0,
    }
  } catch (error: unknown) {
    console.error('[Document] Search accessible documents error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [], total: 0 }
  }
}

// ================================================
// 첨부 문서 조회 (결재 참여자용 - visibility 무시)
// ================================================

interface LinkedDocument {
  id: number
  title: string
  doc_type: string
  status: string
  created_at: string
  requester_name: string
  summary_data: Record<string, unknown> | null
}

/**
 * 결재 문서에 첨부된 기존 문서 조회
 * - 결재 참여자(requester, approver, cc)인 경우 visibility 무시하고 조회
 * - 참여자가 아닌 경우 에러 반환
 */
export async function getLinkedDocumentsForParticipant(
  documentId: number
): Promise<{ success: boolean; data: LinkedDocument[]; error?: string }> {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    // 1. 문서 정보 조회 (summary_data에서 attached_documents 가져오기)
    const { data: document, error: docError } = await adminSupabase
      .from('document_master')
      .select('id, requester_id, doc_type, summary_data')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: '문서를 찾을 수 없습니다', data: [] }
    }

    // 2. 결재 참여자 여부 확인
    const isRequester = document.requester_id === user.id

    // 결재자 확인
    const { data: approverStep } = await adminSupabase
      .from('approval_step')
      .select('id')
      .eq('request_type', document.doc_type)
      .eq('request_id', documentId)
      .eq('approver_id', user.id)
      .maybeSingle()

    const isApprover = !!approverStep

    // 참조자 확인
    const { data: ccRecord } = await adminSupabase
      .from('approval_cc')
      .select('id')
      .eq('request_type', document.doc_type)
      .eq('request_id', documentId)
      .eq('employee_id', user.id)
      .maybeSingle()

    const isCC = !!ccRecord

    // 참여자가 아니면 에러
    if (!isRequester && !isApprover && !isCC) {
      return { success: false, error: '해당 문서의 결재 참여자만 첨부 문서를 볼 수 있습니다', data: [] }
    }

    // 3. 첨부 문서 ID 목록 가져오기
    const attachedDocIds = (document.summary_data as any)?.attached_documents as string[] | undefined

    if (!attachedDocIds || attachedDocIds.length === 0) {
      return { success: true, data: [] }
    }

    // 4. 첨부 문서 상세 조회 (admin client로 visibility 무시)
    const numericIds = attachedDocIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id))

    if (numericIds.length === 0) {
      return { success: true, data: [] }
    }

    const { data: linkedDocs, error: linkedError } = await adminSupabase
      .from('document_master')
      .select(`
        id,
        title,
        doc_type,
        status,
        created_at,
        summary_data,
        requester:requester_id (name)
      `)
      .in('id', numericIds)

    if (linkedError) {
      console.error('[Document] Get linked documents error:', linkedError)
      return { success: false, error: linkedError.message, data: [] }
    }

    // 5. 결과 변환
    const result: LinkedDocument[] = (linkedDocs || []).map(doc => ({
      id: doc.id,
      title: doc.title,
      doc_type: doc.doc_type,
      status: doc.status,
      created_at: doc.created_at,
      requester_name: (doc.requester as any)?.name || '알 수 없음',
      summary_data: doc.summary_data,
    }))

    return { success: true, data: result }
  } catch (error: unknown) {
    console.error('[Document] Get linked documents error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// ================================================
// 첨부 문서 상세 조회 (결재 참여자용)
// ================================================

interface LinkedDocumentDetail {
  id: number
  title: string
  doc_type: string
  status: string
  created_at: string
  requester_id: string
  requester_name: string
  summary_data: Record<string, unknown> | null
  doc_data: Record<string, unknown> | null
  current_step: number | null
  approved_at: string | null
  rejected_at: string | null
  retrieved_at: string | null
  approvalSteps: {
    id: string
    step_order: number
    approver_id: string
    status: string
    comment: string | null
    approved_at: string | null
    approver?: {
      id: string
      name: string
    }
  }[]
  ccList: {
    id: string
    employee_id: string
    read_at: string | null
    employee?: {
      id: string
      name: string
      department?: { name: string }
      role?: { name: string }
    }
  }[]
}

/**
 * 첨부 문서 상세 조회 (결재 참여자용)
 * - 원본 문서의 결재 참여자만 접근 가능
 * - 첨부 문서의 상세 정보(결재선, 참조자 포함) 반환
 */
export async function getLinkedDocumentDetail(
  originalDocumentId: number,
  linkedDocumentId: number
): Promise<{ success: boolean; data?: LinkedDocumentDetail; error?: string }> {
  try {
    console.log('[getLinkedDocumentDetail] Start - originalDocId:', originalDocumentId, 'linkedDocId:', linkedDocumentId)

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[getLinkedDocumentDetail] No user')
      return { success: false, error: '인증이 필요합니다' }
    }

    console.log('[getLinkedDocumentDetail] User:', user.id)

    // 1. 원본 문서 정보 조회
    const { data: originalDoc, error: origError } = await adminSupabase
      .from('document_master')
      .select('id, requester_id, doc_type')
      .eq('id', originalDocumentId)
      .single()

    if (origError) {
      console.error('[getLinkedDocumentDetail] Original doc error:', origError)
      return { success: false, error: `원본 문서 조회 오류: ${origError.message}` }
    }

    if (!originalDoc) {
      console.error('[getLinkedDocumentDetail] Original doc not found')
      return { success: false, error: '원본 문서를 찾을 수 없습니다' }
    }

    console.log('[getLinkedDocumentDetail] Original doc found:', originalDoc.id, originalDoc.doc_type)

    // 2. 원본 문서의 결재 참여자 여부 확인
    const isRequester = originalDoc.requester_id === user.id
    console.log('[getLinkedDocumentDetail] isRequester:', isRequester)

    const { data: approverStep, error: approverError } = await adminSupabase
      .from('approval_step')
      .select('id')
      .eq('request_type', originalDoc.doc_type)
      .eq('request_id', originalDocumentId)
      .eq('approver_id', user.id)
      .maybeSingle()

    if (approverError) {
      console.error('[getLinkedDocumentDetail] Approver check error:', approverError)
    }

    const isApprover = !!approverStep
    console.log('[getLinkedDocumentDetail] isApprover:', isApprover)

    const { data: ccRecord, error: ccError } = await adminSupabase
      .from('approval_cc')
      .select('id')
      .eq('request_type', originalDoc.doc_type)
      .eq('request_id', originalDocumentId)
      .eq('employee_id', user.id)
      .maybeSingle()

    if (ccError) {
      console.error('[getLinkedDocumentDetail] CC check error:', ccError)
    }

    const isCC = !!ccRecord
    console.log('[getLinkedDocumentDetail] isCC:', isCC)

    if (!isRequester && !isApprover && !isCC) {
      console.error('[getLinkedDocumentDetail] User is not a participant')
      return { success: false, error: '해당 문서의 결재 참여자만 첨부 문서를 볼 수 있습니다' }
    }

    console.log('[getLinkedDocumentDetail] User is participant, fetching linked doc')

    // 3. 첨부 문서 상세 조회
    console.log('[getLinkedDocumentDetail] Fetching linked document:', linkedDocumentId)

    const { data: linkedDoc, error: linkedError } = await adminSupabase
      .from('document_master')
      .select(`
        id,
        title,
        doc_type,
        status,
        created_at,
        requester_id,
        summary_data,
        doc_data,
        current_step,
        approved_at,
        rejected_at,
        retrieved_at,
        requester:requester_id (id, name)
      `)
      .eq('id', linkedDocumentId)
      .single()

    if (linkedError) {
      console.error('[getLinkedDocumentDetail] Error fetching linked doc:', linkedError)
      return { success: false, error: `첨부 문서 조회 오류: ${linkedError.message}` }
    }

    if (!linkedDoc) {
      console.error('[getLinkedDocumentDetail] Linked doc not found:', linkedDocumentId)
      return { success: false, error: '첨부 문서를 찾을 수 없습니다' }
    }

    console.log('[getLinkedDocumentDetail] Found linked doc:', linkedDoc.id, linkedDoc.title)

    // 4. 첨부 문서의 결재선 조회
    const { data: approvalSteps } = await adminSupabase
      .from('approval_step')
      .select(`
        id,
        step_order,
        approver_id,
        status,
        comment,
        approved_at,
        approver:approver_id (id, name)
      `)
      .eq('request_type', linkedDoc.doc_type)
      .eq('request_id', linkedDocumentId)
      .order('step_order', { ascending: true })

    // 5. 첨부 문서의 참조자 조회
    const { data: ccList } = await adminSupabase
      .from('approval_cc')
      .select(`
        id,
        employee_id,
        read_at,
        employee:employee_id (
          id,
          name,
          department:department_id (name),
          role:role_id (name)
        )
      `)
      .eq('request_type', linkedDoc.doc_type)
      .eq('request_id', linkedDocumentId)

    // 6. 결과 변환
    const result: LinkedDocumentDetail = {
      id: linkedDoc.id,
      title: linkedDoc.title,
      doc_type: linkedDoc.doc_type,
      status: linkedDoc.status,
      created_at: linkedDoc.created_at,
      requester_id: linkedDoc.requester_id,
      requester_name: (linkedDoc.requester as any)?.name || '알 수 없음',
      summary_data: linkedDoc.summary_data,
      doc_data: linkedDoc.doc_data,
      current_step: linkedDoc.current_step,
      approved_at: linkedDoc.approved_at,
      rejected_at: linkedDoc.rejected_at,
      retrieved_at: linkedDoc.retrieved_at,
      approvalSteps: (approvalSteps || []).map(step => ({
        id: step.id,
        step_order: step.step_order,
        approver_id: step.approver_id,
        status: step.status,
        comment: step.comment,
        approved_at: step.approved_at,
        approver: step.approver as any,
      })),
      ccList: (ccList || []).map(cc => ({
        id: cc.id,
        employee_id: cc.employee_id,
        read_at: cc.read_at,
        employee: cc.employee as any,
      })),
    }

    return { success: true, data: result }
  } catch (error: unknown) {
    console.error('[Document] Get linked document detail error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
