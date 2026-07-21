# Cafe24 Detail Page Automation Context

## v1.0 Release Complete

### Product Category Detection
- Product/category matching now takes priority over compare target matching.
- `compareTarget` is used only as a final fallback signal.
- Shared product category guide data is applied to auto enhancement and infographic prompts.

### Auto Enhancement
- E and H-M auto-fill prompt rules were finalized for first release.
- H `keyValue` is defined as the buyer-facing core position.
- J `structure` is defined as material, layer, and manufacturing structure.
- K/L/M output rules were tightened for practical confirmation points and use cases.

### HTML Generation
- HTML generation flow remains stable and unchanged in this release.
- Generated HTML continues to use structured product definition and information-summary notes.
- SEO/GEO-oriented constraints for neutral wording, no unsupported claims, and no repeated specs remain active.

### Infographic Generation
- Product category structure library was finalized for the first release.
- Type B structure zooms now branch by product category.
- Insulation icons now branch by product category instead of using a single common rule.
- Every structure library category has a matching structure selection rule.
- Type A source display is generated only when a source value exists.

### SEO/GEO 1st Pass
- Prompts include no-fabrication, no unsupported numbers, no unsupported source, and non-advertising rules.
- Type A image prompt no longer asks for an empty source label.
- Local representative product pipeline test passed for 20 products.

## Backlog

- Validate actual OpenAI output quality with representative products.
- Fine-tune prompts based on real HTML/image outputs.
- Add new product categories and category-specific rules as needed.
- Research image edit request workflow for v1.1 only; v1.0 operation keeps generate-only image flow.

# 2026-07-09 작업 기록

## 완료
- DECK_BOARD 제품군 추가
- 데크재 6종 자동 분류 지원
- AI Summary / FAQ / 인포그래픽 구조 추가
- A타입 VS 자동 분리 기능 추가
- compareTarget의 "VS" 자동 파싱
- A타입을 비교 중심 구조로 개선
- 일반합판 원산지 비교 규칙 추가
- DECK_BOARD 전용 비교 규칙 추가
- Hidden Clip / 상부 피스 혼용 방지 규칙 추가
- DECK_BOARD 규칙 과도한 제약 완화
- B타입 QA Standard 설계 완료
- Apps Script 배포 완료
- A타입/DECK_BOARD/PLYWOOD 테스트 완료

## 다음 Sprint
- T/X열 고정 폭 + 줄바꿈 유지
- A타입 이미지 품질 추가 개선(필요 시)
- 신규 제품군 DB 확장
- 실제 QA 결과 기반 미세 보정

## 2026.07.13 작업 기록

- A타입 VS 비교 구조 개선
- compareTarget의 VS 자동 파싱(좌/우 라벨 분리)
- DECK_BOARD A타입 비교 품질 개선
- Hidden Clip / 상부 피스 시공 혼용 금지 강화
- PLYWOOD 원산지 비교 규칙 개선
- 동남아산/베트남산 비교 방향 고정
- 제품군 DB 기준 우선, AI 추론에 의한 비교 방향 변경 금지
- A타입 2단을 핵심 비교 2~3개 중심으로 개선
- 구조 차이가 없는 비교(예: 합판 원산지)는 3단 생성 제거
- 구조 차이가 있는 비교(DECK_BOARD, PF/XPS 등)는 기존 3단 구조 비교 유지
- HTML과 중복되는 내용을 이미지에서 반복하지 않도록 규칙 추가
- A타입 역할을 "비교 전용"으로 정리하고 B타입과 역할 분리

# 2026-07-13 품질 개선 Sprint 완료

### 공통
- 제품군별 Product Fidelity 규칙 강화
- Human Writing 품질 개선
- 제품군 구조 인식 정확도 향상

### 단열재
- XPS(아이소핑크) 외관 규칙 추가
- PF보드 구조를 면재 → PF 폼 코어 → 면재로 고정
- 근거 없는 AL/GF 면재 생성 금지
- EPS/XPS/PF 구조 혼용 방지
- 맞물림(Tongue & Groove) 구조 오인식 제거
- 단열재 평면 맞댐 구조 기준 정립

