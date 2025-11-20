'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

type LeaveStatus = 'pending' | 'approved' | 'rejected'
type LeaveType = 'annual' | 'half_day' | 'reward'

interface LeaveRequest {
  id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  employee?: {
    name: string
  }[] | { name: string } | null
}

interface ApprovalStatusClientProps {
  myRequests: LeaveRequest[]
  pendingRequests: LeaveRequest[]
  isAdmin: boolean
}

export function ApprovalStatusClient({
  myRequests,
  pendingRequests,
  isAdmin
}: ApprovalStatusClientProps) {
  const [approvalTab, setApprovalTab] = useState<'pending' | 'requested'>('pending')

  const getEmployeeName = (employee: LeaveRequest['employee']) => {
    if (!employee) return '알 수 없음'
    return Array.isArray(employee) ? employee[0]?.name ?? '알 수 없음' : employee.name
  }

  return (
    <Card
      className="rounded-2xl md:col-span-2 lg:col-span-2 flex flex-col"
      style={{
        height: '353.375px'
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
        <div className="flex items-center justify-between">
          <CardTitle style={{
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '24px',
            color: '#29363D'
          }}>
            결재 현황
          </CardTitle>
          <Link
            href="/documents"
            className="flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#635BFF',
            }}
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>

      {/* Tab Buttons */}
      <div className="px-6 pb-3 flex gap-2">
        <button
          className="px-4 py-2 rounded-lg transition-all"
          style={{
            backgroundColor: approvalTab === 'pending' ? '#635BFF' : '#F6F8F9',
            color: approvalTab === 'pending' ? '#FFFFFF' : '#5B6A72',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onClick={() => setApprovalTab('pending')}
        >
          결재 대기 문서
        </button>
        <button
          className="px-4 py-2 rounded-lg transition-all"
          style={{
            backgroundColor: approvalTab === 'requested' ? '#635BFF' : '#F6F8F9',
            color: approvalTab === 'requested' ? '#FFFFFF' : '#5B6A72',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onClick={() => setApprovalTab('requested')}
        >
          내가 상신한 문서
        </button>
      </div>

      <CardContent className="flex-1 overflow-y-auto" style={{ paddingTop: '0' }}>
        {/* 결재 대기 문서 탭 */}
        {approvalTab === 'pending' && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ fontSize: '16px', lineHeight: '24px', color: '#5B6A72' }}>
                  결재할 문서가 없습니다
                </p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 flex items-center justify-between transition-all cursor-pointer hover:bg-[#F6F8F9]"
                >
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                      {getEmployeeName(request.employee)} - {getLeaveTypeLabel(request.leave_type)}
                    </p>
                    <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72', marginTop: '4px' }}>
                      {request.start_date} ~ {request.end_date}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))
            )}
          </div>
        )}

        {/* 내가 상신한 문서 탭 */}
        {approvalTab === 'requested' && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ fontSize: '16px', lineHeight: '24px', color: '#5B6A72' }}>
                  상신한 문서가 없습니다
                </p>
              </div>
            ) : (
              myRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 flex items-center justify-between transition-all cursor-pointer hover:bg-[#F6F8F9]"
                >
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                      {getLeaveTypeLabel(request.leave_type)}
                    </p>
                    <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72', marginTop: '4px' }}>
                      {request.start_date} ~ {request.end_date}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const configs: Record<LeaveStatus, { label: string; backgroundColor: string; color: string }> = {
    pending: {
      label: '대기',
      backgroundColor: '#FEF3C7',
      color: '#92400E'
    },
    approved: {
      label: '승인',
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    rejected: {
      label: '반려',
      backgroundColor: '#FEE2E2',
      color: '#991B1B'
    }
  }

  const config = configs[status]

  return (
    <Badge
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontSize: '14px',
        fontWeight: 600,
        border: 'none'
      }}
    >
      {config.label}
    </Badge>
  )
}

function getLeaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    annual: '연차 신청서',
    half_day: '반차 신청서',
    reward: '포상휴가 신청서'
  }
  return labels[type]
}
