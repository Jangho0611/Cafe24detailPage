# 기술 사양서 (TRD.md)

## 권장 스택

```
언어: Node.js 20.x (LTS)
템플릿 엔진: Handlebars 4.7.8
마크다운: marked 12.0.0
이미지 생성: @vercel/og 0.6.2
Sheet 연동: googleapis 134.0.0
```

## 선정 이유

### Node.js 20.x
- JavaScript 기반, Cafe24 HTML과 동일 언어
- AI 코더가 가장 잘 다루는 언어
- 풍부한 템플릿/이미지 라이브러리 생태계

### Handlebars 4.7.8
- 간단한 `{{변수}}` 구문
- Partial 시스템으로 섹션 분리 용이
- AI 코더 친화적 (명확한 구문, 적은 오류)

### marked 12.0.0
- 가장 안정적인 마크다운 파서
- GFM (GitHub Flavored Markdown) 지원
- 빠른 변환 속도

### @vercel/og (Satori) 0.6.2
- React 컴포넌트 → PNG 변환
- 서버 사이드 이미지 생성
- 한글 폰트 지원 (Pretendard)

### googleapis 134.0.0
- 공식 Google Sheets API v4
- 안정적인 OAuth2 인증
- 무료 할당량 충분 (일 500만 요청)

---

## 핵심 아키텍처

### 디렉토리 구조

```
zart-template-generator/
├── src/
│   ├── templates/
│   │   ├── main.hbs                # 메인 템플릿 (전체 구조)
│   │   ├── partials/
│   │   │   ├── stats-section.hbs   # 섹션1: 회사 차별점
│   │   │   ├── price-section.hbs   # 섹션2: 가격 동향
│   │   │   ├── comic-section.hbs   # 섹션3: 만화 4컷
│   │   │   └── detail-section.hbs  # 섹션4: 제품 상세
│   │   └── styles/
│   │       └── base.css             # zart- prefix CSS
│   ├── generators/
│   │   ├── fetchSheetData.js        # Sheet 데이터 읽기
│   │   ├── generateGraph.js         # Satori 그래프 생성
│   │   └── buildHTML.js             # 템플릿 조립 & 빌드
│   └── utils/
│       ├── markdown.js              # 마크다운 → HTML
│       ├── validator.js             # 데이터 검증
│       └── icons.js                 # SVG 아이콘 맵
├── fonts/
│   └── Pretendard-Regular.woff      # Satori용 폰트
├── output/                          # 생성된 HTML 파일
├── config.json                      # Sheet ID, Range 등
├── .env                             # Google API 키
├── package.json
└── index.js                         # 실행 스크립트
```

---

## Google Sheet 스키마

### 시트명: `제품DB`

| 컬럼 | 필드명 | 타입 | 예시 | 필수 |
|------|--------|------|------|------|
| A | product_code | string | 1164 | ✅ |
| B | stat1_icon_name | string | chart | ✅ |
| C | stat1_number | number | 40 | ✅ |
| D | stat1_label | string | 사업연차 | ✅ |
| E | stat1_suffix | string | 년차 | ✅ |
| F | stat2_icon_name | string | building | ✅ |
| G | stat2_number | number | 1702 | ✅ |
| H | stat2_label | string | 관리거래처 | ✅ |
| I | stat2_suffix | string | 개 | ✅ |
| J | stat3_icon_name | string | database | ✅ |
| K | stat3_number | number | 467 | ✅ |
| L | stat3_label | string | 거래금액 | ✅ |
| M | stat3_suffix | string | 억 | ✅ |
| N | stat4_icon_name | string | lightbulb | ✅ |
| O | stat4_number | number | 12 | ✅ |
| P | stat4_label | string | 정규 직원수 | ✅ |
| Q | stat4_suffix | string | 명 | ✅ |
| R | current_price | number | 18500 | ✅ |
| S | last_week_price | number | 19200 | ✅ |
| T | comic_image_url_1 | url | https://... | ✅ |
| U | comic_image_url_2 | url | https://... | ✅ |
| V | comic_image_url_3 | url | https://... | ✅ |
| W | comic_image_url_4 | url | https://... | ✅ |
| X | detail_image_url | url | https://... | ✅ |
| Y | detail_content_md | text | # 용도\n- ... | ✅ |

### 데이터 예시 (1행)

