# MUST Access Design System

**생성일:** 2025-01-18  
**출처:** Figma Make Guidelines  
**버전:** 1.0

---

## 📌 개요

본 문서는 MUST Access 프로젝트의 디자인 시스템을 정의합니다. 모든 UI 구현 시 본 가이드라인을 준수하여 일관성 있는 사용자 경험을 제공합니다.

---

## 🎨 Design Tokens

### 1. Colors

#### 브랜드 컬러

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#635BFF` | 주요 포인트 / CTA |
| `--color-secondary` | `#16CDC7` | 보조 포인트 |
| `--color-success` | `#4CD471` | 성공 상태 |
| `--color-warning` | `#F8C653` | 주의/강조 |
| `--color-error` | `#FF6B6B` | 에러 상태 |
| `--color-info` | `#1F99FF` | 정보 표시 |

#### 기본 컬러

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `#E5E8EB` | 테두리 |
| `--color-bg` | `#F8FAFC` | 배경색 |
| `--color-surface` | `#FFFFFF` | 카드/모달 배경 |

#### Gray Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--color-gray-500` | `#A0ACB3` | 중간 톤 |
| `--color-gray-300` | `#D3D9DC` | 연한 회색 |
| `--color-gray-100` | `#F6F8F9` | 매우 연한 회색 |

#### Dashboard 추가 컬러

| Token | Value | Light Variant | Usage |
|-------|-------|---------------|-------|
| `--color-purple` | `#9B51E0` | `#F3E8FF` | 대시보드 Stats Card |
| `--color-orange` | `#FF8A5C` | `#FFF4EF` | 대시보드 Stats Card |
| `--color-cyan` | `#16CDC7` | `#E0F7F6` | 대시보드 Stats Card |
| `--color-pink` | `#FF6BA9` | `#FFE8F3` | 대시보드 Stats Card |
| `--color-green` | `#4CD471` | `#E8F9ED` | 대시보드 Stats Card |

### 2. Spacing

8px 기반 그리드 시스템

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | 최소 간격 |
| `--space-sm` | `8px` | 작은 간격 |
| `--space-md` | `16px` | 기본 간격 |
| `--space-lg` | `24px` | 큰 간격 |
| `--space-xl` | `32px` | 매우 큰 간격 |
| `--space-2xl` | `48px` | 섹션 간격 |
| `--space-3xl` | `64px` | 페이지 섹션 간격 |

### 3. Typography

#### Font Family

```css
--font-family: Pretendard, -apple-system, sans-serif;
```

**CDN Import:**
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css');
```

#### Font Sizes

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| H1 | `22px` | 500 | 1.25 | 페이지 타이틀 |
| H2 | `20px` | 500 | 1.3 | 섹션 제목 |
| Body | `16px` | 400 | 1.5 | 본문 |
| Caption | `14px` | 400 | 1.4 | 부가 설명 |

**Tailwind 사용:**
```tsx
<h1 className="text-h1">페이지 타이틀</h1>
<h2 className="text-h2">섹션 제목</h2>
<p className="text-body">본문 텍스트</p>
<span className="text-caption">부가 설명</span>
```

---

## 📐 Layout Rules

### 1. Grid & Container

- **Base Grid:** 8px 단위
- **Container Max-width:** 1280px
- **Card Radius:** 16px
- **Button Radius:** 8px

**사용 예시:**
```tsx
import { Container } from '@/components/common/container'

<Container maxWidth="container" padding="md">
  {children}
</Container>
```

### 2. Breakpoints

| Device | Width |
|--------|-------|
| Mobile | < 768px |
| Tablet | 768–1024px |
| Desktop | > 1024px |
| Wide | > 1440px |

**Tailwind 사용:**
```tsx
<div className="flex flex-col md:flex-row lg:grid lg:grid-cols-3">
  {/* Mobile: Stack (세로) */}
  {/* Tablet: 2-column */}
  {/* Desktop: 3-column grid */}
</div>
```

### 3. Sidebar (Navigation Bar)

#### 사양
- **Type:** Collapsible Mini Sidebar
- **Expanded:** 270px width (아이콘 + 텍스트)
- **Collapsed:** 80px width (아이콘만, hover 시 tooltip)

#### Active Style
- 배경: `--color-primary` (#635BFF)
- 텍스트/아이콘: `#ffffff`

#### Hover Style
- 배경 opacity 20%
- 전환: 150ms ease-in-out

#### 사용 예시
```tsx
import { Sidebar } from '@/components/common/sidebar'

<Sidebar />
```

### 4. Responsive Behavior

