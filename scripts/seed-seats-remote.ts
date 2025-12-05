import { createClient } from '@supabase/supabase-js'

// 원격 Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const seats = [
  // 2층 좌석 (A구역)
  { seat_number: 'A-201', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-202', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-203', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-204', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-205', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-206', floor: 2, area: 'A구역', seat_type: 'standing', amenities: { monitor: true, usb_port: true, standing_desk: true }, is_available: true },
  { seat_number: 'A-207', floor: 2, area: 'A구역', seat_type: 'standing', amenities: { monitor: true, usb_port: true, standing_desk: true }, is_available: true },
  { seat_number: 'A-208', floor: 2, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 2층 좌석 (B구역)
  { seat_number: 'B-201', floor: 2, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-202', floor: 2, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-203', floor: 2, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-204', floor: 2, area: 'B구역', seat_type: 'premium', amenities: { monitor: true, usb_port: true, dual_monitor: true }, is_available: true },
  { seat_number: 'B-205', floor: 2, area: 'B구역', seat_type: 'premium', amenities: { monitor: true, usb_port: true, dual_monitor: true }, is_available: true },
  { seat_number: 'B-206', floor: 2, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 3층 좌석 (A구역)
  { seat_number: 'A-301', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-302', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-303', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-304', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-305', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-306', floor: 3, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 3층 좌석 (B구역)
  { seat_number: 'B-301', floor: 3, area: 'B구역', seat_type: 'focus', amenities: { monitor: true, usb_port: true, partition: true }, is_available: true },
  { seat_number: 'B-302', floor: 3, area: 'B구역', seat_type: 'focus', amenities: { monitor: true, usb_port: true, partition: true }, is_available: true },
  { seat_number: 'B-303', floor: 3, area: 'B구역', seat_type: 'focus', amenities: { monitor: true, usb_port: true, partition: true }, is_available: true },
  { seat_number: 'B-304', floor: 3, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-305', floor: 3, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 4층 좌석 (A구역)
  { seat_number: 'A-401', floor: 4, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-402', floor: 4, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-403', floor: 4, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-404', floor: 4, area: 'A구역', seat_type: 'premium', amenities: { monitor: true, usb_port: true, dual_monitor: true }, is_available: true },
  { seat_number: 'A-405', floor: 4, area: 'A구역', seat_type: 'premium', amenities: { monitor: true, usb_port: true, dual_monitor: true }, is_available: true },
  { seat_number: 'A-406', floor: 4, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 4층 좌석 (B구역) - 일부 점검 중
  { seat_number: 'B-401', floor: 4, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-402', floor: 4, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-403', floor: 4, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: false },
  { seat_number: 'B-404', floor: 4, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-405', floor: 4, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: false },

  // 5층 좌석 (A구역)
  { seat_number: 'A-501', floor: 5, area: 'A구역', seat_type: 'executive', amenities: { monitor: true, usb_port: true, dual_monitor: true, ergonomic_chair: true }, is_available: true },
  { seat_number: 'A-502', floor: 5, area: 'A구역', seat_type: 'executive', amenities: { monitor: true, usb_port: true, dual_monitor: true, ergonomic_chair: true }, is_available: true },
  { seat_number: 'A-503', floor: 5, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'A-504', floor: 5, area: 'A구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },

  // 5층 좌석 (B구역)
  { seat_number: 'B-501', floor: 5, area: 'B구역', seat_type: 'focus', amenities: { monitor: true, usb_port: true, partition: true }, is_available: true },
  { seat_number: 'B-502', floor: 5, area: 'B구역', seat_type: 'focus', amenities: { monitor: true, usb_port: true, partition: true }, is_available: true },
  { seat_number: 'B-503', floor: 5, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
  { seat_number: 'B-504', floor: 5, area: 'B구역', seat_type: 'standard', amenities: { monitor: true, usb_port: true }, is_available: true },
]

async function seedSeats() {
  console.log('원격 DB에 좌석 데이터 삽입 시작...')
  console.log('Supabase URL:', supabaseUrl)

  // 기존 데이터 확인
  const { data: existingSeats, error: checkError } = await supabase
    .from('seat')
    .select('seat_number')

  if (checkError) {
    console.error('기존 데이터 확인 실패:', checkError)
    return
  }

  console.log(`기존 좌석 수: ${existingSeats?.length || 0}`)

  if (existingSeats && existingSeats.length > 0) {
    console.log('이미 좌석 데이터가 존재합니다. 스킵합니다.')
    return
  }

  // 데이터 삽입
  const { data, error } = await supabase
    .from('seat')
    .insert(seats)
    .select()

  if (error) {
    console.error('좌석 데이터 삽입 실패:', error)
    return
  }

  console.log(`성공적으로 ${data.length}개의 좌석 데이터를 삽입했습니다.`)

  // 층별 통계
  const floorStats = seats.reduce((acc, seat) => {
    acc[seat.floor] = (acc[seat.floor] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  console.log('층별 좌석 수:')
  Object.entries(floorStats).forEach(([floor, count]) => {
    console.log(`  ${floor}층: ${count}석`)
  })
}

seedSeats()
