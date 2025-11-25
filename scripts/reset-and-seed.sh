#!/bin/bash

# ================================================================
# Database Reset and Seed Script
# ================================================================
# 이 스크립트는 로컬 Supabase 데이터베이스를 리셋하고
# 테스트 계정을 자동으로 생성합니다.
# ================================================================

set -e

echo "======================================"
echo "🔄 Database Reset & Seed"
echo "======================================"
echo ""

# 환경 확인
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local 파일이 없습니다!"
  echo "   .env.local.example을 복사하여 .env.local을 생성하세요."
  exit 1
fi

# 사용자 확인
echo "⚠️  이 작업은 로컬 데이터베이스의 모든 데이터를 삭제합니다."
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 작업이 취소되었습니다."
  exit 1
fi

echo ""
echo "1️⃣ Resetting database..."
npx supabase db reset

echo ""
echo "2️⃣ Loading environment variables..."
export $(grep -v '^#' .env.local | xargs)

echo ""
echo "3️⃣ Creating master admin account..."
npx tsx scripts/create-master-account.ts

echo ""
echo "4️⃣ Creating test accounts..."
npx tsx scripts/create-test-accounts.ts

echo ""
echo "5️⃣ Verifying accounts..."
npx tsx scripts/list-auth-users.ts

echo ""
echo "======================================"
echo "✅ Database reset and seeded!"
echo "======================================"
echo ""
echo "🔐 마스터 계정:"
echo "  • admin@must-access.com (Admin@2025!)"
echo "    → 시스템 관리자 (모든 권한)"
echo ""
echo "🧪 테스트 계정 (비밀번호: password):"
echo "  • staff@test.com (일반 사원)"
echo "  • teamlead@test.com (팀 리더)"
echo "  • depthead@test.com (부서장)"
echo "  • bizhead@test.com (사업부장)"
echo "  • hr@test.com (HR)"
echo ""
echo "💡 다음 명령어로 로그인 테스트:"
echo "  npx tsx scripts/test-login.ts"
echo ""
