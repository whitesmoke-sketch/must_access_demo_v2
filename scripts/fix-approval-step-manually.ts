/**
 * 수동으로 approval_step 활성화 스크립트
 * RLS 수정 전에 승인된 문서의 다음 단계를 활성화
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://edmlatsgqoublcbhevoq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbWxhdHNncW91YmxjYmhldm9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MTk1NiwiZXhwIjoyMDc5NjM3OTU2fQ.7CaJ7iwBm_1n6Zf23Q0oO8hyjWsS5HA-XaGe5XrqIZM'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const documentId = 146 // RLS 수정 후 재테스트 문서 ID

  console.log(`문서 ID ${documentId}의 다음 단계 활성화 중...\n`)

  // Step 2를 pending으로 변경
  const { error: step2Error } = await supabase
    .from('approval_step')
    .update({ status: 'pending' })
    .eq('request_type', 'leave')
    .eq('request_id', documentId)
    .eq('step_order', 2)

  if (step2Error) {
    console.error('❌ Step 2 업데이트 실패:', step2Error)
    return
  }

  console.log('✅ Step 2 status: waiting → pending')

  // document.current_step을 2로 변경
  const { error: docError } = await supabase
    .from('document_master')
    .update({ current_step: 2 })
    .eq('id', documentId)

  if (docError) {
    console.error('❌ document.current_step 업데이트 실패:', docError)
    return
  }

  console.log('✅ document.current_step: 1 → 2')

  // 결과 확인
  const { data: updatedSteps } = await supabase
    .from('approval_step')
    .select('step_order, status')
    .eq('request_type', 'leave')
    .eq('request_id', documentId)
    .order('step_order')

  console.log('\n=== 업데이트 결과 ===')
  updatedSteps?.forEach(step => {
    const emoji = step.status === 'approved' ? '✅' : step.status === 'pending' ? '🔵' : '⏸️'
    console.log(`${emoji} ${step.step_order}단계: ${step.status}`)
  })

  const { data: doc } = await supabase
    .from('document_master')
    .select('current_step')
    .eq('id', documentId)
    .single()

  console.log(`\ndocument.current_step: ${doc?.current_step}`)
  console.log('\n✅ 완료! 이제 최부장이 결재할 수 있습니다.')
}

main().catch(console.error)
