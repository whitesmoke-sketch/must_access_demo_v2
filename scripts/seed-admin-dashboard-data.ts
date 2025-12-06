/**
 * 관리자 대시보드용 1주일치 목데이터 삽입 스크립트
 *
 * 실행: NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-admin-dashboard-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 날짜 헬퍼 함수
function getDateString(daysOffset: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

function getRandomTime(startHour: number, endHour: number): string {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour
  const minute = Math.random() > 0.5 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
}

async function main() {
  console.log('🚀 관리자 대시보드 목데이터 삽입 시작...\n')

  // 1. 기존 데이터 조회
  const { data: employees } = await supabase
    .from('employee')
    .select('id, name, department:department_id(id, name)')
    .order('name')

  const { data: seats } = await supabase
    .from('seat')
    .select('id, floor, seat_number')
    .order('floor')
    .order('seat_number')

  const { data: meetingRooms } = await supabase
    .from('meeting_room')
    .select('id, name, floor')
    .eq('is_active', true)
    .order('floor')

  if (!employees?.length || !seats?.length || !meetingRooms?.length) {
    console.error('❌ 기본 데이터(employees, seats, meeting_rooms)가 없습니다.')
    return
  }

  console.log(`📊 조회된 데이터:`)
  console.log(`   - 직원: ${employees.length}명`)
  console.log(`   - 좌석: ${seats.length}개`)
  console.log(`   - 회의실: ${meetingRooms.length}개\n`)

  // 2. 기존 목데이터 삭제
  console.log('🗑️  기존 데이터 삭제 중...')

  const today = getDateString(0)
  const weekAgo = getDateString(-7)
  const weekLater = getDateString(7)

  // 최근 데이터만 삭제 (실제 운영 데이터 보호)
  await supabase.from('seat_reservation').delete().gte('reservation_date', weekAgo).lte('reservation_date', weekLater)
  await supabase.from('meeting_room_booking').delete().gte('booking_date', weekAgo).lte('booking_date', weekLater)
  // 새 시스템: document_master + doc_leave 삭제 (leave_request 대신)
  await supabase.from('doc_leave').delete().gte('start_date', weekAgo).lte('start_date', weekLater)
  await supabase.from('document_master').delete().eq('doc_type', 'leave').gte('created_at', new Date(weekAgo).toISOString())
  await supabase.from('work_request').delete().gte('start_date', weekAgo).lte('start_date', weekLater)

  console.log('✅ 기존 데이터 삭제 완료\n')

  // 3. 좌석 예약 데이터 (오늘 ~ 7일간)
  console.log('🪑 좌석 예약 데이터 삽입 중...')

  const seatReservations: any[] = []

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = getDateString(dayOffset)
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6

    // 주말은 적은 좌석 사용
    const occupancyRate = isWeekend ? 0.1 : (0.5 + Math.random() * 0.3) // 50~80%
    const seatsToReserve = Math.floor(seats.length * occupancyRate)

    // 랜덤하게 좌석 선택
    const shuffledSeats = [...seats].sort(() => Math.random() - 0.5).slice(0, seatsToReserve)
    const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5)

    for (let i = 0; i < shuffledSeats.length && i < shuffledEmployees.length; i++) {
      seatReservations.push({
        seat_id: shuffledSeats[i].id,
        employee_id: shuffledEmployees[i].id,
        reservation_date: date,
        start_time: getRandomTime(8, 10),
        end_time: dayOffset === 0 ? null : getRandomTime(17, 19), // 오늘은 아직 사용중
        status: dayOffset === 0 ? 'in_use' : 'completed',
      })
    }
  }

  const { error: seatError } = await supabase.from('seat_reservation').insert(seatReservations)
  if (seatError) console.error('좌석 예약 삽입 에러:', seatError.message)
  else console.log(`✅ 좌석 예약 ${seatReservations.length}건 삽입 완료`)

  // 4. 회의실 예약 데이터
  console.log('🏢 회의실 예약 데이터 삽입 중...')

  const meetingBookings: any[] = []

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = getDateString(dayOffset)
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6

    if (isWeekend) continue

    for (const room of meetingRooms) {
      // 각 회의실당 2~5개 예약
      const bookingCount = Math.floor(Math.random() * 4) + 2
      let lastEndHour = 9

      for (let i = 0; i < bookingCount && lastEndHour < 18; i++) {
        const startHour = lastEndHour
        const duration = Math.random() > 0.5 ? 1 : 2
        const endHour = Math.min(startHour + duration, 18)

        const randomEmployee = employees[Math.floor(Math.random() * employees.length)]

        meetingBookings.push({
          room_id: room.id,
          booked_by: randomEmployee.id,
          title: ['정기 회의', '프로젝트 미팅', '브레인스토밍', '1:1 미팅', '팀 미팅'][Math.floor(Math.random() * 5)],
          booking_date: date,
          start_time: `${startHour.toString().padStart(2, '0')}:00`,
          end_time: `${endHour.toString().padStart(2, '0')}:00`,
          status: 'confirmed',
        })

        lastEndHour = endHour + (Math.random() > 0.5 ? 1 : 0) // 가끔 쉬는 시간
      }
    }
  }

  const { error: bookingError } = await supabase.from('meeting_room_booking').insert(meetingBookings)
  if (bookingError) console.error('회의실 예약 삽입 에러:', bookingError.message)
  else console.log(`✅ 회의실 예약 ${meetingBookings.length}건 삽입 완료`)

  // 5. 휴가 신청 데이터 (새 시스템: document_master + doc_leave)
  console.log('🏖️  휴가 신청 데이터 삽입 중...')

  const leaveTypes = [
    { type: 'annual', days: 1, name: '연차' },
    { type: 'half_day', days: 0.5, name: '반차' },
    { type: 'award', days: 1, name: '포상휴가' },
  ]

  let leaveInsertCount = 0
  let approvedCount = 0
  let pendingCount = 0

  // 휴가 중인 직원 (5~8명) - 승인된 휴가
  const vacationEmployees = [...employees].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4) + 5)

  for (const emp of vacationEmployees) {
    const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
    const startOffset = Math.floor(Math.random() * 3) // 0~2일 전부터
    const duration = leaveType.type === 'half_day' ? 1 : Math.floor(Math.random() * 3) + 1
    const daysCount = leaveType.type === 'half_day' ? 0.5 : duration

    // 1. document_master 삽입
    const { data: docMaster, error: docMasterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: emp.id,
        doc_type: 'leave',
        status: 'approved',
        current_step: 1,
        created_at: new Date(Date.now() - (startOffset + 3) * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: new Date(Date.now() - (startOffset + 2) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (docMasterError) {
      console.error('document_master 삽입 에러:', docMasterError.message)
      continue
    }

    // 2. doc_leave 삽입
    const { error: docLeaveError } = await supabase
      .from('doc_leave')
      .insert({
        document_id: docMaster.id,
        leave_type: leaveType.type,
        start_date: getDateString(-startOffset),
        end_date: getDateString(-startOffset + duration - 1),
        days_count: daysCount,
        half_day_slot: leaveType.type === 'half_day' ? (Math.random() > 0.5 ? 'morning' : 'afternoon') : null,
        reason: `${leaveType.name} 신청`,
      })

    if (docLeaveError) {
      console.error('doc_leave 삽입 에러:', docLeaveError.message)
    } else {
      leaveInsertCount++
      approvedCount++
    }
  }

  // 승인 대기 중인 휴가 (3~5건)
  const pendingVacationEmployees = [...employees]
    .filter(e => !vacationEmployees.includes(e))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 3)

  for (const emp of pendingVacationEmployees) {
    const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
    const startOffset = Math.floor(Math.random() * 5) + 1 // 1~5일 후
    const duration = leaveType.type === 'half_day' ? 1 : Math.floor(Math.random() * 3) + 1
    const daysCount = leaveType.type === 'half_day' ? 0.5 : duration

    // 1. document_master 삽입
    const { data: docMaster, error: docMasterError } = await supabase
      .from('document_master')
      .insert({
        requester_id: emp.id,
        doc_type: 'leave',
        status: 'pending',
        current_step: 1,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (docMasterError) {
      console.error('document_master 삽입 에러:', docMasterError.message)
      continue
    }

    // 2. doc_leave 삽입
    const { error: docLeaveError } = await supabase
      .from('doc_leave')
      .insert({
        document_id: docMaster.id,
        leave_type: leaveType.type,
        start_date: getDateString(startOffset),
        end_date: getDateString(startOffset + (leaveType.type === 'half_day' ? 0 : Math.floor(Math.random() * 2))),
        days_count: daysCount,
        half_day_slot: leaveType.type === 'half_day' ? (Math.random() > 0.5 ? 'morning' : 'afternoon') : null,
        reason: `${leaveType.name} 신청`,
      })

    if (docLeaveError) {
      console.error('doc_leave 삽입 에러:', docLeaveError.message)
    } else {
      leaveInsertCount++
      pendingCount++
    }
  }

  console.log(`✅ 휴가 신청 ${leaveInsertCount}건 삽입 완료 (승인: ${approvedCount}, 대기: ${pendingCount})`)

  // 6. 근무 신청 데이터 (work_request) - 재택, 외근, 출장
  console.log('💼 근무 신청 데이터 삽입 중...')

  const workRequests: any[] = []
  const workTypes = [
    { type: 'remote', name: '재택' },
    { type: 'field_work', name: '외근' },
    { type: 'business_trip', name: '출장' },
  ]

  // 재택 근무자 (3~5명)
  const remoteEmployees = [...employees]
    .filter(e => !vacationEmployees.includes(e))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 3)

  for (const emp of remoteEmployees) {
    workRequests.push({
      employee_id: emp.id,
      work_type: 'remote',
      start_date: today,
      end_date: today,
      reason: '재택 근무',
      status: 'approved',
      requested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  // 외근/출장자 (2~4명)
  const fieldEmployees = [...employees]
    .filter(e => !vacationEmployees.includes(e) && !remoteEmployees.includes(e))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 3) + 2)

  for (const emp of fieldEmployees) {
    const workType = Math.random() > 0.5 ? 'field_work' : 'business_trip'
    const duration = workType === 'business_trip' ? Math.floor(Math.random() * 3) + 1 : 1

    workRequests.push({
      employee_id: emp.id,
      work_type: workType,
      start_date: today,
      end_date: getDateString(duration - 1),
      reason: workType === 'field_work' ? '고객사 미팅' : '지방 출장',
      destination: workType === 'field_work' ? '강남 고객사' : '부산 지사',
      status: 'approved',
      requested_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  const { error: workError } = await supabase.from('work_request').insert(workRequests)
  if (workError) console.error('근무 신청 삽입 에러:', workError.message)
  else console.log(`✅ 근무 신청 ${workRequests.length}건 삽입 완료`)

  // 7. 스튜디오 출입 상태 확인/업데이트
  console.log('🎬 스튜디오 출입 상태 확인 중...')

  const { data: studioAccess, error: studioError } = await supabase
    .from('studio_access')
    .select('*')
    .eq('location', 'B1F_STUDIO')
    .single()

  if (!studioAccess) {
    const { error: insertError } = await supabase
      .from('studio_access')
      .insert({
        location: 'B1F_STUDIO',
        status: Math.random() > 0.7 ? 'restricted' : 'available',
        reason: Math.random() > 0.7 ? '브랜드 리뉴얼 프로젝트 촬영' : null,
      })
    if (insertError) console.error('스튜디오 상태 삽입 에러:', insertError.message)
    else console.log('✅ 스튜디오 출입 상태 삽입 완료')
  } else {
    console.log('✅ 스튜디오 출입 상태 이미 존재')
  }

  console.log('\n🎉 목데이터 삽입 완료!')

  // 결과 요약
  console.log('\n📊 삽입 결과 요약:')
  console.log(`   - 좌석 예약: ${seatReservations.length}건`)
  console.log(`   - 회의실 예약: ${meetingBookings.length}건`)
  console.log(`   - 휴가 신청: ${leaveInsertCount}건 (승인: ${approvedCount}, 대기: ${pendingCount})`)
  console.log(`   - 근무 신청: ${workRequests.length}건 (재택: ${workRequests.filter(w => w.work_type === 'remote').length}, 외근/출장: ${workRequests.filter(w => w.work_type !== 'remote').length})`)
}

main().catch(console.error)
