/**
 * List Auth Users
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

async function listUsers() {
  console.log('📋 Auth 사용자 목록 조회...\n')

  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌ 오류:', error)
    process.exit(1)
  }

  console.log(`총 ${data.users.length}명의 사용자\n`)

  data.users.forEach(user => {
    console.log(`- ${user.email} (ID: ${user.id})`)
  })

  if (data.users.length === 0) {
    console.log('사용자가 없습니다.')
  }
}

listUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 오류:', error)
    process.exit(1)
  })
