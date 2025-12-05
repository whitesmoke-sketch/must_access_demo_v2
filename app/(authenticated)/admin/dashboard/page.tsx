import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

// Mock 층별 데이터
const floorData = [
  { floor: '2F', usedSeats: 45, totalSeats: 50, meetingRoomUsage: 75, status: 'busy' as const },
  { floor: '3F', usedSeats: 30, totalSeats: 50, meetingRoomUsage: 50, status: 'moderate' as const },
  { floor: '4F', usedSeats: 15, totalSeats: 50, meetingRoomUsage: 25, status: 'available' as const },
  { floor: '5F', usedSeats: 40, totalSeats: 50, meetingRoomUsage: 60, status: 'moderate' as const },
];

// 근무 현황 카테고리별 데이터 (6개 카테고리)
const workStatusData = {
  '휴가': [
    { id: 'v1', name: '홍길동', department: '인사팀', status: '연차' },
    { id: 'v2', name: '김민지', department: '재무팀', status: '반차' },
    { id: 'v3', name: '이준호', department: '총무팀', status: '포상휴가' },
    { id: 'v4', name: '박서준', department: '인사팀', status: '연차' },
    { id: 'v5', name: '정유미', department: '재무팀', status: '반차' },
    { id: 'v6', name: '조인성', department: '총무팀', status: '연차' },
  ],
  '사외 근무': [
    { id: 'f1', name: '김철수', department: '영업팀', status: '외근' },
    { id: 'f2', name: '이영희', department: '마케팅팀', status: '출장' },
    { id: 'f3', name: '박민수', department: '영업팀', status: '외근' },
  ],
  '휴직': [
    { id: 'l1', name: '최지우', department: '개발팀', status: '휴직' },
    { id: 'l2', name: '한지민', department: '기획팀', status: '휴직' },
  ],
  '근무 변경': [
    { id: 'r1', name: '최동욱', department: '개발팀', status: '재택' },
    { id: 'r2', name: '강서연', department: '디자인팀', status: '재택' },
    { id: 'r3', name: '윤재호', department: '개발팀', status: '재택' },
    { id: 'r4', name: '임하늘', department: '개발팀', status: '재택' },
  ],
  '출산/육아': [
    { id: 'p1', name: '송민정', department: '기획팀', status: '육아휴직' },
    { id: 'p2', name: '배수지', department: '디자인팀', status: '출산전후 휴가' },
  ],
  '기타': [
    { id: 'o1', name: '김태희', department: '개발팀', status: '경조사 휴가' },
    { id: 'o2', name: '정우성', department: '마케팅팀', status: '공가 휴가' },
  ],
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 인증 및 권한 확인
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  // 관리자 권한 확인 (role.level >= 5)
  const { data: employee } = await supabase
    .from('employee')
    .select(`
      id,
      role_id,
      role:role_id (
        level
      )
    `)
    .eq('id', user.id)
    .single();

  if (!employee || !employee.role || (employee.role as any).level < 5) {
    redirect('/dashboard');
  }

  // 자원 사용 현황 (좌석)
  const totalSeats = floorData.reduce((sum, floor) => sum + floor.totalSeats, 0);
  const totalUsedSeats = floorData.reduce((sum, floor) => sum + floor.usedSeats, 0);
  const overallOccupancyRate = Math.round((totalUsedSeats / totalSeats) * 100);

  // 전체 회의실 사용률 계산 (평균)
  const overallMeetingRoomUsage = Math.round(
    floorData.reduce((sum, floor) => sum + floor.meetingRoomUsage, 0) / floorData.length
  );

  // 스튜디오 출입 상태 조회
  const { data: studioAccess } = await supabase
    .from('studio_access')
    .select('*')
    .eq('location', 'B1F_STUDIO')
    .single();

  const studioAccessStatus: {
    status: 'available' | 'restricted';
    reason?: string;
  } = studioAccess ? {
    status: studioAccess.status as 'available' | 'restricted',
    reason: studioAccess.reason || undefined,
  } : {
    status: 'available',
  };

  // 승인 대기 목록
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

  return (
    <AdminDashboardClient
      workStatusData={workStatusData}
      studioAccessStatus={studioAccessStatus}
      approvalQueue={approvalQueue}
      floorData={floorData}
      totalSeats={totalSeats}
      totalUsedSeats={totalUsedSeats}
      overallOccupancyRate={overallOccupancyRate}
      overallMeetingRoomUsage={overallMeetingRoomUsage}
    />
  );
}
