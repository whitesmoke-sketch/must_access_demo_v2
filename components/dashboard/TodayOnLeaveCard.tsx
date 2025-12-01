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

  // 최대 2명까지만 카드에 표시
  const displayedMembers = members.slice(0, 2)

  const getLeaveTypeLabel = (leaveType: string) => {
    switch (leaveType) {
      case 'annual':
        return '연차'
      case 'half_day_am':
        return '오전 반차'
      case 'half_day_pm':
        return '오후 반차'
      case 'reward':
        return '포상휴가'
      default:
        return '휴가'
    }
  }

  return (
    <>
      <Card
        className="rounded-2xl flex flex-col"
        style={{
          borderRadius: '16px',
          boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
        }}
      >
        <CardHeader style={{ paddingBottom: '12px' }}>
          <div className="flex items-center justify-between">
            <CardTitle
              style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#29363D',
              }}
            >
              오늘 연차 멤버 ({members.length}명)
            </CardTitle>
            {members.length > 0 && (
              <button
                className="flex items-center gap-1 transition-all"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#635BFF',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
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
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#5B6A72',
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
                    backgroundColor: '#F6F8F9',
                    borderRadius: '8px',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="relative rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#E5E8EB',
                      border: '2px solid #FFFFFF',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#5B6A72',
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
                        fontSize: '16px',
                        fontWeight: 500,
                        lineHeight: '24px',
                        color: '#29363D',
                      }}
                    >
                      {member.name}
                    </p>
                    <p
                      className="truncate"
                      style={{
                        fontSize: '14px',
                        lineHeight: '19.6px',
                        color: '#5B6A72',
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
                color: '#29363D',
              }}
            >
              오늘 연차인 멤버 ({members.length}명)
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#5B6A72',
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
                    backgroundColor: '#F6F8F9',
                    borderRadius: '8px',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="relative rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#635BFF',
                    }}
                  >
                    <User className="w-5 h-5" style={{ color: 'white' }} />
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        style={{
                          fontSize: '16px',
                          fontWeight: 500,
                          lineHeight: '24px',
                          color: '#29363D',
                        }}
                      >
                        {member.name}
                      </p>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#635BFF',
                          backgroundColor: 'rgba(99, 91, 255, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {getLeaveTypeLabel(member.leaveType)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: '19.6px',
                        color: '#5B6A72',
                      }}
                    >
                      {member.department}{member.team ? ` • ${member.team}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
