'use client'

import { Card, CardContent } from '@/components/ui/card'

interface LeaveBalanceCardsProps {
  balance: {
    total_days: number
    used_days: number
    remaining_days?: number
    reward_leave_balance?: number
    reward_total?: number
    reward_used?: number
    reward_remaining?: number
  } | null
  documentType: string
}

export function LeaveBalanceCards({ balance, documentType }: LeaveBalanceCardsProps) {
  const isRewardLeave = documentType === 'reward_leave'

  const totalDays = isRewardLeave ? (balance?.reward_total || 0) : (balance?.total_days || 0)
  const usedDays = isRewardLeave ? (balance?.reward_used || 0) : (balance?.used_days || 0)
  const remainingDays = isRewardLeave ? (balance?.reward_remaining || 0) : (balance?.remaining_days || 0)

  const leaveTypeName = isRewardLeave ? '포상휴가' : '연차'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 총 연차/포상휴가 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'rgba(41, 54, 61, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: '#29363D',
            lineHeight: 1.4
          }}>
            총 {leaveTypeName}
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#29363D',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {totalDays}일
          </div>
        </CardContent>
      </Card>

      {/* 사용한 연차/포상휴가 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'rgba(91, 106, 114, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: '#5B6A72',
            lineHeight: 1.4
          }}>
            사용한 {leaveTypeName}
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#5B6A72',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {usedDays}일
          </div>
        </CardContent>
      </Card>

      {/* 잔여 연차/포상휴가 */}
      <Card style={{
        backgroundColor: isRewardLeave ? 'rgba(255, 102, 146, 0.05)' : 'rgba(99, 91, 255, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: isRewardLeave ? '#FF6692' : 'var(--primary)',
            lineHeight: 1.4
          }}>
            사용 가능한 {leaveTypeName}
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: isRewardLeave ? '#FF6692' : 'var(--primary)',
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
