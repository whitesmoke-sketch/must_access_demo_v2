import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  employeeId: string
  days: number
  reason: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { employeeId, days, reason }: RequestBody = await req.json()

    if (!employeeId || !days || !reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'employeeId, days, and reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (days <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: '차감 일수는 0보다 커야 합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get auth user from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify user authorization (level >= 5)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has permission (level >= 5)
    const { data: currentUser, error: currentUserError } = await supabase
      .from('employee')
      .select('id, role:role_id(level)')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser || (currentUser.role as any)?.level < 5) {
      return new Response(
        JSON.stringify({ success: false, error: '권한이 없습니다' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if target employee exists
    const { data: targetEmployee, error: targetError } = await supabase
      .from('employee')
      .select('id, name')
      .eq('id', employeeId)
      .single()

    if (targetError || !targetEmployee) {
      return new Response(
        JSON.stringify({ success: false, error: '대상 구성원을 찾을 수 없습니다' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current leave balance
    const today = new Date().toISOString().split('T')[0]

    // Get all active grants for this employee
    const { data: grants, error: grantsError } = await supabase
      .from('annual_leave_grant')
      .select('id, granted_days')
      .eq('employee_id', employeeId)
      .eq('approval_status', 'approved')
      .gte('expiration_date', today)
      .in('grant_type', ['monthly', 'proportional', 'annual'])
      .order('expiration_date', { ascending: true })

    if (grantsError) {
      console.error('Grants fetch error:', grantsError)
      return new Response(
        JSON.stringify({ success: false, error: '연차 정보 조회 실패' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate total and used leave
    const grantIds = grants?.map(g => g.id) || []
    const totalGranted = grants?.reduce((sum, g) => sum + Number(g.granted_days), 0) || 0

    let totalUsed = 0
    if (grantIds.length > 0) {
      const { data: usage, error: usageError } = await supabase
        .from('annual_leave_usage')
        .select('used_days')
        .in('grant_id', grantIds)

      if (!usageError && usage) {
        totalUsed = usage.reduce((sum, u) => sum + Number(u.used_days), 0)
      }
    }

    const remainingDays = totalGranted - totalUsed

    if (days > remainingDays) {
      return new Response(
        JSON.stringify({ success: false, error: `차감 일수(${days}일)가 잔여 연차(${remainingDays}일)보다 많습니다` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create document_master with doc_data JSONB for manual deduction
    const { data: documentMaster, error: docMasterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: employeeId,
        doc_type: 'leave',
        title: `[수동 차감] ${reason}`,
        status: 'approved',
        approved_at: new Date().toISOString(),
        doc_data: {
          leave_type: 'annual',
          start_date: today,
          end_date: today,
          days_count: days,
          half_day_slot: null,
          reason: `[수동 차감] ${reason}`,
          attachment_url: null,
          deducted_from_grants: [],
        },
      })
      .select('id')
      .single()

    if (docMasterError) {
      console.error('Document master creation error:', docMasterError)
      return new Response(
        JSON.stringify({ success: false, error: `문서 생성 실패: ${docMasterError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find grant to deduct from (FIFO - oldest expiration first)
    let remainingToDeduct = days

    for (const grant of grants || []) {
      if (remainingToDeduct <= 0) break

      // Check how much is already used from this grant
      const { data: grantUsage } = await supabase
        .from('annual_leave_usage')
        .select('used_days')
        .eq('grant_id', grant.id)

      const usedFromGrant = grantUsage?.reduce((sum, u) => sum + Number(u.used_days), 0) || 0
      const availableFromGrant = Number(grant.granted_days) - usedFromGrant

      if (availableFromGrant <= 0) continue

      const deductAmount = Math.min(remainingToDeduct, availableFromGrant)

      // Create usage record for deduction (document_master.id 참조)
      const { error: usageInsertError } = await supabase
        .from('annual_leave_usage')
        .insert({
          document_id: documentMaster.id,
          grant_id: grant.id,
          used_days: deductAmount,
          used_date: today,
        })

      if (usageInsertError) {
        console.error('Usage insert error:', usageInsertError)
        return new Response(
          JSON.stringify({ success: false, error: `연차 차감 실패: ${usageInsertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      remainingToDeduct -= deductAmount
    }

    // Update annual_leave_balance table
    const { data: existingBalance } = await supabase
      .from('annual_leave_balance')
      .select('total_days, used_days, remaining_days')
      .eq('employee_id', employeeId)
      .single()

    if (existingBalance) {
      const newUsed = Number(existingBalance.used_days) + days
      const newRemaining = Number(existingBalance.remaining_days) - days

      const { error: balanceUpdateError } = await supabase
        .from('annual_leave_balance')
        .update({
          used_days: newUsed,
          remaining_days: newRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId)

      if (balanceUpdateError) {
        console.error('Balance update error:', balanceUpdateError)
      }
    }

    console.log(`[연차 수동 차감] ${targetEmployee.name}님 연차 ${days}일 차감 완료 (사유: ${reason})`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${targetEmployee.name}님의 연차 ${days}일이 차감되었습니다`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[연차 수동 차감] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
