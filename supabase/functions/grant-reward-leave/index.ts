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

    // Check if user is HR (role.level >= 5)
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .select('id, role:role_id(level)')
      .eq('id', user.id)
      .single()

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!employee.role || employee.role.level < 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions. HR access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert reward leave grant
    const grantedDate = new Date()
    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1) // 1년 후 만료

    const { error: insertError } = await supabase
      .from('annual_leave_grant')
      .insert({
        employee_id: employeeId,
        grant_type: 'award_overtime', // 포상휴가
        granted_days: days,
        granted_date: grantedDate.toISOString().split('T')[0],
        expiration_date: expirationDate.toISOString().split('T')[0],
        reason,
        requester_id: user.id,
        approver_id: user.id,
        approval_status: 'approved',
        approval_date: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Error granting reward leave:', insertError)
      throw new Error('Failed to grant reward leave')
    }

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
