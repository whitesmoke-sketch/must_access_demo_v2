import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { LeaveInfoCards } from '@/components/leave/LeaveInfoCards'
import { LeaveLedgerTable } from '@/components/leave/LeaveLedgerTable'

export default async function MyLeavePage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h2
            style={{
              color: 'var(--card-foreground)',
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-h1)',
              lineHeight: 1.25,
            }}
          >
            내 연차 조회
          </h2>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--font-size-body)',
              lineHeight: 1.5,
            }}
            className="mt-1"
          >
            내 연차 정보와 사용 현황을 확인하세요
          </p>
        </div>
        <Link href="/leave/request">
          <Button
            className="w-full sm:w-auto"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            연차 신청
          </Button>
        </Link>
      </div>

      {/* 연차 정보 카드 */}
      <LeaveInfoCards employeeId={user.id} />

      {/* 연차·휴가 Ledger */}
      <LeaveLedgerTable employeeId={user.id} />
    </div>
  )
}
