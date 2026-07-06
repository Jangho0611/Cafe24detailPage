# [Section 4 리팩토링] 제품 상세 완전 시각화 - Satori 프롬프터

## 🎯 목적

기존 "밋밋한" Section 4를 **완전 Satori 시각화**로 개선합니다.  
왼쪽 제품 카드 + 오른쪽 3개 미니 카드 = **100% 이미지 기반 제품 상세**

---

## 📐 최종 레이아웃

```
┌─────────────────────────┬────────────────────────┐
│  [Satori 제품 카드]       │ [Satori 미니카드 1]      │
│  ┌───────────────────┐   │ ┌──────────────────┐   │
│  │                   │   │ │ 📌 주요 용도      │   │
│  │   MDF 실물 이미지  │   │ │                  │   │
│  │   (mdf.png)       │   │ │ • 일반 가구재     │   │
│  │                   │   │ │ • 건축 내장재     │   │
│  │                   │   │ │ • 포장재         │   │
│  ├───────────────────┤   │ │ • 마루판재       │   │
│  │ 중밀도 섬유판 (MDF)│   │ └──────────────────┘   │
│  │ Medium Density    │   │                        │
│  │ Fiberboard        │   │ [Satori 미니카드 2]      │
│  ├───────────────────┤   │ ┌──────────────────┐   │
│  │ 등급: E1          │   │ │ 🏗️ 적용 사례      │   │
│  │ 인증: KS F 3200   │   │ │                  │   │
│  │ 제조: 한솔/유니드  │   │ │ • 가구 문짝       │   │
│  │       동화/포레스코│   │ │ • 벽체 마감재     │   │
│  ├───────────────────┤   │ │ • 인테리어 소품   │   │
│  │ 규격              │   │ └──────────────────┘   │
│  │ 1220 × 2440mm    │   │                        │
│  │ 3T~30T 두께      │   │ [Satori 미니카드 3]      │
│  └───────────────────┘   │ ┌──────────────────┐   │
│                          │ │ ✨ 주요 특징       │   │
│                          │ │                  │   │
│                          │ │ • 가공성 우수     │   │
│                          │ │ • 경제적         │   │
│                          │ │ • 표면 평활      │   │
│                          │ │ • 밀도 균일      │   │
│                          │ └──────────────────┘   │
└─────────────────────────┴────────────────────────┘
      60% (474px)                40% (284px)
```

---

## 🎨 Satori 구현 1: 제품 카드 (왼쪽)

### 파일 위치
```
src/generators/generateProductCard.js
```

### 디자인 스펙

**이미지 크기**: 474px × 600px  
**구조**: 이미지 영역 + 정보 영역 (3개 섹션)

#### 색상
```javascript
colors: {
  background: '#FFFFFF',
  headerBg: '#2d5a3d',        // 브랜드 녹색
  headerText: '#FFFFFF',
  sectionBg: '#FAFAFA',       // 정보 섹션 배경
  text: '#1A1A1A',
  textSub: '#616161',
  accent: '#3d6d4d',          // 포인트 색상
  border: '#E0E0E0'
}
```

#### 레이아웃 비율
```
┌─────────────┐
│ 이미지 영역  │  280px (46%)
├─────────────┤
│ 제목 영역   │   80px (13%)
├─────────────┤
│ 스펙 영역   │  140px (23%)
├─────────────┤
│ 규격 영역   │  100px (17%)
└─────────────┘
  Total: 600px
```

### 구현 코드

