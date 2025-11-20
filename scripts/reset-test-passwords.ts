/**
 * Reset Test Account Passwords
 *
 * 테스트 계정 비밀번호를 test1234로 재설정합니다.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testEmails = [
  'staff@test.com',
  'teamlead@test.com',
  'depthead@test.com',
  'bizhead@test.com',
  'hr@test.com'
]

async function resetPasswords() {
  console.log('🔐 테스트 계정 비밀번호 재설정 시작...\n')

  // 모든 사용자 조회
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ 사용자 목록 조회 실패:', listError)
    process.exit(1)
  }

  for (const email of testEmails) {
    try {
      const user = users?.find(u => u.email === email)

      if (!user) {
        console.log(`⚠️  ${email} - 사용자를 찾을 수 없습니다`)
        continue
      }

      // 비밀번호 재설정
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: 'test1234' }
      )

      if (error) {
        console.log(`❌ ${email} - 비밀번호 재설정 실패:`, error.message)
      } else {
        console.log(`✅ ${email} - 비밀번호 재설정 완료 (test1234)`)
      }
    } catch (error) {
      console.error(`❌ ${email} - 오류:`, error)
    }
  }

  console.log('\n✨ 완료!\n')
}

resetPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 오류:', error)
    process.exit(1)
  })
