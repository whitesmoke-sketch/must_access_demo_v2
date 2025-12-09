// ================================================================
// 휴가신청서 PDF 타입 정의
// ================================================================

import { LeaveType, DocumentStatus } from '@/types/document'

// 결재자 정보
export interface ApproverInfo {
  id: string
  name: string
  role: string       // 직급명
  department: string // 부서명
  status: 'waiting' | 'pending' | 'approved' | 'rejected'
  comment?: string
  approvedAt?: string
  signatureUrl?: string  // 서명/직인 이미지
}

// 참조자 정보
export interface CCInfo {
  id: string
  name: string
  role: string
  department: string
}

// 휴가 기간 행 (주말 분리된 단위)
export interface LeavePeriodRow {
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  leaveType: LeaveType
  days: number        // 해당 기간의 일수
}

// 휴가신청서 PDF 데이터
export interface LeaveRequestPDFData {
  // 문서 정보
  documentNumber?: string
  createdAt: string
  status: DocumentStatus

  // 신청자 정보
  requester: {
    id: string
    name: string
    department: string
    role: string
  }

  // 연차 정보
  totalLeave: number      // 보유연차
  usedLeave: number       // 사용연차
  remainingLeave: number  // 잔여연차 (신청 후)

  // 휴가 상세
  leaveType: LeaveType
  startDate: string
  endDate: string
  totalDays: number       // 총 휴가일수
  reason?: string

  // 결재선
  approvers: ApproverInfo[]

  // 참조자 (선택)
  ccList?: CCInfo[]
}

// 휴가 유형 한글 레이블
export const LeaveTypeLabelMap: Record<LeaveType, string> = {
  annual: '연차',
  half_day: '반차',
  half_day_am: '오전반차',
  half_day_pm: '오후반차',
  quarter_day: '반반차',
  award: '포상휴가',
  sick: '병가',
  special: '특별휴가',
}

// 결재 상태 한글 레이블
export const ApprovalStatusLabelMap: Record<ApproverInfo['status'], string> = {
  waiting: '대기',
  pending: '결재중',
  approved: '승인',
  rejected: '반려',
}
