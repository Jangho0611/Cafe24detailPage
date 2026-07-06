# 상세내용_UI.md
## Zart 건축자재 제품 설명 이미지 자동화 프로젝트

---

## 1. 프로젝트 목표

건축자재 100개 제품의 설명 이미지를 자동으로 생성한다.

- 제품마다 **일관된 디자인** 유지
- **한글 깨짐 없이** 출력
- 구글시트 데이터 → 이미지 **완전 자동화**
- 최종 결과물: 카페24 상품 상세페이지 업로드용

---

## 2. 최종 이미지 구조 (3섹션)

```
┌─────────────────────────────────────┐
│  SECTION 1: 제품                     │
│  제품사진(좌) + 제품명/밀도/등급(우)   │
├─────────────────────────────────────┤
│  SECTION 2: 특성 (Visual Insight)    │
│  비교이미지(일반 vs 고밀도) + 도넛차트  │
├─────────────────────────────────────┤
│  SECTION 3: 용도 (Usage Guide)       │
│  아이콘3개 + 용도 라벨               │
└─────────────────────────────────────┘
```

**캔버스:** 800 x 1400px / 배경 #FFFFFF

---

## 3. 전체 자동화 흐름

```
구글시트
(B: 제품명 | C: 제품설명 HTML | D: 사진 URL)
        ↓
Google Apps Script
        ↓
ChatGPT API (제품설명 분석)
→ 텍스트 데이터 추출
        ↓
나노바나나 API (이미지 생성)
→ 고정 템플릿 + 데이터 주입
        ↓
생성된 이미지 URL → 구글시트 저장
        ↓
카페24 상품 상세페이지 업로드
```

---

## 4. 역할 분리

| 구성요소 | 역할 | 상태 |
|---|---|---|
| **구글시트** | 제품 데이터 관리 (B/C/D열) | ✅ 운영중 |
| **나노바나나 템플릿** | 디자인 고정 (레이아웃/색상/폰트) | ✅ 완성 |
| **ChatGPT API** | 제품설명 분석 → 텍스트 추출 | ⬜ 예정 |
| **Google Apps Script** | 전체 자동화 연결 | ⬜ 예정 |
| **카페24** | 최종 이미지 업로드 | ⬜ 예정 |

---

## 5. 나노바나나 템플릿 상세

### 5-1. 폰트 설정 (한글 깨짐 해결)

| 폰트 파일 | 용도 | 적용 레이어 |
|---|---|---|
| NotoSansKR-Bold.ttf | 굵은 텍스트 | product_name, grade, chart_center_label |
| NotoSansKR-Regular.ttf | 일반 텍스트 | 나머지 모든 한글 레이어 |

> ⚠️ 내장 "Noto Sans KR" 사용 금지 → 반드시 Custom Fonts에서 선택

### 5-2. 레이어 구성

**SECTION 1 — 제품**

| 레이어명 | 타입 | 내용 | API Name |
|---|---|---|---|
| hero_background | rectangle | 배경 #F5F0E8 | - |
| product_image | image | 제품 사진 | product_image_url |
| product_name | text | 예: HDF | product_name |
| product_density | text | 예: 850kg/m3+ | product_density |
| grade_badge_circle | ellipse | 녹색 원 #2E8B57 | - |
| grade_badge_text | text | 예: E1 | grade |
| grade_label | text | 예: 친환경 인공 | grade_label |

**SECTION 2 — 특성**

| 레이어명 | 타입 | 내용 | API Name |
|---|---|---|---|
| visual_section_title | text | Visual Insight Graphic | - |
| compare_background | rectangle | 배경 #F0EDE6 | - |
| compare_left_label | text | 예: 일반 MDF | compare_left_label |
| compare_left_image | image | 비교 이미지 (좌) | compare_left_url |
| compare_right_label | text | 예: 고밀도 HDF | compare_right_label |
| compare_right_image | image | 비교 이미지 (우) | compare_right_url |
| chart_donut_image | image | 도넛 차트 PNG | chart_url |
| chart_top_label | text | 예: 밀도 높음 | - |
| chart_center_label | text | 예: 휨 강도 | - |
| chart_value | text | 예: 35 N/mm2 | strength_value |

**SECTION 3 — 용도**