```javascript
// src/generators/generateProductCard.js
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createProductCard(data) {
  const fontRegular = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  const fontBold = fs.readFileSync('./fonts/Pretendard-Bold.woff');
  
  const { 
    productImage,    // mdf.png의 Base64 또는 URL
    titleKo,         // 중밀도 섬유판 (MDF)
    titleEn,         // Medium Density Fiberboard
    grade,           // E1
    certification,   // KS F 3200
    manufacturers,   // ['한솔', '유니드', '동화', '포레스코']
    size,            // 1220 × 2440mm
    thicknesses      // 3T, 6T, 9T, 12T, 15T, 18T, 25T, 30T
  } = data;
  
  return new ImageResponse(
    (
      <div
        style={{
          width: 474,
          height: 600,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E0E0E0',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        {/* 1. 이미지 영역 */}
        <div
          style={{
            width: '100%',
            height: 280,
            background: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <img
            src={productImage}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
          />
          {/* E1 등급 뱃지 */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: '#2d5a3d',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 700
            }}
          >
            {grade} 등급
          </div>
        </div>
        
        {/* 2. 제목 영역 */}
        <div
          style={{
            background: '#2d5a3d',
            color: 'white',
            padding: 20,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              marginBottom: 4
            }}
          >
            {titleKo}
          </h2>
          <p
            style={{
              fontSize: 13,
              margin: 0,
              opacity: 0.9
            }}
          >
            {titleEn}
          </p>
        </div>
        
        {/* 3. 스펙 영역 */}
        <div
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#FAFAFA'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#616161', minWidth: 60 }}>
              인증
            </span>
            <span style={{ fontSize: 16, color: '#1A1A1A', fontWeight: 600 }}>
              {certification}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#616161', minWidth: 60 }}>
              제조
            </span>
            <span style={{ fontSize: 14, color: '#1A1A1A' }}>
              {manufacturers.join(', ')}
            </span>
          </div>
        </div>
        
        {/* 4. 규격 영역 */}
        <div
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid #E0E0E0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#616161', minWidth: 60 }}>
              사이즈
            </span>
            <span style={{ fontSize: 16, color: '#1A1A1A', fontWeight: 600 }}>
              {size}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#616161', minWidth: 60 }}>
              두께
            </span>
            <span style={{ fontSize: 14, color: '#1A1A1A' }}>
              {thicknesses}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 474,
      height: 600,
      fonts: [
        { name: 'Pretendard', data: fontRegular, weight: 400 },
        { name: 'Pretendard', data: fontBold, weight: 700 }
      ]
    }
  );
}
```

---

## 🎨 Satori 구현 2: 미니 카드 3개 (오른쪽)

### 파일 위치
```
src/generators/generateMiniCards.js
```

### 디자인 스펙

**각 카드 크기**: 284px × 180px  
**카드 간 간격**: 16px  
**총 높이**: (180 × 3) + (16 × 2) = 572px

#### 카드 공통 스타일
```javascript
cardStyle: {
  width: 284,
  height: 180,
  background: '#FFFFFF',
  border: '1px solid #E0E0E0',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
}
```

### 구현 코드

```javascript
// src/generators/generateMiniCards.js
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createMiniCard(data, type) {
  const fontRegular = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  const fontBold = fs.readFileSync('./fonts/Pretendard-Bold.woff');
  
  const configs = {
    usage: {
      icon: '📌',
      title: '주요 용도',
      items: data.usages || [
        '일반 가구재',
        '건축 내장재',
        '포장재',
        '마루판재'
      ]
    },
    application: {
      icon: '🏗️',
      title: '적용 사례',
      items: data.applications || [
        '가구 문짝',
        '벽체 마감재',
        '인테리어 소품',
        '수납 선반'
      ]
    },
    features: {
      icon: '✨',
      title: '주요 특징',
      items: data.features || [
        '가공성 우수',
        '경제적',
        '표면 평활',
        '밀도 균일'
      ]
    }
  };
  
  const config = configs[type];
  
  return new ImageResponse(
    (
      <div
        style={{
          width: 284,
          height: 180,
          background: 'white',
          border: '1px solid #E0E0E0',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '2px solid #2d5a3d'
          }}
        >
          <span style={{ fontSize: 20 }}>{config.icon}</span>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0
            }}
          >
            {config.title}
          </h3>
        </div>
        
        {/* 리스트 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {config.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#2d5a3d',
                  fontWeight: 700
                }}
              >
                •
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: '#1A1A1A',
                  lineHeight: 1.5
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 284,
      height: 180,
      fonts: [
        { name: 'Pretendard', data: fontRegular, weight: 400 },
        { name: 'Pretendard', data: fontBold, weight: 700 }
      ]
    }
  );
}

// 3개 카드 모두 생성
export async function createAllMiniCards(data) {
  const usageCard = await createMiniCard(data, 'usage');
  const applicationCard = await createMiniCard(data, 'application');
  const featuresCard = await createMiniCard(data, 'features');
  
  return {
    usageCardUrl: `data:image/png;base64,${usageCard.toString('base64')}`,
    applicationCardUrl: `data:image/png;base64,${applicationCard.toString('base64')}`,
    featuresCardUrl: `data:image/png;base64,${featuresCard.toString('base64')}`
  };
}
```

