import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  email: string
  authUserId: string
  name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, authUserId, name }: RequestBody = await req.json()

    if (!email || !authUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and authUserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[구성원 등록 검증] 시작 - email:', email, 'authUserId:', authUserId)

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Check if email exists in invited_employees
    const { data: invitation, error: invitationError } = await supabase
      .from('invited_employees')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      console.error('[구성원 등록 검증] 초대되지 않은 이메일:', email, invitationError)
      return new Response(
        JSON.stringify({
          success: false,
          error: '등록되지 않은 이메일입니다. 관리자에게 문의하세요.',
          code: 'EMAIL_NOT_INVITED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[구성원 등록 검증] 초대 정보 확인:', invitation)

    // 2. Check if employee already exists
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employee')
      .select('id')
      .eq('id', authUserId)
      .single()

    if (existingEmployee) {
      console.log('[구성원 등록 검증] 이미 등록된 사용자')
      return new Response(
        JSON.stringify({
          success: true,
          message: '이미 등록된 사용자입니다',
          alreadyRegistered: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .insert({
        id: authUserId,
        name: name || invitation.name,
        email: invitation.email,
        department_id: invitation.department_id,
        role_id: invitation.role_id,
        employment_date: invitation.employment_date,
        phone: invitation.phone,
        location: invitation.location,
        status: 'active',
      })
      .select()
      .single()

    if (employeeError) {
      console.error('[구성원 등록 검증] employee 생성 실패:', employeeError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `구성원 정보 저장 실패: ${employeeError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[구성원 등록 검증] employee 생성 완료:', employee)

    // 4. Initialize annual_leave_balance with 0 days (for new employees)
    const { error: balanceError } = await supabase
      .from('annual_leave_balance')
      .insert({
        employee_id: authUserId,
        total_days: 0,
        used_days: 0,
        remaining_days: 0,
      })

    if (balanceError) {
      console.error('[구성원 등록 검증] annual_leave_balance 초기화 실패:', balanceError)
      // Rollback: delete employee
      await supabase.from('employee').delete().eq('id', authUserId)
      return new Response(
        JSON.stringify({
          success: false,
          error: `연차 잔액 초기화 실패: ${balanceError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[구성원 등록 검증] annual_leave_balance 초기화 완료')

    // 5. Update invited_employees status to 'registered'
    const { error: updateError } = await supabase
      .from('invited_employees')
      .update({
        status: 'registered',
        registered_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('[구성원 등록 검증] invited_employees 상태 업데이트 실패:', updateError)
      // Don't rollback, just log the error
    }

    console.log('[구성원 등록 검증] 완료')
    return new Response(
      JSON.stringify({
        success: true,
        message: '구성원 등록이 완료되었습니다',
        employee: employee
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[구성원 등록 검증] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
