/**
 * Test Login Script
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  console.log('🔐 테스트 로그인 시도...\n')
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Testing: staff@test.com / test1234\n`)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'staff@test.com',
      password: 'test1234'
    })

    if (error) {
      console.error('❌ 로그인 실패:')
      console.error('Error:', error.message)
      console.error('Status:', error.status)
      console.error('Code:', error.code)
      console.error('\nFull error:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ 로그인 성공!')
      console.log('User ID:', data.user?.id)
      console.log('Email:', data.user?.email)
      console.log('User metadata:', data.user?.user_metadata)
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

testLogin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
