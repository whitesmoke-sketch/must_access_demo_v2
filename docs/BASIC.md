# MUST Access - 기본 문서

**생성일:** 2025-01-18
**아키텍처:** Option A - 서버리스 풀스택 (Next.js + Supabase)
**원본 문서:** PRD_FRD_V2.md, ERD.md, FIGMA.md

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목표

수작업으로 관리되던 인사(HR) 및 총무(GA) 업무를 통합 자동화하는 솔루션을 구축합니다. 연차/근태 관리의 리스크를 해소하고, 출입 및 좌석 관리의 편의성을 높이며, 명확한 프로세스(결재)와 자동화된 리포트(Slack)를 제공하여 조직 운영의 효율성을 극대화합니다.

### 1.2 주요 문제 해결 (Pain Points)

- **연차 관리 부재:** 연차 계산, 부여, 사용 관리가 모두 수작업 → 자동화된 연차 계산 및 부여 시스템
- **근태 리포트 부재:** Hubstaff 대시보드 수동 확인 → 자동화된 일일 근태 리포트 (Slack)
- **프로세스 혼선:** 포상휴가, 경조사비 신청 절차 불명확 → 체계화된 승인 프로세스
- **통합 관리 어려움:** 그룹 전체 통합 관리 부재 → 단일 플랫폼 통합 관리

### 1.3 타겟 사용자

- **조직 구성원 (직원):** 본인의 근태/연차 조회, 휴가 신청, 자유좌석/회의실 예약
- **관리자 (HR/경영지원팀):** 구성원 정보 관리, 방문자 등록, 연차/근태 정책 설정, 자원 관리
- **승인권자 (결재자):** 휴가/경조사 신청 승인 또는 반려

---

## 2. 기능 요구사항

### 2.1 핵심 기능

#### ACCESS (출입/방문자)
- 조직 구성원 카드키/QR/얼굴인식 출입
- 방문자 QR 발급 및 이메일 발송
- Biostar2 API 연동

#### TIME (근태)
- Hubstaff 근태기록(공식) + Biostar2 출입기록(보조) 통합 조회
- 근태 기록 편차 15분 이상 시 관리자 알림
- 자동화된 일일 근태 리포트 (Slack)

#### LEAVE (휴가/복지)
- 연차 자동 계산 및 부여 (매월 1일, 입사 기념일)
- 휴가 신청 및 승인 프로세스 (연차, 반차, 포상휴가)
- 포상휴가 '부여 신청'과 '사용 신청' 분리
- 경조사비 신청 프로세스
- 연차 촉진 확인 기능
- 관리자 수동 연차 부여/차감

#### RSRV (자원 예약)
- 자유좌석 QR 코드 등록 (현장 등록 방식)
- 자유좌석 사용 현황 조회
- 회의실 예약 (사전 예약 + 즉시 예약)
- 자유좌석 자동 반납 (퇴근 시)

#### USER (조직/구성원)
- 관리자의 조직 구성원 정보 CRUD
- 조직도(부서) 관리

#### DASH (대시보드)
- 관리자: 근태 준수율, 자유좌석 사용 정보 등 한눈에 조회
- 사용자: 본인 프로필, 잔여 연차, 스케줄 종합 조회

#### WF (워크플로우/연동)
- Notion 템플릿 연동
- Must Access 내 결재선 관리 및 승인/반려 기능

---

## 3. 데이터베이스 구조

### 3.1 주요 테이블

#### 핵심 인사 정보
- **employee:** 조직 구성원 기본 정보
- **department:** 부서 정보
- **role:** 역할 정보
- **permission:** 권한 정보

#### 연차/휴가 관리
- **annual_leave_grant:** 연차 부여 기록
- **annual_leave_usage:** 연차 사용 기록 (FIFO 추적)
- **annual_leave_balance:** 연차 잔액 (통합 뷰)
- **leave_request:** 휴가 신청

#### 포상휴가
- **attendance_award:** 만근 포상휴가 이력
- **overtime_conversion:** 야근 보상휴가 전환 이력
- **batch_job_log:** 배치 작업 실행 이력

#### 승인 프로세스
- **document_template:** 문서 양식
- **document_approval_line:** 양식별 결재선 템플릿
- **document_submission:** 문서 제출
- **document_approval_instance:** 실제 승인 진행 상황

#### 출입 관리
- **visitor:** 방문자 정보
- **access_point:** 출입 지점
- **access_credential:** 출입 권한 (QR 등)
- **access_log:** 출입 기록

#### 자산/자원
- **equipment:** 장비 정보
- **locker:** 사물함
- **seat:** 자유좌석
- **seat_reservation:** 좌석 예약

### 3.2 주요 관계

- employee ↔ department (N:1)
- employee ↔ role (N:1)
- employee ↔ annual_leave_grant (1:N)
- leave_request ↔ annual_leave_usage (1:N)
- document_submission ↔ document_approval_instance (1:N)

---

## 4. 기술 스택

