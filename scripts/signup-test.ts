/**
 * Test simple signup
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('URL:', supabaseUrl)
console.log('Key length:', supabaseAnonKey?.length)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSignup() {
  console.log('📝 Testing signup...\n')

  const { data, error } = await supabase.auth.signUp({
    email: 'test123@test.com',
    password: 'password123'
  })

  if (error) {
    console.error('❌ Error:', error.message)
  } else {
    console.log('✅ Success!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
  }
}

testSignup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal:', error)
    process.exit(1)
  })