---

## 🔧 buildHTML.js 통합

```javascript
import { createProductCard } from './generators/generateProductCard.js';
import { createAllMiniCards } from './generators/generateMiniCards.js';
import fs from 'fs';

// ... 기존 코드 ...

// mdf.png를 Base64로 변환
const mdfImageBuffer = fs.readFileSync('./assets/mdf.png');
const mdfImageBase64 = `data:image/png;base64,${mdfImageBuffer.toString('base64')}`;

// 제품 카드 데이터
const productCardData = {
  productImage: mdfImageBase64,
  titleKo: '중밀도 섬유판 (MDF)',
  titleEn: 'Medium Density Fiberboard',
  grade: 'E1',
  certification: 'KS F 3200',
  manufacturers: ['한솔', '유니드', '동화', '포레스코'],
  size: '1220 × 2440mm',
  thicknesses: '3T, 6T, 9T, 12T, 15T, 18T, 25T, 30T'
};

// 제품 카드 생성
const productCardBuffer = await createProductCard(productCardData);
data.productCardUrl = `data:image/png;base64,${productCardBuffer.toString('base64')}`;

// 미니 카드 데이터
const miniCardsData = {
  usages: ['일반 가구재', '건축 내장재', '포장재', '마루판재'],
  applications: ['가구 문짝', '벽체 마감재', '인테리어 소품', '수납 선반'],
  features: ['가공성 우수', '경제적', '표면 평활', '밀도 균일']
};

// 미니 카드 3개 생성
const miniCards = await createAllMiniCards(miniCardsData);
data.usageCardUrl = miniCards.usageCardUrl;
data.applicationCardUrl = miniCards.applicationCardUrl;
data.featuresCardUrl = miniCards.featuresCardUrl;
```

---

## 📐 HTML 템플릿 (Section 4 리팩토링)

### Handlebars 템플릿

```handlebars
<!-- Section 4: 제품 상세 (완전 시각화) -->
<section class="zart-section zart-detail-section" data-animate="fade-up">
  <div class="zart-detail-visual">
    
    <!-- 왼쪽: 제품 카드 -->
    <div class="zart-product-card">
      <img 
        src="{{productCardUrl}}" 
        alt="MDF 제품 카드" 
        class="zart-product-card-img"
      />
    </div>
    
    <!-- 오른쪽: 미니 카드 3개 -->
    <div class="zart-mini-cards">
      <img 
        src="{{usageCardUrl}}" 
        alt="주요 용도" 
        class="zart-mini-card"
      />
      <img 
        src="{{applicationCardUrl}}" 
        alt="적용 사례" 
        class="zart-mini-card"
      />
      <img 
        src="{{featuresCardUrl}}" 
        alt="주요 특징" 
        class="zart-mini-card"
      />
    </div>
    
  </div>
</section>
```

### CSS 스타일

