import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyDocumentsClient } from '@/components/documents/MyDocumentsClient'

export default async function MyDocumentsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 내가 작성한 모든 문서 조회 (doc_data JSONB)
  const { data: myDocumentsRaw, error: docError } = await supabase
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
      retrieved_at,
      doc_data
    `)
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })

  if (docError) {
    console.error('Failed to fetch documents:', docError)
  }

  // document_master 데이터를 기존 인터페이스에 맞게 변환
  const myDocuments = (myDocumentsRaw || []).map(doc => {
    const docData = doc.doc_data || {}

    // 기본 문서 정보
    const baseDoc = {
      id: doc.id,
      employee_id: doc.requester_id,
      status: doc.status,
      requested_at: doc.created_at,
      approved_at: doc.approved_at,
      rejected_at: null, // document_master에 rejected_at 컬럼 없음
      retrieved_at: doc.retrieved_at,
      current_step: doc.current_step,
      doc_type: doc.doc_type,
      title: doc.title,
    }

    // 문서 유형별 추가 필드
    if (doc.doc_type === 'leave') {
      return {
        ...baseDoc,
        leave_type: docData.leave_type || 'annual',
        requested_days: docData.days_count || 0,
        start_date: docData.start_date || '',
        end_date: docData.end_date || '',
        reason: docData.reason || '',
      }
    } else if (doc.doc_type === 'overtime') {
      return {
        ...baseDoc,
        leave_type: 'overtime',
        work_date: docData.work_date || '',
        start_time: docData.start_time || '',
        end_time: docData.end_time || '',
        total_hours: docData.total_hours || 0,
        work_content: docData.work_content || '',
        // 호환성을 위한 필드
        start_date: docData.work_date || '',
        end_date: docData.work_date || '',
        requested_days: docData.total_hours || 0,
        reason: docData.work_content || '',
      }
    } else {
      // 기타 문서 유형
      return {
        ...baseDoc,
        leave_type: doc.doc_type,
        start_date: '',
        end_date: '',
        requested_days: 0,
        reason: '',
      }
    }
  })

  // 각 문서의 결재 히스토리 조회 - Admin Client 사용 (RLS 우회)
  const requestIds = myDocuments.map(req => req.id)

  const adminSupabase = createAdminClient()
  const { data: approvalSteps, error: approvalError } = await adminSupabase
    .from('approval_step')
    .select(`
      request_id,
      step_order,
      status,
      approval_type,
      approved_at,
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
    .in('request_id', requestIds.length > 0 ? requestIds : [0])
    .order('step_order', { ascending: true })

  // 문서별로 결재 히스토리를 매핑
  const approvalHistoryMap = new Map<number, any[]>()
  approvalSteps?.forEach(step => {
    const existing = approvalHistoryMap.get(step.request_id) || []
    approvalHistoryMap.set(step.request_id, [...existing, step])
  })

  return (
    <div className="space-y-6">
      <MyDocumentsClient
        documents={myDocuments}
        userId={user.id}
        approvalHistoryMap={Object.fromEntries(approvalHistoryMap)}
      />
    </div>
  )
}
