'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Armchair,
  Calendar,
  UserX,
  QrCode,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WorkStatusModal } from './WorkStatusModal'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { LiveDateTime } from '@/components/common/LiveDateTime'

interface WorkStatusMember {
  id: string
  name: string
  department: string
  status: string
}

interface WorkStatusData {
  '휴가': WorkStatusMember[]
  '사외 근무': WorkStatusMember[]
  '휴직': WorkStatusMember[]
  '근무 변경': WorkStatusMember[]
  '출산/육아': WorkStatusMember[]
  '기타': WorkStatusMember[]
}

interface ApprovalRequest {
  id: string
  userName: string
  type: string
  requestDate: string
  startDate: string
  endDate: string
  days: number
}

interface FloorData {
  floor: string
  usedSeats: number
  totalSeats: number
  meetingRoomUsage: number
  status: 'busy' | 'moderate' | 'available'
}

interface StudioAccessStatus {
  status: 'available' | 'restricted'
  reason?: string
}

interface AdminDashboardClientProps {
  workStatusData: WorkStatusData
  studioAccessStatus: StudioAccessStatus
  approvalQueue: ApprovalRequest[]
  floorData: FloorData[]
  totalSeats: number
  totalUsedSeats: number
  overallOccupancyRate: number
  overallMeetingRoomUsage: number
}

// 차트 색상 정의
const CHART_COLORS = {
  '휴가': '#635BFF',      // Primary purple
  '사외 근무': '#16CDC7', // Teal
  '휴직': '#F8C653',      // Yellow/Orange
  '근무 변경': '#FF6B6B', // Red
  '출산/육아': '#4CD471', // Green
  '기타': '#5B6A72',      // Gray
}

