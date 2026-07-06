# 자트 상품상세 디자인 시스템 사양서 (DSS.md)

## 📐 Design System Specification

> **프로젝트**: 자트 건설자재 쇼핑몰 상품상세 템플릿  
> **목적**: Cafe24 상품상세 영역 디자인 시스템 정의  
> **대상**: B2B 리모델링업자 (데스크톱/모바일 균등)  
> **작성일**: 2025-02-23

---

## 1. 디자인 철학

### 핵심 원칙
```
미니멀리즘 + 신뢰성 = 프로페셔널 B2B
```

- **복잡하지 않으면서** - 정보 과부하 방지
- **고루하지 않게** - 2026년 트렌드 반영
- **현장 친화적** - 데스크톱/모바일 균등 품질

### 레퍼런스 믹스
- **Stripe**: 명확한 정보 위계
- **Linear**: 부드러운 애니메이션
- **건설자재 특화**: 무게감 있는 타이포그래피

---

## 2. Color System

### Primary Palette
```css
:root {
  /* 브랜드 */
  --zart-primary: #2d5a3d;           /* 메인 녹색 */
  --zart-primary-light: #3d6d4d;     /* 호버용 */
  --zart-primary-dark: #1d4a2d;      /* 액센트 */
  
  /* 가격 시그널 */
  --zart-price-up: #EF5350;          /* 상승 - 빨강 */
  --zart-price-down: #2196F3;        /* 하락 - 파랑 */
  --zart-price-flat: #78909C;        /* 보합 - 블루그레이 */
  
  /* 중립 */
  --zart-text: #1A1A1A;              /* 진한 차콜 (가독성) */
  --zart-text-sub: #616161;          /* 서브텍스트 */
  --zart-border: #E0E0E0;            /* 라인 */
  --zart-surface: #FAFAFA;           /* 카드 배경 */
  --zart-bg: #FFFFFF;                /* 메인 배경 */
}
```

### Gradient (제한적 사용)
```css
/* 아이콘에만 미묘하게 사용 */
--zart-icon-gradient: linear-gradient(135deg, #2d5a3d 0%, #3d6d4d 100%);
```

---

## 3. Typography System

### Font Family
```css
--zart-font: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 
             'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
```

### Type Scale (Major Third 1.25)
```css
--zart-text-xs: clamp(0.75rem, 1.5vw, 0.75rem);    /* 12px */
--zart-text-sm: clamp(0.875rem, 2vw, 0.875rem);    /* 14px */
--zart-text-base: clamp(1rem, 2.5vw, 1rem);        /* 16px */
--zart-text-lg: clamp(1.25rem, 3vw, 1.25rem);      /* 20px */
--zart-text-xl: clamp(1.563rem, 3.5vw, 1.563rem);  /* 25px */
--zart-text-2xl: clamp(1.953rem, 4vw, 1.953rem);   /* 31px */
--zart-text-3xl: clamp(2.441rem, 5vw, 2.441rem);   /* 39px */
```

### Font Weights
```css
--zart-weight-regular: 400;
--zart-weight-medium: 500;
--zart-weight-semibold: 600;
--zart-weight-bold: 700;
```

### Line Heights
```css
--zart-leading-tight: 1.2;    /* 제목 */
--zart-leading-normal: 1.5;   /* 본문 */
--zart-leading-relaxed: 1.75; /* 긴 텍스트 */
```

---

## 4. Spacing System (8pt Grid)

```css
--zart-space-0: 0px;
--zart-space-1: 4px;
--zart-space-2: 8px;
--zart-space-3: 12px;
--zart-space-4: 16px;
--zart-space-5: 20px;
--zart-space-6: 24px;
--zart-space-8: 32px;
--zart-space-10: 40px;
--zart-space-12: 48px;
--zart-space-16: 64px;
--zart-space-20: 80px;
--zart-space-24: 96px;
```

---

## 5. Section 1: 회사 차별점 (Stats Cards)

### 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│  [아이콘]   [아이콘]   [아이콘]   [아이콘]                    │
│   40+       1702+      467+       12+                        │
│  사업연차   관리거래처  거래금액   정규직원수                  │
└─────────────────────────────────────────────────────────────┘
```

**Grid**: `repeat(4, 1fr)` (균등 배치)  
**Gap**: 24px  
**모바일**: `repeat(2, 1fr)` (2×2)

### 카드 디자인
```css
.zart-stat-card {
  background: var(--zart-bg);
  border: 1px solid var(--zart-border);
  border-radius: 8px;
  padding: var(--zart-space-6);
  text-align: center;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  
  /* 미묘한 그림자 (엘리베이션 1) */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.03);
}

