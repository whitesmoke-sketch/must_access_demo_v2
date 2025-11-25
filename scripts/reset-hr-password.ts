import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword() {
  // Get user by email
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === 'hr@test.com')

  if (!user) {
    console.error('❌ User not found')
    return
  }

  console.log('👤 Found user:', user.email, user.id)

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: 'password' }
  )

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Password reset successfully for hr@test.com')
  }
}

resetPassword()
