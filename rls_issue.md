# RLS (Row Level Security) 이슈 기록

이 문서는 개발 과정에서 발견된 RLS 관련 버그와 해결 방법을 기록합니다.

---

## Issue #1: 결재 워크플로우 - 다음 단계 활성화 실패

**발견일:** 2025-12-09
**심각도:** 🔴 Critical
**상태:** ✅ 수정 완료

### 문제 설명

박팀장이 1단계 결재를 승인한 후, 다음 결재자(최부장, 2단계)에게 결재 권한이 넘어가지 않는 문제.

### 증상

1. 박팀장이 문서 승인 완료 → "승인이 완료되었습니다" 토스트 표시
2. 최부장 계정으로 로그인 → 결재함에 문서는 보이지만
3. 문서 상세 모달에 **승인/반려 버튼이 표시되지 않음**

### 근본 원인

**파일:** `app/(authenticated)/documents/actions.ts:136`

```typescript
// ❌ 문제 코드: 일반 supabase 클라이언트 사용 (RLS 적용됨)
const { error: activateError } = await supabase
  .from('approval_step')
  .update({ status: 'pending' })
  .in('id', nextStepIds)
```

**RLS 정책:** `supabase/policies.sql` 또는 `supabase/migrations/00000000000000_consolidated_schema.sql`

```sql
CREATE POLICY approval_step_update_approver
ON approval_step FOR UPDATE
TO authenticated
USING (approver_id = auth.uid() AND status = 'pending')
WITH CHECK (approver_id = auth.uid());
```

### 문제 발생 흐름

1. 박팀장이 자신의 approval_step(step 1) 승인
   - Step 1: `approver_id = 박팀장, status = 'pending' → 'approved'` ✅ 성공

2. 시스템이 다음 단계(step 2) 활성화 시도
   - Step 2: `approver_id = 최부장, status = 'waiting' → 'pending'`로 변경 시도
   - 현재 사용자 = 박팀장
   - RLS 체크: `approver_id = auth.uid()` → **FALSE** (최부장 ≠ 박팀장)
   - **UPDATE 차단!** ❌

3. 결과
   - Step 2 status가 'waiting' 상태로 남음
   - 최부장이 결재할 수 없음 (canApprove 조건 미충족)

### 해결 방법

`supabase` 클라이언트 대신 `adminSupabase` (Service Role Key) 사용하여 RLS 우회:

```typescript
// ✅ 수정된 코드
const { error: activateError } = await adminSupabase
  .from('approval_step')
  .update({ status: 'pending' })
  .in('id', nextStepIds)
```

### 영향 범위

- **영향받는 기능:** 순차 결재 워크플로우 (2단계 이상)
- **영향받는 문서 유형:** 모든 문서 (leave, overtime, expense, welfare, budget, etc.)
- **영향받는 사용자:** 2단계 이상의 결재자

### 테스트 방법

1. 문서 생성 (4단계 결재선 포함)
2. 1단계 결재자가 승인
3. 2단계 결재자 계정으로 로그인
4. 결재함에서 문서 확인
5. 문서 상세 모달에서 **승인/반려 버튼 표시 확인**

### 추가 점검 사항

- [ ] rejectDocument 함수에도 유사한 이슈가 있는지 확인 → ✅ 없음 (본인 step만 업데이트)
- [ ] 다른 approval_step UPDATE 쿼리 확인 → ✅ 없음
- [ ] document_master UPDATE RLS 정책 확인 → ✅ 문제 없음 (결재자도 업데이트 가능)

---

## 향후 RLS 이슈 방지 가이드

### 원칙

1. **다른 사용자의 레코드를 업데이트할 때**
   - `adminSupabase` (Service Role) 사용
   - 예: 결재 승인 후 다음 결재자의 step 활성화

2. **본인의 레코드를 업데이트할 때**
   - `supabase` (일반 클라이언트) 사용
   - 예: 본인의 approval_step 승인/반려 처리

3. **시스템 자동 처리 (트리거, Edge Function)**
   - Service Role Key 사용 (RLS 우회)

### 체크리스트

다음과 같은 경우 RLS 이슈 발생 가능성이 높음:

- [ ] 결재 workflow에서 다음 단계로 넘어갈 때
- [ ] 알림(notification) 생성 시 다른 사용자에게 전송할 때
- [ ] 관리자가 사용자 데이터를 수정할 때
- [ ] 시스템이 자동으로 상태를 변경할 때 (scheduled job, trigger 외)

### 디버깅 방법

1. **에러 확인**
   ```typescript
   if (error) {
     console.error('DB error:', error)  // RLS violation error 확인
   }
   ```

2. **RLS 정책 확인**
   ```sql
   -- 해당 테이블의 UPDATE 정책 조회
   SELECT * FROM pg_policies WHERE tablename = 'approval_step';
   ```

3. **임시 우회 (디버깅용)**
   ```typescript
   const adminSupabase = createAdminClient()  // Service Role Key
   ```

---

## 관련 문서

- `supabase/policies.sql` - RLS 정책 정의
- `supabase/RLS_POLICY_GUIDE.md` - RLS 정책 가이드
- `lib/supabase/server.ts` - Supabase 클라이언트 생성 함수
