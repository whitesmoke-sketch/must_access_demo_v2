import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'

interface LeaveInfoCardsProps {
  employeeId: string
}

export async function LeaveInfoCards({ employeeId }: LeaveInfoCardsProps) {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()

  // 연차 잔액 조회
  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days, remaining_days, reward_leave_balance')
    .eq('employee_id', employeeId)
    .eq('year', currentYear)
    .single()

  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0
  const rewardLeave = balance?.reward_leave_balance || 0

  // 포상휴가 만료일 계산 (예시: 다음 분기 말)
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const nextQuarterEndMonth = (currentQuarter + 1) * 3
  const rewardExpiryDate = new Date(now.getFullYear(), nextQuarterEndMonth, 0)

  const daysUntilExpiry = Math.ceil(
    (rewardExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0 && rewardLeave > 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 총 부여 연차 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle
            style={{
              color: '#29363D',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            총 부여 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#29363D',
              lineHeight: 1.2,
            }}
          >
            {totalDays}일
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#29363D',
              lineHeight: 1.4,
              marginTop: '4px',
              opacity: 0.7,
            }}
          >
            {currentYear}년 기준
          </p>
        </CardContent>
      </Card>

      {/* 사용 연차 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle
            style={{
              color: '#5B6A72',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            사용 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#5B6A72',
              lineHeight: 1.2,
            }}
          >
            {usedDays}일
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#5B6A72',
              lineHeight: 1.4,
              marginTop: '4px',
              opacity: 0.7,
            }}
          >
            총 {totalDays}일 중
          </p>
        </CardContent>
      </Card>

      {/* 잔여 연차 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(99, 91, 255, 0.05)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle
            style={{
              color: 'var(--primary)',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            잔여 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--primary)',
              lineHeight: 1.2,
            }}
          >
            {remainingDays}일
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--primary)',
              lineHeight: 1.4,
              marginTop: '4px',
              opacity: 0.8,
            }}
          >
            사용 가능
          </p>
        </CardContent>
      </Card>

      {/* 포상 휴가 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(255, 102, 146, 0.05)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle
            style={{
              color: '#FF6692',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            포상 휴가
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FF6692',
              lineHeight: 1.2,
            }}
          >
            {rewardLeave}일
          </div>
          <div className="mt-1 space-y-0.5">
            <p style={{ fontSize: '11px', color: '#FF6692', lineHeight: 1.4 }}>
              유효기간: ~{rewardExpiryDate.toLocaleDateString('ko-KR')}
            </p>
            {isExpiringSoon && (
              <Badge
                className="mt-1"
                style={{
                  backgroundColor: '#FFF0ED',
                  color: '#FF6B6B',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                }}
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                {daysUntilExpiry}일 후 만료
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
