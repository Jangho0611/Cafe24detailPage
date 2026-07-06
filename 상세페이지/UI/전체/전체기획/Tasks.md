# AI 코딩 착수 프롬프트 (Tasks.md)

---

## 💬 AI 코더에게 전달할 프롬프트

```markdown
너는 **Node.js 20.x + Handlebars 4.7.8** 전문 개발자야.

첨부한 **[요구사항 정의서(PRD.md)]**의 4개 섹션 템플릿을 구현하되,
**[기술 사양서(TRD.md)]**의 디렉토리 구조와 라이브러리 버전을 엄격히 준수해.

---

## 🎯 작업 순서

### 1단계: 프로젝트 초기화

터미널에서 실행:

```bash
mkdir zart-template-generator
cd zart-template-generator
npm init -y
```

필수 라이브러리 설치 (버전 정확히 일치시킬 것):

```bash
npm install handlebars@4.7.8 marked@12.0.0 @vercel/og@0.6.2 googleapis@134.0.0 isomorphic-dompurify@2.9.0
npm install --save-dev prettier@3.2.4
```

---

### 2단계: 디렉토리 구조 생성

TRD.md의 구조를 **정확히** 따라 폴더/파일 생성:

```bash
mkdir -p src/templates/partials
mkdir -p src/templates/styles
mkdir -p src/generators
mkdir -p src/utils
mkdir -p fonts
mkdir -p output
```

빈 파일 생성:

```bash
touch src/templates/main.hbs
touch src/templates/partials/stats-section.hbs
touch src/templates/partials/price-section.hbs
touch src/templates/partials/comic-section.hbs
touch src/templates/partials/detail-section.hbs
touch src/templates/styles/base.css
touch src/generators/fetchSheetData.js
touch src/generators/generateGraph.js
touch src/generators/buildHTML.js
touch src/utils/markdown.js
touch src/utils/validator.js
touch src/utils/icons.js
touch config.json
touch .env
touch index.js
```

---

### 3단계: SVG 아이콘 설정

`src/utils/icons.js` 파일에 TRD.md의 Lucide Icons 코드를 **정확히 복사**:

```javascript
export const icons = {
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`,
  
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`,
  
  database: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>`,
  
  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>`
};
```

---

### 4단계: Handlebars 템플릿 작성

#### 4-1. `src/templates/partials/stats-section.hbs`

섹션 1: 회사 차별점 (4개 통계 카드)

```handlebars
<section class="zart-section zart-stats" data-animate="fade-up">
  <div class="zart-stats-grid">
    
    <div class="zart-stat-card">
      <div class="zart-stat-icon">{{{icon stat1_icon_name}}}</div>
      <div class="zart-stat-number">{{stat1_number}}<span class="zart-stat-plus">+</span></div>
      <div class="zart-stat-label">{{stat1_label}}</div>
      <div class="zart-stat-suffix">{{stat1_suffix}}</div>
    </div>
    
    <div class="zart-stat-card">
      <div class="zart-stat-icon">{{{icon stat2_icon_name}}}</div>
      <div class="zart-stat-number">{{stat2_number}}<span class="zart-stat-plus">+</span></div>
      <div class="zart-stat-label">{{stat2_label}}</div>
      <div class="zart-stat-suffix">{{stat2_suffix}}</div>
    </div>
    
    <div class="zart-stat-card">
      <div class="zart-stat-icon">{{{icon stat3_icon_name}}}</div>
      <div class="zart-stat-number">{{stat3_number}}<span class="zart-stat-plus">+</span></div>
      <div class="zart-stat-label">{{stat3_label}}</div>
      <div class="zart-stat-suffix">{{stat3_suffix}}</div>
    </div>
    
    <div class="zart-stat-card">
      <div class="zart-stat-icon">{{{icon stat4_icon_name}}}</div>
      <div class="zart-stat-number">{{stat4_number}}<span class="zart-stat-plus">+</span></div>
      <div class="zart-stat-label">{{stat4_label}}</div>
      <div class="zart-stat-suffix">{{stat4_suffix}}</div>
    </div>
    
  </div>
