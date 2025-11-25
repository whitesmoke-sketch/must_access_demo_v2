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

  // Get the existing employee record
  const { data: employee } = await supabase
    .from('employee')
    .select('id, name, email')
    .eq('email', 'hr@test.com')
    .single()

  if (!employee) {
    console.error('❌ Employee record not found for hr@test.com')
    return
  }

  console.log('👤 Found employee record:', employee)

  // Create auth user with the same UUID as employee
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    id: employee.id,
    email: 'hr@test.com',
    password: 'password',
    email_confirm: true,
    user_metadata: {
      name: employee.name
    }
  })

  if (error) {
    console.error('❌ Error creating auth user:', error)
    return
  }

  console.log('✅ Successfully created hr@test.com account')
  console.log('   Email: hr@test.com')
  console.log('   Password: password')
  console.log('   User ID:', authUser.user.id)
}

createHRAccount()
