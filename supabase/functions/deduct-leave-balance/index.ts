import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  requestId: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()
    const { requestId }: RequestBody = body

    // Validate input
    if (!requestId) {
      console.error('Validation failed: requestId is required')
      return new Response(
        JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다: requestId'
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

    console.log('[연차 차감 Edge Function] 시작 - requestId:', requestId)

    // 1. Get leave request details
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_request')
      .select('employee_id, requested_days')
      .eq('id', requestId)
      .single()

    if (leaveError || !leaveRequest) {
      console.error('[연차 차감] 연차 정보 조회 실패:', leaveError)
      throw new Error(`연차 정보 조회 실패: ${leaveError?.message}`)
    }

    console.log('[연차 차감] 연차 정보:', leaveRequest)

    // 2. Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('annual_leave_balance')
      .select('used_days, remaining_days')
      .eq('employee_id', leaveRequest.employee_id)
      .single()

    if (balanceError || !currentBalance) {
      console.error('[연차 차감] 잔액 조회 실패:', balanceError)
      throw new Error(`연차 잔액 조회 실패: ${balanceError?.message}`)
    }

    console.log('[연차 차감] 현재 잔액:', currentBalance)

    // 3. Calculate new values
    const newUsedDays = Number(currentBalance.used_days) + Number(leaveRequest.requested_days)
    const newRemainingDays = Number(currentBalance.remaining_days) - Number(leaveRequest.requested_days)

    console.log('[연차 차감] 신청일수:', leaveRequest.requested_days)
    console.log('[연차 차감] 새로운 값:', { newUsedDays, newRemainingDays })

    // 4. Update balance
    const { error: updateError } = await supabase
      .from('annual_leave_balance')
      .update({
        used_days: newUsedDays,
        remaining_days: newRemainingDays,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', leaveRequest.employee_id)

    if (updateError) {
      console.error('[연차 차감] 업데이트 실패:', updateError)
      throw new Error(`연차 잔액 업데이트 실패: ${updateError.message}`)
    }

    console.log('[연차 차감] 성공!')

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
