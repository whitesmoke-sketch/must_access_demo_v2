'use client'

import React, { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  Filter,
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ApprovalDocumentDetailModal } from './ApprovalDocumentDetailModal'

type LeaveType = 'annual' | 'half_day' | 'quarter_day' | 'award'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

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
  employee: {
    id: string
    name: string
    department: { name: string } | { name: string }[] | null
    role: { name: string } | { name: string }[] | null
  } | null
}

interface ApprovalDocumentsClientProps {
  documents: ApprovalDocument[]
  userId: string
  approvalLevel: number
  myApprovalRequestIds: number[]
}

export function ApprovalDocumentsClient({
  documents,
  userId,
  approvalLevel,
  myApprovalRequestIds,
}: ApprovalDocumentsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | LeaveStatus>('all')
  const [filterType, setFilterType] = useState<'all' | 'leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [selectedDocument, setSelectedDocument] = useState<ApprovalDocument | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // 통계 계산
  const stats = useMemo(() => {
    const total = documents.length
    const pending = documents.filter((d) => d.status === 'pending').length
    const approved = documents.filter((d) => d.status === 'approved').length
    const rejected = documents.filter((d) => d.status === 'rejected').length

    return { total, pending, approved, rejected }
  }, [documents])

  // 필터링 및 검색
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const employeeName = doc.employee?.name || ''
      const departmentName = doc.employee?.department
        ? Array.isArray(doc.employee.department)
          ? doc.employee.department[0]?.name || ''
          : doc.employee.department.name
        : ''

      const matchesSearch =
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        departmentName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
      const matchesType = filterType === 'all' // 현재는 연차만 있음

      return matchesSearch && matchesStatus && matchesType
    })
  }, [documents, searchQuery, filterStatus, filterType])

  // 페이지네이션
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 상세 보기
  const handleViewDetail = (document: ApprovalDocument) => {
    setSelectedDocument(document)
    setIsDetailDialogOpen(true)
  }

  // 상태 뱃지
  const getStatusBadge = (status: LeaveStatus) => {
    const styles = {
      pending: { backgroundColor: '#FFF8E5', color: '#FFAE1F' },
      approved: { backgroundColor: '#D1FAE5', color: '#10B981' },
      rejected: { backgroundColor: '#FEE2E2', color: '#EF4444' },
      cancelled: { backgroundColor: '#F6F8F9', color: '#5B6A72' },
    }

    const labels = {
      pending: '승인 대기',
      approved: '승인',
      rejected: '반려',
      cancelled: '취소',
    }

    return (
      <Badge style={{ ...styles[status], fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
        {labels[status]}
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

  // 부서명 추출
  const getDepartmentName = (department: { name: string } | { name: string }[] | null): string => {
    if (!department) return '-'
    return Array.isArray(department) ? department[0]?.name || '-' : department.name
  }

  // 직급명 추출
  const getRoleName = (role: { name: string } | { name: string }[] | null): string => {
    if (!role) return '-'
    return Array.isArray(role) ? role[0]?.name || '-' : role.name
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 style={{ color: '#29363D', fontSize: '22px', fontWeight: 500, lineHeight: 1.25 }}>
          결재 문서 관리
        </h2>
        <p style={{ color: '#5B6A72', fontSize: '16px', lineHeight: 1.5 }} className="mt-1">
          모든 결재 문서를 조회하고 승인/반려 처리합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                  전체 문서
                </p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#29363D', lineHeight: 1.2, marginTop: '8px' }}>
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(99,91,255,0.1)' }}>
                <FileText className="w-6 h-6" style={{ color: '#635BFF' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                  승인 대기
                </p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#FFAE1F', lineHeight: 1.2, marginTop: '8px' }}>
                  {stats.pending}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF8E5' }}>
                <Clock className="w-6 h-6" style={{ color: '#FFAE1F' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                  승인 완료
                </p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#10B981', lineHeight: 1.2, marginTop: '8px' }}>
                  {stats.approved}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <Check className="w-6 h-6" style={{ color: '#10B981' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                  반려
                </p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#EF4444', lineHeight: 1.2, marginTop: '8px' }}>
                  {stats.rejected}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <X className="w-6 h-6" style={{ color: '#EF4444' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#5B6A72' }} />
              <Input
                placeholder="이름, 부서명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
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
          </div>
        </CardContent>
      </Card>

      {/* 문서 목록 */}
      <Card style={{ borderRadius: '16px', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}>
        <CardHeader>
          <CardTitle style={{ color: '#29363D', fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
            결재 문서 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border" style={{ borderColor: '#E5E8EB' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>문서 유형</TableHead>
                  <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>신청자</TableHead>
                  <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>소속</TableHead>
                  <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>신청일시</TableHead>
                  <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>상태</TableHead>
                  <TableHead className="text-right" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center" style={{ paddingTop: '48px', paddingBottom: '48px', color: '#5B6A72', fontSize: '14px', lineHeight: 1.5 }}>
                      결재 문서가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <TableCell>{getLeaveTypeBadge(doc.leave_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback style={{ backgroundColor: '#635BFF', color: 'white', fontSize: '12px', fontWeight: 500 }}>
                              {doc.employee?.name.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#29363D', lineHeight: 1.5 }}>
                              {doc.employee?.name || '알 수 없음'}
                            </p>
                            <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                              {getRoleName(doc.employee?.role)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5 }}>
                        {getDepartmentName(doc.employee?.department)}
                      </TableCell>
                      <TableCell style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5 }}>
                        {new Date(doc.requested_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(doc)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredDocuments.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4">
              <p style={{ fontSize: '12px', color: '#5B6A72', lineHeight: 1.4 }}>
                총 {filteredDocuments.length}건 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredDocuments.length)}건 표시
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span style={{ fontSize: '14px', color: '#29363D', lineHeight: 1.5 }}>
                  {currentPage} / {Math.ceil(filteredDocuments.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(filteredDocuments.length / itemsPerPage)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
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
      />
    </div>
  )
}
