// ================================================================
// 통합 문서 시스템 타입 정의
// 새로운 Master-Detail 구조에 맞는 타입
// ================================================================

// ================================================================
// ENUM 타입
// ================================================================

export type VisibilityScope = 'private' | 'team' | 'department' | 'division' | 'public'

export type DocumentType = 'leave' | 'overtime' | 'expense' | 'welfare' | 'general' | 'budget' | 'expense_proposal' | 'resignation' | 'overtime_report' | 'work_type_change'

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'retrieved'

export type LeaveType = 'annual' | 'half_day' | 'half_day_am' | 'half_day_pm' | 'quarter_day' | 'award' | 'sick' | 'special'

export type HalfDaySlot = 'morning' | 'afternoon'

export type PaymentMethod = 'corporate_card' | 'personal_card' | 'tax_invoice'

export type ResignationType = 'personal' | 'contract_end' | 'recommended' | 'other'

export type WorkType =
  | 'unpaid_sick_leave'       // 무급병가 (연 60일)
  | 'public_duty'             // 공가 휴가 (예비군/민방위 등)
  | 'leave_of_absence'        // 휴직 (무급)
  | 'parental_leave'          // 육아 휴직
  | 'family_event_leave'      // 경조사 휴가
  | 'maternity_leave'         // 출산전후 휴가 (90일)
  | 'paternity_leave'         // 배우자출산휴가 (20일)
  | 'pregnancy_reduced_hours' // 임신 중 단축근무
  | 'work_schedule_change'    // 근무 변경 (재택 등)
  | 'business_trip'           // 출장/외근
  | 'menstrual_leave'         // 여성 보건 휴가

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
  doc_data: DocDataUnion | null  // JSONB로 저장된 문서 상세 데이터
  current_step: number
  drive_file_id: string | null
  drive_file_url: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  retrieved_at: string | null
}

// ================================================================
// doc_data JSONB 타입 정의 (document_id, created_at 제외)
// ================================================================

// 휴가 데이터
export interface DocLeaveData {
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_count: number
  half_day_slot: HalfDaySlot | null
  reason: string | null
  attachment_url: string | null
  deducted_from_grants: Array<{ grant_id: number; days: number }>
}

// 야근수당 데이터
export interface DocOvertimeData {
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee: number
}

