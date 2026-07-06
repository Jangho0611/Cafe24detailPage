# [Section 3 완전 대체] Gemini 스타일 통합 인포그래픽 - Satori 프롬프터

## 🎯 핵심 변경 사항

### 섹션 재배열
```
Section 1: 회사 차별점 (통계 카드)
Section 2: 가격 동향 (hover 그래프)
Section 3: 제품 상세 (Gemini 스타일) ← 완전 대체!
Section 4: 물성표 (인포그래픽)
Section 5: 만화 4컷 (맨 마지막으로 이동)
```

### Section 3 구조
**단일 Satori 이미지로 모든 정보 통합**

```
┌──────────────────────────────────────────────┐
│  상단: 제품 헤더                              │
│  ┌────────┬─────────────────┬─────────┐     │
│  │        │  HDF             │  E1     │     │
│  │ [제품] │  850kg/㎥        │  친환경 │     │
│  │ [사진] │  고밀도 섬유판   │  인증   │     │
│  └────────┴─────────────────┴─────────┘     │
├──────────────────────────────────────────────┤
│  중단: Visual Insight Graphic + 게이지        │
│  ┌──────────┬──────────┬─────────────┐      │
│  │ 일반 MDF │고밀도 HDF│   휨 강도   │      │
│  │          │          │             │      │
│  │ [확대]   │ [확대]   │   ◠◠◠◠◠    │      │
│  │ 이미지   │ 이미지   │   35 N/㎟   │      │
│  │          │    ✓     │             │      │
│  │ 거친구조 │조밀구조  │   밀도 높음 │      │
│  └──────────┴──────────┴─────────────┘      │
├──────────────────────────────────────────────┤
│  하단: Usage Guide Card                      │
│  ┌─────────┬─────────┬──────────────┐       │
│  │   🪑    │   📐    │     🏗️       │       │
│  │ 가구재  │ 마루판  │ 건축 내장재  │       │
│  └─────────┴─────────┴──────────────┘       │
└──────────────────────────────────────────────┘
```

---

## 🎨 Satori 구현

### 파일 위치
```
src/generators/generateSection3Complete.js
```

### 디자인 스펙

**이미지 크기**: 790px × 700px  
**구조**: 3개 영역 (헤더 + 비교/게이지 + 용도 카드)

#### 영역별 높이 배분
```
상단 (헤더):           180px  (25%)
중단 (비교+게이지):    340px  (49%)
하단 (용도 카드):      160px  (23%)
여백:                   20px   (3%)
─────────────────────────────
총계:                  700px
```

#### 색상 시스템
```javascript
colors: {
  background: '#FFFFFF',
  headerBg: '#FAFAFA',
  accent: '#2d5a3d',
  accentLight: '#3d6d4d',
  text: '#1A1A1A',
  textSub: '#616161',
  border: '#E0E0E0',
  cardBg: '#F5F5F5',
  badgeBg: 'linear-gradient(135deg, #2d5a3d 0%, #3d6d4d 100%)'
}
```

---

## 💻 완전한 구현 코드

