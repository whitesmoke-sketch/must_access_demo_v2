'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StudioAccessCardProps {
  status?: 'available' | 'restricted'
  reason?: string
}

export function StudioAccessCard({
  status = 'restricted',
  reason = '브랜드 리뉴얼 프로젝트 촬영'
}: StudioAccessCardProps) {
  return (
    <Card
      className="rounded-2xl flex flex-col"
      style={{
        borderRadius: '16px',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <CardTitle style={{
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '24px',
          color: '#29363D'
        }}>
          지하1층 스튜디오
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p style={{
              fontSize: '14px',
              color: '#5B6A72'
            }}>
              출입 상태
            </p>
            <Badge
              style={{
                backgroundColor: status === 'available' ? 'var(--success-bg)' : 'var(--destructive-bg)',
                color: status === 'available' ? 'var(--success)' : 'var(--destructive)',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                padding: '4px 12px',
              }}
            >
              {status === 'available' ? '출입 가능' : '출입 제한'}
            </Badge>
          </div>
          {status === 'restricted' && reason && (
            <div className="flex items-start justify-between">
              <p style={{
                fontSize: '14px',
                color: '#5B6A72'
              }}>
                사유
              </p>
              <p style={{
                fontSize: '14px',
                color: '#29363D',
                fontWeight: 500,
                textAlign: 'right',
                flex: 1,
                marginLeft: '16px',
              }}>
                {reason}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
