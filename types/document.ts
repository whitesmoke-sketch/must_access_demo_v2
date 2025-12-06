// ================================================================
// 통합 문서 시스템 타입 정의
// 새로운 Master-Detail 구조에 맞는 타입
// ================================================================

// ================================================================
// ENUM 타입
// ================================================================

export type VisibilityScope = 'private' | 'team' | 'department' | 'division' | 'public'

export type DocumentType = 'leave' | 'overtime' | 'expense' | 'welfare' | 'general'

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'retrieved'

export type LeaveType = 'annual' | 'half_day' | 'quarter_day' | 'award'

export type HalfDaySlot = 'morning' | 'afternoon'

// ================================================================
// Document Master (공통 헤더)
// ================================================================

export interface DocumentMaster {
  id: number
  document_number: string | null
  requester_id: string
  department_id: number
  visibility: VisibilityScope
  is_confidential: boolean
  doc_type: DocumentType
  title: string
  status: DocumentStatus
  summary_data: Record<string, unknown> | null
  current_step: number
  drive_file_id: string | null
  drive_file_url: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  retrieved_at: string | null
}

// 조회용 확장 타입 (requester 정보 포함)
export interface DocumentMasterWithRequester extends DocumentMaster {
  requester: {
    id: string
    name: string
    email: string
    department: {
      id: number
      name: string
      code: string
    }
    role: {
      id: number
      name: string
      code: string
      level: number
    }
  }
}

// ================================================================
// Document Details (상세 테이블)
// ================================================================

// 휴가 신청 상세
export interface DocLeave {
  document_id: number
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_count: number
  half_day_slot: HalfDaySlot | null
  reason: string | null
  attachment_url: string | null
  deducted_from_grants: Array<{
    grant_id: number
    days: number
  }>
  created_at: string
}

// 야근 수당 신청 상세
export interface DocOvertime {
  document_id: number
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee: number
  created_at: string
}

// 지출 결의서 상세
export interface DocExpense {
  document_id: number
  expense_date: string
  category: string
  amount: number
  merchant_name: string | null
  usage_purpose: string | null
  receipt_url: string | null
  expense_items: Array<{
    item: string
    amount: number
  }>
  created_at: string
}

// 경조사비 신청 상세
export interface DocWelfare {
  document_id: number
  event_type: string
  event_date: string
  target_name: string | null
  relationship: string | null
  amount: number
  attachment_url: string | null
  approved_amount: number | null
  created_at: string
}

// 일반 문서 상세
export interface DocGeneral {
  document_id: number
  content_body: string
  attachment_urls: string[]
  template_type: string | null
  form_data: Record<string, unknown>
  created_at: string
}

// ================================================================
// 통합 문서 타입 (Master + Detail)
// ================================================================

export interface DocumentWithLeave extends DocumentMasterWithRequester {
  doc_leave: DocLeave
}

export interface DocumentWithOvertime extends DocumentMasterWithRequester {
  doc_overtime: DocOvertime
}

export interface DocumentWithExpense extends DocumentMasterWithRequester {
  doc_expense: DocExpense
}

export interface DocumentWithWelfare extends DocumentMasterWithRequester {
  doc_welfare: DocWelfare
}

export interface DocumentWithGeneral extends DocumentMasterWithRequester {
  doc_general: DocGeneral
}

// Union 타입
export type DocumentWithDetail =
  | DocumentWithLeave
  | DocumentWithOvertime
  | DocumentWithExpense
  | DocumentWithWelfare
  | DocumentWithGeneral

// ================================================================
// 문서 참조
// ================================================================

export interface DocumentReference {
  id: number
  source_doc_id: number
  target_doc_id: number
  snapshot_title: string | null
  snapshot_content: Record<string, unknown> | null
  created_at: string
}

// ================================================================
// 접근 로그
// ================================================================

export type AccessActionType = 'view' | 'print' | 'download'

export interface DocumentAccessLog {
  id: number
  document_id: number
  viewer_id: string
  viewed_at: string
  ip_address: string | null
  user_agent: string | null
  action_type: AccessActionType
}

