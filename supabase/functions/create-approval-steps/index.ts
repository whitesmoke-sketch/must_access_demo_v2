import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ApprovalStepInput {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface RequestBody {
  requestType: 'leave' | 'business_trip' | 'expense'
  requestId: number
  approvalSteps: ApprovalStepInput[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()

    const { requestType, requestId, approvalSteps }: RequestBody = body

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
    // Supabase Edge Functions 자동으로 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 제공합니다
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Start transaction-like operation
    // 1. Insert approval steps
    const totalSteps = approvalSteps.length
    const approvalStepsToInsert = approvalSteps.map((step, index) => {
      const isLastStep = index === totalSteps - 1

      return {
        request_type: requestType,
        request_id: requestId,
        step_order: step.order,
        approver_id: step.approverId,
        status: 'pending' as const,
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

    // 2. Update request table based on type
    const tableMap = {
      leave: 'leave_request',
      business_trip: 'business_trip_request',
      expense: 'expense_request'
    }
    const tableName = tableMap[requestType]

    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        current_step: 1,
        status: 'pending'
      })
      .eq('id', requestId)

    if (updateError) {
      console.error(`Failed to update ${tableName}:`, updateError)
      // Rollback: delete inserted approval steps
      await supabase
        .from('approval_step')
        .delete()
        .eq('request_type', requestType)
        .eq('request_id', requestId)

      throw new Error(`Failed to update ${tableName}: ${updateError.message}`)
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
