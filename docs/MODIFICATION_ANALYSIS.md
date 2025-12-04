# 수정 및 추가 기능 분석

## 현재 프로젝트 구현 상태 vs 요청 사항 비교

---

## 🔧 수정이 필요한 기능 (기존 구현 O → 변경 필요)

### 1. 대시보드 - 연차 요약 카드
**파일**: `components/dashboard/LeaveBalanceCard.tsx`

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 잔여연차 + 잔여포상휴가 (2열) | 잔여연차만 표시 (1열) |

**수정 내용**:
- 포상휴가 관련 코드 삭제 (라인 27-49)
- 세로 구분선 삭제
- 레이아웃 단일 컬럼으로 변경

---

### 2. 대시보드 - 빠른 메뉴 카드
**파일**: `components/dashboard/QuickActions.tsx`

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 회의실 예약 / 좌석 등록 / 결재 문서 | 회의실 예약 / 기안함 / 결재함 |

**수정 내용**:
- `좌석 등록` → `기안함` (href: `/documents/my-documents`)
- `결재 문서` → `결재함` (href: `/documents`)
- 라벨 및 아이콘 변경

---

### 3. 사이드바 - 메뉴명 변경
**파일**: `components/common/sidebar.tsx`

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| `내 문서` | `기안함` |
| `회의실 예약` | `공간 예약` (또는 유지) |

**수정 내용** (라인 100-106):
```tsx
// 변경 전
{ id: 'my-documents', label: '내 문서', ... }

// 변경 후
{ id: 'my-documents', label: '기안함', ... }
```

---

### 4. 구성원 관리 테이블 - 컬럼 삭제
**파일**: `components/admin/EmployeeTable.tsx`

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 잔여연차 컬럼 있음 (라인 128, 157-159) | 잔여연차/포상휴가 컬럼 삭제 |

**수정 내용**:
- `<TableHead className="text-center">잔여 연차</TableHead>` 삭제
- 해당 `<TableCell>` 삭제
- `annual_leave_balance` 조회 코드 제거 가능

---

### 5. 조직 관리 - 하위 부서 인원 합산
**파일**:
- `components/admin/OrganizationManagementClient.tsx`
- `supabase/migrations/` (department_with_stats 뷰)

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 직접 소속 인원만 표시 (예: 경영지원 0명) | 하위 부서 인원 합산 (예: 경영지원 4명) |

**수정 방법 (2가지 중 선택)**:

**A. DB 뷰 수정** (권장):
```sql
-- department_with_stats 뷰에서 재귀 카운트 추가
WITH RECURSIVE dept_tree AS (
  SELECT id, id as root_id FROM department
  UNION ALL
  SELECT d.id, dt.root_id
  FROM department d
  JOIN dept_tree dt ON d.parent_department_id = dt.id
)
SELECT root_id, COUNT(DISTINCT e.id) as total_member_count
FROM dept_tree dt
LEFT JOIN employee e ON e.department_id = dt.id
GROUP BY root_id
```

**B. 프론트엔드 계산**:
```tsx
// buildTree 함수에서 children의 memberCount 합산
function calculateTotalMembers(node: TreeNode): number {
  let total = node.memberCount || 0
  for (const child of node.children) {
    total += calculateTotalMembers(child)
  }
  return total
}
```

---

### 6. 연차 관리 - 정책 설정 버튼 삭제
**파일**: `components/leave-management/LeaveManagementClient.tsx`

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 정책 설정 버튼 있음 | 버튼 및 모달 삭제 |

**수정 내용**:
- `LeavePolicySettings` import 및 사용 삭제
- `isPolicyDialogOpen` 상태 삭제
- 정책 설정 관련 UI 제거
- 연차 정책 설정 및 부재 양식 커스텀 기능 제외

---

### 7. 공간 예약 (회의실 예약) 수정
**파일**: `app/(authenticated)/meeting-rooms/` 및 관련 컴포넌트

| 현재 상태 | 요청 사항 |
|-----------|-----------|
| 이름: 회의실 예약 | 이름: 공간 예약 |
| 층별 상태값 표시 | 층별 상태값 제외 |
| 시간 제한 없음 | 최대 2시간 예약 |
| 전체 시간대 | 09:00 - 19:00만 가능 |
| 정책 표시 없음 | 이용 정책 표시 |

**수정 내용**:
- 모든 텍스트 `회의실 예약` → `공간 예약`
- 시간 선택 옵션 제한 (09:00-19:00)
- 예약 시간 최대 2시간 검증
- 이용 정책 안내 문구 추가

---

### 8. 문서 종류 확장
**파일**: `components/request/DocumentTypeSelector.tsx`

| 현재 (7개) | 요청 (12개) |
|------------|-------------|
| annual_leave | annual_leave |
| half_day | leave_exception (당일/사후/마이너스) |
| reward_leave | reward_leave |
| condolence | work_type_change (근로형태변경) |
| overtime | condolence_expense (경조사비) |
| expense | overtime_request (연장근로신청) |
| other | overtime_report (연장근로보고) |
| - | budget_request (예산신청) |
| - | expense_approval (지출품의) |
| - | expense_settlement (지출결의) |
| - | resignation (사직서) |
| - | other (기타기안) |

---

## ➕ 추가가 필요한 기능 (기존 구현 X → 신규 개발)

