import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  leaveRequestId: number
  rejectReason: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leaveRequestId, rejectReason }: RequestBody = await req.json()

    if (!leaveRequestId || !rejectReason) {
      return new Response(
        JSON.stringify({ success: false, error: 'leaveRequestId and rejectReason are required' }),
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

    // 1. Find current approval step for this user
    const { data: currentStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order, status')
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (stepError || !currentStep) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '반려 권한이 없거나 이미 처리된 요청입니다'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update current approval step to rejected
    const { error: stepUpdateError } = await supabase
      .from('approval_step')
      .update({
        status: 'rejected',
        comment: rejectReason,
        approved_at: new Date().toISOString()
      })
      .eq('id', currentStep.id)

    if (stepUpdateError) {
      console.error('Error updating approval step:', stepUpdateError)
      throw new Error('승인 단계 업데이트 실패')
    }

    // 3. Create audit record (optional - ignore errors)
    await supabase
      .from('approval_step_audit')
      .insert({
        approval_step_id: currentStep.id,
        action: 'rejected',
        actor_id: user.id,
        old_status: 'pending',
        new_status: 'rejected'
      })

    // 4. Update leave request status with rejection reason
    const { error: updateError } = await supabase
      .from('leave_request')
      .update({
        status: 'rejected',
        approver_id: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectReason,
      })
      .eq('id', leaveRequestId)

    if (updateError) {
      console.error('Error rejecting leave request:', updateError)
      throw new Error('Failed to reject leave request')
    }

    // 5. Reject all other pending/waiting steps
    await supabase
      .from('approval_step')
      .update({ status: 'rejected' })
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .in('status', ['pending', 'waiting'])
      .neq('id', currentStep.id)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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
