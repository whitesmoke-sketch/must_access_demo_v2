// ================================================================
// 데이터베이스 데이터를 PDF 데이터로 변환하는 함수들
// ================================================================

import {
  DocumentMasterWithRequester,
  DocLeaveData,
  ApprovalStepForDocument,
  isLeaveData,
} from '@/types/document'
import {
  LeaveRequestPDFData,
  ApproverInfo,
  CCInfo,
} from './types'

// approval_step 데이터를 ApproverInfo로 변환
function transformApprovalSteps(steps: ApprovalStepForDocument[]): ApproverInfo[] {
  return steps
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => ({
      id: step.approver_id,
      name: step.approver?.name || '알 수 없음',
      role: step.approver?.role?.name || '',
      department: step.approver?.department?.name || '',
      status: step.status,
      comment: step.comment || undefined,
      approvedAt: step.approved_at || undefined,
    }))
}

// approval_cc 데이터를 CCInfo로 변환
interface ApprovalCCRow {
  employee_id: string
  employee?: {
    id: string
    name: string
    role?: { name: string }
    department?: { name: string }
  }
}

function transformCCList(ccList: ApprovalCCRow[]): CCInfo[] {
  return ccList.map((cc) => ({
    id: cc.employee_id,
    name: cc.employee?.name || '알 수 없음',
    role: cc.employee?.role?.name || '',
    department: cc.employee?.department?.name || '',
  }))
}

// DocumentMasterWithRequester + 연관 데이터를 LeaveRequestPDFData로 변환
interface TransformLeaveRequestParams {
  document: DocumentMasterWithRequester
  approvalSteps: ApprovalStepForDocument[]
  ccList?: ApprovalCCRow[]
  leaveBalance: {
    total_days: number
    used_days: number
    remaining_days: number
  }
}

export function transformToLeaveRequestPDFData({
  document,
  approvalSteps,
  ccList,
  leaveBalance,
}: TransformLeaveRequestParams): LeaveRequestPDFData | null {
  // doc_data가 leave 타입인지 확인
  if (!isLeaveData(document.doc_data, document.doc_type)) {
    console.error('문서 타입이 휴가가 아닙니다.')
    return null
  }

  const leaveData = document.doc_data as DocLeaveData

  // 이 신청으로 인해 감소할 연차 계산
  const remainingAfterRequest = leaveBalance.remaining_days - leaveData.days_count

  return {
    // 문서 정보
    documentNumber: document.document_number || undefined,
    createdAt: document.created_at,
    status: document.status,

    // 신청자 정보
    requester: {
      id: document.requester.id,
      name: document.requester.name,
      department: document.requester.department.name,
      role: document.requester.role.name,
    },

    // 연차 정보
    totalLeave: leaveBalance.total_days,
    usedLeave: leaveBalance.used_days,
    remainingLeave: remainingAfterRequest,

    // 휴가 상세
    leaveType: leaveData.leave_type,
    startDate: leaveData.start_date,
    endDate: leaveData.end_date,
    totalDays: leaveData.days_count,
    reason: leaveData.reason || undefined,

    // 결재선
    approvers: transformApprovalSteps(approvalSteps),

    // 참조자 (있는 경우에만)
    ccList: ccList && ccList.length > 0 ? transformCCList(ccList) : undefined,
  }
}

// 테스트/미리보기용 더미 데이터 생성
export function createSampleLeaveRequestPDFData(): LeaveRequestPDFData {
  return {
    documentNumber: 'LV-2024-0001',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'pending',

    requester: {
      id: 'sample-user-id',
      name: '홍길동',
      department: '개발팀',
      role: '선임',
    },

    totalLeave: 15,
    usedLeave: 3,
    remainingLeave: 10, // 15 - 3 - 2 (이번 신청분)

    leaveType: 'annual',
    startDate: '2024-12-05', // 목요일
    endDate: '2024-12-10',   // 화요일 (주말 포함)
    totalDays: 4,            // 목금 + 월화 = 4일
    reason: '개인 사유',

    approvers: [
      {
        id: 'approver-1',
        name: '김팀장',
        role: '팀장',
        department: '개발팀',
        status: 'approved',
        approvedAt: '2024-12-04',
      },
      {
        id: 'approver-2',
        name: '박본부장',
        role: '본부장',
        department: '기술본부',
        status: 'pending',
      },
    ],

    ccList: [
      {
        id: 'cc-1',
        name: '이과장',
        role: '과장',
        department: '인사팀',
      },
    ],
  }
}

// 참조자 없는 버전
export function createSampleLeaveRequestPDFDataWithoutCC(): LeaveRequestPDFData {
  const data = createSampleLeaveRequestPDFData()
  return {
    ...data,
    ccList: undefined,
  }
}

// 결재자 많은 버전 (5명)
export function createSampleLeaveRequestPDFDataManyApprovers(): LeaveRequestPDFData {
  const data = createSampleLeaveRequestPDFData()
  return {
    ...data,
    approvers: [
      { id: '1', name: '김팀장', role: '팀장', department: '개발팀', status: 'approved' },
      { id: '2', name: '박실장', role: '실장', department: '개발실', status: 'approved' },
      { id: '3', name: '이본부장', role: '본부장', department: '기술본부', status: 'approved' },
      { id: '4', name: '최이사', role: '이사', department: '경영지원', status: 'pending' },
      { id: '5', name: '정대표', role: '대표이사', department: '경영진', status: 'waiting' },
    ],
  }
}
