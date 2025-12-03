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

// Mock 근무 현황 데이터
const fieldWorkMembers = [
  { id: '1', name: '김철수', department: '영업팀' },
  { id: '2', name: '이영희', department: '마케팅팀' },
  { id: '3', name: '박민수', department: '영업팀' },
  { id: '4', name: '정수진', department: '기획팀' },
  { id: '5', name: '한지민', department: '영업팀' },
  { id: '6', name: '오세훈', department: '기획팀' },
  { id: '7', name: '류현진', department: '마케팅팀' },
];

const remoteMembers = [
  { id: '5', name: '최동욱', department: '개발팀' },
  { id: '6', name: '강서연', department: '디자인팀' },
  { id: '7', name: '윤재호', department: '개발팀' },
  { id: '8', name: '임하늘', department: '개발팀' },
  { id: '9', name: '송민정', department: '기획팀' },
  { id: '10', name: '배수지', department: '디자인팀' },
  { id: '11', name: '김태희', department: '개발팀' },
];

const vacationMembers = [
  { id: '10', name: '홍길동', department: '인사팀' },
  { id: '11', name: '김민지', department: '재무팀' },
  { id: '12', name: '이준호', department: '총무팀' },
  { id: '13', name: '박서준', department: '인사팀' },
  { id: '14', name: '정유미', department: '재무팀' },
  { id: '15', name: '조인성', department: '총무팀' },
];

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
      fieldWorkMembers={fieldWorkMembers}
      remoteMembers={remoteMembers}
      vacationMembers={vacationMembers}
      approvalQueue={approvalQueue}
      floorData={floorData}
      totalSeats={totalSeats}
      totalUsedSeats={totalUsedSeats}
      overallOccupancyRate={overallOccupancyRate}
      overallMeetingRoomUsage={overallMeetingRoomUsage}
    />
  );
}