// ================================================================
// 휴가 사용 연결
// ================================================================

export interface LeaveUsageLink {
  id: number
  document_id: number
  grant_id: number
  used_days: number
  used_date: string
  created_at: string
}

// ================================================================
// 결재선 관련 (approval_step 연동)
// ================================================================

export type ApprovalRequestType = DocumentType // 이제 document_type과 동일

export interface ApprovalStepForDocument {
  id: string
  request_type: ApprovalRequestType
  request_id: number // document_master.id
  approver_id: string
  step_order: number
  approval_type: 'single' | 'agreement'
  status: 'waiting' | 'pending' | 'approved' | 'rejected'
  comment: string | null
  approved_at: string | null
  is_last_step: boolean
  approver?: {
    id: string
    name: string
    email: string
    role: {
      name: string
      code: string
      level: number
    }
    department: {
      name: string
    }
  }
}

// ================================================================
// API 요청/응답 타입
// ================================================================

// 문서 생성 입력
export interface CreateDocumentInput {
  doc_type: DocumentType
  title: string
  visibility?: VisibilityScope
  is_confidential?: boolean
}

// 휴가 문서 생성 입력
export interface CreateLeaveDocumentInput extends CreateDocumentInput {
  doc_type: 'leave'
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_count: number
  half_day_slot?: HalfDaySlot
  reason?: string
  attachment_url?: string
}

// 야근 문서 생성 입력
export interface CreateOvertimeDocumentInput extends CreateDocumentInput {
  doc_type: 'overtime'
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee?: number
}

// 지출 문서 생성 입력
export interface CreateExpenseDocumentInput extends CreateDocumentInput {
  doc_type: 'expense'
  expense_date: string
  category: string
  amount: number
  merchant_name?: string
  usage_purpose?: string
  receipt_url?: string
  expense_items?: Array<{ item: string; amount: number }>
}

// 경조사 문서 생성 입력
export interface CreateWelfareDocumentInput extends CreateDocumentInput {
  doc_type: 'welfare'
  event_type: string
  event_date: string
  target_name?: string
  relationship?: string
  amount: number
  attachment_url?: string
}

// 일반 문서 생성 입력
export interface CreateGeneralDocumentInput extends CreateDocumentInput {
  doc_type: 'general'
  content_body: string
  attachment_urls?: string[]
  template_type?: string
  form_data?: Record<string, unknown>
}

// Union 타입
export type CreateDocumentDetailInput =
  | CreateLeaveDocumentInput
  | CreateOvertimeDocumentInput
  | CreateExpenseDocumentInput
  | CreateWelfareDocumentInput
  | CreateGeneralDocumentInput

// 문서 목록 조회 필터
export interface DocumentListFilter {
  doc_type?: DocumentType
  status?: DocumentStatus
  requester_id?: string
  department_id?: number
  date_from?: string
  date_to?: string
  search?: string
}

// API 응답 타입
export interface DocumentApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface DocumentListResponse {
  success: boolean
  data: DocumentMasterWithRequester[]
  total: number
  page: number
  per_page: number
}

// ================================================================
// 유틸리티 타입
// ================================================================

// 문서 유형별 한글 레이블
export const DocumentTypeLabels: Record<DocumentType, string> = {
  leave: '휴가',
  overtime: '야근수당',
  expense: '지출결의',
  welfare: '경조사비',
  general: '일반문서',
}

// 휴가 유형별 한글 레이블
export const LeaveTypeLabels: Record<LeaveType, string> = {
  annual: '연차',
  half_day: '반차',
  quarter_day: '반반차',
  award: '포상휴가',
}

// 문서 상태별 한글 레이블
export const DocumentStatusLabels: Record<DocumentStatus, string> = {
  draft: '임시저장',
  pending: '결재대기',
  approved: '승인',
  rejected: '반려',
  retrieved: '회수',
}

// 공개 범위별 한글 레이블
export const VisibilityLabels: Record<VisibilityScope, string> = {
  private: '비공개',
  team: '팀',
  department: '부서',
  division: '본부',
  public: '전사',
}
