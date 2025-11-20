/**
 * Create Auth Users (Simple Version)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Use LOCAL Supabase values (hardcoded to avoid env variable issues)
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

console.log('🔗 Supabase URL:', supabaseUrl)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 필요합니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const accounts = [
  { id: 'dd46bab0-8233-4383-be79-b9fa16ef86d2', name: '정본부장', email: 'bizhead@test.com' },
  { id: '6a94a145-37de-4f7a-99c2-8a429595ee28', name: '최부장', email: 'depthead@test.com' },
  { id: '4d791b20-8689-4970-92ad-0e60dc338620', name: '이인사', email: 'hr@test.com' },
  { id: '4d296e6b-f896-4f3b-bb9a-c39d790209ef', name: '김사원', email: 'staff@test.com' },
  { id: '38439c59-4922-4ceb-8622-43c59a6e839b', name: '박팀장', email: 'teamlead@test.com' }
]

async function createAuthUsers() {
  console.log('🔐 Auth 사용자 생성 시작...\n')

  for (const account of accounts) {
    try {
      console.log(`🔑 ${account.name} (${account.email})`)

      const { data, error } = await supabase.auth.admin.createUser({
        id: account.id,
        email: account.email,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          name: account.name
        }
      })

      if (error) {
        if (error.message.includes('already exists') || error.message.includes('already registered')) {
          console.log(`   ⚠️  이미 존재함`)
        } else {
          console.error(`   ❌ 실패:`, error.message)
        }
      } else {
        console.log(`   ✅ 생성 완료`)
      }
    } catch (error: any) {
      console.error(`   ❌ 오류:`, error.message)
    }
  }

  console.log('\n✨ 완료!')
  console.log('─'.repeat(60))
  console.log('모든 계정 비밀번호: password')
  console.log('─'.repeat(60))
}

createAuthUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error)
    process.exit(1)
  })
