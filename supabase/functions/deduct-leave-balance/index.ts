import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  requestId: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()
    const { requestId }: RequestBody = body

    // Validate input
    if (!requestId) {
      console.error('Validation failed: requestId is required')
      return new Response(
        JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다: requestId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with Service Role Key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[연차 차감 Edge Function] 시작 - requestId:', requestId)

    // 1. Get document_master + doc_leave details (새 시스템)
    const { data: documentData, error: docError } = await supabase
      .from('document_master')
      .select(`
        id,
        requester_id,
        doc_leave (
          days_count
        )
      `)
      .eq('id', requestId)
      .single()

    if (docError || !documentData) {
      console.error('[연차 차감] 문서 정보 조회 실패:', docError)
      throw new Error(`문서 정보 조회 실패: ${docError?.message}`)
    }

    // doc_leave 데이터 추출 (배열일 수 있음)
    const docLeave = Array.isArray(documentData.doc_leave)
      ? documentData.doc_leave[0]
      : documentData.doc_leave

    if (!docLeave) {
      throw new Error('연차 상세 정보가 없습니다')
    }

    console.log('[연차 차감] 문서 정보:', { requester_id: documentData.requester_id, days_count: docLeave.days_count })

    // 2. Check for existing usage records (idempotency)
    const { data: existingUsage } = await supabase
      .from('annual_leave_usage')
      .select('id')
      .eq('leave_request_id', requestId)
      .limit(1)

    if (existingUsage && existingUsage.length > 0) {
      console.log('[연차 차감] 이미 차감된 요청:', requestId)
      return new Response(
        JSON.stringify({ success: true, message: 'Already deducted' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. Get available grants ordered by expiration date (FIFO)
    const today = new Date().toISOString().split('T')[0]
    const { data: grants, error: grantsError } = await supabase
      .from('annual_leave_grant')
      .select('id, granted_days, expiration_date')
      .eq('employee_id', documentData.requester_id)
      .eq('approval_status', 'approved')
      .gte('expiration_date', today)
      .order('expiration_date', { ascending: true })

    if (grantsError) {
      console.error('[연차 차감] 부여 내역 조회 실패:', grantsError)
      throw new Error(`연차 부여 내역 조회 실패: ${grantsError.message}`)
    }

    if (!grants || grants.length === 0) {
      throw new Error('사용 가능한 연차가 없습니다')
    }

    console.log('[연차 차감] 부여 내역 조회:', grants)

    // 4. Calculate already used days for each grant
    const grantIds = grants.map(g => g.id)
    const { data: existingUsages } = await supabase
      .from('annual_leave_usage')
      .select('grant_id, used_days')
      .in('grant_id', grantIds)

    const usageByGrant = new Map<number, number>()
    if (existingUsages) {
      for (const usage of existingUsages) {
        const current = usageByGrant.get(usage.grant_id) || 0
        usageByGrant.set(usage.grant_id, current + Number(usage.used_days))
      }
    }

    // 5. Deduct using FIFO (oldest expiration first)
    let remainingToDeduct = Number(docLeave.days_count)
    const usageRecords: Array<{ grant_id: number; used_days: number }> = []

    for (const grant of grants) {
      if (remainingToDeduct <= 0) break

      const alreadyUsed = usageByGrant.get(grant.id) || 0
      const available = Number(grant.granted_days) - alreadyUsed

      if (available <= 0) continue

      const deductAmount = Math.min(remainingToDeduct, available)
      usageRecords.push({
        grant_id: grant.id,
        used_days: deductAmount
      })

      remainingToDeduct -= deductAmount
      console.log(`[연차 차감] Grant ${grant.id}: ${deductAmount}일 차감 (잔여: ${remainingToDeduct}일)`)
    }

    // Check if we have enough balance
    if (remainingToDeduct > 0) {
      throw new Error(`연차 잔액이 부족합니다. (부족: ${remainingToDeduct}일)`)
    }

    // 6. Insert usage records
    const usageInserts = usageRecords.map(record => ({
      leave_request_id: requestId,
      grant_id: record.grant_id,
      used_days: record.used_days,
      used_date: new Date().toISOString()
    }))

    const { error: usageError } = await supabase
      .from('annual_leave_usage')
      .insert(usageInserts)

    if (usageError) {
      console.error('[연차 차감] 사용 기록 생성 실패:', usageError)
      throw new Error(`연차 사용 기록 생성 실패: ${usageError.message}`)
    }

    console.log('[연차 차감] 사용 기록 생성 완료:', usageInserts.length)

    // 7. Update balance using RPC function
    const { error: balanceError } = await supabase.rpc('update_leave_balance', {
      p_employee_id: documentData.requester_id
    })

    if (balanceError) {
      console.error('[연차 차감] 잔액 업데이트 실패:', balanceError)
      throw new Error(`연차 잔액 업데이트 실패: ${balanceError.message}`)
    }

    console.log('[연차 차감] 성공!')

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
