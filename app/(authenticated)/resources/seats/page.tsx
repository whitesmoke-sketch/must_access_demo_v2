'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, MapPin, Clock, QrCode, Loader2 } from 'lucide-react'
import { SeatListView } from '@/components/seats/SeatListView'
import { toast } from 'sonner'
import { QRSeatReservation } from '@/components/seats/QRSeatReservation'
import {
  getAllSeats,
  getTodaySeatReservations,
  getMyCurrentSeatReservation,
  startUsingSeat,
  endUsingSeat,
  type Seat,
  type SeatReservation
} from '@/app/actions/seat'

interface SeatWithStatus extends Seat {
  status: 'available' | 'in_use' | 'maintenance'
  currentUserId?: string
  currentUserName?: string
  startTime?: string
  reservationId?: number
}

export default function SeatsPage() {
  const [selectedFloor, setSelectedFloor] = useState('2')
  const [seats, setSeats] = useState<SeatWithStatus[]>([])
  const [selectedSeat, setSelectedSeat] = useState<SeatWithStatus | null>(null)
  const [showQRView, setShowQRView] = useState(false)
  const [qrSeat, setQrSeat] = useState<SeatWithStatus | null>(null)
  const [myReservation, setMyReservation] = useState<SeatReservation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [seatsResult, reservationsResult, myReservationResult] = await Promise.all([
        getAllSeats(),
        getTodaySeatReservations(),
        getMyCurrentSeatReservation()
      ])

      if (seatsResult.success && seatsResult.data) {
        // 좌석 데이터에 예약 상태 매핑
        const reservationsMap = new Map<number, any>()
        if (reservationsResult.success && reservationsResult.data) {
          reservationsResult.data.forEach((res: any) => {
            reservationsMap.set(res.seat_id, res)
          })
        }

        const seatsWithStatus: SeatWithStatus[] = seatsResult.data.map((seat: Seat) => {
          const reservation = reservationsMap.get(seat.id)
          return {
            ...seat,
            status: !seat.is_available ? 'maintenance' : reservation ? 'in_use' : 'available',
            currentUserId: reservation?.employee_id,
            currentUserName: reservation?.employee?.name,
            startTime: reservation?.start_time?.slice(0, 5),
            reservationId: reservation?.id
          }
        })

        setSeats(seatsWithStatus)
      }

      if (myReservationResult.success) {
        setMyReservation(myReservationResult.data)
      }
    } catch (error) {
      console.error('Load data error:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 내 현재 좌석
  const myCurrentSeat = useMemo(() => {
    if (!myReservation) return null
    return seats.find(s => s.id === myReservation.seat_id)
  }, [seats, myReservation])

  // 층별 좌석 필터링
  const floorSeats = useMemo(() => {
    return seats.filter(s => s.floor === parseInt(selectedFloor))
  }, [seats, selectedFloor])

  // 좌석 사용 시작
  const handleStartUsing = async (seatId: number) => {
    if (myCurrentSeat) {
      toast.error('이미 사용 중인 좌석이 있습니다', {
        description: `현재 ${myCurrentSeat.seat_number} 좌석을 사용 중입니다. 먼저 반납해주세요.`,
      })
      return
    }

    startTransition(async () => {
      const result = await startUsingSeat(seatId)
      if (result.success) {
        toast.success('좌석 사용이 시작되었습니다')
        setSelectedSeat(null)
        await loadData() // 데이터 새로고침
      } else {
        toast.error(result.error || '좌석 사용 시작에 실패했습니다')
      }
    })
  }

  // 좌석 반납
  const handleEndUsing = async (reservationId: number) => {
    startTransition(async () => {
      const result = await endUsingSeat(reservationId)
      if (result.success) {
        toast.success('좌석 반납이 완료되었습니다')
        setSelectedSeat(null)
        await loadData() // 데이터 새로고침
      } else {
        toast.error(result.error || '좌석 반납에 실패했습니다')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-h1)', lineHeight: 1.25 }}>
          자유석 관리
        </h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }} className="mt-1">
          사무실 좌석 배치도를 확인하고 자유석을 예약합니다
        </p>
      </div>

      {/* My Current Seat Info */}
      {myCurrentSeat && myReservation && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--secondary-bg)',
          border: '2px solid var(--secondary)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  lineHeight: 1.5
                }}>
                  {myCurrentSeat.seat_number}
                </h3>
                <Badge className="!border-0" style={{
                  backgroundColor: 'var(--secondary-bg)',
                  color: 'var(--secondary)',
                  fontSize: '12px',
                  padding: '2px 8px',
                }}>
                  내 좌석
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <span style={{
                  fontSize: '14px',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}>
                  {myCurrentSeat.floor}층 {myCurrentSeat.area}
                </span>

                {myCurrentSeat.startTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.5
                    }}>
                      {myCurrentSeat.startTime}부터
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={() => handleEndUsing(myReservation.id)}
                disabled={isPending}
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                  minWidth: '88px',
                  height: '40px',
                }}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '반납'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floor Selector Tabs */}
      <Tabs defaultValue="2" value={selectedFloor} onValueChange={setSelectedFloor} className="w-full">
        <TabsList
          className="w-full"
          style={{
            backgroundColor: 'var(--card)',
            height: '48px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {['2', '3', '4', '5'].map((floor) => (
            <TabsTrigger
              key={floor}
              value={floor}
              className="flex-1"
            >
              <span>{floor}층</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {['2', '3', '4', '5'].map((floor) => (
          <TabsContent key={floor} value={floor} className="mt-6 space-y-6">
            {/* Legend */}
            <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 가능 ({seats.filter(s => s.floor === parseInt(floor) && s.status === 'available').length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--primary)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 중 ({seats.filter(s => s.floor === parseInt(floor) && s.status === 'in_use').length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--destructive)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 불가 ({seats.filter(s => s.floor === parseInt(floor) && s.status === 'maintenance').length})
                    </span>
                  </div>
                  {myCurrentSeat && myCurrentSeat.floor === parseInt(floor) && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--secondary)' }} />
                      <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>내 좌석</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Seat Map Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seat Map - Coming Soon */}
              <div className="lg:col-span-2">
                <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
                  <CardContent className="p-6">
                    <div
                      className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center"
                      style={{
                        height: '550px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="text-center">
                        <p style={{ fontSize: 'var(--font-size-h2)', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                          평면도 구현 예정
                        </p>
                        <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
                          좌석 배치도 기능이 곧 제공될 예정입니다
                        </p>
                        <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
                          아래 리스트에서 좌석을 선택해주세요
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Seat Details Panel */}
              <div className="lg:col-span-1">
                <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
                  <CardContent className="p-6">
                    {selectedSeat ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, color: 'var(--foreground)' }}>
                              {selectedSeat.seat_number}
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)', marginTop: '4px' }}>
                              {selectedSeat.floor}층 {selectedSeat.area}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSeat(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                            <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                              {selectedSeat.floor}층 {selectedSeat.area}
                            </span>
                          </div>

                          {selectedSeat.seat_type && (
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)' }}>
                                좌석 유형:
                              </span>
                              <Badge className="!border-0" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>
                                {selectedSeat.seat_type === 'standard' ? '일반' :
                                  selectedSeat.seat_type === 'standing' ? '스탠딩' :
                                    selectedSeat.seat_type === 'focus' ? '집중석' :
                                      selectedSeat.seat_type === 'premium' ? '프리미엄' :
                                        selectedSeat.seat_type === 'executive' ? '임원석' : selectedSeat.seat_type}
                              </Badge>
                            </div>
                          )}

                          {selectedSeat.status === 'in_use' && selectedSeat.startTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                              <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                                {selectedSeat.startTime}부터 사용 중
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)' }}>
                              상태
                            </span>
                            {selectedSeat.status === 'available' && (
                              <Badge className="!border-0" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                                사용 가능
                              </Badge>
                            )}
                            {selectedSeat.status === 'in_use' && (
                              <Badge className="!border-0" style={{ backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' }}>
                                사용 중
                              </Badge>
                            )}
                            {selectedSeat.status === 'maintenance' && (
                              <Badge className="!border-0" style={{ backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' }}>
                                사용 불가
                              </Badge>
                            )}
                          </div>
                        </div>

                        {selectedSeat.status === 'available' && (
                          <div className="pt-4 space-y-3">
                            <Button
                              className="w-full"
                              onClick={() => handleStartUsing(selectedSeat.id)}
                              disabled={isPending}
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)',
                              }}
                            >
                              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              사용 시작
                            </Button>
                            <div
                              className="p-3 rounded-lg"
                              style={{
                                backgroundColor: 'var(--muted)',
                                border: '1px solid var(--border)'
                              }}
                            >
                              <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                                좌석 사용 시작 시 대시보드에 현재 좌석으로 표시됩니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedSeat.status === 'in_use' && myReservation && selectedSeat.id === myReservation.seat_id && (
                          <div className="pt-4 space-y-3">
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => handleEndUsing(myReservation.id)}
                              disabled={isPending}
                              style={{
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)',
                              }}
                            >
                              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              좌석 반납
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MapPin className="w-12 h-12 mb-4" style={{ color: 'var(--muted-foreground)', opacity: 0.3 }} />
                        <p style={{ fontSize: '14px', lineHeight: 1.4, color: 'var(--muted-foreground)' }}>
                          좌석을 선택하면
                          <br />
                          상세 정보가 표시됩니다
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Seat List View */}
      <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
        <CardContent className="p-6">
          <p style={{
            fontSize: '14px',
            color: 'var(--muted-foreground)',
            lineHeight: 1.5,
            marginBottom: '16px'
          }}>
            {selectedFloor}층 좌석 목록
          </p>
          <div className="space-y-2">
            {floorSeats.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px' }}>
                해당 층에 좌석이 없습니다
              </p>
            ) : (
              floorSeats.map((seat) => {
                const isMyCurrentSeat = myReservation && seat.id === myReservation.seat_id
                return (
                  <div
                    key={seat.id}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: isMyCurrentSeat ? 'var(--secondary-bg)' : 'var(--muted)',
                      border: isMyCurrentSeat ? '2px solid var(--secondary)' : '1px solid transparent',
                    }}
                    onClick={() => setSelectedSeat(seat)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            isMyCurrentSeat ? 'var(--secondary)' :
                              seat.status === 'available' ? 'var(--success)' :
                                seat.status === 'in_use' ? 'var(--primary)' : 'var(--destructive)'
                        }}
                      />
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>
                          {seat.seat_number}
                          {isMyCurrentSeat && (
                            <Badge className="!border-0 ml-2" style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', fontSize: '10px' }}>
                              내 좌석
                            </Badge>
                          )}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                          {seat.area} · {seat.seat_type === 'standard' ? '일반' :
                            seat.seat_type === 'standing' ? '스탠딩' :
                              seat.seat_type === 'focus' ? '집중석' :
                                seat.seat_type === 'premium' ? '프리미엄' :
                                  seat.seat_type === 'executive' ? '임원석' : seat.seat_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {seat.status === 'available' && !isMyCurrentSeat && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartUsing(seat.id)
                          }}
                          disabled={isPending || !!myCurrentSeat}
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                          }}
                        >
                          사용
                        </Button>
                      )}
                      {isMyCurrentSeat && myReservation && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEndUsing(myReservation.id)
                          }}
                          disabled={isPending}
                          style={{
                            borderColor: 'var(--secondary)',
                            color: 'var(--secondary)',
                          }}
                        >
                          반납
                        </Button>
                      )}
                      {seat.status === 'in_use' && !isMyCurrentSeat && (
                        <Badge className="!border-0" style={{ backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' }}>
                          사용 중
                        </Badge>
                      )}
                      {seat.status === 'maintenance' && (
                        <Badge className="!border-0" style={{ backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' }}>
                          점검 중
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
