'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, MapPin, Clock, Armchair, Wrench, QrCode } from 'lucide-react'
import { demoSeats } from '@/lib/demo-data/seats'
import { SeatListView } from '@/components/seats/SeatListView'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRSeatReservation } from '@/components/seats/QRSeatReservation'

export default function SeatsPage() {
  const [selectedFloor, setSelectedFloor] = useState('1')
  const [seats, setSeats] = useState(demoSeats)
  const [selectedSeat, setSelectedSeat] = useState<typeof demoSeats[0] | null>(null)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testSeat, setTestSeat] = useState<typeof demoSeats[0] | null>(null)
  const [showQRView, setShowQRView] = useState(false)
  const [qrSeat, setQrSeat] = useState<typeof demoSeats[0] | null>(null)
  const currentUserId = 'current-user-id' // TODO: Get from auth

  // Get current user's seat
  const myCurrentSeat = useMemo(() => {
    return seats.find(s => s.currentUserId === currentUserId)
  }, [seats, currentUserId])

  // Filter seats by floor
  const floorSeats = useMemo(() => {
    return seats.filter(s => s.location.startsWith(`${selectedFloor}층`))
  }, [seats, selectedFloor])

  const handleStartUsing = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    if (!seat) return

    if (myCurrentSeat) {
      toast.error('이미 사용 중인 좌석이 있습니다', {
        description: `현재 ${myCurrentSeat.name} 좌석을 사용 중입니다. 먼저 반납해주세요.`,
      })
      return
    }

    setSeats(prev => prev.map(s =>
      s.id === seatId
        ? {
          ...s,
          status: 'in_use' as const,
          currentUserId: currentUserId,
          startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        }
        : s
    ))

    toast.success('좌석 사용이 시작되었습니다', {
      description: `${seat.name} 좌석 사용을 시작했습니다.`,
    })

    setSelectedSeat(null)
  }

  const handleEndUsing = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    if (!seat) return

    setSeats(prev => prev.map(s =>
      s.id === seatId
        ? {
          ...s,
          status: 'available' as const,
          currentUserId: undefined,
          startTime: undefined,
        }
        : s
    ))

    toast.success('좌석 반납이 완료되었습니다', {
      description: `${seat.name} 좌석을 반납했습니다.`,
    })

    setSelectedSeat(null)
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
      {myCurrentSeat && (
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
                  {myCurrentSeat.name}
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
                  {myCurrentSeat.location}
                </span>

                {myCurrentSeat.startTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.5
                    }}>
                      {myCurrentSeat.startTime}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={() => handleEndUsing(myCurrentSeat.id)}
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                  minWidth: '88px',
                  height: '40px',
                }}
              >
                반납
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floor Selector Tabs */}
      <Tabs defaultValue="1" value={selectedFloor} onValueChange={setSelectedFloor} className="w-full">
        <TabsList
          className="w-full"
          style={{
            backgroundColor: 'var(--card)',
            height: '48px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {['1', '2', '3'].map((floor) => (
            <TabsTrigger
              key={floor}
              value={floor}
              className="flex-1"
            >
              <span>{floor}층</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {['1', '2', '3'].map((floor) => (
          <TabsContent key={floor} value={floor} className="mt-6 space-y-6">
            {/* Legend */}
            <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--muted)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 가능 ({seats.filter(s => s.location.startsWith(`${floor}층`) && s.status === 'available').length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--primary)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 중 ({seats.filter(s => s.location.startsWith(`${floor}층`) && s.status === 'in_use').length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--destructive)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                      사용 불가 ({seats.filter(s => s.location.startsWith(`${floor}층`) && s.status === 'maintenance').length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--secondary)' }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>내 좌석</span>
                  </div>
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
                        <Button
                          onClick={() => {
                            const availableSeat = seats.find(s => s.status === 'available')
                            setTestSeat(availableSeat || null)
                            setTestModalOpen(true)
                          }}
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                          }}
                        >
                          좌석 상세 모달 테스트
                        </Button>
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
                              {selectedSeat.name}
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)', marginTop: '4px' }}>
                              {selectedSeat.location}
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
                              위치: {selectedSeat.location}
                            </span>
                          </div>

                          {selectedSeat.status === 'in_use' && selectedSeat.startTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                              <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                                시작 시간: {selectedSeat.startTime}
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
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)',
                              }}
                            >
                              사용 시작
                            </Button>
                          </div>
                        )}

                        {selectedSeat.status === 'in_use' && selectedSeat.currentUserId === currentUserId && (
                          <div className="pt-4 space-y-3">
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => handleEndUsing(selectedSeat.id)}
                              style={{
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)',
                              }}
                            >
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

      {/* Mobile List View */}
      <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
        <CardContent className="p-6">
          <p style={{
            fontSize: '14px',
            color: 'var(--muted-foreground)',
            lineHeight: 1.5,
            marginBottom: '16px'
          }}>
            모바일 환경에 최적화된 리스트 형태의 좌석 뷰입니다
          </p>
          <SeatListView
            seats={floorSeats}
            onStartUsing={handleStartUsing}
            onEndUsing={handleEndUsing}
            myCurrentSeat={myCurrentSeat}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>

      {/* QR Scan Screen - Card Format */}
      {showQRView && qrSeat && (
        <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
          <CardContent className="p-6">
            <QRSeatReservation
              seat={qrSeat}
              currentUserName="관리자"
              onClose={() => setShowQRView(false)}
              onStartUsing={() => {
                handleStartUsing(qrSeat.id)
                setShowQRView(false)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Test Seat Detail Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md">
          {testSeat && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, color: 'var(--foreground)' }}>
                      {testSeat.name}
                    </DialogTitle>
                    <p style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)', marginTop: '4px' }}>
                      {testSeat.location}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                  <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--foreground)' }}>
                    위치: {testSeat.location}
                  </span>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4, color: 'var(--muted-foreground)' }}>
                      상태
                    </span>
                    <Badge className="!border-0" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                      사용 가능
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleStartUsing(testSeat.id)
                      setTestModalOpen(false)
                    }}
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                    }}
                  >
                    사용 시작
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setQrSeat(testSeat)
                      setTestModalOpen(false)
                      setShowQRView(true)
                    }}
                    style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--secondary-foreground)',
                    }}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR 스캔 화면 테스트
                  </Button>
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--muted)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                      자유석 사용 시 Hubstaff에 자동으로 기록됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
