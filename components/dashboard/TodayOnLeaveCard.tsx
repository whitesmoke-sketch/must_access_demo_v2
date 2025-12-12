'use client'

import { useState } from 'react'
import { ChevronRight, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'

interface OnLeaveMember {
  id: string
  name: string
  department: string
  team: string
  leaveType: string
}

interface TodayOnLeaveCardProps {
  members: OnLeaveMember[]
}

export function TodayOnLeaveCard({ members }: TodayOnLeaveCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 최대 4명까지만 카드에 표시
  const displayedMembers = members.slice(0, 4)

  const getLeaveTypeLabel = (leaveType: string) => {
    const labels: Record<string, string> = {
      annual: '연차',
      half_day: '반차',
      half_day_am: '오전 반차',
      half_day_pm: '오후 반차',
      quarter_day: '반반차',
      award: '포상휴가',
      reward: '포상휴가',
    }
    return labels[leaveType] || '휴가'
  }

  return (
    <>
      <Card
        className="rounded-2xl flex flex-col"
        style={{
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <CardHeader style={{ paddingBottom: '12px' }}>
          <div className="flex items-center justify-between">
            <CardTitle
              style={{
                fontSize: 'var(--font-size-body)',
                fontWeight: 500,
                lineHeight: '24px',
                color: 'var(--foreground)',
              }}
            >
              오늘 연차 멤버 ({members.length}명)
            </CardTitle>
            {members.length > 0 && (
              <button
                className="flex items-center gap-1 transition-opacity"
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}
                onClick={() => setIsModalOpen(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                전체보기
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {members.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: '90px' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: '24px',
                  color: 'var(--muted-foreground)',
                }}
              >
                오늘 연차인 멤버가 없습니다
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {displayedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-3 py-1.5"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderRadius: '8px',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="relative rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'var(--muted)',
                      border: '2px solid var(--card)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {member.name.charAt(0)}
                    </span>
                  </div>

                  {/* Name and Department */}
                  <div className="flex flex-col min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 500,
                        lineHeight: '24px',
                        color: 'var(--foreground)',
                      }}
                    >
                      {member.name}
                    </p>
                    <p
                      className="truncate"
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        lineHeight: '19.6px',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {member.department || member.team}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 전체보기 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: '26px',
                color: 'var(--foreground)',
              }}
            >
              오늘 연차인 멤버 ({members.length}명)
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: 'var(--font-size-caption)',
                lineHeight: '20px',
                color: 'var(--muted-foreground)',
              }}
            >
              오늘 연차인 멤버 목록입니다.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="relative rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: 'var(--primary)',
                    }}
                  >
                    <User className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} />
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <p
                      style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 500,
                        lineHeight: '24px',
                        color: 'var(--foreground)',
                      }}
                    >
                      {member.name}
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        lineHeight: '19.6px',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {member.department}{member.team ? ` • ${member.team}` : ''}
                    </p>
                  </div>

                  {/* Leave Type Badge */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      backgroundColor: 'rgba(99, 91, 255, 0.1)',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    {getLeaveTypeLabel(member.leaveType)}
                  </span>
                </div>
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
