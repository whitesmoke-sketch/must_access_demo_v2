// Edge Function: 연차 자동 부여 (회계연도 기준)
// Cron: 매년 1월 1일 00:00 실행
// 전년도 근속일수 비례 계산하여 연차 부여
// 계산식: (전년도 근속일수 ÷ 365) × 15일, 0.5 미만 버림
import { createSupabaseClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req) => {
  const startTime = new Date()
  console.log('[grant-annual-leave] 시작:', startTime.toISOString())

  try {
    const supabase = createSupabaseClient()

    const today = new Date()
    const currentYear = today.getFullYear()
    const lastYear = currentYear - 1

    console.log(`[grant-annual-leave] ${currentYear}년 연차 부여 (${lastYear}년 근속 기준)`)

    // 1. 모든 활성 직원 조회
    const { data: employees, error: employeesError } = await supabase
      .from('employee')
      .select('id, name, employment_date, email')
      .eq('status', 'active')
      .is('resignation_date', null)
      .lte('employment_date', `${lastYear}-12-31`) // 전년도 말 이전에 입사한 직원만

    if (employeesError) {
      console.error('[grant-annual-leave] 직원 조회 실패:', employeesError)
      throw employeesError
    }

    console.log(`[grant-annual-leave] 대상 직원: ${employees.length}명`)

    if (employees.length === 0) {
      console.log('[grant-annual-leave] 연차 부여 대상 직원이 없습니다')
      return new Response(
        JSON.stringify({
          success: true,
          message: '연차 부여 대상 직원이 없습니다',
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
      success: [] as Array<{ email: string; days: number; workedDays: number }>,
      skipped: [] as string[],
      failed: [] as string[],
      total: employees.length,
    }

    // 2. 배치 처리 (50명씩)
    const BATCH_SIZE = 50
    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
      const batch = employees.slice(i, i + BATCH_SIZE)
      console.log(`[grant-annual-leave] 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(employees.length / BATCH_SIZE)} 처리 중...`)

      await Promise.allSettled(
        batch.map(async (employee) => {
          try {
            const empDate = new Date(employee.employment_date)
            const empYear = empDate.getFullYear()

            // 2.1. 중복 체크 (idempotency)
            const { data: existing } = await supabase
              .from('annual_leave_grant')
              .select('id')
              .eq('employee_id', employee.id)
              .eq('grant_type', 'annual')
              .eq('granted_date', `${currentYear}-01-01`)
              .single()

            if (existing) {
              console.log(`[grant-annual-leave] 이미 부여됨: ${employee.email}`)
              results.skipped.push(employee.email)
              return
            }

            // 2.2. 전년도 근속일수 계산
            let workedDays = 0
            const lastYearStart = new Date(lastYear, 0, 1) // 1월 1일
            const lastYearEnd = new Date(lastYear, 11, 31) // 12월 31일

            // 입사일이 전년도보다 이전이면 전년도 전체 (365일)
            // 입사일이 전년도 안이면 입사일부터 12월 31일까지
            if (empYear < lastYear) {
              workedDays = 365
            } else if (empYear === lastYear) {
              // 입사일부터 12월 31일까지 일수 계산
              const diffTime = lastYearEnd.getTime() - empDate.getTime()
              workedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include start date
            }

            // 2.3. 연차 일수 계산 (비례 계산)
            const annualLeaveDays = Math.floor((workedDays / 365) * 15)

            // 0일이면 부여 안 함
            if (annualLeaveDays === 0) {
              console.log(`[grant-annual-leave] 근속일수 부족 (${workedDays}일): ${employee.email}`)
              results.skipped.push(employee.email)
              return
            }

            console.log(`[grant-annual-leave] ${employee.email} - 근속일수: ${workedDays}일, 연차: ${annualLeaveDays}일`)

            // 2.4. 연차 부여
            const { error: grantError } = await supabase
              .from('annual_leave_grant')
              .insert({
                employee_id: employee.id,
                grant_type: 'annual',
                granted_days: annualLeaveDays,
                granted_date: `${currentYear}-01-01`,
                expiration_date: `${currentYear}-12-31`,
                calculation_basis: {
                  type: 'annual_fiscal_year',
                  fiscalYear: currentYear,
                  baseYear: lastYear,
                  workedDays: workedDays,
                  employmentDate: employee.employment_date
                },
                reason: `${currentYear}년 연차 자동 부여 (${lastYear}년 근속 ${workedDays}일 기준)`,
                approval_status: 'approved',
              })

            if (grantError) {
              console.error(`[grant-annual-leave] 부여 실패 (${employee.email}):`, grantError)
              throw grantError
            }

            // 2.5. 연차 잔액 업데이트
            const { error: balanceError } = await supabase.rpc('update_leave_balance', {
              p_employee_id: employee.id
            })

            if (balanceError) {
              console.error(`[grant-annual-leave] 잔액 업데이트 실패 (${employee.email}):`, balanceError)
              throw balanceError
            }

            results.success.push({
              email: employee.email,
              days: annualLeaveDays,
              workedDays: workedDays
            })
            console.log(`[grant-annual-leave] 부여 완료: ${employee.email} - ${annualLeaveDays}일`)
          } catch (error) {
            console.error(`[grant-annual-leave] 실패 (${employee.email}):`, error)
            results.failed.push(employee.email)
          }
        })
      )

      // Rate limiting (배치 간 대기)
      if (i + BATCH_SIZE < employees.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const endTime = new Date()
    const duration = (endTime.getTime() - startTime.getTime()) / 1000

    console.log(`[grant-annual-leave] 완료 - 성공: ${results.success.length}, 건너뜀: ${results.skipped.length}, 실패: ${results.failed.length}, 소요시간: ${duration}초`)

    // 3. 배치 작업 로그 기록
    await supabase.from('batch_job_log').insert({
      job_type: 'leave_grant',
      job_name: 'grant-annual-leave',
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
    console.error('[grant-annual-leave] 치명적 오류:', error)
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