```javascript
// src/generators/generateSection3Complete.js
import { ImageResponse } from '@vercel/og';
import fs from 'fs';

export async function createSection3Complete(data) {
  const fontRegular = fs.readFileSync('./fonts/Pretendard-Regular.woff');
  const fontBold = fs.readFileSync('./fonts/Pretendard-Bold.woff');
  
  const {
    productImage,        // HDF 제품 사진 Base64
    productName,         // HDF
    density,             // 850
    grade,               // E1
    normalMdfZoom,       // 일반 MDF 확대 이미지
    highDensityZoom,     // 고밀도 HDF 확대 이미지
    bendingStrength,     // 35
    usages               // ['가구재', '마루판', '건축 내장재']
  } = data;
  
  // 휨 강도 퍼센트 계산 (max 50으로 가정)
  const strengthPercent = (bendingStrength / 50) * 100;
  const strengthAngle = (strengthPercent / 100) * 180;
  
  return new ImageResponse(
    (
      <div
        style={{
          width: 790,
          height: 700,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          gap: 20
        }}
      >
        {/* ===== 상단: 제품 헤더 ===== */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            background: '#FAFAFA',
            padding: 24,
            borderRadius: 12,
            alignItems: 'center',
            border: '1px solid #E0E0E0'
          }}
        >
          {/* 제품 이미지 */}
          <div
            style={{
              width: 200,
              height: 140,
              background: 'white',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
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
          </div>
          
          {/* 제품 정보 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#1A1A1A',
                margin: 0
              }}
            >
              {productName}
            </h2>
            <p
              style={{
                fontSize: 20,
                color: '#616161',
                margin: 0
              }}
            >
              {density}kg/㎥+
            </p>
          </div>
          
          {/* E1 인증 뱃지 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #2d5a3d 0%, #3d6d4d 100%)',
              color: 'white',
              padding: '16px 24px',
              borderRadius: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minWidth: 100,
              boxShadow: '0 4px 12px rgba(45,90,61,0.3)'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#2d5a3d'
              }}
            >
              E1
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600
              }}
            >
              친환경 인증
            </span>
          </div>
        </div>
        
        {/* ===== 중단: Visual Insight + 게이지 ===== */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flex: 1
          }}
        >
          {/* Visual Insight Graphic */}
          <div
            style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1A1A1A',
                margin: 0
              }}
            >
              Visual Insight Graphic
            </h3>
            
            <div
              style={{
                flex: 1,
                display: 'flex',
                gap: 16
              }}
            >
              {/* 일반 MDF */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: 'white',
                  border: '1px solid #E0E0E0',
                  borderRadius: 12,
                  padding: 16
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1A1A1A',
                    margin: 0
                  }}
                >
                  일반 MDF
                </h4>
                
                <div
                  style={{
                    flex: 1,
                    background: '#F0F0F0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={normalMdfZoom}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                
                <p
                  style={{
                    fontSize: 12,
                    color: '#616161',
                    margin: 0,
                    textAlign: 'center'
                  }}
                >
                  거친 섬유 구조
                </p>
              </div>
              
              {/* 고밀도 HDF */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: 'white',
                  border: '2px solid #2d5a3d',
                  borderRadius: 12,
                  padding: 16
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2d5a3d',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  고밀도 HDF
                  <span style={{ fontSize: 16 }}>✓</span>
                </h4>
                
                <div
                  style={{
                    flex: 1,
                    background: '#F0F0F0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={highDensityZoom}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                
                <p
                  style={{
                    fontSize: 12,
                    color: '#2d5a3d',
                    margin: 0,
                    textAlign: 'center',
                    fontWeight: 600
                  }}
                >
                  조밀한 섬유 구조
                </p>
              </div>
            </div>
          </div>
          
          {/* 휨 강도 게이지 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1A1A1A',
                margin: 0
              }}
            >
              밀도 높음
            </h3>
            
            <div
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                gap: 16
              }}
            >
              {/* 반원형 게이지 SVG */}
              <svg width="180" height="110" viewBox="0 0 180 110">
                {/* 배경 아크 (회색) */}
                <path
                  d="M 30 90 A 70 70 0 0 1 150 90"
                  fill="none"
                  stroke="#E0E0E0"
                  stroke-width="16"
                  stroke-linecap="round"
                />
                
                {/* 진행 아크 (그라데이션) */}
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#2d5a3d' }} />
                    <stop offset="100%" style={{ stopColor: '#3d6d4d' }} />
                  </linearGradient>
                </defs>
                
                <path
                  d="M 30 90 A 70 70 0 0 1 150 90"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  stroke-width="16"
                  stroke-linecap="round"
                  stroke-dasharray={`${(strengthAngle / 180) * 220} 220`}
                />
                
                {/* 중앙 값 */}
                <text
                  x="90"
                  y="75"
                  text-anchor="middle"
                  font-size="32"
                  font-weight="700"
                  fill="#1A1A1A"
                >
                  {bendingStrength}
                </text>
                
                <text
                  x="90"
                  y="95"
                  text-anchor="middle"
                  font-size="13"
                  fill="#616161"
                >
                  N/㎟
                </text>
              </svg>
              
              {/* 라벨 */}
              <div
                style={{
                  fontSize: 14,
                  color: '#616161',
                  fontWeight: 600
                }}
              >
                휨 강도
              </div>
            </div>
          </div>
        </div>
        
        {/* ===== 하단: Usage Guide Card ===== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0
            }}
          >
            Usage Guide Card
          </h3>
          
          <div
            style={{
              display: 'flex',
              gap: 16
            }}
          >
            {usages.map((usage, idx) => {
              const icons = ['🪑', '📐', '🏗️'];
              
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    background: '#F5F5F5',
                    borderRadius: 12,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    border: '1px solid #E0E0E0'
                  }}
                >
                  <div style={{ fontSize: 40 }}>
                    {icons[idx]}
                  </div>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#1A1A1A',
                      margin: 0,
                      textAlign: 'center'
                    }}
                  >
                    {usage}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    {
      width: 790,
      height: 700,
      fonts: [
        { name: 'Pretendard', data: fontRegular, weight: 400 },
        { name: 'Pretendard', data: fontBold, weight: 700 }
      ]
    }
  );
}
```

