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

type LeaveType = 'annual' | 'half_day' | 'half_day_am' | 'half_day_pm' | 'quarter_day' | 'award' | 'sick'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'retrieved'

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
  approval_type?: string
  approver: {
    id: string
    name: string
    department?: { name: string } | { name: string }[] | null
    role?: { name: string } | { name: string }[] | null
  } | {
    id: string
    name: string
    department?: { name: string } | { name: string }[] | null
    role?: { name: string } | { name: string }[] | null
  }[] | null
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
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed' | 'reference'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | LeaveStatus>('all')
  const [filterType, setFilterType] = useState<'all' | 'leave'>('all')
  const [filterReadStatus, setFilterReadStatus] = useState<'all' | 'read' | 'unread'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Mock 참조 문서 데이터
  const [referenceDocuments] = useState([
    {
      id: 'ref-001',
      employee_id: 'emp-001',
      memberName: '홍길동',
      department: '개발팀',
      role: '과장',
      leave_type: 'annual' as LeaveType,
      start_date: '2024-12-01',
      end_date: '2024-12-03',
      requested_days: 3,
      reason: '개인 사유',
      status: 'approved' as LeaveStatus,
      requested_at: '2024-11-25T09:00:00',
      readStatus: 'unread' as const,
    },
    {
      id: 'ref-002',
      employee_id: 'emp-002',
      memberName: '김철수',
      department: '마케팅팀',
      role: '부장',
      leave_type: 'half_day' as LeaveType,
      start_date: '2024-11-26',
      end_date: '2024-11-26',
      requested_days: 0.5,
      reason: '프로젝트 마감',
      status: 'pending' as LeaveStatus,
      requested_at: '2024-11-26T14:30:00',
      readStatus: 'read' as const,
    },
  ])
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
        ? (doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'cancelled' || doc.status === 'retrieved')
        : true

      return matchesSearch && matchesStatus && matchesType && matchesTab
    })
  }, [documents, searchQuery, filterStatus, filterType, activeTab])

  // 참조 문서 필터링
  const filteredReferenceDocuments = useMemo(() => {
    return referenceDocuments.filter((doc) => {
      const matchesSearch =
        doc.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesReadStatus = filterReadStatus === 'all' || doc.readStatus === filterReadStatus

      return matchesSearch && matchesReadStatus
    })
  }, [referenceDocuments, searchQuery, filterReadStatus])

  // 페이지네이션
  const displayDocuments = activeTab === 'reference' ? filteredReferenceDocuments : filteredDocuments
  const paginatedDocuments = displayDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(displayDocuments.length / itemsPerPage)

  // 상세 보기
  const handleViewDetail = (document: ApprovalDocument) => {
    setSelectedDocument(document)
    setIsDetailDialogOpen(true)
  }

  // 상태 뱃지 (사용자별로 다르게 표시)
  const getStatusBadge = (doc: ApprovalDocument) => {
    const styles: Record<string, { backgroundColor: string; color: string }> = {
      pending: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      approved: { backgroundColor: 'var(--success-bg)', color: 'var(--success)' },
      rejected: { backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' },
      cancelled: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
      retrieved: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
      waiting: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
    }

    const labels: Record<string, string> = {
      pending: '승인 대기',
      approved: '승인',
      rejected: '반려',
      cancelled: '취소',
      retrieved: '회수',
      waiting: '대기중',
    }

    // 상태 표시 로직:
    // 1. 문서가 최종 완료 상태(approved, rejected, cancelled, retrieved)이면 → 문서 상태 우선 표시
    // 2. 문서가 진행 중(pending)이면 → 내 승인 상태에 따라 표시
    const myStatus = myApprovalStatusMap[doc.id]
    let displayStatus: string

    if (doc.status === 'rejected' || doc.status === 'approved' || doc.status === 'cancelled' || doc.status === 'retrieved') {
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

    const defaultStyle = { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
    const currentStyle = styles[displayStatus] || defaultStyle
    const currentLabel = labels[displayStatus] || displayStatus || '알 수 없음'

    return (
      <Badge className="!border-0" style={{ ...currentStyle, fontSize: 'var(--font-size-small)', lineHeight: 'var(--line-height-small)', fontWeight: 600 }}>
        {currentLabel}
      </Badge>
    )
  }

  // 연차 유형 뱃지
  const getLeaveTypeBadge = (type: LeaveType) => {
    const styles: Record<string, { backgroundColor: string; color: string }> = {
      annual: { backgroundColor: 'var(--primary-bg)', color: 'var(--primary)' },
      half_day: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      half_day_am: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      half_day_pm: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      quarter_day: { backgroundColor: 'var(--chart-4-bg)', color: 'var(--chart-4)' },
      award: { backgroundColor: 'var(--chart-4-bg)', color: 'var(--chart-4)' },
      sick: { backgroundColor: 'var(--destructive-bg)', color: 'var(--destructive)' },
    }

    const labels: Record<string, string> = {
      annual: '연차',
      half_day: '반차',
      half_day_am: '오전 반차',
      half_day_pm: '오후 반차',
      quarter_day: '반반차',
      award: '포상휴가',
      sick: '병가',
    }

    const defaultStyle = { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
    const currentStyle = styles[type] || defaultStyle
    const currentLabel = labels[type] || type || '기타'

    return (
      <Badge className="!border-0" style={{ ...currentStyle, fontSize: 'var(--font-size-small)', lineHeight: 'var(--line-height-small)', fontWeight: 600 }}>
        {currentLabel}
      </Badge>
    )
  }

  // 열람 상태 뱃지
  const getReadStatusBadge = (readStatus: 'read' | 'unread') => {
    const styles = {
      unread: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
      read: { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' },
    }

    const labels = {
      unread: '미열람',
      read: '열람',
    }

    return (
      <Badge className="!border-0" style={{ ...styles[readStatus], fontSize: 'var(--font-size-small)', lineHeight: 'var(--line-height-small)', fontWeight: 600 }}>
        {labels[readStatus]}
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
    if (!steps || steps.length === 0) {
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
        department: departmentName,
        role: roleName,
        stepType: step.approval_type,
        stepOrder: step.step_order,
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 style={{
          color: 'var(--card-foreground)',
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 'var(--line-height-h1)'
        }}>
          결재함
        </h2>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: 'var(--font-size-body)',
          lineHeight: 'var(--line-height-body)'
        }} className="mt-1">
          모든 결재 문서를 조회하고 승인/반려 처리합니다
        </p>
      </div>

      {/* 문서 목록 */}
      <Card style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <CardHeader style={{ paddingBottom: '12px' }}>
          {/* 탭 버튼 */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: '전체' },
              { value: 'in-progress', label: '결재대기' },
              { value: 'completed', label: '결재완료' },
              { value: 'reference', label: '참조' },
            ].map((tab) => (
              <button
                key={tab.value}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: activeTab === tab.value ? 'var(--primary)' : 'var(--muted)',
                  color: activeTab === tab.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all 150ms ease-in-out',
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="이름, 팀명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* 필터들 */}
            <div className="flex gap-4 lg:flex-shrink-0">
              {activeTab === 'reference' ? (
                <Select value={filterReadStatus} onValueChange={(value: typeof filterReadStatus) => setFilterReadStatus(value)}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 열람 상태</SelectItem>
                    <SelectItem value="unread">미열람</SelectItem>
                    <SelectItem value="read">열람</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
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
                    <SelectItem value="retrieved">회수</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow style={{ borderBottom: '2px solid var(--border)' }}>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>문서 유형</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>신청자</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>소속</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)' }}>신청일시</TableHead>
                  <TableHead className="text-left p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)', width: '140px', minWidth: '140px' }}>
                    {activeTab === 'reference' ? '열람 상태' : '상태'}
                  </TableHead>
                  <TableHead className="text-center p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)', width: '60px', minWidth: '60px' }}>상세</TableHead>
                  {activeTab !== 'reference' && (
                    <TableHead className="text-center p-3" style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--muted-foreground)', width: '180px', minWidth: '180px' }}>작업</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'reference' ? 6 : 7} className="text-center" style={{ paddingTop: '48px', paddingBottom: '48px', color: 'var(--muted-foreground)', fontSize: 'var(--font-size-caption)' }}>
                      {activeTab === 'reference' ? '참조 문서가 없습니다' : '결재 문서가 없습니다'}
                    </TableCell>
                  </TableRow>
                ) : activeTab === 'reference' ? (
                  // 참조 문서 테이블
                  (paginatedDocuments as any[]).map((doc) => (
                    <TableRow
                      key={doc.id}
                      style={{ transition: 'background-color 150ms ease-in-out', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--muted)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <TableCell className="p-3">{getLeaveTypeBadge(doc.leave_type)}</TableCell>
                      <TableCell className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 'var(--font-size-copyright)', fontWeight: 'var(--font-weight-medium)' }}>
                              {doc.memberName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p style={{ fontSize: 'var(--font-size-caption)', fontWeight: 'var(--font-weight-medium)', color: 'var(--card-foreground)' }}>
                              {doc.memberName}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--muted-foreground)' }}>
                              {doc.role}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--card-foreground)' }}>
                        {doc.department}
                      </TableCell>
                      <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--card-foreground)' }}>
                        {new Date(doc.requested_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="p-3" style={{ width: '140px', minWidth: '140px' }}>
                        {getReadStatusBadge(doc.readStatus)}
                      </TableCell>
                      <TableCell className="text-center p-3" style={{ width: '60px', minWidth: '60px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(doc as any)}
                          style={{ color: 'var(--card-foreground)', padding: '4px 8px', transition: 'all 150ms ease-in-out' }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // 일반 결재 문서 테이블
                  paginatedDocuments.map((doc) => {
                    const employee = getEmployee(doc.employee)

                    return (
                      <TableRow
                        key={doc.id}
                        style={{ transition: 'background-color 150ms ease-in-out' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <TableCell className="p-3">{getLeaveTypeBadge(doc.leave_type)}</TableCell>
                        <TableCell className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 'var(--font-size-copyright)', fontWeight: 'var(--font-weight-medium)' }}>
                                {employee?.name.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p style={{ fontSize: 'var(--font-size-caption)', fontWeight: 'var(--font-weight-medium)', color: 'var(--card-foreground)' }}>
                                {employee?.name || '알 수 없음'}
                              </p>
                              <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--muted-foreground)' }}>
                                {getRoleName(employee?.role)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--card-foreground)' }}>
                          {getDepartmentName(employee?.department)}
                        </TableCell>
                        <TableCell className="p-3" style={{ fontSize: 'var(--font-size-caption)', color: 'var(--card-foreground)' }}>
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
                            // 완료된 문서(승인/반려/취소/회수)는 단순 상태 뱃지만 표시
                            if (doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'cancelled' || doc.status === 'retrieved') {
                              return getStatusBadge(doc)
                            }
                            // 진행 중인 문서만 결재 진행 상태 표시
                            const approvalProgress = getApprovalProgress(doc.id, doc.current_step)
                            if (approvalProgress && approvalProgress.length >= 1) {
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
                            style={{ color: 'var(--card-foreground)', padding: '4px 8px', transition: 'all 150ms ease-in-out' }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center p-3" style={{ width: '180px', minWidth: '180px' }}>
                          <div className="flex items-center justify-center gap-2">
                            {doc.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(doc)}
                                  style={{
                                    backgroundColor: 'var(--success)',
                                    color: 'white',
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleReject(doc)}
                                  style={{
                                    backgroundColor: 'var(--destructive)',
                                    color: 'white',
                                  }}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  반려
                                </Button>
                              </>
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