### 아키텍처
**Option A - 서버리스 풀스택 (Next.js + Supabase)**

### Frontend
- **Next.js 15** (React 19, App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (UI 컴포넌트)
- **Lucide Icons**
- **Recharts** (차트)
- **Sonner** (Toast 알림)

### Backend
- **Next.js Server Components** (서버에서 직접 데이터 조회)
- **Next.js Server Actions** (클라이언트 인터랙션 처리)
- **Supabase Edge Functions** (복잡한 로직, Cron 작업)

### Database
- **Supabase** (PostgreSQL)
- **Row Level Security (RLS)**
- **pg_cron** (스케줄링)

### External APIs
- Hubstaff API (근태 데이터)
- Biostar2 API (출입 통제)
- Slack API (알림)
- Notion API (문서 연동)

### Deployment
- **Vercel** (프론트엔드 + API Routes)
- **Supabase** (데이터베이스 + Edge Functions)

---

## 5. 완료된 초기 셋팅 작업

### 5.1 프로젝트 구조

```
must_access_vibeD/
├── app/
│   ├── (authenticated)/      # 인증 필요 페이지
│   │   ├── dashboard/         # 대시보드
│   │   ├── leave/             # 연차 관리
│   │   ├── attendance/        # 근태 관리
│   │   ├── resources/         # 자원 예약
│   │   └── admin/             # 관리자 기능
│   ├── api/                   # API Routes (외부 연동, Webhook)
│   ├── layout.tsx             # 루트 레이아웃
│   ├── page.tsx               # 홈 페이지
│   └── globals.css            # 전역 스타일
├── components/
│   ├── ui/                    # shadcn/ui 컴포넌트
│   ├── common/                # 공통 컴포넌트
│   ├── dashboard/             # 대시보드 컴포넌트
│   ├── leave/                 # 연차 관련 컴포넌트
│   ├── attendance/            # 근태 관련 컴포넌트
│   ├── resources/             # 자원 관련 컴포넌트
│   └── admin/                 # 관리자 컴포넌트
├── lib/
│   ├── supabase/              # Supabase 클라이언트
│   │   ├── client.ts          # 클라이언트 컴포넌트용
│   │   ├── server.ts          # 서버 컴포넌트용
│   │   └── middleware.ts      # 미들웨어용
│   ├── utils/                 # 유틸리티 함수
│   └── hooks/                 # Custom Hooks
├── types/
│   └── supabase.ts            # Supabase 타입 정의
├── supabase/
│   ├── migrations/            # 데이터베이스 마이그레이션
│   │   ├── 20250118000001_initial_schema.sql
│   │   └── 20250118000002_approval_and_resources.sql
│   └── functions/             # Edge Functions
│       ├── _shared/           # 공유 유틸리티
│       ├── grant-monthly-leave/          # 매월 연차 부여
│       ├── grant-attendance-award/       # 분기별 포상휴가 부여
│       ├── sync-hubstaff-attendance/     # Hubstaff 동기화
│       ├── detect-attendance-anomaly/    # 근태 편차 감지
│       ├── daily-attendance-report/      # 일일 근태 리포트
│       └── auto-release-seats/           # 자동 좌석 반납
├── public/
│   ├── images/
│   └── icons/
├── docs/
│   ├── BASIC.md               # 기본 문서 (현재 파일)
│   └── WORKFLOW-GUIDE.md      # 워크플로우 가이드
├── .env.local                 # 환경 변수 (로컬)
├── .env.example               # 환경 변수 템플릿
├── package.json               # 의존성
├── tsconfig.json              # TypeScript 설정
├── next.config.mjs            # Next.js 설정
├── tailwind.config.ts         # Tailwind CSS 설정
├── postcss.config.mjs         # PostCSS 설정
├── middleware.ts              # Next.js Middleware
└── .gitignore                 # Git 제외 파일
```

### 5.2 설치된 주요 패키지

**프로덕션 의존성:**
- next@15.1.8
- react@19.0.0
- @supabase/supabase-js@2.58.0
- @supabase/ssr@0.5.2
- date-fns@4.1.0
- zod@3.24.1
- lucide-react@0.468.0
- recharts@2.15.0
- sonner@1.7.2

**개발 의존성:**
- typescript@5.7.3
- tailwindcss@3.4.17
- eslint@9.17.0
- supabase@1.225.0

### 5.3 환경 변수

**.env.local 설정 필요:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs
HUBSTAFF_API_TOKEN=your-hubstaff-api-token
BIOSTAR2_API_URL=your-biostar2-api-url
BIOSTAR2_API_KEY=your-biostar2-api-key
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_WEBHOOK_URL=your-slack-webhook-url
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-notion-database-id
```

### 5.4 데이터베이스

**스키마 파일:**
- `supabase/migrations/20250118000001_initial_schema.sql`
- `supabase/migrations/20250118000002_approval_and_resources.sql`

**마이그레이션 실행:**
```bash
npm run supabase:migrate
```

### 5.5 Edge Functions

생성된 템플릿:
- `grant-monthly-leave`: 매월 1일 연차 자동 부여
- `grant-attendance-award`: 분기별 만근 포상휴가 계산 및 부여

추가 구현 필요:
- `sync-hubstaff-attendance`: Hubstaff 근태 데이터 동기화
- `detect-attendance-anomaly`: 근태 편차 감지 및 알림
- `daily-attendance-report`: 일일 근태 리포트 생성
- `auto-release-seats`: 퇴근 시 자동 좌석 반납

### 5.6 버전 관리

`.gitignore` 파일 생성 완료

---

## 6. 개발 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트
npm run lint

# 타입 체크
npm run type-check

# Supabase 로컬 시작
npm run supabase:start

# Supabase 상태 확인
npm run supabase:status

# 타입 생성
npm run supabase:types

# 마이그레이션 실행
npm run supabase:migrate

# Edge Function 생성
npm run edge:new <function-name>

# Edge Function 로컬 서빙
npm run edge:serve

# Edge Function 배포
npm run edge:deploy <function-name>
```

---

## 7. 즉시 실행 가능한 작업

### 7.1 환경 변수 설정

`.env.local` 파일을 열어 실제 값을 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 7.2 Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. Project URL과 Anon Key 복사
3. `.env.local`에 값 입력

### 7.3 의존성 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 7.4 데이터베이스 초기화

```bash
# Supabase CLI 로그인
npx supabase login

# 로컬 Supabase 시작
npm run supabase:start

# 마이그레이션 실행
npm run supabase:migrate
```

---

## 8. 개발 워크플로우

### 8.1 전체 워크플로우

```
1. ✅ 초기 셋업 완료 (vibe-coding-setup) ← 현재 단계

2. ⏭️ 구현 계획 생성 (implementation-planner)
   → 명령어: "API 구현 계획 만들어줘"

3. ⏭️ Phase별 구현 (phase-implementer)
   → 명령어: "Phase 1 구현"

4. ⏭️ 코드 개선 (phase-refiner)
   → 명령어: "개선사항 적용"

5. ⏭️ 통합 테스트 (integration-tester)
   → 명령어: "테스트 생성"
```

### 8.2 명령어 참조

| 단계 | 명령어 | 설명 |
|------|--------|------|
| 구현 계획 | "API 구현 계획 만들어줘" | Phase별 개발 로드맵 생성 |
| Phase 구현 | "Phase 1 구현" | 특정 Phase 구현 시작 |
| 코드 리뷰 | "리뷰해줘" | Codex로 코드 품질 검증 |
| 개선 적용 | "개선사항 적용" | 리포트 권장사항 적용 |
| 테스트 생성 | "API 테스트 만들어줘" | 통합 테스트 자동 생성 |

### 8.3 추천 개발 순서

1. 환경 변수 설정 → Supabase 프로젝트 연결
2. Implementation Planner로 API 계획 생성
3. Phase별 구현:
   - Phase 1: 인증 및 사용자 관리
   - Phase 2: 연차 관리
   - Phase 3: 근태 관리
   - Phase 4: 자원 예약
   - Phase 5: 승인 프로세스
4. Edge Functions 구현 및 pg_cron 설정
5. 외부 API 연동 (Hubstaff, Biostar2, Slack, Notion)
6. Vercel 배포

### 8.4 상세 워크플로우 가이드

아키텍처별 상세한 워크플로우는 `docs/WORKFLOW-GUIDE.md` 파일을 참조하세요.

---

## 9. 다음 단계

### 즉시 실행

1. ✅ 환경 변수 실제 값 입력 (`.env.local`)
2. ✅ 의존성 설치: `npm install`
3. ✅ Supabase 프로젝트 생성 및 연결
4. ✅ 데이터베이스 마이그레이션 실행
5. ✅ 개발 서버 실행: `npm run dev`

### 구현 계획 수립

다음 명령어로 체계적인 구현 계획을 수립하세요:

```
"API 구현 계획 만들어줘"
```

이 명령어는 `implementation-planner` 스킬을 실행하여:
- `plan/PLAN.md`: 전체 구현 로드맵
- `plan/specs/PHASE-*.md`: 각 Phase별 상세 스펙
- `plan/INTEGRATION-SPECIFICATION.md`: 프론트-백 연결 규정서
- `plan/tests/PHASE-*.md`: 각 Phase별 테스트 계획
- `plan/api-docs/API-PHASE-*.md`: API 문서

를 자동으로 생성합니다.

---

## 10. 참고 문서

- `docs/WORKFLOW-GUIDE.md` - 서버리스 풀스택 상세 워크플로우 가이드
- `.env.example` - 환경 변수 템플릿
- `PRD_FRD_V2.md` - 원본 요구사항 문서
- `ERD.md` - 원본 데이터베이스 설계
- `FIGMA.md` - 원본 디자인 시스템

---

**문서 작성일:** 2025-01-18
**다음 업데이트:** 구현 진행 중 필요 시
