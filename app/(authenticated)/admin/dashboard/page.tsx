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

  // 0. 근로형태 변경 문서 조회 (모든 카테고리에서 재사용)
  const { data: workTypeChangeRequests } = await supabase
    .from('document_master')
    .select(`
      id,
      doc_data,
      requester:requester_id (
        id,
        name,
        department:department_id (name)
      )
    `)
    .eq('doc_type', 'work_type_change')
    .eq('status', 'approved');

  // 1. 휴가 (doc_data JSONB - annual, half_day, award)
  const { data: vacationRequests } = await supabase
    .from('document_master')
    .select(`
      id,
      doc_data,
      requester:requester_id (
        id,
        name,
        department:department_id (name)
      )
    `)
    .eq('doc_type', 'leave')
    .eq('status', 'approved');

  // 오늘 날짜가 연차 기간에 포함되고, leave_type이 annual, half_day, quarter_day, award인 것만 필터링
  const filteredVacationRequests = vacationRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const leaveType = docData.leave_type;
    return docData.start_date <= today && docData.end_date >= today &&
           ['annual', 'half_day', 'quarter_day', 'award'].includes(leaveType);
  }) || [];

  const vacationMembers = filteredVacationRequests.map(req => {
    const docData = req.doc_data || {};
    const leaveType = docData.leave_type;
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

  // 2. 사외 근무 (document_master - work_type_change(business_trip) + work_request - field_work, business_trip)
  // 2-1. document_master에서 출장/외근 조회
  const filteredBusinessTripRequests = workTypeChangeRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const workType = docData.work_type;
    return docData.start_date <= today && docData.end_date >= today &&
           workType === 'business_trip';
  }) || [];

  const businessTripFromDocMaster = filteredBusinessTripRequests.map(req => ({
    id: req.id.toString(),
    name: (req.requester as any)?.name || '알 수 없음',
    department: (req.requester as any)?.department?.name || '',
    status: '출장',
  }));

  // 2-2. 기존 work_request 테이블에서도 조회 (호환성 유지)
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

  const fieldWorkFromWorkRequest = fieldWorkRequests?.map(req => ({
    id: `wr-${req.id.toString()}`,
    name: (req.employee as any)?.name || '알 수 없음',
    department: (req.employee as any)?.department?.name || '',
    status: req.work_type === 'field_work' ? '외근' : '출장',
  })) || [];

  // 두 데이터 소스 병합
  const fieldWorkMembers = [...businessTripFromDocMaster, ...fieldWorkFromWorkRequest];

  // 3. 휴직 (document_master - leave(sick) + work_type_change(unpaid_leave, leave_of_absence))
  // 3-1. leave 문서에서 병가 조회
  const filteredSickLeaveRequests = vacationRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const leaveType = docData.leave_type;
    return docData.start_date <= today && docData.end_date >= today &&
           ['sick', 'unpaid'].includes(leaveType);
  }) || [];

  const sickLeaveMembers = filteredSickLeaveRequests.map(req => {
    const docData = req.doc_data || {};
    const leaveTypeLabels: Record<string, string> = {
      sick: '병가',
      unpaid: '무급휴직',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: leaveTypeLabels[docData.leave_type] || '휴직',
    };
  });

  // 3-2. work_type_change 문서에서 휴직 관련 조회
  const filteredLeaveOfAbsenceRequests = workTypeChangeRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const workType = docData.work_type;
    return docData.start_date <= today && docData.end_date >= today &&
           ['unpaid_leave', 'leave_of_absence', 'sick_leave', 'unpaid_sick_leave', 'public_duty', 'family_event_leave'].includes(workType);
  }) || [];

  const leaveOfAbsenceFromWorkType = filteredLeaveOfAbsenceRequests.map(req => {
    const docData = req.doc_data || {};
    const workTypeLabels: Record<string, string> = {
      unpaid_leave: '무급휴직',
      leave_of_absence: '휴직',
      sick_leave: '병가',
      unpaid_sick_leave: '무급병가',
      public_duty: '공가',
      family_event_leave: '경조사휴가',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: workTypeLabels[docData.work_type] || '휴직',
    };
  });

  // 병합
  const leaveOfAbsenceMembers = [...sickLeaveMembers, ...leaveOfAbsenceFromWorkType];

  // 4. 근무 변경 (document_master - work_type_change + work_request - remote)
  // 오늘 날짜가 기간에 포함되고, work_type이 근무 변경 관련인 것만 필터링
  const filteredWorkTypeChangeRequests = workTypeChangeRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const workType = docData.work_type;
    // work_schedule_change: 재택 등 근무 변경
    return docData.start_date <= today && docData.end_date >= today &&
           ['work_schedule_change', 'remote'].includes(workType);
  }) || [];

  const workTypeChangeMembers = filteredWorkTypeChangeRequests.map(req => {
    const docData = req.doc_data || {};
    const workTypeLabels: Record<string, string> = {
      work_schedule_change: '재택',
      remote: '재택',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: workTypeLabels[docData.work_type] || '근무 변경',
    };
  });

  // 4-2. 기존 work_request 테이블에서도 remote 조회 (호환성 유지)
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
    id: `wr-${req.id.toString()}`,
    name: (req.employee as any)?.name || '알 수 없음',
    department: (req.employee as any)?.department?.name || '',
    status: '재택',
  })) || [];

  // 두 데이터 소스 병합
  const allRemoteWorkMembers = [...workTypeChangeMembers, ...remoteWorkMembers];

  // 5. 출산/육아 (document_master - work_type_change)
  const filteredParentalLeaveRequests = workTypeChangeRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const workType = docData.work_type;
    return docData.start_date <= today && docData.end_date >= today &&
           ['parental_leave', 'maternity_leave', 'paternity_leave', 'pregnancy_reduced_hours'].includes(workType);
  }) || [];

  const parentalLeaveMembers = filteredParentalLeaveRequests.map(req => {
    const docData = req.doc_data || {};
    const workTypeLabels: Record<string, string> = {
      parental_leave: '육아휴직',
      maternity_leave: '출산휴가',
      paternity_leave: '배우자출산휴가',
      pregnancy_reduced_hours: '임신중단축근무',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: workTypeLabels[docData.work_type] || '출산/육아',
    };
  });

  // 6. 기타 (document_master - work_type_change(menstrual_leave 등))
  const filteredEtcRequests = workTypeChangeRequests?.filter(req => {
    const docData = req.doc_data || {};
    if (!docData.start_date || !docData.end_date) return false;
    const workType = docData.work_type;
    return docData.start_date <= today && docData.end_date >= today &&
           ['menstrual_leave'].includes(workType);
  }) || [];

  const etcMembers = filteredEtcRequests.map(req => {
    const docData = req.doc_data || {};
    const workTypeLabels: Record<string, string> = {
      menstrual_leave: '여성보건휴가',
    };
    return {
      id: req.id.toString(),
      name: (req.requester as any)?.name || '알 수 없음',
      department: (req.requester as any)?.department?.name || '',
      status: workTypeLabels[docData.work_type] || '기타',
    };
  });

  const workStatusData = {
    '휴가': vacationMembers,
    '사외 근무': fieldWorkMembers,
    '휴직': leaveOfAbsenceMembers,
    '근무 변경': allRemoteWorkMembers,
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

  // ========== 승인 대기 목록 (doc_data JSONB) ==========
  const { data: pendingRequests } = await supabase
    .from('document_master')
    .select(`
      id,
      created_at,
      doc_data,
      requester:requester_id(name)
    `)
    .eq('doc_type', 'leave')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  const approvalQueue = pendingRequests?.map(request => {
    const docData = request.doc_data || {};
    const leaveType = docData.leave_type;
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
      startDate: docData.start_date,
      endDate: docData.end_date,
      days: docData.days_count || 1,
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