// 지출결의서 데이터
export interface DocExpenseData {
  expense_date: string
  category: string
  amount: number
  merchant_name: string | null
  usage_purpose: string | null
  receipt_url: string | null
  expense_items: Array<{ item: string; amount: number }>
  payment_method: PaymentMethod | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

// 경조사비 데이터
export interface DocWelfareData {
  event_type: string
  event_date: string
  target_name: string | null
  relationship: string | null
  amount: number
  attachment_url: string | null
  approved_amount: number | null
}

// 일반문서 데이터
export interface DocGeneralData {
  content_body: string
  attachment_urls: string[]
  template_type: string | null
  form_data: Record<string, unknown>
}

// 예산신청서 데이터
export interface DocBudgetData {
  budget_department_id: number
  period_start: string
  period_end: string
  calculation_basis: string
  total_amount: number
  approved_amount: number | null
}

// 지출품의서 데이터
export interface DocExpenseProposalData {
  expense_date: string
  items: Array<{ item: string; quantity: number; unit_price: number }>
  total_amount: number
  vendor_name: string
  attachment_url: string | null
}

// 사직서 데이터
export interface DocResignationData {
  employment_date: string
  resignation_date: string
  resignation_type: ResignationType
  handover_confirmed: boolean
  confidentiality_agreed: boolean
  voluntary_confirmed: boolean
  last_working_date: string | null
  hr_processed_at: string | null
  hr_processor_id: string | null
  hr_notes: string | null
}

// 연장근로보고 데이터
export interface DocOvertimeReportData {
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee: number
  meal_fee: number
}

// 근로형태변경 데이터
export interface DocWorkTypeChangeData {
  work_type: WorkType
  start_date: string
  end_date: string
}

// doc_data Union 타입
export type DocDataUnion =
  | DocLeaveData
  | DocOvertimeData
  | DocExpenseData
  | DocWelfareData
  | DocGeneralData
  | DocBudgetData
  | DocExpenseProposalData
  | DocResignationData
  | DocOvertimeReportData
  | DocWorkTypeChangeData

// ================================================================
// 타입 가드 함수
// ================================================================

export function isLeaveData(data: DocDataUnion | null, docType: DocumentType): data is DocLeaveData {
  return docType === 'leave' && data !== null && 'leave_type' in data
}

export function isOvertimeData(data: DocDataUnion | null, docType: DocumentType): data is DocOvertimeData {
  return docType === 'overtime' && data !== null && 'work_date' in data && 'work_content' in data && !('meal_fee' in data)
}

export function isExpenseData(data: DocDataUnion | null, docType: DocumentType): data is DocExpenseData {
  return docType === 'expense' && data !== null && 'category' in data
}

export function isWelfareData(data: DocDataUnion | null, docType: DocumentType): data is DocWelfareData {
  return docType === 'welfare' && data !== null && 'event_type' in data
}

export function isGeneralData(data: DocDataUnion | null, docType: DocumentType): data is DocGeneralData {
  return docType === 'general' && data !== null && 'content_body' in data
}

export function isBudgetData(data: DocDataUnion | null, docType: DocumentType): data is DocBudgetData {
  return docType === 'budget' && data !== null && 'budget_department_id' in data
}

export function isExpenseProposalData(data: DocDataUnion | null, docType: DocumentType): data is DocExpenseProposalData {
  return docType === 'expense_proposal' && data !== null && 'expense_date' in data && 'items' in data
}

export function isResignationData(data: DocDataUnion | null, docType: DocumentType): data is DocResignationData {
  return docType === 'resignation' && data !== null && 'resignation_type' in data
}

export function isOvertimeReportData(data: DocDataUnion | null, docType: DocumentType): data is DocOvertimeReportData {
  return docType === 'overtime_report' && data !== null && 'meal_fee' in data
}

export function isWorkTypeChangeData(data: DocDataUnion | null, docType: DocumentType): data is DocWorkTypeChangeData {
  return docType === 'work_type_change' && data !== null && 'work_type' in data
}

// doc_data에서 타입에 맞는 데이터 추출 유틸리티
export function getDocData<T extends DocDataUnion>(
  doc: DocumentMaster,
  docType: DocumentType
): T | null {
  if (!doc.doc_data || doc.doc_type !== docType) return null
  return doc.doc_data as T
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
  payment_method: PaymentMethod | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
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

// 예산 신청서 상세
export interface DocBudget {
  document_id: number
  budget_department_id: number
  period_start: string
  period_end: string
  calculation_basis: string
  total_amount: number
  approved_amount: number | null
  created_at: string
}

// 지출 품의서 상세
export interface DocExpenseProposal {
  document_id: number
  expense_date: string
  items: Array<{
    item: string
    quantity: number
    unit_price: number
  }>
  total_amount: number
  vendor_name: string
  created_at: string
}

// 사직서 상세
export interface DocResignation {
  document_id: number
  employment_date: string
  resignation_date: string
  resignation_type: ResignationType
  handover_confirmed: boolean
  confidentiality_agreed: boolean
  voluntary_confirmed: boolean
  last_working_date: string | null
  hr_processed_at: string | null
  hr_processor_id: string | null
  hr_notes: string | null
  created_at: string
}

// 연장 근로 보고 상세
export interface DocOvertimeReport {
  document_id: number
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee: number
  meal_fee: number
  created_at: string
}

// 근로형태 변경 신청 상세
export interface DocWorkTypeChange {
  document_id: number
  work_type: WorkType
  start_date: string
  end_date: string
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

export interface DocumentWithBudget extends DocumentMasterWithRequester {
  doc_budget: DocBudget
}

export interface DocumentWithExpenseProposal extends DocumentMasterWithRequester {
  doc_expense_proposal: DocExpenseProposal
}

export interface DocumentWithResignation extends DocumentMasterWithRequester {
  doc_resignation: DocResignation
}

export interface DocumentWithOvertimeReport extends DocumentMasterWithRequester {
  doc_overtime_report: DocOvertimeReport
}

export interface DocumentWithWorkTypeChange extends DocumentMasterWithRequester {
  doc_work_type_change: DocWorkTypeChange
}

// Union 타입
export type DocumentWithDetail =
  | DocumentWithLeave
  | DocumentWithOvertime
  | DocumentWithExpense
  | DocumentWithWelfare
  | DocumentWithGeneral
  | DocumentWithBudget
  | DocumentWithExpenseProposal
  | DocumentWithResignation
  | DocumentWithOvertimeReport
  | DocumentWithWorkTypeChange

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

// 예산 신청서 생성 입력
export interface CreateBudgetDocumentInput extends CreateDocumentInput {
  doc_type: 'budget'
  budget_department_id: number
  period_start: string
  period_end: string
  calculation_basis: string
  total_amount: number
}

// 지출 품의서 생성 입력
export interface CreateExpenseProposalDocumentInput extends CreateDocumentInput {
  doc_type: 'expense_proposal'
  expense_date: string
  items: Array<{ item: string; quantity: number; unit_price: number }>
  total_amount: number
  vendor_name: string
}

// 사직서 생성 입력
export interface CreateResignationDocumentInput extends CreateDocumentInput {
  doc_type: 'resignation'
  employment_date: string
  resignation_date: string
  resignation_type: ResignationType
  handover_confirmed: boolean
  confidentiality_agreed: boolean
  voluntary_confirmed: boolean
}

// 연장 근로 보고 생성 입력
export interface CreateOvertimeReportDocumentInput extends CreateDocumentInput {
  doc_type: 'overtime_report'
  work_date: string
  start_time: string
  end_time: string
  total_hours: number
  work_content: string
  transportation_fee?: number
  meal_fee?: number
}

// 근로형태 변경 신청 생성 입력
export interface CreateWorkTypeChangeDocumentInput extends CreateDocumentInput {
  doc_type: 'work_type_change'
  work_type: WorkType
  start_date: string
  end_date: string
}

// Union 타입
export type CreateDocumentDetailInput =
  | CreateLeaveDocumentInput
  | CreateOvertimeDocumentInput
  | CreateExpenseDocumentInput
  | CreateWelfareDocumentInput
  | CreateGeneralDocumentInput
  | CreateBudgetDocumentInput
  | CreateExpenseProposalDocumentInput
  | CreateResignationDocumentInput
  | CreateOvertimeReportDocumentInput
  | CreateWorkTypeChangeDocumentInput

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
  budget: '예산 신청',
  expense_proposal: '지출 품의',
  resignation: '사직서',
  overtime_report: '연장 근로 보고',
  work_type_change: '근로형태 변경',
}

// 근로형태 변경 유형별 한글 레이블
export const WorkTypeLabels: Record<WorkType, string> = {
  unpaid_sick_leave: '무급병가',
  public_duty: '공가 휴가',
  leave_of_absence: '휴직',
  parental_leave: '육아 휴직',
  family_event_leave: '경조사 휴가',
  maternity_leave: '출산전후 휴가',
  paternity_leave: '배우자출산휴가',
  pregnancy_reduced_hours: '임신 중 단축근무',
  work_schedule_change: '근무 변경',
  business_trip: '출장/외근',
  menstrual_leave: '여성 보건 휴가',
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

// 결제수단별 한글 레이블
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  corporate_card: '법인카드',
  personal_card: '개인카드',
  tax_invoice: '세금계산서(이체)',
}