---

## 🔧 buildHTML.js 통합

```javascript
import { createSection3Complete } from './generators/generateSection3Complete.js';
import fs from 'fs';

// 제품 이미지 Base64 변환
const hdfImageBuffer = fs.readFileSync('./assets/hdf.png');
const hdfImageBase64 = `data:image/png;base64,${hdfImageBuffer.toString('base64')}`;

// 확대 이미지 (일반 MDF vs 고밀도 HDF)
const normalMdfBuffer = fs.readFileSync('./assets/normal-mdf-zoom.jpg');
const normalMdfBase64 = `data:image/jpeg;base64,${normalMdfBuffer.toString('base64')}`;

const highDensityBuffer = fs.readFileSync('./assets/high-density-zoom.jpg');
const highDensityBase64 = `data:image/jpeg;base64,${highDensityBuffer.toString('base64')}`;

// Section 3 데이터
const section3Data = {
  productImage: hdfImageBase64,
  productName: 'HDF',
  density: 850,
  grade: 'E1',
  normalMdfZoom: normalMdfBase64,
  highDensityZoom: highDensityBase64,
  bendingStrength: 35,
  usages: ['가구재', '마루판', '건축 내장재']
};

// Section 3 이미지 생성
const section3Buffer = await createSection3Complete(section3Data);
data.section3ImageUrl = `data:image/png;base64,${section3Buffer.toString('base64')}`;
```

---

## 📐 HTML 템플릿

### Handlebars

```handlebars
<!-- Section 3: 제품 상세 (Gemini 스타일) -->
<section class="zart-section zart-section3-gemini" data-animate="fade-up">
  <img 
    src="{{section3ImageUrl}}" 
    alt="HDF 제품 상세 인포그래픽" 
    class="zart-section3-img"
  />
</section>
```

### CSS

```css
/* ===== Section 3: 제품 상세 (Gemini 스타일) ===== */
.zart-section3-gemini {
  text-align: center;
}

.zart-section3-img {
  width: 100%;
  max-width: 790px;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.zart-section3-img:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.08);
}

/* 모바일 */
@media (max-width: 768px) {
  .zart-section3-img {
    border-radius: 8px;
  }
}
```

---

## 📊 Google Sheet 스키마

| 컬럼 | 필드명 | 타입 | 예시 |
|------|--------|------|------|
| X | product_image_url | url | hdf.png |
| Y | product_name | text | HDF |
| Z | product_density | number | 850 |
| AA | product_grade | text | E1 |
| AB | normal_mdf_zoom_url | url | normal-mdf-zoom.jpg |
| AC | high_density_zoom_url | url | high-density-zoom.jpg |
| AD | bending_strength | number | 35 |
| AE | usage_1 | text | 가구재 |
| AF | usage_2 | text | 마루판 |
| AG | usage_3 | text | 건축 내장재 |

---

## 🎯 작업 순서

### 1단계: 파일 생성
```bash
touch src/generators/generateSection3Complete.js
```

### 2단계: 이미지 준비
```bash
# assets 폴더에 이미지 배치
mkdir -p assets
cp /path/to/hdf.png assets/
cp /path/to/normal-mdf-zoom.jpg assets/
cp /path/to/high-density-zoom.jpg assets/
```

### 3단계: Satori 코드 작성
- `generateSection3Complete.js` 전체 복사

