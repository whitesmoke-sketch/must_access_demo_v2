# PHASE-4: 신청서 작성 (통합 문서 시스템)

**생성일:** 2025-11-19
**Phase 타입:** [PAGE]
**예상 기간:** 5-6일
**의존성:** Phase 0, Phase 3
**Figma 디자인:** RequestForm.tsx 기반

---

## 🎯 Phase Overview

### Goal
직원이 다양한 문서를 작성하고 결재선을 지정하여 제출할 수 있는 통합 신청서 작성 시스템을 구현합니다.

### Pages
- `/request` - 신청서 작성 (통합 문서 시스템)

### User Stories
- [ ] 사용자는 7가지 문서 유형 중 하나를 선택할 수 있다
- [ ] 사용자는 선택한 문서 유형에 맞는 폼을 작성할 수 있다
- [ ] 사용자는 결재선을 확인하고 수정할 수 있다
- [ ] 사용자는 결재자를 변경하거나 대결자를 지정할 수 있다
- [ ] 사용자는 참조자를 추가할 수 있다
- [ ] 사용자는 잔여 연차를 실시간으로 확인할 수 있다 (연차 관련 문서)
- [ ] 사용자는 첨부파일을 추가할 수 있다
- [ ] 사용자는 신청서를 제출할 수 있다

### Completion Criteria
- [ ] 7가지 문서 유형 선택 가능
- [ ] 문서 유형별 동적 필드 정상 렌더링
- [ ] 결재선 자동 설정 및 수정 동작
- [ ] 잔여 연차 부족 시 에러 처리 (연차 관련)
- [ ] 신청 성공 toast 표시
- [ ] 결재자/참조자에게 알림 전송 (선택적)

### ⚠️ Database Schema Constraints
**이 Phase에서 사용하는 테이블:**
- `document_submission` (문서 제출)
- `document_approval_instance` (결재 인스턴스)
- `document_template` (문서 양식)
- `leave_request` (연차 신청 - 선택적)
- `annual_leave_balance` (연차 잔액)
- `employee` (직원 정보)

**금지 사항:**
- ❌ 테이블 추가/삭제/수정
- ❌ 컬럼 추가/삭제/수정

---

## 📄 Page Specification

### Page: Request Form (`/request`)

#### Layout (Figma 기반)
```
┌─────────────────────────────────────────────────┐
│ 신청서 작성                                     │
│ 문서 양식을 선택하고 필요한 정보를 입력하세요   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ [1] 문서 양식 선택                          │ │
│ │                                             │ │
│ │ 문서 유형: [연차 신청 ▼]                   │ │
│ │   - 📅 연차 신청                            │ │
│ │   - 🕐 반차 / 시간차 신청                   │ │
│ │   - 🎁 포상휴가 사용 신청                   │ │
│ │   - 📝 경조사비 신청                        │ │
│ │   - 🕐 야근수당 신청                        │ │
│ │   - 💰 지출결의서                           │ │
│ │   - 📄 기타 회사 문서                       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [2] 양식 작성                               │ │
│ │                                             │ │
│ │ [연차 정보 카드 3개] (연차 선택 시)         │ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐                 │ │
│ │ │총연차│ │사용  │ │잔여  │                 │ │
│ │ │15일  │ │5일   │ │10일  │                 │ │
│ │ └──────┘ └──────┘ └──────┘                 │ │
│ │                                             │ │
│ │ 제목 *: [___________________________]       │ │
│ │                                             │ │
│ │ [문서별 동적 필드]                          │ │
│ │ - 연차: 시작일, 종료일, 사유                │ │
│ │ - 경조사: 유형, 대상자, 관계                │ │
│ │ - 지출: 항목, 금액, 결제수단                │ │
│ │                                             │ │
│ │ 사유 *: [___________________________]       │ │
│ │                                             │ │
│ │ 첨부파일: [파일 선택] [파일1.pdf] [X]       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [3] 결재선 지정          [+ 결재자 추가]    │ │
│ │                                             │ │
│ │ 👤 홍길동 (신청자)                          │ │
│ │    직급: 선임연구원                         │ │
│ │    [작성 중]                                │ │
│ │          ↓                                  │ │
│ │ 👤 김팀장 (결재자 1)         [변경] [대결] │ │
│ │    직급: 팀장                               │ │
│ │          ↓                                  │ │
│ │ 👤 이관리 (결재자 2)         [변경] [대결] │ │
│ │    직급: HR 관리자                          │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [👥] 참조자 지정 (선택)     [+ 참조자 추가] │ │
│ │                                             │ │
│ │ [박참조 (선임)] [최참조 (대리)] [X]         │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ [취소]                              [제출]      │ ← 하단 고정
└─────────────────────────────────────────────────┘
```

