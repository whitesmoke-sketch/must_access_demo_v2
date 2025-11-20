/**
 * Create Auth Users for Existing Employees
 *
 * 기존 employee 레코드에 대응하는 auth.users 레코드를 생성합니다.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

interface EmployeeAccount {
  id: string
  name: string
  email: string
}

async function createAuthUsers() {
  console.log('🔐 Auth 사용자 생성 시작...\n')

  // Get all test employees
  const { data: employees, error: employeeError } = await supabase
    .from('employee')
    .select('id, name, email')
    .in('email', [
      'staff@test.com',
      'teamlead@test.com',
      'depthead@test.com',
      'bizhead@test.com',
      'hr@test.com'
    ])

  if (employeeError || !employees) {
    console.error('❌ Employee 조회 실패:', employeeError)
    process.exit(1)
  }

  console.log(`📋 ${employees.length}개 계정 발견\n`)

  for (const employee of employees) {
    try {
      console.log(`🔑 ${employee.name} (${employee.email}) 생성 중...`)

      const { error } = await supabase.auth.admin.createUser({
        id: employee.id, // Use existing employee ID
        email: employee.email,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          name: employee.name
        }
      })

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  이미 존재하는 계정`)
        } else {
          console.error(`   ❌ 실패:`, error.message)
        }
      } else {
        console.log(`   ✅ 생성 완료`)
      }
    } catch (error) {
      console.error(`   ❌ 오류:`, error)
    }
  }

  console.log('\n✨ Auth 사용자 생성 완료!')
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