export function AdminDashboardClient({
  workStatusData,
  studioAccessStatus,
  approvalQueue,
  floorData,
  totalSeats,
  totalUsedSeats,
  overallOccupancyRate,
  overallMeetingRoomUsage,
}: AdminDashboardClientProps) {
  // 모달 상태 관리
  const [showCategoryDetailModal, setShowCategoryDetailModal] = useState(false)

  // 근무 현황 카테고리 선택 상태 - 기본적으로 '휴가' 카테고리 열림
  const [selectedWorkCategory, setSelectedWorkCategory] = useState<keyof WorkStatusData | null>('휴가')

  // 도넛 차트 데이터
  const workStatusChartData = Object.entries(workStatusData).map(([name, members]) => ({
    name,
    value: members.length,
    color: CHART_COLORS[name as keyof typeof CHART_COLORS],
  }))

  const totalWorkStatusCount = workStatusChartData.reduce((sum, item) => sum + item.value, 0)

  // 이상 상황 알림 (Client Component 내부에서 정의)
  const alerts = [
    {
      id: 1,
      severity: 'critical',
      message: 'Hubstaff vs Biostar2 근태 편차 발생 (3건)',
      time: '5분 전',
      category: '근태',
      icon: AlertTriangle,
    },
    {
      id: 2,
      severity: 'warning',
      message: '장시간 자리비움 감지 (김철수, 이영희)',
      time: '15분 전',
      category: '근태',
      icon: Clock,
    },
    {
      id: 3,
      severity: 'critical',
      message: '무단 미출근 2건',
      time: '30분 전',
      category: '근태',
      icon: UserX,
    },
    {
      id: 4,
      severity: 'warning',
      message: '방문자 QR 발급 실패 (1건)',
      time: '1시간 전',
      category: '시스템',
      icon: QrCode,
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FFF0ED', color: '#FF6B6B', icon: '#FF6B6B' }
      case 'warning':
        return { bg: '#FFF8E5', color: '#F8C653', icon: '#F8C653' }
      case 'info':
        return { bg: 'rgba(22, 205, 199, 0.1)', color: '#16CDC7', icon: '#16CDC7' }
      default:
        return { bg: '#F6F8F9', color: '#5B6A72', icon: '#5B6A72' }
    }
  }

  const getFloorStatusColor = (status: 'busy' | 'moderate' | 'available') => {
    switch (status) {
      case 'busy':
        return '#FF6B6B'
      case 'moderate':
        return '#F8C653'
      case 'available':
        return '#4CD471'
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4">
          <h2 style={{
            fontSize: '22px',
            fontWeight: 500,
            lineHeight: '27.5px',
            color: '#29363D'
          }}>
            관리자 대시보드
          </h2>
          <LiveDateTime
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              color: '#5B6A72',
              marginTop: '4px'
            }}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1. 오늘의 근무 현황 - 도넛 차트 + 6개 카테고리 */}
          <Card
            className="rounded-2xl md:col-span-2 lg:col-span-2"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
            }}
          >
            <CardHeader style={{ paddingBottom: '12px' }}>
              <CardTitle style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#29363D'
              }}>
                오늘의 근무 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* 좌측: 도넛 차트 */}
                <div className="flex-shrink-0 relative self-center" style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workStatusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        cornerRadius={5}
                        strokeWidth={3}
                        stroke="#FFFFFF"
                      >
                        {workStatusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        wrapperStyle={{ zIndex: 1000 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0]
                            return (
                              <div
                                style={{
                                  backgroundColor: '#29363D',
                                  color: '#FFFFFF',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
                                }}
                              >
                                {data.name} {data.value}명
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#29363D', lineHeight: 1 }}>
                      {totalWorkStatusCount}
                    </p>
                    <p style={{ fontSize: '13px', color: '#5B6A72', marginTop: '4px' }}>
                      총 인원
                    </p>
                  </div>
                </div>

                {/* 중앙: 범례 (6개 카테고리 버튼) */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {workStatusChartData.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => setSelectedWorkCategory(
                        selectedWorkCategory === category.name ? null : category.name as keyof WorkStatusData
                      )}
                      className="p-3 text-left transition-all"
                      style={{
                        backgroundColor: selectedWorkCategory === category.name ? '#F6F8F9' : 'transparent',
                        borderRadius: '8px',
                        border: selectedWorkCategory === category.name ? `2px solid ${category.color}` : '1px solid #E5E8EB',
                        cursor: 'pointer',
                        height: '76px',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: category.color,
                            flexShrink: 0
                          }}
                        />
                        <p style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#29363D'
                        }}>
                          {category.name}
                        </p>
                      </div>
                      <p style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: category.color,
                        marginLeft: '20px'
                      }}>
                        {category.value}명
                      </p>
                    </button>
                  ))}
                </div>

                {/* 우측: 선택된 카테고리 인원 리스트 */}
                {selectedWorkCategory && (
                  <div
                    className="flex-1 md:border-l md:pl-6 flex flex-col"
                    style={{ borderColor: '#E5E8EB', minWidth: '250px', maxHeight: '400px' }}
                  >
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#29363D'
                      }}>
                        {selectedWorkCategory} ({workStatusData[selectedWorkCategory].length}명)
                      </h3>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {workStatusData[selectedWorkCategory].slice(0, 5).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 transition-all"
                          style={{
                            backgroundColor: '#F6F8F9',
                            borderRadius: '8px',
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: CHART_COLORS[selectedWorkCategory],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              {member.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#29363D',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {member.name}
                              </p>
                              <p style={{
                                fontSize: '12px',
                                color: '#5B6A72',
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {member.department}
                              </p>
                            </div>
                          </div>
                          <Badge
                            style={{
                              backgroundColor: 'rgba(99, 91, 255, 0.1)',
                              color: '#635BFF',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: 'none',
                              padding: '2px 8px',
                              flexShrink: 0,
                              marginLeft: '8px'
                            }}
                          >
                            {member.status}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* 전체보기 버튼 */}
                    {workStatusData[selectedWorkCategory].length > 5 && (
                      <button
                        className="w-full mt-3 text-center transition-all flex-shrink-0"
                        style={{
                          backgroundColor: '#F6F8F9',
                          borderRadius: '8px',
                          border: '1px solid #E5E8EB',
                          cursor: 'pointer',
                          height: '42px',
                        }}
                        onClick={() => setShowCategoryDetailModal(true)}
                      >
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#5B6A72'
                        }}>
                          전체보기
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. 자원 사용 현황 */}
          <Card
            className="rounded-2xl"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
            }}
          >
            <CardHeader style={{ paddingBottom: '12px' }}>
              <CardTitle style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#29363D'
              }}>
                자원 사용 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* 메인 KPI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 text-center" style={{
                    backgroundColor: '#F6F8F9',
                    borderRadius: '12px'
                  }}>
                    <Armchair className="w-6 h-6 mx-auto mb-2" style={{ color: '#635BFF' }} />
                    <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                      좌석 점유율
                    </p>
                    <p className="mt-2" style={{ fontSize: '20px', fontWeight: 700, lineHeight: '26px', color: '#635BFF' }}>
                      {overallOccupancyRate}%
                    </p>
                    <p className="mt-1" style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                      {totalUsedSeats} / {totalSeats}석
                    </p>
                  </div>

                  <div className="p-4 text-center" style={{
                    backgroundColor: '#F6F8F9',
                    borderRadius: '12px'
                  }}>
                    <svg className="w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="#16CDC7" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                      회의실 사용률
                    </p>
                    <p className="mt-2" style={{ fontSize: '20px', fontWeight: 700, lineHeight: '26px', color: '#16CDC7' }}>
                      {overallMeetingRoomUsage}%
                    </p>
                    <p className="mt-1" style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                      평균 사용률
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E5E8EB' }} />

                {/* 층별 혼잡도 */}
                <div>
                  <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72', marginBottom: '8px' }}>
                    층별 혼잡도
                  </p>
                  <div className="space-y-1.5">
                    {floorData.map((floor) => {
                      const occupancyRate = Math.round((floor.usedSeats / floor.totalSeats) * 100)
                      const statusColor = getFloorStatusColor(floor.status)

                      return (
                        <Tooltip key={floor.floor}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer">
                              <p style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                lineHeight: '16px',
                                color: '#5B6A72',
                                width: '24px',
                                flexShrink: 0
                              }}>
                                {floor.floor}
                              </p>
                              <div
                                className="flex-1 transition-all"
                                style={{
                                  height: '20px',
                                  borderRadius: '4px',
                                  backgroundColor: statusColor,
                                  opacity: 0.7,
                                }}
                              />
                              <p style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                lineHeight: '16px',
                                color: '#29363D',
                                width: '36px',
                                textAlign: 'right',
                                flexShrink: 0
                              }}>
                                {occupancyRate}%
                              </p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="p-3"
                            style={{
                              backgroundColor: '#29363D',
                              color: '#FFFFFF',
                              borderRadius: '12px',
                              border: 'none',
                            }}
                          >
                            <div className="space-y-2">
                              <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '18px' }}>
                                {floor.floor} 상세 정보
                              </p>
                              <div className="space-y-1">
                                <p style={{ fontSize: '12px', lineHeight: '16px' }}>
                                  좌석 총 수: {floor.totalSeats}석
                                </p>
                                <p style={{ fontSize: '12px', lineHeight: '16px' }}>
                                  사용 중 좌석: {floor.usedSeats}석
                                </p>
                                <p style={{ fontSize: '12px', lineHeight: '16px' }}>
                                  좌석 점유율: {occupancyRate}%
                                </p>
                                <p style={{ fontSize: '12px', lineHeight: '16px' }}>
                                  회의실 사용률: {floor.meetingRoomUsage}%
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E5E8EB' }} />

                {/* 지하1층 스튜디오 출입 상태 */}
                <div
                  className="p-3"
                  style={{
                    backgroundColor: '#F6F8F9',
                    borderRadius: '8px',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#29363D'
                    }}>
                      지하1층 스튜디오
                    </p>
                    <Badge
                      style={{
                        backgroundColor: studioAccessStatus.status === 'available' ? 'rgba(76, 212, 113, 0.1)' : '#FFF0ED',
                        color: studioAccessStatus.status === 'available' ? '#4CD471' : '#FF6B6B',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        padding: '4px 12px',
                      }}
                    >
                      {studioAccessStatus.status === 'available' ? '출입 가능' : '출입 제한'}
                    </Badge>
                  </div>
                  {studioAccessStatus.status === 'restricted' && studioAccessStatus.reason && (
                    <p style={{
                      fontSize: '12px',
                      color: '#5B6A72',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #E5E8EB',
                    }}>
                      {studioAccessStatus.reason}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. 승인 대기 목록 */}
          <Card
            className="rounded-2xl md:col-span-2 lg:col-span-2"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
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
                  승인 대기 목록
                </CardTitle>
                <button
                  className="flex items-center gap-1 transition-all"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#635BFF',
                  }}
                >
                  전체보기
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {approvalQueue.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#4CD471' }} />
                  <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                    모든 결재 완료
                  </p>
                  <p className="mt-1" style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                    대기 중인 승인 항목이 없습니다
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y" style={{ borderColor: '#E5E8EB' }}>
                    {approvalQueue.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 transition-all cursor-pointer hover:bg-[#F6F8F9]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                                {request.userName}
                              </p>
                              <Badge style={{
                                backgroundColor: 'rgba(99, 91, 255, 0.1)',
                                color: '#635BFF',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                              }}>
                                {request.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" style={{ color: '#5B6A72' }} />
                                <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                                  {request.startDate} ~ {request.endDate}
                                </p>
                              </div>
                              <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: '19.6px', color: '#16CDC7' }}>
                                {request.days}일
                              </p>
                            </div>
                            <p className="mt-2" style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                              신청일: {new Date(request.requestDate).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              className="px-3 py-1.5 transition-all hover:bg-[#059669]"
                              style={{
                                backgroundColor: '#10B981',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '14px',
                                borderRadius: '8px',
                              }}
                            >
                              승인
                            </button>
                            <button
                              className="px-3 py-1.5 transition-all hover:bg-[#DC2626]"
                              style={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '14px',
                                borderRadius: '8px',
                              }}
                            >
                              반려
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 하단 전체보기 버튼 */}
                  <div className="mt-3 px-4">
                    <button
                      className="w-full transition-all"
                      style={{
                        backgroundColor: '#F6F8F9',
                        color: '#5B6A72',
                        border: '1px solid #E5E8EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        height: '42px',
                      }}
                    >
                      전체보기
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 4. 이상 상황 알림 */}
          <Card
            className="rounded-2xl"
            style={{
              borderRadius: '16px',
              boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
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
                  이상 상황 알림
                </CardTitle>
                <button
                  className="flex items-center gap-1 transition-all"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#635BFF',
                  }}
                >
                  전체보기
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const severityStyle = getSeverityColor(alert.severity)
                  const Icon = alert.icon

                  return (
                    <div
                      key={alert.id}
                      className="p-3 transition-all cursor-pointer"
                      style={{
                        backgroundColor: severityStyle.bg,
                        borderRadius: '12px',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          style={{ color: severityStyle.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            lineHeight: '19.6px',
                            color: '#29363D'
                          }}>
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              color: '#5B6A72',
                              fontSize: '11px',
                              fontWeight: 500,
                              border: 'none',
                              padding: '2px 6px'
                            }}>
                              {alert.category}
                            </Badge>
                            <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                              {alert.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 선택된 카테고리 전체보기 모달 */}
      {selectedWorkCategory && (
        <WorkStatusModal
          isOpen={showCategoryDetailModal}
          onClose={() => setShowCategoryDetailModal(false)}
          title={`${selectedWorkCategory} 인원`}
          members={workStatusData[selectedWorkCategory].map(m => ({
            id: m.id,
            name: m.name,
            department: m.department,
          }))}
          icon="vacation"
        />
      )}
    </TooltipProvider>
  )
}
