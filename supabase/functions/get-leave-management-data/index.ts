import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // 모든 쿼리를 병렬로 실행 (성능 최적화)
    const [employeesResult, rewardGrantsResult, rewardUsageResult, leaveRequestsResult] = await Promise.all([
      // Fetch all employees with their leave balances
      supabase
        .from('employee')
        .select(`
          id,
          name,
          status,
          department:department_id(id, name),
          role:role_id(id, name),
          annual_leave_balance(total_days, used_days, remaining_days)
        `)
        .eq('status', 'active')
        .order('name'),
      // Fetch reward leave grants (award_overtime, award_attendance)
      supabase
        .from('annual_leave_grant')
        .select('employee_id, granted_days')
        .in('grant_type', ['award_overtime', 'award_attendance'])
        .eq('approval_status', 'approved'),
      // Fetch reward leave usage
      supabase
        .from('leave_request')
        .select('employee_id, requested_days')
        .eq('leave_type', 'award')
        .eq('status', 'approved'),
      // Fetch all leave requests
      supabase
        .from('leave_request')
        .select(`
          id,
          employee_id,
          leave_type,
          requested_days,
          start_date,
          end_date,
          reason,
          status,
          rejection_reason,
          requested_at,
          approved_at,
          employee:employee_id(id, name),
          approver:approver_id(id, name)
        `)
        .order('requested_at', { ascending: false })
    ])

    const { data: employees, error: employeesError } = employeesResult
    const { data: rewardGrants, error: rewardGrantsError } = rewardGrantsResult
    const { data: rewardUsage, error: rewardUsageError } = rewardUsageResult
    const { data: leaveRequests, error: leaveRequestsError } = leaveRequestsResult

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw new Error('Failed to fetch employees')
    }

    if (rewardGrantsError) {
      console.error('Error fetching reward grants:', rewardGrantsError)
    }

    if (rewardUsageError) {
      console.error('Error fetching reward usage:', rewardUsageError)
    }

    if (leaveRequestsError) {
      console.error('Error fetching leave requests:', leaveRequestsError)
      throw new Error('Failed to fetch leave requests')
    }

    // Calculate reward leave totals
    const rewardGrantMap = new Map<string, number>()
    const rewardUsageMap = new Map<string, number>()

    rewardGrants?.forEach(grant => {
      const current = rewardGrantMap.get(grant.employee_id) || 0
      rewardGrantMap.set(grant.employee_id, current + Number(grant.granted_days))
    })

    rewardUsage?.forEach(usage => {
      const current = rewardUsageMap.get(usage.employee_id) || 0
      rewardUsageMap.set(usage.employee_id, current + Number(usage.requested_days))
    })

    // Map to Member format
    const members = employees?.map(emp => ({
      id: emp.id,
      name: emp.name,
      team: emp.department?.name || '미지정',
      position: emp.role?.name || '미지정',
      annualLeave: Number(emp.annual_leave_balance?.total_days || 0),
      usedAnnualLeave: Number(emp.annual_leave_balance?.used_days || 0),
      rewardLeave: rewardGrantMap.get(emp.id) || 0,
      usedRewardLeave: rewardUsageMap.get(emp.id) || 0,
    })) || []

    // Map to LeaveRequest format
    const leaveRequestsFormatted = leaveRequests?.map(req => {
      let mappedLeaveType: 'annual' | 'reward' | 'sick' | 'other' = 'annual'
      if (req.leave_type === 'award') {
        mappedLeaveType = 'reward'
      } else if (['annual', 'half_day', 'quarter_day'].includes(req.leave_type)) {
        mappedLeaveType = 'annual'
      }

      return {
        id: String(req.id),
        memberId: req.employee_id,
        memberName: req.employee?.name || '알 수 없음',
        leaveType: mappedLeaveType,
        startDate: req.start_date,
        endDate: req.end_date,
        days: Number(req.requested_days) || 0,
        reason: req.reason || undefined,
        status: req.status,
        submittedAt: req.requested_at,
        reviewedBy: req.approver?.name || undefined,
        reviewedAt: req.approved_at || undefined,
        rejectReason: req.rejection_reason || undefined,
      }
    }) || []

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          members,
          leaveRequests: leaveRequestsFormatted,
        }
      }),
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
