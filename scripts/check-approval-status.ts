/**
 * 결재 단계 상태 확인 스크립트
 * RLS 수정이 제대로 작동하는지 DB를 직접 확인
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://edmlatsgqoublcbhevoq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbWxhdHNncW91YmxjYmhldm9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MTk1NiwiZXhwIjoyMDc5NjM3OTU2fQ.7CaJ7iwBm_1n6Zf23Q0oO8hyjWsS5HA-XaGe5XrqIZM'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('=== 결재 단계 상태 확인 ===\n')

  // 최근 1시간 내 생성된 문서 조회
  const { data: recentDocs } = await supabase
    .from('document_master')
    .select('id, title, status, current_step, created_at')
    .eq('doc_type', 'leave')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (!recentDocs || recentDocs.length === 0) {
    console.log('최근 문서가 없습니다.')
    return
  }

  console.log(`최근 문서 ${recentDocs.length}건 발견:\n`)

  for (const doc of recentDocs) {
    console.log(`📄 문서 ID: ${doc.id}`)
    console.log(`   제목: ${doc.title}`)
    console.log(`   상태: ${doc.status}`)
    console.log(`   현재 단계: ${doc.current_step}`)
    console.log(`   작성 시간: ${doc.created_at}`)

    // 해당 문서의 approval_step 조회
    const { data: steps } = await supabase
      .from('approval_step')
      .select('step_order, status, approver_id, approved_at')
      .eq('request_type', 'leave')
      .eq('request_id', doc.id)
      .order('step_order')

    if (steps && steps.length > 0) {
      console.log(`\n   결재 단계 (${steps.length}단계):`)
      for (const step of steps) {
        // approver 이름 조회
        const { data: approver } = await supabase
          .from('employee')
          .select('name')
          .eq('id', step.approver_id)
          .single()

        const statusEmoji =
          step.status === 'approved' ? '✅' :
          step.status === 'pending' ? '🔵' :
          step.status === 'waiting' ? '⏸️' : '❓'

        console.log(`   ${statusEmoji} ${step.step_order}단계: ${approver?.name || step.approver_id} - ${step.status}${step.approved_at ? ` (${step.approved_at})` : ''}`)
      }
    }
    console.log('\n' + '='.repeat(60) + '\n')
  }

  // 분석
  console.log('=== 분석 ===')
  const latestDoc = recentDocs[0]
  const { data: latestSteps } = await supabase
    .from('approval_step')
    .select('step_order, status')
    .eq('request_type', 'leave')
    .eq('request_id', latestDoc.id)
    .order('step_order')

  const step1 = latestSteps?.find(s => s.step_order === 1)
  const step2 = latestSteps?.find(s => s.step_order === 2)

  console.log(`\n최신 문서 (ID: ${latestDoc.id}):`)
  console.log(`- document.current_step: ${latestDoc.current_step}`)
  console.log(`- Step 1 status: ${step1?.status}`)
  console.log(`- Step 2 status: ${step2?.status}`)
  console.log(`\nRLS 수정 검증:`)

  if (step1?.status === 'approved' && step2?.status === 'pending' && latestDoc.current_step === 2) {
    console.log('✅ RLS 수정 성공! 다음 단계가 정상적으로 활성화되었습니다.')
  } else if (step1?.status === 'approved' && step2?.status === 'waiting') {
    console.log('❌ RLS 수정 실패! Step 2가 여전히 waiting 상태입니다.')
    console.log('   → adminSupabase UPDATE가 실행되지 않았거나 배포되지 않았습니다.')
  } else if (step1?.status === 'approved' && step2?.status === 'pending' && latestDoc.current_step === 1) {
    console.log('⚠️  Step 2는 pending이지만 document.current_step이 업데이트되지 않았습니다.')
  } else {
    console.log(`⚠️  예상치 못한 상태: step1=${step1?.status}, step2=${step2?.status}, current_step=${latestDoc.current_step}`)
  }
}

main().catch(console.error)
