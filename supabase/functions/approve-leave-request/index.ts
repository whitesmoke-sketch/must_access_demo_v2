import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  leaveRequestId: number
}

// 연차 차감 로직 (직접 통합 + 병렬 처리 최적화)
async function deductLeaveBalance(supabase: ReturnType<typeof createClient>, leaveRequestId: number, employeeId: string, requestedDays: number) {
  // 1. Check idempotency and get grants in parallel
  const today = new Date().toISOString().split('T')[0]
  const [existingUsageResult, grantsResult] = await Promise.all([
    supabase
      .from('annual_leave_usage')
      .select('id')
      .eq('leave_request_id', leaveRequestId)
      .limit(1),
    supabase
      .from('annual_leave_grant')
      .select('id, granted_days, expiration_date')
      .eq('employee_id', employeeId)
      .eq('approval_status', 'approved')
      .gte('expiration_date', today)
      .order('expiration_date', { ascending: true })
  ])

  if (existingUsageResult.data && existingUsageResult.data.length > 0) {
    return // Already deducted
  }

  const grants = grantsResult.data
  if (grantsResult.error || !grants || grants.length === 0) {
    throw new Error('사용 가능한 연차가 없습니다')
  }

  // 2. Get existing usage for grants
  const grantIds = grants.map(g => g.id)
  const { data: existingUsages } = await supabase
    .from('annual_leave_usage')
    .select('grant_id, used_days')
    .in('grant_id', grantIds)

  const usageByGrant = new Map<number, number>()
  if (existingUsages) {
    for (const usage of existingUsages) {
      const current = usageByGrant.get(usage.grant_id) || 0
      usageByGrant.set(usage.grant_id, current + Number(usage.used_days))
    }
  }

  // 3. Deduct using FIFO
  let remainingToDeduct = requestedDays
  const usageRecords: Array<{ grant_id: number; used_days: number }> = []

  for (const grant of grants) {
    if (remainingToDeduct <= 0) break
    const alreadyUsed = usageByGrant.get(grant.id) || 0
    const available = Number(grant.granted_days) - alreadyUsed
    if (available <= 0) continue

    const deductAmount = Math.min(remainingToDeduct, available)
    usageRecords.push({ grant_id: grant.id, used_days: deductAmount })
    remainingToDeduct -= deductAmount
  }

  if (remainingToDeduct > 0) {
    throw new Error(`연차 잔액이 부족합니다. (부족: ${remainingToDeduct}일)`)
  }

  // 4. Insert usage records and update balance in parallel
  const usageInserts = usageRecords.map(record => ({
    leave_request_id: leaveRequestId,
    grant_id: record.grant_id,
    used_days: record.used_days,
    used_date: new Date().toISOString()
  }))

  const [usageResult, balanceResult] = await Promise.all([
    supabase.from('annual_leave_usage').insert(usageInserts),
    supabase.rpc('update_leave_balance', { p_employee_id: employeeId })
  ])

  if (usageResult.error) {
    throw new Error(`연차 사용 기록 생성 실패: ${usageResult.error.message}`)
  }
  if (balanceResult.error) {
    throw new Error(`연차 잔액 업데이트 실패: ${balanceResult.error.message}`)
  }
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
      return new Response(
        JSON.stringify({
          success: false,
          error: '승인 권한이 없거나 이미 처리된 요청입니다'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update current step to approved
    const { error: stepUpdateError } = await supabase
      .from('approval_step')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', currentStep.id)

    if (stepUpdateError) {
      throw new Error('승인 단계 업데이트 실패')
    }

    // 3. Create audit record (optional - ignore errors)
    await supabase
      .from('approval_step_audit')
      .insert({
        approval_step_id: currentStep.id,
        action: 'approved',
        actor_id: user.id,
        old_status: 'pending',
        new_status: 'approved'
      })

    // 3.5. 합의(agreement) 로직: 같은 step_order의 모든 결재자가 승인했는지 확인
    const { data: sameStepApprovers, error: sameStepError } = await supabase
      .from('approval_step')
      .select('id, status')
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .eq('step_order', currentStep.step_order)

    if (sameStepError) {
      throw new Error('합의 확인 중 오류가 발생했습니다')
    }

    // 같은 단계의 모든 결재자가 승인했는지 확인
    const allSameStepApproved = sameStepApprovers?.every(
      step => step.status === 'approved'
    ) ?? false

    // 같은 단계에 아직 승인하지 않은 결재자가 있으면 대기
    if (!allSameStepApproved) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '승인 완료. 동일 단계의 다른 결재자 승인을 기다리고 있습니다.',
          isFinal: false,
          waitingForAgreement: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check if this is the last step
    if (currentStep.is_last_step) {
      // Get leave request info and update status in parallel
      const [leaveRequestResult, updateResult] = await Promise.all([
        supabase
          .from('leave_request')
          .select('employee_id, requested_days')
          .eq('id', leaveRequestId)
          .single(),
        supabase
          .from('leave_request')
          .update({
            status: 'approved',
            approver_id: user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', leaveRequestId)
      ])

      if (updateResult.error) {
        throw new Error('최종 승인 업데이트 실패')
      }

      if (leaveRequestResult.error || !leaveRequestResult.data) {
        throw new Error('연차 정보 조회 실패')
      }

      // Deduct leave balance directly (no HTTP call)
      await deductLeaveBalance(
        supabase,
        leaveRequestId,
        leaveRequestResult.data.employee_id,
        Number(leaveRequestResult.data.requested_days)
      )

      return new Response(
        JSON.stringify({
          success: true,
          message: '최종 승인이 완료되었습니다',
          isFinal: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Find ALL next step approvers (합의 지원)
      const nextStepOrder = currentStep.step_order + 1
      const { data: nextStepApprovers, error: nextStepError } = await supabase
        .from('approval_step')
        .select('id')
        .eq('request_type', 'leave')
        .eq('request_id', leaveRequestId)
        .eq('step_order', nextStepOrder)
        .eq('status', 'waiting')

      if (nextStepError) {
        throw new Error('다음 승인 단계 조회 실패')
      }

      // Activate ALL next step approvers to pending
      if (nextStepApprovers && nextStepApprovers.length > 0) {
        const nextStepIds = nextStepApprovers.map(s => s.id)
        const { error: nextStepUpdateError } = await supabase
          .from('approval_step')
          .update({ status: 'pending' })
          .in('id', nextStepIds)

        if (nextStepUpdateError) {
          throw new Error('다음 승인 단계 활성화 실패')
        }
      }

      // Update leave request current_step
      const { error: requestUpdateError } = await supabase
        .from('leave_request')
        .update({ current_step: nextStepOrder })
        .eq('id', leaveRequestId)

      if (requestUpdateError) {
        throw new Error('현재 단계 업데이트 실패')
      }

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
