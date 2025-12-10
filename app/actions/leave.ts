'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getValidGoogleAccessToken } from '@/lib/google-auth'
import type { DocumentType, LeaveType, HalfDaySlot } from '@/types/document'
import { toLeaveRequest, type LeaveRequest } from '@/lib/leave-management/types'

// ================================================
// Types
// ================================================

export interface CreateLeaveRequestParams {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  requested_days?: number
  half_day_slot?: string
}

// ================================================
// 휴가 신청 (새 시스템: document_master + doc_leave)
// ================================================

/**
 * 휴가 신청 생성 (document_master + doc_leave)
 */
export async function createLeaveRequest(params: CreateLeaveRequestParams) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()
    if (!user || !session) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인의 신청만 가능
    if (params.employee_id !== user.id) {
      return { success: false, error: '본인의 신청만 가능합니다' }
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

    // 휴가 유형 매핑
    const leaveTypeMap: Record<string, LeaveType> = {
      annual: 'annual',
      half_day: 'half_day',
      quarter_day: 'quarter_day',
      award: 'award',
      reward: 'award',
    }
    const leaveType = leaveTypeMap[params.leave_type] || 'annual'

    // 일수 계산
    const daysCount = params.requested_days || calculateDays(
      params.start_date,
      params.end_date,
      leaveType
    )

    // 제목 생성
    const leaveTypeLabels: Record<LeaveType, string> = {
      annual: '연차',
      half_day: '반차',
      quarter_day: '반반차',
      award: '포상휴가',
    }
    const title = `${employee.name}님 ${leaveTypeLabels[leaveType]} 신청 (${params.start_date})`

    // document_master 생성 (doc_data 포함 - 단일 INSERT)
    const { data: docMaster, error: masterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: params.employee_id,
        department_id: employee.department_id,
        doc_type: 'leave' as DocumentType,
        title,
        status: 'pending',
        visibility: 'team',
        is_confidential: false,
        current_step: 1,
        summary_data: {
          leave_type: leaveType,
          start_date: params.start_date,
          end_date: params.end_date,
          days_count: daysCount,
          reason: params.reason,
        },
        // doc_data JSONB로 직접 저장
        doc_data: {
          leave_type: leaveType,
          start_date: params.start_date,
          end_date: params.end_date,
          days_count: daysCount,
          half_day_slot: params.half_day_slot as HalfDaySlot || null,
          reason: params.reason,
          attachment_url: null,
          deducted_from_grants: [],
        },
      })
      .select('id')
      .single()

    if (masterError) {
      console.error('[Leave] Master creation error:', masterError)
      return { success: false, error: masterError.message }
    }

    // 3. PDF 생성 (Google Drive)
    let pdfUrl = null
    console.log('[Leave] 휴가 신청 생성 성공, PDF 생성 시작')
    console.log('[Leave] Document ID:', docMaster.id)

    try {
      if (session.provider_token) {
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
          console.log('[Leave] PDF generated:', pdfUrl)
        }
      }
    } catch (pdfError) {
      console.error('[Leave] PDF generation error:', pdfError)
    }

    revalidatePath('/leave/my-leave')
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { success: true, data: { id: docMaster.id }, pdfUrl }
  } catch (error: unknown) {
    console.error('[Leave] Create error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 일수 계산 헬퍼
 */
function calculateDays(startDate: string, endDate: string, leaveType: LeaveType): number {
  if (leaveType === 'half_day') return 0.5
  if (leaveType === 'quarter_day') return 0.25

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  return diffDays
}

// ================================================
// 휴가 조회
// ================================================

/**
 * 내 휴가 신청 목록 조회
 */
export async function getMyLeaveRequests(options?: {
  status?: string | string[]
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
        requester:requester_id (id, name, email)
      `, { count: 'exact' })
      .eq('requester_id', user.id)
      .eq('doc_type', 'leave')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Leave] Get my requests error:', error)
      return { success: false, error: error.message, data: [] }
    }

    // LeaveRequest 형식으로 변환 (doc_data JSONB에서 추출)
    const leaveRequests: LeaveRequest[] = (data || []).map(doc => toLeaveRequest({
      id: doc.id,
      document_number: doc.document_number,
      requester_id: doc.requester_id,
      title: doc.title,
      status: doc.status,
      created_at: doc.created_at,
      approved_at: doc.approved_at,
      pdf_url: doc.pdf_url,
      drive_file_url: doc.drive_file_url,
      requester: doc.requester,
      doc_data: doc.doc_data,  // JSONB에서 직접 사용
    }))

    return {
      success: true,
      data: leaveRequests,
      total: count || 0,
      page,
      perPage,
    }
  } catch (error: unknown) {
    console.error('[Leave] Get my requests error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

/**
 * 휴가 신청 상세 조회
 */
export async function getLeaveRequest(documentId: number) {
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
        requester:requester_id (id, name, email)
      `)
      .eq('id', documentId)
      .eq('doc_type', 'leave')
      .single()

    if (error) {
      console.error('[Leave] Get request error:', error)
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
    console.error('[Leave] Get request error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 휴가 회수
// ================================================

/**
 * 휴가 신청 회수
 */
export async function retrieveLeaveRequest(documentId: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    // 본인 문서인지, pending 상태인지 확인
    const { data: doc, error: docError } = await supabase
      .from('document_master')
      .select('id, requester_id, status, doc_type')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return { success: false, error: '문서를 찾을 수 없습니다' }
    }

    if (doc.requester_id !== user.id) {
      return { success: false, error: '본인의 신청만 회수할 수 있습니다' }
    }

    if (doc.status !== 'pending') {
      return { success: false, error: '결재 대기 중인 신청만 회수할 수 있습니다' }
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
      .eq('request_type', 'leave')
      .eq('request_id', documentId)

    await supabase
      .from('approval_cc')
      .delete()
      .eq('request_type', 'leave')
      .eq('request_id', documentId)

    revalidatePath('/leave/my-leave')
    revalidatePath('/documents')

    return { success: true }
  } catch (error: unknown) {
    console.error('[Leave] Retrieve error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// PDF 생성
// ================================================

/**
 * 휴가 신청서 PDF 생성 및 Google Drive 업로드
 */
export async function generateLeavePDF(documentId: number) {
  try {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: '인증이 필요합니다' }
    }

    console.log('[Leave] Session 상태:', {
      hasProviderToken: !!session.provider_token,
      providerTokenLength: session.provider_token?.length || 0,
      hasRefreshToken: !!session.provider_refresh_token,
      refreshTokenLength: session.provider_refresh_token?.length || 0,
      provider: session.user?.app_metadata?.provider,
    })

    // Google 토큰 확인 및 갱신 (세션 → DB fallback)
    const tokenResult = await getValidGoogleAccessToken(
      session.provider_token,
      session.provider_refresh_token,
      session.user.id
    )

    if (!tokenResult.accessToken) {
      console.error('[Leave] Google 토큰 없음:', tokenResult.error)
      if (tokenResult.needsReauth) {
        return { success: false, error: 'Google 재로그인이 필요합니다', needsReauth: true }
      }
      return { success: false, error: tokenResult.error || 'Google 인증 실패' }
    }

    console.log('[Leave] PDF 생성 시작, Document ID:', documentId)

    // Edge Function 호출
    const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
      'generate-leave-pdf',
      {
        body: {
          documentId, // 새 시스템: document_master.id
          accessToken: tokenResult.accessToken,
        },
      }
    )

    if (pdfError) {
      console.error('[Leave] PDF 생성 실패:', pdfError)
      return { success: false, error: pdfError.message || 'PDF 생성 실패' }
    }

    if (!pdfResult?.success) {
      console.error('[Leave] PDF 생성 실패:', pdfResult?.error)
      return { success: false, error: pdfResult?.error || 'PDF 생성 실패' }
    }

    console.log('[Leave] PDF 생성 성공:', pdfResult.fileUrl)

    revalidatePath('/leave/my-leave')
    revalidatePath('/documents')

    return {
      success: true,
      driveUrl: pdfResult.fileUrl,
      fileId: pdfResult.fileId,
    }
  } catch (error: unknown) {
    console.error('[Leave] PDF 생성 에러:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ================================================
// 연차 잔액 조회
// ================================================

/**
 * 내 연차 잔액 조회
 */
export async function getMyLeaveBalance() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다' }
    }

    const { data, error } = await supabase
      .from('annual_leave_balance')
      .select('*')
      .eq('employee_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('[Leave] Get balance error:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data || {
        employee_id: user.id,
        total_days: 0,
        used_days: 0,
        remaining_days: 0,
        expiring_soon_days: 0,
        expiring_date: null,
      },
    }
  } catch (error: unknown) {
    console.error('[Leave] Get balance error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 내 연차 지급 내역 조회
 */
export async function getMyLeaveGrants() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다', data: [] }
    }

    const { data, error } = await supabase
      .from('annual_leave_grant')
      .select('*')
      .eq('employee_id', user.id)
      .eq('approval_status', 'approved')
      .order('granted_date', { ascending: false })

    if (error) {
      console.error('[Leave] Get grants error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error: unknown) {
    console.error('[Leave] Get grants error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}
