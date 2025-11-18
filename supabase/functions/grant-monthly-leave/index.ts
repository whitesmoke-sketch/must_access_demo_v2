// Edge Function: 매월 1일 연차 자동 부여
// Cron: 매월 1일 00:00 실행
import { createSupabaseClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req) => {
  try {
    const supabase = createSupabaseClient()

    // 활성화된 직원 목록 조회
    const { data: employees, error: employeesError } = await supabase
      .from('employee')
      .select('id, name, employment_date, email')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (employeesError) throw employeesError

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    const results = {
      success: [] as string[],
      failed: [] as string[],
      total: employees.length,
    }

    for (const employee of employees) {
      try {
        // 월차 부여 로직 (예: 매월 1일씩 부여)
        const { error: grantError } = await supabase
          .from('annual_leave_grant')
          .insert({
            employee_id: employee.id,
            grant_type: 'monthly',
            granted_days: 1.0,
            granted_date: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
            expiration_date: `${currentYear + 1}-12-31`, // 다음 해 말까지
            calculation_basis: {
              type: 'monthly',
              year: currentYear,
              month: currentMonth,
            },
            reason: `${currentYear}년 ${currentMonth}월 월차 자동 부여`,
            approval_status: 'approved',
          })

        if (grantError) throw grantError

        // 연차 잔액 업데이트
        await supabase.rpc('update_leave_balance', { p_employee_id: employee.id })

        results.success.push(employee.email)
      } catch (error) {
        console.error(`Failed to grant leave for ${employee.email}:`, error)
        results.failed.push(employee.email)
      }
    }

    // 배치 작업 로그 기록
    await supabase.from('batch_job_log').insert({
      job_type: 'leave_grant',
      job_name: 'grant-monthly-leave',
      status: results.failed.length > 0 ? 'failed' : 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      affected_rows: results.success.length,
      execution_details: results,
    })

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
