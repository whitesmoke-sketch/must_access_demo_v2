import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  leaveRequestId: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leaveRequestId }: RequestBody = await req.json()

    if (!leaveRequestId) {
      return new Response(
        JSON.stringify({ success: false, error: 'leaveRequestId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[휴가 승인] 시작 - requestId:', leaveRequestId, 'approverId:', user.id)

    // 1. Find current approval step for this user
    const { data: currentStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order, is_last_step, status')
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (stepError || !currentStep) {
      console.error('[휴가 승인] 승인 단계를 찾을 수 없음:', stepError)
      return new Response(
        JSON.stringify({
          success: false,
          error: '승인 권한이 없거나 이미 처리된 요청입니다'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[휴가 승인] 현재 단계:', currentStep)

    // 2. Update current step to approved
    const { error: stepUpdateError } = await supabase
      .from('approval_step')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        comments: null
      })
      .eq('id', currentStep.id)

    if (stepUpdateError) {
      console.error('[휴가 승인] 승인 단계 업데이트 실패:', stepUpdateError)
      throw new Error('승인 단계 업데이트 실패')
    }

    // 3. Create audit record
    await supabase
      .from('approval_step_audit')
      .insert({
        approval_step_id: currentStep.id,
        action: 'approved',
        actor_id: user.id,
        old_status: 'pending',
        new_status: 'approved',
        comments: null
      })

    // 4. Check if this is the last step
    if (currentStep.is_last_step) {
      console.log('[휴가 승인] 최종 승인 단계')

      // Update leave request to approved
      const { error: finalUpdateError } = await supabase
        .from('leave_request')
        .update({
          status: 'approved',
          approver_id: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', leaveRequestId)

      if (finalUpdateError) {
        console.error('[휴가 승인] 최종 승인 실패:', finalUpdateError)
        throw new Error('최종 승인 업데이트 실패')
      }

      // Call deduct-leave-balance function
      console.log('[휴가 승인] 연차 차감 호출')
      const deductUrl = `${supabaseUrl}/functions/v1/deduct-leave-balance`
      const deductResponse = await fetch(deductUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ requestId: leaveRequestId })
      })

      if (!deductResponse.ok) {
        const deductError = await deductResponse.text()
        console.error('[휴가 승인] 연차 차감 실패:', deductError)
        throw new Error('연차 차감 실패')
      }

      console.log('[휴가 승인] 최종 승인 완료')
      return new Response(
        JSON.stringify({
          success: true,
          message: '최종 승인이 완료되었습니다',
          isFinal: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('[휴가 승인] 중간 승인 단계')

      // Find next step
      const { data: nextStep, error: nextStepError } = await supabase
        .from('approval_step')
        .select('id')
        .eq('request_type', 'leave')
        .eq('request_id', leaveRequestId)
        .eq('step_order', currentStep.step_order + 1)
        .single()

      if (nextStepError || !nextStep) {
        console.error('[휴가 승인] 다음 단계를 찾을 수 없음:', nextStepError)
        throw new Error('다음 승인 단계를 찾을 수 없습니다')
      }

      // Update next step to pending
      const { error: nextStepUpdateError } = await supabase
        .from('approval_step')
        .update({ status: 'pending' })
        .eq('id', nextStep.id)

      if (nextStepUpdateError) {
        console.error('[휴가 승인] 다음 단계 활성화 실패:', nextStepUpdateError)
        throw new Error('다음 승인 단계 활성화 실패')
      }

      // Update leave request current_step
      const { error: requestUpdateError } = await supabase
        .from('leave_request')
        .update({ current_step: currentStep.step_order + 1 })
        .eq('id', leaveRequestId)

      if (requestUpdateError) {
        console.error('[휴가 승인] 현재 단계 업데이트 실패:', requestUpdateError)
        throw new Error('현재 단계 업데이트 실패')
      }

      console.log('[휴가 승인] 중간 승인 완료, 다음 단계로 진행')
      return new Response(
        JSON.stringify({
          success: true,
          message: '승인이 완료되었습니다. 다음 승인자에게 전달됩니다',
          isFinal: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
