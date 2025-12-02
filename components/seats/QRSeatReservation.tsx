'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Info, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Seat } from '@/lib/demo-data/seats'

interface QRSeatReservationProps {
  seat: Seat
  currentUserName?: string
  onClose: () => void
  onStartUsing: () => void
}

export function QRSeatReservation({
  seat,
  currentUserName = '관리자',
  onClose,
  onStartUsing
}: QRSeatReservationProps) {
  const getStatusCard = () => {
    if (seat.status === 'maintenance') {
      return (
        <Card
          style={{
            borderRadius: 'var(--radius)',
            border: '2px solid var(--destructive)',
            backgroundColor: 'var(--destructive-bg)'
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: 'var(--destructive-bg)' }}
              >
                <XCircle className="w-8 h-8" style={{ color: 'var(--destructive)' }} />
              </div>
              <div className="flex-1">
                <h3
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 500,
                    color: 'var(--destructive)',
                    lineHeight: 1.5,
                    marginBottom: '8px'
                  }}
                >
                  사용 불가
                </h3>
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}
                >
                  현재 이 좌석은 점검 중이거나 사용이 제한된 좌석입니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (seat.status === 'in_use' && seat.currentUserId) {
      return (
        <Card
          style={{
            borderRadius: 'var(--radius)',
            border: '2px solid var(--primary)',
            backgroundColor: 'var(--primary-bg)'
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: 'var(--primary-bg)' }}
              >
                <AlertCircle className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1">
                <h3
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 500,
                    color: 'var(--primary)',
                    lineHeight: 1.5,
                    marginBottom: '8px'
                  }}
                >
                  사용 중
                </h3>
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5
                  }}
                >
                  다른 사용자가 사용 중인 좌석입니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card
        style={{
          borderRadius: 'var(--radius)',
          border: '2px solid var(--success)',
          backgroundColor: 'var(--success-bg)'
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3
                style={{
                  fontSize: 'var(--font-size-h2)',
                  fontWeight: 500,
                  color: 'var(--success)',
                  lineHeight: 1.5,
                  marginBottom: '8px'
                }}
              >
                사용 가능
              </h3>
              <p
                style={{
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}
              >
                현재 사용 가능한 좌석입니다. 아래 버튼을 눌러 사용을 시작하세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-center mb-6">
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--foreground)',
              lineHeight: 1.2,
              marginBottom: '12px'
            }}
          >
            {seat.name}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span
              style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}
            >
              {seat.location}
            </span>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="mb-6">
        {getStatusCard()}
      </div>

      {/* Auto Return Policy */}
      <Card
        className="mb-6"
        style={{
          borderRadius: '12px',
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning)'
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 mt-0.5" style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <div>
              <h4
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                  marginBottom: '4px'
                }}
              >
                자동 반납 정책
              </h4>
              <ul
                className="space-y-1"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}
              >
                <li>퇴근 시간(18:00) 자동 반납</li>
                <li>30분 이상 자리 비움 시 자동 반납</li>
                <li>수동 반납은 좌석 맵에서 가능</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      <div className="space-y-3 mb-6">
        <Card style={{ borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
          <CardContent className="p-4" style={{ backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', paddingTop: '20px' }}>
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.5
                }}
              >
                사용자
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  lineHeight: 1.5
                }}
              >
                {currentUserName}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {seat.status === 'available' && (
          <Button
            onClick={onStartUsing}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              width: '100%',
              height: '48px',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            사용 시작
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onClose}
          style={{
            width: '100%',
            height: '48px',
            fontSize: 'var(--font-size-body)',
          }}
        >
          다른 좌석 찾기
        </Button>
      </div>
    </div>
  )
}
