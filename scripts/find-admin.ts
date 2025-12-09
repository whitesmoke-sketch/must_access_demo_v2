import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://edmlatsgqoublcbhevoq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbWxhdHNncW91YmxjYmhldm9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MTk1NiwiZXhwIjoyMDc5NjM3OTU2fQ.7CaJ7iwBm_1n6Zf23Q0oO8hyjWsS5HA-XaGe5XrqIZM'
)

async function main() {
  const { data } = await supabase
    .from('employee')
    .select('id, name, email, role:role_id(name, code)')
    .or('name.ilike.%관리자%,name.ilike.%admin%,email.ilike.%admin%')

  console.log('시스템 관리자/Admin 계정:')
  console.log(JSON.stringify(data, null, 2))
}

main().catch(console.error)