| 레이어명 | 타입 | 내용 | API Name |
|---|---|---|---|
| usage_section_title | text | Usage Guide Card | - |
| use_card_1_bg | rectangle | 배경 #F0EDE6 | - |
| use_icon_1 | image | 용도 아이콘 1 | use_icon_1_url |
| use_label_1 | text | 예: 가구재 | use_label_1 |
| use_card_2_bg | rectangle | 배경 #F0EDE6 | - |
| use_icon_2 | image | 용도 아이콘 2 | use_icon_2_url |
| use_label_2 | text | 예: 마루판 | use_label_2 |
| use_card_3_bg | rectangle | 배경 #F0EDE6 | - |
| use_icon_3 | image | 용도 아이콘 3 | use_icon_3_url |
| use_label_3 | text | 예: 건축 내장재 | use_label_3 |

### 5-3. 이전에 깨진 4개 레이어 (수정 완료)

| 레이어명 | 텍스트 | 수정 내용 |
|---|---|---|
| grade_label | 친환경 인공 | NotoSansKR-Regular 적용 |
| chart_top_label | 밀도 높음 | NotoSansKR-Regular 적용 |
| chart_center_label | 휨 강도 | NotoSansKR-Bold 적용 |
| use_label_3 | 건축 내장재 | NotoSansKR-Regular 적용 |

---

## 6. ChatGPT API 프롬프트 설계

### 입력
- 구글시트 C열: 제품설명 HTML

### 출력 (JSON)
```json
{
  "product_name": "HDF",
  "product_density": "850kg/m3+",
  "grade": "E1",
  "grade_label": "친환경 인공",
  "compare_left_label": "일반 MDF",
  "compare_right_label": "고밀도 HDF",
  "chart_label": "휨 강도",
  "chart_value": "35 N/mm2",
  "chart_top_label": "밀도 높음",
  "use_label_1": "가구재",
  "use_label_2": "마루판",
  "use_label_3": "건축 내장재"
}
```

### System Prompt
```
당신은 건축자재 제품설명을 분석하여
나노바나나 이미지 생성용 JSON 데이터를 추출하는 전문가입니다.
반드시 JSON만 출력하세요. 설명 없이 JSON만.
```

---

## 7. 나노바나나 API 호출 구조

```json
{
  "template": "<<TEMPLATE_UID>>",
  "modifications": [
    { "name": "product_image_url",   "image_url": "<<D열 URL>>" },
    { "name": "product_name",        "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Bold" },
    { "name": "product_density",     "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "grade",               "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Bold" },
    { "name": "grade_label",         "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "compare_left_label",  "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "compare_left_url",    "image_url": "<<비교이미지 좌 URL>>" },
    { "name": "compare_right_label", "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "compare_right_url",   "image_url": "<<비교이미지 우 URL>>" },
    { "name": "chart_url",           "image_url": "<<도넛차트 URL>>" },
    { "name": "strength_value",      "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "use_icon_1_url",      "image_url": "<<아이콘1 URL>>" },
    { "name": "use_label_1",         "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "use_icon_2_url",      "image_url": "<<아이콘2 URL>>" },
    { "name": "use_label_2",         "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" },
    { "name": "use_icon_3_url",      "image_url": "<<아이콘3 URL>>" },
    { "name": "use_label_3",         "text": "<<ChatGPT>>", "font_family": "NotoSansKR-Regular" }
  ]
}
```

---

## 8. 진행 단계 현황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 나노바나나 템플릿 완성 | ✅ 완료 |
| 2 | NotoSansKR 폰트 업로드 | ✅ 완료 |
| 3 | 한글 깨짐 4개 레이어 수정 | 🔄 테스트 중 |
| 4 | 테스트 이미지 1장 생성 확인 | ⬜ 예정 |
| 5 | ChatGPT API 프롬프트 작성 | ⬜ 예정 |
| 6 | Google Apps Script 연동 | ⬜ 예정 |
| 7 | 100개 자동화 실행 | ⬜ 예정 |
| 8 | 카페24 업로드 | ⬜ 예정 |

---

## 9. 다음 액션

1. **한글 테스트 이미지 생성** → 4개 레이어 한글 정상 출력 확인
2. **Template UID + API Key 확인** → API 호출 JSON 완성
3. **ChatGPT API 프롬프트 튜닝** → 1개 제품 테스트
4. **Apps Script 작성** → 100개 자동화 실행