### 1. 연차 신청 - 날짜별 종일/오전/오후 옵션
**파일**: `components/request/RequestForm.tsx`

**현재 상태**: 단순 날짜 범위 선택만 가능

**추가 필요**:
- 각 날짜별 `종일/오전/오후` 선택 UI
- 유효성 검증 로직:
  - 시작일: 종일 or 오후만
  - 종료일: 종일 or 오전만
  - 중간일: 종일만
  - 2일 선택 시: 오후-오전 조합 불가

```tsx
interface DateDetail {
  date: string
  type: 'full' | 'morning' | 'afternoon'
}

const [dateDetails, setDateDetails] = useState<DateDetail[]>([])
```

---

### 2. 문서 다운로드 기능
**파일**: 신규 생성 필요

**현재 상태**: 없음

**추가 필요**:
- PDF 다운로드 기능
- 문서 상세 페이지에 다운로드 버튼

---

### 3. 공간 예약 - 시간대별 검색
**파일**: 회의실 관련 컴포넌트

**현재 상태**: 없음

**추가 필요**:
- 날짜/시간 입력 시 해당 시각 비어있는 회의실 필터링

---

### 4. 공간 예약 - 캘린더 연동
**파일**: 회의실 관련 컴포넌트

**현재 상태**: 독립적 동작

**추가 필요**:
- 예약 정보 입력에서 날짜 선택 → 예약 현황도 해당 날짜로 변경

---

### 5. 연차 관리 - 신청자 잔여연차 표시
**파일**: `components/leave-management/LeaveManagementClient.tsx`

**현재 상태**: 연차 신청 목록에 잔여연차 미표시

**추가 필요**:
- 각 연차 신청 건에 신청자의 잔여연차 표시

---

### 6. 다양한 문서 입력 필드
**파일**: `components/request/RequestForm.tsx`

**현재 상태**: 기본 필드만 (날짜, 사유, 첨부파일)

**추가 필요 (문서 유형별)**:

| 문서 유형 | 추가 필드 |
|-----------|-----------|
| 예산 신청서 | 예산 사용 부서, 기간, 산출 근거, 신청 총액 |
| 지출 품의서 | 예정 일자, 사유, 품목/수량/가격 배열, 총액, 거래처 |
| 지출 결의서 | 지출 일자, 사유, 품목 배열, 지급방법, 이체정보 |
| 사직서 | 입사일, 사직 희망일, 사유, 서약 체크박스 |
| 연장 근로 | 신청일, 시작/종료 시각, 상세 내역 |

---

### 7. 좌석 예약 - 맵뷰
**파일**: `app/(authenticated)/resources/seats/page.tsx`

**현재 상태**: "평면도 구현 예정" placeholder 표시

**추가 필요**:
- 실제 좌석 배치도 UI
- 좌석 클릭 시 선택/예약

---

### 8. 회의실 사진 표시
**파일**: 회의실 관련 컴포넌트

**현재 상태**: 없음

**추가 필요**:
- 각 회의실 이미지 표시 (이미지 전달 예정)

---

## 📋 우선순위별 정리

### 🔴 긴급 (UI 즉시 수정)
1. 연차요약 포상휴가 삭제
2. 빠른메뉴 변경 (기안함/결재함)
3. 사이드바 내문서→기안함
4. 구성원관리 잔여연차 컬럼 삭제
5. 조직도 하위부서 인원 합산

### 🟠 높음 (핵심 기능)
6. 연차관리 정책설정 버튼 삭제
7. 회의실→공간 예약 이름변경
8. 공간예약 시간제한 (2시간, 09-19시)
9. 연차신청 날짜별 옵션 및 유효성

### 🟡 중간 (기능 확장)
10. 문서 종류 12개로 확장
11. 문서별 입력필드 구현
12. 문서 다운로드 기능
13. 공간예약 시간대 검색

### 🟢 낮음 (후순위)
14. 좌석 맵뷰 구현
15. 회의실 사진 추가
16. 연차관리 신청자 잔여연차 표시

---

## 작업 순서 제안

```
Phase 1: UI 수정 (1-2시간)
├── 1. LeaveBalanceCard.tsx - 포상휴가 삭제
├── 2. QuickActions.tsx - 메뉴 변경
├── 3. sidebar.tsx - 이름 변경
├── 4. EmployeeTable.tsx - 컬럼 삭제
└── 5. OrganizationManagementClient.tsx - 인원 합산

Phase 2: 핵심 기능 (3-4시간)
├── 6. LeaveManagementClient.tsx - 정책 버튼 삭제
├── 7. 회의실 → 공간 예약 이름변경
├── 8. 공간예약 시간제한 로직
└── 9. RequestForm.tsx - 날짜별 옵션

Phase 3: 기능 확장 (1-2일)
├── 10. DocumentTypeSelector.tsx - 12개 문서
├── 11. RequestForm.tsx - 문서별 필드
├── 12. 문서 다운로드 기능
└── 13. 공간예약 검색 기능
```

---

## 확인 필요 사항

1. **회의실 사진**: 언제 전달 예정인지?
2. **좌석 맵뷰**: 배치도 디자인/데이터 있는지?
3. **문서 다운로드**: PDF 형식? 다른 형식?
4. **조직도 인원 합산**: DB 뷰 수정 가능한지, 프론트 계산으로 할지?
