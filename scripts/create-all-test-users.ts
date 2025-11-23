const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const API_URL = 'http://127.0.0.1:54321/auth/v1/admin/users'

const users = [
  { email: 'ceo@test.com', name: '김대표', department_id: 1, role_id: 5 },
  { email: 'hr@test.com', name: '박인사', department_id: 8, role_id: 6 },
  { email: 'si.leader@test.com', name: '이SI', department_id: 1, role_id: 4 },
  { email: 'ai.leader@test.com', name: '최AI', department_id: 2, role_id: 3 },
  { email: 'a1.member1@test.com', name: '김A1', department_id: 3, role_id: 2 },
  { email: 'a1.member2@test.com', name: '박A1', department_id: 3, role_id: 1 },
  { email: 'a2.member1@test.com', name: '이A2', department_id: 4, role_id: 2 },
  { email: 'a2.member2@test.com', name: '최A2', department_id: 4, role_id: 1 },
  { email: 'a3.member1@test.com', name: '정A3', department_id: 5, role_id: 2 },
  { email: 'a3.member2@test.com', name: '한A3', department_id: 5, role_id: 1 },
  { email: 'support1@test.com', name: '김서포트', department_id: 6, role_id: 2 },
  { email: 'support2@test.com', name: '박서포트', department_id: 6, role_id: 1 },
  { email: 'dev.leader@test.com', name: '이개발', department_id: 9, role_id: 4 },
  { email: 'backend.leader@test.com', name: '최백엔드', department_id: 10, role_id: 3 },
  { email: 'api.dev1@test.com', name: '김API', department_id: 11, role_id: 2 },
  { email: 'api.dev2@test.com', name: '박API', department_id: 11, role_id: 1 },
  { email: 'db.dev1@test.com', name: '이DB', department_id: 12, role_id: 2 },
  { email: 'db.dev2@test.com', name: '최DB', department_id: 12, role_id: 1 },
  { email: 'frontend.leader@test.com', name: '정프론트', department_id: 13, role_id: 3 },
  { email: 'frontend.dev1@test.com', name: '한프론트', department_id: 13, role_id: 1 },
  { email: 'frontend.dev2@test.com', name: '오프론트', department_id: 13, role_id: 1 },
]

async function main() {
  console.log('🚀 Creating all test users...\n')

  const employees: any[] = []

  for (const user of users) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: 'password',
          email_confirm: true,
          user_metadata: {
            name: user.name,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Created: ${user.email} (${user.name})`)

        employees.push({
          id: data.id,
          email: user.email,
          name: user.name,
          department_id: user.department_id,
          role_id: user.role_id,
        })
      } else {
        const error = await response.text()
        console.log(`⚠️  ${user.email}: ${error}`)
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`❌ Error creating ${user.email}: ${error.message}`)
    }
  }

  console.log(`\n📝 Created ${employees.length} auth users`)
  console.log('Now run: npx tsx scripts/insert-employees.ts')

  // Write employee data to temp file
  const fs = require('fs')
  fs.writeFileSync('/tmp/employees.json', JSON.stringify(employees, null, 2))
  console.log('Employee data saved to /tmp/employees.json')
}

main().catch(console.error)
