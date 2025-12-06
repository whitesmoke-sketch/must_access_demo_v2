import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarPlus, CalendarMinus, CalendarDays } from 'lucide-react'

interface LeaveInfoCardsProps {
  employeeId: string
}

export async function LeaveInfoCards({ employeeId }: LeaveInfoCardsProps) {
  const supabase = await createClient()

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
        }}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                총 부여 연차
              </p>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  lineHeight: 1.2,
                  marginTop: '4px',
                }}
              >
                {totalDays}일
              </div>
            </div>
            <CalendarPlus
              className="w-10 h-10"
              style={{ color: 'var(--foreground)', opacity: 0.5 }}
            />
          </div>
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
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                사용 연차
              </p>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.2,
                  marginTop: '4px',
                }}
              >
                {usedDays}일
              </div>
            </div>
            <CalendarMinus
              className="w-10 h-10"
              style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
            />
          </div>
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
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                잔여 연차
              </p>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  lineHeight: 1.2,
                  marginTop: '4px',
                }}
              >
                {remainingDays}일
              </div>
            </div>
            <CalendarDays
              className="w-10 h-10"
              style={{ color: 'var(--primary)', opacity: 0.5 }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
