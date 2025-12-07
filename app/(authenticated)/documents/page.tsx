import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalDocumentsClient } from '@/components/documents/ApprovalDocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 모든 쿼리를 병렬로 실행 (성능 최적화)
  const [
    employeeRoleResult,
    allDocumentsResult,
    myCurrentApprovalStepsResult,
    myApprovalStepsResult,
    allApprovalStepsResult,
    myCCRequestsResult,
    allCCListResult
  ] = await Promise.all([
    // 사용자 역할 확인
    supabase
      .from('employee')
      .select('role:role_id(code, approval_level)')
      .eq('id', user.id)
      .maybeSingle(),
    // 모든 결재 문서 조회 (새 시스템: document_master + doc_leave/doc_overtime)
    supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        department_id,
        doc_type,
        title,
        status,
        visibility,
        is_confidential,
        current_step,
        created_at,
        approved_at,
        retrieved_at,
        requester:requester_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        ),
        doc_leave (
          leave_type,
          start_date,
          end_date,
          days_count,
          half_day_slot,
          reason
        ),
        doc_overtime (
          work_date,
          start_time,
          end_time,
          total_hours,
          work_content
        )
      `)
      .order('created_at', { ascending: false }),
    // 내가 승인자로 지정된 문서 중, pending 상태인 것 조회
    // 주의: approval_step.request_id → document_master.id 외래키가 없으므로 조인 불가
    supabase
      .from('approval_step')
      .select('request_id, step_order, status')
      .eq('approver_id', user.id)
      .eq('status', 'pending'),
    // 내가 관여한 모든 문서의 approval_step 상태 조회
    supabase
      .from('approval_step')
      .select('request_id, status')
      .eq('approver_id', user.id),
    // 모든 문서의 approval_step 조회 (결재선 정보 - 부서/직급 포함)
    adminSupabase
      .from('approval_step')
      .select(`
        request_id,
        step_order,
        status,
        approval_type,
        approved_at,
        comment,
        approver:approver_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        )
      `)
      .order('step_order', { ascending: true }),
    // 내가 참조로 지정된 결재 요청 조회
    supabase
      .from('approval_cc')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false }),
    // 모든 문서의 참조자 목록 조회 (상세 모달용)
    adminSupabase
      .from('approval_cc')
      .select(`
        id,
        request_id,
        employee_id,
        read_at,
        created_at,
        employee:employee_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        )
      `)
      .order('created_at', { ascending: true })
  ])

  const employeeRole = employeeRoleResult.data
  const role = employeeRole?.role as { code: string; approval_level: number } | { code: string; approval_level: number }[] | null
  const approvalLevel = role
    ? Array.isArray(role)
      ? role[0]?.approval_level ?? 0
      : role?.approval_level ?? 0
    : 0

  const allDocumentsRaw = allDocumentsResult.data || []
  const myCurrentApprovalSteps = myCurrentApprovalStepsResult.data

  // document_master 데이터를 기존 인터페이스에 맞게 변환
  const allDocuments = allDocumentsRaw.map(doc => {
    const docLeave = Array.isArray(doc.doc_leave) ? doc.doc_leave[0] : doc.doc_leave
    const docOvertime = Array.isArray(doc.doc_overtime) ? doc.doc_overtime[0] : doc.doc_overtime

    // 기본 문서 정보
    const baseDoc = {
      id: doc.id,
      employee_id: doc.requester_id,
      status: doc.status,
      requested_at: doc.created_at,
      approved_at: doc.approved_at,
      rejected_at: null, // document_master에 rejected_at 컬럼 없음 - approval_step에서 조회
      retrieved_at: doc.retrieved_at,
      current_step: doc.current_step,
      employee: doc.requester,
      // 새 시스템 필드
      doc_type: doc.doc_type,
      title: doc.title,
    }

    // 문서 유형별 추가 필드
    if (doc.doc_type === 'leave') {
      return {
        ...baseDoc,
        leave_type: docLeave?.leave_type || 'annual',
        requested_days: docLeave?.days_count || 0,
        start_date: docLeave?.start_date || '',
        end_date: docLeave?.end_date || '',
        reason: docLeave?.reason || null,
      }
    } else if (doc.doc_type === 'overtime') {
      return {
        ...baseDoc,
        leave_type: 'overtime', // 문서 유형 식별용
        work_date: docOvertime?.work_date || '',
        start_time: docOvertime?.start_time || '',
        end_time: docOvertime?.end_time || '',
        total_hours: docOvertime?.total_hours || 0,
        work_content: docOvertime?.work_content || '',
        // 호환성을 위한 필드
        start_date: docOvertime?.work_date || '',
        end_date: docOvertime?.work_date || '',
        requested_days: docOvertime?.total_hours || 0,
        reason: docOvertime?.work_content || null,
      }
    } else {
      // 기타 문서 유형
      return {
        ...baseDoc,
        leave_type: doc.doc_type,
        start_date: '',
        end_date: '',
        requested_days: 0,
        reason: null,
      }
    }
  })

  // document_id -> current_step 매핑 생성
  const documentCurrentStepMap = new Map(
    allDocumentsRaw.map(doc => [doc.id, doc.current_step])
  )

  // 내 step_order가 현재 current_step과 일치하는 문서만 필터링
  // approval_step에서 status='pending'이면 이미 현재 차례이므로, step_order와 current_step 일치 확인
  const myApprovalRequestIds = new Set(
    myCurrentApprovalSteps
      ?.filter(step => {
        const currentStep = documentCurrentStepMap.get(step.request_id)
        return step.step_order === currentStep
      })
      .map(step => step.request_id) ?? []
  )

  // 문서별로 내 승인 상태를 매핑 (request_id -> status)
  const myApprovalStatusMap = new Map(
    myApprovalStepsResult.data?.map(step => [step.request_id, step.status]) ?? []
  )

  const allApprovalSteps = allApprovalStepsResult.data

  // 문서별로 결재선 정보를 매핑 (request_id -> approval_steps[])
  const approvalStepsMap = new Map<number, any[]>()
  allApprovalSteps?.forEach(step => {
    const existing = approvalStepsMap.get(step.request_id) || []
    approvalStepsMap.set(step.request_id, [...existing, step])
  })

  // 문서별로 참조자 목록을 매핑 (request_id -> cc_list[])
  const allCCList = allCCListResult.data || []
  const ccListMap = new Map<number, any[]>()
  allCCList.forEach(cc => {
    const existing = ccListMap.get(cc.request_id) || []
    ccListMap.set(cc.request_id, [...existing, cc])
  })

  // 참조 문서 데이터 준비
  const myCCRequests = myCCRequestsResult.data || []
  const ccRequestIds = myCCRequests.map(cc => cc.request_id)

  // 참조 문서의 상세 정보 조회 (document_master + 문서유형별 테이블 조인)
  let referenceDocuments: any[] = []
  if (ccRequestIds.length > 0) {
    const { data: refDocs } = await supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        doc_type,
        title,
        status,
        current_step,
        created_at,
        approved_at,
        requester:requester_id (
          id,
          name,
          department:department_id (
            name
          ),
          role:role_id (
            name
          )
        ),
        doc_leave (
          leave_type,
          start_date,
          end_date,
          days_count,
          reason
        ),
        doc_overtime (
          work_date,
          start_time,
          end_time,
          total_hours,
          work_content
        )
      `)
      .in('id', ccRequestIds)
      .order('created_at', { ascending: false })

    // 참조 문서에 열람 상태 추가 및 형식 변환
    referenceDocuments = (refDocs || []).map(doc => {
      const ccRecord = myCCRequests.find(cc => cc.request_id === doc.id)
      const docLeave = Array.isArray(doc.doc_leave) ? doc.doc_leave[0] : doc.doc_leave
      const docOvertime = Array.isArray(doc.doc_overtime) ? doc.doc_overtime[0] : doc.doc_overtime

      const baseRefDoc = {
        id: doc.id,
        employee_id: doc.requester_id,
        status: doc.status,
        requested_at: doc.created_at,
        approved_at: doc.approved_at,
        current_step: doc.current_step,
        employee: doc.requester,
        doc_type: doc.doc_type,
        title: doc.title,
        cc_id: ccRecord?.id,
        read_at: ccRecord?.read_at,
        readStatus: ccRecord?.read_at ? 'read' : 'unread'
      }

      if (doc.doc_type === 'leave') {
        return {
          ...baseRefDoc,
          leave_type: docLeave?.leave_type || 'annual',
          requested_days: docLeave?.days_count || 0,
          start_date: docLeave?.start_date || '',
          end_date: docLeave?.end_date || '',
          reason: docLeave?.reason || null,
        }
      } else if (doc.doc_type === 'overtime') {
        return {
          ...baseRefDoc,
          leave_type: 'overtime',
          work_date: docOvertime?.work_date || '',
          start_time: docOvertime?.start_time || '',
          end_time: docOvertime?.end_time || '',
          total_hours: docOvertime?.total_hours || 0,
          work_content: docOvertime?.work_content || '',
          start_date: docOvertime?.work_date || '',
          end_date: docOvertime?.work_date || '',
          requested_days: docOvertime?.total_hours || 0,
          reason: docOvertime?.work_content || null,
        }
      } else {
        return {
          ...baseRefDoc,
          leave_type: doc.doc_type,
          start_date: '',
          end_date: '',
          requested_days: 0,
          reason: null,
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <ApprovalDocumentsClient
        documents={allDocuments as any[] || []}
        userId={user.id}
        approvalLevel={approvalLevel}
        myApprovalRequestIds={Array.from(myApprovalRequestIds)}
        myApprovalStatusMap={Object.fromEntries(myApprovalStatusMap)}
        approvalStepsMap={Object.fromEntries(approvalStepsMap)}
        referenceDocuments={referenceDocuments as any[]}
        ccListMap={Object.fromEntries(ccListMap)}
      />
    </div>
  )
}
