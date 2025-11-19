import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface LeaveBalanceCardProps {
  employeeId: string
}

export async function LeaveBalanceCard({ employeeId }: LeaveBalanceCardProps) {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()

  const { data: balance, error } = await supabase
    .from('annual_leave_balance')
    .select('total_days, remaining_days, reward_leave_balance')
    .eq('employee_id', employeeId)
    .eq('year', currentYear)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch leave balance:', error)
  }

  const remainingAnnual = balance?.remaining_days || 0
  const remainingReward = balance?.reward_leave_balance || 0
  const usedAnnual = (balance?.total_days || 0) - remainingAnnual
  const totalAnnual = balance?.total_days || 0
  const usedReward = 0 // TODO: DB에 used_reward_leave 컬럼 추가 필요
  const totalReward = balance?.reward_leave_balance || 0

  return (
    <Card
      className="rounded-2xl"
      style={{
        height: '182px'
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <div className="flex items-center justify-between">
          <CardTitle style={{
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '24px',
            color: '#29363D'
          }}>
            연차 요약
          </CardTitle>
          <Link
            href="/leave/request"
            className="flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#635BFF',
            }}
          >
            연차신청
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex gap-4 relative">
        {/* 잔여 연차 */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
              잔여 연차
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: '32.5px', color: '#29363D' }}>
              {remainingAnnual}일
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
              사용 / 발생
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '18px', color: '#5B6A72' }}>
              {usedAnnual} / {totalAnnual}
            </p>
          </div>
        </div>

        {/* 세로 구분선 */}
        <div
          style={{
            width: '1px',
            height: '50px',
            backgroundColor: '#E5E8EB',
            alignSelf: 'center'
          }}
        />

        {/* 잔여 포상휴가 */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
              잔여 포상휴가
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: '32.5px', color: '#29363D' }}>
              {remainingReward}일
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
              사용 / 발생
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '18px', color: '#5B6A72' }}>
              {usedReward} / {totalReward}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
