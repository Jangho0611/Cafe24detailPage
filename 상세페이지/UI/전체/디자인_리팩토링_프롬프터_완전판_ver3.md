# [UI/UX 리팩토링] Monet Design System + Frontend Design Skill 기반 프로페셔널 웹 구현 - 완전판

## 🔒 PART 0: 기획 상위 선언 (필독)

본 작업은 **디자인 개선(UI Refactoring)** 이며,  
아래 항목은 **기획적으로 이미 확정**된 사항이다.

### ❗ 절대 재해석 금지

- 본 페이지는 마케팅 페이지가 아니다
- 감정 유도, 구매 자극, 히어로 연출을 하지 않는다
- **"와 예쁘다"가 아니라 "정리 잘 됐네"가 목표다**

### ❗ 시각 요소 역할 고정

- **카툰(4컷 만화) 영역**: 공감 / 맥락 / 위트 (설명 금지)
- **일러스트(제품구조) 영역**: 구조 / 다루는 방식 (스토리 금지)
- 두 영역은 절대 혼합하지 않는다

### ❗ 디자인 판단 기준

디자인 선택 시 항상 아래 질문을 우선한다:

1. **시공자가 3초 안에 이해 가능한가?**
2. **설명 없이도 '성격'이 보이는가?**
3. **정보 탐색 속도가 빨라졌는가?**

위 기준에 어긋나는 디자인은  
아무리 보기 좋아도 **실패**로 간주한다.

---

## 📦 프로젝트 맥락

