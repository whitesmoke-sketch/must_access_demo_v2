'use client'

import { Card, CardContent } from '@/components/ui/card'

interface LeaveBalanceCardsProps {
  balance: {
    total_days: number
    used_days: number
    remaining_days?: number
    reward_used?: number
  } | null
  documentType: string
}

export function LeaveBalanceCards({ balance, documentType }: LeaveBalanceCardsProps) {
  const isRewardLeave = documentType === 'reward_leave'

  // 포상휴가는 잔액 개념 없음 - 신청 → 승인 시 부여와 동시에 사용
  if (isRewardLeave) {
    const usedReward = balance?.reward_used || 0
    return (
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* 올해 사용한 포상휴가 */}
        <Card style={{
          backgroundColor: 'rgba(255, 102, 146, 0.05)',
          borderRadius: 'var(--radius)',
          border: 'none',
        }}>
          <CardContent className="pt-6">
            <p style={{
              fontSize: 'var(--font-size-caption)',
              color: '#FF6692',
              lineHeight: 1.4
            }}>
              올해 사용한 포상휴가
            </p>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FF6692',
              lineHeight: 1.2,
              marginTop: '8px'
            }}>
              {usedReward}일
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 연차 표시
  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 총 연차 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'var(--muted)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--foreground)',
            lineHeight: 1.4
          }}>
            총 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--foreground)',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {totalDays}일
          </div>
        </CardContent>
      </Card>

      {/* 사용한 연차 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'var(--muted)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--muted-foreground)',
            lineHeight: 1.4
          }}>
            사용한 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--muted-foreground)',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {usedDays}일
          </div>
        </CardContent>
      </Card>

      {/* 잔여 연차 */}
      <Card style={{
        backgroundColor: 'rgba(99, 91, 255, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--primary)',
            lineHeight: 1.4
          }}>
            사용 가능한 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--primary)',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {remainingDays}일
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
