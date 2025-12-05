'use client'

import React, { useState } from 'react'
import {
  Users,
  TrendingUp,
  Clock,
  CalendarCheck,
  Search,
  Filter,
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Upload,
  Edit,
} from 'lucide-react'
import { Member, LeaveRequest } from '@/lib/leave-management/types'
import { approveLeaveRequest, rejectLeaveRequest, grantRewardLeave } from '@/lib/leave-management/actions'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { LeaveManualAdjustment } from './LeaveManualAdjustment'
import { MonthlyLeaveCalendar } from './MonthlyLeaveCalendar'
import { LeaveManagementTable } from './LeaveManagementTable'
import { LeaveManagementDialogs } from './LeaveManagementDialogs'

type ViewMode = 'main' | 'manual'

interface LeaveManagementClientProps {
  initialMembers: Member[]
  initialLeaveRequests: LeaveRequest[]
}

export function LeaveManagementClient({
  initialMembers,
  initialLeaveRequests,
}: LeaveManagementClientProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests)
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRewardGrantDialogOpen, setIsRewardGrantDialogOpen] = useState(false)
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])

  const itemsPerPage = 20

  const [rewardGrantFormData, setRewardGrantFormData] = useState({
    memberId: '',
    days: 1,
    reason: '',
    attachment: null as File | null,
  })

  // 통계 계산
  const totalMembers = members.length
  const totalAnnualLeave = members.reduce((sum, m) => sum + m.annualLeave, 0)
  const totalUsedLeave = members.reduce((sum, m) => sum + m.usedAnnualLeave, 0)
  const usageRate = totalAnnualLeave > 0 ? ((totalUsedLeave / totalAnnualLeave) * 100).toFixed(1) : '0'
  // 내가 결재할 수 있는 요청만 카운트
  const pendingRequestsCount = leaveRequests.filter(r => r.status === 'pending' && r.canApprove === true).length

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthUsage = leaveRequests
    .filter(r => {
      if (r.status !== 'approved') return false
      const date = new Date(r.startDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, r) => sum + (r.days || 0), 0)

  // 팀 목록
  const teams = Array.from(new Set(members.map(m => m.team)))

  // 필터링된 구성원 목록
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.team.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTeam = filterTeam === 'all' || member.team === filterTeam

    return matchesSearch && matchesTeam
  })

  // 구성원별 요청 여부 및 상태 확인
  const getMemberLeaveStatus = (memberId: string) => {
    const memberRequests = leaveRequests.filter(r => r.memberId === memberId)
    const pendingRequests = memberRequests.filter(r => r.status === 'pending')

    if (pendingRequests.length > 0) {
      return { hasRequest: true, status: 'pending', count: pendingRequests.length }
    }

    return { hasRequest: memberRequests.length > 0, status: 'none', count: 0 }
  }

  // 승인 대기 목록 - 현재 사용자가 결재할 수 있는 문서만 표시
  const pendingRequests = leaveRequests
    .filter(r => r.status === 'pending' && r.canApprove === true)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5)

  const handleApproveLeave = async (requestId: string) => {
    const request = leaveRequests.find(r => r.id === requestId)
    if (!request) return

    if (!window.confirm(`${request.memberName}님의 연차 신청을 승인하시겠습니까?`)) {
      return
    }

    // 즉시 UI 업데이트 (Optimistic Update)
    setLeaveRequests(prev => prev.map(r =>
      r.id === requestId
        ? { ...r, status: 'approved' as const, canApprove: false }
        : r
    ))

    // 백그라운드에서 API 호출 (재시도 포함)
    let success = false
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await approveLeaveRequest(Number(requestId))
        success = true
        break
      } catch (error) {
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    if (success) {
      toast.success('연차 신청을 승인했습니다', {
        description: `${request.memberName}님의 ${request.leaveType === 'annual' ? '연차' : '포상휴가'} 신청이 승인되었습니다.`,
      })
    } else {
      // 실패 시 UI 원복
      setLeaveRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, status: 'pending' as const, canApprove: true }
          : r
      ))
      toast.error('연차 승인에 실패했습니다')
    }
  }

  const handleRejectLeaveClick = (requestId: string) => {
    setSelectedRequestId(requestId)
    setIsRejectDialogOpen(true)
  }

  const handleRejectLeave = async () => {
    if (!selectedRequestId || !rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요')
      return
    }

    const request = leaveRequests.find(r => r.id === selectedRequestId)
    if (!request) return

    const requestIdToReject = selectedRequestId
    const reason = rejectReason

    // 즉시 UI 업데이트 (Optimistic Update)
    setLeaveRequests(prev => prev.map(r =>
      r.id === requestIdToReject
        ? { ...r, status: 'rejected' as const, canApprove: false }
        : r
    ))
    setIsRejectDialogOpen(false)
    setRejectReason('')
    setSelectedRequestId(null)

    // 백그라운드에서 API 호출 (재시도 포함)
    let success = false
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await rejectLeaveRequest(Number(requestIdToReject), reason)
        success = true
        break
      } catch (error) {
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    if (success) {
      toast.error('연차 신청을 반려했습니다', {
        description: `${request.memberName}님의 연차 신청이 반려되었습니다.`,
      })
    } else {
      // 실패 시 UI 원복
      setLeaveRequests(prev => prev.map(r =>
        r.id === requestIdToReject
          ? { ...r, status: 'pending' as const, canApprove: true }
          : r
      ))
      toast.error('연차 반려에 실패했습니다')
    }
  }

  // 일괄승인 함수
  const handleBulkApprove = async () => {
    if (selectedRequestIds.length === 0) {
      toast.error('승인할 요청을 선택해주세요')
      return
    }

    if (!window.confirm(`선택한 ${selectedRequestIds.length}건의 연차 신청을 일괄승인하시겠습니까?`)) {
      return
    }

    const idsToApprove = [...selectedRequestIds]

    // 즉시 UI 업데이트 (Optimistic Update)
    setLeaveRequests(prev => prev.map(request =>
      idsToApprove.includes(request.id)
        ? { ...request, status: 'approved' as const, canApprove: false }
        : request
    ))
    setSelectedRequestIds([])

    // 백그라운드에서 API 호출 (재시도 로직 포함)
    let failedIds: string[] = []
    const maxRetries = 2

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const targetIds = attempt === 0 ? idsToApprove : failedIds
      if (targetIds.length === 0) break

      const results = await Promise.allSettled(
        targetIds.map(requestId => approveLeaveRequest(Number(requestId)))
      )

      failedIds = targetIds.filter((_, index) => results[index].status === 'rejected')

      if (failedIds.length === 0) break
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 재시도 전 대기
      }
    }

    const successCount = idsToApprove.length - failedIds.length

    if (failedIds.length > 0) {
      // 실패한 항목은 UI 원복
      setLeaveRequests(prev => prev.map(request =>
        failedIds.includes(request.id)
          ? { ...request, status: 'pending' as const, canApprove: true }
          : request
      ))
      toast.error(`${successCount}건 승인 완료, ${failedIds.length}건 실패 (재시도 후에도 실패)`)
    } else {
      toast.success(`${successCount}건의 연차 신청을 일괄승인했습니다`)
    }
  }

  // 전체선택/해제 함수
  const handleSelectAll = () => {
    if (selectedRequestIds.length === pendingRequests.length) {
      setSelectedRequestIds([])
    } else {
      setSelectedRequestIds(pendingRequests.map(r => r.id))
    }
  }

  // 개별 선택 함수
  const handleSelectRequest = (requestId: string) => {
    if (selectedRequestIds.includes(requestId)) {
      setSelectedRequestIds(selectedRequestIds.filter(id => id !== requestId))
    } else {
      setSelectedRequestIds([...selectedRequestIds, requestId])
    }
  }

  const handleGrantReward = async () => {
    if (!rewardGrantFormData.memberId || !rewardGrantFormData.reason) {
      toast.error('필수 항목을 입력해주세요')
      return
    }

    const member = members.find(m => m.id === rewardGrantFormData.memberId)
    if (!member) return

    try {
      await grantRewardLeave(rewardGrantFormData.memberId, rewardGrantFormData.days, rewardGrantFormData.reason)

      toast.success('포상휴가를 부여했습니다', {
        description: `${member.name}님에게 ${rewardGrantFormData.days}일의 포상휴가가 부여되었습니다.`,
      })

      setIsRewardGrantDialogOpen(false)
      setRewardGrantFormData({
        memberId: '',
        days: 1,
        reason: '',
        attachment: null,
      })

      router.refresh()
    } catch (error) {
      console.error('Failed to grant reward leave:', error)
      toast.error('포상휴가 부여에 실패했습니다', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      })
    }
  }

  const handleViewDetail = (member: Member) => {
    setSelectedMember(member)
    setIsDetailDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRewardGrantFormData({ ...rewardGrantFormData, attachment: e.target.files[0] })
    }
  }

  // 상세보기 모달용 데이터
  const getMemberLeaveHistory = (memberId: string) => {
    return leaveRequests
      .filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge
            style={{
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            승인
          </Badge>
        )
      case 'pending':
        return (
          <Badge
            style={{
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning)',
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            승인 대기
          </Badge>
        )
      case 'rejected':
        return (
          <Badge
            style={{
              backgroundColor: 'var(--destructive-bg)',
              color: 'var(--destructive)',
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            반려
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Manual Adjustment View */}
      {viewMode === 'manual' && <LeaveManualAdjustment onBack={() => setViewMode('main')} members={members} />}

      {/* Main View */}
      {viewMode === 'main' && (
        <>
          {/* Header */}
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
                연차 관리
              </h2>
              <p
                style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
                className="mt-1"
              >
                구성원의 연차 상태를 조회하고 관리합니다
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsManualDialogOpen(true)}
                className="w-full sm:w-auto"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                <Edit className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">연차 수동 관리</span>
                <span className="sm:hidden">수동 관리</span>
              </Button>
            </div>
          </div>

          {/* 상단 요약 지표 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <Card
              className="rounded-2xl"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      style={{
                        fontSize: '16px',
                        color: 'var(--foreground)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      총 구성원 수
                    </p>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        lineHeight: 1.2,
                        marginTop: '8px',
                      }}
                    >
                      {totalMembers}명
                    </div>
                  </div>
                  <Users className="w-10 h-10 hidden md:block" style={{ color: 'var(--primary)', opacity: 0.5 }} />
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      style={{
                        fontSize: '16px',
                        color: 'var(--foreground)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      전체 연차 사용률
                    </p>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--secondary)',
                        lineHeight: 1.2,
                        marginTop: '8px',
                      }}
                    >
                      {usageRate}%
                    </div>
                  </div>
                  <TrendingUp
                    className="w-10 h-10 hidden md:block"
                    style={{ color: 'var(--secondary)', opacity: 0.5 }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      style={{
                        fontSize: '16px',
                        color: 'var(--foreground)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      승인 대기 요청
                    </p>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--warning)',
                        lineHeight: 1.2,
                        marginTop: '8px',
                      }}
                    >
                      {pendingRequestsCount}건
                    </div>
                  </div>
                  <Clock className="w-10 h-10 hidden md:block" style={{ color: 'var(--warning)', opacity: 0.5 }} />
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      style={{
                        fontSize: '16px',
                        color: 'var(--foreground)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      이번 달 연차 사용
                    </p>
                    <div
                      style={{ fontSize: '24px', fontWeight: 700, color: '#FF6692', lineHeight: 1.2, marginTop: '8px' }}
                    >
                      {thisMonthUsage}일
                    </div>
                  </div>
                  <CalendarCheck className="w-10 h-10 hidden md:block" style={{ color: '#FF6692', opacity: 0.5 }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 승인 대기 목록 위젯 */}
            <Card
              className="rounded-2xl"
              style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle
                    style={{ color: 'var(--card-foreground)', fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}
                  >
                    승인 대기 목록
                  </CardTitle>
                  {pendingRequests.length > 0 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.length === pendingRequests.length && pendingRequests.length > 0}
                        onChange={handleSelectAll}
                        style={{
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                        }}
                        aria-label="전체 선택"
                      />
                      <Button
                        size="sm"
                        onClick={handleBulkApprove}
                        disabled={selectedRequestIds.length === 0}
                        style={{
                          backgroundColor: selectedRequestIds.length > 0 ? '#10B981' : '#D3D9DC',
                          color: 'white',
                          fontSize: 'var(--font-size-caption)',
                          fontWeight: 500,
                        }}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        일괄승인
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock
                        className="w-12 h-12 mx-auto mb-3"
                        style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                      />
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
                        대기 중인 요청이 없습니다
                      </p>
                    </div>
                  ) : (
                    pendingRequests.map((request, index) => (
                      <div
                        key={request.id}
                        className="p-4 transition-all"
                        style={{
                          borderBottom: index < pendingRequests.length - 1 ? '1px solid var(--border)' : 'none',
                          transitionDuration: '150ms',
                          transitionTimingFunction: 'ease-in-out',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#F6F8F9'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedRequestIds.includes(request.id)}
                            onChange={() => handleSelectRequest(request.id)}
                            style={{
                              marginTop: '4px',
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px',
                            }}
                            aria-label={`${request.memberName} 선택`}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p
                                  style={{
                                    fontSize: 'var(--font-size-body)',
                                    fontWeight: 500,
                                    color: 'var(--card-foreground)',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {request.memberName}
                                </p>
                                <p
                                  style={{
                                    fontSize: 'var(--font-size-caption)',
                                    color: 'var(--muted-foreground)',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {request.leaveType === 'annual'
                                    ? '연차'
                                    : request.leaveType === 'reward'
                                    ? '포상휴가'
                                    : '연차'}{' '}
                                  · {request.days || 1}일
                                </p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            <p
                              style={{
                                fontSize: 'var(--font-size-caption)',
                                color: 'var(--card-foreground)',
                                lineHeight: 1.4,
                                marginBottom: '8px',
                              }}
                            >
                              {new Date(request.startDate).toLocaleDateString('ko-KR')} ~{' '}
                              {new Date(request.endDate).toLocaleDateString('ko-KR')}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleApproveLeave(request.id)}
                                style={{
                                  backgroundColor: '#10B981',
                                  color: 'white',
                                  fontSize: 'var(--font-size-caption)',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                승인
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRejectLeaveClick(request.id)}
                                style={{
                                  backgroundColor: '#EF4444',
                                  color: 'white',
                                  fontSize: 'var(--font-size-caption)',
                                  fontWeight: 500,
                                  flex: 1,
                                  border: 'none',
                                }}
                              >
                                <X className="w-3 h-3 mr-1" />
                                반려
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {pendingRequests.length > 0 && selectedRequestIds.length > 0 && (
                    <div className="pt-2 px-2">
                      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--primary)', textAlign: 'center' }}>
                        {selectedRequestIds.length}건 선택됨
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 월간 연차 캘린더 */}
            <div className="lg:col-span-2">
              <MonthlyLeaveCalendar leaveRequests={leaveRequests} />
            </div>
          </div>

          {/* 구성원 연차 현황 테이블 */}
          <LeaveManagementTable
            filteredMembers={filteredMembers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterTeam={filterTeam}
            setFilterTeam={setFilterTeam}
            teams={teams}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            getMemberLeaveStatus={getMemberLeaveStatus}
            handleViewDetail={handleViewDetail}
          />

          {/* 다이얼로그 모달들 */}
          <LeaveManagementDialogs
            isRewardGrantDialogOpen={isRewardGrantDialogOpen}
            setIsRewardGrantDialogOpen={setIsRewardGrantDialogOpen}
            rewardGrantFormData={rewardGrantFormData}
            setRewardGrantFormData={setRewardGrantFormData}
            members={members}
            handleGrantReward={handleGrantReward}
            handleFileChange={handleFileChange}
            isRejectDialogOpen={isRejectDialogOpen}
            setIsRejectDialogOpen={setIsRejectDialogOpen}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            setSelectedRequestId={setSelectedRequestId}
            handleRejectLeave={handleRejectLeave}
            isDetailDialogOpen={isDetailDialogOpen}
            setIsDetailDialogOpen={setIsDetailDialogOpen}
            selectedMember={selectedMember}
            getMemberLeaveHistory={getMemberLeaveHistory}
            getStatusBadge={getStatusBadge}
            isManualDialogOpen={isManualDialogOpen}
            setIsManualDialogOpen={setIsManualDialogOpen}
          />
        </>
      )}
    </div>
  )
}