</section>
```

#### 4-2. `src/templates/partials/price-section.hbs`

섹션 2: 가격 동향

```handlebars
<section class="zart-section zart-price-section" data-animate="fade-up">
  <div class="zart-price-header">
    <h3 class="zart-price-title">최근 7일 가격 동향</h3>
  </div>
  
  <div class="zart-price-display">
    <div class="zart-price-current">
      <span class="zart-price-label">현재가</span>
      <span class="zart-price-value">₩{{formatPrice current_price}}</span>
    </div>
    
    <div class="zart-price-change {{priceDirection}}">
      <span class="zart-price-arrow">{{priceArrow}}</span>
      <span class="zart-price-percent">{{priceChangePercent}}%</span>
      <span class="zart-price-amount">(₩{{formatPrice priceChangeAmount}})</span>
    </div>
    
    <div class="zart-price-note">전주 대비 {{priceDirectionText}}</div>
    
    <!-- Hover 그래프 팝업 -->
    <div class="zart-price-popup">
      <img src="{{graphImageUrl}}" alt="7일 가격 그래프" class="zart-graph-image">
    </div>
  </div>
</section>
```

#### 4-3. `src/templates/partials/comic-section.hbs`

섹션 3: 만화 4컷

```handlebars
<section class="zart-section zart-comic-section" data-animate="fade-up">
  <div class="zart-comic-grid">
    <div class="zart-comic-holder">
      <img src="{{comic_image_url_1}}" alt="사용 가이드 1컷" class="zart-comic-img">
    </div>
    <div class="zart-comic-holder">
      <img src="{{comic_image_url_2}}" alt="사용 가이드 2컷" class="zart-comic-img">
    </div>
    <div class="zart-comic-holder">
      <img src="{{comic_image_url_3}}" alt="사용 가이드 3컷" class="zart-comic-img">
    </div>
    <div class="zart-comic-holder">
      <img src="{{comic_image_url_4}}" alt="사용 가이드 4컷" class="zart-comic-img">
    </div>
  </div>
</section>
```

#### 4-4. `src/templates/partials/detail-section.hbs`

섹션 4: 제품 상세

```handlebars
<section class="zart-section zart-detail-section" data-animate="fade-up">
  <div class="zart-detail-cols">
    
    <div class="zart-detail-left">
      <div class="zart-detail-image-holder">
        <img src="{{detail_image_url}}" alt="{{product_code}} 제품 이미지" class="zart-detail-img">
      </div>
    </div>
    
    <div class="zart-detail-right">
      <div class="zart-detail-content">
        {{{detail_content_html}}}
      </div>
    </div>
    
  </div>
</section>
```

#### 4-5. `src/templates/main.hbs`

메인 템플릿 (전체 조립)

```handlebars
<style>
{{{css}}}
</style>

<div class="zart-wrap">
  {{> stats-section}}
  {{> price-section}}
  {{> comic-section}}
  {{> detail-section}}
</div>

<script>
{{{javascript}}}
</script>
```

---

### 5단계: CSS 작성

`src/templates/styles/base.css`에 TRD.md의 CSS 변수와 스타일 작성:

**중요**: 
- 모든 클래스명은 `zart-` prefix 필수
- TRD.md의 색상 변수 사용
- 반응형 미디어쿼리 포함

```css
/* 초기화 */
.zart-wrap * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* CSS 변수 */
:root {
  --zart-primary: #2d5a3d;
  --zart-price-up: #ef5350;
  --zart-price-down: #2196F3;
  --zart-price-flat: #757575;
  --zart-text: #333333;
  --zart-text-sub: #666666;
  --zart-border: #e0e0e0;
  --zart-bg: #f8f9fa;
  --zart-space-xs: 8px;
  --zart-space-sm: 16px;
  --zart-space-md: 24px;
  --zart-space-lg: 40px;
  --zart-space-xl: 64px;
}

