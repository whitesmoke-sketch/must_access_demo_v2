'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LeaveLedgerEntry {
  id: string
  date: string
  type: 'grant' | 'expire' | 'use'
  leaveType: string
  days: number
  approver?: string
  status?: 'approved' | 'pending' | 'rejected'
  description: string
}

interface LeaveLedgerTableProps {
  employeeId: string
}

export function LeaveLedgerTable({ employeeId }: LeaveLedgerTableProps) {
  const [ledgerEntries, setLedgerEntries] = useState<LeaveLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const loadLedgerData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const currentYear = new Date().getFullYear()

      // 연차 부여 이력 조회
      const { data: grants, error: grantsError } = await supabase
        .from('annual_leave_grant')
        .select('granted_date, granted_days, reason, grant_type')
        .eq('employee_id', employeeId)
        .order('granted_date', { ascending: false })

      if (grantsError) throw new Error(`연차 부여 이력 조회 실패: ${grantsError.message}`)

      // 연차 신청 이력 조회
      const { data: requests, error: requestsError } = await supabase
        .from('leave_request')
        .select('id, start_date, end_date, leave_type, requested_days, status, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (requestsError) throw new Error(`연차 신청 이력 조회 실패: ${requestsError.message}`)

    // Ledger 엔트리 생성
    const entries: LeaveLedgerEntry[] = []

    // 부여 이력 추가
    grants?.forEach((grant, index) => {
      const isRewardLeave = grant.grant_type === 'award_overtime' || grant.grant_type === 'award_attendance'
      entries.push({
        id: `grant-${grant.granted_date}-${grant.grant_type}-${index}`,
        date: grant.granted_date,
        type: 'grant',
        leaveType: isRewardLeave ? '포상휴가' : '연차',
        days: grant.granted_days,
        description: grant.reason || (isRewardLeave ? '포상휴가 부여' : `${currentYear}년 연차 부여`),
      })
    })

    // 사용 이력 추가
    requests?.forEach((req) => {
      let leaveTypeLabel = '연차'
      if (req.leave_type === 'annual') {
        leaveTypeLabel = '연차'
      } else if (req.leave_type === 'half_day') {
        leaveTypeLabel = '반차'
      } else if (req.leave_type === 'award') {
        leaveTypeLabel = '포상휴가'
      } else if (req.leave_type === 'sick') {
        leaveTypeLabel = '병가'
      } else {
        leaveTypeLabel = req.leave_type // fallback to raw type
      }

      entries.push({
        id: `use-${req.id}`,
        date: req.start_date, // 실제 연차 시작일 사용
        type: 'use',
        leaveType: leaveTypeLabel,
        days: req.requested_days,
        approver: '관리자', // TODO: Join with employee table for actual approver name
        status: req.status,
        description: `${req.start_date} ~ ${req.end_date}`,
      })
    })

    // 최근순 정렬
    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

      setLedgerEntries(entries)
    } catch (err) {
      console.error('Failed to load ledger data:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadLedgerData()
  }, [loadLedgerData])

  const getTypeLabel = (type: 'grant' | 'expire' | 'use') => {
    switch (type) {
      case 'grant':
        return '발생'
      case 'expire':
        return '소멸'
      case 'use':
        return '사용'
    }
  }

  const getTypeBadgeStyle = (type: 'grant' | 'expire' | 'use') => {
    switch (type) {
      case 'grant':
        return { backgroundColor: 'rgba(76, 212, 113, 0.1)', color: '#4CD471' }
      case 'expire':
        return { backgroundColor: '#F6F8F9', color: '#5B6A72' }
      case 'use':
        return { backgroundColor: 'rgba(99, 91, 255, 0.1)', color: '#635BFF' }
    }
  }

  const getStatusBadgeStyle = (
    status?: 'approved' | 'pending' | 'rejected'
  ) => {
    switch (status) {
      case 'approved':
        return {
          backgroundColor: 'rgba(76, 212, 113, 0.1)',
          color: '#4CD471',
          text: '승인',
        }
      case 'pending':
        return { backgroundColor: '#FFF8E5', color: '#F8C653', text: '대기' }
      case 'rejected':
        return { backgroundColor: '#FFF0ED', color: '#FF6B6B', text: '반려' }
      default:
        return null
    }
  }

  // 페이지네이션
  const totalPages = Math.ceil(ledgerEntries.length / itemsPerPage)
  const paginatedLedger = ledgerEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (error) {
    return (
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-destructive text-center">{error}</p>
            <Button onClick={loadLedgerData} variant="outline" size="sm">
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (ledgerEntries.length === 0) {
    return (
      <Card
        className="rounded-2xl"
        style={{
          borderRadius: 'var(--radius)',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--card-foreground)',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            연차·휴가 이력
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">연차 휴가 이력 기록이 없습니다</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="rounded-2xl"
      style={{
        borderRadius: 'var(--radius)',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
      }}
    >
      <CardHeader>
        <CardTitle
          style={{
            color: 'var(--card-foreground)',
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          연차·휴가 이력
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th
                  className="text-left p-3"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  날짜
                </th>
                <th
                  className="text-left p-3"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  부재유형
                </th>
                <th
                  className="text-left p-3"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  사용일수
                </th>
                <th
                  className="text-left p-3"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  승인권자
                </th>
                <th
                  className="text-left p-3"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedger.map((entry) => (
                <tr
                  key={entry.id}
                  className="transition-all"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F6F8F9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td
                    className="p-3"
                    style={{
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--card-foreground)',
                    }}
                  >
                    {new Date(entry.date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor:
                            getTypeBadgeStyle(entry.type).backgroundColor,
                          color: getTypeBadgeStyle(entry.type).color,
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                        }}
                      >
                        {getTypeLabel(entry.type)}
                      </Badge>
                      <span
                        style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--card-foreground)',
                        }}
                      >
                        {entry.leaveType}
                      </span>
                    </div>
                  </td>
                  <td
                    className="p-3"
                    style={{
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--card-foreground)',
                      fontWeight: 600,
                    }}
                  >
                    {entry.type === 'grant' && '+'}
                    {entry.days}일
                  </td>
                  <td
                    className="p-3"
                    style={{
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    {entry.approver || '-'}
                  </td>
                  <td className="p-3">
                    {entry.status ? (
                      <Badge
                        style={{
                          backgroundColor:
                            getStatusBadgeStyle(entry.status)?.backgroundColor ||
                            'transparent',
                          color:
                            getStatusBadgeStyle(entry.status)?.color ||
                            'var(--card-foreground)',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                        }}
                      >
                        {getStatusBadgeStyle(entry.status)?.text}
                      </Badge>
                    ) : (
                      <span
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        {entry.description}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--muted-foreground)',
              }}
            >
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