```css
/* ===== Section 4: 제품 상세 (완전 시각화) ===== */
.zart-detail-visual {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: var(--zart-space-8); /* 32px */
  align-items: start;
}

.zart-product-card-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  box-shadow: var(--zart-shadow-1);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.zart-product-card-img:hover {
  transform: translateY(-4px);
  box-shadow: var(--zart-shadow-2);
}

.zart-mini-cards {
  display: flex;
  flex-direction: column;
  gap: var(--zart-space-4); /* 16px */
}

.zart-mini-card {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.zart-mini-card:hover {
  transform: translateX(4px);
  box-shadow: var(--zart-shadow-1);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .zart-detail-visual {
    grid-template-columns: 1fr;
    gap: var(--zart-space-6); /* 24px */
  }
  
  .zart-mini-cards {
    gap: var(--zart-space-3); /* 12px */
  }
}
```

---

## 📊 Google Sheet 스키마 추가

| 컬럼 | 필드명 | 타입 | 예시 |
|------|--------|------|------|
| X | detail_image_url | url | mdf.png URL |
| Y | detail_title_ko | text | 중밀도 섬유판 (MDF) |
| Z | detail_title_en | text | Medium Density Fiberboard |
| AA | detail_grade | text | E1 |
| AB | detail_certification | text | KS F 3200 |
| AC | detail_manufacturers | text | 한솔,유니드,동화,포레스코 |
| AD | detail_size | text | 1220 × 2440mm |
| AE | detail_thicknesses | text | 3T, 6T, 9T... |
| AF | detail_usages_json | JSON | ["일반 가구재", ...] |
| AG | detail_applications_json | JSON | ["가구 문짝", ...] |
| AH | detail_features_json | JSON | ["가공성 우수", ...] |

---

## 🎯 작업 순서 (에이전시용)

### 1단계: 파일 생성
```bash
touch src/generators/generateProductCard.js
touch src/generators/generateMiniCards.js
```

### 2단계: mdf.png 준비
```bash
# assets 폴더에 mdf.png 배치
mkdir -p assets
cp /path/to/mdf.png assets/
```

### 3단계: Satori 코드 작성
- `generateProductCard.js` 전체 복사
- `generateMiniCards.js` 전체 복사

### 4단계: 테스트 스크립트

```javascript
// test-section4.js
import { createProductCard } from './src/generators/generateProductCard.js';
import { createAllMiniCards } from './src/generators/generateMiniCards.js';
import fs from 'fs';

const mdfImage = fs.readFileSync('./assets/mdf.png');
const mdfBase64 = `data:image/png;base64,${mdfImage.toString('base64')}`;

const productData = {
  productImage: mdfBase64,
  titleKo: '중밀도 섬유판 (MDF)',
  titleEn: 'Medium Density Fiberboard',
  grade: 'E1',
  certification: 'KS F 3200',
  manufacturers: ['한솔', '유니드', '동화', '포레스코'],
  size: '1220 × 2440mm',
  thicknesses: '3T, 6T, 9T, 12T, 15T, 18T, 25T, 30T'
};

const miniData = {
  usages: ['일반 가구재', '건축 내장재', '포장재', '마루판재'],
  applications: ['가구 문짝', '벽체 마감재', '인테리어 소품', '수납 선반'],
  features: ['가공성 우수', '경제적', '표면 평활', '밀도 균일']
};

// 제품 카드 생성
const productCard = await createProductCard(productData);
fs.writeFileSync('product-card.png', productCard);
console.log('✅ product-card.png 생성!');

// 미니 카드 생성
const cards = await createAllMiniCards(miniData);
// Base64 → Buffer 변환 후 저장
const usageBuffer = Buffer.from(cards.usageCardUrl.split(',')[1], 'base64');
const appBuffer = Buffer.from(cards.applicationCardUrl.split(',')[1], 'base64');
const featBuffer = Buffer.from(cards.featuresCardUrl.split(',')[1], 'base64');

fs.writeFileSync('usage-card.png', usageBuffer);
fs.writeFileSync('application-card.png', appBuffer);
fs.writeFileSync('features-card.png', featBuffer);
console.log('✅ 미니 카드 3개 생성!');
```

