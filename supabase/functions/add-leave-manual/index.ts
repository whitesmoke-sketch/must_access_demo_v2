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
        JSON.stringify({ success: false, error: '추가 일수는 0보다 커야 합니다' }),
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

    // Create annual_leave_grant record for manual addition
    const currentYear = new Date().getFullYear()
    const expirationDate = `${currentYear}-12-31`

    const { data: grant, error: grantError } = await supabase
      .from('annual_leave_grant')
      .insert({
        employee_id: employeeId,
        grant_type: 'annual', // 수동 추가는 annual 타입으로 처리
        granted_days: days,
        granted_date: new Date().toISOString().split('T')[0],
        expiration_date: expirationDate,
        approval_status: 'approved',
        approver_id: user.id,
        approval_date: new Date().toISOString(),
        reason: reason,
      })
      .select()
      .single()

    if (grantError) {
      console.error('Grant creation error:', grantError)
      return new Response(
        JSON.stringify({ success: false, error: `연차 추가 실패: ${grantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update annual_leave_balance table
    const { data: existingBalance } = await supabase
      .from('annual_leave_balance')
      .select('total_days, used_days, remaining_days')
      .eq('employee_id', employeeId)
      .single()

    if (existingBalance) {
      // Update existing balance
      const newTotal = Number(existingBalance.total_days) + days
      const newRemaining = Number(existingBalance.remaining_days) + days

      const { error: balanceUpdateError } = await supabase
        .from('annual_leave_balance')
        .update({
          total_days: newTotal,
          remaining_days: newRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId)

      if (balanceUpdateError) {
        console.error('Balance update error:', balanceUpdateError)
      }
    } else {
      // Create new balance record
      const { error: balanceInsertError } = await supabase
        .from('annual_leave_balance')
        .insert({
          employee_id: employeeId,
          total_days: days,
          used_days: 0,
          remaining_days: days,
          expiring_soon_days: 0,
          updated_at: new Date().toISOString(),
        })

      if (balanceInsertError) {
        console.error('Balance insert error:', balanceInsertError)
      }
    }

    console.log(`[연차 수동 추가] ${targetEmployee.name}님에게 ${days}일 추가 완료 (사유: ${reason})`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${targetEmployee.name}님에게 연차 ${days}일이 추가되었습니다`,
        grant: grant
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[연차 수동 추가] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
