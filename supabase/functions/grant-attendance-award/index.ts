// Edge Function: 분기별 만근 포상휴가 계산 및 부여
// Cron: 분기 종료 후 첫째 날 (1/1, 4/1, 7/1, 10/1) 실행
import { createSupabaseClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req) => {
  try {
    const supabase = createSupabaseClient()

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // 이전 분기 계산
    const previousQuarter = Math.floor((currentMonth - 1) / 3)
    const evaluationQuarter = previousQuarter === 0 ? 4 : previousQuarter
    const evaluationYear = previousQuarter === 0 ? currentYear - 1 : currentYear

    const awardPeriod = `${evaluationYear}-Q${evaluationQuarter}`

    // 분기 시작/종료일 계산
    const quarterStartMonth = (evaluationQuarter - 1) * 3 + 1
    const quarterEndMonth = evaluationQuarter * 3
    const quarterStart = `${evaluationYear}-${quarterStartMonth.toString().padStart(2, '0')}-01`
    const quarterEnd = new Date(evaluationYear, quarterEndMonth, 0).toISOString().split('T')[0]

    // 활성 직원 조회
    const { data: employees, error: employeesError } = await supabase
      .from('employee')
      .select('id, name, email')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (employeesError) throw employeesError

    const results = {
      qualified: [] as string[],
      unqualified: [] as string[],
      total: employees.length,
    }

    for (const employee of employees) {
      try {
        // 해당 분기 근태 기록 조회 (실제 구현 시 attendance 테이블 확인)
        // 여기서는 간단한 예시
        const { count: workDays } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', employee.id)
          .gte('date', quarterStart)
          .lte('date', quarterEnd)
          .eq('status', 'present')

        const { count: lateDays } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', employee.id)
          .gte('date', quarterStart)
          .lte('date', quarterEnd)
          .eq('status', 'late')

        // 만근 판정: 지각 0회
        const isQualified = (lateDays || 0) === 0 && (workDays || 0) > 0

        // 포상휴가 기록 생성
        const { data: awardRecord, error: awardError } = await supabase
          .from('attendance_award')
          .insert({
            employee_id: employee.id,
            award_period: awardPeriod,
            year: evaluationYear,
            quarter: evaluationQuarter,
            is_qualified: isQualified,
            required_days: 60, // 예시
            actual_days: workDays || 0,
            late_count: lateDays || 0,
          })
          .select()
          .single()

        if (awardError) throw awardError

        // 자격이 있으면 포상휴가 부여
        if (isQualified) {
          const { data: leaveGrant, error: grantError } = await supabase
            .from('annual_leave_grant')
            .insert({
              employee_id: employee.id,
              grant_type: 'award_attendance',
              granted_days: 1.0,
              granted_date: today.toISOString().split('T')[0],
              expiration_date: new Date(evaluationYear, quarterEndMonth + 3, 0)
                .toISOString()
                .split('T')[0], // 다음 분기 말
              calculation_basis: {
                type: 'attendance_award',
                award_period: awardPeriod,
                late_count: 0,
              },
              reason: `${awardPeriod} 만근 포상휴가`,
              approval_status: 'approved',
            })
            .select()
            .single()

          if (grantError) throw grantError

          // 포상휴가 기록 업데이트
          await supabase
            .from('attendance_award')
            .update({
              awarded: true,
              leave_grant_id: leaveGrant.id,
              awarded_at: new Date().toISOString(),
            })
            .eq('id', awardRecord.id)

          // 연차 잔액 업데이트
          await supabase.rpc('update_leave_balance', { p_employee_id: employee.id })

          results.qualified.push(employee.email)
        } else {
          results.unqualified.push(employee.email)
        }
      } catch (error) {
        console.error(`Failed to process award for ${employee.email}:`, error)
        results.unqualified.push(employee.email)
      }
    }

    // 배치 작업 로그
    await supabase.from('batch_job_log').insert({
      job_type: 'attendance_award',
      job_name: 'grant-attendance-award',
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      affected_rows: results.qualified.length,
      execution_details: {
        period: awardPeriod,
        ...results,
      },
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