- **Mobile:** Stack (세로 배치)
- **Tablet:** 2-column grid
- **Desktop:** 3-4-column grid

---

## 🎯 Design Guidelines

### 1. Tone & Foundation

- **Tone:** Neutral, Professional, Soft Contrast
- **Font:** Pretendard (KR/EN 통합)
- **Icon Set:** Lucide Icons (상태 표현은 Emoji 사용 가능)
- **Base Grid:** 8px system

### 2. Interaction Rules

#### Hover
- Base 색상에서 **10-15% 어둡게**
- 또는 `filter: brightness(0.9)`

#### Active
- `transform: scale(0.98)`
- 살짝 그림자 변경

#### Focus
- `outline: 2px solid var(--color-primary)`
- `outline-offset: 2px`

#### Disabled
- 중립톤 (`--color-gray-300`)
- `opacity: 0.4`
- `cursor: not-allowed`
- 약간의 grayscale 필터

#### Transition
- 일반: `150ms ease-in-out`
- 모달: `200ms ease-out`

**Tailwind 사용:**
```tsx
<button className="interactive">
  {/* 자동으로 hover, active, focus, disabled 스타일 적용 */}
</button>
```

### 3. Accessibility

- **Contrast ratio:** WCAG AA 이상
- **Focus 스타일:** 명확히 표시
- **aria-label:** 모든 상태·아이콘에 필수
- **컬러 의존 금지:** emoji + text 병행

---

## 🧩 Components

### Component Naming Rule

**구조:** `ComponentName / Variant / State`

**예시:** `Button / Primary / Hover`

---

### 1. Button

**Variants:**
- `primary`: 주요 액션
- `secondary`: 보조 액션
- `ghost`: 투명 배경
- `danger`: 위험한 액션

**Sizes:**
- `sm`: 8px height, 3px padding
- `md`: 10px height, 4px padding (기본)
- `lg`: 12px height, 6px padding

**사용 예시:**
```tsx
import { Button } from '@/components/ui/button'

<Button variant="primary" size="md">
  저장하기
</Button>
```

**스타일:**
- Radius: `8px`
- Transition: `150ms ease-in-out`
- Hover: 10-15% 어둡게
- Active: `scale(0.98)`

---

### 2. Input Field

**Types:**
- Text
- Email
- Password

**States:**
- Default
- Focus: `2px solid var(--color-primary)`
- Error: `border-error`, 하단에 에러 메시지
- Disabled: `--color-gray-300`

**사용 예시:**
```tsx
import { Input } from '@/components/ui/input'

<Input
  label="이메일"
  type="email"
  placeholder="example@must.co.kr"
  error="올바른 이메일을 입력하세요"
/>
```

---

### 3. Card

