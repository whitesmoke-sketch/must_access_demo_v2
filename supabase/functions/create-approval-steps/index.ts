import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendSlackMessage, createApprovalRequestMessage } from '../_shared/slack-notifier.ts'

interface ApprovalStepInput {
  order: number
  approverId: string
  approvalType: 'single' | 'agreement'  // 합의 지원
  approverName: string
  approverPosition: string
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface RequestBody {
  requestType: 'leave' | 'document' | 'business_trip' | 'expense'
  requestId: number
  approvalSteps: ApprovalStepInput[]
  ccEmployeeIds?: string[]  // 참조자 ID 배열
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()

    const { requestType, requestId, approvalSteps, ccEmployeeIds }: RequestBody = body

    // Validate input
    if (!requestType || !requestId || !approvalSteps || approvalSteps.length === 0) {
      console.error('Validation failed:', { requestType, requestId, approvalSteps })
      return new Response(
        JSON.stringify({
          success: false,
          error: `필수 파라미터가 누락되었습니다: requestType=${requestType}, requestId=${requestId}, approvalSteps=${approvalSteps}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with Service Role Key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. 첫 번째 step_order 찾기 (가장 작은 order)
    const minStepOrder = Math.min(...approvalSteps.map(s => s.order))

    // 2. 마지막 step_order 찾기 (가장 큰 order)
    const maxStepOrder = Math.max(...approvalSteps.map(s => s.order))

    // 3. Insert approval steps
    const approvalStepsToInsert = approvalSteps.map((step) => {
      // 첫 번째 단계는 pending, 나머지는 waiting
      const status = step.order === minStepOrder ? 'pending' : 'waiting'
      // 마지막 단계인지 확인
      const isLastStep = step.order === maxStepOrder

      return {
        request_type: requestType,
        request_id: requestId,
        step_order: step.order,
        approver_id: step.approverId,
        approval_type: step.approvalType || 'single',
        status: status as 'pending' | 'waiting',
        is_last_step: isLastStep
      }
    })

    const { error: insertError } = await supabase
      .from('approval_step')
      .insert(approvalStepsToInsert)

    if (insertError) {
      console.error('Failed to insert approval steps:', insertError)
      throw new Error(`Failed to insert approval steps: ${insertError.message}`)
    }

    // 4. Insert CC (참조자) if provided
    if (ccEmployeeIds && ccEmployeeIds.length > 0) {
      const ccRecords = ccEmployeeIds.map((employeeId) => ({
        request_type: requestType,
        request_id: requestId,
        employee_id: employeeId,
        submitted_notified_at: new Date().toISOString()  // 상신 시 알림 발송
      }))

      const { error: ccError } = await supabase
        .from('approval_cc')
        .insert(ccRecords)

      if (ccError) {
        console.error('Failed to insert approval CC:', ccError)
        // 롤백: 삽입된 approval_step 삭제
        await supabase
          .from('approval_step')
          .delete()
          .eq('request_type', requestType)
          .eq('request_id', requestId)

        throw new Error(`Failed to insert approval CC: ${ccError.message}`)
      }
    }

    // 5. Update request table based on type
    // 변경: 통합 문서 시스템 사용 (document_master)
    const tableMap: Record<string, string> = {
      leave: 'document_master',  // leave_request → document_master
      document: 'document_master',  // document_submission → document_master
      overtime: 'document_master',  // 야근수당 → document_master
      expense: 'document_master',  // 지출결의서 → document_master
      welfare: 'document_master',  // 경조사비 → document_master
      business_trip: 'business_trip_request',
    }
    const tableName = tableMap[requestType]

    if (tableName) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          current_step: minStepOrder,
          status: 'pending'
        })
        .eq('id', requestId)

      if (updateError) {
        console.error(`Failed to update ${tableName}:`, updateError)
        // Rollback: delete inserted approval steps and CC
        await supabase
          .from('approval_step')
          .delete()
          .eq('request_type', requestType)
          .eq('request_id', requestId)

        await supabase
          .from('approval_cc')
          .delete()
          .eq('request_type', requestType)
          .eq('request_id', requestId)

        throw new Error(`Failed to update ${tableName}: ${updateError.message}`)
      }
    }

    // 6. 슬랙 알림 발송 (첫 번째 결재자에게)
    // 비동기로 실행하여 메인 로직에 영향 없도록 함
    try {
      // 첫 번째 단계(pending)의 결재자들 조회
      const firstStepApprovers = approvalSteps.filter(s => s.order === minStepOrder)
      const approverIds = firstStepApprovers.map(s => s.approverId)

      // 결재자들의 slack_user_id 조회
      const { data: approverData } = await supabase
        .from('employee')
        .select('id, slack_user_id')
        .in('id', approverIds)

      // 문서 정보 조회 (기안자 이름, 문서 제목)
      const { data: documentData } = await supabase
        .from('document_master')
        .select(`
          id,
          doc_type,
          requester:requester_id(name)
        `)
        .eq('id', requestId)
        .single()

      if (approverData && documentData) {
        const requester = Array.isArray(documentData.requester)
          ? documentData.requester[0]
          : documentData.requester
        const requesterName = requester?.name || '알 수 없음'
        const docTypeLabels: Record<string, string> = {
          leave: '휴가신청서',
          overtime: '야근수당신청서',
          expense: '지출결의서',
          welfare: '경조사비신청서',
          general: '일반문서',
        }
        const documentTitle = docTypeLabels[documentData.doc_type] || documentData.doc_type
        const appUrl = Deno.env.get('APP_URL') || 'https://must-access-demo-v2.vercel.app'

        // 각 결재자에게 알림 발송
        for (const approver of approverData) {
          if (approver.slack_user_id) {
            const message = createApprovalRequestMessage(
              requesterName,
              documentTitle,
              requestId,
              appUrl
            )
            // 비동기로 발송 (await 없이)
            sendSlackMessage(approver.slack_user_id, message)
              .catch(err => console.error('[Slack] 알림 발송 실패:', err))
          }
        }
      }
    } catch (slackError) {
      // 슬랙 알림 실패가 결재선 생성에 영향을 주지 않음
      console.error('[Slack] 알림 처리 중 오류 (무시됨):', slackError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