**클라이언트**: 자트(Zart) - B2B 건설자재 유통 플랫폼  
**목표**: 랜딩페이지 ↔ 상세페이지 시각적 일관성 확보  
**레퍼런스 시스템**: [Monet Design Registry](https://github.com/monet-design/monet-registry) (1007+ 컴포넌트)  
**수정 대상 파일**: `Cafe24_prdDetail_완성코드_optimized.html`

---

## 🎯 핵심 미션

> "AI가 만든 티를 완전히 제거하고,  
> **Brutalist + Swiss Typography 기반**의  
> 전문적이고 신뢰감 있는 B2B 플랫폼 구현"

**페이지 목적**: 제품 설명 + 신뢰 확보 + 편리한 정보 탐색

---

## 🚨 작업 시작 전 필수 확인 사항 (CRITICAL!)

### 1. 색상 추출 결과 선공유 (필수)

**⚠️ 색상 추출 없이 작업 시작 금지!**

```
1단계: 랜딩페이지 색상 추출 완료
2단계: 추출한 색상값을 클라이언트에게 먼저 보고
3단계: 승인 받은 후 본 작업 시작
```

**추출 결과 보고 양식**:
```markdown
## 랜딩페이지 색상 추출 결과

| 요소 | 추출된 색상값 | 비고 |
|-----|------------|------|
| 메인 제목 | #______ | h1, h2 적용 예정 |
| 본문 텍스트 | #______ | p, span 적용 예정 |
| 링크 | #______ | a 태그 기본 |
| 링크 호버 | #______ | a:hover |
| 강조 | #______ | .price, .accent |

승인 후 작업 시작하겠습니다.
```

**색상이 빗나가면 전체 분위기가 깨집니다. 이 단계를 반드시 거치세요.**

---

### 2. 폰트 로드 확인 (필수)

**Pretendard Variable 웹폰트 사용**

Cafe24 환경에서 해당 폰트가 로드되고 있는지 확인:

```css
/* CSS 최상단에 추가 */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

/* 또는 */
@font-face {
  font-family: 'Pretendard Variable';
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2') format('woff2-variations');
}
```

**폰트 미적용 시 대체 폰트 스택**:
```css
font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
```

---

### 3. 이미지 에셋 스타일 가이드 (필수)

**모든 이미지는 카드 스타일과 통일**

```css
/* ===== 4컷 만화 이미지 ===== */
.comic-panel img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px; /* 카드와 동일한 곡률 */
  /* 그림자는 추가하지 않음 (카드 자체에 이미 그림자 있음) */
}

/* ===== 제품구조 일러스트 ===== */
.product-structure img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px; /* 카드와 동일한 곡률 */
}

/* ===== 타임라인 아이콘/이미지 (있을 경우) ===== */
.timeline-item img {
  border-radius: 4px;
}
```

**이미지 처리 원칙**:
- ✅ 모든 이미지에 `border-radius: 4px` 적용
- ✅ 이미지 자체에 그림자 추가하지 않음 (카드 그림자로 충분)
- ✅ 배경이 투명한 PNG는 흰색 배경 추가 고려
- ✅ 고해상도 이미지 사용 (Retina 대응)

---

## 🎨 PART 1: Design Tokens 시스템 구축

### 1-1. 랜딩페이지 색상 DNA 추출 (필수 작업)

**작업 순서**:
```bash
1) https://ecudemo387548.cafe24.com/product/list.html?cate_no=30 접속
2) F12 개발자 도구 → Elements 탭
3) 아래 요소들의 실제 색상값 추출
```

**추출 대상 및 CSS 변수 매핑**:

| UI 요소 | CSS Selector 예시 | 추출할 속성 | 변수명 |
|---------|-----------------|-----------|-------|
| **제목 텍스트** | `h1, .product-name` | `color` | `--zart-text-primary` |
| **본문 텍스트** | `p, .description` | `color` | `--zart-text-body` |
| **보조 텍스트** | `.sub-text, .caption` | `color` | `--zart-text-secondary` |
| **링크** | `a` | `color` | `--zart-link` |
| **링크 호버** | `a:hover` | `color` | `--zart-link-hover` |
| **강조/액센트** | `.price, .highlight` | `color` | `--zart-accent` |
| **버튼 배경** | `.btn-primary` | `background-color` | `--zart-button-bg` |

**CSS 변수 템플릿**:
```css
:root {
  /* ===== 랜딩페이지 추출 색상 ===== */
  --zart-text-primary: #추출값;    /* 메인 제목 */
  --zart-text-body: #추출값;       /* 본문 */
  --zart-text-secondary: #추출값;  /* 보조 */
  --zart-link: #추출값;
  --zart-link-hover: #추출값;
  --zart-accent: #추출값;
  --zart-button-bg: #추출값;
  
  /* ===== Brutalist Industrial 팔레트 ===== */
  /* 배경색은 생략 - 순백색 베이스 사용 */
  --zart-bg: #FFFFFF;
  --zart-surface: #F8F8F8;         /* 카드 배경 */
  
  /* ===== 목재 산업 특화 색상 ===== */
  --zart-wood-natural: #D4A574;    /* Natural Oak - 목재 연상 */
  --zart-urgent: #E86C3A;          /* Rust Orange - 재고 경고 */
  --zart-border: rgba(0,0,0,0.06); /* 섹션 구분선 */
}
```

---

### 1-2. Monet Design System 스타일 태그 적용

**Monet의 핵심 디자인 철학** (1007개 컴포넌트 분석 결과):
- **Modern 스타일**: `light-theme` + `modern` 태그 조합
- **최소한의 곡률**: `border-radius: 2px~4px` (Brutalist 영향)
- **미묘한 그림자**: Elevation 1-2단계만 사용
- **Grid 기반 레이아웃**: 2-column, 3-column 등 명확한 구조

**적용할 컴포넌트 스타일**:

```css
/* ===== Monet Modern Card 프리셋 ===== */
.card {
  background: var(--zart-bg);
  border-radius: 4px; /* Monet Modern 표준 */
  padding: 24px; /* 카드 내부 패딩 */
  
  /* Subtle Elevation (Monet 1단계) */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04);
  
  /* GPU 최적화 Hover */
  transition: 
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card:hover {
  transform: translateY(-2px); /* 미세한 lift-up */
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.08);
}

/* ===== Monet Grid Layout ===== */
.grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px; /* 3 units (8pt grid) */
}

.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .grid-3col {
    grid-template-columns: 1fr;
  }
}
```

---

### 1-3. Frontend Design Skill - AI 디자인 제거 원칙

#### ❌ **절대 금지 요소** (AI 티 제거)

```css
/* ❌ 무지개 그라데이션 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* ❌ 과도한 블러 */
backdrop-filter: blur(100px);

/* ❌ 네온 글로우 */
box-shadow: 0 0 50px rgba(102, 126, 234, 0.6);

/* ❌ 3D 아이소메트릭 */
transform: rotateX(45deg) rotateZ(45deg);

/* ❌ 과도한 애니메이션 */
animation: rainbow 5s infinite;
```

#### ✅ **건설자재 산업 특화 스타일**

```css
:root {
  /* ===== Typography Scale (Major Third 1.25) ===== */
  --text-xs: clamp(0.8rem, 2vw, 0.8rem);     /* 12.8px */
  --text-sm: clamp(1rem, 2.5vw, 1rem);       /* 16px */
  --text-base: clamp(1.25rem, 3vw, 1.25rem); /* 20px */
  --text-lg: clamp(1.563rem, 3.5vw, 1.563rem); /* 25px */
  --text-xl: clamp(1.953rem, 4vw, 1.953rem);  /* 31.25px */
  --text-2xl: clamp(2.441rem, 5vw, 2.441rem); /* 39px */
  
  /* ===== 황금비율 여백 (8pt Grid System) ===== */
  --space-unit: 8px;
  --space-xs: 16px;   /* 2 units - 작은 간격 */
  --space-sm: 24px;   /* 3 units - 카드 내부 */
  --space-md: 40px;   /* 5 units - 카드 간 간격 */
  --space-lg: 64px;   /* 8 units - 주요 섹션 */
  --space-xl: 104px;  /* 13 units - 대형 섹션 */
  
  /* ===== 전문성을 위한 타이포그래피 ===== */
  --font-primary: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif;
  --letter-spacing-tight: -0.02em; /* Swiss Typography */
  --line-height-heading: 1.2;
  --line-height-body: 1.6;
}

/* ===== Swiss Typography 원칙 ===== */
body {
  font-family: var(--font-primary);
  letter-spacing: var(--letter-spacing-tight);
  font-feature-settings: "tnum" 1; /* 가격 표시용 고정폭 숫자 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3 {
  text-wrap: balance; /* 시각적 균형 */
  line-height: var(--line-height-heading);
  color: var(--zart-text-primary);
}

p {
  text-wrap: pretty; /* 가독성 최적화 */
  line-height: var(--line-height-body);
  color: var(--zart-text-body);
}

/* ===== Industrial 디테일 ===== */
.section {
  border-top: 1px solid var(--zart-border);
  position: relative;
}

.section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 1px;
  background: var(--zart-wood-natural); /* 목재 액센트 */
}
```

---

## 📐 PART 2: 레이아웃 시스템 (Monet Grid 기반)

### 2-1. 섹션 간격 표준화

**기존 문제**:
```html
<!-- ❌ 불규칙한 간격 -->
<div style="padding: 20px;">차별점</div>
<div style="padding: 40px;">가격 트렌드</div>
<div style="padding: 30px;">상세 스펙</div>
```

**개선안** (8pt Grid 기준):
```html
<!-- ✅ 통일된 클래스 기반 시스템 -->
<section class="section section--md">   <!-- 64px 상하 여백 -->
  <div class="section__content">차별점</div>
</section>

<section class="section section--md">   <!-- 64px 상하 여백 -->
  <div class="section__content">가격 트렌드</div>
</section>
```

```css
/* ===== Section 시스템 ===== */
.section {
  padding-inline: max(16px, 5vw); /* 좌우 반응형 여백 */
  container-type: inline-size; /* Container Query 준비 */
  background: var(--zart-bg);
}

.section--tight { padding-block: var(--space-md); }    /* 40px */
.section--md { padding-block: var(--space-lg); }       /* 64px */
.section--lg { padding-block: var(--space-xl); }       /* 104px */

/* 섹션 구분선 */
.section + .section {
  border-top: 1px solid var(--zart-border);
}

/* 790px 고정폭 컨테이너 (Cafe24 기준) */
.section__content {
  max-width: 790px;
  margin: 0 auto;
  width: 100%;
}
```

---

### 2-2. 반응형 Grid 시스템 (Monet 스타일)

```css
/* ===== Monet Modern Grid ===== */
.grid {
  display: grid;
  gap: var(--space-sm); /* 24px */
}

.grid--2col {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
}

.grid--3col {
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    gap: var(--space-xs); /* 16px */
  }
}
```

---

## 🏗️ PART 3: 콘텐츠 구조 & 카드 레이아웃 (NEW!)

### 3-1. 전체 구조 개요

**페이지 목적**: 제품 설명 + 신뢰 확보 + 편리한 정보 탐색

**섹션 순서** (위 → 아래):
```
1. 카드 1: 오늘 견적건수 + 가격동향 + 대산의 차별화
2. 카드 2: 제품구조
3. 카드 3: 4컷 만화
4. 카드 4: 타임라인
```

**레이아웃 규칙**:
- 전체 폭: **790px 고정**
- 카드 간 간격: **40px** (--space-md)
- 카드 내부 패딩: **24px** (--space-sm)
- 모바일: 동일한 순서 유지

---

### 3-2. 카드 1: 신뢰 확보 섹션 (견적건수 + 가격동향 + 차별화)

**목적**: 고객 신뢰 확보를 위한 실시간 데이터 + 차별화 포인트

#### 3-2-1. 오늘 견적건수 (미니멀 + 다이나믹)

**디자인 컨셉**: 큰 숫자 강조 + 미세한 애니메이션

```html
<div class="quote-counter">
  <span class="quote-counter__number" id="todayQuotes">152</span>
  <span class="quote-counter__label">건</span>
  <p class="quote-counter__description">오늘 견적 요청</p>
</div>
```

```css
.quote-counter {
  text-align: center;
  padding: var(--space-sm) 0;
}

.quote-counter__number {
  font-size: var(--text-2xl); /* 39px */
  font-weight: 700;
  color: var(--zart-accent);
  font-feature-settings: "tnum" 1; /* 고정폭 숫자 */
  
  /* 다이나믹 효과 - 숫자 변경 시 부드러운 전환 */
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.quote-counter__number.updated {
  animation: pulse 0.5s ease-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.quote-counter__label {
  font-size: var(--text-lg);
  color: var(--zart-text-secondary);
  margin-left: 4px;
}

.quote-counter__description {
  font-size: var(--text-sm);
  color: var(--zart-text-secondary);
  margin-top: 8px;
}
```

---

#### 3-2-2. 가격동향 차트 (간단한 라인 차트)

**디자인 컨셉**: 미니멀한 라인 + 절제된 색상

```html
<div class="price-trend">
  <h3 class="price-trend__title">최근 30일 가격 동향</h3>
  <div class="price-trend__chart" id="priceChart">
    <!-- 차트 렌더링 영역 (기존 로직 유지) -->
  </div>
  <p class="price-trend__note">* 참고용 데이터입니다</p>
</div>
```

```css
.price-trend {
  margin-top: var(--space-md);
}

.price-trend__title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-xs);
  color: var(--zart-text-primary);
}

.price-trend__chart {
  height: 200px;
  /* 차트 스타일은 기존 로직 활용 */
  /* 라인 색상: var(--zart-accent) */
  /* 그리드: rgba(0,0,0,0.06) */
}

.price-trend__note {
  font-size: var(--text-xs);
  color: var(--zart-text-secondary);
  margin-top: 8px;
  text-align: right;
}
```

---

#### 3-2-3. 대산의 차별화 (3개 아이템 가로 나열)

**디자인 컨셉**: 아이콘 + 제목 + 설명, 균등 배치

```html
<div class="differentiators">
  <h3 class="differentiators__title">자트의 차별점</h3>
  <div class="differentiators__grid">
    
    <div class="differentiator-item">
      <div class="differentiator-item__icon">🎯</div>
      <h4 class="differentiator-item__title">실시간 가격</h4>
      <p class="differentiator-item__description">ERP 연동으로 정확한 가격 제공</p>
    </div>
    
    <div class="differentiator-item">
      <div class="differentiator-item__icon">✂️</div>
      <h4 class="differentiator-item__title">무료 재단</h4>
      <p class="differentiator-item__description">원하는 사이즈로 즉시 재단</p>
    </div>
    
    <div class="differentiator-item">
      <div class="differentiator-item__icon">🚚</div>
      <h4 class="differentiator-item__title">당일 배송</h4>
      <p class="differentiator-item__description">오전 주문 시 당일 출고</p>
    </div>
    
  </div>
</div>
```

```css
.differentiators {
  margin-top: var(--space-md);
}

.differentiators__title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--zart-text-primary);
}

.differentiators__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.differentiator-item {
  text-align: center;
  padding: var(--space-xs);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.differentiator-item:hover {
  background-color: var(--zart-surface);
}

.differentiator-item__icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.differentiator-item__title {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--zart-text-primary);
}

.differentiator-item__description {
  font-size: var(--text-sm);
  color: var(--zart-text-secondary);
  line-height: 1.4;
}

/* 모바일 */
@media (max-width: 768px) {
  .differentiators__grid {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }
}
```

---

### 3-3. 카드 2: 제품구조 (아코디언)

**디자인 컨셉**: 정보량 많은 스펙을 접어서 정리

```html
<div class="card product-structure">
  <h3 class="product-structure__title">제품 구조</h3>
  
  <div class="accordion">
    
    <div class="accordion-item">
      <button class="accordion-item__header" aria-expanded="false">
        <span>기본 구조</span>
        <span class="accordion-item__icon">▼</span>
      </button>
      <div class="accordion-item__content">
        <p>OSB 합판의 기본 구조 설명...</p>
      </div>
    </div>
    
    <div class="accordion-item">
      <button class="accordion-item__header" aria-expanded="false">
        <span>소재 특성</span>
        <span class="accordion-item__icon">▼</span>
      </button>
      <div class="accordion-item__content">
        <p>소재 특성 설명...</p>
      </div>
    </div>
    
    <!-- 추가 아코디언 아이템 -->
    
  </div>
</div>
```

```css
.product-structure__title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--zart-text-primary);
}

.accordion-item {
  border-bottom: 1px solid var(--zart-border);
}

.accordion-item:last-child {
  border-bottom: none;
}

.accordion-item__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--zart-text-primary);
  text-align: left;
  transition: color 0.2s ease;
}

.accordion-item__header:hover {
  color: var(--zart-accent);
}

.accordion-item__icon {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  font-size: var(--text-sm);
  color: var(--zart-text-secondary);
}

.accordion-item__header[aria-expanded="true"] .accordion-item__icon {
  transform: rotate(180deg);
}

.accordion-item__content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.accordion-item__header[aria-expanded="true"] + .accordion-item__content {
  max-height: 500px; /* 충분한 높이 */
  padding-bottom: var(--space-xs);
}

.accordion-item__content p {
  font-size: var(--text-sm);
  color: var(--zart-text-body);
  line-height: 1.6;
}
```

**JavaScript (기존 코드 아래 추가)**:
```javascript
// 아코디언 기능
document.querySelectorAll('.accordion-item__header').forEach(header => {
  header.addEventListener('click', function() {
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    // 모든 아코디언 닫기
    document.querySelectorAll('.accordion-item__header').forEach(h => {
      h.setAttribute('aria-expanded', 'false');
    });
    
    // 클릭한 아코디언만 토글
    if (!isExpanded) {
      this.setAttribute('aria-expanded', 'true');
    }
  });
});
```

---

### 3-4. 카드 3: 4컷 만화 (2×2 그리드)

**디자인 컨셉**: 기존 만화 스타일 유지, 깔끔한 그리드 배치

```html
<div class="card comic-section">
  <h3 class="comic-section__title">OSB 합판, 이렇게 사용하세요!</h3>
  
  <div class="comic-grid">
    
    <div class="comic-panel">
      <img src="comic-1.jpg" alt="1컷: 제품 선택">
      <p class="comic-panel__caption">1. 용도에 맞는 두께 선택</p>
    </div>
    
    <div class="comic-panel">
      <img src="comic-2.jpg" alt="2컷: 사이즈 확인">
      <p class="comic-panel__caption">2. 필요한 사이즈 측정</p>
    </div>
    
    <div class="comic-panel">
      <img src="comic-3.jpg" alt="3컷: 재단 서비스">
      <p class="comic-panel__caption">3. 무료 재단 서비스 이용</p>
    </div>
    
    <div class="comic-panel">
      <img src="comic-4.jpg" alt="4컷: 설치 완료">
      <p class="comic-panel__caption">4. 현장 시공 완료!</p>
    </div>
    
  </div>
</div>
```

```css
.comic-section__title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--zart-text-primary);
  text-align: center;
}

.comic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-xs);
}

.comic-panel {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  background: var(--zart-surface);
}

.comic-panel img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.comic-panel:hover img {
  transform: scale(1.02);
}

.comic-panel__caption {
  padding: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--zart-text-body);
  text-align: center;
  background: var(--zart-bg);
  border-top: 1px solid var(--zart-border);
}

/* 모바일 */
@media (max-width: 768px) {
  .comic-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }
}
```

---

### 3-5. 카드 4: 타임라인 (세로형)

**디자인 컨셉**: 명확한 프로세스 단계 표현

```html
<div class="card timeline-section">
  <h3 class="timeline-section__title">주문부터 배송까지</h3>
  
  <div class="timeline">
    
    <div class="timeline-item">
      <div class="timeline-item__marker">1</div>
      <div class="timeline-item__content">
        <h4 class="timeline-item__title">주문 접수</h4>
        <p class="timeline-item__description">오전 10시까지 주문 시 당일 처리</p>
        <span class="timeline-item__time">~ 10:00 AM</span>
      </div>
    </div>
    
    <div class="timeline-item">
      <div class="timeline-item__marker">2</div>
      <div class="timeline-item__content">
        <h4 class="timeline-item__title">재단 작업</h4>
        <p class="timeline-item__description">정밀 재단 및 품질 검수</p>
        <span class="timeline-item__time">10:00 ~ 14:00</span>
      </div>
    </div>
    
    <div class="timeline-item">
      <div class="timeline-item__marker">3</div>
      <div class="timeline-item__content">
        <h4 class="timeline-item__title">포장 및 출고</h4>
        <p class="timeline-item__description">안전한 포장 후 물류센터 이동</p>
        <span class="timeline-item__time">14:00 ~ 16:00</span>
      </div>
    </div>
    
    <div class="timeline-item">
      <div class="timeline-item__marker">4</div>
      <div class="timeline-item__content">
        <h4 class="timeline-item__title">배송 완료</h4>
        <p class="timeline-item__description">지정 현장으로 안전 배송</p>
        <span class="timeline-item__time">익일 오전</span>
      </div>
    </div>
    
  </div>
</div>
```

```css
.timeline-section__title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--zart-text-primary);
}

.timeline {
  position: relative;
  padding-left: 40px;
}

/* 세로 연결선 */
.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--zart-border);
}

.timeline-item {
  position: relative;
  margin-bottom: var(--space-sm);
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-item__marker {
  position: absolute;
  left: -40px;
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--zart-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.timeline-item__content {
  background: var(--zart-surface);
  padding: var(--space-xs);
  border-radius: 4px;
  border-left: 3px solid var(--zart-accent);
}

.timeline-item__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--zart-text-primary);
  margin-bottom: 4px;
}

.timeline-item__description {
  font-size: var(--text-sm);
  color: var(--zart-text-body);
  line-height: 1.5;
  margin-bottom: 8px;
}

.timeline-item__time {
  display: inline-block;
  font-size: var(--text-xs);
  color: var(--zart-text-secondary);
  background: var(--zart-bg);
  padding: 4px 8px;
  border-radius: 2px;
  font-weight: 500;
}
```

---

### 3-6. 카드 간격 및 전체 레이아웃

```css
/* ===== 카드 시스템 통합 ===== */
.product-detail-section {
  max-width: 790px;
  margin: 0 auto;
  padding: var(--space-lg) 0;
}

.card + .card {
  margin-top: var(--space-md); /* 40px 카드 간 간격 */
}

/* 모바일 최적화 */
@media (max-width: 768px) {
  .product-detail-section {
    padding: var(--space-md) var(--space-xs);
  }
  
  .card {
    padding: var(--space-xs);
  }
  
  .card + .card {
    margin-top: var(--space-sm); /* 모바일에서는 24px */
  }
}
```

---

## ⚡ PART 4: 스크롤 인터랙션

### 4-1. 현재 문제점 진단

```
❌ 여러 섹션이 동시에 등장 → 시각적 혼란
❌ 섹션 내부 요소들이 뒤섞여서 나타남
❌ 애니메이션 타이밍이 부자연스러움
```

### 4-2. 개선 목표

```
✅ 한 번에 1개 카드만 등장
✅ 카드가 완전히 나타난 후 다음 카드 시작
✅ 카드 내부 요소는 동시에 표시 (단순화)
✅ 자연스러운 cubic-bezier 가속도
```

### 4-3. 구현 코드 (기존 JS 수정 금지!)

**HTML 수정** - 모든 카드에 속성 추가:
```html
<!-- data-animate 속성을 각 카드에 추가 -->
<div class="card" data-animate="fade-up">
  <!-- 카드 내용 -->
</div>

<div class="card" data-animate="fade-up">
  <!-- 카드 내용 -->
</div>
```

**CSS 애니메이션**:
```css
/* ===== 초기 상태 - 숨김 ===== */
[data-animate] {
  opacity: 0;
  transform: translateY(30px);
  
  /* 부드러운 전환 */
  transition: 
    opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  
  /* GPU 가속 힌트 */
  will-change: opacity, transform;
}

/* ===== 활성화 상태 - 표시 ===== */
[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
  
  /* 애니메이션 완료 후 최적화 */
  will-change: auto;
}

/* ===== 접근성: 모션 감소 설정 존중 ===== */
@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    transition: none;
    opacity: 1;
    transform: none;
  }
}
```

**JavaScript 추가** (기존 코드 아래에 추가):
```javascript
// ===== 카드별 순차 등장 제어 =====
document.addEventListener('DOMContentLoaded', function() {
  // Intersection Observer 설정
  const observerOptions = {
    root: null, // 뷰포트 기준
    rootMargin: '-80px 0px', // 뷰포트 상단에서 80px 내려왔을 때
    threshold: 0.15 // 카드의 15%가 보일 때 트리거
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 카드가 뷰포트에 진입하면 활성화
        entry.target.classList.add('is-visible');
        
        // 한 번 등장한 카드는 관찰 중단 (재생 방지)
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 모든 카드에 옵저버 적용
  const cards = document.querySelectorAll('[data-animate]');
  cards.forEach(card => {
    observer.observe(card);
  });
});
```

---

## 🚨 PART 5: 제약 사항 (Critical!)

### 5-0. Cafe24 에디터 최적화 필수 (가장 중요!)

**⚠️ 최종 제출 코드는 Cafe24 에디터에서 안전하게 동작해야 합니다**

업로드된 참고 파일: `Cafe24_prdDetail_완성코드_optimized.html`을 기준으로 작업하세요.

#### Cafe24 에디터 특수 환경

```html
<!-- 
Cafe24 상품 상세 페이지 에디터는 <div id="prdDetail"> 내부에 
HTML을 삽입하는 구조입니다.
-->

<!-- ❌ 잘못된 방식 (일반 웹 개발) -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="product">...</div>
</body>
</html>

<!-- ✅ 올바른 방식 (Cafe24 에디터) -->
<style>
  /* 모든 CSS는 <style> 태그 내부에 */
  .zart-pdp-wrapper { ... }
</style>

<div class="zart-pdp-wrapper">
  <!-- 모든 HTML 콘텐츠 -->
</div>

<script>
  /* 모든 JavaScript는 <script> 태그 내부에 */
  (function() {
    'use strict';
    // 즉시 실행 함수로 전역 오염 방지
  })();
</script>
```

#### 필수 최적화 규칙

**1. 네임스페이스 사용 (ID 충돌 방지)**
```css
/* ❌ 일반 선택자 사용 금지 */
#counter { ... }
.section { ... }

/* ✅ 접두사 사용 필수 */
#zartQuoteCount { ... }
.zart-section { ... }
.zart-pdp-wrapper { ... }
```

**2. CSS 초기화 (기존 스타일 간섭 방지)**
```css
/* Cafe24 기본 스타일 오버라이드 */
.zart-pdp-wrapper * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.zart-pdp-wrapper {
  max-width: 790px;
  margin: 0 auto;
  overflow-x: hidden; /* 가로 스크롤 방지 */
}
```

**3. JavaScript 즉시 실행 함수 (전역 오염 방지)**
```javascript
<script>
(function() {
  'use strict';
  
  var initApp = function() {
    // 모든 로직을 여기에
    var counter = document.getElementById('zartQuoteCount');
    // ...
  };
  
  // DOM 준비 확인
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
</script>
```

**4. 단일 파일 구조**
```
전체 코드 = <style> + <div> + <script>

외부 파일 참조 금지:
❌ <link rel="stylesheet" href="...">
❌ <script src="..."></script>
❌ import ... from ...

모든 것을 하나의 HTML 파일에 포함
```

**5. 반응형 대응**
```css
/* 790px 고정폭이지만 모바일 여백 고려 */
@media (max-width: 820px) {
  .zart-pdp-wrapper {
    padding: 0 16px;
  }
}
```

#### 제출 파일 형식

```
📦 최종 제출물
└── Cafe24_prdDetail_refactored.html  (단일 파일)
    ├── <style>...</style>              ← 모든 CSS
    ├── <div class="zart-pdp-wrapper">  ← 모든 HTML
    │   ├── 카드 1
    │   ├── 카드 2
    │   ├── 카드 3
    │   └── 카드 4
    └── <script>...</script>            ← 모든 JavaScript
```

**참고 파일 확인**:
- 업로드된 `Cafe24_prdDetail_완성코드_optimized.html` 파일의 구조를 따르세요
- 특히 `.zart-` 접두사, 즉시 실행 함수 패턴 준수

---

### 5-1. 절대 수정 금지 영역

```html
<!-- ❌ 이 ID들은 절대 변경/삭제 금지 -->
<div id="zartQuoteCount"><!-- 견적 건수 카운터 --></div>
<div id="zartLastUpdate"><!-- 실시간 시간 --></div>
<div id="zartTimelineProgress"><!-- 타임라인 프로그레스 바 --></div>

<!-- ❌ 기존 JavaScript 함수 수정 금지 -->
<script>
  // 이 영역의 로직은 건드리지 말 것
  var initApp = function() {
    // 카운터 애니메이션
    // 스크롤 인터랙션
    // 타임라인 프로그레스
  };
</script>
```

### 5-2. 허용된 작업

```html
<!-- ✅ ID는 유지하되, 클래스 추가 및 스타일 변경 가능 -->
<div 
  id="zartQuoteCount" 
  class="quote-counter__number"
  style="color: var(--zart-accent); font-size: var(--text-2xl);"
>

<!-- ✅ 클래스 추가 가능 (기능 보존) -->
<div id="zartTimelineProgress" class="timeline-progress-bar">

<!-- ✅ 새로운 애니메이션/로직 추가 가능 -->
<script>
(function() {
  'use strict';
  
  // 기존 initApp 함수는 그대로 유지
  var initApp = function() {
    // 기존 로직...
  };
  
  // ✅ 새로운 기능 추가는 허용 (기존 로직 호출)
  var additionalFeatures = function() {
    // 아코디언 기능 추가
    document.querySelectorAll('.accordion-item__header').forEach(function(header) {
      header.addEventListener('click', function() {
        // 새로운 기능
      });
    });
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initApp(); // ✅ 기존 함수 호출
      additionalFeatures(); // ✅ 새 기능 추가
    });
  } else {
    initApp();
    additionalFeatures();
  }
})();
</script>
```

### 5-3. 기획 문서 및 기능은 절대 수정 금지

```
❌ 섹션 순서 변경 불가
❌ 콘텐츠 내용 수정 불가
❌ 기능 로직 수정 불가

✅ UI 스타일링만 작업
✅ 레이아웃 최적화
✅ 애니메이션 개선
```

---

## 📊 PART 6: 결과물 체크리스트

### 6-1. 제출 파일 목록

```
📦 deliverables/
├── Cafe24_prdDetail_refactored.html  # 리팩토링 완료 파일
└── REFACTORING_REPORT.md             # 변경사항 상세 리포트
```

### 6-2. 리포트 작성 양식 (텍스트만)

```markdown
# 리팩토링 보고서

## 1. 색상 시스템

### 1-1. 랜딩페이지 추출 색상
| 요소 | 추출된 색상값 | CSS 변수명 | 적용 범위 |
|-----|------------|-----------|---------|
| 메인 제목 | #______ | --zart-text-primary | h1, h2 |
| 본문 텍스트 | #______ | --zart-text-body | p, span |
| 링크 | #______ | --zart-link | a |
| 링크 호버 | #______ | --zart-link-hover | a:hover |
| 강조 | #______ | --zart-accent | .price |

### 1-2. 랜딩페이지 일관성 확보 방법
- 추출한 색상을 CSS 변수로 통일
- 모든 제목, 본문, 링크에 일관되게 적용
- 배경색은 순백색(#FFFFFF)으로 통일
- 목재 액센트는 Natural Oak(#D4A574)로 제한적 사용

---

## 2. 레이아웃 개선

### 2-1. 카드 시스템 적용
| 요소 | 적용 값 |
|-----|--------|
| 카드 간 간격 | 40px (--space-md) |
| 카드 내부 패딩 | 24px (--space-sm) |
| 전체 폭 | 790px 고정 |
| Border Radius | 4px (Monet Modern) |

### 2-2. Monet Design 적용 요소
- [x] Modern 카드 프리셋 (border-radius: 4px, subtle shadow)
- [x] Typography Scale (Major Third 1.25 ratio)
- [x] 8pt Grid 시스템 (16px, 24px, 40px, 64px, 104px)
- [x] Grid Layout (2-column, 3-column 반응형)

---

## 3. 콘텐츠 구조

### 3-1. 4개 카드 구성
| 카드 | 내용 | 레이아웃 |
|-----|-----|---------|
| 카드 1 | 견적건수 + 가격동향 + 차별화 | 복합 레이아웃 |
| 카드 2 | 제품구조 | 아코디언 |
| 카드 3 | 4컷 만화 | 2×2 그리드 |
| 카드 4 | 타임라인 | 세로형 |

### 3-2. 각 섹션별 특징
- 견적건수: 큰 숫자 강조 + pulse 애니메이션
- 가격동향: 미니멀 라인 차트
- 차별화: 3개 아이템 가로 배치 + 아이콘
- 제품구조: 접기/펼치기 아코디언
- 4컷 만화: 2×2 그리드, 기존 스타일 유지
- 타임라인: 세로형 + 숫자 마커

---

## 4. 애니메이션 변경

### 4-1. 기존 문제점
- 여러 섹션 동시 등장으로 번잡함
- 카드 내부 요소가 뒤섞여서 표시됨
- easing 함수가 부자연스러움

### 4-2. 개선 내용
- Intersection Observer로 카드별 순차 등장
- rootMargin: '-80px' 설정으로 적절한 타이밍
- cubic-bezier(0.2, 0.8, 0.2, 1) 적용
- prefers-reduced-motion 접근성 대응

### 4-3. 성능 지표
- GPU 가속 속성만 사용 (transform, opacity)
- will-change 최적화
- 60fps 유지 확인

---

## 5. Frontend Design Skill 적용

### 5-1. AI 디자인 티 제거
- [x] 무지개 그라데이션 제거
- [x] 과도한 블러 효과 제거
- [x] 네온 글로우 제거
- [x] 불필요한 애니메이션 단순화

### 5-2. Brutalist + Swiss 스타일 구현
- [x] 최소한의 곡률 (border-radius: 4px)
- [x] 명확한 타이포그래피 위계
- [x] Tight letter-spacing (-0.02em)
- [x] Industrial 색상 팔레트

---

## 6. 인터랙션

### 6-1. 호버 효과
- [x] 카드: 미세한 lift-up (-2px)
- [x] 차별화 아이템: 배경색 변화
- [x] 4컷 만화: 이미지 scale(1.02)
- [x] 아코디언: 색상 변화

---

## 7. 접근성 향상
- [x] prefers-reduced-motion 대응
- [x] 명확한 포커스 스타일
- [x] 시맨틱 HTML 구조
- [x] ARIA 속성 (아코디언)

---

## 8. 반응형 개선
- [x] Container Query 준비
- [x] clamp() 함수로 유동적 타이포그래피
- [x] auto-fit Grid 레이아웃
- [x] 모바일에서 동일한 섹션 순서 유지

---

## 9. 작업 중 발견한 추가 개선사항
- (여기에 예상치 못한 최적화 포인트 기술)
```

---

## ✅ 작업 전 최종 체크리스트

### 디자이너/개발자 확인사항
- [ ] 랜딩페이지 개발자 도구로 색상 추출 완료
- [ ] `Cafe24_prdDetail_완성코드_optimized.html` 원본 백업
- [ ] Monet Design 컴포넌트 스타일 이해
- [ ] 브라우저 Intersection Observer 지원 확인 (Chrome 51+, Safari 12.1+)
- [ ] 4개 카드 구조 이해
- [ ] 기존 기능 로직 절대 수정 금지 숙지

### 코드 작업 전 확인
```bash
# 1. 원본 파일 백업
cp Cafe24_prdDetail_완성코드_optimized.html Cafe24_prdDetail_BACKUP.html

# 2. 랜딩페이지 색상 추출
# - F12 개발자 도구로 직접 확인
# - 추출한 값을 CSS 변수에 입력

# 3. 기존 ID 목록 확인
# - priceChart, stockCounter, todayQuotes 등
# - 절대 변경/삭제 금지
```

---

## 🎯 성공 기준 (KPI)

### 정량적 지표
- [ ] 랜딩페이지와 색상 차이 **5% 이내** (Color Picker 비교)
- [ ] 모든 카드 간격이 **40px**로 통일
- [ ] 카드 내부 패딩이 **24px**로 통일
- [ ] 애니메이션 **60fps 유지** (Chrome DevTools Performance 확인)
- [ ] Lighthouse 접근성 점수 **90점 이상**

### 정성적 지표
- [ ] "같은 브랜드" 느낌 즉시 전달
- [ ] AI 디자인 티 **100% 제거**
- [ ] 전문성과 신뢰감 향상
- [ ] 스크롤 인터랙션이 번잡하지 않음
- [ ] 4개 카드가 명확하게 구분됨

---

## 🔍 참고 자료

### Monet Design 핵심 리소스
- **공식 사이트**: https://www.monet.design
- **GitHub**: https://github.com/monet-design/monet-registry
- **컴포넌트 수**: 1007개 (14+ 카테고리)
- **주요 태그**: `modern`, `light-theme`, `minimal`, `grid`, `centered`

### Design Token 원칙
- **Primitive Tokens**: 기본 색상값 (#XXXXXX)
- **Semantic Tokens**: 사용 목적별 변수 (--zart-text-primary)
- **Component Tokens**: 컴포넌트별 변수 (--card-shadow)

### Frontend Design Skill 핵심
- **Brutalist 미니멀리즘**: 날카로운 모서리, 명확한 구조
- **Swiss Typography**: Tight tracking, 명확한 위계
- **Industrial 색상**: Charcoal, Concrete Gray, Natural Wood
- **Performance First**: GPU 가속 속성만 사용

---

## ❓ 작업 중 문의사항

**즉시 질문해야 할 상황**:
1. 랜딩페이지 색상이 3가지 이상 다를 때
2. 기존 JavaScript 수정 없이 기능 구현 불가능할 때
3. Cafe24 플랫폼 제약으로 CSS 적용이 안 될 때
4. 4개 카드 구조가 HTML에서 명확하지 않을 때

---

## 🚀 최종 목표 선언

> **"건설자재 업계의 Stripe가 만든 듯한,  
> Brutalist + Swiss 기반의 절제된 프로페셔널 플랫폼 구현"**

**핵심 가치**:
1. **신뢰**: 실시간 데이터로 투명성 확보
2. **정확성**: 체계적인 정보 구조
3. **편리성**: 직관적인 네비게이션과 아코디언

---

**작업 시작 전 이 프롬프트를 정독하고,  
랜딩페이지 색상 추출 결과를 먼저 공유해주세요!**
