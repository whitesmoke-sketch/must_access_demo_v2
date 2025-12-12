import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Armchair, Clock, MapPin } from 'lucide-react'

interface SeatReservation {
  start_time: string
  end_time: string | null
  seat?: {
    name: string
    location: string
  }[] | { name: string; location: string } | null
}

interface ReservationStatusProps {
  employeeId: string
}

export async function ReservationStatus({ employeeId }: ReservationStatusProps) {
  const supabase = await createClient()

  // Use KST timezone for accurate date matching
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

  // 오늘의 좌석 예약
  const { data: seatReservation, error } = await supabase
    .from('seat_reservation')
    .select('start_time, end_time, seat:seat_id(name, location)')
    .eq('employee_id', employeeId)
    .eq('reservation_date', today)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch seat reservation:', error)
  }

  const reservation = seatReservation as SeatReservation | null
  const hasReservation = !!reservation

  // Handle both array and object cases for seat relation
  const seat = reservation?.seat
    ? Array.isArray(reservation.seat)
      ? reservation.seat[0]
      : reservation.seat
    : null

  return (
    <Card
      className="rounded-2xl"
      style={{
        borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <CardHeader>
        <CardTitle>나의 예약 현황</CardTitle>
      </CardHeader>
      <CardContent>
        {hasReservation ? (
          <div className="space-y-3">
            {/* 좌석 정보 */}
            <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
              <Armchair className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{seat?.name ?? '알 수 없음'}</p>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  {reservation?.start_time} ~ {reservation?.end_time || '사용 중'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {seat?.location ?? '위치 미상'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>오늘 예약 없음</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
