/**
 * Create Master Admin Account
 *
 * 시스템 마스터 관리자 계정을 생성합니다.
 * 이 계정은 모든 권한을 가지며, 시스템 관리에 사용됩니다.
 *
 * 사용법:
 *   npx tsx scripts/create-master-account.ts
 *
 * 생성되는 계정:
 *   Email: admin@must-access.com
 *   Password: Admin@2025!
 *   Role: Admin (level 0)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('   .env.local 파일을 확인하세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 마스터 계정 정보
const MASTER_ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000000', // 특별한 UUID
  email: 'admin@must-access.com',
  password: 'Admin@2025!',
  name: '시스템 관리자',
  phone: '02-0000-0000',
  employmentDate: '2025-01-01'
}

async function createMasterAccount() {
  console.log('🔐 Creating Master Admin Account...\n')

  try {
    // 1. Admin role 확인
    console.log('1️⃣ Checking admin role...')
    const { data: adminRole, error: roleError } = await supabase
      .from('role')
      .select('id')
      .eq('code', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.error('❌ Admin role not found!')
      console.error('   setup_data.sql이 실행되었는지 확인하세요.')
      process.exit(1)
    }
    console.log('   ✅ Admin role found (ID:', adminRole.id, ')')

    // 2. HQ department 확인
    console.log('\n2️⃣ Checking HQ department...')
    const { data: hqDept, error: deptError } = await supabase
      .from('department')
      .select('id')
      .eq('code', 'HQ')
      .single()

    if (deptError || !hqDept) {
      console.error('❌ HQ department not found!')
      console.error('   setup_data.sql이 실행되었는지 확인하세요.')
      process.exit(1)
    }
    console.log('   ✅ HQ department found (ID:', hqDept.id, ')')

    // 3. 기존 마스터 계정 확인
    console.log('\n3️⃣ Checking for existing master account...')
    const { data: existingEmployee } = await supabase
      .from('employee')
      .select('id, email')
      .eq('email', MASTER_ACCOUNT.email)
      .single()

    if (existingEmployee) {
      console.log('   ⚠️  Master account already exists')
      console.log('   ID:', existingEmployee.id)
      console.log('   Email:', existingEmployee.email)
      console.log('')
      console.log('   기존 계정을 삭제하고 새로 생성하시겠습니까? (y/N)')
      // For script automation, skip this in production
      console.log('   스크립트를 중단합니다.')
      process.exit(0)
    }

    // 4. Auth 사용자 생성
    console.log('\n4️⃣ Creating auth user...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      id: MASTER_ACCOUNT.id,
      email: MASTER_ACCOUNT.email,
      password: MASTER_ACCOUNT.password,
      email_confirm: true,
      user_metadata: {
        name: MASTER_ACCOUNT.name
      }
    })

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message)
      process.exit(1)
    }
    console.log('   ✅ Auth user created')
    console.log('   ID:', authUser.user.id)

    // 5. Employee 레코드 생성
    console.log('\n5️⃣ Creating employee record...')
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .insert({
        id: MASTER_ACCOUNT.id,
        department_id: hqDept.id,
        role_id: adminRole.id,
        name: MASTER_ACCOUNT.name,
        email: MASTER_ACCOUNT.email,
        phone: MASTER_ACCOUNT.phone,
        employment_date: MASTER_ACCOUNT.employmentDate,
        status: 'active'
      })
      .select()
      .single()

    if (employeeError) {
      console.error('❌ Failed to create employee record:', employeeError.message)

      // Rollback: auth 사용자 삭제
      console.log('   🔄 Rolling back auth user...')
      await supabase.auth.admin.deleteUser(MASTER_ACCOUNT.id)

      process.exit(1)
    }
    console.log('   ✅ Employee record created')
    console.log('   ID:', employee.id)

    // 6. 연차 잔여일 생성
    console.log('\n6️⃣ Creating annual leave balance...')
    const currentYear = new Date().getFullYear()
    const { error: leaveError } = await supabase
      .from('annual_leave_balance')
      .insert({
        employee_id: MASTER_ACCOUNT.id,
        total_days: 25, // 관리자는 25일
        used_days: 0,
        remaining_days: 25,
        year: currentYear
      })

    if (leaveError) {
      console.warn('   ⚠️  Failed to create leave balance:', leaveError.message)
      console.warn('   (계속 진행합니다)')
    } else {
      console.log('   ✅ Leave balance created (25 days)')
    }

    // 완료
    console.log('\n' + '='.repeat(60))
    console.log('✅ Master Admin Account Created Successfully!')
    console.log('='.repeat(60))
    console.log('')
    console.log('📧 Email:', MASTER_ACCOUNT.email)
    console.log('🔑 Password:', MASTER_ACCOUNT.password)
    console.log('👤 Name:', MASTER_ACCOUNT.name)
    console.log('🆔 ID:', MASTER_ACCOUNT.id)
    console.log('🏢 Department: 본사 (HQ)')
    console.log('👔 Role: 관리자 (Admin, Level 0)')
    console.log('')
    console.log('⚠️  IMPORTANT: 프로덕션 환경에서는 반드시 비밀번호를 변경하세요!')
    console.log('')

  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Execute
createMasterAccount()