### 4단계: 테스트 스크립트

```javascript
// test-section3.js
import { createSection3Complete } from './src/generators/generateSection3Complete.js';
import fs from 'fs';

// 이미지 Base64 변환
const hdfImage = fs.readFileSync('./assets/hdf.png');
const hdfBase64 = `data:image/png;base64,${hdfImage.toString('base64')}`;

const normalMdf = fs.readFileSync('./assets/normal-mdf-zoom.jpg');
const normalBase64 = `data:image/jpeg;base64,${normalMdf.toString('base64')}`;

const highDensity = fs.readFileSync('./assets/high-density-zoom.jpg');
const highBase64 = `data:image/jpeg;base64,${highDensity.toString('base64')}`;

const testData = {
  productImage: hdfBase64,
  productName: 'HDF',
  density: 850,
  grade: 'E1',
  normalMdfZoom: normalBase64,
  highDensityZoom: highBase64,
  bendingStrength: 35,
  usages: ['가구재', '마루판', '건축 내장재']
};

const buffer = await createSection3Complete(testData);
fs.writeFileSync('section3-complete.png', buffer);
console.log('✅ section3-complete.png 생성 완료!');
```

### 5단계: 실행
```bash
node test-section3.js

# 결과 확인
open section3-complete.png
# 790×700 이미지 확인
```

### 6단계: buildHTML.js 통합
위의 통합 코드 추가

### 7단계: HTML 템플릿 수정
- 기존 Section 3 코드 삭제
- 새 템플릿 추가

---

## ⚠️ 주의사항

### 확대 이미지 소스
```
옵션 1: 실제 확대 사진 촬영
옵션 2: AI 생성 텍스처
옵션 3: 스톡 이미지 구매
옵션 4: Placeholder (개발 단계)
```

**권장**: 실제 MDF/HDF 확대 사진 촬영 (진정성)

### SVG 그라데이션
```javascript
// Satori는 SVG 그라데이션 지원
<linearGradient id="gaugeGrad">
  <stop offset="0%" style={{ stopColor: '#2d5a3d' }} />
  <stop offset="100%" style={{ stopColor: '#3d6d4d' }} />
</linearGradient>
```

### 파일 크기 최적화
```
제품 이미지 (HDF):      ~30KB
확대 이미지 (일반):      ~15KB
확대 이미지 (고밀도):    ~15KB
Section 3 총:          ~60KB
```

---

## 📊 최종 섹션 구성

```
Section 1: 회사 차별점 (통계 카드)
  - 4개 카드 균등 배치
  - 카운터 애니메이션

Section 2: 가격 동향 (hover 그래프)
  - 변동율 표시
  - Satori 그래프 팝업

Section 3: 제품 상세 (Gemini 스타일) ← NEW!
  - 790×700 통합 이미지
  - 헤더 + 비교 + 게이지 + 용도

Section 4: 물성표 (인포그래픽)
  - Satori 테이블 이미지

Section 5: 만화 4컷 (맨 마지막)
  - 2×2 그리드
  - 부드러운 마무리
```

---

## ✅ 성공 기준

### 시각적 품질
- [ ] 790px 정확한 폭
- [ ] 3개 영역 균형잡힌 높이 배분
- [ ] 반원형 게이지 정확한 각도
- [ ] 한글 폰트 선명도

### 정보 전달
- [ ] 일반 MDF vs HDF 차이 명확
- [ ] 휨 강도 시각화 직관적
- [ ] 용도 카드 가독성

### 코드 품질
- [ ] 단일 파일 구현
- [ ] Base64 이미지 처리
- [ ] 에러 핸들링

---

## 🚀 최종 결과물

```html
<section class="zart-section zart-section3-gemini" data-animate="fade-up">
  <img 
    src="data:image/png;base64,iVBORw0KGgoAAAANS..." 
    alt="HDF 제품 상세 인포그래픽"
  />
</section>
```

**파일 크기**: ~60KB  
**로딩 속도**: 즉시 (Base64 인라인)  
**유지보수**: Google Sheet만 수정

---

**이 프롬프터를 에이전시에게 전달하세요!** 🎨✨

Section 3가 Gemini 스타일 프로페셔널 인포그래픽으로 완성됩니다!
