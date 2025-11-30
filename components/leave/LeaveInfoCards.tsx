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

  // 모든 쿼리를 병렬로 실행 (성능 최적화)
  const [balanceResult, rewardGrantsResult, rewardUsageResult] = await Promise.all([
    // 연차 잔액 조회
    supabase
      .from('annual_leave_balance')
      .select('total_days, used_days, remaining_days, expiring_soon_days')
      .eq('employee_id', employeeId)
      .maybeSingle(),
    // 포상휴가 부여 조회
    supabase
      .from('annual_leave_grant')
      .select('granted_days, expiration_date, created_at')
      .eq('employee_id', employeeId)
      .in('grant_type', ['award_overtime', 'award_attendance'])
      .eq('approval_status', 'approved'),
    // 포상휴가 사용 조회
    supabase
      .from('leave_request')
      .select('number_of_days')
      .eq('employee_id', employeeId)
      .eq('leave_type', 'award')
      .eq('status', 'approved'),
  ])

  const balance = balanceResult.data
  const rewardGrants = rewardGrantsResult.data

  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0

  const totalRewardGranted = rewardGrants?.reduce((sum, grant) => sum + grant.granted_days, 0) || 0

  const rewardUsage = rewardUsageResult.data

  const totalRewardUsed = rewardUsage?.reduce((sum, req) => sum + req.number_of_days, 0) || 0

  // 잔여 포상휴가
  const rewardLeave = totalRewardGranted - totalRewardUsed

  // 포상휴가 만료일 계산 (가장 가까운 만료일)
  const now = new Date()
  const validGrants = rewardGrants?.filter(grant => {
    const expiryDate = new Date(grant.expiration_date)
    return expiryDate > now
  }).sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())

  const rewardExpiryDate = validGrants && validGrants.length > 0
    ? new Date(validGrants[0].expiration_date)
    : new Date(now.getFullYear(), now.getMonth() + 3, 0) // 기본값: 3개월 후

  // 포상휴가 발생일 (가장 최근 부여일)
  const rewardGrantDate = validGrants && validGrants.length > 0
    ? new Date(validGrants[0].created_at)
    : new Date(now.getFullYear(), 0, 1) // 기본값: 올해 1월 1일

  const daysUntilExpiry = Math.ceil(
    (rewardExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0 && rewardLeave > 0
  const isExpired = daysUntilExpiry <= 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 총 부여 연차 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CardHeader className="pb-2" style={{ paddingTop: '12px', paddingBottom: '4px' }}>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            총 부여 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0" style={{ paddingTop: '0', paddingBottom: '12px' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--foreground)',
              lineHeight: 1.2,
            }}
          >
            {totalDays}일
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--foreground)',
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
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CardHeader className="pb-2" style={{ paddingTop: '12px', paddingBottom: '4px' }}>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            사용 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0" style={{ paddingTop: '0', paddingBottom: '12px' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--muted-foreground)',
              lineHeight: 1.2,
            }}
          >
            {usedDays}일
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--foreground)',
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
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CardHeader className="pb-2" style={{ paddingTop: '12px', paddingBottom: '4px' }}>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            잔여 연차
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0" style={{ paddingTop: '0', paddingBottom: '12px' }}>
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
              fontSize: 'var(--font-size-caption)',
              color: 'var(--foreground)',
              lineHeight: 1.4,
              marginTop: '4px',
              opacity: 0.7,
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
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CardHeader className="pb-2" style={{ paddingTop: '12px', paddingBottom: '4px' }}>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            포상 휴가
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0" style={{ paddingTop: '0', paddingBottom: '12px' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-chart-5)',
              lineHeight: 1.2,
            }}
          >
            {rewardLeave}일
          </div>
          <div className="mt-1 space-y-0.5">
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--foreground)',
                lineHeight: 1.4,
                opacity: 0.7,
              }}
            >
              발생: {rewardGrantDate.toLocaleDateString('ko-KR')}
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--foreground)',
                lineHeight: 1.4,
                opacity: 0.7,
              }}
            >
              유효기간: ~{rewardExpiryDate.toLocaleDateString('ko-KR')}
            </p>
            {isExpiringSoon && (
              <Badge
                className="mt-1 !border-0"
                style={{
                  backgroundColor: 'var(--destructive-bg)',
                  color: 'var(--destructive)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                {daysUntilExpiry}일 후 만료
              </Badge>
            )}
            {isExpired && (
              <Badge
                className="mt-1 !border-0"
                style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                만료됨
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
