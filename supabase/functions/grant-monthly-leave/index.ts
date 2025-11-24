// Edge Function: 월차 자동 부여 (입사일 기준)
// Cron: 매일 00:00 실행
// 입사일 기준으로 매월 같은 날짜에 월차 1일 부여 (입사 1년 전까지, 만근 조건)
import { createSupabaseClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req) => {
  const startTime = new Date()
  console.log('[grant-monthly-leave] 시작:', startTime.toISOString())

  try {
    const supabase = createSupabaseClient()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayDay = today.getDate()

    console.log(`[grant-monthly-leave] 오늘 날짜: ${todayStr} (${todayDay}일)`)

    // 1. 오늘이 입사일 기준 월차 부여일인 직원 조회
    // 입사일의 day가 오늘과 같고, 입사 1년 미만인 직원
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    oneYearAgo.setDate(oneYearAgo.getDate() + 1) // 입사 1년 전날까지

    const { data: employees, error: employeesError } = await supabase
      .from('employee')
      .select('id, name, employment_date, email')
      .eq('status', 'active')
      .is('resignation_date', null)
      .gt('employment_date', oneYearAgo.toISOString().split('T')[0])

    if (employeesError) {
      console.error('[grant-monthly-leave] 직원 조회 실패:', employeesError)
      throw employeesError
    }

    // 오늘이 월차 부여일인 직원만 필터링
    // 입사일의 day가 오늘과 같고, 입사 후 최소 1개월이 지난 직원
    const eligibleEmployees = employees.filter(emp => {
      const empDate = new Date(emp.employment_date)
      const empDay = empDate.getDate()

      // 입사일의 day와 오늘의 day가 같은지 체크
      if (empDay !== todayDay) return false

      // 입사 후 최소 1개월 경과 체크
      const oneMonthAfterHire = new Date(empDate)
      oneMonthAfterHire.setMonth(oneMonthAfterHire.getMonth() + 1)
      if (today < oneMonthAfterHire) return false

      // 입사 1년 이내 체크 (입사 1년 전날까지)
      const oneYearAfterHire = new Date(empDate)
      oneYearAfterHire.setFullYear(oneYearAfterHire.getFullYear() + 1)
      if (today >= oneYearAfterHire) return false

      return true
    })

    console.log(`[grant-monthly-leave] 전체 직원: ${employees.length}명, 오늘 부여 대상: ${eligibleEmployees.length}명`)

    if (eligibleEmployees.length === 0) {
      console.log('[grant-monthly-leave] 오늘 월차 부여 대상 직원이 없습니다')
      return new Response(
        JSON.stringify({
          success: true,
          message: '오늘 월차 부여 대상 직원이 없습니다',
          total: 0,
          granted: 0
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const results = {
      success: [] as string[],
      skipped: [] as string[],
      failed: [] as string[],
      total: eligibleEmployees.length,
    }

    // 2. 배치 처리 (50명씩)
    const BATCH_SIZE = 50
    for (let i = 0; i < eligibleEmployees.length; i += BATCH_SIZE) {
      const batch = eligibleEmployees.slice(i, i + BATCH_SIZE)
      console.log(`[grant-monthly-leave] 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eligibleEmployees.length / BATCH_SIZE)} 처리 중...`)

      await Promise.allSettled(
        batch.map(async (employee) => {
          try {
            const empDate = new Date(employee.employment_date)

            // 2.1. 중복 체크 (idempotency)
            const { data: existing } = await supabase
              .from('annual_leave_grant')
              .select('id')
              .eq('employee_id', employee.id)
              .eq('grant_type', 'monthly')
              .eq('granted_date', todayStr)
              .single()

            if (existing) {
              console.log(`[grant-monthly-leave] 이미 부여됨: ${employee.email}`)
              results.skipped.push(employee.email)
              return
            }

            // 2.2. 만근 체크 (이전 달)
            // 입사일 기준 이전 달 계산
            const lastMonthStart = new Date(empDate)
            const monthsFromHire = Math.floor((today.getTime() - empDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
            lastMonthStart.setMonth(empDate.getMonth() + monthsFromHire - 1)

            const lastMonthEnd = new Date(lastMonthStart)
            lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1)
            lastMonthEnd.setDate(lastMonthEnd.getDate() - 1)

            const { data: attendanceRecords, error: attendanceError } = await supabase
              .from('attendance')
              .select('status')
              .eq('employee_id', employee.id)
              .gte('date', lastMonthStart.toISOString().split('T')[0])
              .lte('date', lastMonthEnd.toISOString().split('T')[0])

            if (attendanceError) {
              console.warn(`[grant-monthly-leave] 근태 정보 조회 실패 (${employee.email}):`, attendanceError)
              // 근태 정보가 없으면 부여하지 않음
              results.skipped.push(employee.email)
              return
            }

            // 지각 2회 이하인지 체크
            const lateCount = attendanceRecords?.filter(r => r.status === 'late').length || 0
            if (lateCount > 2) {
              console.log(`[grant-monthly-leave] 지각 횟수 초과 (${lateCount}회): ${employee.email}`)
              results.skipped.push(employee.email)
              return
            }

            // 2.3. 월차 부여
            // 만료일: 입사 1년 되는 날
            const expirationDate = new Date(empDate)
            expirationDate.setFullYear(expirationDate.getFullYear() + 1)
            expirationDate.setDate(expirationDate.getDate() - 1)

            const { error: grantError } = await supabase
              .from('annual_leave_grant')
              .insert({
                employee_id: employee.id,
                grant_type: 'monthly',
                granted_days: 1.0,
                granted_date: todayStr,
                expiration_date: expirationDate.toISOString().split('T')[0],
                calculation_basis: {
                  type: 'monthly',
                  employmentDate: employee.employment_date,
                  grantDate: todayStr,
                  lateCount: lateCount
                },
                reason: `${todayStr} 월차 자동 부여 (입사일 기준 만근)`,
                approval_status: 'approved',
              })

            if (grantError) {
              console.error(`[grant-monthly-leave] 부여 실패 (${employee.email}):`, grantError)
              throw grantError
            }

            // 2.4. 연차 잔액 업데이트
            const { error: balanceError } = await supabase.rpc('update_leave_balance', {
              p_employee_id: employee.id
            })

            if (balanceError) {
              console.error(`[grant-monthly-leave] 잔액 업데이트 실패 (${employee.email}):`, balanceError)
              throw balanceError
            }

            results.success.push(employee.email)
            console.log(`[grant-monthly-leave] 부여 완료: ${employee.email} (입사일: ${employee.employment_date})`)
          } catch (error) {
            console.error(`[grant-monthly-leave] 실패 (${employee.email}):`, error)
            results.failed.push(employee.email)
          }
        })
      )

      // Rate limiting (배치 간 대기)
      if (i + BATCH_SIZE < eligibleEmployees.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const endTime = new Date()
    const duration = (endTime.getTime() - startTime.getTime()) / 1000

    console.log(`[grant-monthly-leave] 완료 - 성공: ${results.success.length}, 건너뜀: ${results.skipped.length}, 실패: ${results.failed.length}, 소요시간: ${duration}초`)

    // 3. 배치 작업 로그 기록
    await supabase.from('batch_job_log').insert({
      job_type: 'leave_grant',
      job_name: 'grant-monthly-leave',
      status: results.failed.length > 0 ? 'partial' : 'success',
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      affected_rows: results.success.length,
      execution_details: results,
    })

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('[grant-monthly-leave] 치명적 오류:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
