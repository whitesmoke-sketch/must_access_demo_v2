'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Armchair,
  Calendar,
  Home,
  UserX,
  QrCode,
  ChevronRight,
  Briefcase,
  Palmtree
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WorkStatusModal } from './WorkStatusModal'

interface Member {
  id: string
  name: string
  department: string
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

interface Alert {
  id: number
  severity: string
  message: string
  time: string
  category: string
  icon: any
}

interface FloorData {
  floor: string
  usedSeats: number
  totalSeats: number
  meetingRoomUsage: number
  status: 'busy' | 'moderate' | 'available'
}

interface AdminDashboardClientProps {
  fieldWorkMembers: Member[]
  remoteMembers: Member[]
  vacationMembers: Member[]
  approvalQueue: ApprovalRequest[]
  alerts: Alert[]
  floorData: FloorData[]
  totalSeats: number
  totalUsedSeats: number
  overallOccupancyRate: number
  overallMeetingRoomUsage: number
}

export function AdminDashboardClient({
  fieldWorkMembers,
  remoteMembers,
  vacationMembers,
  approvalQueue,
  alerts,
  floorData,
  totalSeats,
  totalUsedSeats,
  overallOccupancyRate,
  overallMeetingRoomUsage,
}: AdminDashboardClientProps) {
  const [showFieldWorkModal, setShowFieldWorkModal] = useState(false)
  const [showRemoteModal, setShowRemoteModal] = useState(false)
  const [showVacationModal, setShowVacationModal] = useState(false)

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
          <p style={{
            fontSize: '16px',
            lineHeight: '24px',
            color: '#5B6A72',
            marginTop: '4px'
          }}>
            실시간 현황과 승인 대기 항목을 확인하세요
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1. 오늘의 근무 현황 */}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 외근 인원 */}
                <div
                  className="md:border-r md:pr-6"
                  style={{ borderColor: '#E5E8EB' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4" style={{ color: '#635BFF' }} />
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#29363D'
                    }}>
                      외근 인원 ({fieldWorkMembers.length}명)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {fieldWorkMembers.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3"
                        style={{
                          backgroundColor: '#F6F8F9',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#635BFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#29363D' }}>
                            {member.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '2px' }}>
                            {member.department}
                          </p>
                        </div>
                      </div>
                    ))}
                    {fieldWorkMembers.length > 5 && (
                      <button
                        onClick={() => setShowFieldWorkModal(true)}
                        className="w-full py-2 transition-all hover:text-[#635BFF]"
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#5B6A72',
                          backgroundColor: 'transparent',
                        }}
                      >
                        전체보기
                      </button>
                    )}
                  </div>
                </div>

                {/* 재택 인원 */}
                <div
                  className="md:border-r md:pr-6"
                  style={{ borderColor: '#E5E8EB' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="w-4 h-4" style={{ color: '#16CDC7' }} />
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#29363D'
                    }}>
                      재택 인원 ({remoteMembers.length}명)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {remoteMembers.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3"
                        style={{
                          backgroundColor: '#F6F8F9',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#16CDC7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#29363D' }}>
                            {member.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '2px' }}>
                            {member.department}
                          </p>
                        </div>
                      </div>
                    ))}
                    {remoteMembers.length > 5 && (
                      <button
                        onClick={() => setShowRemoteModal(true)}
                        className="w-full py-2 transition-all hover:text-[#16CDC7]"
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#5B6A72',
                          backgroundColor: 'transparent',
                        }}
                      >
                        전체보기
                      </button>
                    )}
                  </div>
                </div>

                {/* 연차 인원 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palmtree className="w-4 h-4" style={{ color: '#F8C653' }} />
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#29363D'
                    }}>
                      연차 인원 ({vacationMembers.length}명)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {vacationMembers.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3"
                        style={{
                          backgroundColor: '#F6F8F9',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#F8C653',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#29363D' }}>
                            {member.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#5B6A72', marginTop: '2px' }}>
                            {member.department}
                          </p>
                        </div>
                      </div>
                    ))}
                    {vacationMembers.length > 5 && (
                      <button
                        onClick={() => setShowVacationModal(true)}
                        className="w-full py-2 transition-all hover:text-[#F8C653]"
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#5B6A72',
                          backgroundColor: 'transparent',
                        }}
                      >
                        전체보기
                      </button>
                    )}
                  </div>
                </div>
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
                    <p className="mt-2" style={{ fontSize: '32px', fontWeight: 700, lineHeight: '41.6px', color: '#635BFF' }}>
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
                    <p className="mt-2" style={{ fontSize: '32px', fontWeight: 700, lineHeight: '41.6px', color: '#16CDC7' }}>
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
                    모든 승인 완료
                  </p>
                  <p className="mt-1" style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                    대기 중인 승인 항목이 없습니다
                  </p>
                </div>
              ) : (
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

      {/* Modals */}
      <WorkStatusModal
        isOpen={showFieldWorkModal}
        onClose={() => setShowFieldWorkModal(false)}
        title="외근 인원"
        members={fieldWorkMembers}
        icon="fieldwork"
      />

      <WorkStatusModal
        isOpen={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
        title="재택 인원"
        members={remoteMembers}
        icon="remote"
      />

      <WorkStatusModal
        isOpen={showVacationModal}
        onClose={() => setShowVacationModal(false)}
        title="연차 인원"
        members={vacationMembers}
        icon="vacation"
      />
    </TooltipProvider>
  )
}