### 석고보드
- 일반/방수/방화/차음 원지 외관 규칙 추가
- 색상은 외관에만 사용하고 텍스트 출력 금지

### 이보드
- XPS 기반 복합 단열보드 규칙 정립
- 구조: 표면 마감층 → 상부 PP 중공 구조판(약 3T) → XPS 코어
- XPS 코어가 제품 두께 대부분을 차지하도록 개선
- 도배용/페인트용은 동일 구조, 표면 질감만 구분
- 표면층은 흰색/연회색, XPS 코어만 핑크 계열 외관
- PP → XPS → PP 샌드위치 구조 제거

### 집성목/집성판
- 자동보완에서 라멜(Lamella) 용어 제거
- 집성 목재/폭 방향 접합 표현으로 통일
- C타입 중복 정보 제거
- 단계형(1단계/2단계/3단계) 네임택 제거
- 기존 이미지 중심 레이아웃 유지
- 외관/핵심 비교/선택 포인트 역할 분리

### QA 결과
- 이보드 Product Fidelity 크게 향상
- 집성 C타입 중복 개선 진행
- 최종 QA는 2026-07-14 진행 예정

## 2026-07-20 Type C 품질 개선

- 제품 한눈에 보기·제품 소개·FAQ의 역할을 분리해 섹션 간 중복을 줄였다.
- 용도는 대표 항목 최대 2개로 압축하고, 제품 소개에서는 용도 문장을 제거했다.
- FAQ의 용도 반복을 제거하고 구조별 상담 질문으로 정리했으며 FAQPage JSON-LD와 동일한 FAQ 배열을 사용한다.
- 유절·무절 비교 블록은 `APPROVED_GLUED_WOOD_TYPE_C_COPY.surfaceOptions`에 두 옵션이 모두 승인된 경우에만 구조 이미지 아래에 출력한다.
- 아카시아 집성판 사이드핑거(유절/무절)의 승인 데이터에 유절·무절 표면 옵션을 추가했고, 히노끼의 기존 동작과 단일 옵션 제품의 미출력을 확인했다.
- 삼나무 솔리드, 아카시아 사이드핑거(유절/무절), 히노끼 사이드핑거(유절/무절), 고무나무 탑핑거, 레드파인 솔리드로 FAQ·JSON-LD·비교 블록 조건 QA를 완료했다.

## 2026-07-21 이미지·HTML 품질 개선

- 라왕 각재 인포그래픽은 기존 각재 프롬프트에 라왕다루끼·후지·심재 옵션 안내 블록을 덧붙이는 구조로 정리했다.
- 고무나무 집성판은 기존 Type C 프롬프트에 탑핑거·사이드핑거 옵션 안내 블록을 덧붙이도록 정리했다.
- CRC보드, GS자이 천연 방수석고보드, 라디에타파인 계단재, 자나무(미장용), 소송 각재(KD), 뉴송 각재, 라왕 각재, 고무나무 집성판의 ALT를 보정했다.
- GS자이 천연 방수석고보드의 제품 소개와 구매 전 체크포인트 문장을 자연스럽게 수정하고, FAQ·Schema 출력은 유지했다.
- 소송 각재(KD)의 ALT를 사각 단면과 규격별 각재 형태가 드러나도록 수정했다.
- JavaScript 문법 검사와 `git diff --check`를 통과했다.

### 이미지 QA 메모

- 라왕 각재: 기존 프롬프트 유지에는 성공했으며 옵션 표현은 추가 개선이 필요하다.
- 고무나무 집성판: 메인 탑핑거 설명 뒤 하단에서 탑핑거·사이드핑거를 다시 보여 정보가 중복된다. 다음 작업에서 이미지 프롬프트만 보정한다.

### TODO

- 라왕 각재 이미지 개선
- 고무나무 집성판 이미지 개선
- 전체 상품 최종 QA
