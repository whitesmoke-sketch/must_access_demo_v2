import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createHRAccount() {
  console.log('🚀 Creating hr@test.com account...')

  const hrId = '00000000-0000-0000-0000-000000000002'
  const hrEmail = 'hr@test.com'
  const hrName = '박인사'

  // Step 1: Create auth user
  console.log('📝 Creating auth user...')
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    id: hrId,
    email: hrEmail,
    password: 'password',
    email_confirm: true,
    user_metadata: {
      name: hrName
    }
  })

  if (authError) {
    console.error('❌ Error creating auth user:', authError)
    return
  }

  console.log('✅ Auth user created:', authUser.user.id)

  // Step 2: Insert employee record
  console.log('📝 Inserting employee record...')
  const { data: employee, error: employeeError } = await supabase
    .from('employee')
    .insert({
      id: hrId,
      department_id: 8, // HR팀
      role_id: 6, // HR
      name: hrName,
      email: hrEmail,
      employment_date: '2020-01-01',
      status: 'active'
    })
    .select()
    .single()

  if (employeeError) {
    console.error('❌ Error creating employee record:', employeeError)
    return
  }

  console.log('✅ Employee record created:', employee.id)

  // Step 3: Create annual leave balance
  console.log('📝 Creating annual leave balance...')
  const { error: leaveError } = await supabase
    .from('annual_leave_balance')
    .insert({
      employee_id: hrId,
      total_days: 15,
      used_days: 0,
      remaining_days: 15,
      year: 2025
    })

  if (leaveError) {
    console.error('❌ Error creating leave balance:', leaveError)
  } else {
    console.log('✅ Leave balance created')
  }

  console.log('\n✅ Successfully created hr@test.com account')
  console.log('   Email: hr@test.com')
  console.log('   Password: password')
  console.log('   User ID:', hrId)
  console.log('   Name:', hrName)
  console.log('   Department: HR팀 (ID: 8)')
  console.log('   Role: HR (ID: 6)')
}

createHRAccount()
