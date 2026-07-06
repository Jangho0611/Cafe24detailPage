# 카페24 상세페이지 디자인 규칙서
> 작성일: 2026-06-26
> 최종수정: 2026-06-29 (MDF 테스트 피드백 반영)
> 적용 대상: 대산우드랜드 카페24 쇼핑몰 상품 상세설명 (`{$product_detail}`)
> **이 문서의 모든 규칙은 절대 준수 사항입니다. 예외 없음.**

---

## 1. 파일 구조 규칙

| 항목 | 규칙 |
|------|------|
| 파일 시작 | `<!DOCTYPE html>` **절대 금지** |
| 시작 태그 | 반드시 `<style>` 또는 `<!-- 주석 -->`으로 시작 |
| CSS | 반드시 내부 `<style>` 태그 (외부 파일 링크 금지) |
| JS | 반드시 내부 `<script>` 태그 (외부 파일 링크 금지) |
| 외부 라이브러리 | **CDN 포함 일체 금지** (jQuery, GSAP, Swiper 등) |

---

## 2. CSS 규칙

| 항목 | 규칙 |
|------|------|
| 클래스 prefix | 반드시 `ds-` 로 시작 (예: `.ds-wrap`, `.ds-card`) |
| 최대 너비 | `max-width: 790px` (카페24 상세영역 기준) |
| 정렬 | `margin: 0 auto` 중앙 정렬 |
| 폰트 | `'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif` |
| `position: fixed` | **절대 금지** (카페24 레이아웃 충돌) |
| `z-index` 고값 | **금지** (카페24 UI 충돌) |
| `!important` | 최소화 (충돌 방지용 1회만 허용) |
| 반응형 | 반드시 포함 `@media (max-width: 768px)` |

---

## 3. 이미지 규칙

| 항목 | 규칙 |
|------|------|
| 경로 방식 | 반드시 외부 URL (`https://`) 만 사용 |
| 로컬/임의 경로 | **절대 금지** (`./`, `../` 및 GitHub raw 등 임의 변환 절대 금지) |
| 이미지 서버 | **사용자가 제공한 원본 이미지 URL(O열 등)을 그대로 사용** |
| alt 태그 | 반드시 작성 |

---

## 4. JavaScript 규칙

| 항목 | 규칙 |
|------|------|
| 허용 | 순수 Vanilla JS만 허용 |
| 카운터 애니메이션 | Intersection Observer API 사용 허용 |
| CSS 애니메이션 | keyframe, transition 허용 |
| `fetch` / `ajax` | **금지** (CORS 차단) |
| `localStorage` | **금지** (차단) |
| `document.write` | **금지** |
| `<form>` 태그 | **금지** (카페24 충돌) |
| `iframe` | **금지** (WAF 차단) |

---

## 5. 구현 가능 UI 목록

| UI | 구현 방법 |
|----|----------|
| 통계 카운터 | Intersection Observer + JS |
| 호버 카드 | CSS hover + transition |
| 탭 전환 | JS className toggle |
| 스크롤 등장 | Intersection Observer + CSS class |
| 가격 동향 표 | HTML table + CSS |
| 인포그래픽 | 외부 이미지 URL |
| 규격 테이블 | HTML table |
| 물성표 | HTML table |
| 반응형 그리드 | CSS flexbox / grid |
| 툴팁 | CSS hover |

---

## 6. 금지 UI 목록

| UI | 이유 |
|----|------|
| 슬라이더/캐러셀 | 외부 라이브러리 필요 |
| 동영상 embed | WAF 차단 가능 |
| 지도 | 외부 API 차단 |
| 실시간 데이터 | fetch 금지 |
| 모달/팝업 레이어 | 카페24 z-index 충돌 |
| 3D 애니메이션 | Three.js 금지 |

---

## 7. 템플릿 기본 구조 (반드시 이 구조 준수)

```html
<!-- 대산우드랜드 상세페이지 템플릿 | 카페24 {$product_detail} 삽입용 -->
<style>
  .ds-wrap {
    max-width: 790px;
    margin: 0 auto;
    font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    font-size: 15px;
    color: #1C1C1C;
    line-height: 1.75;
    background: #FFFFFF;
  }
  
  /* 모바일 반응형 스펙표 block 전환 */
  @media (max-width: 768px) {
    .ds-wrap {
      padding: 0 16px;
    }
    .ds-spec-table th,
    .ds-spec-table td {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .ds-spec-table th {
      background: #F8F8F8;
      border-bottom: none;
    }
  }
</style>

<div class="ds-wrap">
  <!-- 섹션 내용 -->
</div>

<script>
  // 순수 Vanilla JS만 허용
</script>
```

