// 연차 관리 페이지 타입 정의
// 새로운 통합 문서 시스템(document_master + doc_leave)과 호환

import type {
  DocumentStatus,
  LeaveType as DocLeaveType,
  HalfDaySlot
} from '@/types/document'

export interface Member {
  id: string
  name: string
  team: string
  position: string
  annualLeave: number
  usedAnnualLeave: number
  rewardLeave: number
  usedRewardLeave: number
}

// 기존 호환용 타입 (통계에서 사용)
export type LeaveType = 'annual' | 'reward' | 'sick' | 'other'

// 상세 휴가 타입 (UI 표시에서 사용)
export type DetailedLeaveType = 'annual' | 'half_day' | 'half_day_am' | 'half_day_pm' | 'quarter_day' | 'award' | 'reward' | 'sick' | 'special'

// 상세 휴가 타입 라벨
export const DetailedLeaveTypeLabels: Record<string, string> = {
  annual: '연차',
  half_day: '반차',
  half_day_am: '오전 반차',
  half_day_pm: '오후 반차',
  quarter_day: '반반차',
  award: '포상휴가',
  reward: '포상휴가',
  sick: '병가',
  special: '특별휴가',
}

// 상세 휴가 타입 라벨 변환 함수
export function getDetailedLeaveTypeLabel(leaveType: string): string {
  return DetailedLeaveTypeLabels[leaveType] || '연차'
}

// 새 시스템 휴가 타입으로 매핑
export const LeaveTypeMapping: Record<LeaveType, DocLeaveType> = {
  annual: 'annual',
  reward: 'award',
  sick: 'annual', // sick은 annual로 처리
  other: 'annual', // other도 annual로 처리
}

export interface LeaveRequest {
  id: string | number // document_master.id (number) 또는 legacy (string)
  memberId: string
  memberName: string
  leaveType: LeaveType
  detailedLeaveType?: DetailedLeaveType // 상세 휴가 타입 (annual, half_day, quarter_day, award)
  startDate: string
  endDate: string
  days: number
  halfDaySlot?: HalfDaySlot // 반차 시간대
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'retrieved'
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
  canApprove?: boolean // 현재 사용자가 결재 가능한지 여부
  approvers?: {
    approverId: string
    approverName: string
    approvedAt: string
    status: 'approved' | 'rejected'
  }[]
  // 새 시스템 필드
  documentNumber?: string // 문서번호
  pdfUrl?: string
  driveFileUrl?: string
}

// document_master + doc_leave 조회 결과를 LeaveRequest로 변환하는 헬퍼
export function toLeaveRequest(doc: {
  id: number
  document_number: string | null
  requester_id: string
  title: string
  status: DocumentStatus
  created_at: string
  approved_at: string | null
  pdf_url: string | null
  drive_file_url: string | null
  requester?: {
    id: string
    name: string
  }
  doc_leave?: {
    leave_type: DocLeaveType
    start_date: string
    end_date: string
    days_count: number
    half_day_slot: HalfDaySlot | null
    reason: string | null
  }
}): LeaveRequest {
  const leaveTypeMap: Record<DocLeaveType, LeaveType> = {
    annual: 'annual',
    half_day: 'annual',
    quarter_day: 'annual',
    award: 'reward',
  }

  return {
    id: doc.id,
    memberId: doc.requester_id,
    memberName: doc.requester?.name || '',
    leaveType: doc.doc_leave ? leaveTypeMap[doc.doc_leave.leave_type] : 'annual',
    detailedLeaveType: (doc.doc_leave?.leave_type || 'annual') as DetailedLeaveType,
    startDate: doc.doc_leave?.start_date || '',
    endDate: doc.doc_leave?.end_date || '',
    days: doc.doc_leave?.days_count || 0,
    halfDaySlot: doc.doc_leave?.half_day_slot || undefined,
    reason: doc.doc_leave?.reason || undefined,
    status: doc.status as LeaveRequest['status'],
    submittedAt: doc.created_at,
    reviewedAt: doc.approved_at || undefined,
    documentNumber: doc.document_number || undefined,
    pdfUrl: doc.pdf_url || undefined,
    driveFileUrl: doc.drive_file_url || undefined,
  }
}
