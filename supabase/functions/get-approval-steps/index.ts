import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  requestType: 'leave' | 'document'
  requestId: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { requestType, requestId }: RequestBody = await req.json()

    // Validate input
    if (!requestType || !requestId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'requestType and requestId are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get leave request to verify user has access
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_request')
      .select('employee_id')
      .eq('id', requestId)
      .single()

    if (leaveError || !leaveRequest) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Leave request not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is the requester or an approver
    const { data: approverCheck } = await supabase
      .from('approval_step')
      .select('id')
      .eq('request_type', requestType)
      .eq('request_id', requestId)
      .eq('approver_id', user.id)
      .maybeSingle()

    const isRequester = leaveRequest.employee_id === user.id
    const isApprover = !!approverCheck

    if (!isRequester && !isApprover) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You do not have permission to view this request'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch all approval steps (bypassing RLS with service role)
    const { data: approvalSteps, error: stepsError } = await supabase
      .from('approval_step')
      .select(`
        id,
        step_order,
        approver_id,
        status,
        comment,
        approved_at,
        created_at,
        employee:approver_id (
          name
        )
      `)
      .eq('request_type', requestType)
      .eq('request_id', requestId)
      .order('step_order', { ascending: true })

    if (stepsError) {
      console.error('Error fetching approval steps:', stepsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch approval steps'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: approvalSteps || []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
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
