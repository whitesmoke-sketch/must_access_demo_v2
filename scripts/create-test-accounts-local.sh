#!/bin/bash

# 로컬 Supabase에 테스트 계정 생성
# .env.local 환경변수를 로드하고 스크립트 실행

set -e

# .env.local 파일에서 환경변수 로드
export $(grep -v '^#' .env.local | xargs)

echo "Using Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# 테스트 계정 생성 스크립트 실행
npx tsx scripts/create-test-accounts.ts
