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
  Undo2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
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
import { useRouter } from 'next/navigation'
import { ApprovalProgressBadge } from './ApprovalProgressBadge'
import { withdrawDocument } from '@/app/(authenticated)/documents/actions'

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'retrieved'

interface MyDocument {
  id: number
  employee_id: string
  leave_type: 'annual' | 'half_day' | 'half_day_am' | 'half_day_pm' | 'sick' | 'award' | 'overtime' | string
  requested_days: number
  start_date: string
  end_date: string
  reason: string
  status: DocumentStatus
  requested_at: string
  approved_at: string | null
  rejected_at: string | null
  retrieved_at: string | null
  current_step: number | null
  doc_type?: string
  title?: string
}

interface ApprovalStep {
  request_id: number
  step_order: number
  status: string
  approval_type?: string
  approved_at: string | null
  approver: {
    id: string
    name: string
    department: { name: string } | { name: string }[] | null
    role: { name: string } | { name: string }[] | null
  } | {
    id: string
    name: string
    department: { name: string } | { name: string }[] | null
    role: { name: string } | { name: string }[] | null
  }[] | null
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | DocumentStatus>('all')
  const [filterType, setFilterType] = useState<'all' | 'leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [selectedDocument, setSelectedDocument] = useState<MyDocument | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null)