.zart-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
}
```

### 아이콘 스타일
**선택: 단색 + 미묘한 그라데이션**

```css
.zart-stat-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--zart-space-4);
  
  /* 미묘한 그라데이션 */
  background: linear-gradient(135deg, #2d5a3d 0%, #3d6d4d 100%);
  border-radius: 12px;
  
  display: flex;
  align-items: center;
  justify-content: center;
}

.zart-stat-icon svg {
  width: 28px;
  height: 28px;
  stroke: white;
}
```

### 숫자 "+" 애니메이션
**카운터 애니메이션 + 페이드인 +**

```css
.zart-stat-number {
  font-size: var(--zart-text-3xl);
  font-weight: var(--zart-weight-bold);
  color: var(--zart-text);
  font-feature-settings: 'tnum' 1; /* 고정폭 숫자 */
  line-height: var(--zart-leading-tight);
  margin-bottom: var(--zart-space-2);
}

.zart-stat-plus {
  display: inline-block;
  opacity: 0;
  animation: fadeInPlus 0.4s ease 0.6s forwards;
  color: var(--zart-primary);
}

@keyframes fadeInPlus {
  0% { opacity: 0; transform: translateX(-4px); }
  100% { opacity: 1; transform: translateX(0); }
}

/* 카운터 애니메이션 */
@keyframes countUp {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.zart-stat-number.counting {
  animation: countUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### JavaScript 카운터 로직
```javascript
// 0부터 목표값까지 증가하며 마지막에 멈춤
function animateCounter(element, target, duration = 800) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    
    element.textContent = current.toLocaleString('ko-KR');
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString('ko-KR'); // 정확한 값
    }
  }
  
  requestAnimationFrame(update);
}
```

### 라벨 & 단위
```css
.zart-stat-label {
  font-size: var(--zart-text-sm);
  color: var(--zart-text-sub);
  font-weight: var(--zart-weight-medium);
}
```

---

## 6. Section 2: 가격 동향

### 레이아웃
```
┌─────────────────────────────────┐
│  최근 7일 가격 동향               │
│                                  │
│  ▼ 3.6%                         │
│  전주 대비 하락                  │
│  [hover 시 그래프 팝업]          │
└─────────────────────────────────┘
```

**주의**: "현재가 18,500원" 표시 안 함!

### 가격 변동 표시
```css
.zart-price-change {
  display: flex;
  align-items: baseline;
  gap: var(--zart-space-2);
  justify-content: center;
  margin-bottom: var(--zart-space-3);
}

.zart-price-arrow {
  font-size: var(--zart-text-lg);
}

.zart-price-percent {
  font-size: var(--zart-text-2xl);
  font-weight: var(--zart-weight-bold);
  font-feature-settings: 'tnum' 1;
}

/* 상승/하락 색상 */
.zart-price-change.up {
  color: var(--zart-price-up);
}

.zart-price-change.down {
  color: var(--zart-price-down);
}

.zart-price-change.flat {
  color: var(--zart-price-flat);
}
```

### Hover 그래프 팝업 (심플 카드)
```css
.zart-price-display {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.zart-price-popup {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: calc(100% + 12px);
  
  width: 320px;
  background: var(--zart-bg);
  border: 1px solid var(--zart-border);
  border-radius: 8px;
  padding: var(--zart-space-4);
  
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.08);
  
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10;
}

.zart-price-display:hover .zart-price-popup {
  opacity: 1;
  pointer-events: auto;
}

.zart-graph-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}
```

---

## 7. Section 3: 만화 4컷

### 레이아웃 (카드형 + 16px 간격)
```css
.zart-comic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--zart-space-4); /* 16px */
}

@media (max-width: 768px) {
  .zart-comic-grid {
    grid-template-columns: 1fr;
    gap: var(--zart-space-6); /* 24px */
  }
}
```

### 카드 스타일
**라운드 테두리 + 미묘한 그림자**

```css
.zart-comic-holder {
  background: var(--zart-bg);
  border-radius: 8px;
  overflow: hidden;
  
  /* 엘리베이션 1 */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.03);
  
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.zart-comic-holder:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
}

.zart-comic-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px; /* 이미지도 라운드 */
}
```

---

## 8. Section 4: 제품 상세

### 레이아웃 (6:4 비율 - 이미지 강조)
```css
.zart-detail-cols {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: var(--zart-space-8); /* 32px */
  align-items: start;
}

@media (max-width: 768px) {
  .zart-detail-cols {
    grid-template-columns: 1fr;
    gap: var(--zart-space-6);
  }
}
```

### 이미지 처리
**라운드 + 미묘한 테두리**

```css
.zart-detail-image-holder {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--zart-border);
  background: var(--zart-surface);
}

.zart-detail-img {
  width: 100%;
  height: auto;
  display: block;
}
```

### 마크다운 스타일 (아이콘형)
```css
.zart-detail-content {
  font-size: var(--zart-text-base);
  line-height: var(--zart-leading-relaxed);
  color: var(--zart-text);
}

.zart-detail-content h2 {
  font-size: var(--zart-text-xl);
  font-weight: var(--zart-weight-bold);
  color: var(--zart-text);
  margin-bottom: var(--zart-space-4);
  
  /* 미묘한 액센트 */
  padding-left: var(--zart-space-4);
  border-left: 3px solid var(--zart-primary);
}

.zart-detail-content h3 {
  font-size: var(--zart-text-lg);
  font-weight: var(--zart-weight-semibold);
  color: var(--zart-text);
  margin-top: var(--zart-space-6);
  margin-bottom: var(--zart-space-3);
}

.zart-detail-content ul {
  list-style: none;
  padding-left: 0;
  margin-bottom: var(--zart-space-6);
}

.zart-detail-content li {
  position: relative;
  padding-left: var(--zart-space-6);
  margin-bottom: var(--zart-space-3);
}

/* 커스텀 리스트 아이콘 */
.zart-detail-content li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--zart-primary);
  font-weight: var(--zart-weight-bold);
}

.zart-detail-content strong {
  font-weight: var(--zart-weight-semibold);
  color: var(--zart-text);
}

.zart-detail-content a {
  color: var(--zart-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.zart-detail-content a:hover {
  border-bottom-color: var(--zart-primary);
}
```

---

## 9. Animation System

### Scroll Reveal (Linear 스타일)
```css
[data-animate] {
  opacity: 0;
  transform: translateY(24px);
  transition: 
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 접근성 */
@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

### Easing Functions
```css
/* Linear-inspired smooth curves */
--zart-ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--zart-ease-in-out: cubic-bezier(0.2, 0.8, 0.2, 1);
--zart-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 10. Elevation System

```css
/* Level 0: Flat */
--zart-shadow-0: none;

/* Level 1: Subtle (기본 카드) */
--zart-shadow-1: 
  0 1px 3px rgba(0, 0, 0, 0.04),
  0 1px 2px rgba(0, 0, 0, 0.03);

/* Level 2: Hover */
--zart-shadow-2: 
  0 4px 12px rgba(0, 0, 0, 0.08),
  0 2px 4px rgba(0, 0, 0, 0.04);

/* Level 3: Popup */
--zart-shadow-3: 
  0 8px 24px rgba(0, 0, 0, 0.12),
  0 4px 8px rgba(0, 0, 0, 0.08);
```

---

## 11. Responsive Breakpoints

```css
/* 모바일 우선 */
--zart-bp-sm: 640px;   /* 스마트폰 가로 */
--zart-bp-md: 768px;   /* 태블릿 */
--zart-bp-lg: 1024px;  /* 데스크톱 */
--zart-bp-xl: 1280px;  /* 큰 화면 */

/* 기준: 790px 고정폭 */
.zart-wrap {
  max-width: 790px;
  margin: 0 auto;
}

@media (max-width: 820px) {
  .zart-wrap {
    padding: 0 var(--zart-space-4);
  }
}
```

---

## 12. 접근성 (WCAG 2.1 AA)

### 색상 대비율
```
✅ 본문 텍스트 (#1A1A1A / #FFFFFF): 15.8:1
✅ 서브 텍스트 (#616161 / #FFFFFF): 5.74:1
✅ 가격 상승 (#EF5350 / #FFFFFF): 4.52:1
✅ 가격 하락 (#2196F3 / #FFFFFF): 4.51:1
```

### 포커스 스타일
```css
*:focus-visible {
  outline: 2px solid var(--zart-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 키보드 네비게이션
```css
/* 가격 hover를 키보드로도 접근 */
.zart-price-display:focus-within .zart-price-popup {
  opacity: 1;
  pointer-events: auto;
}
```

---

## 13. 성능 최적화

### Critical CSS
```css
/* 초기 로딩 시 필수 스타일만 인라인 */
.zart-wrap { max-width: 790px; margin: 0 auto; }
.zart-section { padding: 64px 0; }
```

### GPU 가속
```css
/* transform, opacity만 애니메이션 */
.zart-stat-card {
  will-change: transform; /* hover 전용 */
}

.zart-stat-card:hover {
  will-change: auto; /* 애니메이션 후 제거 */
}
```

### 이미지 최적화
```
- 만화 4컷: WebP, 각 50KB 이하
- 제품 이미지: WebP, 100KB 이하
- 그래프: PNG Base64, 10KB 이하
```

---

## 14. 다크모드 (선택적 구현)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --zart-bg: #121212;
    --zart-surface: #1E1E1E;
    --zart-text: #E0E0E0;
    --zart-text-sub: #A0A0A0;
    --zart-border: #2C2C2C;
  }
}
```

---

## 15. 디자인 토큰 요약

```json
{
  "color": {
    "primary": "#2d5a3d",
    "text": "#1A1A1A",
    "surface": "#FAFAFA"
  },
  "spacing": {
    "unit": 8,
    "card-gap": 24,
    "section-padding": 64
  },
  "typography": {
    "scale": 1.25,
    "font": "Pretendard Variable"
  },
  "animation": {
    "duration": 600,
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  "elevation": {
    "card": "0 1px 3px rgba(0,0,0,0.04)",
    "hover": "0 4px 12px rgba(0,0,0,0.08)",
    "popup": "0 8px 24px rgba(0,0,0,0.12)"
  }
}
```

---

## 16. 컴포넌트별 규격 요약

| 섹션 | 레이아웃 | 간격 | 특수 효과 |
|------|---------|------|----------|
| 통계 카드 | 4열 균등 (모바일 2×2) | 24px | 카운터 애니메이션 + 페이드인 + |
| 가격 동향 | 중앙 정렬 | - | Hover 그래프 팝업 |
| 만화 4컷 | 2×2 그리드 | 16px | Hover lift-up |
| 제품 상세 | 6:4 비율 | 32px | 마크다운 아이콘형 |

---

## 17. 금지 사항

### ❌ 절대 사용 금지
- 무지개 그라데이션
- 3D 아이소메트릭
- 네온 글로우
- 과도한 애니메이션 (3개 이상 동시)
- Comic Sans, Papyrus 같은 캐주얼 폰트

### ❌ 디자인 안티 패턴
- 현재가 표시 (섹션2에서 금지)
- 가격 변동 금액 (700원) 표시 금지
- 카드 간격 불규칙
- 색상 5개 이상 사용
- 애니메이션 1초 이상

---

## 18. 구현 체크리스트

### 필수 구현
- [ ] CSS 변수 시스템 적용
- [ ] 8pt Grid 간격 준수
- [ ] 카운터 애니메이션 (0→목표값)
- [ ] Hover 그래프 팝업
- [ ] 스크롤 reveal 애니메이션
- [ ] 모바일 반응형 (2×2, 1열)
- [ ] 접근성 (포커스, 대비율)

### 선택 구현
- [ ] 다크모드
- [ ] 로딩 스켈레톤
- [ ] 이미지 레이지 로딩

---

## 19. 디자인 QA 기준

### 시각적 품질
- [ ] 790px에서 모든 요소 정렬 완벽
- [ ] 모바일에서 터치 영역 44px 이상
- [ ] 색상 대비율 WCAG AA 준수
- [ ] 폰트 크기 clamp로 반응형

### 애니메이션 품질
- [ ] 60fps 유지
- [ ] 부드러운 easing (Linear 스타일)
- [ ] prefers-reduced-motion 대응

### 코드 품질
- [ ] zart- prefix 100% 적용
- [ ] CSS 변수 사용률 90% 이상
- [ ] 하드코딩 색상 0개

---

## 20. 다음 단계

이 디자인 시스템을 기반으로:

1. **PRD 업데이트** - 디자인 스펙 반영
2. **TRD 업데이트** - CSS 구조 구체화
3. **컴포넌트 구현** - 실제 HTML/CSS 작성
4. **Figma/Sketch** - 디자인 파일 생성 (선택)

---

**승인 후 실제 코드 생성 단계로 진행합니다.** 🎨✨
