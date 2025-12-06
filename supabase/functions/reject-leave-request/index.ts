import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  leaveRequestId: number  // 이제 document_master.id를 의미
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

    // Check if user has approval permission (either HR level >= 5 or assigned approver)
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

    const isHR = employee.role && employee.role.level >= 5

    // Check if user is an assigned approver with pending status
    const { data: approvalStep, error: stepError } = await supabase
      .from('approval_step')
      .select('id, step_order')
      .eq('request_type', 'leave')
      .eq('request_id', leaveRequestId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    const isApprover = !!approvalStep

    if (!isHR && !isApprover) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions. HR access or approver role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If user is an assigned approver, update their approval_step
    if (approvalStep) {
      const { error: stepUpdateError } = await supabase
        .from('approval_step')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          comment: rejectReason
        })
        .eq('id', approvalStep.id)

      if (stepUpdateError) {
        console.error('Error updating approval step:', stepUpdateError)
        throw new Error('Failed to update approval step')
      }

      // Create audit record (optional - ignore errors)
      await supabase
        .from('approval_step_audit')
        .insert({
          approval_step_id: approvalStep.id,
          action: 'rejected',
          actor_id: user.id,
          old_status: 'pending',
          new_status: 'rejected'
        })
    }

    // Update document_master status to rejected
    const { error: updateError } = await supabase
      .from('document_master')
      .update({
        status: 'rejected',
        current_step: null
      })
      .eq('id', leaveRequestId)

    if (updateError) {
      console.error('Error rejecting document:', updateError)
      throw new Error('Failed to reject document')
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
