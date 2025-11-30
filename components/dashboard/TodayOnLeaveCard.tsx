'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  return (
    <Card
      className="rounded-2xl flex flex-col"
      style={{
        borderRadius: '16px',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
      }}
    >
      <CardHeader style={{ paddingBottom: '12px' }}>
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
          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
            {members.map((member) => (
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
  )
}
