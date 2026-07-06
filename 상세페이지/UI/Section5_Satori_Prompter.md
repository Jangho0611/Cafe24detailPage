# [Section 5 추가] 물성표 인포그래픽 - Satori 구현 프롬프터

## 🎯 목적

기존 4개 섹션에 **Section 5: 물성표 인포그래픽**을 추가합니다.  
복잡한 표 데이터를 **Satori로 시각화된 이미지**로 생성하여 가독성을 높입니다.

---

## 📊 Section 5 개요

### 위치
```
Section 1: 회사 차별점
Section 2: 가격 동향
Section 3: 만화 4컷
Section 4: 제품 상세
Section 5: 물성표 인포그래픽 ← NEW!
```

### 데이터 소스
**상세.md의 물성표 (prop-table)** → Satori 이미지로 변환

---

## 📋 물성표 데이터 구조

### 원본 데이터 (상세.md에서 추출)

| 특성 구분 | 기준 | 단위 | 9T | 12T | 15T | 18T |
|----------|------|------|-----|-----|-----|-----|
| 두께 | KS F 3200 | mm | 9 | 12 | 15 | 18 |
| 밀도 | KS F 3200 | kg/㎥ | 530 | 530 | 530 | 530 |
| 함수율 | KS F 3200 | % | 50% 이하 (4개 열 colspan) |
| 박리강도 | KS F 3200 | N/㎟ | 0.3 | 0.3 | 0.3 | 0.3 |
| 휨강도 | KS F 3200 | N/㎟ | 15 | 15 | 15 | 15 |
| 횡영계수 | KS F 3200 | N/㎟ | ≥1300 | ≥1300 | ≥1300 | ≥1300 |

### JSON 형식 변환
```json
{
  "title": "물성표 (상세)",
  "subtitle": "MDF 두께별 주요 물성",
  "thicknesses": ["9T", "12T", "15T", "18T"],
  "properties": [
    {
      "name": "밀도",
      "unit": "kg/㎥",
      "standard": "KS F 3200",
      "values": [530, 530, 530, 530]
    },
    {
      "name": "휨강도",
      "unit": "N/㎟",
      "standard": "KS F 3200",
      "values": [15, 15, 15, 15]
    },
    {
      "name": "박리강도",
      "unit": "N/㎟",
      "standard": "KS F 3200",
      "values": [0.3, 0.3, 0.3, 0.3]
    },
    {
      "name": "함수율",
      "unit": "%",
      "standard": "KS F 3200",
      "values": ["≤50%", "≤50%", "≤50%", "≤50%"]
    }
  ]
}
```

---

## 🎨 Satori 디자인 스펙

### 이미지 크기
```javascript
{
  width: 790,    // 컨테이너 고정폭과 동일
  height: 400,   // 4개 항목 + 여백
}
```

### 레이아웃 구조
```
┌────────────────────────────────────────────────────┐
│  물성표 (상세)                                      │
│  MDF 두께별 주요 물성                               │
├────────────┬──────┬──────┬──────┬──────┬──────────┤
│  특성      │ 단위  │  9T  │ 12T  │ 15T  │  18T     │
├────────────┼──────┼──────┼──────┼──────┼──────────┤
│  밀도      │kg/㎥ │ 530  │ 530  │ 530  │  530     │
│  휨강도    │N/㎟  │  15  │  15  │  15  │   15     │
│  박리강도  │N/㎟  │ 0.3  │ 0.3  │ 0.3  │  0.3     │
│  함수율    │  %   │      ≤50% 이하               │
└────────────┴──────┴──────┴──────┴──────┴──────────┘
```

### 디자인 시스템 적용 (DSS.md 기준)

#### 색상
```javascript
colors: {
  background: '#FFFFFF',
  headerBg: '#2d5a3d',      // 브랜드 녹색
  headerText: '#FFFFFF',
  rowBg: '#FAFAFA',         // 교차 행 배경
  text: '#1A1A1A',
  subText: '#616161',
  border: '#E0E0E0'
}
```

#### 타이포그래피
```javascript
fonts: [
  {
    name: 'Pretendard',
    data: fontBuffer,
    weight: 400,
    style: 'normal'
  },
  {
    name: 'Pretendard',
    data: fontBoldBuffer,
    weight: 700,
    style: 'normal'
  }
]

fontSize: {
  title: 28,        // 물성표 (상세)
  subtitle: 16,     // MDF 두께별...
  header: 18,       // 테이블 헤더
  cell: 16          // 셀 내용
}
```

---

## 💻 Satori 구현 코드

