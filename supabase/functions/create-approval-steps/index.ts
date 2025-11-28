import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    const tableMap: Record<string, string> = {
      leave: 'leave_request',
      document: 'document_submission',
      business_trip: 'business_trip_request',
      expense: 'expense_request'
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
