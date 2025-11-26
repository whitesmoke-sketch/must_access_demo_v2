'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Check,
  X,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ApprovalDocumentDetailModal } from './ApprovalDocumentDetailModal'
import { ApprovalProgressBadge } from './ApprovalProgressBadge'

type LeaveType = 'annual' | 'half_day' | 'quarter_day' | 'award'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

interface EmployeeInfo {
  id: string
  name: string
  department: { name: string } | { name: string }[] | null
  role: { name: string } | { name: string }[] | null
}

interface ApprovalDocument {
  id: number
  employee_id: string
  leave_type: LeaveType
  requested_days: number
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  requested_at: string
  approved_at: string | null
  current_step: number | null
  employee: EmployeeInfo | EmployeeInfo[] | null
}

interface ApprovalStep {
  request_id: number
  step_order: number
  status: string
  approver: {
    id: string
    name: string
  } | { id: string; name: string }[] | null
}

interface ApprovalDocumentsClientProps {
  documents: ApprovalDocument[]
  userId: string
  approvalLevel: number
  myApprovalRequestIds: number[]
  myApprovalStatusMap: Record<number, string>
  approvalStepsMap: Record<number, ApprovalStep[]>
}

export function ApprovalDocumentsClient({
  documents,
  userId,
  approvalLevel,
  myApprovalRequestIds,
  myApprovalStatusMap,
  approvalStepsMap,
}: ApprovalDocumentsClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | LeaveStatus>('all')
  const [filterType, setFilterType] = useState<'all' | 'leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [selectedDocument, setSelectedDocument] = useState<ApprovalDocument | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // 필터링 및 검색
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const employee = doc.employee ? (Array.isArray(doc.employee) ? doc.employee[0] : doc.employee) : null
      const employeeName = employee?.name || ''
      const departmentName = employee?.department
        ? Array.isArray(employee.department)
          ? employee.department[0]?.name || ''
          : employee.department.name
        : ''

      const matchesSearch =
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        departmentName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
      const matchesType = filterType === 'all' // 현재는 연차만 있음

      // 탭에 따른 필터링
      const matchesTab = activeTab === 'in-progress'
        ? doc.status === 'pending'
        : activeTab === 'completed'
        ? (doc.status === 'approved' || doc.status === 'rejected')
        : true

      return matchesSearch && matchesStatus && matchesType && matchesTab
    })
  }, [documents, searchQuery, filterStatus, filterType, activeTab])

  // 페이지네이션
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)

  // 상세 보기
  const handleViewDetail = (document: ApprovalDocument) => {
    setSelectedDocument(document)
    setIsDetailDialogOpen(true)
  }

  // 상태 뱃지 (사용자별로 다르게 표시)
  const getStatusBadge = (doc: ApprovalDocument) => {
    const styles = {
      pending: { backgroundColor: '#FFF8E5', color: '#FFAE1F' },
      approved: { backgroundColor: '#D1FAE5', color: '#10B981' },
      rejected: { backgroundColor: '#FEE2E2', color: '#EF4444' },
      cancelled: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
      waiting: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
    }

    const labels = {
      pending: '승인 대기',
      approved: '승인',
      rejected: '반려',
      cancelled: '취소',
      waiting: '대기중',
    }

    // 상태 표시 로직:
    // 1. 문서가 최종 완료 상태(approved, rejected, cancelled)이면 → 문서 상태 우선 표시
    // 2. 문서가 진행 중(pending)이면 → 내 승인 상태에 따라 표시
    const myStatus = myApprovalStatusMap[doc.id]
    let displayStatus: keyof typeof styles

    if (doc.status === 'rejected' || doc.status === 'approved' || doc.status === 'cancelled') {
      // 문서가 최종 완료되었으면 모든 사람에게 동일한 최종 상태 표시
      displayStatus = doc.status
    } else if (doc.status === 'pending' && myStatus) {
      // 문서가 진행 중이고 내가 관여한 경우, 내 승인 상태에 따라 표시
      if (myStatus === 'approved') {
        displayStatus = 'approved'
      } else if (myStatus === 'rejected') {
        displayStatus = 'rejected'
      } else {
        displayStatus = 'pending'
      }
    } else {
      // 기타 경우는 원래 문서 상태 표시
      displayStatus = doc.status
    }

    return (
      <Badge style={{ ...styles[displayStatus], fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
        {labels[displayStatus]}
      </Badge>
    )
  }

  // 연차 유형 뱃지
  const getLeaveTypeBadge = (type: LeaveType) => {
    const styles = {
      annual: { backgroundColor: 'rgba(99,91,255,0.1)', color: '#635BFF' },
      half_day: { backgroundColor: '#FFF8E5', color: '#FFAE1F' },
      quarter_day: { backgroundColor: '#FFE5F0', color: '#FF6692' },
      award: { backgroundColor: '#FFD2DF', color: '#FF6692' },
    }

    const labels = {
      annual: '연차',
      half_day: '반차',
      quarter_day: '반반차',
      award: '포상휴가',
    }

    return (
      <Badge style={{ ...styles[type], fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
        {labels[type]}
      </Badge>
    )
  }

  // employee 객체 추출 (배열일 경우 첫 번째 요소 반환)
  const getEmployee = (employee: EmployeeInfo | EmployeeInfo[] | null | undefined): EmployeeInfo | null => {
    if (!employee) return null
    return Array.isArray(employee) ? employee[0] || null : employee
  }

  // 부서명 추출
  const getDepartmentName = (department: { name: string } | { name: string }[] | null | undefined): string => {
    if (!department) return '-'
    return Array.isArray(department) ? department[0]?.name || '-' : department.name
  }

  // 직급명 추출
  const getRoleName = (role: { name: string } | { name: string }[] | null | undefined): string => {
    if (!role) return '-'
    return Array.isArray(role) ? role[0]?.name || '-' : role.name
  }

  // 결재선 정보를 ApprovalProgressBadge 형식으로 변환
  const getApprovalProgress = (docId: number, currentStep: number | null) => {
    const steps = approvalStepsMap[docId]
    if (!steps || steps.length === 0) return null

    return steps.map(step => {
      const approverName = step.approver
        ? Array.isArray(step.approver)
          ? step.approver[0]?.name || '알 수 없음'
          : step.approver.name
        : '알 수 없음'

      let status: 'completed' | 'pending' | 'waiting'
      if (step.status === 'approved') {
        status = 'completed'
      } else if (currentStep !== null && step.step_order === currentStep) {
        status = 'pending'
      } else {
        status = 'waiting'
      }

      return {
        name: approverName,
        status,
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 style={{ color: '#29363D', fontSize: '22px', fontWeight: 500, lineHeight: 1.25 }}>
          결재함
        </h2>
        <p style={{ color: '#5B6A72', fontSize: '16px', lineHeight: 1.5 }} className="mt-1">
          모든 결재 문서를 조회하고 승인/반려 처리합니다
        </p>
      </div>

      {/* 문서 목록 */}
      <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
        <CardHeader style={{ paddingBottom: '12px' }}>
          {/* 탭 버튼 */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: '전체' },
              { value: 'in-progress', label: '결재대기' },
              { value: 'completed', label: '결재완료' },
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
                  setActiveTab(tab.value as typeof activeTab)
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#5B6A72' }} />
              <Input
                placeholder="이름, 팀명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* 필터들 */}
            <div className="flex gap-4 lg:flex-shrink-0">
              <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
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
          <div className="mb-3" style={{ fontSize: '12px', color: '#5B6A72' }}>
            전체 {filteredDocuments.length}건
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: '2px solid #E5E8EB' }}>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>문서 유형</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>신청자</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>소속</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72' }}>신청일시</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '140px', minWidth: '140px' }}>상태</TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '60px', minWidth: '60px' }}>상세</TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: '12px', fontWeight: 600, color: '#5B6A72', width: '160px', minWidth: '160px' }}>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center" style={{ paddingTop: '48px', paddingBottom: '48px', color: '#5B6A72', fontSize: '14px' }}>
                      결재 문서가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocuments.map((doc) => {
                    // 내가 승인해야 할 차례인지 확인
                    const isMyTurn = myApprovalRequestIds.includes(doc.id)
                    const canApprove = doc.status === 'pending' && isMyTurn
                    const employee = getEmployee(doc.employee)

                    return (
                      <TableRow
                        key={doc.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="p-3">{getLeaveTypeBadge(doc.leave_type)}</TableCell>
                        <TableCell className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback style={{ backgroundColor: '#635BFF', color: 'white', fontSize: '12px', fontWeight: 500 }}>
                                {employee?.name.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 500, color: '#29363D' }}>
                                {employee?.name || '알 수 없음'}
                              </p>
                              <p style={{ fontSize: '12px', color: '#5B6A72' }}>
                                {getRoleName(employee?.role)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: '14px', color: '#29363D' }}>
                          {getDepartmentName(employee?.department)}
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: '14px', color: '#29363D' }}>
                          {new Date(doc.requested_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="p-3" style={{ width: '140px', minWidth: '140px' }}>
                          {(() => {
                            // 완료된 문서(승인/반려/취소)는 단순 상태 뱃지만 표시
                            if (doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'cancelled') {
                              return getStatusBadge(doc)
                            }
                            // 진행 중인 문서만 결재 진행 상태 표시
                            const approvalProgress = getApprovalProgress(doc.id, doc.current_step)
                            if (approvalProgress && approvalProgress.length > 1) {
                              return <ApprovalProgressBadge approvers={approvalProgress} />
                            }
                            return getStatusBadge(doc)
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
                        <TableCell className="text-center p-3" style={{ width: '160px', minWidth: '160px' }}>
                          <div className="flex items-center justify-center gap-2">
                            {canApprove ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleViewDetail(doc)}
                                  style={{ backgroundColor: '#10B981', color: 'white' }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleViewDetail(doc)}
                                  style={{ backgroundColor: '#EF4444', color: 'white' }}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  반려
                                </Button>
                              </>
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

          {/* Pagination */}
          {filteredDocuments.length > itemsPerPage && (
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
                  {currentPage > 2 && totalPages > 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  {currentPage > 1 && currentPage !== 2 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(currentPage - 1)}
                        isActive={false}
                        className="cursor-pointer"
                      >
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  {currentPage !== 1 && currentPage !== totalPages && (
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
                  {currentPage < totalPages && currentPage !== totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(currentPage + 1)}
                        isActive={false}
                        className="cursor-pointer"
                      >
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  {currentPage < totalPages - 1 && totalPages > 2 && (
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

      {/* 상세 보기 다이얼로그 */}
      <ApprovalDocumentDetailModal
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        document={selectedDocument}
        userId={userId}
        initialApprovalSteps={selectedDocument ? approvalStepsMap[selectedDocument.id] : undefined}
      />
    </div>
  )
}