---

## 📋 문서 유형 (7가지)

### 1. 연차 신청 (annual_leave)
**필드:**
- 시작일 (날짜 선택)
- 종료일 (날짜 선택)
- 사용 일수 (자동 계산)
- 사유 (텍스트)

**검증:**
- 잔여 연차 부족 시 에러

### 2. 반차 / 시간차 신청 (half_day)
**필드:**
- 날짜 (날짜 선택)
- 유형 (라디오: 종일/반차 0.5일/시간차 0.25일)
- 사유 (텍스트)

**검증:**
- 잔여 연차 부족 시 에러

### 3. 포상휴가 사용 신청 (reward_leave)
**필드:**
- 시작일 (날짜 선택)
- 종료일 (날짜 선택)
- 사용 일수 (자동 계산)
- 사유 (텍스트)

**검증:**
- 잔여 포상휴가 부족 시 에러

### 4. 경조사비 신청 (condolence)
**필드:**
- 경조사 유형 (선택: 결혼/장례/출산)
- 대상자 이름 (텍스트)
- 관계 (텍스트: 본인/부모/자녀/배우자)
- 사유 (텍스트)

### 5. 야근수당 신청 (overtime)
**필드:**
- 야근 날짜 (날짜 선택)
- 야근 시간 (숫자: 시간)
- 사유 (텍스트)

### 6. 지출결의서 (expense)
**필드:**
- 지출 항목 (텍스트)
- 금액 (숫자)
- 결제수단 (선택: 법인카드/현금/계좌이체)
- 사유 (텍스트)

### 7. 기타 회사 문서 (other)
**필드:**
- 제목 (텍스트)
- 사유 (텍스트)

---

## 🧩 Components

### 1. RequestPage (Server Component)

**File:** `app/(authenticated)/request/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestForm } from '@/components/request/RequestForm'

export default async function RequestPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 사용자 정보 조회
  const { data: employee } = await supabase
    .from('employee')
    .select('id, name, position, department_id, team, role_id')
    .eq('id', user.id)
    .single()

  // 연차 잔액 조회
  const currentYear = new Date().getFullYear()
  const { data: balance } = await supabase
    .from('annual_leave_balance')
    .select('total_days, used_days, remaining_days, reward_leave_balance')
    .eq('employee_id', user.id)
    .eq('year', currentYear)
    .single()

  // 구성원 목록 조회 (결재선용)
  const { data: members } = await supabase
    .from('employee')
    .select('id, name, position, department_id, team, role_id')
    .eq('status', 'active')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* 헤더 */}
      <div className="pb-4">
        <h2 style={{
          color: 'var(--card-foreground)',
          fontSize: 'var(--font-size-h1)',
          fontWeight: 'var(--font-weight-h1)',
          lineHeight: 1.25
        }}>
          신청서 작성
        </h2>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: 'var(--font-size-body)',
          lineHeight: 1.5
        }} className="mt-1">
          문서 양식을 선택하고 필요한 정보를 입력하세요
        </p>
      </div>

      {/* 신청서 폼 */}
      <RequestForm
        currentUser={employee}
        balance={balance}
        members={members || []}
      />
    </div>
  )
}
```

---

### 2. RequestForm (Client Component - 메인)

**File:** `components/request/RequestForm.tsx`

**기능:**
- 4단계 프로세스 관리
- 문서 유형별 상태 관리
- 동적 필드 렌더링
- 폼 검증
- 제출 처리

