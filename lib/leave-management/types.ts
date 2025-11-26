// 연차 관리 페이지 타입 정의

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

export interface LeaveRequest {
  id: string
  memberId: string
  memberName: string
  leaveType: 'annual' | 'reward' | 'sick' | 'other'
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
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
}