```
1164 | chart | 40 | 사업연차 | 년차 | building | 1702 | 관리거래처 | 개 | ...
```

---

## SVG 아이콘 시스템

### 선택: Lucide Icons (MIT 라이센스)
- 사이트: https://lucide.dev/
- 특징: 깔끔한 라인 스타일, 일관된 두께
- 사용 아이콘:
  - `TrendingUp` → chart
  - `Building2` → building
  - `Database` → database
  - `Lightbulb` → lightbulb

### 구현 방식

```javascript
// src/utils/icons.js
export const icons = {
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`,
  
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`,
  
  database: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>`,
  
  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>`
};

// Handlebars helper 등록
Handlebars.registerHelper('icon', function(name) {
  return new Handlebars.SafeString(icons[name] || '');
});
```

---

## 스타일 가이드

### CSS 네임스페이스 규칙

```css
/* ✅ 모든 클래스에 zart- prefix 필수 */
.zart-wrap { }
.zart-stats-grid { }
.zart-price-value { }
.zart-comic-holder { }

/* ❌ 절대 금지 */
.wrap { }           /* prefix 없음 */
.stats-grid { }     /* prefix 없음 */
#priceValue { }     /* ID는 zart- prefix 필요 */
```

### 반응형 브레이크포인트

```css
/* 데스크톱: 790px 고정폭 */
.zart-wrap {
  max-width: 790px;
  margin: 0 auto;
}

/* 모바일: 좌우 16px 여백 */
@media (max-width: 820px) {
  .zart-wrap {
    padding: 0 16px;
  }
  
  /* 4개 통계 카드 → 2×2 그리드 */
  .zart-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* 만화 4컷 → 1열 */
  .zart-comic-grid {
    grid-template-columns: 1fr;
  }
  
  /* 제품 상세 → 1열 */
  .zart-detail-cols {
    flex-direction: column;
  }
}
```

### 색상 시스템 (CSS 변수)

```css
:root {
  /* 브랜드 */
  --zart-primary: #2d5a3d;
  --zart-price-up: #ef5350;
  --zart-price-down: #2196F3;
  --zart-price-flat: #757575;
  
  /* 중립 */
  --zart-text: #333333;
  --zart-text-sub: #666666;
  --zart-border: #e0e0e0;
  --zart-bg: #f8f9fa;
  
  /* 여백 (8pt grid) */
  --zart-space-xs: 8px;
  --zart-space-sm: 16px;
  --zart-space-md: 24px;
  --zart-space-lg: 40px;
  --zart-space-xl: 64px;
}
```

---

## Satori 그래프 생성 규격

### 입력 데이터 형식

```javascript
{
  prices: [18500, 18300, 18200, 18400, 18600, 18900, 19200], // 7일치
  labels: ['2/16', '2/17', '2/18', '2/19', '2/20', '2/21', '2/22']
}
```

### 출력 이미지 스펙

```javascript
// src/generators/generateGraph.js
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createPriceGraph(data) {
  const fontData = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  
  return new ImageResponse(
    <div style={{
      width: 320,
      height: 180,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: 16
    }}>
      {/* SVG 라인 차트 JSX */}
    </div>,
    {
      width: 320,
      height: 180,
      fonts: [{
        name: 'Pretendard',
        data: fontData,
        weight: 400
      }]
    }
  );
}
```

### 저장 방식

**옵션 A: Base64 인라인 (권장)**
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANS..." />
```
- 장점: 외부 의존성 없음
- 단점: HTML 파일 크기 증가 (~10KB)

**옵션 B: 파일 저장 + 공개 URL**
```html
<img src="https://storage.googleapis.com/zart/graphs/1164.png" />
```
- 장점: HTML 파일 작음
- 단점: 외부 저장소 필요

---

## 마크다운 변환 규칙

### 지원하는 문법

```markdown
# 제목 (H1)
## 소제목 (H2)
### 항목 (H3)

- 리스트 항목 1
- 리스트 항목 2

**굵은 글씨**
*기울임*

