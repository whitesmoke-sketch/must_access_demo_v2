'use client'

import { Member } from '@/lib/leave-management/types'
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
import { Search, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

interface LeaveManagementTableProps {
  filteredMembers: Member[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterTeam: string
  setFilterTeam: (team: string) => void
  teams: string[]
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  getMemberLeaveStatus: (memberId: string) => { hasRequest: boolean; status: string; count: number }
  handleViewDetail: (member: Member) => void
}

export function LeaveManagementTable({
  filteredMembers,
  searchQuery,
  setSearchQuery,
  filterTeam,
  setFilterTeam,
  teams,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  getMemberLeaveStatus,
  handleViewDetail,
}: LeaveManagementTableProps) {
  return (
    <Card
      className="rounded-2xl"
      style={{ borderRadius: 'var(--radius)', boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)' }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle style={{ color: 'var(--card-foreground)', fontSize: '16px', fontWeight: 500, lineHeight: 1.5 }}>
            구성원 연차 현황
          </CardTitle>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--muted-foreground)' }}
            />
            <Input
              placeholder="이름 or 팀명 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 팀</SelectItem>
              {teams.map(team => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>구성원</TableHead>
                <TableHead style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>소속 팀</TableHead>
                <TableHead className="text-center" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  총 연차
                </TableHead>
                <TableHead className="text-center" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  사용
                </TableHead>
                <TableHead className="text-center" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  잔여
                </TableHead>
                <TableHead className="text-center" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  요청
                </TableHead>
                <TableHead className="text-center" style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  액션
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center"
                    style={{
                      paddingTop: '48px',
                      paddingBottom: '48px',
                      color: 'var(--muted-foreground)',
                      fontSize: '14px',
                      lineHeight: 1.5,
                    }}
                  >
                    검색 결과가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map(member => {
                    const leaveStatus = getMemberLeaveStatus(member.id)
                    const remaining = member.annualLeave - member.usedAnnualLeave

                    return (
                      <TableRow
                        key={member.id}
                        className="transition-colors"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: 'var(--card-foreground)',
                                  lineHeight: 1.5,
                                }}
                              >
                                {member.name}
                              </p>
                              <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                {member.position}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell style={{ fontSize: '14px', color: 'var(--card-foreground)', lineHeight: 1.5 }}>
                          {member.team}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ fontSize: '14px', fontWeight: 500, color: '#29363D', lineHeight: 1.5 }}
                        >
                          {member.annualLeave}일
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ fontSize: '14px', color: '#5B6A72', fontWeight: 500, lineHeight: 1.5 }}
                        >
                          {member.usedAnnualLeave}일
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600, lineHeight: 1.5 }}
                        >
                          {remaining}일
                        </TableCell>
                        <TableCell className="text-center">
                          {leaveStatus.hasRequest && leaveStatus.status === 'pending' ? (
                            <Badge
                              style={{
                                backgroundColor: '#FFF8E5',
                                color: '#F8C653',
                                fontSize: '12px',
                                lineHeight: 1.4,
                                fontWeight: 500,
                              }}
                            >
                              {leaveStatus.count}건
                            </Badge>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(member)}>
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

        {/* Pagination */}
        {filteredMembers.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
              총 {filteredMembers.length}명 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredMembers.length)}명 표시
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
              <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--card-foreground)', lineHeight: 1.5 }}>
                {currentPage} / {Math.ceil(filteredMembers.length / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(filteredMembers.length / itemsPerPage)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