---

## 8. 체크리스트 (코드 완성 후 반드시 확인)

- [ ] `<!DOCTYPE html>` 없음
- [ ] 외부 CSS 파일 링크 없음
- [ ] 외부 JS 라이브러리 없음
- [ ] **사용자가 제공한 원본 이미지 URL 그대로 사용** (임의 변환/GitHub Pages 변환 없음)
- [ ] **이미지와 본문 텍스트 간 정보 중복 없음** (단면 구조, 휨강도 등 이미지 내부 정보의 본문 중복 서술 배제)
- [ ] **모바일 화면에서 표(table) th/td가 block 처리되어 깨지지 않음**
- [ ] 모든 클래스 `ds-` prefix
- [ ] `max-width: 790px` 적용
- [ ] 모바일 반응형 포함
- [ ] `position: fixed` 없음
- [ ] `<form>`, `<iframe>` 없음
- [ ] `fetch`, `localStorage` 없음

---

## 9. 브랜드 컬러 System & Hover 규정

| 용도 | 코드 | 비고 |
|------|------|------|
| 메인 (딥그린) | `#123628` | 버튼·보더·강조 |
| 포인트 (골드) | `#C9A84C` | 뱃지·포인트 |
| 텍스트 | `#1C1C1C` | 본문 (실측값) |
| 서브텍스트 | `#616161` | 간략설명 (실측값) |
| 섹션배경 | `#F8F8F8` | 표·카드 배경 |
| 기본배경 | `#FFFFFF` | 전체 배경 |
| 보더 | `#E0E0E0` | 구분선 |
| 반전텍스트 | `#FFFFFF` | 딥그린 배경 위 |

> ⚠️ **Hover 규칙**: 버튼 등 호버 상태에서 새로운 색상을 사용해서는 안 되며, 반드시 **`opacity: 0.92`** 효과만 적용해야 합니다.
> ⚠️ **그 외 색상 절대 사용 금지**

---

## 10. 타입 스케일 (크롬 개발자도구 실측 기준)

| 요소 | PC | 모바일 | weight | 비고 |
|------|-----|--------|--------|------|
| H2 헤드라인 | `24px` | `20px` | `700` | 우측 상품명과 동일 (실측) |
| 섹션 소제목 | `14px` | `13px` | `600` | "제품 상세 규격", ".ds-section-title" 등 |
| 스펙표 `th` | `14px` | `13px` | `600` | 항목 라벨 |
| 스펙표 `td` | `15px` | `13px` | `400` | 실제 값 |
| 정의문 | `15px` | `13px` | `400` | GEO용 / 우측 simple_desc 동일 (실측) |
| 본문 카드 | `15px` | `13px` | `400` | 이 제품이 필요한 이유 |
| CTA 버튼 | `15px` | `14px` | `600` | 행동 유도 |
| 마무리 문구 | `13px` | `13px` | `400` | 브랜드 문구 |
| line-height | `1.75` | `1.75` | — | 전체 공통 |

---

## 11. 페이지 구성 순서 (확정)

1. **H2 헤드라인** — 형식: 제품명 규격 / 두께범위 / 등급
2. **제품 정의문** — 제품 정의 + 출처 + 핵심표현을 자연스럽게 1줄로 연결 (기존 형식 폐기)
3. **스펙표** — 규격/두께/등급/제조사/즉시출고
4. **인포그래픽 섹션 제목** — `.ds-section-title` 클래스를 사용하여 이미지 바로 위에 배치 (A/B/C 타입에 따라 커스텀)
5. **인포그래픽** — 제공된 이미지 URL 그대로 사용
6. **이 제품이 필요한 이유** — 3문장 현장 언어 (후가공, 반복 제작, 재고 확인, 대량 납품 상담 중심 / 이미지 정보와 중복 금지)
7. **CTA 버튼** — `https://web-cadalog-ver10.vercel.app/` (hover 시 opacity: 0.92)
8. **마무리** — "35년 신뢰의 (주)대산이 공급합니다"