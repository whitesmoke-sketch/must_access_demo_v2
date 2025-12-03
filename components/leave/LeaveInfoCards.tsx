import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LeaveInfoCardsProps {
  employeeId: string
}

export async function LeaveInfoCards({ employeeId }: LeaveInfoCardsProps) {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()

  // 연차 잔액 조회
  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days, remaining_days, expiring_soon_days')
    .eq('employee_id', employeeId)
    .maybeSingle()

  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 총 부여 연차 카드 */}
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          height: '182px',
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
          height: '182px',
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
          height: '182px',
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
    </div>
  )
}