[링크](https://example.com)
```

### 변환 설정

```javascript
// src/utils/markdown.js
import { marked } from 'marked';

export function convertMarkdown(mdText) {
  return marked.parse(mdText, {
    breaks: true,        // 줄바꿈 → <br>
    gfm: true,           // GitHub Flavored Markdown
    headerIds: false,    // ID 자동 생성 안 함
    mangle: false        // 이메일 난독화 안 함
  });
}
```

### HTML 이스케이프

```javascript
// XSS 방지
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'strong', 'em', 'a', 'br'],
    ALLOWED_ATTR: ['href']
  });
}
```

---

## IntersectionObserver 설정

### JavaScript 코드

```javascript
// main.hbs 내 <script> 태그
(function() {
  'use strict';
  
  function initScrollAnimation() {
    const elements = document.querySelectorAll('[data-animate]');
    
    if (!('IntersectionObserver' in window)) {
      // 폴백: 즉시 표시
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '-80px 0px',
        threshold: 0.15
      }
    );
    
    elements.forEach(el => observer.observe(el));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimation);
  } else {
    initScrollAnimation();
  }
})();
```

### CSS 애니메이션

```css
[data-animate] {
  opacity: 0;
  transform: translateY(30px);
  transition: 
    opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 접근성: 모션 감소 설정 */
@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

## 환경 변수 (.env)

```bash
# Google Sheets API
GOOGLE_SHEET_ID=1abc123...xyz
GOOGLE_API_KEY=AIzaSy...

# 또는 OAuth2 (서비스 계정)
GOOGLE_SERVICE_ACCOUNT_EMAIL=zart@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## AI 코딩 주의사항

### 절대 금지 사항

1. **외부 CDN 사용 금지**
```html
<!-- ❌ 금지 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/...">
<script src="https://unpkg.com/..."></script>

<!-- ✅ 허용 -->
<style>/* 모든 CSS를 여기에 */</style>
<script>/* 모든 JS를 여기에 */</script>
```

2. **TRD에 없는 라이브러리 추가 금지**
```json
// ❌ 금지
"dependencies": {
  "lodash": "^4.17.21",  // TRD에 없음
  "axios": "^1.6.0"      // TRD에 없음
}

// ✅ 허용
"dependencies": {
  "handlebars": "4.7.8",
  "marked": "12.0.0",
  "@vercel/og": "0.6.2",
  "googleapis": "134.0.0"
}
```

3. **zart- prefix 누락 금지**
```css
/* ❌ 금지 */
.stats-card { }

/* ✅ 허용 */
.zart-stats-card { }
```

4. **Handlebars 변수 형식 준수**
```handlebars
<!-- ❌ 금지 -->
{product_code}      <!-- 단일 중괄호 -->
<% product_code %>  <!-- EJS 문법 -->

<!-- ✅ 허용 -->
{{product_code}}    <!-- 이중 중괄호 -->
```

5. **Satori 이미지 경로 확인**
```javascript
// ❌ 금지: 로컬 경로
<img src="file:///Users/...">

// ✅ 허용: Base64 또는 공개 URL
<img src="data:image/png;base64,...">
<img src="https://storage.googleapis.com/...">
```

---

## 성능 최적화

### HTML 파일 크기 제한
- 목표: **100KB 이하**
- 그래프 이미지 Base64: ~10KB
- CSS: ~20KB
- JavaScript: ~5KB
- 나머지 HTML: ~65KB

### 이미지 최적화
- 만화 4컷: 각 50KB 이하 권장
- 제품 이미지: 100KB 이하 권장
- WebP 형식 우선 (fallback: JPEG)

---

## 버전 관리

```json
// package.json
{
  "name": "zart-template-generator",
  "version": "1.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "handlebars": "4.7.8",
    "marked": "12.0.0",
    "@vercel/og": "0.6.2",
    "googleapis": "134.0.0",
    "isomorphic-dompurify": "2.9.0"
  },
  "devDependencies": {
    "prettier": "3.2.4"
  }
}
```

---

## 테스트 전략

### 수동 테스트 체크리스트
- [ ] Sheet 데이터 읽기 성공
- [ ] 4개 섹션 모두 렌더링
- [ ] 가격 계산 정확도 (상승/하락/보합)
- [ ] Hover 그래프 팝업 동작
- [ ] 스크롤 애니메이션 자연스러움
- [ ] 모바일 반응형 레이아웃
- [ ] Cafe24 에디터 복붙 테스트

---

## 배포 체크리스트

- [ ] `.env` 파일 .gitignore 추가
- [ ] README.md 작성 (설치/실행 방법)
- [ ] 예시 Sheet 템플릿 공유
- [ ] 생성된 HTML 샘플 파일 포함