  // 회수 다이얼로그 상태
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawTargetId, setWithdrawTargetId] = useState<number | null>(null)

  // 회수 다이얼로그 열기
  const openWithdrawDialog = (documentId: number) => {
    setWithdrawTargetId(documentId)
    setWithdrawReason('')
    setIsWithdrawDialogOpen(true)
  }

  // 회수 처리
  const handleWithdraw = async () => {
    if (!withdrawTargetId || withdrawingId) return // 대상이 없거나 이미 처리 중인 경우

    setWithdrawingId(withdrawTargetId)
    try {
      const result = await withdrawDocument(withdrawTargetId, withdrawReason)

      if (result.success) {
        toast.success('문서가 회수되었습니다')
        setIsWithdrawDialogOpen(false)
        setWithdrawReason('')
        setWithdrawTargetId(null)
        router.refresh()
      } else {
        toast.error(result.error || '회수 처리 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('Withdraw error:', error)
      toast.error('회수 처리 중 오류가 발생했습니다')
    } finally {
      setWithdrawingId(null)
    }
  }

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
          ? doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'cancelled' || doc.status === 'retrieved'
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

  // 상태 뱃지 (Figma 디자인과 동일한 CSS 변수 사용)
  const getStatusBadge = (status: DocumentStatus) => {
    const styles: Record<DocumentStatus, { backgroundColor: string; color: string }> = {
      pending: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      approved: { backgroundColor: 'var(--success-bg)', color: 'var(--success)' },
      rejected: { backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' },
      cancelled: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
      retrieved: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
    }

    const labels: Record<DocumentStatus, string> = {
      pending: '승인 대기',
      approved: '승인 완료',
      rejected: '반려',
      cancelled: '취소됨',
      retrieved: '회수됨',
    }

    // 알 수 없는 상태에 대한 기본값
    const defaultStyle = { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
    const currentStyle = styles[status] || defaultStyle
    const currentLabel = labels[status] || status

    return (
      <Badge
        style={{
          ...currentStyle,
          fontSize: '12px',
          lineHeight: 1.4,
          fontWeight: 600,
          border: 'none',
        }}
      >
        {currentLabel}
      </Badge>
    )
  }

  // 결재선 정보를 ApprovalProgressBadge 형식으로 변환
  const getApprovalProgress = (docId: number, currentStep: number | null, status: DocumentStatus) => {
    const steps = approvalHistoryMap[docId]
    if (!steps || steps.length === 0) return null

    // 최종 상태(승인완료, 반려, 취소, 회수)인 경우 진행과정 표시 안함
    if (status === 'approved' || status === 'rejected' || status === 'cancelled' || status === 'retrieved') {
      return null
    }

    return steps.map(step => {
      const approverData = step.approver
        ? Array.isArray(step.approver)
          ? step.approver[0]
          : step.approver
        : null

      const approverName = approverData?.name || '알 수 없음'

      // 부서명 추출
      const departmentName = approverData?.department
        ? Array.isArray(approverData.department)
          ? approverData.department[0]?.name
          : approverData.department.name
        : undefined

      // 직급명 추출
      const roleName = approverData?.role
        ? Array.isArray(approverData.role)
          ? approverData.role[0]?.name
          : approverData.role.name
        : undefined

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
        department: departmentName,
        role: roleName,
        stepType: step.approval_type,
        stepOrder: step.step_order,
      }
    })
  }

  // 연차 타입 텍스트
  const getLeaveTypeText = (type: string) => {
    const types: Record<string, string> = {
      annual: '연차',
      half_day: '반차',
      half_day_am: '오전 반차',
      half_day_pm: '오후 반차',
      award: '포상휴가',
      sick: '병가',
      overtime: '야근수당',
    }
    return types[type] || type
  }

  // 문서 상세 텍스트 생성
  const getDocumentDetail = (doc: MyDocument) => {
    const docType = doc.doc_type || 'leave'

    // 문서 유형별 라벨
    const docTypeLabels: Record<string, string> = {
      leave: '연차 신청',
      expense: '지출결의서',
      expense_proposal: '지출품의서',
      budget: '예산 신청',
      overtime: '야근 수당 신청',
      welfare: '복리후생 신청',
      general: '일반 문서',
      resignation: '퇴직 신청',
    }

    // 야근 수당 문서
    if (docType === 'overtime' || doc.leave_type === 'overtime') {
      const workDate = doc.start_date ? new Date(doc.start_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : ''
      return `${doc.reason || '야근'} (${workDate}, ${doc.requested_days}시간)`
    }

    // 비연차 문서 (expense, budget, welfare, general, resignation 등)
    if (docType !== 'leave') {
      const docTypeLabel = docTypeLabels[docType] || docType
      if (doc.title) {
        return doc.title
      }
      if (doc.reason) {
        return doc.reason
      }
      return docTypeLabel
    }

    // 연차 문서: 날짜 범위 표시
    if (!doc.start_date || !doc.end_date) {
      if (doc.reason) return doc.reason
      return '연차 신청'
    }
    return `${doc.reason} (${doc.start_date} ~ ${doc.end_date})`
  }

  // 결재 히스토리 이벤트 정보 (Figma 디자인과 동일한 CSS 변수 사용)
  const getHistoryEventInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: '승인', color: 'var(--success)', bgColor: 'var(--success-bg)', icon: CheckCircle }
      case 'rejected':
        return { label: '반려', color: 'var(--destructive)', bgColor: 'var(--destructive-bg)', icon: XCircle }
      case 'retrieved':
        return { label: '회수', color: 'var(--muted-foreground)', bgColor: 'var(--muted)', icon: Undo2 }
      case 'pending':
        return { label: '대기중', color: 'var(--muted-foreground)', bgColor: 'var(--muted)', icon: ClockIcon }
      default:
        return { label: status, color: 'var(--muted-foreground)', bgColor: 'var(--muted)', icon: ClockIcon }
    }
  }

  // 문서 유형 라벨
  const getDocTypeLabel = (docType: string | undefined): string => {
    const labels: Record<string, string> = {
      leave: '연차 신청서',
      expense: '지출결의서',
      overtime: '야근 수당 신청서',
      welfare: '복리후생 신청서',
      general: '일반 문서',
      budget: '예산 신청서',
      resignation: '퇴직 신청서',
    }
    return labels[docType || 'leave'] || docType || '문서'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h2 style={{ color: 'var(--card-foreground)', fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-h1)', lineHeight: 1.25 }}>
            기안함
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--font-size-body)', lineHeight: 1.5 }} className="mt-1">
            내가 작성한 문서를 조회하고 관리합니다
          </p>
        </div>
        <Link href="/request">
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
            <FilePlus className="w-4 h-4 mr-2" />
            기안 문서 작성
          </Button>
        </Link>
      </div>

      {/* 문서 목록 */}
      <Card style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
        <CardHeader style={{ paddingBottom: '12px' }}>
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
                  backgroundColor: activeTab === tab.value ? 'var(--primary)' : 'var(--muted)',
                  color: activeTab === tab.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  fontSize: '14px',
                  fontWeight: 500,
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.value) {
                    e.currentTarget.style.filter = 'brightness(0.97)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.value) {
                    e.currentTarget.style.filter = 'brightness(1)';
                  }
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
            {/* 검색 인풋 */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="문서 제목으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* 필터들 */}
            <div className="flex gap-4 lg:flex-shrink-0">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                  <SelectItem value="cancelled">취소됨</SelectItem>
                  <SelectItem value="retrieved">회수됨</SelectItem>
                </SelectContent>
              </Select>
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
            </div>
          </div>

          {/* 테이블 */}
          <div className="mb-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)' }}>
            전체 {filteredDocuments.length}건
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow style={{ borderBottom: '2px solid var(--border)' }}>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>문서 종류</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>문서 제목</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>작성일</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>상태</TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center" style={{ paddingTop: '48px', paddingBottom: '48px', color: 'var(--muted-foreground)', fontSize: 'var(--font-size-caption)' }}>
                      작성한 문서가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocuments.map((doc) => {
                    return (
                      <TableRow
                        key={doc.id}
                        className="transition-all"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: 'transparent',
                          transitionDuration: '150ms',
                          transitionTimingFunction: 'ease-in-out',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: 'var(--primary-bg)',
                              color: 'var(--primary)',
                              fontSize: '12px',
                              lineHeight: 1.4,
                              fontWeight: 600,
                              border: 'none',
                            }}
                          >
                            {getLeaveTypeText(doc.leave_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                          {getDocumentDetail(doc)}
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--foreground)' }}>
                          {new Date(doc.requested_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="p-3">
                          {(() => {
                            const approvalProgress = getApprovalProgress(doc.id, doc.current_step, doc.status)
                            if (approvalProgress && approvalProgress.length >= 1) {
                              return <ApprovalProgressBadge approvers={approvalProgress} />
                            }
                            return getStatusBadge(doc.status)
                          })()}
                        </TableCell>
                        <TableCell className="text-center p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(doc)}
                            style={{ color: 'var(--foreground)', padding: '4px 8px' }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.4,
              }}>
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[80vh]"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 'var(--font-weight-h4)',
              lineHeight: 1.3,
              color: 'var(--foreground)',
            }}>
              문서 상세
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              문서 정보를 확인하세요
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <Card className="overflow-y-auto max-h-[calc(80vh-180px)]">
              <div className="space-y-4 p-6">
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                  신청 유형
                </p>
                <Badge
                  style={{
                    backgroundColor: 'var(--primary-bg)',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    fontWeight: 600,
                    border: 'none',
                  }}
                >
                  {getLeaveTypeText(selectedDocument.leave_type)}
                </Badge>
              </div>

              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                  {selectedDocument.leave_type === 'overtime' ? '업무 내용' : '신청 사유'}
                </p>
                <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                  {selectedDocument.reason}
                </p>
              </div>

              {selectedDocument.leave_type === 'overtime' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                      야근 날짜
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                      {selectedDocument.start_date}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                      야근 시간
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                      {selectedDocument.requested_days}시간
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                        시작일
                      </p>
                      <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                        {selectedDocument.start_date}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                        종료일
                      </p>
                      <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                        {selectedDocument.end_date}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                      사용일수
                    </p>
                    <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                      {selectedDocument.requested_days}일
                    </p>
                  </div>
                </>
              )}

              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                  신청 시간
                </p>
                <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                  {new Date(selectedDocument.requested_at).toLocaleString('ko-KR')}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                  상태
                </p>
                {getStatusBadge(selectedDocument.status)}
              </div>

              {/* 승인/반려/회수 시간 */}
              {selectedDocument.approved_at && (
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                    승인 시간
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                    {new Date(selectedDocument.approved_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
              {selectedDocument.rejected_at && (
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                    반려 시간
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                    {new Date(selectedDocument.rejected_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
              {selectedDocument.retrieved_at && (
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4, marginBottom: '4px' }}>
                    회수 시간
                  </p>
                  <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                    {new Date(selectedDocument.retrieved_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}

              {/* 결재 상태 로그 */}
              <div className="space-y-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <p style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                }}>
                  결재 상태 로그
                </p>
                <div className="space-y-3">
                  {/* 신청 이벤트 */}
                  <div className="pl-4 pr-3 pt-3 pb-0" style={{ borderLeft: '4px solid var(--muted-foreground)' }}>
                    <div className="flex items-start gap-3 pb-3">
                      <div
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: 'var(--muted)' }}
                      >
                        <ClockIcon className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Badge style={{
                            backgroundColor: 'var(--muted)',
                            color: 'var(--muted-foreground)',
                            fontSize: '12px',
                            lineHeight: 1.4,
                            fontWeight: 600,
                            border: 'none',
                          }}>
                            신청
                          </Badge>
                          <span style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                          }}>
                            {new Date(selectedDocument.requested_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          lineHeight: 1.5,
                        }}>
                          {getDocTypeLabel(selectedDocument.doc_type)} 작성
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 결재 히스토리 */}
                  {approvalHistoryMap[selectedDocument.id]?.map((step) => {
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
                                  lineHeight: 1.4,
                                  fontWeight: 600,
                                  border: 'none',
                                }}
                              >
                                {eventInfo.label} ({step.step_order}차)
                              </Badge>
                              <span style={{
                                fontSize: 'var(--font-size-caption)',
                                color: 'var(--muted-foreground)',
                                lineHeight: 1.4,
                              }}>
                                {step.approved_at
                                  ? new Date(step.approved_at).toLocaleString('ko-KR')
                                  : '-'}
                              </span>
                            </div>
                            <p style={{
                              fontSize: 'var(--font-size-body)',
                              fontWeight: 600,
                              color: 'var(--foreground)',
                              lineHeight: 1.5,
                            }}>
                              {step.approver.name}
                            </p>
                            <p style={{
                              fontSize: 'var(--font-size-caption)',
                              color: 'var(--muted-foreground)',
                              lineHeight: 1.4,
                            }}>
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
            </Card>
          )}

          {/* 회수 버튼 */}
          {selectedDocument && selectedDocument.status === 'pending' && (
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsDetailDialogOpen(false)
                  openWithdrawDialog(selectedDocument.id)
                }}
                style={{
                  backgroundColor: 'var(--muted-foreground)',
                  color: 'var(--background)',
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                회수
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 회수 다이얼로그 */}
      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DialogHeader>
            <DialogTitle style={{
              color: 'var(--card-foreground)',
              fontSize: 'var(--font-size-h4)',
              fontWeight: 'var(--font-weight-h4)',
              lineHeight: 1.3,
            }}>
              문서 회수
            </DialogTitle>
            <DialogDescription style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
            }}>
              문서를 회수하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="회수 사유를 입력하세요"
              style={{ height: '80px' }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWithdrawDialogOpen(false)}
              style={{
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawingId !== null}
              style={{
                backgroundColor: 'var(--muted-foreground)',
                color: 'var(--background)',
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {withdrawingId !== null ? '처리중...' : '회수'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