**주요 State:**
```typescript
const [documentType, setDocumentType] = useState<DocumentType | ''>('')
const [title, setTitle] = useState('')
const [reason, setReason] = useState('')
const [attachments, setAttachments] = useState<File[]>([])

// 연차 관련
const [startDate, setStartDate] = useState<Date>()
const [endDate, setEndDate] = useState<Date>()
const [leaveType, setLeaveType] = useState<'full' | 'half' | 'hourly'>('full')
const [calculatedDays, setCalculatedDays] = useState(0)

// 경조사비
const [condolenceType, setCondolenceType] = useState('')
const [targetName, setTargetName] = useState('')
const [relationship, setRelationship] = useState('')

// 지출결의서
const [expenseItem, setExpenseItem] = useState('')
const [expenseAmount, setExpenseAmount] = useState('')
const [paymentMethod, setPaymentMethod] = useState('')

// 야근수당
const [overtimeDate, setOvertimeDate] = useState<Date>()
const [overtimeHours, setOvertimeHours] = useState('')

// 결재선
const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([])

// 참조자
const [referenceSteps, setReferenceSteps] = useState<ReferenceStep[]>([])
```

**구조:**
```typescript
return (
  <div className="space-y-6">
    {/* Step 1: 문서 양식 선택 */}
    <DocumentTypeSelector
      value={documentType}
      onChange={setDocumentType}
    />

    {documentType && (
      <>
        {/* Step 2: 양식 작성 */}
        <Card>
          <CardContent>
            {/* 연차 정보 카드 (연차 관련만) */}
            {isLeaveType && (
              <LeaveBalanceCards balance={balance} />
            )}

            {/* 공통 필드 */}
            <FormFields />

            {/* 문서별 동적 필드 */}
            {renderDynamicFields()}
          </CardContent>
        </Card>

        {/* Step 3: 결재선 지정 */}
        <ApprovalLineSelector
          approvalSteps={approvalSteps}
          setApprovalSteps={setApprovalSteps}
          members={members}
        />

        {/* Step 4: 참조자 지정 */}
        <ReferenceSelector
          referenceSteps={referenceSteps}
          setReferenceSteps={setReferenceSteps}
          members={members}
        />

        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-white z-20">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '제출 중...' : '제출'}
            </Button>
          </div>
        </div>
      </>
    )}
  </div>
)
```

---

### 3. DocumentTypeSelector

**File:** `components/request/DocumentTypeSelector.tsx`

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Gift, FileText, DollarSign } from 'lucide-react'

type DocumentType =
  | 'annual_leave'
  | 'half_day'
  | 'reward_leave'
  | 'condolence'
  | 'overtime'
  | 'expense'
  | 'other'

interface DocumentTypeSelectorProps {
  value: DocumentType | ''
  onChange: (value: DocumentType) => void
}

export function DocumentTypeSelector({ value, onChange }: DocumentTypeSelectorProps) {
  const documentTypeOptions = [
    { value: 'annual_leave', label: '연차 신청', icon: Calendar },
    { value: 'half_day', label: '반차 / 시간차 신청', icon: Clock },
    { value: 'reward_leave', label: '포상휴가 사용 신청', icon: Gift },
    { value: 'condolence', label: '경조사비 신청', icon: FileText },
    { value: 'overtime', label: '야근수당 신청', icon: Clock },
    { value: 'expense', label: '지출결의서', icon: DollarSign },
    { value: 'other', label: '기타 회사 문서', icon: FileText },
  ]

  return (
    <Card className="rounded-2xl" style={{
      borderRadius: 'var(--radius)',
      boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
    }}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            1
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--card-foreground)',
            lineHeight: 1.5
          }}>
            문서 양식 선택
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentType">문서 유형 *</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="documentType">
              <SelectValue placeholder="작성할 문서 유형을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {documentTypeOptions.map(option => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### 4. LeaveBalanceCards

**File:** `components/request/LeaveBalanceCards.tsx`

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'

interface LeaveBalanceCardsProps {
  balance: {
    total_days: number
    used_days: number
    remaining_days: number
    reward_leave_balance: number
  } | null
}

