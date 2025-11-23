import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'ceo@test.com', name: '김대표', department_id: 1, role_id: 5 },
  { id: '00000000-0000-0000-0000-000000000002', email: 'hr@test.com', name: '박인사', department_id: 8, role_id: 6 },
  { id: '00000000-0000-0000-0000-000000000003', email: 'si.leader@test.com', name: '이SI', department_id: 1, role_id: 4 },
  { id: '00000000-0000-0000-0000-000000000004', email: 'ai.leader@test.com', name: '최AI', department_id: 2, role_id: 3 },
  { id: '00000000-0000-0000-0000-000000000005', email: 'a1.member1@test.com', name: '김A1', department_id: 3, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000006', email: 'a1.member2@test.com', name: '박A1', department_id: 3, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000007', email: 'a2.member1@test.com', name: '이A2', department_id: 4, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000008', email: 'a2.member2@test.com', name: '최A2', department_id: 4, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000009', email: 'a3.member1@test.com', name: '정A3', department_id: 5, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000010', email: 'a3.member2@test.com', name: '한A3', department_id: 5, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000011', email: 'support1@test.com', name: '김서포트', department_id: 6, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000012', email: 'support2@test.com', name: '박서포트', department_id: 6, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000013', email: 'dev.leader@test.com', name: '이개발', department_id: 9, role_id: 4 },
  { id: '00000000-0000-0000-0000-000000000014', email: 'backend.leader@test.com', name: '최백엔드', department_id: 10, role_id: 3 },
  { id: '00000000-0000-0000-0000-000000000015', email: 'api.dev1@test.com', name: '김API', department_id: 11, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000016', email: 'api.dev2@test.com', name: '박API', department_id: 11, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000017', email: 'db.dev1@test.com', name: '이DB', department_id: 12, role_id: 2 },
  { id: '00000000-0000-0000-0000-000000000018', email: 'db.dev2@test.com', name: '최DB', department_id: 12, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000019', email: 'frontend.leader@test.com', name: '정프론트', department_id: 13, role_id: 3 },
  { id: '00000000-0000-0000-0000-000000000020', email: 'frontend.dev1@test.com', name: '한프론트', department_id: 13, role_id: 1 },
  { id: '00000000-0000-0000-0000-000000000021', email: 'frontend.dev2@test.com', name: '오프론트', department_id: 13, role_id: 1 },
]

async function main() {
  console.log('🚀 Creating test users...\n')

  for (const user of testUsers) {
    try {
      // Delete existing user first
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError && !deleteError.message.includes('not found')) {
        console.log(`⚠️  Could not delete ${user.email}: ${deleteError.message}`)
      }

      // Create user with Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          name: user.name,
        },
      })

      if (authError) {
        console.error(`❌ Failed to create ${user.email}: ${authError.message}`)
        continue
      }

      console.log(`✅ Created auth user: ${user.email}`)

      // Create employee record
      const { error: employeeError } = await supabase
        .from('employee')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          department_id: user.department_id,
          role_id: user.role_id,
          employment_date: '2021-01-01',
          status: 'active',
        })

      if (employeeError) {
        console.error(`❌ Failed to create employee ${user.email}: ${employeeError.message}`)
        continue
      }

      console.log(`✅ Created employee: ${user.name}\n`)

    } catch (error: any) {
      console.error(`❌ Error processing ${user.email}: ${error.message}\n`)
    }
  }

  // Create leave balances
  console.log('📊 Creating leave balances...')
  const { error: balanceError } = await supabase.rpc('create_leave_balances')

  if (balanceError) {
    // Manual insert if function doesn't exist
    const { data: employees } = await supabase
      .from('employee')
      .select('id')
      .eq('status', 'active')

    if (employees) {
      for (const emp of employees) {
        await supabase
          .from('annual_leave_balance')
          .upsert({
            employee_id: emp.id,
            total_days: 15.0,
            used_days: 0.0,
            remaining_days: 15.0,
          })
      }
    }
  }

  console.log('\n✅ All test users created!')
  console.log('📧 Test account: hr@test.com')
  console.log('🔑 Password: password')
}

main().catch(console.error)
