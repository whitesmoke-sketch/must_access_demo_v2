'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  FilePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import { ApprovalProgressBadge } from './ApprovalProgressBadge'

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

interface MyDocument {
  id: number
  employee_id: string
  leave_type: 'annual' | 'half_day_am' | 'half_day_pm' | 'sick'
  requested_days: number
  start_date: string
  end_date: string
  reason: string
  status: DocumentStatus
  requested_at: string
  approved_at: string | null
  current_step: number | null
}

interface ApprovalStep {
  request_id: number
  step_order: number
  status: string
  approved_at: string | null
  approver: {
    id: string
    name: string
    department: { name: string } | null
    role: { name: string } | null
  }
}

interface MyDocumentsClientProps {
  documents: MyDocument[]
  userId: string
  approvalHistoryMap: Record<number, ApprovalStep[]>
}

export function MyDocumentsClient({
  documents,
  userId,
  approvalHistoryMap,
}: MyDocumentsClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | DocumentStatus>('all')
  const [filterType, setFilterType] = useState<'all' | 'leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [selectedDocument, setSelectedDocument] = useState<MyDocument | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // 필터링 및 검색
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.reason.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
      // 문서 유형 필터 (현재는 연차 신청만 있음)
      const matchesType = filterType === 'all' || filterType === 'leave'

      // 탭에 따른 필터링
      const matchesTab =
        activeTab === 'in-progress'
          ? doc.status === 'pending'
          : activeTab === 'completed'
          ? doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'cancelled'
          : true

      return matchesSearch && matchesStatus && matchesTab && matchesType
    })
  }, [documents, searchQuery, filterStatus, activeTab, filterType])

  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)

  // 상세 보기
  const handleViewDetail = (document: MyDocument) => {
    setSelectedDocument(document)
    setIsDetailDialogOpen(true)
  }

  // 상태 뱃지
  const getStatusBadge = (status: DocumentStatus) => {
    const styles = {
      pending: { backgroundColor: '#FFF8E5', color: '#FFAE1F' },
      approved: { backgroundColor: '#D1FAE5', color: '#10B981' },
      rejected: { backgroundColor: '#FEE2E2', color: '#EF4444' },
      cancelled: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
    }

    const labels = {
      pending: '승인 대기',
      approved: '승인 완료',
      rejected: '반려',
      cancelled: '취소됨',
    }

    return (
      <Badge
        style={{
          ...styles[status],
          fontSize: '12px',
          lineHeight: 1.4,
          fontWeight: 500,
          border: 'none',
        }}
      >
        {labels[status]}
      </Badge>
    )
  }

  // 결재선 정보를 ApprovalProgressBadge 형식으로 변환
  const getApprovalProgress = (docId: number, currentStep: number | null, status: DocumentStatus) => {
    const steps = approvalHistoryMap[docId]
    if (!steps || steps.length === 0) return null

    // 최종 상태(승인완료, 반려, 취소)인 경우 진행과정 표시 안함
    if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
      return null
    }

    return steps.map(step => {
      const approverData = step.approver
      const approverName = approverData
        ? Array.isArray(approverData)
          ? approverData[0]?.name || '알 수 없음'
          : approverData.name
        : '알 수 없음'

      let approvalStatus: 'completed' | 'pending' | 'waiting'
      if (step.status === 'approved') {
        approvalStatus = 'completed'
      } else if (currentStep !== null && step.step_order === currentStep) {
        approvalStatus = 'pending'
      } else {
        approvalStatus = 'waiting'
      }

      return {
        name: approverName,
        status: approvalStatus,
      }
    })
  }

  // 연차 타입 텍스트
  const getLeaveTypeText = (type: string) => {
    const types: Record<string, string> = {
      annual: '연차',
      half_day_am: '오전 반차',
      half_day_pm: '오후 반차',
      sick: '병가',
    }
    return types[type] || type
  }

  // 결재 히스토리 이벤트 정보
  const getHistoryEventInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: '승인', color: '#4CD471', bgColor: 'rgba(76, 212, 113, 0.1)', icon: CheckCircle }
      case 'rejected':
        return { label: '반려', color: '#FF6B6B', bgColor: '#FFF0ED', icon: XCircle }
      case 'pending':
        return { label: '대기중', color: '#5B6A72', bgColor: '#F6F8F9', icon: ClockIcon }
      default:
        return { label: status, color: '#5B6A72', bgColor: '#F6F8F9', icon: ClockIcon }
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h2 style={{ color: '#29363D', fontSize: '22px', fontWeight: 500, lineHeight: 1.25 }}>
            기안함
          </h2>
          <p style={{ color: '#5B6A72', fontSize: '16px', lineHeight: 1.5 }} className="mt-1">
            내가 작성한 문서를 조회하고 관리합니다
          </p>
        </div>
        <Link href="/request">
          <Button className="w-full sm:w-auto" style={{ backgroundColor: '#635BFF' }}>
            <FilePlus className="w-4 h-4 mr-2" />
            기안 문서 작성
          </Button>
        </Link>
      </div>

      {/* 문서 목록 */}
      <Card className="border rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          {/* 탭 버튼 */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: '전체' },
              { value: 'in-progress', label: '진행중' },
              { value: 'completed', label: '완료됨' },
            ].map((tab) => (
              <button
                key={tab.value}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: activeTab === tab.value ? '#635BFF' : '#F6F8F9',
                  color: activeTab === tab.value ? '#FFFFFF' : '#5B6A72',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onClick={() => {
                  setActiveTab(tab.value as any)
                  setCurrentPage(1)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* 필터 및 검색 */}
          <div className="mb-4 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="신청 사유로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: typeof filterType) => setFilterType(value)}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 문서</SelectItem>
                <SelectItem value="leave">연차 신청</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">승인 대기</SelectItem>
                <SelectItem value="approved">승인 완료</SelectItem>
                <SelectItem value="rejected">반려</SelectItem>
                <SelectItem value="cancelled">취소됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 테이블 */}
          <div className="mb-3" style={{ fontSize: '12px', color: '#5B6A72' }}>
            전체 {filteredDocuments.length}건
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: '2px solid #E5E8EB' }}>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>문서 종류</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>문서 제목</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>작성일</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '140px', minWidth: '140px' }}>상태</TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '60px', minWidth: '60px' }}>상세</TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '120px', minWidth: '120px' }}>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center" style={{ paddingTop: '48px', paddingBottom: '48px', color: '#5B6A72', fontSize: '14px' }}>
                      작성한 문서가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocuments.map((doc) => {
                    const canWithdraw = doc.status === 'pending'
                    const canCancelRequest = doc.status === 'approved'

                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/50">
                        <TableCell className="p-3">
                          <Badge
                            style={{
                              backgroundColor: 'rgba(99, 91, 255, 0.1)',
                              color: '#635BFF',
                              fontSize: '12px',
                              fontWeight: 500,
                              border: 'none',
                            }}
                          >
                            {getLeaveTypeText(doc.leave_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: '14px', color: '#29363D' }}>
                          {doc.reason} ({doc.start_date} ~ {doc.end_date})
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: '14px', color: '#29363D' }}>
                          {new Date(doc.requested_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="p-3" style={{ width: '140px', minWidth: '140px' }}>
                          {(() => {
                            const approvalProgress = getApprovalProgress(doc.id, doc.current_step, doc.status)
                            if (approvalProgress && approvalProgress.length > 1) {
                              return <ApprovalProgressBadge approvers={approvalProgress} />
                            }
                            return getStatusBadge(doc.status)
                          })()}
                        </TableCell>
                        <TableCell className="text-center p-3" style={{ width: '60px', minWidth: '60px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(doc)}
                            style={{ color: '#29363D', padding: '4px 8px' }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center p-3" style={{ width: '120px', minWidth: '120px' }}>
                          <div className="flex items-center justify-center gap-2">
                            {canWithdraw ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetail(doc)}
                                style={{ fontSize: '12px' }}
                              >
                                회수
                              </Button>
                            ) : canCancelRequest ? (
                              <Button
                                size="sm"
                                onClick={() => handleViewDetail(doc)}
                                style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '12px' }}
                              >
                                취소 요청
                              </Button>
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>문서 상세</DialogTitle>
            <DialogDescription>문서 정보를 확인하세요</DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">신청 유형</p>
                <Badge
                  style={{
                    backgroundColor: 'rgba(99, 91, 255, 0.1)',
                    color: '#635BFF',
                    fontSize: '12px',
                  }}
                >
                  {getLeaveTypeText(selectedDocument.leave_type)}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">신청 사유</p>
                <p className="text-sm">{selectedDocument.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">시작일</p>
                  <p className="text-sm">{selectedDocument.start_date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">종료일</p>
                  <p className="text-sm">{selectedDocument.end_date}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">사용일수</p>
                <p className="text-sm">{selectedDocument.requested_days}일</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">신청 시간</p>
                <p className="text-sm">
                  {new Date(selectedDocument.requested_at).toLocaleString('ko-KR')}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">상태</p>
                {getStatusBadge(selectedDocument.status)}
              </div>

              {/* 결재 상태 로그 */}
              <div className="space-y-3 mt-5 pt-5 border-t">
                <p className="text-base font-semibold">결재 상태 로그</p>
                <div className="space-y-3">
                  {/* 신청 이벤트 */}
                  <div className="pl-4 pr-3 pt-3 pb-0 border-l-4 border-gray-400">
                    <div className="flex items-start gap-3 pb-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        <ClockIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Badge style={{ backgroundColor: '#F6F8F9', color: '#5B6A72', fontSize: '12px', border: 'none' }}>
                            신청
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(selectedDocument.requested_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">연차 신청서 작성</p>
                      </div>
                    </div>
                  </div>

                  {/* 결재 히스토리 */}
                  {approvalHistoryMap[selectedDocument.id]?.map((step, index) => {
                    const eventInfo = getHistoryEventInfo(step.status)
                    const EventIcon = eventInfo.icon

                    return (
                      <div
                        key={`${step.request_id}-${step.step_order}`}
                        className="pl-4 pr-3 pt-3 pb-0"
                        style={{ borderLeft: `4px solid ${eventInfo.color}` }}
                      >
                        <div className="flex items-start gap-3 pb-3">
                          <div
                            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                            style={{ backgroundColor: eventInfo.bgColor }}
                          >
                            <EventIcon style={{ width: '16px', height: '16px', color: eventInfo.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Badge
                                style={{
                                  backgroundColor: eventInfo.bgColor,
                                  color: eventInfo.color,
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: 'none',
                                }}
                              >
                                {eventInfo.label} ({step.step_order}차)
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {step.approved_at
                                  ? new Date(step.approved_at).toLocaleString('ko-KR')
                                  : '-'}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{step.approver.name}</p>
                            <p className="text-xs text-gray-600">
                              {step.approver.department?.name} · {step.approver.role?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
