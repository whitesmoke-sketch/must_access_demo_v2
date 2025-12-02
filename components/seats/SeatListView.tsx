'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Seat } from '@/lib/demo-data/seats'

interface SeatListViewProps {
  seats: Seat[]
  onStartUsing: (seatId: string) => void
  onEndUsing: (seatId: string) => void
  myCurrentSeat?: Seat
  currentUserId?: string
}

export function SeatListView({
  seats,
  onStartUsing,
  onEndUsing,
  myCurrentSeat,
  currentUserId
}: SeatListViewProps) {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)

  // Separate my seat and other seats
  const { mySeats, otherSeats } = useMemo(() => {
    const my = seats.filter(s => s.currentUserId === currentUserId)
    const others = seats.filter(s => s.currentUserId !== currentUserId)
    return { mySeats: my, otherSeats: others }
  }, [seats, currentUserId])

  const getSeatStatusColor = (seat: Seat): { bg: string; text: string; border: string } => {
    if (seat.status === 'maintenance') {
      return { bg: 'var(--destructive-bg)', text: 'var(--destructive)', border: 'var(--destructive)' }
    }
    if (seat.status === 'in_use') {
      if (seat.currentUserId === currentUserId) {
        return { bg: 'var(--secondary-bg)', text: 'var(--secondary)', border: 'var(--secondary)' }
      }
      return { bg: 'var(--primary-bg)', text: 'var(--primary)', border: 'var(--primary)' }
    }
    return { bg: 'var(--muted)', text: 'var(--muted-foreground)', border: 'var(--border)' }
  }

  const getSeatStatusLabel = (seat: Seat): string => {
    if (seat.status === 'maintenance') return '사용 불가'
    if (seat.status === 'in_use') {
      if (seat.currentUserId === currentUserId) return '내 좌석'
      return '사용 중'
    }
    return '사용 가능'
  }

  const handleStartClick = (seat: Seat) => {
    if (myCurrentSeat && myCurrentSeat.id !== seat.id) {
      toast.error('이미 사용 중인 좌석이 있습니다', {
        description: `현재 ${myCurrentSeat.name} 좌석을 사용 중입니다. 먼저 반납해주세요.`,
      })
      return
    }
    onStartUsing(seat.id)
  }

  const renderSeatRow = (seat: Seat, isPinned: boolean = false) => {
    const colors = getSeatStatusColor(seat)
    const isMyCurrentSeat = seat.currentUserId === currentUserId
    const canStartUsing = seat.status === 'available' && !myCurrentSeat
    const isSelected = !isPinned && selectedSeatId === seat.id

    const handleCardClick = () => {
      if (!isPinned && seat.status === 'available' && canStartUsing) {
        setSelectedSeatId(isSelected ? null : seat.id)
      }
    }

    return (
      <Card
        key={seat.id}
        onClick={handleCardClick}
        style={{
          borderRadius: '12px',
          backgroundColor: colors.bg,
          border: isPinned
            ? `2px solid ${colors.border}`
            : isSelected
              ? `2px solid var(--primary)`
              : `1px solid ${colors.border}`,
          marginBottom: isPinned ? '12px' : '0',
          cursor: !isPinned && seat.status === 'available' && canStartUsing ? 'pointer' : 'default',
          transition: 'all 150ms ease-in-out',
        }}
      >
        <CardContent className="p-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    lineHeight: 1.5
                  }}>
                    {seat.name}
                  </h3>
                  <Badge className="!border-0" style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    fontSize: '11px',
                    padding: '2px 8px',
                  }}>
                    {getSeatStatusLabel(seat)}
                  </Badge>
                </div>

                {seat.status === 'maintenance' && (
                  <div className="mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: 'var(--destructive)', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--destructive)', lineHeight: 1.5 }}>
                      점검 중이거나 사용이 제한된 좌석입니다
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <span style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}>
                    {seat.location}
                  </span>

                  {seat.status === 'in_use' && seat.startTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.5
                      }}>
                        {seat.startTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isPinned && isMyCurrentSeat && (
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => onEndUsing(seat.id)}
                    style={{
                      borderColor: 'var(--secondary)',
                      color: 'var(--secondary)',
                      minWidth: '88px',
                      height: '40px',
                    }}
                  >
                    반납
                  </Button>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 style={{
        fontSize: '16px',
        fontWeight: 500,
        color: 'var(--foreground)',
        lineHeight: 1.5,
        marginBottom: '12px',
        marginTop: '10px',
      }}>
        좌석 목록
      </h3>

      <div className="space-y-3" style={{ paddingBottom: '10px' }}>
        {mySeats.length > 0 && (
          <>
            {mySeats.map(seat => renderSeatRow(seat, true))}
            <div style={{ height: '16px' }} />
          </>
        )}

        <div className="grid grid-cols-2 gap-3 items-start">
          {otherSeats.map(seat => renderSeatRow(seat, false))}
        </div>

        {seats.length === 0 && (
          <Card style={{ borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
            <CardContent className="p-8 text-center">
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                이 층에 좌석이 없습니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
