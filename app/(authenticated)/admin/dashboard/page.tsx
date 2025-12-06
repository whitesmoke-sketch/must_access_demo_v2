import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

// 오늘 날짜 문자열 반환
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// 층별 상태 결정
function getFloorStatus(occupancyRate: number): 'busy' | 'moderate' | 'available' {
  if (occupancyRate >= 70) return 'busy';
  if (occupancyRate >= 40) return 'moderate';
  return 'available';
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = getTodayString();

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

  // ========== 층별 좌석 데이터 조회 ==========
  const { data: seats } = await supabase
    .from('seat')
    .select('id, floor, is_available')
    .eq('is_available', true);

  const { data: todayReservations } = await supabase
    .from('seat_reservation')
    .select('seat_id, seat:seat_id(floor)')
    .eq('reservation_date', today)
    .in('status', ['reserved', 'in_use']);

  // 층별 좌석 수 계산
  const floorSeatCounts: Record<number, { total: number; used: number }> = {};

  seats?.forEach(seat => {
    if (!floorSeatCounts[seat.floor]) {
      floorSeatCounts[seat.floor] = { total: 0, used: 0 };
    }
    floorSeatCounts[seat.floor].total++;
  });

  todayReservations?.forEach(res => {
    const floor = (res.seat as any)?.floor;
    if (floor && floorSeatCounts[floor]) {
      floorSeatCounts[floor].used++;
    }
  });

  // ========== 층별 회의실 사용률 조회 ==========
  const { data: meetingRooms } = await supabase
    .from('meeting_room')
    .select('id, floor')
    .eq('is_active', true);

  const { data: todayBookings } = await supabase
    .from('meeting_room_booking')
    .select('room_id, start_time, end_time, meeting_room:room_id(floor)')
    .eq('booking_date', today)
    .eq('status', 'confirmed');

  // 층별 회의실 사용률 계산 (9시~18시 기준, 9시간)
  const WORK_HOURS = 9;
  const floorMeetingUsage: Record<number, { totalMinutes: number; usedMinutes: number }> = {};

  meetingRooms?.forEach(room => {
    if (!floorMeetingUsage[room.floor]) {
      floorMeetingUsage[room.floor] = { totalMinutes: 0, usedMinutes: 0 };
    }
    floorMeetingUsage[room.floor].totalMinutes += WORK_HOURS * 60;
  });

  todayBookings?.forEach(booking => {
    const floor = (booking.meeting_room as any)?.floor;
    if (floor && floorMeetingUsage[floor]) {
      const start = booking.start_time?.split(':').map(Number) || [0, 0];
      const end = booking.end_time?.split(':').map(Number) || [0, 0];
      const minutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      if (minutes > 0) {
        floorMeetingUsage[floor].usedMinutes += minutes;
      }
    }
  });

  // floorData 생성 (2층~5층 기본)
  const floors = [2, 3, 4, 5];
  const floorData = floors.map(floor => {
    const seatData = floorSeatCounts[floor] || { total: 0, used: 0 };
    const meetingData = floorMeetingUsage[floor] || { totalMinutes: 1, usedMinutes: 0 };
    const occupancyRate = seatData.total > 0 ? Math.round((seatData.used / seatData.total) * 100) : 0;
    const meetingUsage = meetingData.totalMinutes > 0
      ? Math.round((meetingData.usedMinutes / meetingData.totalMinutes) * 100)
      : 0;

    return {
      floor: `${floor}F`,
      usedSeats: seatData.used,
      totalSeats: seatData.total,
      meetingRoomUsage: meetingUsage,
      status: getFloorStatus(occupancyRate) as 'busy' | 'moderate' | 'available',
    };
  });

  // 전체 좌석 통계
  const totalSeats = floorData.reduce((sum, floor) => sum + floor.totalSeats, 0);
  const totalUsedSeats = floorData.reduce((sum, floor) => sum + floor.usedSeats, 0);
  const overallOccupancyRate = totalSeats > 0 ? Math.round((totalUsedSeats / totalSeats) * 100) : 0;

  // 전체 회의실 사용률
  const overallMeetingRoomUsage = floorData.length > 0
    ? Math.round(floorData.reduce((sum, floor) => sum + floor.meetingRoomUsage, 0) / floorData.length)
    : 0;

  // ========== 근무 현황 데이터 조회 ==========

  // 1. 휴가 (새 시스템: document_master + doc_leave - annual, half_day, award)
  const { data: vacationRequests } = await supabase
    .from('document_master')
    .select(`
      id,
      requester:requester_id (
        id,
        name,
        department:department_id (name)
      ),
      doc_leave!inner (
        leave_type,
        start_date,
        end_date
      )
    `)
    .eq('doc_type', 'leave')
    .eq('status', 'approved');

  // 오늘 날짜가 연차 기간에 포함되고, leave_type이 annual, half_day, quarter_day, award인 것만 필터링
  const filteredVacationRequests = vacationRequests?.filter(req => {
    const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave;
    if (!docLeave) return false;
    const leaveType = docLeave.leave_type;
    return docLeave.start_date <= today && docLeave.end_date >= today &&
           ['annual', 'half_day', 'quarter_day', 'award'].includes(leaveType);
  }) || [];

  const vacationMembers = filteredVacationRequests.map(req => {
    const docLeave = Array.isArray(req.doc_leave) ? req.doc_leave[0] : req.doc_leave;
    const leaveType = docLeave?.leave_type;
    const leaveTypeLabels: Record<string, string> = {
      annual: '연차',
      half_day: '반차',
      quarter_day: '반반차',
      award: '포상휴가',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: leaveTypeLabels[leaveType] || '연차',
    };
  });

  // 2. 사외 근무 (work_request - field_work, business_trip)
  const { data: fieldWorkRequests } = await supabase
    .from('work_request')
    .select(`
      id,
      work_type,
      employee:employee_id (
        id,
        name,
        department:department_id (name)
      )
    `)
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)
    .in('work_type', ['field_work', 'business_trip']);

  const fieldWorkMembers = fieldWorkRequests?.map(req => ({
    id: req.id.toString(),
    name: (req.employee as any)?.name || '알 수 없음',
    department: (req.employee as any)?.department?.name || '',
    status: req.work_type === 'field_work' ? '외근' : '출장',
  })) || [];

  // 3. 휴직 (향후 별도 테이블 또는 employee 상태로 관리 예정)
  // 현재는 빈 배열
  const leaveOfAbsenceMembers: { id: string; name: string; department: string; status: string }[] = [];

  // 4. 근무 변경 (work_request - remote)
  const { data: remoteWorkRequests } = await supabase
    .from('work_request')
    .select(`
      id,
      work_type,
      employee:employee_id (
        id,
        name,
        department:department_id (name)
      )
    `)
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('work_type', 'remote');

  const remoteWorkMembers = remoteWorkRequests?.map(req => ({
    id: req.id.toString(),
    name: (req.employee as any)?.name || '알 수 없음',
    department: (req.employee as any)?.department?.name || '',
    status: '재택',
  })) || [];

  // 5. 출산/육아 (향후 별도 테이블로 관리 예정)
  // 현재는 빈 배열
  const parentalLeaveMembers: { id: string; name: string; department: string; status: string }[] = [];

  // 6. 기타 (향후 확장 예정)
  // 현재는 빈 배열
  const etcMembers: { id: string; name: string; department: string; status: string }[] = [];

  const workStatusData = {
    '휴가': vacationMembers,
    '사외 근무': fieldWorkMembers,
    '휴직': leaveOfAbsenceMembers,
    '근무 변경': remoteWorkMembers,
    '출산/육아': parentalLeaveMembers,
    '기타': etcMembers,
  };

  // ========== 스튜디오 출입 상태 조회 ==========
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

  // ========== 승인 대기 목록 (새 시스템: document_master + doc_leave) ==========
  const { data: pendingRequests } = await supabase
    .from('document_master')
    .select(`
      id,
      created_at,
      requester:requester_id(name),
      doc_leave (
        leave_type,
        start_date,
        end_date,
        days_count
      )
    `)
    .eq('doc_type', 'leave')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  const approvalQueue = pendingRequests?.map(request => {
    const docLeave = Array.isArray(request.doc_leave) ? request.doc_leave[0] : request.doc_leave;
    const leaveType = docLeave?.leave_type;
    const leaveTypeLabels: Record<string, string> = {
      annual: '연차',
      half_day: '반차',
      quarter_day: '반반차',
      award: '포상휴가',
    };
    return {
      id: request.id,
      userName: (request.requester as any)?.name || '알 수 없음',
      type: leaveTypeLabels[leaveType] || '연차',
      requestDate: request.created_at,
      startDate: docLeave?.start_date,
      endDate: docLeave?.end_date,
      days: docLeave?.days_count || 1,
    };
  }) || [];

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
