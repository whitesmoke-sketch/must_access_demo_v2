/**
 * Create Test Accounts Script
 *
 * 이 스크립트는 다양한 조직 레벨의 테스트 계정을 생성합니다.
 *
 * 사용법:
 *   npx tsx scripts/create-test-accounts.ts
 *
 * 생성되는 계정:
 * 1. staff@test.com (김사원 - 일반 사원, level 1, 개발1팀)
 * 2. teamlead@test.com (박팀장 - 팀리더, level 2, 개발1팀)
 * 3. depthead@test.com (최부장 - 부서장, level 3, 개발부)
 * 4. bizhead@test.com (정본부장 - 사업부장, level 4, 본사)
 * 5. hr@test.com (이인사 - HR, level 5, 인사팀)
 *
 * 모든 계정의 비밀번호: test1234
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다')
  console.error('   .env.local 파일에 설정되어 있는지 확인하세요')
  process.exit(1)
}

// Admin client (Service Role Key 사용)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TestAccount {
  email: string
  password: string
  name: string
  phone: string
  roleCode: string
  departmentCode: string
}

const testAccounts: TestAccount[] = [
  {
    email: 'staff@test.com',
    password: 'test1234',
    name: '김사원',
    phone: '010-1111-1111',
    roleCode: 'employee',
    departmentCode: 'DEV_TEAM1'
  },
  {
    email: 'teamlead@test.com',
    password: 'test1234',
    name: '박팀장',
    phone: '010-2222-2222',
    roleCode: 'team_leader',
    departmentCode: 'DEV_TEAM1'
  },
  {
    email: 'depthead@test.com',
    password: 'test1234',
    name: '최부장',
    phone: '010-3333-3333',
    roleCode: 'department_head',
    departmentCode: 'DEV_DEPT'
  },
  {
    email: 'bizhead@test.com',
    password: 'test1234',
    name: '정본부장',
    phone: '010-4444-4444',
    roleCode: 'business_head',
    departmentCode: 'HQ'
  },
  {
    email: 'hr@test.com',
    password: 'test1234',
    name: '이인사',
    phone: '010-5555-5555',
    roleCode: 'hr',
    departmentCode: 'HR'
  }
]

async function createTestAccounts() {
  console.log('🚀 테스트 계정 생성 시작...\n')

  for (const account of testAccounts) {
    try {
      // 1. Auth 계정 생성
      console.log(`📧 ${account.name} (${account.email}) 생성 중...`)

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          name: account.name
        }
      })

      if (authError) {
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
          console.log(`   ⚠️  이미 존재하는 계정입니다. employee 레코드 확인 중...`)

          // 기존 사용자 ID 조회
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers?.users.find(u => u.email === account.email)

          if (!existingUser) {
            console.log(`   ❌ 사용자를 찾을 수 없습니다`)
            continue
          }

          // employee 레코드 확인
          const { data: existingEmployee } = await supabase
            .from('employee')
            .select('id')
            .eq('id', existingUser.id)
            .single()

          if (existingEmployee) {
            console.log(`   ✅ 이미 완전히 설정된 계정입니다\n`)
            continue
          }

          // employee 레코드만 생성
          await createEmployeeRecord(existingUser.id, account)
          console.log(`   ✅ employee 레코드 생성 완료\n`)
          continue
        }

        throw authError
      }

      if (!authData.user) {
        throw new Error('사용자 생성 실패')
      }

      // 2. Employee 레코드 생성
      await createEmployeeRecord(authData.user.id, account)

      console.log(`   ✅ 생성 완료\n`)
    } catch (error) {
      console.error(`   ❌ 오류 발생:`, error)
      console.log()
    }
  }

  console.log('✨ 테스트 계정 생성 완료!\n')
  console.log('생성된 계정 목록:')
  console.log('─'.repeat(60))
  testAccounts.forEach(acc => {
    console.log(`${acc.name.padEnd(10)} | ${acc.email.padEnd(20)} | test1234`)
  })
  console.log('─'.repeat(60))
}

async function createEmployeeRecord(userId: string, account: TestAccount) {
  // role_id 조회
  const { data: role, error: roleError } = await supabase
    .from('role')
    .select('id')
    .eq('code', account.roleCode)
    .single()

  if (roleError || !role) {
    throw new Error(`Role not found: ${account.roleCode}`)
  }

  // department_id 조회
  const { data: department, error: deptError } = await supabase
    .from('department')
    .select('id')
    .eq('code', account.departmentCode)
    .single()

  if (deptError || !department) {
    throw new Error(`Department not found: ${account.departmentCode}`)
  }

  // employee 레코드 생성
  const { error: employeeError } = await supabase
    .from('employee')
    .insert({
      id: userId,
      department_id: department.id,
      role_id: role.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      employment_date: new Date().toISOString().split('T')[0],
      status: 'active'
    })

  if (employeeError) {
    throw employeeError
  }
}

// 실행
createTestAccounts()
  .then(() => {
    console.log('\n👋 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error)
    process.exit(1)
  })
