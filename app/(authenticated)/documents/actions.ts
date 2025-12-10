'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DocumentType, LeaveType } from '@/types/document'
import {
  sendSlackMessage,
  createApprovalTurnMessage,
  createApprovalCompleteMessage,
  createApprovalRejectedMessage,
  DOC_TYPE_LABELS,
} from '@/lib/slack-notifier'
import { getValidGoogleAccessToken } from '@/lib/google-auth'
import {
  createDriveFolder,
  uploadFileToDrive,
  generateArchiveFolderName,
  generateArchiveFileName,
} from '@/lib/google-drive'
import { generateLeaveRequestPdfBuffer } from '@/lib/server-pdf'
import { downloadFileFromSupabase, guessMimeType, extractPathFromUrl } from '@/lib/supabase/storage'
import type { LeaveRequestPDFData, ApproverInfo, CCInfo } from '@/components/pdf/types'

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
      // RLS 정책으로 인해 결재자는 document_master를 직접 수정할 수 없으므로 adminSupabase 사용
      const { error: updateDocError } = await adminSupabase
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

      // 슬랙 알림: 기안자에게 최종 승인 완료 알림
      try {
        const { data: requesterData } = await adminSupabase
          .from('employee')
          .select('slack_user_id')
          .eq('id', document.requester_id)
          .single()

        if (requesterData?.slack_user_id) {
          const documentTitle = DOC_TYPE_LABELS[requestType] || requestType
          const slackMessage = createApprovalCompleteMessage(documentTitle, documentId)
          console.log('[Slack 최종승인] 발송:', requesterData.slack_user_id)
          sendSlackMessage(requesterData.slack_user_id, slackMessage)
            .catch(err => console.error('[Slack] 최종 승인 알림 발송 실패:', err))
        }
      } catch (slackError) {
        console.error('[Slack] 최종 승인 알림 처리 중 오류 (무시됨):', slackError)
      }

      // Google Drive 아카이빙
      try {
        await archiveDocumentToDrive(supabase, adminSupabase, documentId, requestType)
      } catch (archiveError) {
        console.error('[Drive 아카이빙] 실패 (결재 완료에 영향 없음):', archiveError)
      }

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

        // 슬랙 알림: 다음 결재자에게 결재 차례 알림
        try {
          const { data: nextApproverSteps } = await adminSupabase
            .from('approval_step')
            .select('approver_id')
            .in('id', nextStepIds)

          if (nextApproverSteps) {
            const approverIds = nextApproverSteps.map(s => s.approver_id)
            const { data: approversData } = await adminSupabase
              .from('employee')
              .select('id, slack_user_id')
              .in('id', approverIds)

            const { data: requesterInfo } = await adminSupabase
              .from('employee')
              .select('name')
              .eq('id', document.requester_id)
              .single()

            const requesterName = requesterInfo?.name || '알 수 없음'
            const documentTitle = DOC_TYPE_LABELS[requestType] || requestType

            for (const approver of approversData || []) {
              if (approver.slack_user_id) {
                const slackMessage = createApprovalTurnMessage(requesterName, documentTitle, documentId)
                console.log('[Slack 결재차례] 발송:', approver.slack_user_id)
                sendSlackMessage(approver.slack_user_id, slackMessage)
                  .catch(err => console.error('[Slack] 결재 차례 알림 실패:', err))
              }
            }
          }
        } catch (slackError) {
          console.error('[Slack] 결재 차례 알림 오류 (무시됨):', slackError)
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
    // RLS 정책으로 인해 결재자는 document_master를 직접 수정할 수 없으므로 adminSupabase 사용
    const adminSupabase = createAdminClient()
    const { error: updateDocError } = await adminSupabase
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

    // 슬랙 알림: 기안자에게 반려 알림
    try {
      // 기안자 정보 조회
      const { data: docWithRequester } = await adminSupabase
        .from('document_master')
        .select('requester_id')
        .eq('id', documentId)
        .single()

      if (docWithRequester) {
        const { data: requesterData } = await adminSupabase
          .from('employee')
          .select('slack_user_id')
          .eq('id', docWithRequester.requester_id)
          .single()

        if (requesterData?.slack_user_id) {
          const documentTitle = DOC_TYPE_LABELS[requestType] || requestType
          const slackMessage = createApprovalRejectedMessage(documentTitle, documentId, rejectReason)
          console.log('[Slack 반려] 발송:', requesterData.slack_user_id)
          sendSlackMessage(requesterData.slack_user_id, slackMessage)
            .catch(err => console.error('[Slack] 반려 알림 발송 실패:', err))
        }
      }
    } catch (slackError) {
      console.error('[Slack] 반려 알림 처리 중 오류 (무시됨):', slackError)
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

// ================================================
// Google Drive 아카이빙
// ================================================

/**
 * Google Drive에 문서 아카이빙
 */
async function archiveDocumentToDrive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminSupabase: ReturnType<typeof createAdminClient>,
  documentId: number,
  docType: string
) {
  console.log('[Drive 아카이빙] 시작...', { documentId, docType })

  // A. 현재 사용자의 Google 토큰 확보
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn('[Drive 아카이빙] 세션이 없어 건너뜁니다.')
    return
  }

  const tokenResult = await getValidGoogleAccessToken(
    session.provider_token,
    session.provider_refresh_token,
    session.user.id
  )

  if (!tokenResult.accessToken) {
    console.warn('[Drive 아카이빙] Google 토큰이 없어 건너뜁니다:', tokenResult.error)
    return
  }

  const accessToken = tokenResult.accessToken

  // B. 문서 정보 조회
  const { data: documentData, error: docError } = await adminSupabase
    .from('document_master')
    .select('requester_id, doc_data, created_at, doc_type')
    .eq('id', documentId)
    .single()

  if (docError || !documentData) {
    console.error('[Drive 아카이빙] 문서 정보 조회 실패:', docError)
    return
  }

  // C. 기안자 정보 조회
  const { data: requesterData, error: requesterError } = await adminSupabase
    .from('employee')
    .select(`
      id,
      name,
      email,
      department:department_id (id, name),
      role:role_id (id, name)
    `)
    .eq('id', documentData.requester_id)
    .single()

  if (requesterError || !requesterData) {
    console.error('[Drive 아카이빙] 기안자 정보 조회 실패:', requesterError)
    return
  }

  const requesterDept = Array.isArray(requesterData.department)
    ? requesterData.department[0]
    : requesterData.department
  const requesterRole = Array.isArray(requesterData.role)
    ? requesterData.role[0]
    : requesterData.role

  // D. 연차 잔액 조회 (휴가 문서인 경우)
  let balanceData: { total_days: number; used_days: number; remaining_days: number } | null = null
  if (docType === 'leave') {
    const { data: balance } = await adminSupabase
      .from('annual_leave_balance')
      .select('total_days, used_days, remaining_days')
      .eq('employee_id', documentData.requester_id)
      .single()
    balanceData = balance
  }

  // E. 결재선 정보 조회
  const { data: approvalSteps } = await adminSupabase
    .from('approval_step')
    .select(`
      id,
      step_order,
      status,
      comment,
      approved_at,
      approver:approver_id (
        id,
        name,
        department:department_id (name),
        role:role_id (name)
      )
    `)
    .eq('request_type', docType)
    .eq('request_id', documentId)
    .order('step_order')

  const approvers: ApproverInfo[] = (approvalSteps || []).map((step) => {
    const approver = Array.isArray(step.approver) ? step.approver[0] : step.approver
    const dept = approver?.department
      ? (Array.isArray(approver.department) ? approver.department[0] : approver.department)
      : null
    const role = approver?.role
      ? (Array.isArray(approver.role) ? approver.role[0] : approver.role)
      : null

    return {
      id: approver?.id || '',
      name: approver?.name || '',
      role: role?.name || '',
      department: dept?.name || '',
      status: step.status as ApproverInfo['status'],
      comment: step.comment || undefined,
      approvedAt: step.approved_at || undefined,
    }
  })

  // F. 참조자 정보 조회
  const { data: ccData } = await adminSupabase
    .from('approval_cc')
    .select(`
      employee:employee_id (
        id,
        name,
        department:department_id (name),
        role:role_id (name)
      )
    `)
    .eq('request_type', docType)
    .eq('request_id', documentId)

  const ccList: CCInfo[] = (ccData || []).map((cc) => {
    const emp = Array.isArray(cc.employee) ? cc.employee[0] : cc.employee
    const dept = emp?.department
      ? (Array.isArray(emp.department) ? emp.department[0] : emp.department)
      : null
    const role = emp?.role
      ? (Array.isArray(emp.role) ? emp.role[0] : emp.role)
      : null

    return {
      id: emp?.id || '',
      name: emp?.name || '',
      role: role?.name || '',
      department: dept?.name || '',
    }
  })

  // G. PDF 데이터 구성 및 생성
  const docData = documentData.doc_data || {}
  const pdfData: LeaveRequestPDFData = {
    createdAt: documentData.created_at,
    status: 'approved',
    requester: {
      id: requesterData.id,
      name: requesterData.name,
      department: requesterDept?.name || '',
      role: requesterRole?.name || '',
    },
    totalLeave: balanceData?.total_days || 0,
    usedLeave: balanceData?.used_days || 0,
    remainingLeave: balanceData?.remaining_days || 0,
    leaveType: (docData.leave_type as LeaveType) || 'annual',
    startDate: (docData.start_date as string) || '',
    endDate: (docData.end_date as string) || '',
    totalDays: (docData.days_count as number) || 0,
    reason: (docData.reason as string) || undefined,
    approvers,
    ccList: ccList.length > 0 ? ccList : undefined,
  }

  console.log('[Drive 아카이빙] PDF 생성 중...')
  const pdfBuffer = await generateLeaveRequestPdfBuffer(pdfData)

  // H. 폴더 생성
  const folderName = generateArchiveFolderName(
    requesterData.name,
    documentData.doc_type,
    documentData.created_at
  )
  console.log('[Drive 아카이빙] 폴더 생성:', folderName)
  const folderId = await createDriveFolder(accessToken, folderName)

  if (!folderId) {
    console.error('[Drive 아카이빙] 폴더 생성 실패')
    return
  }

  // I. PDF 업로드
  const pdfFileName = generateArchiveFileName(
    requesterData.name,
    documentData.doc_type,
    documentData.created_at
  )
  console.log('[Drive 아카이빙] PDF 업로드:', pdfFileName)
  const pdfResult = await uploadFileToDrive(
    accessToken,
    folderId,
    pdfFileName,
    'application/pdf',
    pdfBuffer
  )

  // J. 첨부파일 업로드 (다중 파일 지원)
  const rawAttachmentUrl = docData.attachment_url as string | null

  let attachmentPaths: string[] = []
  if (rawAttachmentUrl) {
    try {
      const parsed = JSON.parse(rawAttachmentUrl)
      if (Array.isArray(parsed)) {
        attachmentPaths = parsed
      } else {
        attachmentPaths = [rawAttachmentUrl]
      }
    } catch {
      attachmentPaths = [rawAttachmentUrl]
    }
  }

  if (attachmentPaths.length > 0) {
    console.log(`[Drive 아카이빙] 첨부파일 ${attachmentPaths.length}개 처리 시작`)

    for (const path of attachmentPaths) {
      try {
        const filePath = extractPathFromUrl(path, 'documents') || path
        const fileName = decodeURIComponent(filePath.split('/').pop() || `attachment_${Date.now()}`)
        const mimeType = guessMimeType(fileName)

        console.log('[Drive 아카이빙] 첨부파일 다운로드:', filePath)
        const fileBuffer = await downloadFileFromSupabase('documents', filePath)

        console.log('[Drive 아카이빙] 첨부파일 업로드:', fileName)
        await uploadFileToDrive(accessToken, folderId, fileName, mimeType, fileBuffer)
      } catch (attachError) {
        console.error(`[Drive 아카이빙] 첨부파일 처리 실패 (${path}):`, attachError)
      }
    }

    console.log('[Drive 아카이빙] 첨부파일 처리 완료')
  }

  // K. 문서에 Drive 정보 저장
  if (pdfResult.id) {
    await adminSupabase
      .from('document_master')
      .update({
        drive_file_id: folderId,
        drive_file_url: pdfResult.webViewLink,
      })
      .eq('id', documentId)
  }

  console.log('[Drive 아카이빙] 완료!')
}