### 5단계: 실행 테스트
```bash
node test-section4.js

# 결과물 확인
ls -lh *.png
# product-card.png (474x600, ~40KB)
# usage-card.png (284x180, ~15KB)
# application-card.png (284x180, ~15KB)
# features-card.png (284x180, ~15KB)
```

### 6단계: buildHTML.js 통합
위의 통합 코드 추가

### 7단계: HTML 템플릿 수정
기존 Section 4 코드 삭제 → 새 템플릿 추가

---

## ⚠️ 주의사항

### Satori 이미지 내 이미지 처리
```javascript
// ❌ 로컬 경로 불가
productImage: './assets/mdf.png'

// ✅ Base64 또는 공개 URL
productImage: 'data:image/png;base64,...'
productImage: 'https://cdn.example.com/mdf.png'
```

### 한글 폰트 필수
```javascript
// Pretendard Regular + Bold 모두 필요
fonts: [
  { name: 'Pretendard', data: fontRegular, weight: 400 },
  { name: 'Pretendard', data: fontBold, weight: 700 }
]
```

### 파일 크기 최적화
```
제품 카드: 474×600 → ~40KB
미니 카드: 284×180 → ~15KB × 3 = 45KB
총 Base64: ~85KB (허용 범위)
```

---

## 📊 장점 정리

### ✅ 완전 시각화의 이점

**1. 브랜드 일관성**
- 모든 요소가 DSS 디자인 시스템 준수
- 색상, 폰트, 간격 완벽 통일

**2. 정보 밀도 최적화**
- 제품 카드: 핵심 스펙 집약
- 미니 카드: 맥락 정보 제공
- 텍스트 vs 시각 = 균형

**3. 유지보수 용이**
- Google Sheet 데이터만 수정
- 자동으로 이미지 재생성
- 디자인 일관성 보장

**4. 모바일 최적화**
- 카드 단위로 스택
- 터치 영역 명확
- 스크롤 부담 감소

**5. 인쇄/공유 친화적**
- 이미지 그대로 저장 가능
- SNS 공유 시 프리뷰 완벽
- PDF 변환 시 레이아웃 유지

---

## 🎯 성공 기준

### 시각적 품질
- [ ] 제품 카드 이미지 선명도
- [ ] 미니 카드 정렬 완벽
- [ ] 한글 폰트 정상 렌더링
- [ ] 브랜드 색상 정확도

### 기능적 품질
- [ ] Base64 이미지 로드 속도
- [ ] Hover 효과 부드러움
- [ ] 모바일 스택 레이아웃
- [ ] 스크롤 애니메이션 동작

### 코드 품질
- [ ] 모듈화 (2개 파일 분리)
- [ ] 에러 핸들링
- [ ] 데이터 검증

---

## 🚀 최종 결과물

```html
<section class="zart-section zart-detail-section" data-animate="fade-up">
  <div class="zart-detail-visual">
    <div class="zart-product-card">
      <img src="data:image/png;base64,iVBORw..." alt="MDF 제품 카드" />
    </div>
    <div class="zart-mini-cards">
      <img src="data:image/png;base64,iVBORw..." alt="주요 용도" />
      <img src="data:image/png;base64,iVBORw..." alt="적용 사례" />
      <img src="data:image/png;base64,iVBORw..." alt="주요 특징" />
    </div>
  </div>
</section>
```

**Base64 총 용량**: ~85KB  
**전체 HTML 파일**: ~150KB (허용 범위)

---

**이 프롬프터를 에이전시에게 전달하세요!** 🎨✨

Section 4가 **완전 시각화**되어 훨씬 더 프로페셔널해집니다!
