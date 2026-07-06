# debug.md - 실행 지연 및 처리 누락 디버깅 리포트

## 1. 문제 현상
- `runBatch()` 실행 시 결과값으로 `SUCCESS`가 반환됨.
- 그러나 실제 구글 시트의 `READY` 상태인 행들이 `PROCESSING`으로 변경되지 않음.
- 이미지 생성 절차가 시작되지 않고 아무런 데이터 변화가 없음.

## 2. 원인 분석 (가설)

### 가설 A: `findReadyRows()`의 빈 배열 반환
- `runBatchInternal()` 로직상 `readyIndices.length === 0`일 경우 즉시 `SUCCESS`를 반환하도록 설계되어 있음.
- 시트에 `READY`가 있음에도 검색되지 않아 발생하는 현상.

### 가설 B: 시트 참조 오류 (`getActiveSheet()`)
- `SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()`가 사용자가 보고 있는 시트가 아닌 다른 시트(예: 숨겨진 시트, 빈 시트)를 참조하고 있을 가능성.
- 특히 Apps Script 에디터에서 직접 실행할 때 포커스된 시트가 다를 수 있음.

### 가설 C: 컬럼 인덱스 및 문자열 불일치
- `F열 (index 5)`이 아닌 다른 위치에 상태값이 있는 경우.
- `READY` 문자열에 눈에 보이지 않는 특수문자나 대소문자 차이가 있는 경우 (현재 `trim()`은 적용됨).

---

## 3. 디버깅 및 해결 방안

### 3.1 시트 참조 방식 강화
현재 `getActiveSheet()` 대신 첫 번째 시트를 명시적으로 참조하거나 이름을 확인하는 로직 검토:
```javascript
// 현재 방식
const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

// 권장 대안 (첫 번째 시트 고정)
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
```

### 3.2 데이터 범위 로그 확인 (수동 확인 필요)
사용자가 직접 GAS 에디터에서 아래 코드로 `Logger.log`를 찍어 확인해야 함:
- `values.length`가 실제 데이터 행수와 일치하는가?
- `values[1][5]`의 값이 정확히 `"READY"`인가?

### 3.3 컬럼 매핑 재검토
| 컬럼 | 인덱스 | 기대값 |
|---|---|---|
| A | 0 | (번호 등) |
| B | 1 | 제품명 |
| C | 2 | 상세설명 |
| D | 3 | 이미지URL |
| E | 4 | 섹션타입 |
| **F** | **5** | **상태(status)** |

---

## 4. 조치 이력

### 4.1 수정 완료 (2026-02-25)

- [x] **BUG 핵심 원인 (가설 A+B 확정)**: `getActiveSheet()`가 Apps Script 에디터 실행 시 잘못된 시트를 참조 → `findReadyRows()`가 빈 배열 반환 → 즉시 `SUCCESS` 반환
  - `batch.gs`: `getActiveSheet()` → `getSheets()[0]`으로 변경 (findReadyRows, processSingleRow 2곳)
- [x] **BUG `withLock()` return 누락**: `lock.gs`에서 `fn()` → `return fn()`으로 수정. 반환값이 삼켜져 `runBatch()`가 항상 `undefined` 반환되던 문제 해결
- [x] **BUG `TEMPLATE_UID` 불필요 필수 체크**: `config.gs`에서 프롬프트 기반 전환 후 미사용 `TEMPLATE_UID` 필수 검증 제거

### 4.2 디버깅 로그 추가 (2026-02-25)

- [x] `findReadyRows()`에 시트명, 행수, 헤더, F열 값 로깅 추가 → **READY 1건 정상 감지 확인**
- [x] `processSingleRow()`에 STEP 1~3 단계별 로깅 및 ERROR 스택트레이스 추가

### 4.3 API 에러 확인 (2026-02-25)

- GPT API 호출 실패: `You exceeded your current quota` → OpenAI API 크레딧 소진 (코드 문제 아님)
- 이후 GAS 플랫폼 에러: `알 수 없는 오류가 발생했습니다` → GAS 일일 실행 한도 초과 또는 일시적 서비스 장애
- **대기 후 재시도 필요** (GAS 한도는 자정 리셋, OpenAI는 크레딧 충전 필요)
- Nanobanana API 도메인 없음: `Address unavailable: https://api.nanobanana.com/v1/render` → 실제 API 아님

### 4.4 이미지 생성 엔진 전환 (2026-02-25)

- [x] `api.nanobanana.com`은 존재하지 않는 도메인. "나노바나나"는 Google Gemini 이미지 모델의 코드네임
- [x] `nano.gs` 전면 재작성: Gemini API (`gemini-2.5-flash-preview-image-generation`) 사용
- [x] base64 응답 → Google Drive 업로드(`ZartImageEngine` 폴더) → 공유 URL 반환 파이프라인 구축
- [x] `config.gs` 변경: `NANOBANANA_API_KEY` → `GEMINI_API_KEY`
- [x] Script Properties에 `GEMINI_API_KEY` 등록 필요 (Google AI Studio에서 발급)
