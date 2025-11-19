import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut, Coffee, Home } from 'lucide-react'

type WorkStatus = 'checked_in' | 'checked_out' | 'away' | 'remote'

interface WorkStatusCardProps {
  employeeId: string
}

export async function WorkStatusCard({ employeeId }: WorkStatusCardProps) {
  // TODO: 실제로는 attendance 테이블에서 employeeId로 데이터 조회
  void employeeId // Placeholder until DB integration
  // Mock 데이터 - 추후 DB에서 조회하여 동적으로 변경 가능
  const workStatus = 'checked_in' as WorkStatus
  const checkInTime = '09:00'
  const workHours = 4
  const awayTime = ''
  const awayDuration = 0

  const getWorkStatusInfo = (status: WorkStatus) => {
    switch (status) {
      case 'checked_in':
        return {
          label: '출근',
          color: '#4CD471',
          bgColor: '#E8F8F5',
          icon: LogIn
        }
      case 'checked_out':
        return {
          label: '퇴근',
          color: '#A0ACB3',
          bgColor: '#F6F8F9',
          icon: LogOut
        }
      case 'away':
        return {
          label: '자리비움',
          color: '#F8C653',
          bgColor: '#FFF8E5',
          icon: Coffee
        }
      case 'remote':
        return {
          label: '재택',
          color: '#635BFF',
          bgColor: 'rgba(99, 91, 255, 0.1)',
          icon: Home
        }
    }
  }

  const statusInfo = getWorkStatusInfo(workStatus)
  const StatusIcon = statusInfo.icon

  return (
    <Card
      className="rounded-2xl"
      style={{
        height: '182px'
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
            근무 상태
          </CardTitle>
          <Badge
            className="px-2 py-0.5"
            style={{
              backgroundColor: statusInfo.bgColor,
              color: statusInfo.color,
              fontSize: '12px',
              border: 'none'
            }}
          >
            <StatusIcon className="w-3 h-3 mr-1 inline" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
              출근 시간
            </p>
            <p className="mt-1" style={{ fontSize: '18px', lineHeight: '23.4px', color: '#29363D' }}>
              {checkInTime || '--:--'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
              누적 근무
            </p>
            <p className="mt-1" style={{ fontSize: '18px', lineHeight: '23.4px', color: '#29363D' }}>
              {workHours}시간
            </p>
          </div>
        </div>

        {/* 자리비움 정보 */}
        {workStatus === 'away' && awayDuration > 0 && (
          <div
            className="p-3 mt-3"
            style={{
              backgroundColor: '#FFF8E5',
              borderRadius: '8px',
              border: '1px solid #F8C653'
            }}
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4" style={{ color: '#F8C653' }} />
              <div>
                <p style={{ fontSize: '12px', lineHeight: '16px', color: '#92400E' }}>
                  자리비움 {awayTime && `시작: ${awayTime}`}
                </p>
                <p style={{ fontSize: '12px', lineHeight: '16px', color: '#92400E' }}>
                  총 {awayDuration}분
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
