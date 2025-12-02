'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { toast } from 'sonner'
import { generateLeavePDF } from '@/app/actions/leave'

interface ApprovalStep {
  id: number
  approver_id: string
  approver_name: string
  status: string
  approved_at: string | null
  comment: string | null
  step_order: number
}

interface LeaveRequestDetail {
  id: number
  employee_id: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  requested_days: number
  reason: string
  status: string
  created_at: string
  approved_at: string | null
  approver_name: string | null
  approval_steps: ApprovalStep[]
  drive_file_url: string | null
}

interface LeaveLedgerEntry {
  id: string
  requestId?: number
  date: string
  type: 'grant' | 'expire' | 'use'
  leaveType: string
  days: number
  approver?: string
  status?: 'approved' | 'pending' | 'rejected' | 'retrieved'
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
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestDetail | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
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

      // 연차 신청 이력 조회 (승인자 정보 포함)
      const { data: requests, error: requestsError } = await supabase
        .from('leave_request')
        .select(`
          id,
          start_date,
          end_date,
          leave_type,
          requested_days,
          status,
          created_at,
          approved_at,
          approver:approver_id (
            id,
            name
          )
        `)
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
      requests?.forEach((req: any) => {
        let leaveTypeLabel = '연차'
        if (req.leave_type === 'annual') {
          leaveTypeLabel = '연차'
        } else if (req.leave_type === 'half_day' || req.leave_type === 'half_day_am' || req.leave_type === 'half_day_pm') {
          leaveTypeLabel = '반차'
        } else if (req.leave_type === 'award') {
          leaveTypeLabel = '포상휴가'
        } else if (req.leave_type === 'sick') {
          leaveTypeLabel = '병가'
        } else {
          leaveTypeLabel = req.leave_type
        }

        const approverName = req.approver?.name || '관리자'

        entries.push({
          id: `use-${req.id}`,
          requestId: req.id,
          date: req.start_date,
          type: 'use',
          leaveType: leaveTypeLabel,
          days: req.requested_days,
          approver: approverName,
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

  // 상세보기 클릭 핸들러
  const handleViewDetail = async (requestId: number) => {
    try {
      const supabase = createClient()

      // 연차 신청 상세 조회
      const { data: request, error: requestError } = await supabase
        .from('leave_request')
        .select(`
          id,
          employee_id,
          leave_type,
          start_date,
          end_date,
          requested_days,
          reason,
          status,
          created_at,
          approved_at,
          drive_file_url,
          employee:employee_id (
            id,
            name
          ),
          approver:approver_id (
            id,
            name
          )
        `)
        .eq('id', requestId)
        .single()

      if (requestError) throw requestError

      // 승인 단계 조회
      const { data: steps, error: stepsError } = await supabase
        .from('approval_step')
        .select(`
          id,
          approver_id,
          status,
          approved_at,
          comment,
          step_order,
          approver:approver_id (
            id,
            name
          )
        `)
        .eq('request_type', 'leave')
        .eq('request_id', requestId)
        .order('step_order', { ascending: true })

      if (stepsError) throw stepsError

      const detail: LeaveRequestDetail = {
        id: request.id,
        employee_id: request.employee_id,
        employee_name: (request.employee as any)?.name || '알 수 없음',
        leave_type: request.leave_type,
        start_date: request.start_date,
        end_date: request.end_date,
        requested_days: request.requested_days,
        reason: request.reason || '',
        status: request.status,
        created_at: request.created_at,
        approved_at: request.approved_at,
        approver_name: (request.approver as any)?.name || null,
        approval_steps: steps?.map((step: any) => ({
          id: step.id,
          approver_id: step.approver_id,
          approver_name: step.approver?.name || '알 수 없음',
          status: step.status,
          approved_at: step.approved_at,
          comment: step.comment,
          step_order: step.step_order,
        })) || [],
        drive_file_url: request.drive_file_url || null,
      }

      setSelectedRequest(detail)
      setIsDetailDialogOpen(true)
    } catch (err) {
      console.error('Failed to load request detail:', err)
      toast.error('상세 정보를 불러오는데 실패했습니다.')
    }
  }

  // Google Drive 문서 보기 핸들러
  const handleViewDocument = () => {
    if (!selectedRequest?.drive_file_url) return
    window.open(selectedRequest.drive_file_url, '_blank')
  }

  // PDF 생성 핸들러 (Server Action 호출)
  const handleGeneratePDF = async () => {
    if (!selectedRequest) return

    try {
      setIsGeneratingPDF(true)

      // Server Action 호출
      const result = await generateLeavePDF(selectedRequest.id)

      if (!result.success) {
        if (result.needsReauth) {
          toast.error('Google 재로그인이 필요합니다. 로그아웃 후 다시 로그인해주세요.')
        } else {
          toast.error(result.error || 'PDF 생성에 실패했습니다.')
        }
        return
      }

      if (result.driveUrl) {
        // 상태 업데이트
        setSelectedRequest({
          ...selectedRequest,
          drive_file_url: result.driveUrl,
        })
        toast.success('PDF가 생성되었습니다.')
        // 새 탭에서 Google Drive 링크 열기
        window.open(result.driveUrl, '_blank')
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error(err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // 취소 요청 핸들러
  const handleCancelRequest = async () => {
    if (!selectedRequest || !cancelReason.trim()) {
      toast.error('취소 사유를 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)
      const supabase = createClient()

      // 연차 신청 상태를 'retrieved'로 변경
      const { error } = await supabase
        .from('leave_request')
        .update({
          status: 'retrieved',
          rejection_reason: cancelReason,
        })
        .eq('id', selectedRequest.id)

      if (error) throw error

      toast.success('연차 신청이 회수되었습니다.')
      setIsCancelDialogOpen(false)
      setIsDetailDialogOpen(false)
      setCancelReason('')
      setSelectedRequest(null)
      loadLedgerData() // 목록 새로고침
    } catch (err) {
      console.error('Failed to cancel request:', err)
      toast.error('취소 요청에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLeaveTypeLabel = (leaveType: string) => {
    switch (leaveType) {
      case 'annual': return '연차'
      case 'half_day':
      case 'half_day_am':
      case 'half_day_pm': return '반차'
      case 'award': return '포상휴가'
      case 'sick': return '병가'
      default: return leaveType
    }
  }

  const getTypeLabel = (type: 'grant' | 'expire' | 'use') => {
    switch (type) {
      case 'grant': return '발생'
      case 'expire': return '소멸'
      case 'use': return '사용'
    }
  }

  const getTypeBadgeStyle = (type: 'grant' | 'expire' | 'use') => {
    switch (type) {
      case 'grant':
        return { backgroundColor: 'var(--success-bg)', color: 'var(--success)' }
      case 'expire':
        return { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
      case 'use':
        return { backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' }
    }
  }

  const getStatusBadgeStyle = (status?: 'approved' | 'pending' | 'rejected' | 'retrieved') => {
    switch (status) {
      case 'approved':
        return { backgroundColor: 'var(--success-bg)', color: 'var(--success)', text: '승인' }
      case 'pending':
        return { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', text: '승인 대기' }
      case 'rejected':
        return { backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)', text: '반려' }
      case 'retrieved':
        return { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', text: '회수' }
      default:
        return null
    }
  }

  const getHistoryEventInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: '승인', color: 'var(--success)', bgColor: 'var(--success-bg)', icon: CheckCircle }
      case 'rejected':
        return { label: '반려', color: 'var(--destructive)', bgColor: 'var(--destructive-bg)', icon: XCircle }
      case 'pending':
        return { label: '대기', color: 'var(--warning)', bgColor: 'var(--warning-bg)', icon: Clock }
      case 'waiting':
        return { label: '미처리', color: 'var(--muted-foreground)', bgColor: 'var(--muted)', icon: Clock }
      default:
        return { label: status, color: 'var(--muted-foreground)', bgColor: 'var(--muted)', icon: Clock }
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
      <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
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
      <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
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
      <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
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
    <>
      <Card className="rounded-2xl" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
        <CardHeader>
          <CardTitle
            style={{
              color: 'var(--foreground)',
              fontSize: 'var(--font-size-body)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            연차·휴가 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 전체 N건 표시 */}
          <div
            className="mb-3"
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--muted-foreground)',
            }}
          >
            전체 {ledgerEntries.length}건
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]" style={{ borderCollapse: 'collapse' }}>
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
                  <th
                    className="text-center p-3"
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 600,
                      color: 'var(--muted-foreground)',
                      width: '80px',
                    }}
                  >
                    상세보기
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
                      e.currentTarget.style.backgroundColor = 'var(--muted)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td
                      className="p-3"
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--foreground)',
                      }}
                    >
                      {new Date(entry.date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="!border-0"
                          style={{
                            backgroundColor: getTypeBadgeStyle(entry.type).backgroundColor,
                            color: getTypeBadgeStyle(entry.type).color,
                            fontSize: 'var(--font-size-caption)',
                            fontWeight: 600,
                          }}
                        >
                          {getTypeLabel(entry.type)}
                        </Badge>
                        <span
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--foreground)',
                          }}
                        >
                          {entry.leaveType}
                        </span>
                      </div>
                    </td>
                    <td
                      className="p-3"
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                      }}
                    >
                      {entry.type === 'grant' && '+'}
                      {entry.days}일
                    </td>
                    <td
                      className="p-3"
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {entry.approver || '-'}
                    </td>
                    <td className="p-3">
                      {entry.status ? (
                        <Badge
                          className="!border-0"
                          style={{
                            backgroundColor: getStatusBadgeStyle(entry.status)?.backgroundColor || 'transparent',
                            color: getStatusBadgeStyle(entry.status)?.color || 'var(--foreground)',
                            fontSize: 'var(--font-size-caption)',
                            fontWeight: 600,
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
                    <td className="p-3 text-center">
                      {entry.requestId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(entry.requestId!)}
                          style={{
                            color: 'var(--foreground)',
                            padding: '4px 8px',
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(1)}
                      isActive={currentPage === 1}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 3 && totalPages > 4 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  {currentPage > 2 && currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(currentPage)}
                        isActive={true}
                        className="cursor-pointer"
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  {currentPage < totalPages - 2 && totalPages > 4 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  {totalPages > 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(totalPages)}
                        isActive={currentPage === totalPages}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle
              style={{
                color: 'var(--foreground)',
                fontSize: 'var(--font-size-h4)',
                fontWeight: 'var(--font-weight-h4)',
                lineHeight: 1.25,
              }}
            >
              연차 신청 상세
            </DialogTitle>
            <DialogDescription
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--font-size-caption)',
                lineHeight: 1.4,
              }}
            >
              연차 신청 내역을 확인하세요
            </DialogDescription>
          </DialogHeader>

          <Card className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6">
              {selectedRequest && (
                <div className="space-y-4 py-4">
              {/* 신청자 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    신청자
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.employee_name}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    연차 유형
                  </p>
                  <Badge
                    className="!border-0"
                    style={{
                      backgroundColor: selectedRequest.leave_type === 'award' ? 'var(--accent-bg)' : 'var(--primary-bg)',
                      color: selectedRequest.leave_type === 'award' ? 'var(--accent)' : 'var(--primary)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 600,
                    }}
                  >
                    {getLeaveTypeLabel(selectedRequest.leave_type)}
                  </Badge>
                </div>
              </div>

              {/* 기간 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    시작일
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.start_date}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    종료일
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.end_date}
                  </p>
                </div>
              </div>

              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                  사용일수
                </p>
                <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                  {selectedRequest.requested_days}일
                </p>
              </div>

              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                  사유
                </p>
                <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)' }}>
                  {selectedRequest.reason || '-'}
                </p>
              </div>

              {/* 신청 시간 */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                  신청 시간
                </p>
                <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)' }}>
                  {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
                </p>
              </div>

              {/* 최종 승인 정보 */}
              {selectedRequest.approver_name && selectedRequest.approved_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                      최종 승인자
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                      {selectedRequest.approver_name}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                      최종 승인 시간
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)' }}>
                      {new Date(selectedRequest.approved_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              )}

              {/* 상태 */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                  상태
                </p>
                <Badge
                  className="!border-0"
                  style={{
                    backgroundColor: getStatusBadgeStyle(selectedRequest.status as any)?.backgroundColor || 'transparent',
                    color: getStatusBadgeStyle(selectedRequest.status as any)?.color || 'var(--foreground)',
                    fontSize: 'var(--font-size-caption)',
                    fontWeight: 600,
                  }}
                >
                  {getStatusBadgeStyle(selectedRequest.status as any)?.text || selectedRequest.status}
                </Badge>
              </div>

              {/* 결재 상태 로그 (타임라인) */}
              {selectedRequest.approval_steps.length > 0 && (
                <div
                  className="space-y-3"
                  style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--font-size-body)',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      color: 'var(--foreground)',
                    }}
                  >
                    결재 상태 로그
                  </p>
                  <div className="space-y-3">
                    {/* 문서 생성 로그 */}
                    <div
                      className="pl-4 pr-3 pt-3 pb-0"
                      style={{ borderLeft: '4px solid var(--muted-foreground)' }}
                    >
                      <div className="flex items-start gap-3 pb-3">
                        <div
                          className="flex-shrink-0 flex items-center justify-center"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '16px',
                            backgroundColor: 'var(--muted)',
                          }}
                        >
                          <Clock style={{ width: '16px', height: '16px', color: 'var(--muted-foreground)' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              className="!border-0"
                              style={{
                                backgroundColor: 'var(--muted)',
                                color: 'var(--muted-foreground)',
                                fontSize: 'var(--font-size-caption)',
                                lineHeight: 1.4,
                                fontWeight: 600,
                                padding: '2px 8px',
                              }}
                            >
                              문서 생성
                            </Badge>
                            <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                              {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <p style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, lineHeight: 1.5, color: 'var(--foreground)' }}>
                            {selectedRequest.employee_name}
                          </p>
                          <p style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                            연차 신청서 작성
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 결재 단계별 로그 */}
                    {selectedRequest.approval_steps.map((step) => {
                      const eventInfo = getHistoryEventInfo(step.status)
                      const EventIcon = eventInfo.icon

                      return (
                        <div
                          key={step.id}
                          className="pl-4 pr-3 pt-3 pb-0"
                          style={{ borderLeft: `4px solid ${eventInfo.color}` }}
                        >
                          <div className="flex items-start gap-3 pb-3">
                            <div
                              className="flex-shrink-0 flex items-center justify-center"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '16px',
                                backgroundColor: eventInfo.bgColor,
                              }}
                            >
                              <EventIcon style={{ width: '16px', height: '16px', color: eventInfo.color }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <Badge
                                  className="!border-0"
                                  style={{
                                    backgroundColor: eventInfo.bgColor,
                                    color: eventInfo.color,
                                    fontSize: 'var(--font-size-caption)',
                                    lineHeight: 1.4,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                  }}
                                >
                                  {step.step_order}단계 {eventInfo.label}
                                </Badge>
                                {step.approved_at && (
                                  <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                                    {new Date(step.approved_at).toLocaleString('ko-KR')}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, lineHeight: 1.5, color: 'var(--foreground)' }}>
                                {step.approver_name}
                              </p>
                              {step.comment && (
                                <p style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                                  {step.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          </Card>

          <DialogFooter className="gap-2">
            {/* Google Drive 문서 링크가 있으면 문서 보기, 없으면 PDF 생성 버튼 */}
            {selectedRequest?.drive_file_url ? (
              <Button
                onClick={handleViewDocument}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                문서 보기
              </Button>
            ) : (
              <Button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF 생성
                  </>
                )}
              </Button>
            )}
            {selectedRequest && selectedRequest.status === 'pending' && (
              <Button
                onClick={() => setIsCancelDialogOpen(true)}
                style={{
                  backgroundColor: 'var(--destructive)',
                  color: 'var(--destructive-foreground)',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                취소 요청
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 취소 요청 다이얼로그 */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle
              style={{
                color: 'var(--foreground)',
                fontSize: 'var(--font-size-h4)',
                fontWeight: 'var(--font-weight-h4)',
                lineHeight: 1.25,
              }}
            >
              연차 신청 취소 요청
            </DialogTitle>
            <DialogDescription
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--font-size-caption)',
                lineHeight: 1.4,
              }}
            >
              연차 신청을 취소하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* 신청 정보 요약 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    연차 유형
                  </p>
                  <Badge
                    className="!border-0"
                    style={{
                      backgroundColor: selectedRequest.leave_type === 'award' ? 'var(--accent-bg)' : 'var(--primary-bg)',
                      color: selectedRequest.leave_type === 'award' ? 'var(--accent)' : 'var(--primary)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 600,
                    }}
                  >
                    {getLeaveTypeLabel(selectedRequest.leave_type)}
                  </Badge>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    사용일수
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.requested_days}일
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    시작일
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.start_date}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    종료일
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', fontWeight: 600 }}>
                    {selectedRequest.end_date}
                  </p>
                </div>
              </div>

              {/* 취소 사유 입력 */}
              <div className="mt-4">
                <Label
                  htmlFor="cancelReason"
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  취소 사유 *
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="취소 사유를 입력하세요"
                  style={{
                    color: 'var(--foreground)',
                    marginTop: '8px',
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false)
                setCancelReason('')
              }}
              style={{
                fontSize: 'var(--font-size-body)',
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              닫기
            </Button>
            <Button
              onClick={handleCancelRequest}
              disabled={isSubmitting || !cancelReason.trim()}
              style={{
                backgroundColor: 'var(--destructive)',
                color: 'var(--destructive-foreground)',
                fontSize: 'var(--font-size-body)',
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isSubmitting ? '처리 중...' : '취소 요청'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
