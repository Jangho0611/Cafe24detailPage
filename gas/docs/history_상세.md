# history_상세.md - Zart Image Engine 개발 히스토리

## Phase 1~5: 초기 템플릿 기반 자동화 구축

- 구글 시트 제품 데이터(제품명/설명/사진/섹션 타입)를 기반으로 이미지 자동 생성 엔진 설계
- 템플릿(Modifications) 방식으로 이미지 생성 파이프라인 구현
- 기본 배치 처리 로직 및 상태 관리(READY → PROCESSING → DONE/FAIL) 구현

## Phase 6: 모듈형 코드 분리

- 단일 파일에서 역할별 GAS 파일 분리:
  - `Code.gs` — 엔트리 포인트, 커스텀 메뉴
  - `batch.gs` — 배치 처리 핵심 로직
  - `gpt.gs` — OpenAI GPT-4 Turbo Preview API 호출
  - `nano.gs` — 이미지 생성 API 호출
  - `lock.gs` — LockService 래핑 (동시성 제어)
  - `config.gs` — Script Properties 관리

## Phase 7: 프롬프트 기반 생성(Prompt-Driven) 전환

- 기존 템플릿(Modifications) 방식에서 **프롬프트 기반**으로 엔진 전환
- GPT가 레이아웃, 배경, 텍스트 배치(Section 1~3)를 모두 결정하여 `full_image_prompt`로 출력
- GPT 출력 포맷: `json_object` 모드, `{ "full_image_prompt": "..." }` 구조 고정

## Phase 8: 배치 처리 로직 고도화

- 헤더 행(1행) 스킵 로직 적용
- 상태값 공백 제거(`trim()`) 적용
- 활성 시트 참조 방식 정비

## Phase 9: GAS 커스텀 메뉴 및 실행 가시성 확보

- `onOpen()`에서 "Zart Image Engine" 커스텀 메뉴 생성
- `runBatch()`를 전역 함수로 노출하여 메뉴에서 직접 실행 가능

## Phase 10: 버그 수정 및 Gemini API 전환 (2026-02-25)

### 10.1 버그 수정 (3건)

#### BUG 1 — `getActiveSheet()` 잘못된 시트 참조 (핵심 원인)

- **현상**: `runBatch()` 실행 시 `SUCCESS` 반환되지만 `READY` 행이 처리되지 않음
- **원인**: `SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()`가 Apps Script 에디터에서 실행 시 사용자가 보고 있는 시트가 아닌 다른 시트를 참조
- **결과**: `findReadyRows()`가 빈 배열 반환 → 즉시 `SUCCESS` 반환
- **수정**: `batch.gs`의 `findReadyRows()`와 `processSingleRow()` 2곳에서 `getActiveSheet()` → `getSheets()[0]`으로 변경

#### BUG 2 — `withLock()` 반환값 누락

- **현상**: `runBatch()`가 항상 `undefined` 반환
- **원인**: `lock.gs`에서 `fn()` 호출 시 `return` 키워드 누락
- **수정**: `fn()` → `return fn()`

#### BUG 3 — `TEMPLATE_UID` 불필요 필수 검증

- **현상**: 프롬프트 기반 전환 후 사용하지 않는 `TEMPLATE_UID`가 필수로 검증됨
- **수정**: `config.gs`에서 `TEMPLATE_UID` 필수 검증 제거

### 10.2 디버깅 로그 추가

- `findReadyRows()`에 시트명, 행수, 헤더, F열 값 로깅 추가 → READY 1건 정상 감지 확인
- `processSingleRow()`에 STEP 1~3 단계별 로깅 및 ERROR 스택트레이스 추가

### 10.3 API 에러 대응

| 에러 | 원인 | 대응 |
|---|---|---|
| GPT API `You exceeded your current quota` | OpenAI API 크레딧 소진 | 크레딧 충전 필요 (코드 문제 아님) |
| GAS `알 수 없는 오류가 발생했습니다` | GAS 일일 실행 한도 초과 또는 일시적 서비스 장애 | 자정 리셋 후 재시도 |
| `Address unavailable: https://api.nanobanana.com/v1/render` | 존재하지 않는 도메인 | 이미지 생성 엔진 전환 (아래 10.4) |

