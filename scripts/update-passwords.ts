/**
 * Update Test Account Passwords
 *
 * 모든 테스트 계정의 비밀번호를 'password'로 업데이트합니다.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다')
  process.exit(1)
}

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

async function updatePasswords() {
  console.log('🔑 테스트 계정 비밀번호 업데이트 시작...\n')

  // Get all users
  const { data: usersData } = await supabase.auth.admin.listUsers()

  if (!usersData?.users) {
    console.error('❌ 사용자 목록을 가져올 수 없습니다')
    process.exit(1)
  }

  for (const email of testEmails) {
    const user = usersData.users.find(u => u.email === email)

    if (!user) {
      console.log(`⚠️  ${email} - 사용자 없음`)
      continue
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: 'password' }
      )

      if (error) {
        console.error(`❌ ${email} - 실패:`, error.message)
      } else {
        console.log(`✅ ${email} - 비밀번호 업데이트 완료`)
      }
    } catch (error) {
      console.error(`❌ ${email} - 오류:`, error)
    }
  }

  console.log('\n✨ 비밀번호 업데이트 완료!')
  console.log('모든 계정의 비밀번호: password')
}

updatePasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error)
    process.exit(1)
  })
