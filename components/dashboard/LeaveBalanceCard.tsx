import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface LeaveBalanceCardProps {
  employeeId: string
}

export async function LeaveBalanceCard({ employeeId }: LeaveBalanceCardProps) {
  const supabase = await createClient()

  const { data: balance, error } = await supabase
    .from('annual_leave_balance')
    .select('total_days, remaining_days')
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch leave balance:', error)
  }

  const remainingAnnual = balance?.remaining_days || 0
  const usedAnnual = (balance?.total_days || 0) - remainingAnnual
  const totalAnnual = balance?.total_days || 0

  return (
    <Card
      className="rounded-2xl flex flex-col"
      style={{
        borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <div className="flex items-center justify-between">
          <CardTitle style={{
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '20.8px',
            color: '#29363D'
          }}>
            연차 요약
          </CardTitle>
          <Link
            href="/request?type=annual_leave"
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
      <CardContent className="flex flex-col items-center justify-center pb-6">
        <p style={{
          fontSize: '26px',
          fontWeight: 700,
          lineHeight: '32.5px',
          color: '#29363D',
          textAlign: 'center'
        }}>
          {remainingAnnual}일
        </p>
        <p style={{
          fontSize: '14px',
          lineHeight: '19.6px',
          color: '#5B6A72',
          textAlign: 'center',
          marginTop: '4px'
        }}>
          남은 연차일
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F0EEFF',
            borderRadius: '100px',
            padding: '2px 16px',
            marginTop: '12px'
          }}
        >
          <p style={{
            fontSize: '12px',
            lineHeight: '14px',
            color: '#5B6A72',
            textAlign: 'center'
          }}>
            사용 / 총 연차
          </p>
          <p style={{
            fontSize: '12px',
            fontWeight: 800,
            lineHeight: '14px',
            color: '#5B6A72',
            textAlign: 'center'
          }}>
            {usedAnnual}일 / {totalAnnual}일
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
