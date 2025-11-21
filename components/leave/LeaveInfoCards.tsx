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

  console.log('Server  LeaveInfoCards - employeeId:', employeeId)
  console.log('Server  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Server  Using local?:', process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1'))

  // Check auth.uid()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Server  auth.uid():', user?.id)
  console.log('Server  Match?:', user?.id === employeeId)

  // 연차 잔액 조회
  const { data: balance, error } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days, remaining_days, expiring_soon_days')
    .eq('employee_id', employeeId)
    .maybeSingle()

  console.log('Server  LeaveInfoCards - balance:', balance)
  console.log('Server  LeaveInfoCards - error:', error)

  // Check all balances in database
  const { data: allBalances } = await supabase
    .from('annual_leave_balance')
    .select('employee_id, total_days')
  console.log('Server  All balances in DB:', allBalances)

  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0

  // 포상휴가 조회
  // 1. 부여된 포상휴가 합계
  const { data: rewardGrants } = await supabase
    .from('annual_leave_grant')
    .select('granted_days, expiration_date')
    .eq('employee_id', employeeId)
    .in('grant_type', ['award_overtime', 'award_attendance'])
    .eq('approval_status', 'approved')

  console.log('Server  LeaveInfoCards - rewardGrants:', rewardGrants)

  const totalRewardGranted = rewardGrants?.reduce((sum, grant) => sum + grant.granted_days, 0) || 0

  // 2. 사용한 포상휴가 합계
  const { data: rewardUsage } = await supabase
    .from('leave_request')
    .select('number_of_days')
    .eq('employee_id', employeeId)
    .eq('leave_type', 'award')
    .eq('status', 'approved')

  console.log('Server  LeaveInfoCards - rewardUsage:', rewardUsage)

  const totalRewardUsed = rewardUsage?.reduce((sum, req) => sum + req.number_of_days, 0) || 0

  // 3. 잔여 포상휴가
  const rewardLeave = totalRewardGranted - totalRewardUsed

  // 4. 포상휴가 만료일 계산 (가장 가까운 만료일)
  const now = new Date()
  const validGrants = rewardGrants?.filter(grant => {
    const expiryDate = new Date(grant.expiration_date)
    return expiryDate > now
  }).sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())

  const rewardExpiryDate = validGrants && validGrants.length > 0
    ? new Date(validGrants[0].expiration_date)
    : new Date(now.getFullYear(), now.getMonth() + 3, 0) // 기본값: 3개월 후

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