### 파일 위치
```
src/
├── generators/
│   ├── generateGraph.js       # 기존 (가격 그래프)
│   └── generatePropertyTable.js  # NEW (물성표)
```

### generatePropertyTable.js

```javascript
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createPropertyTable(data) {
  const fontRegular = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  const fontBold = fs.readFileSync('./fonts/Pretendard-Bold.woff');
  
  const { title, subtitle, thicknesses, properties } = data;
  
  return new ImageResponse(
    (
      <div
        style={{
          width: 790,
          height: 400,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: 32
        }}
      >
        {/* 제목 */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
              marginBottom: 8
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#616161',
              margin: 0
            }}
          >
            {subtitle}
          </p>
        </div>
        
        {/* 테이블 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #E0E0E0',
            borderRadius: 8,
            overflow: 'hidden'
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: 'flex',
              background: '#2d5a3d',
              color: 'white'
            }}
          >
            <div style={{ flex: 2, padding: 16, fontWeight: 700, fontSize: 18 }}>
              특성
            </div>
            <div style={{ flex: 1, padding: 16, fontWeight: 700, fontSize: 18, textAlign: 'center' }}>
              단위
            </div>
            {thicknesses.map((t) => (
              <div
                key={t}
                style={{ flex: 1, padding: 16, fontWeight: 700, fontSize: 18, textAlign: 'center' }}
              >
                {t}
              </div>
            ))}
          </div>
          
          {/* 데이터 행 */}
          {properties.map((prop, idx) => (
            <div
              key={prop.name}
              style={{
                display: 'flex',
                background: idx % 2 === 0 ? '#FAFAFA' : 'white',
                borderTop: '1px solid #E0E0E0'
              }}
            >
              <div style={{ flex: 2, padding: 16, fontSize: 16, color: '#1A1A1A' }}>
                {prop.name}
              </div>
              <div style={{ flex: 1, padding: 16, fontSize: 14, color: '#616161', textAlign: 'center' }}>
                {prop.unit}
              </div>
              {prop.values.map((val, vIdx) => (
                <div
                  key={vIdx}
                  style={{ flex: 1, padding: 16, fontSize: 16, color: '#1A1A1A', textAlign: 'center' }}
                >
                  {val}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* KS 인증 표시 */}
        <div
          style={{
            marginTop: 16,
            fontSize: 14,
            color: '#616161',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span style={{ marginRight: 8 }}>✓</span>
          <span>KS F 3200 인증 기준</span>
        </div>
      </div>
    ),
    {
      width: 790,
      height: 400,
      fonts: [
        {
          name: 'Pretendard',
          data: fontRegular,
          weight: 400
        },
        {
          name: 'Pretendard',
          data: fontBold,
          weight: 700
        }
      ]
    }
  );
}
```

---

## 🔧 TRD 업데이트

### Google Sheet 스키마 추가

| 컬럼 | 필드명 | 타입 | 예시 |
|------|--------|------|------|
| Z | property_table_json | JSON | {...} |

### buildHTML.js 수정

```javascript
import { createPropertyTable } from './generatePropertyTable.js';

// ... 기존 코드 ...

// 물성표 데이터 (Sheet에서 또는 하드코딩)
const propertyData = {
  title: "물성표 (상세)",
  subtitle: "MDF 두께별 주요 물성",
  thicknesses: ["9T", "12T", "15T", "18T"],
  properties: [
    {
      name: "밀도",
      unit: "kg/㎥",
      values: [530, 530, 530, 530]
    },
    {
      name: "휨강도",
      unit: "N/㎟",
      values: [15, 15, 15, 15]
    },
    {
      name: "박리강도",
      unit: "N/㎟",
      values: [0.3, 0.3, 0.3, 0.3]
    },
    {
      name: "함수율",
      unit: "%",
      values: ["≤50%", "≤50%", "≤50%", "≤50%"]
    }
  ]
};

// 물성표 이미지 생성
const propertyTableBuffer = await createPropertyTable(propertyData);
data.propertyTableUrl = `data:image/png;base64,${propertyTableBuffer.toString('base64')}`;
```

---

## 📐 DSS 업데이트

### Section 5 추가

```css
/* ===== Section 5: 물성표 인포그래픽 ===== */
.zart-property-section {
  text-align: center;
}

.zart-property-title {
  font-size: var(--zart-text-xl);
  font-weight: var(--zart-weight-bold);
  margin-bottom: var(--zart-space-4);
  color: var(--zart-text);
}

.zart-property-image {
  width: 100%;
  max-width: 790px;
  height: auto;
  border-radius: 8px;
  box-shadow: var(--zart-shadow-1);
}

.zart-property-note {
  font-size: var(--zart-text-sm);
  color: var(--zart-text-sub);
  margin-top: var(--zart-space-4);
}
```