### 10.4 이미지 생성 엔진 전환: Nanobanana → Gemini API

- **발견**: `api.nanobanana.com`은 실존하지 않는 도메인. "나노바나나"는 Google Gemini 이미지 생성 모델의 코드네임
- **`nano.gs` 전면 재작성**:
  - 모델: `gemini-2.5-flash-image`
  - 엔드포인트: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
  - 요청: `responseModalities: ["TEXT", "IMAGE"]` 설정
  - 응답: `candidates[0].content.parts[].inlineData` 에서 base64 이미지 추출
  - 파이프라인: base64 → `Utilities.base64Decode()` → `Utilities.newBlob()` → Google Drive `ZartImageEngine` 폴더 업로드 → 공유 URL 반환
- **`config.gs` 변경**: `NANOBANANA_API_KEY` → `GEMINI_API_KEY`
- **Script Properties**: `GEMINI_API_KEY` 등록 (Google AI Studio 발급)

### 10.5 Gemini API 연동 트러블슈팅

| 순서 | 에러 | 원인 | 수정 |
|---|---|---|---|
| 1 | 404 `models/gemini-2.5-flash-preview-image-generation is not found` | 잘못된 모델명 | `gemini-2.5-flash-image`로 수정 |
| 2 | 429 `You exceeded your current quota` | 첫 번째 API 키 할당량 초과 | 새 API 키 발급 및 교체 |
| 3 | `Missing required Script Properties` | OPENAI_API_KEY 누락 (GEMINI_API_KEY만 등록) | 두 키 모두 등록 |
| 4 | curl 테스트 STATUS: OK 확인 | API 자체는 정상 동작 확인 | — |

### 10.6 0바이트 이미지 문제 대응

- **현상**: Gemini API 호출 성공, Drive에 파일 생성되지만 파일 크기가 0바이트
- **진단 추가**:
  - `callNano()`: parts 개수, 각 part 키, base64 길이 로깅
  - `uploadToDrive()`: decoded bytes 길이, blob size, Drive file size 로깅
- **수정**:
  - base64 정제 로직 추가: 공백/개행 제거(`/[\s\r\n]/g`), URL-safe 문자 변환(`-`→`+`, `_`→`/`)
- **상태**: 수정 후 검증 대기 중

---

## 현재 시스템 구성

```
gas/
├── Code.gs          # 엔트리 포인트, onOpen() 메뉴
├── batch.gs         # 배치 처리 (findReadyRows, processSingleRow, runBatchInternal)
├── gpt.gs           # OpenAI GPT-4 Turbo Preview API 호출
├── nano.gs          # Gemini API 이미지 생성 + Drive 업로드
├── lock.gs          # LockService 래핑
├── config.gs        # Script Properties 관리
└── docs/
    ├── 개발_상세_자동화.md   # 기술 스펙 및 운영 정책
    ├── debug.md              # 디버깅 리포트
    └── history_상세.md       # 개발 히스토리 (이 문서)
```

## 구글 시트 스키마

| 컬럼 | 이름 | 내용 |
|---|---|---|
| B | product_name | 제품명 |
| C | description_html | 제품설명(HTML) |
| D | product_image_url | 제품사진 URL |
| E | section2_type | comparison / performance / structure / eco |
| F | status | READY / PROCESSING / DONE / FAIL |
| G | result_image_url | 생성 결과 이미지 URL |
| H | last_error | 실패 사유 |
| I | retry_count | 재시도 횟수 (최대 2회) |

## Script Properties

| 키 | 용도 |
|---|---|
| `OPENAI_API_KEY` | GPT-4 Turbo Preview 프롬프트 생성 |
| `GEMINI_API_KEY` | Gemini 이미지 생성 (Google AI Studio 발급) |