/* 컨테이너 */
.zart-wrap {
  max-width: 790px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--zart-text);
  line-height: 1.6;
}

/* 섹션 공통 */
.zart-section {
  padding: var(--zart-space-xl) 0;
}

/* 스크롤 애니메이션 */
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

/* 섹션 1: 통계 카드 */
.zart-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--zart-space-md);
}

.zart-stat-card {
  text-align: center;
  padding: var(--zart-space-md);
  background: white;
  border-radius: 8px;
  border: 1px solid var(--zart-border);
}

.zart-stat-icon {
  margin-bottom: var(--zart-space-sm);
  color: var(--zart-primary);
}

.zart-stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--zart-text);
}

/* ... 나머지 스타일 계속 작성 ... */

/* 모바일 반응형 */
@media (max-width: 820px) {
  .zart-wrap {
    padding: 0 16px;
  }
  
  .zart-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .zart-comic-grid {
    grid-template-columns: 1fr;
  }
  
  .zart-detail-cols {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

### 6단계: JavaScript 유틸리티 작성

#### 6-1. `src/utils/markdown.js`

```javascript
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function convertMarkdown(mdText) {
  const html = marked.parse(mdText, {
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'strong', 'em', 'a', 'br'],
    ALLOWED_ATTR: ['href']
  });
}
```

#### 6-2. `src/utils/validator.js`

```javascript
export function validateProductData(data) {
  const required = [
    'product_code',
    'stat1_number', 'stat1_label',
    'current_price', 'last_week_price',
    'comic_image_url_1', 'comic_image_url_2',
    'detail_image_url', 'detail_content_md'
  ];
  
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`필수 필드 누락: ${field}`);
    }
  }
  
  return true;
}
```

---

### 7단계: Google Sheet 데이터 페칭

`src/generators/fetchSheetData.js`:

```javascript
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export async function fetchProductData(productCode) {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json', // 또는 환경변수
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: '제품DB!A2:Y1000'
  });
  
  const rows = response.data.values;
  const targetRow = rows.find(row => row[0] === productCode);
  
  if (!targetRow) {
    throw new Error(`제품 코드 ${productCode}를 찾을 수 없습니다.`);
  }
  
  // 배열 → 객체 변환
  return {
    product_code: targetRow[0],
    stat1_icon_name: targetRow[1],
    stat1_number: Number(targetRow[2]),
    stat1_label: targetRow[3],
    stat1_suffix: targetRow[4],
    // ... 나머지 필드 매핑
    detail_content_md: targetRow[24]
  };
}
```

---

### 8단계: Satori 그래프 생성

`src/generators/generateGraph.js`:

```javascript
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createPriceGraph(prices) {
  const fontData = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  
  return new ImageResponse(
    (
      <div style={{
        width: 320,
        height: 180,
        background: 'white',
        display: 'flex',
        padding: 16
      }}>
        {/* 간단한 라인 차트 SVG */}
        <svg width="288" height="148" viewBox="0 0 288 148">
          {/* 가격 데이터로 polyline 생성 */}
        </svg>
      </div>
    ),
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
  
  // PNG Buffer 반환 → Base64 변환
}
```

---

### 9단계: 메인 빌드 함수

`src/generators/buildHTML.js`:

```javascript
import Handlebars from 'handlebars';
import fs from 'fs';
import { fetchProductData } from './fetchSheetData.js';
import { generateGraph } from './generateGraph.js';
import { convertMarkdown } from '../utils/markdown.js';
import { icons } from '../utils/icons.js';

// Handlebars Helper 등록
Handlebars.registerHelper('icon', function(name) {
  return new Handlebars.SafeString(icons[name] || '');
});

Handlebars.registerHelper('formatPrice', function(price) {
  return price.toLocaleString('ko-KR');
});

export async function buildProductHTML(productCode) {
  // 1. Sheet 데이터
  const data = await fetchProductData(productCode);
  
  // 2. 가격 계산
  const priceDiff = data.current_price - data.last_week_price;
  const pricePercent = ((priceDiff / data.last_week_price) * 100).toFixed(1);
  
  data.priceDirection = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'flat';
  data.priceArrow = priceDiff > 0 ? '▲' : priceDiff < 0 ? '▼' : '—';
  data.priceChangePercent = Math.abs(pricePercent);
  data.priceChangeAmount = Math.abs(priceDiff);
  data.priceDirectionText = priceDiff > 0 ? '상승' : priceDiff < 0 ? '하락' : '보합';
  
  // 3. 그래프 이미지
  const prices = [18500, 18300, 18200, 18400, 18600, 18900, data.current_price];
  const graphBuffer = await generateGraph(prices);
  data.graphImageUrl = `data:image/png;base64,${graphBuffer.toString('base64')}`;
  
  // 4. 마크다운 변환
  data.detail_content_html = convertMarkdown(data.detail_content_md);
  
  // 5. CSS & JS 읽기
  const css = fs.readFileSync('src/templates/styles/base.css', 'utf8');
  const javascript = `
    (function() {
      'use strict';
      function init() {
        const els = document.querySelectorAll('[data-animate]');
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: '-80px 0px', threshold: 0.15 });
        els.forEach(el => io.observe(el));
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  `;
  
  // 6. Partials 등록
  Handlebars.registerPartial('stats-section', 
    fs.readFileSync('src/templates/partials/stats-section.hbs', 'utf8'));
  Handlebars.registerPartial('price-section', 
    fs.readFileSync('src/templates/partials/price-section.hbs', 'utf8'));
  Handlebars.registerPartial('comic-section', 
    fs.readFileSync('src/templates/partials/comic-section.hbs', 'utf8'));
  Handlebars.registerPartial('detail-section', 
    fs.readFileSync('src/templates/partials/detail-section.hbs', 'utf8'));
  
  // 7. 템플릿 컴파일
  const template = Handlebars.compile(
    fs.readFileSync('src/templates/main.hbs', 'utf8')
  );
  
  // 8. HTML 생성
  const html = template({ ...data, css, javascript });
  
  // 9. 파일 저장
  fs.writeFileSync(`output/product_${productCode}.html`, html, 'utf8');
  
  console.log(`✅ 생성 완료: output/product_${productCode}.html`);
}
```

---

### 10단계: 실행 스크립트

`index.js`:

```javascript
import { buildProductHTML } from './src/generators/buildHTML.js';

const productCode = process.argv[2] || '1164';

buildProductHTML(productCode)
  .then(() => {
    console.log('✅ HTML 생성 성공!');
  })
  .catch((err) => {
    console.error('❌ 오류 발생:', err.message);
    process.exit(1);
  });
```

---

### 11단계: 실행

```bash
# 제품 코드 1164 HTML 생성
node index.js 1164

# 다른 제품
node index.js 2345
```

---

## ⚠️ 절대 하지 말 것

1. ❌ 외부 CSS/JS 파일 링크 (`<link>`, `<script src>`)
2. ❌ TRD.md에 없는 라이브러리 추가
3. ❌ zart- prefix 없는 클래스명
4. ❌ Handlebars 대신 다른 템플릿 엔진 사용
5. ❌ 섹션 순서 임의 변경

---

## ✅ 완료 조건

1. `node index.js 1164` 실행 시 HTML 파일 생성
2. 생성된 HTML을 Cafe24 에디터에 붙여넣기 가능
3. 4개 섹션 모두 정상 렌더링
4. Hover 그래프 팝업 동작 (데스크톱)
5. 스크롤 애니메이션 동작
6. 모바일 반응형 레이아웃 정상

---

**지금 바로 1단계부터 시작해.**
```
