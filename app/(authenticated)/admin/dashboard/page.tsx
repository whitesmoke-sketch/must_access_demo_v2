import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Armchair,
  Calendar,
  Home,
  UserX,
  QrCode,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AttendanceDonutChart } from '@/components/admin/AttendanceDonutChart';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock 층별 데이터 (실제 구현 시 DB에서 가져와야 함)
const floorData = [
  {
    floor: '2F',
    usedSeats: 45,
    totalSeats: 50,
    meetingRoomUsage: 75,
    status: 'busy' as const
  },
  {
    floor: '3F',
    usedSeats: 30,
    totalSeats: 50,
    meetingRoomUsage: 50,
    status: 'moderate' as const
  },
  {
    floor: '4F',
    usedSeats: 15,
    totalSeats: 50,
    meetingRoomUsage: 25,
    status: 'available' as const
  },
  {
    floor: '5F',
    usedSeats: 40,
    totalSeats: 50,
    meetingRoomUsage: 60,
    status: 'moderate' as const
  },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 인증 및 권한 확인
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  // 관리자 권한 확인
  const { data: employee } = await supabase
    .from('employee')
    .select('role_id(code)')
    .eq('id', user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleCode = (employee?.role_id as any)?.code;
  if (roleCode !== 'admin') {
    redirect('/dashboard');
  }

  const today = new Date().toISOString().split('T')[0];

  // 1. 전사 근태 현황 데이터
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', today);

  const { data: allEmployees } = await supabase
    .from('employee')
    .select('id')
    .eq('status', 'active');

  const totalMembers = allEmployees?.length || 0;

  // 출근 인원 수 (정상 출근 + 지각)
  const checkedInCount = todayAttendance?.filter(r =>
    r.status === 'checked_in' || r.is_late
  ).length || 0;

  // 지각 인원 수
  const lateCount = todayAttendance?.filter(r => r.is_late).length || 0;

  // 결근(미출근) 인원 수
  const absentCount = totalMembers - (todayAttendance?.length || 0);

  // 재택 근무 인원 수 (Mock 데이터 - 실제로는 DB에서)
  const remoteCount = 5;

  // 근태 준수율
  const onTimeCount = todayAttendance?.filter(r =>
    r.status === 'checked_in' && !r.is_late
  ).length || 0;
  const attendanceRate = totalMembers > 0 ? Math.round((onTimeCount / totalMembers) * 100) : 0;

  // 근태 현황 도넛 차트 데이터
  const attendanceDonutData = [
    { name: '출근', value: checkedInCount, color: '#4CD471' },
    { name: '지각', value: lateCount, color: '#F8C653' },
    { name: '결근', value: absentCount, color: '#FF6B6B' },
    { name: '재택', value: remoteCount, color: '#635BFF' },
  ];

  // 2. 자원 사용 현황 (좌석)
  const totalSeats = floorData.reduce((sum, floor) => sum + floor.totalSeats, 0);
  const totalUsedSeats = floorData.reduce((sum, floor) => sum + floor.usedSeats, 0);
  const overallOccupancyRate = Math.round((totalUsedSeats / totalSeats) * 100);

  // 전체 회의실 사용률 계산 (평균)
  const overallMeetingRoomUsage = Math.round(
    floorData.reduce((sum, floor) => sum + floor.meetingRoomUsage, 0) / floorData.length
  );

  // 3. 승인 대기 목록
  const { data: pendingRequests } = await supabase
    .from('leave_request')
    .select('*, employee:employee_id(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  const approvalQueue = pendingRequests?.map(request => ({
    id: request.id,
    userName: request.employee?.name || '알 수 없음',
    type: request.leave_type === 'annual' ? '연차' : request.leave_type === 'half_day' ? '반차' : '포상휴가',
    requestDate: request.created_at,
    startDate: request.start_date,
    endDate: request.end_date,
    days: request.days_count || 1,
  })) || [];

  // 4. 이상 상황 알림
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
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FFF0ED', color: '#FF6B6B', icon: '#FF6B6B' };
      case 'warning':
        return { bg: '#FFF8E5', color: '#F8C653', icon: '#F8C653' };
      case 'info':
        return { bg: 'rgba(22, 205, 199, 0.1)', color: '#16CDC7', icon: '#16CDC7' };
      default:
        return { bg: '#F6F8F9', color: '#5B6A72', icon: '#5B6A72' };
    }
  };

  const getFloorStatusColor = (status: 'busy' | 'moderate' | 'available') => {
    switch (status) {
      case 'busy':
        return '#FF6B6B';
      case 'moderate':
        return '#F8C653';
      case 'available':
        return '#4CD471';
    }
  };

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

        {/* Main Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1. 전사 근태 현황 */}
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
                전사 근태 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽: 근태 통계 카드 */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 출근 */}
                    <div
                      className="p-4 text-center"
                      style={{
                        backgroundColor: '#F6F8F9',
                        borderRadius: '12px'
                      }}
                    >
                      <Users className="w-5 h-5 mx-auto mb-2" style={{ color: '#4CD471' }} />
                      <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>출근</p>
                      <p className="mt-1" style={{ fontSize: '24px', fontWeight: 700, lineHeight: '31.2px', color: '#4CD471' }}>
                        {checkedInCount}
                      </p>
                    </div>

                    {/* 지각 */}
                    <div
                      className="p-4 text-center"
                      style={{
                        backgroundColor: '#F6F8F9',
                        borderRadius: '12px'
                      }}
                    >
                      <Clock className="w-5 h-5 mx-auto mb-2" style={{ color: '#F8C653' }} />
                      <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>지각</p>
                      <p className="mt-1" style={{ fontSize: '24px', fontWeight: 700, lineHeight: '31.2px', color: '#F8C653' }}>
                        {lateCount}
                      </p>
                    </div>

                    {/* 결근 */}
                    <div
                      className="p-4 text-center"
                      style={{
                        backgroundColor: '#F6F8F9',
                        borderRadius: '12px'
                      }}
                    >
                      <XCircle className="w-5 h-5 mx-auto mb-2" style={{ color: '#FF6B6B' }} />
                      <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>결근</p>
                      <p className="mt-1" style={{ fontSize: '24px', fontWeight: 700, lineHeight: '31.2px', color: '#FF6B6B' }}>
                        {absentCount}
                      </p>
                    </div>

                    {/* 재택 */}
                    <div
                      className="p-4 text-center"
                      style={{
                        backgroundColor: '#F6F8F9',
                        borderRadius: '12px'
                      }}
                    >
                      <Home className="w-5 h-5 mx-auto mb-2" style={{ color: '#635BFF' }} />
                      <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>재택</p>
                      <p className="mt-1" style={{ fontSize: '24px', fontWeight: 700, lineHeight: '31.2px', color: '#635BFF' }}>
                        {remoteCount}
                      </p>
                    </div>
                  </div>

                  {/* 근태 준수율 */}
                  <div
                    className="text-center p-4"
                    style={{
                      backgroundColor: '#F6F8F9',
                      borderRadius: '12px'
                    }}
                  >
                    <p style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                      전사 근태 준수율
                    </p>
                    <p className="mt-2" style={{ fontSize: '32px', fontWeight: 700, lineHeight: '41.6px', color: '#635BFF' }}>
                      {attendanceRate}%
                    </p>
                    <p className="mt-1" style={{ fontSize: '14px', lineHeight: '19.6px', color: '#5B6A72' }}>
                      {onTimeCount}명 정상 출근 / 총 {totalMembers}명
                    </p>
                  </div>
                </div>

                {/* 오른쪽: 도넛 차트 */}
                <AttendanceDonutChart data={attendanceDonutData} />
              </div>
            </CardContent>
          </Card>

          {/* 2. 자원 사용 현황 (좌석/회의실) */}
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
                {/* 메인 KPI: 좌석 점유율과 회의실 사용률 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 좌석 점유율 */}
                  <div
                    className="p-4 text-center"
                    style={{
                      backgroundColor: '#F6F8F9',
                      borderRadius: '12px'
                    }}
                  >
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

                  {/* 회의실 사용률 */}
                  <div
                    className="p-4 text-center"
                    style={{
                      backgroundColor: '#F6F8F9',
                      borderRadius: '12px'
                    }}
                  >
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

                {/* 구분선 */}
                <div style={{ borderTop: '1px solid #E5E8EB' }} />

                {/* 보조 히트맵: 층별 혼잡도 (작게 표현) */}
                <div>
                  <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72', marginBottom: '8px' }}>
                    층별 혼잡도
                  </p>

                  <div className="space-y-1.5">
                    {floorData.map((floor) => {
                      const occupancyRate = Math.round((floor.usedSeats / floor.totalSeats) * 100);
                      const statusColor = getFloorStatusColor(floor.status);

                      return (
                        <Tooltip key={floor.floor}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer">
                              {/* 층 레이블 */}
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

                              {/* 히트맵 바 */}
                              <div
                                className="flex-1 transition-all"
                                style={{
                                  height: '20px',
                                  borderRadius: '4px',
                                  backgroundColor: statusColor,
                                  opacity: 0.7,
                                  transitionDuration: '150ms',
                                  transitionTimingFunction: 'ease-in-out',
                                }}
                              />

                              {/* 점유율 */}
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
                      );
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
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
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
                      style={{
                        backgroundColor: 'transparent',
                        transitionDuration: '150ms',
                        transitionTimingFunction: 'ease-in-out',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#29363D' }}>
                              {request.userName}
                            </p>
                            <Badge
                              style={{
                                backgroundColor: 'rgba(99, 91, 255, 0.1)',
                                color: '#635BFF',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                              }}
                            >
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
                              transitionDuration: '150ms',
                              transitionTimingFunction: 'ease-in-out',
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
                              transitionDuration: '150ms',
                              transitionTimingFunction: 'ease-in-out',
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
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
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
                  const severityStyle = getSeverityColor(alert.severity);
                  const Icon = alert.icon;

                  return (
                    <div
                      key={alert.id}
                      className="p-3 transition-all cursor-pointer"
                      style={{
                        backgroundColor: severityStyle.bg,
                        borderRadius: '12px',
                        transitionDuration: '150ms',
                        transitionTimingFunction: 'ease-in-out',
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
                            <Badge
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                color: '#5B6A72',
                                fontSize: '11px',
                                fontWeight: 500,
                                border: 'none',
                                padding: '2px 6px'
                              }}
                            >
                              {alert.category}
                            </Badge>
                            <p style={{ fontSize: '12px', lineHeight: '16px', color: '#5B6A72' }}>
                              {alert.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </TooltipProvider>
  );
}