**스타일:**
- Radius: `16px`
- Shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Background: `--color-surface` (#fff)

**사용 예시:**
```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card'

<Card hover>
  <CardHeader>
    <CardTitle>카드 제목</CardTitle>
    <CardDescription>카드 설명</CardDescription>
  </CardHeader>
  <CardContent>
    내용
  </CardContent>
</Card>
```

---

### 4. Modal/Dialog

**스타일:**
- Overlay: 40% 블러 배경
- Transition: `200ms ease-out`
- Close 버튼: Lucide `X` 아이콘

**사용 예시:**
```tsx
import { Modal, ModalFooter } from '@/components/ui/modal'

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="모달 제목"
  description="모달 설명"
>
  <p>모달 내용</p>
  
  <ModalFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      취소
    </Button>
    <Button variant="primary">
      확인
    </Button>
  </ModalFooter>
</Modal>
```

---

### 5. Badge

#### Status Badge

| Type | Background | Text | Usage |
|------|------------|------|-------|
| Success | `#4CD471` | white | 성공 |
| Warning | `#F8C653` | dark | 주의 |
| Error | `#FF6B6B` | white | 에러 |
| Info | `#1F99FF` | white | 정보 |

#### Priority Badge

| Level | Background | Text | Usage |
|-------|------------|------|-------|
| Very High | `#16CDC7` | white | 최우선 |
| High | `#FF6B6B` | white | 긴급 |
| Medium | `#F8C653` | dark | 보통 |
| Low | `#4CD471` | white | 낮음 |

**사용 예시:**
```tsx
import { Badge } from '@/components/ui/badge'

{/* Status Badge */}
<Badge variant="success">승인됨</Badge>
<Badge variant="warning">대기중</Badge>
<Badge variant="error">거부됨</Badge>

{/* Priority Badge */}
<Badge priority="very-high">최우선</Badge>
<Badge priority="high">긴급</Badge>
<Badge priority="medium">보통</Badge>
<Badge priority="low">낮음</Badge>
```

---

### 6. Stats Card

**구조:**
- 아이콘 + 제목 + 주요 수치
- 선택적 증감률 표시

**아이콘 배경 색상:**
- purple, orange, cyan, pink, green

**사용 예시:**
```tsx
import { StatsCard } from '@/components/dashboard/stats-card'
import { Users } from 'lucide-react'

<StatsCard
  title="전체 직원"
  value="124명"
  icon={Users}
  color="purple"
  trend={{ value: 5, isPositive: true }}
/>
```

---

### 7. Chart Container

**스타일:**
- 배경: `--color-surface`
- Header: 제목 + 설명 + 액션 버튼
- Body: 차트 영역

**시리즈 컬러 순서:**
1. Primary: `#635BFF`
2. Secondary: `#16CDC7`
3. Purple: `#9B51E0`
4. Orange: `#FF8A5C`
5. Cyan: `#16CDC7`
6. Pink: `#FF6BA9`
7. Green: `#4CD471`

**사용 예시:**
```tsx
import { ChartContainer, CHART_COLOR_ARRAY } from '@/components/dashboard/chart-container'
import { LineChart, Line } from 'recharts'

<ChartContainer
  title="월별 출근율"
  description="최근 6개월 출근율 추이"
>
  <LineChart data={data}>
    <Line 
      dataKey="attendance" 
      stroke={CHART_COLOR_ARRAY[0]} 
    />
  </LineChart>
</ChartContainer>
```

---

## 📦 사용 가능한 컴포넌트 목록

### Layout
- `<Sidebar />` - 접을 수 있는 사이드바
- `<Container />` - 반응형 컨테이너

### Common
- `<Button />` - 버튼
- `<Input />` - 입력 필드
- `<Card />` - 카드
- `<Modal />` - 모달/다이얼로그
- `<Badge />` - 뱃지

### Dashboard
- `<StatsCard />` - 통계 카드
- `<ChartContainer />` - 차트 컨테이너

---

## 🎨 CSS 유틸리티 클래스

### 인터랙션

```css
.interactive /* hover, active, focus, disabled 자동 적용 */
.card-shadow /* 카드 그림자 */
.modal-overlay /* 모달 오버레이 */
```

### 사용 예시

```tsx
<div className="interactive card-shadow rounded-card bg-surface p-6">
  인터랙션이 적용된 카드
</div>
```

---

## 🚀 빠른 시작

### 1. 새 페이지 만들기

```tsx
import { Container } from '@/components/common/container'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function MyPage() {
  return (
    <Container maxWidth="container" padding="md">
      <h1 className="text-h1 mb-6">페이지 제목</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>섹션 제목</CardTitle>
        </CardHeader>
        <CardContent>
          내용
        </CardContent>
      </Card>
    </Container>
  )
}
```

### 2. 대시보드 구성

```tsx
import { StatsCard } from '@/components/dashboard/stats-card'
import { ChartContainer } from '@/components/dashboard/chart-container'
import { Users, Calendar, Clock, MapPin } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="전체 직원" value="124명" icon={Users} color="purple" />
        <StatsCard title="금일 출근" value="118명" icon={Clock} color="green" />
        <StatsCard title="연차 사용" value="6명" icon={Calendar} color="orange" />
        <StatsCard title="자유석 사용" value="45석" icon={MapPin} color="cyan" />
      </div>

      {/* Chart */}
      <ChartContainer title="월별 출근율">
        {/* 차트 컴포넌트 */}
      </ChartContainer>
    </div>
  )
}
```

---

## 📚 참고 자료

- **Figma Guidelines:** 원본 디자인 시스템
- **Tailwind Config:** `tailwind.config.ts`
- **Global Styles:** `app/globals.css`
- **Component Library:** `components/` 디렉토리

---

## ✅ 체크리스트

새 컴포넌트/페이지 개발 시 확인사항:

- [ ] Pretendard 폰트 사용
- [ ] 8px 그리드 시스템 준수
- [ ] 디자인 토큰 사용 (직접 색상 코드 금지)
- [ ] 반응형 레이아웃 구현
- [ ] 인터랙션 스타일 적용 (hover, active, focus)
- [ ] Accessibility 고려 (aria-label, contrast ratio)
- [ ] Lucide Icons 사용
- [ ] 150ms transition 적용

---

**문서 버전:** 1.0  
**마지막 업데이트:** 2025-01-18  
**문의:** 개발팀