export function LeaveBalanceCards({ balance }: LeaveBalanceCardsProps) {
  const totalDays = balance?.total_days || 0
  const usedDays = balance?.used_days || 0
  const remainingDays = balance?.remaining_days || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 총 연차 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'rgba(41, 54, 61, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: '#29363D',
            lineHeight: 1.4
          }}>
            총 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#29363D',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {totalDays}일
          </div>
        </CardContent>
      </Card>

      {/* 사용한 연차 */}
      <Card className="hidden md:block" style={{
        backgroundColor: 'rgba(91, 106, 114, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: '#5B6A72',
            lineHeight: 1.4
          }}>
            사용한 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#5B6A72',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {usedDays}일
          </div>
        </CardContent>
      </Card>

      {/* 잔여 연차 */}
      <Card style={{
        backgroundColor: 'rgba(99, 91, 255, 0.05)',
        borderRadius: 'var(--radius)',
        border: 'none',
      }}>
        <CardContent className="pt-6">
          <p style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--primary)',
            lineHeight: 1.4
          }}>
            사용 가능한 연차
          </p>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--primary)',
            lineHeight: 1.2,
            marginTop: '8px'
          }}>
            {remainingDays}일
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 5. ApprovalLineSelector

**File:** `components/request/ApprovalLineSelector.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, Edit2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface ApprovalStep {
  order: number
  approverId: string
  approverName: string
  approverPosition: string
  isDelegated?: boolean
  delegateId?: string
  delegateName?: string
}

interface ApprovalLineSelectorProps {
  approvalSteps: ApprovalStep[]
  setApprovalSteps: (steps: ApprovalStep[]) => void
  members: any[]
  currentUser: any
}

export function ApprovalLineSelector({
  approvalSteps,
  setApprovalSteps,
  members,
  currentUser
}: ApprovalLineSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isDelegating, setIsDelegating] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  // 결재 가능한 구성원만 필터링 (관리자)
  const approvalMembers = members.filter(
    m => m.role_id === 'admin' && m.id !== currentUser?.id
  )

  function openDialog(index: number | null, delegating: boolean = false) {
    setEditingIndex(index)
    setIsDelegating(delegating)
    setSelectedId('')
    setIsDialogOpen(true)
  }

  function handleConfirm() {
    if (!selectedId) {
      toast.error('구성원을 선택해주세요')
      return
    }

    const member = members.find(m => m.id === selectedId)
    if (!member) return

    if (editingIndex === null) {
      // 새 결재자 추가
      setApprovalSteps([...approvalSteps, {
        order: approvalSteps.length + 1,
        approverId: member.id,
        approverName: member.name,
        approverPosition: member.position
      }])
      toast.success('결재자 추가 완료')
    } else if (isDelegating) {
      // 대결자 지정
      const updated = [...approvalSteps]
      updated[editingIndex] = {
        ...updated[editingIndex],
        isDelegated: true,
        delegateId: member.id,
        delegateName: member.name
      }
      setApprovalSteps(updated)
      toast.success('대결자 지정 완료')
    } else {
      // 결재자 변경
      const updated = [...approvalSteps]
      updated[editingIndex] = {
        ...updated[editingIndex],
        approverId: member.id,
        approverName: member.name,
        approverPosition: member.position,
        isDelegated: false,
        delegateId: undefined,
        delegateName: undefined
      }
      setApprovalSteps(updated)
      toast.success('결재자 변경 완료')
    }

    setIsDialogOpen(false)
  }

  return (
    <>
      <Card className="rounded-2xl" style={{
        borderRadius: 'var(--radius)',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
      }}>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                3
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--card-foreground)',
                lineHeight: 1.5
              }}>
                결재선 지정
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => openDialog(null)}>
              <Plus className="w-4 h-4 mr-2" />
              결재자 추가
            </Button>
          </div>

          {approvalSteps.length === 0 ? (
            <div className="text-center py-8">
              <p style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}>
                결재선이 설정되지 않았습니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 신청자 */}
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <User className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="flex-1">
                  <p style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 600,
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    {currentUser?.name}
                  </p>
                  <p style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4
                  }}>
                    신청자 · {currentUser?.position}
                  </p>
                </div>
                <Badge style={{
                  backgroundColor: 'rgba(22, 205, 199, 0.1)',
                  color: 'var(--secondary)',
                  fontSize: 'var(--font-size-caption)',
                }}>
                  작성 중
                </Badge>
              </div>

              {/* 결재자들 */}
              {approvalSteps.map((step, index) => (
                <div key={step.order}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1">
                      <p style={{
                        fontSize: 'var(--font-size-body)',
                        fontWeight: 600,
                        color: 'var(--card-foreground)',
                        lineHeight: 1.5
                      }}>
                        {step.isDelegated && step.delegateName
                          ? `${step.delegateName} (대결)`
                          : step.approverName}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.4
                      }}>
                        결재자 {step.order} · {step.approverPosition}
                        {step.isDelegated && ` (원 결재자: ${step.approverName})`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(index, false)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(index, true)}
                      >
                        대결
                      </Button>
                    </div>
                  </div>

                  {index < approvalSteps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ChevronRight className="w-5 h-5 rotate-90" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결재자 선택 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex === null ? '결재자 추가' : (isDelegating ? '대결자 지정' : '결재자 변경')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {editingIndex === null ? '결재자 선택 *' : (isDelegating ? '대결자 선택 *' : '결재자 선택 *')}
              </Label>
              <MemberCombobox
                members={approvalMembers}
                value={selectedId}
                onValueChange={setSelectedId}
                placeholder="구성원 검색 및 선택"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirm}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

### 6. ReferenceSelector

**File:** `components/request/ReferenceSelector.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { User, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReferenceStep {
  id: string
  memberId: string
  memberName: string
  memberPosition: string
}

interface ReferenceSelectorProps {
  referenceSteps: ReferenceStep[]
  setReferenceSteps: (steps: ReferenceStep[]) => void
  members: any[]
}

export function ReferenceSelector({
  referenceSteps,
  setReferenceSteps,
  members
}: ReferenceSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  function handleAdd() {
    if (!selectedId) {
      toast.error('참조자를 선택해주세요')
      return
    }

    const member = members.find(m => m.id === selectedId)
    if (!member) return

    setReferenceSteps([...referenceSteps, {
      id: `ref-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberPosition: member.position
    }])

    toast.success('참조자 추가 완료')
    setIsDialogOpen(false)
    setSelectedId('')
  }

  function handleRemove(id: string) {
    setReferenceSteps(referenceSteps.filter(r => r.id !== id))
    toast.success('참조자 제거 완료')
  }

  return (
    <>
      <Card className="rounded-2xl" style={{
        borderRadius: 'var(--radius)',
        boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
      }}>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(22, 205, 199, 0.3)', color: 'white' }}
              >
                <User className="w-4 h-4" />
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--card-foreground)',
                lineHeight: 1.5
              }}>
                참조자 지정 (선택)
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              참조자 추가
            </Button>
          </div>

          {referenceSteps.length === 0 ? (
            <div className="text-center py-8">
              <p style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.5
              }}>
                지정된 참조자가 없습니다
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {referenceSteps.map((reference) => (
                <div
                  key={reference.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(22, 205, 199, 0.1)',
                    border: '1px solid rgba(22, 205, 199, 0.3)'
                  }}
                >
                  <User className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                  <span style={{
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    {reference.memberName}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4
                  }}>
                    ({reference.memberPosition})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(reference.id)}
                    className="ml-1 p-1 rounded hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 참조자 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참조자 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>참조자 선택 *</Label>
              <MemberCombobox
                members={members}
                value={selectedId}
                onValueChange={setSelectedId}
                placeholder="구성원 검색 및 선택"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

### 7. MemberCombobox (재사용 컴포넌트)

**File:** `components/ui/member-combobox.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MemberComboboxProps {
  members: any[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function MemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = '구성원 선택'
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedMember = members.find(m => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMember
            ? `${selectedMember.name} (${selectedMember.position})`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="이름, 부서, 팀으로 검색..." />
          <CommandEmpty>구성원을 찾을 수 없습니다.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {members.map((member) => (
              <CommandItem
                key={member.id}
                value={`${member.name} ${member.position} ${member.department_id} ${member.team}`}
                onSelect={() => {
                  onValueChange(member.id)
                  setOpen(false)
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    value === member.id ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {member.position} · {member.team}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

---

### 8. Server Action

**File:** `app/actions/document.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface DocumentSubmissionData {
  employee_id: string
  document_type: string
  title: string
  form_data: any
  approval_steps: any[]
  reference_steps: any[]
}

export async function submitDocumentRequest(data: DocumentSubmissionData) {
  try {
    const supabase = await createClient()

    // 1. 문서 제출 생성
    const { data: submission, error: submissionError } = await supabase
      .from('document_submission')
      .insert({
        template_id: 1, // TODO: 문서 유형별 template_id 매핑
        employee_id: data.employee_id,
        submission_title: data.title,
        form_data: data.form_data,
        original_approval_line: data.approval_steps,
        modified_approval_line: data.approval_steps,
      })
      .select()
      .single()

    if (submissionError) {
      return { success: false, error: submissionError.message }
    }

    // 2. 결재 인스턴스 생성
    const approvalInstances = data.approval_steps.map((step, index) => ({
      submission_id: submission.id,
      step_order: index + 1,
      approver_id: step.isDelegated ? step.delegateId : step.approverId,
      original_approver_id: step.approverId,
      status: 'pending',
    }))

    const { error: instanceError } = await supabase
      .from('document_approval_instance')
      .insert(approvalInstances)

    if (instanceError) {
      return { success: false, error: instanceError.message }
    }

    // 3. 연차 신청인 경우 leave_request 테이블에도 저장
    if (['annual_leave', 'half_day', 'reward_leave'].includes(data.document_type)) {
      const { error: leaveError } = await supabase
        .from('leave_request')
        .insert({
          employee_id: data.employee_id,
          leave_type: data.form_data.leave_type,
          requested_days: data.form_data.requested_days,
          start_date: data.form_data.start_date,
          end_date: data.form_data.end_date,
          half_day_slot: data.form_data.half_day_slot,
          reason: data.form_data.reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
          document_submission_id: submission.id,
        })

      if (leaveError) {
        console.error('Leave request creation error:', leaveError)
      }
    }

    // 4. 캐시 재검증
    revalidatePath('/request')
    revalidatePath('/leave/my-leave')
    revalidatePath('/dashboard')

    return { success: true, data: submission }
  } catch (error: any) {
    console.error('Submit document request error:', error)
    return { success: false, error: error.message || '알 수 없는 오류가 발생했습니다' }
  }
}
```

---

## 📊 Supabase Queries Summary

### 1. 사용자 정보 조회
```typescript
await supabase
  .from('employee')
  .select('id, name, position, department_id, team, role_id')
  .eq('id', user.id)
  .single()
```

### 2. 연차 잔액 조회
```typescript
await supabase
  .from('annual_leave_balance')
  .select('total_days, used_days, remaining_days, reward_leave_balance')
  .eq('employee_id', employeeId)
  .eq('year', currentYear)
  .single()
```

### 3. 구성원 목록 조회 (결재선용)
```typescript
await supabase
  .from('employee')
  .select('id, name, position, department_id, team, role_id')
  .eq('status', 'active')
  .order('name')
```

### 4. 문서 제출 생성
```typescript
await supabase
  .from('document_submission')
  .insert({
    template_id: templateId,
    employee_id: employeeId,
    submission_title: title,
    form_data: formData,
    original_approval_line: approvalSteps,
  })
  .select()
  .single()
```

### 5. 결재 인스턴스 생성
```typescript
await supabase
  .from('document_approval_instance')
  .insert(approvalInstances)
```

---

## 🔒 RLS Policies

```sql
-- document_submission: 본인만 작성 가능
CREATE POLICY "Users can create own submissions"
ON document_submission FOR INSERT
WITH CHECK (auth.uid()::text = employee_id::text);

-- document_submission: 본인 제출 조회
CREATE POLICY "Users can view own submissions"
ON document_submission FOR SELECT
USING (auth.uid()::text = employee_id::text);

-- document_approval_instance: 결재자는 본인 결재 건 조회
CREATE POLICY "Approvers can view assigned approvals"
ON document_approval_instance FOR SELECT
USING (auth.uid()::text = approver_id::text);

-- document_approval_instance: 결재자는 본인 결재 건 수정
CREATE POLICY "Approvers can update assigned approvals"
ON document_approval_instance FOR UPDATE
USING (auth.uid()::text = approver_id::text);
```

---

## 📋 Task Checklist

### shadcn/ui Components
- [ ] Calendar 컴포넌트 추가
- [ ] Popover 컴포넌트 추가
- [ ] Dialog 컴포넌트 추가
- [ ] RadioGroup 컴포넌트 추가
- [ ] Command 컴포넌트 추가 (MemberCombobox용)

### Pages & Components
- [ ] `app/(authenticated)/request/page.tsx` 생성
- [ ] `components/request/RequestForm.tsx` 생성
- [ ] `components/request/DocumentTypeSelector.tsx` 생성
- [ ] `components/request/LeaveBalanceCards.tsx` 생성
- [ ] `components/request/ApprovalLineSelector.tsx` 생성
- [ ] `components/request/ReferenceSelector.tsx` 생성
- [ ] `components/ui/member-combobox.tsx` 생성
- [ ] `app/actions/document.ts` 생성

### Data Integration
- [ ] Server Action 구현
- [ ] RLS 정책 적용
- [ ] document_template 초기 데이터 생성
- [ ] 캐시 재검증

### UI/UX
- [ ] 4단계 프로세스 UI
- [ ] 문서 유형별 동적 필드 렌더링
- [ ] 날짜 선택 및 일수 계산
- [ ] 연차 잔액 검증
- [ ] 결재선 자동 설정
- [ ] 결재자 변경/대결 UI
- [ ] 참조자 관리 UI
- [ ] 첨부파일 업로드 (선택적)
- [ ] 하단 고정 버튼
- [ ] Toast 알림
- [ ] 에러 처리

### Testing
- [ ] 각 문서 유형별 제출 테스트
- [ ] 결재선 설정 테스트
- [ ] 잔여 연차 부족 시 에러
- [ ] TypeScript 타입 검증
- [ ] ESLint 검증

---

## 📁 File Structure

```
app/
├── (authenticated)/
│   └── request/
│       └── page.tsx                      [CREATE]
└── actions/
    └── document.ts                       [CREATE]
components/
├── request/
│   ├── RequestForm.tsx                   [CREATE]
│   ├── DocumentTypeSelector.tsx          [CREATE]
│   ├── LeaveBalanceCards.tsx             [CREATE]
│   ├── ApprovalLineSelector.tsx          [CREATE]
│   └── ReferenceSelector.tsx             [CREATE]
└── ui/
    └── member-combobox.tsx               [CREATE]
```

---

## 🎨 Design Tokens (Figma 기준)

### Colors
```css
--primary: #635BFF (Primary Purple)
--secondary: #16CDC7 (Secondary Teal)
--card-foreground: #29363D
--muted-foreground: #5B6A72
--border: #E5E8EB

/* Leave Cards */
--leave-total: rgba(41, 54, 61, 0.05)
--leave-used: rgba(91, 106, 114, 0.05)
--leave-remaining: rgba(99, 91, 255, 0.05)
--leave-reward: rgba(255, 102, 146, 0.05)

/* Badges */
--badge-grant: rgba(76, 212, 113, 0.1)
--badge-use: rgba(99, 91, 255, 0.1)
--badge-pending: #FFF8E5
--badge-approved: rgba(76, 212, 113, 0.1)
--badge-rejected: #FFF0ED
```

### Typography
```css
--font-size-h1: 24px
--font-size-h2: 20px
--font-size-body: 14px
--font-size-caption: 12px

--font-weight-h1: 700
--font-weight-h2: 600
```

---

**Phase 4 완료 후:**
```
"Phase 5 구현"
```