### HTML 템플릿 추가

```handlebars
<!-- Section 5: 물성표 인포그래픽 -->
<section class="zart-section zart-property-section" data-animate="fade-up">
  <h3 class="zart-property-title">제품 물성 상세</h3>
  <img 
    src="{{propertyTableUrl}}" 
    alt="MDF 물성표" 
    class="zart-property-image"
  />
  <p class="zart-property-note">
    * 상기 수치는 KS F 3200 기준이며, 실제 제품은 약간의 편차가 있을 수 있습니다.
  </p>
</section>
```

---

## 🎯 작업 순서 (에이전시용)

### 1단계: Satori 코드 작성
- `src/generators/generatePropertyTable.js` 파일 생성
- 위 코드 정확히 복사
- Pretendard Bold 폰트 추가 다운로드

### 2단계: 데이터 준비
- 물성표 JSON 구조 확인
- Google Sheet 연동 또는 하드코딩

### 3단계: 이미지 생성 테스트
```bash
node test-property-table.js
# → property-table.png 생성 확인
```

### 4단계: buildHTML.js 통합
- createPropertyTable 함수 import
- 이미지 생성 후 Base64 변환
- data.propertyTableUrl에 저장

### 5단계: HTML 템플릿 추가
- Section 5 코드 추가
- data-animate 속성으로 스크롤 애니메이션

### 6단계: 테스트
- [ ] 790px 이미지 정상 렌더링
- [ ] 폰트 한글 정상 표시
- [ ] 교차 행 배경색 적용
- [ ] 스크롤 애니메이션 동작

---

## ⚠️ 주의사항

### Satori 제약사항
```javascript
// ❌ 지원 안 됨
border-collapse: collapse;  // 테이블 관련 일부 CSS
nth-child()                 // 의사 선택자

// ✅ 대안
인라인 스타일로 각 요소 개별 지정
조건부 배경색 (idx % 2)
```

### 폰트 경로
```javascript
// Pretendard Bold 추가 필요
./fonts/
├── Pretendard-Regular.woff  # 기존
└── Pretendard-Bold.woff      # NEW
```

### 이미지 크기
```
790px × 400px = ~30KB (Base64)
전체 HTML 파일 크기에 영향 최소
```

---

## 📊 성공 기준

### 시각적 품질
- [ ] 테이블 레이아웃 정렬 완벽
- [ ] 한글 폰트 정상 렌더링
- [ ] DSS 색상 시스템 적용
- [ ] 교차 행 배경색 (#FAFAFA)

### 기능적 품질
- [ ] Base64 인라인 이미지 로드
- [ ] 모바일에서 가독성 유지
- [ ] 스크롤 애니메이션 동작

### 코드 품질
- [ ] Satori 코드 모듈화
- [ ] JSON 데이터 구조 명확
- [ ] 에러 핸들링 포함

---

## 🎨 최종 결과물 예시

```html
<section class="zart-section zart-property-section" data-animate="fade-up">
  <h3 class="zart-property-title">제품 물성 상세</h3>
  <img 
    src="data:image/png;base64,iVBORw0KGgo..." 
    alt="MDF 물성표" 
    class="zart-property-image"
  />
  <p class="zart-property-note">
    * 상기 수치는 KS F 3200 기준이며, 실제 제품은 약간의 편차가 있을 수 있습니다.
  </p>
</section>
```

---

## 📦 추가 리소스

### Pretendard Bold 폰트 다운로드
```bash
wget https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2
```

### 테스트 스크립트 (test-property-table.js)
```javascript
import { createPropertyTable } from './src/generators/generatePropertyTable.js';
import fs from 'fs';

const testData = {
  title: "물성표 (상세)",
  subtitle: "MDF 두께별 주요 물성",
  thicknesses: ["9T", "12T", "15T", "18T"],
  properties: [
    { name: "밀도", unit: "kg/㎥", values: [530, 530, 530, 530] },
    { name: "휨강도", unit: "N/㎟", values: [15, 15, 15, 15] },
    { name: "박리강도", unit: "N/㎟", values: [0.3, 0.3, 0.3, 0.3] },
    { name: "함수율", unit: "%", values: ["≤50%", "≤50%", "≤50%", "≤50%"] }
  ]
};

const buffer = await createPropertyTable(testData);
fs.writeFileSync('property-table.png', buffer);
console.log('✅ property-table.png 생성 완료!');
```

---

**이 프롬프터를 에이전시에게 전달하세요!** 🎨✨

Satori로 생성된 물성표 이미지가 Section 5로 추가됩니다.
