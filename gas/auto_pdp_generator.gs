// ==========================================
// 대산우드랜드 상세페이지 자동화 스크립트
// ==========================================

const SHEET_ID = '1N11hwkpsc2T9ix4CBbqpkrZKko6RvRreSz4N8Ix2mME';
const SHEET_NAME = '시트4';

const COL = {
  CATEGORY: 1,
  PRODUCT_NAME: 2,
  THICKNESS: 3,
  SIZE: 4,
  GRADE: 5,
  MAKER: 6,
  COMPARE_TARGET: 7,
  KEY_VALUE: 8,
  SOURCE: 9,
  STRUCTURE: 10,
  EMPHASIS: 11,
  USE1: 12,
  USE2: 13,
  STOCK_TYPE: 14,
  IMAGE_URL: 15,
  IMAGE_ENGINE: 16,
  TYPE: 18,
  CHECKBOX: 19,
  PROMPT: 20,
  STATUS: 21,
  ERROR: 22
};

const STATUS = {
  READY: 'READY',
  PROMPT_CREATED: 'PROMPT_CREATED',
  GENERATING: 'GENERATING',
  IMAGE_UPLOADED: 'IMAGE_UPLOADED',
  HTML_CREATED: 'HTML_CREATED',
  ERROR: 'ERROR'
};

function onEdit(e) {
  if (!e || !e.range) return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  const val = e.range.getValue();

  if (row < 2) return;

  Logger.log('onEdit 감지 - row:' + row + ' col:' + col + ' val:' + val);

  // R열(18) 타입 변경 → 인포 프롬프터 재생성
  if (col === 18 && ['A', 'B', 'C'].includes(String(val).trim())) {
    createPrompt(row);
  }

  if (
    col === COL.PROMPT &&
    String(val).trim() !== '' &&
    (!('oldValue' in e) || String(e.oldValue) !== String(val))
  ) {
    const sheet = getSheet();
    if (sheet) {
      sheet.getRange(row, COL.STATUS).setValue(STATUS.PROMPT_CREATED);
    }
  }

  // S열(19) 체크 → 인포 프롬프터 생성
  if (col === 19 && val === true) {
    e.range.setValue(false);
    createPrompt(row);
  }

  // W열(23) 체크 → U열에 HTML_REQUESTED 상태 기록
  // (외부 API 호출 권한 없으므로 상태만 기록 후 별도 트리거로 처리)
  if (col === 23 && val === true) {
    e.range.setValue(false);
    const sheet = getSheet();
    if (sheet) {
      sheet.getRange(row, 21).setValue('HTML_REQUESTED');
    }
  }
}

function createPrompt(row) {
  const sheet = getSheet();
  if (!sheet) return;

  if (!row || row < 2) {
    setError(sheet, row, '행 번호가 올바르지 않습니다: ' + row);
    return;
  }

  const data = getRowData(sheet, row);
  const prompt = buildInfographicPrompt(data);

  if (!prompt) {
    setError(sheet, row, '지원하지 않는 타입입니다: ' + data.type);
    return;
  }

  sheet.getRange(row, COL.PROMPT).setValue(prompt);
  sheet.getRange(row, COL.STATUS).setValue(STATUS.PROMPT_CREATED);
  sheet.getRange(row, COL.ERROR).setValue('');

  Logger.log(row + '행 프롬프트 생성 완료');
}

function generateHTML(row) {
  Logger.log('generateHTML 시작 - row: ' + row);
  const sheet = getSheet();
  if (!sheet) return;

  if (!row || row < 2) {
    setError(sheet, row, '행 번호가 올바르지 않습니다: ' + row);
    return;
  }

  const data = getRowData(sheet, row);
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) { setError(sheet, row, 'API Key 없음'); return; }

  const sectionTitle = {
    A: '구조와 수치 비교',
    B: '단면 구조 분석',
    C: '표면 질감 비교'
  }[data.type] || '제품 상세 정보';

  const infraImg = data.infographic
    ? `<div class="ds-infographic"><img src="${data.infographic}" alt="${data.productName} ${sectionTitle}" style="max-width:100%;width:100%;height:auto;display:block;margin:0;"></div>`
    : '';

  const prompt = buildHTMLPrompt(data);
  const response = callTextAPI(apiKey, prompt);

  if (!response) { setError(sheet, row, 'API 응답 없음'); return; }

  let content;
  try {
    const clean = response.replace(/```json|```/g, '').trim();
    content = JSON.parse(clean);
  } catch (e) {
    setError(sheet, row, 'JSON 파싱 실패: ' + e.message);
    return;
  }

  const css = `<style>
.ds-wrap{max-width:790px;margin:0 auto;font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;line-height:1.75;color:#1C1C1C;}
.ds-wrap *{box-sizing:border-box;}
.ds-wrap h2{font-size:24px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;}
.ds-define{background:#F8F8F8;border-left:3px solid #123628;color:#616161;padding:16px;margin:0 0 20px 0;font-size:15px;}
.ds-spec-table{width:100%;border-collapse:collapse;margin:0 0 20px 0;}
.ds-spec-table th{background:#F8F8F8;color:#616161;font-weight:600;font-size:14px;padding:12px;border-bottom:1px solid #E0E0E0;width:30%;text-align:left;}
.ds-spec-table td{background:#FFFFFF;color:#1C1C1C;font-weight:400;font-size:15px;padding:12px;border-bottom:1px solid #E0E0E0;text-align:left;}
.ds-section-title{font-size:14px;font-weight:600;color:#123628;margin:24px 0 8px 0;}
.ds-infographic{border:1px solid #E0E0E0;border-radius:4px;overflow:hidden;margin:0 0 24px 0;}
.ds-reason{background:#F8F8F8;border-top:2px solid #123628;padding:16px;margin:0 0 20px 0;font-size:15px;color:#616161;}
.ds-reason p{margin:0 0 8px 0;}
.ds-reason p:last-child{margin:0;}
.ds-cta{display:block;width:100%;background:#123628;color:#FFFFFF;padding:16px;border-radius:4px;text-align:center;text-decoration:none;font-size:15px;font-weight:600;margin:0 0 12px 0;}
.ds-cta:hover{opacity:0.92;}
.ds-phone{color:#616161;font-size:13px;text-align:center;margin:0 0 20px 0;}
.ds-footer{background:#123628;color:#FFFFFF;text-align:center;padding:20px;font-size:13px;}
@media(max-width:768px){.ds-wrap{padding:0 16px;}.ds-wrap h2{font-size:20px;}.ds-spec-table th,.ds-spec-table td{display:block;width:100%;}}
</style>`;

  let defaultNotes = buildDefaultNotes(data)
    .map(sanitizeNoteText)
    .filter(function (text) { return text && String(text).trim() !== ''; });
  if (defaultNotes.length === 0) {
    defaultNotes = buildFallbackNotes();
  }

  const reasonHtml = defaultNotes
    .map(function (text) { return '    <p>' + text + '</p>'; })
    .join('\n');

  const html = `${css}
<div class="ds-wrap">
  <h2>${data.productName}</h2>
  <div class="ds-define">${content.define}</div>
  <table class="ds-spec-table">
    <tr><th>규격</th><td>${data.size}</td></tr>
    <tr><th>두께옵션</th><td>${data.thickness}</td></tr>
    <tr><th>등급</th><td>${data.grade}</td></tr>
    <tr><th>제조사</th><td>${data.maker}</td></tr>
    <tr><th>출고안내</th><td>${getStockStatusText(data.stockType)}</td></tr>
  </table>
  <div class="ds-section-title">${sectionTitle}</div>
  ${infraImg}
  <div class="ds-reason">
${reasonHtml}
  </div>
  <a class="ds-cta" href="https://web-cadalog-ver10.vercel.app/">대량구매 견적 · 규격 확인하기 →</a>
  <div class="ds-phone">전화 031-388-3833 · 평일 09:00–18:00</div>
  <div class="ds-footer">(주)대산 · 35년 신뢰의 건축자재 전문 공급사</div>
</div>`;

  sheet.getRange(row, 24).setValue(html);
  sheet.getRange(row, 21).setValue('HTML_CREATED');
  Logger.log(row + '행 HTML 생성 완료');
}

function checkAndGenerateHTML() {
  const sheet = getSheet();
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const statuses = sheet.getRange(2, COL.STATUS, lastRow - 1, 1).getValues();

  for (let i = 0; i < statuses.length; i += 1) {
    const row = i + 2;
    const status = statuses[i][0];

    if (status === STATUS.IMAGE_UPLOADED) {
      try {
        generateHTML(row);
      } catch (err) {
        setError(sheet, row, err.toString());
      }
    }
  }
}

// 1분마다 실행되는 트리거 함수
function processHTMLQueue() {
  const sheet = getSheet();
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  for (let row = 2; row <= lastRow; row += 1) {
    const status = sheet.getRange(row, 21).getValue();
    if (status === 'HTML_REQUESTED') {
      sheet.getRange(row, 21).setValue('HTML_PROCESSING');
      generateHTML(row);
      break;
    }
  }
}

// 트리거 설정 함수 (1회만 실행)
function setupTrigger() {
  ScriptApp.newTrigger('processHTMLQueue')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('트리거 설정 완료');
}

function setupStockTypeDropdown() {
  const sheet = getSheet();
  if (!sheet) return;

  sheet.getRange(1, COL.STOCK_TYPE).setValue('재고구분');

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['재고', '주문재', '일부재고'], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, COL.STOCK_TYPE, lastRow - 1, 1).setDataValidation(rule);
  Logger.log('재고구분 드롭다운 설정 완료');
}

function fillMissingProductInfoForActiveRow() {
  const sheet = getSheet();
  if (!sheet) return;

  const range = sheet.getActiveRange();
  if (!range) return;

  const row = range.getRow();
  if (row < 2) {
    SpreadsheetApp.getActiveSpreadsheet().toast('상품 행을 선택한 뒤 실행하세요.');
    return;
  }

  const fields = [
    { key: 'grade', col: COL.GRADE },
    { key: 'keyValue', col: COL.KEY_VALUE },
    { key: 'source', col: COL.SOURCE },
    { key: 'structure', col: COL.STRUCTURE },
    { key: 'emphasis', col: COL.EMPHASIS },
    { key: 'use1', col: COL.USE1 },
    { key: 'use2', col: COL.USE2 }
  ];
  const missingFields = fields.filter(function (field) {
    return String(sheet.getRange(row, field.col).getValue() || '').trim() === '';
  });

  if (missingFields.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('E, H~M열에 비어 있는 칸이 없습니다.');
    return;
  }

  const data = getRowData(sheet, row);
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    setError(sheet, row, 'API Key 없음');
    return;
  }

  const response = callTextAPI(apiKey, buildAutoFillSpecPrompt(data));
  if (!response) {
    setError(sheet, row, '상품 정보 자동보완 API 응답 없음');
    return;
  }

  let content;
  try {
    const clean = response.replace(/```json|```/g, '').trim();
    content = JSON.parse(clean);
  } catch (e) {
    setError(sheet, row, '상품 정보 자동보완 JSON 파싱 실패: ' + e.message);
    return;
  }

  missingFields.forEach(function (field) {
    const currentValue = sheet.getRange(row, field.col).getValue();
    const nextValue = content[field.key];
    if (String(currentValue || '').trim() === '' && nextValue) {
      sheet.getRange(row, field.col).setValue(String(nextValue).trim());
    }
  });

  sheet.getRange(row, COL.ERROR).setValue('');
  SpreadsheetApp.getActiveSpreadsheet().toast(row + '행 E, H~M 자동보완 완료');
}

function buildAutoFillSpecPrompt(data) {
  return `
아래 A~D, F~G열 입력값만 근거로 상품 정보 입력값을 보완하라.
응답은 JSON만 반환한다. 설명 문장, 마크다운, 코드블록은 출력하지 않는다.

출력 형식:
{
  "grade": "E열 등급",
  "keyValue": "H열 핵심 표현",
  "source": "I열 출처 또는 확인 상태",
  "structure": "J열 구조/재질/구성",
  "emphasis": "K열 작업 또는 확인 포인트",
  "use1": "L열 대표 용도 1",
  "use2": "M열 대표 용도 2"
}

작성 규칙:
- A~D, F~G열 입력값만 근거로 작성한다.
- 제조사 공식 자료, 인증, 성능, 원산지는 추정하지 않는다.
- 등급은 추정하지 않는다.
- 등급을 확정할 수 없으면 "제조사 자료 확인 필요" 또는 "확인 필요"로 작성한다.
- 인증, KS, 준불연, E0/E1, 방염, 친환경 등급은 입력 데이터나 제조사 자료 근거가 없으면 작성하지 않는다.
- source는 실제 참고자료가 명확한 경우에만 작성한다.
- source 좋은 예: "벽산 제품자료", "LX 제품자료", "KCC 제품자료", "제조사 카탈로그".
- source 근거가 없으면 빈 문자열 ""로 작성한다.
- source에 "입력 데이터 기준", "제조사 자료 확인 필요", "확인 필요"를 작성하지 않는다.
- 광고성 표현을 사용하지 않는다.
- 우수한, 뛰어난, 최고급, 프리미엄, 추천, 최적, 효율적, 가성비 표현을 사용하지 않는다.
- 짧은 명사구 또는 짧은 안내 표현으로 작성한다.
- 제품 상세 HTML 문장이 아니라 시트 입력값으로 쓰기 좋은 형태로 작성한다.
- 값이 불확실하면 단정하지 않는다.

컬럼별 작성 규칙:
- keyValue는 핵심 특징만 작성한다. 제품명을 반복하지 않는다.
- keyValue 좋은 예: "다층 단판 적층 구조", "시멘트계 보드", "균일한 단면 구조", "페놀수지 발포 단열재".
- structure는 제품 구조와 재질만 설명한다.
- structure 좋은 예: "원목 단판을 교차 적층한 판재", "목재 섬유를 고온고압으로 성형한 판재", "석고 코어 양면에 원지를 결합한 판재", "시멘트와 섬유질 원료를 압축 성형한 보드".
- keyValue와 structure는 같은 내용을 반복하지 않는다.
- keyValue와 structure 조합 예: keyValue "시멘트계 보드 / 벽체·천장 바탕재", structure "시멘트와 섬유질 원료를 압축 성형한 보드".
- emphasis는 작업 전 확인 포인트를 2~3개 포함한다.
- emphasis 좋은 예: "절단면 처리, 고정 방식, 마감 조건 확인", "표면 상태, 도장 조건, 재단 치수 확인", "단열 시공 조건, 연결 부위, 마감 방식 확인".
- use1은 대표 사용처를 구체적으로 작성한다.
- use1 좋은 예: "실내 벽체 바탕재 및 칸막이 시공", "가구 문짝 제작 및 인테리어 몰딩", "외벽 단열 시공 및 천장 단열 작업".
- use2는 보조 사용처를 구체적으로 작성한다.
- use2 좋은 예: "천장 바탕재 및 외장 마감 하지재", "도장 마감 가구 및 필름 래핑 작업", "연결 부위 보강 및 마감 조건 확인".
- use에 "건축자재", "보드", "실내 마감재", "벽체 바탕재", "인테리어 몰딩", "자재"처럼 짧거나 추상적인 표현만 작성하지 않는다.
- 제품명을 그대로 반복하지 않는다.
- category를 structure에 그대로 쓰지 않는다.
- K/L/M은 단어 하나가 아니라 구체적인 작업 단위로 작성한다.
- 나쁜 예: "다양한 용도", "고품질 자재", "프리미엄 보드", "실내 마감재", "벽체 바탕재", "인테리어 몰딩", "건축자재", "입력 데이터 기준", "제조사 자료 확인 필요".

제품군별 자동보완 가이드:
- 합판 계열: structure "목재 단판을 교차 적층한 판재", keyValue "다층 단판 적층 구조", emphasis "재단 치수, 표면 상태, 마감 방향 확인", use 후보 "가구 심재", "벽체 바탕재", "인테리어 제작", "노출 마감".
- MDF 계열: structure "목재 섬유를 고온고압으로 성형한 판재", keyValue "균일한 단면 구조 / 도장·필름 마감용", emphasis "표면 상태, 도장 조건, 재단 치수 확인", use 후보 "가구 문짝 제작", "인테리어 몰딩", "도장 마감", "필름 래핑 작업".
- 석고보드 계열: structure "석고 코어 양면에 원지를 결합한 판재", keyValue "벽체·천장 시공용 보드", emphasis "이음부, 고정 방식, 마감 조건 확인", use 후보 "벽체 시공", "천장 시공", "칸막이 작업", "실내 마감 바탕재".
- 시멘트보드 / CRC / 섬유시멘트 계열: structure "시멘트와 섬유질 원료를 압축 성형한 보드", keyValue "시멘트계 보드 / 벽체·천장 바탕재", emphasis "절단면 처리, 고정 방식, 마감 조건 확인", use 후보 "실내 벽체 바탕재", "칸막이 시공", "천장 바탕재", "외장 마감 하지재".
- 각재 / 목재 계열: structure "목재를 제재하거나 건조 가공한 각재", keyValue "목공 하지재 / 구조 보강재", emphasis "절단 치수, 고정 방식, 사용 위치 확인", use 후보 "목공 하지 작업", "벽체 상틀", "천장틀", "보강재 작업".
- 단열재 / PF보드 계열: structure "단열재 코어에 면재를 결합한 구조", keyValue "단열 시공용 보드 / 두께 옵션 운영", emphasis "단열 시공 조건, 연결 부위, 마감 조건 확인", use 후보 "외벽 단열 시공", "천장 단열 작업", "단열 보강", "마감 전 바탕 작업".

[A~D, F~G열 입력값]
분류: ${data.category}
제품명: ${data.productName}
두께: ${data.thickness}
규격: ${data.size}
제조사: ${data.maker}
비교대상: ${data.compareTarget}
  `;
}

function getSheet() {
  // onEdit에서는 openById 권한 없음 -> getActiveSpreadsheet 사용
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  } catch (e) {
    return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  }
}

function getRowData(sheet, row) {
  return {
    category: sheet.getRange(row, COL.CATEGORY).getValue(),
    productName: sheet.getRange(row, COL.PRODUCT_NAME).getValue(),
    thickness: sheet.getRange(row, COL.THICKNESS).getValue(),
    size: sheet.getRange(row, COL.SIZE).getValue(),
    grade: sheet.getRange(row, COL.GRADE).getValue(),
    maker: sheet.getRange(row, COL.MAKER).getValue(),
    compareTarget: sheet.getRange(row, COL.COMPARE_TARGET).getValue(),
    keyValue: sheet.getRange(row, COL.KEY_VALUE).getValue(),
    source: sheet.getRange(row, COL.SOURCE).getValue(),
    structure: sheet.getRange(row, COL.STRUCTURE).getValue(),
    emphasis: sheet.getRange(row, COL.EMPHASIS).getValue(),
    use1: sheet.getRange(row, COL.USE1).getValue(),
    use2: sheet.getRange(row, COL.USE2).getValue(),
    stockType: sheet.getRange(row, COL.STOCK_TYPE).getValue(),
    infographic: sheet.getRange(row, COL.IMAGE_URL).getValue(),
    type: sheet.getRange(row, COL.TYPE).getValue()
  };
}

function getStockStatusText(stockType) {
  const value = String(stockType || '').trim();
  if (value === '재고') return '재고보유 즉시출고 가능';
  if (value === '주문재') return '주문재 / 입고 일정 확인 필요';
  if (value === '일부재고') return '일부 규격 재고보유 / 주문 전 재고 확인 필요';
  return '재고 및 출고 일정 확인 필요';
}

function buildHTMLNoteFacts(data) {
  return [
    data.structure ? '구조: ' + data.structure : '',
    data.keyValue ? '핵심 구조 표현: ' + data.keyValue : '',
    data.use1 ? '현장 사용 정보: ' + data.use1 : '',
    data.use2 ? '현장 사용 정보: ' + data.use2 : '',
    data.emphasis ? '입력 강조 정보: ' + data.emphasis : '',
    data.source ? '제조사 자료 출처: ' + data.source : ''
  ].filter(function (text) { return text && String(text).trim() !== ''; });
}

function cleanNoteSource(text) {
  if (!text) return '';

  return String(text)
    .split(/[，、,]/)[0]
    .replace(/카페 벽체 노출 마감/g, '노출 마감')
    .replace(/카페 가구 제작/g, '가구 제작')
    .replace(/상업공간 벽체/g, '벽체 마감')
    .replace(/고급 가구 제작/g, '가구 제작')
    .replace(/단면을 노출하는 인테리어 가구 및 CNC 정밀 가공의 최고급재/g, '인테리어 가구 및 CNC 정밀 가공')
    .replace(/의 최고급재/g, '')
    .replace(/최고급재/g, '')
    .replace(/고급/g, '')
    .replace(/적합/g, '사용')
    .replace(/뛰어난/g, '')
    .replace(/우수/g, '')
    .replace(/최적/g, '')
    .replace(/이상적/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeUseTerm(text) {
  if (!text) return '';

  return String(text)
    .replace(/ 작업$/g, '')
    .replace(/ 마감$/g, ' 마감')
    .trim();
}

function buildUseNote(cleanUse1, cleanUse2) {
  const use1 = normalizeUseTerm(cleanUse1);
  const use2 = normalizeUseTerm(cleanUse2);

  if (use1 && use2) {
    return use1 + ' 및 ' + use2 + ' 작업에 사용됩니다.';
  }
  if (use1) {
    return use1 + ' 작업에 사용됩니다.';
  }
  if (use2) {
    return use2 + ' 작업에 사용됩니다.';
  }
  return '';
}

function buildEmphasisNote(cleanEmphasis, data) {
  if (!cleanEmphasis) return '';
  const label = String(data && data.category || '') + ' ' + String(data && data.productName || '');
  const rawEmphasis = String(data && data.emphasis || '');
  if (label.indexOf('석고') !== -1 && cleanEmphasis.indexOf('재단') !== -1) {
    return '현장 절단 시 칼을 이용한 작업이 가능합니다.';
  }
  if (
    label.indexOf('MDF') !== -1 &&
    ['가공성', '도장', '필름', '래핑'].some(function (word) {
      return cleanEmphasis.indexOf(word) !== -1 || rawEmphasis.indexOf(word) !== -1;
    })
  ) {
    return '도장 및 필름 래핑 작업은 표면 상태와 작업 조건을 함께 확인합니다.';
  }
  if (
    (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('단열') !== -1) &&
    ['에너지절약기준', '두께를 최소화', '만족', '단열 성능'].some(function (word) {
      return cleanEmphasis.indexOf(word) !== -1;
    })
  ) {
    return '단열 성능이나 기준 충족 여부는 제조사 자료 기준으로 확인합니다.';
  }
  if (cleanEmphasis.indexOf('CNC') !== -1) {
    return 'CNC 가공이 필요한 경우 작업 조건을 먼저 확인합니다.';
  }
  if (cleanEmphasis.indexOf('노출') !== -1) {
    return '노출 마감은 입고 제품의 표면 상태를 확인합니다.';
  }
  return cleanEmphasis + ' 관련 사항은 주문 전에 확인합니다.';
}

function buildStructureNote(cleanStructure, data) {
  if (!cleanStructure) return '';

  const label = String(data.category || '') + ' ' + String(data.productName || '');
  if (label.indexOf('석고') !== -1) {
    return cleanStructure.indexOf('판재') !== -1
      ? cleanStructure + '입니다.'
      : cleanStructure + ' 판재입니다.';
  }
  if (label.indexOf('각재') !== -1) {
    return cleanStructure.indexOf('각재') !== -1
      ? cleanStructure + '입니다.'
      : cleanStructure + ' 각재입니다.';
  }
  if (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('단열') !== -1) {
    if (['페놀수지', '알루미늄', 'GF', '면재', '복합'].some(function (word) {
      return cleanStructure.indexOf(word) !== -1;
    })) {
      return 'PF보드는 페놀수지 발포 단열재에 면재를 복합한 구조입니다.';
    }
    return cleanStructure.indexOf('단열재') !== -1
      ? cleanStructure + ' 구조입니다.'
      : cleanStructure + ' 단열재 구조입니다.';
  }
  return cleanStructure.indexOf('구조') !== -1
    ? cleanStructure + '입니다.'
    : cleanStructure + ' 적층 구조입니다.';
}

function getCategoryDefaultNotes(data) {
  const label = String(data.category || '') + ' ' + String(data.productName || '');

  if (label.indexOf('MDF') !== -1) {
    return [
      '노출 마감은 입고 제품의 표면 상태를 확인합니다.',
      '도장 작업은 표면 상태와 작업 조건을 함께 확인합니다.',
      '재단이 필요한 경우 작업 치수를 먼저 확인합니다.'
    ];
  }

  if (label.indexOf('석고') !== -1) {
    return [
      '시공 전 벽체와 천장 규격을 확인합니다.',
      '이음부와 마감 방법을 함께 확인합니다.',
      '현장 반입 전 필요한 수량과 시공 면적을 확인합니다.',
      '보관 시 습기와 충격에 주의합니다.'
    ];
  }

  if (label.indexOf('각재') !== -1) {
    return [
      '구조재 사용 여부와 각재 치수를 먼저 확인합니다.',
      '절단이 필요한 경우 작업 치수를 먼저 확인합니다.',
      '노출 마감은 입고 제품의 표면 상태를 확인합니다.'
    ];
  }

  if (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('단열') !== -1) {
    return [
      '시공 환경에 맞는 두께와 마감 조건을 확인합니다.',
      '단열 시공 조건을 먼저 확인합니다.',
      '연결 부위와 마감 방법을 함께 확인합니다.'
    ];
  }

  return [
    'CNC 가공이 필요한 경우 작업 조건을 먼저 확인합니다.',
    '재단이 필요한 경우 작업 치수를 먼저 확인합니다.',
    '노출 마감은 입고 제품의 표면 상태를 확인합니다.'
  ];
}

function getNoteTopics(note) {
  const text = String(note || '');
  const topicGroups = [
    ['도장', '필름', '래핑'],
    ['노출 마감', '노출'],
    ['재단', '절단'],
    ['CNC'],
    ['단열 시공', '단열'],
    ['시공 조건', '시공 환경'],
    ['연결 부위', '연결', '이음부'],
    ['구조재']
  ];

  return topicGroups
    .map(function (keywords, index) {
      return keywords.some(function (keyword) {
        return text.indexOf(keyword) !== -1;
      }) ? index : -1;
    })
    .filter(function (index) { return index !== -1; });
}

function hasOverlappingNoteTopic(notes, note) {
  const nextTopics = getNoteTopics(note);
  if (nextTopics.length === 0) return false;

  return notes.some(function (existingNote) {
    const existingTopics = getNoteTopics(existingNote);
    return nextTopics.some(function (topic) {
      return existingTopics.indexOf(topic) !== -1;
    });
  });
}

function buildDefaultNotes(data) {
  const notes = [];
  const cleanStructure = cleanNoteSource(data.structure);
  const cleanUse1 = cleanNoteSource(data.use1);
  const cleanUse2 = cleanNoteSource(data.use2);
  const cleanEmphasis = cleanNoteSource(data.emphasis);

  if (cleanStructure) {
    notes.push(buildStructureNote(cleanStructure, data));
  }

  const useNote = buildUseNote(cleanUse1, cleanUse2);
  if (useNote) {
    notes.push(useNote);
  }

  const emphasisNote = buildEmphasisNote(cleanEmphasis, data);
  if (emphasisNote) {
    notes.push(emphasisNote);
  }

  getCategoryDefaultNotes(data).forEach(function (note) {
    if (notes.length < 6 && notes.indexOf(note) === -1 && !hasOverlappingNoteTopic(notes, note)) {
      notes.push(note);
    }
  });

  [
    '작업 전 제품 규격과 사용 조건을 확인합니다.',
    '마감 방향은 현장 조건에 맞춰 확인합니다.',
    '보관 시 습기와 충격에 주의합니다.',
    '현장 반입 전 필요한 수량을 확인합니다.'
  ].forEach(function (note) {
    if (notes.length < 4 && notes.indexOf(note) === -1 && !hasOverlappingNoteTopic(notes, note)) {
      notes.push(note);
    }
  });

  return notes.slice(0, 6);
}

function buildFallbackNotes() {
  return [
    '제품 구조와 사용 용도는 주문 전 확인합니다.',
    '시공 전 현장 조건을 먼저 확인합니다.',
    '마감 방법은 사용 환경에 맞춰 확인합니다.',
    '재단이나 가공이 필요한 경우 작업 조건을 확인합니다.'
  ];
}

function sanitizeNoteText(text) {
  if (!text) return '';

  let clean = String(text).trim();
  clean = clean.split(/[，、,]/)[0].trim();

  clean = clean
    .replace(/고급 가구 제작/g, '가구 제작')
    .replace(/단면을 노출하는 인테리어 가구 및 CNC 정밀 가공의 최고급재/g, '인테리어 가구 및 CNC 정밀 가공 작업')
    .replace(/의 최고급재/g, ' 작업')
    .replace(/최고급재/g, '')
    .replace(/고급/g, '')
    .replace(/적합/g, '사용')
    .replace(/뛰어난/g, '')
    .replace(/우수/g, '')
    .replace(/최적/g, '')
    .replace(/이상적/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const blocked = ['고급', '최고급재', '뛰어난', '우수', '최적', '이상적'];
  if (blocked.some(function (word) { return clean.indexOf(word) !== -1; })) {
    return '';
  }

  return clean;
}

function setError(sheet, row, message) {
  Logger.log('ERROR row ' + row + ': ' + message);
  if (row && row >= 2) {
    sheet.getRange(row, COL.STATUS).setValue(STATUS.ERROR);
    sheet.getRange(row, COL.ERROR).setValue(message);
  }
}

function buildInfographicPrompt(data) {
  if (data.type === 'A') return buildTypeAPrompt(data);
  if (data.type === 'B') return buildTypeBPrompt(data);
  if (data.type === 'C') return buildTypeCPrompt(data);
  return null;
}

function buildTypeAPrompt(data) {
  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

이 이미지는 카페24 상품 상세설명 HTML 안에 삽입되는 보조 이미지다.
광고 포스터가 아니라, 제품 설명을 보완하는 실무형 인포그래픽으로 만든다.

목표:
- 상세설명 HTML 텍스트와 중복 금지
- 비교요소, 핵심수치, 단면구조만 시각화
- 한눈에 이해되는 단순한 B2B 자료 스타일
- 한글 텍스트는 선명하고 정확하게 표시

캔버스:
- 1024 x 1024px
- 배경 #FFFFFF

색상:
- 기본 배경 #FFFFFF
- 섹션 배경 #F8F8F8
- 메인 #123628
- 포인트 #C9A84C
- 텍스트 #1C1C1C
- 서브텍스트 #616161
- 보더 #E0E0E0

디자인 방향:
- 첫 번째 샘플 이미지처럼 완성도 있는 B2B 인포그래픽 느낌을 유지
- 제품 질감과 단면 도해는 자연스럽게 표현
- 색상은 절제
- 핵심 수치만 골드로 강조
- 그라디언트와 과한 그림자는 사용하지 않음
- 장식보다 정보 전달 우선

1단: 비교
- 좌우 비교 구조
- 왼쪽 라벨: "${data.compareTarget}"
- 오른쪽 라벨: "${data.productName}"
- 제품명은 이 비교 라벨에서만 1회 허용
- 비교 차이는 2~3개 짧은 키워드로 표현
- 긴 설명문 금지

2단: 핵심 수치
- "${data.keyValue}"에서 핵심 숫자를 가장 크게 표시
- 숫자만 #C9A84C 골드로 강조
- 단위는 함께 표기
- 출처는 작게 표시: "출처: ${data.source}"
- 임의 수치 생성 금지

3단: 단면 구조
- "${data.structure}"을 기반으로 단면/구조 도해 생성
- 핵심 키워드 3개 이하로 표시
- 긴 설명문 금지

절대 금지:
- 규격 표시 금지
- 두께 표시 금지
- 등급 표시 금지
- 제조사 표시 금지
- 용도 표시 금지
- 제품명을 제목이나 설명문으로 반복 금지
- 상세설명 HTML 문장 반복 금지
- SECTION, S1, S2, S3 같은 라벨 금지
- 영어 라벨 금지
- 광고 배너 느낌 금지
- 색상 추가 금지

결과물:
- 카페24 상세설명 안에 자연스럽게 들어가는 보조 이미지
- 화려함보다 신뢰감과 가독성을 우선
- 첫 번째 샘플의 시각 완성도와 세 번째 하이브리드 샘플의 정보 구조를 결합
  `;
}

function buildTypeBPrompt(data) {
  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

이 이미지는 카페24 상품 상세설명 HTML 안에 삽입되는 보조 이미지다.
광고 포스터가 아니라, 제품의 구조를 이해시키는 실무형 인포그래픽으로 만든다.

목표:
- 상세설명 HTML 텍스트와 중복 금지
- 단면 구조, 구조 상세 확대, 핵심 구조 키워드만 시각화
- 한눈에 단면 구조가 이해되는 B2B 자료 스타일
- 한글 텍스트는 선명하고 정확하게 표시

캔버스:
- 1024 x 1024px
- 배경 #FFFFFF

색상:
- 기본 배경 #FFFFFF
- 섹션 배경 #F8F8F8
- 메인 #123628
- 포인트 #C9A84C
- 텍스트 #1C1C1C
- 서브텍스트 #616161
- 보더 #E0E0E0

디자인 방향:
- 고급 B2B 인포그래픽 스타일
- 제품 질감과 단면 구조를 자연스럽게 표현
- 단면 구조가 한눈에 보이도록 구성
- 색상은 절제
- 골드는 핵심 구조 포인트에만 사용
- 그라디언트와 과한 그림자는 사용하지 않음
- 장식보다 정보 전달 우선

1단: 단면 구조 메인
- "${data.structure}"을 기반으로 큰 단면 도해 또는 분해도를 생성
- 레이어, 코어, 표면층, 접착층 등 구조 포인트를 시각화
- 라벨은 3개 이하
- 긴 설명문 금지

2단: 구조 상세 확대 영역
- exactly three zoom windows of the same product structure
- surface layer zoom
- core layer zoom
- adhesive layer zoom
- no product names in this section
- no title bars in this section
- each zoom window must show magnified details from the top structure only
- 동일 제품 구조 확대뷰 3개
- 표면층 확대
- 코어 확대
- 접착층 확대
- 좌우 카드/제품명/표 제목 없이 확대 이미지 중심

3단: 핵심 구조 키워드
- 3개 또는 4개 카드형 키워드 구성
- "${data.keyValue}"과 "${data.structure}"에서 구조 키워드만 추출
- 단일 제품의 구조 키워드 카드만 사용
- 아이콘은 단순하게
- 긴 설명문 금지

절대 금지:
- 두 제품을 나란히 배치 금지
- 화면을 좌우로 분할하는 레이아웃 금지
- 단일 제품의 단면 구조만 표현
- 하단은 단일 제품의 구조 키워드 카드만 사용
- Create infographic for ONE product only.
- Do not display any alternative material.
- The infographic must describe only one product.
- Middle section must contain enlarged structure detail views of the same product.
- Do not split the layout into left and right product sections.
- 규격 표시 금지
- 두께 표시 금지
- 등급 표시 금지
- 제조사 표시 금지
- 용도 표시 금지
- 제품명을 제목이나 설명문으로 반복 금지
- 상세설명 HTML 문장 반복 금지
- SECTION, S1, S2, S3 같은 라벨 금지
- 영어 라벨 금지
- 광고 배너 느낌 금지
- 색상 추가 금지

결과물:
- 카페24 상세설명 안에 자연스럽게 들어가는 보조 이미지
- 화려함보다 구조 이해와 신뢰감을 우선
- 단면 구조가 설명 없이 이해되어야 함
  `;
}

function buildTypeCPrompt(data) {
  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

이 이미지는 카페24 상품 상세설명 HTML 안에 삽입되는 보조 이미지다.
광고 포스터가 아니라, 제품의 표면 질감과 마감 특성을 이해시키는 실무형 인포그래픽으로 만든다.

목표:
- 상세설명 HTML 텍스트와 중복 금지 (스펙, 치수, 제조사 기입하지 말 것)
- 표면 질감, 표면 비교, 핵심 질감 키워드만 시각화
- 한눈에 표면감과 마감 차이가 이해되는 B2B 자료 스타일
- 한글 텍스트는 선명하고 정확하게 표시

캔버스:
- 1024 x 1024px
- 배경 #FFFFFF

색상 (정해진 HSL/Hex 테마 엄수):
- 기본 배경 #FFFFFF
- 섹션 배경 #F8F8F8
- 메인 #123628
- 포인트 #C9A84C
- 텍스트 #1C1C1C
- 서브텍스트 #616161
- 보더 #E0E0E0

1단: 표면 질감 클로즈업
- "${data.keyValue}"을 중심으로 제품 표면 질감을 크게 보여준다.
- 나뭇결, 엠보, 코팅감, 광택감, 무늬를 자연스럽게 표현
- 라벨은 3개 이하
- 긴 설명문 금지

2단: 표면 비교
- 좌우 비교 구조
- 왼쪽 라벨: "${data.compareTarget}"
- 오른쪽 라벨: "${data.productName}"
- 제품명은 이 비교 라벨에서만 1회 허용
- 비교 차이는 2~3개 짧은 키워드로 표현
- 긴 설명문 금지

3단: 핵심 질감 키워드
- 3개 또는 4개 카드형 키워드 구성
- "${data.keyValue}"과 "${data.emphasis}"에서 질감 관련 키워드만 추출하여 명사형으로 배치
- 아이콘은 단순하게 표현
- 긴 설명문 금지

절대 금지:
- 규격(mm), 두께(T), 등급(E1 등), 제조사, 용도 표시 금지
- 제품명을 제목이나 설명문으로 반복 금지
- 상세설명 HTML 문장 반복 금지
- 영어 라벨 금지
- 광고 배너 느낌 금지
- 지정 색상 외 추가 금지
  `;
}

function buildHTMLPrompt(data) {
  const sectionTitle = {
    A: '구조와 수치 비교',
    B: '단면 구조 분석',
    C: '표면 질감 비교'
  }[data.type] || '제품 상세 정보';
  const noteFacts = buildHTMLNoteFacts(data);

  const infraImg = data.infographic
    ? `<div class="ds-infographic"><img src="${data.infographic}" alt="${data.productName} ${sectionTitle}" style="max-width:100%;width:100%;height:auto;display:block;margin:0;"></div>`
    : '';

  return `
아래 항목을 작성하라. HTML 태그 없이 순수 텍스트로만 출력.
형식: JSON

{
  "h2": "[상품명만 출력. 지시문, 글자 수 제한 문구, 괄호 설명, 규격, 두께, 등급, 제조국, 대시/슬래시 부가 정보 금지.]",
  "define": "[반드시 2문장으로 작성. 첫 문장은 제품이 무엇인지 구조, 재질, 구성 중심으로 정의. 두 번째 문장은 대표 사용 용도만 설명. 2문장 합계 80자 이내 권장.]",
  "notes": [
    "구매자가 실제로 참고하는 추가 정보 1",
    "구매자가 실제로 참고하는 추가 정보 2"
  ]
}

h2는 상품명만 출력한다.
h2에는 지시문, 글자 수 제한 문구, 괄호 설명을 출력하지 않는다.
규격/두께/등급/제조국은 h2에 넣지 않는다.
규격/두께/등급/제조국은 스펙 표에서만 표시한다.

define 작성 규칙:
- 반드시 2문장으로 작성한다.
- 첫 문장은 제품이 무엇인지 설명한다.
- 첫 문장은 구조, 재질, 구성 중심으로 작성한다.
- 두 번째 문장은 대표 사용 용도만 설명한다.
- 제품 정의만 작성한다.
- 구조와 용도만 설명한다.
- 제조사 스펙 또는 입력 데이터 근거만 사용한다.
- 평가하지 않는다.
- 성능을 단정하지 않는다.
- 장점을 주장하지 않는다.
- 광고하지 않는다.
- 설명문처럼 작성한다.
- 영업 멘트, 블로그 문체, AI 문체를 금지한다.
- 기술자료와 실제 유통업체 문체의 중간 수준으로 작성한다.
- 기술보고서처럼 딱딱한 문체를 금지한다.
- "~이루어져 있다", "~사용된다" 표현을 사용하지 않는다.
- "~입니다", "~사용됩니다" 중심으로 자연스럽게 작성한다.
- H2 바로 아래 첫 문장은 제품명을 반복하지 않는다.
- 두 번째 문장에 구조적 특징을 다시 설명하지 않는다.
- 2문장 합계 80자 이내를 권장한다.
- 제품명 반복, AI 문체, 광고 문구, 과장 표현을 금지한다.
- "제품명은", "제품명는"처럼 제품명으로 시작하지 않는다.
- 주로, 빈번히, 많이, 널리, 인기가, 추천, 고성능, 최고급, 프리미엄, 우수한, 뛰어난, 최적, 효율적, 가성비 표현을 사용하지 않는다.
- define 예시1: 원목 단판을 교차 적층한 다층 구조의 합판입니다. 인테리어 가구 심재와 벽체 바탕재에 사용됩니다.
- define 예시2: 목재 섬유를 고온고압으로 성형한 판재입니다. 가구 제작과 인테리어 마감 작업에 사용됩니다.
- define 예시3: 천연 석고를 압축 성형한 판재입니다. 벽체와 천장 시공에 사용됩니다.
- define 예시4: PF보드는 페놀수지 발포 단열재입니다. 외벽과 천장 단열 시공에 사용됩니다.
- define 생성 후 금지 표현이 포함되어 있으면 다시 작성한다.

인포그래픽 아래 ds-reason 작성 규칙:
- reason은 제품 설명 영역이 아니라 제품 정보 정리 영역이다.
- "제품 설명"이 아니라 "제품 정보 요약"으로 작성한다.
- ds-reason은 구매에 도움이 되는 추가 정보 영역이다.
- 상단에 이미 표시된 제품명, 규격, 두께, 등급, 제조사, 원산지는 ds-reason에서 반복하지 않는다.
- 현재 HTML/CSS 디자인을 바꾸지 않고 p 태그 한 줄 정보만 작성한다.
- notes 배열에 최소 4개, 최대 8개를 작성한다.
- notes는 4~6개 생성을 우선한다.
- 정보가 부족하면 4~5개만 작성하고 억지로 8개를 채우지 않는다.
- notes는 한 줄 키워드 나열이 아니라 자연스러운 짧은 안내문으로 작성한다.
- notes는 키워드를 작성하는 영역이 아니다.
- notes는 키워드 금지.
- 명사구만 출력하지 않는다.
- 각 note는 반드시 한국어 완성 문장으로 작성한다.
- 각 note는 반드시 "~합니다", "~사용됩니다", "~확인합니다", "~확인하는 것이 좋습니다" 중 하나로 끝난다.
- 20자 미만 note는 작성하지 않는다.
- 쉼표로 두 정보를 연결하지 않는다.
- notes는 블로그 글처럼 길게 설명하는 영역도 아니다.
- 건축자재 유통업체 직원이 전화 상담에서 고객에게 10초 정도 설명하는 느낌으로 작성한다.
- 너무 짧은 키워드도 금지한다.
- 너무 긴 설명문도 금지한다.
- 1~2문장의 자연스러운 안내문으로 작성한다.
- 한 줄에는 하나의 정보만 포함한다.
- 문장은 1줄씩 작성한다.
- 건축자재 유통업체가 고객에게 안내하는 느낌으로 작성한다.
- 우선순위는 제조사 스펙시트, A~M열 입력 데이터, 실제 현장 안내 순서다.
- 구조 특징, 실제 현장 사용 정보, 시공 참고사항, 구매 전 확인사항만 작성한다.
- 단판 적층 구조, 단면 노출 확인사항, CNC 가공 참고사항, 실내 사용 환경, 보관 참고사항, 절단 방향, 노출면 확인사항, 재단 주문 시 확인사항을 정보 요약 방식으로 나눈다.
- 제품명, 규격, 두께, 등급, 제조사, 원산지를 그대로 다시 쓰지 않는다.
- 제조사 자료에 없는 수치, 인증, 성능, 등급, 함수율, 내수/방염/준불연 여부는 작성하지 않는다.
- KS, KC, FSC, 친환경 등급, 강도, 내구성, 품질 보장을 추정하지 않는다.
- 성능을 단정하지 않는다.
- 평가하지 않는다.
- 장점처럼 쓰지 않는다.
- 제품을 홍보하지 않는다.
- 고객이 구매 전에 확인해야 하는 정보를 정리하는 방식으로 작성한다.
- 사실, 확인사항, 사용처 중심의 안내문처럼 작성한다.
- 광고 문구, AI 문체, 과장 표현을 사용하지 않는다.
- "우수한", "최고의", "프리미엄", "뛰어난", "적합합니다", "확인할 수 있습니다", "일반적으로"를 사용하지 않는다.
- "뛰어난", "우수한", "최고", "프리미엄", "고급", "이상적", "최적", "적합", "보장", "제공합니다", "용이합니다", "활용할 수 있습니다", "선택 가능합니다", "미적 가치", "최고급재"를 사용하지 않는다.
- Product, Material, Dimensions, Thickness, Origin, Grade, Suitable, Ideal, Perfect, Premium 등 영어 표현을 출력하지 않는다.
- 모든 출력은 자연스러운 한국어만 사용한다.
- AI가 사실을 새로 만들지 않는다.
- 아래 Apps Script가 먼저 정리한 참고 정보와 제품 데이터 안에서만 사람이 읽기 쉽게 정리한다.
- notes는 시트 원문을 그대로 복사하지 않는다.
- 입력값에 광고성 표현이 있어도 notes에는 중립 표현으로 바꾼다.
- 광고성 단어를 제거한 뒤 사실 정보만 남긴다.
- 의미가 광고성뿐이면 해당 note는 생성하지 않는다.
- 한 note에 정보 2개 이상 들어가면 분리하거나 하나만 남긴다.
- 원문 정제: "고급 가구 제작"은 "가구 제작"으로 바꾼다.
- 원문 정제: "최고급재"는 "제품"으로 바꾸거나 문장에서 제거한다.
- 원문 정제: "적합"은 "많이 사용"으로 바꾼다.
- 원문 정제: "뛰어난", "우수", "최적", "안정적인 결과", "미적 가치"는 표시하지 않는다.
- 원문 정제 예시: "단면을 노출하는 인테리어 가구 및 CNC 정밀 가공의 최고급재"는 "가구 제작 및 CNC 가공 작업"으로 작성한다.
- 원문 정제 예시: "단면 노출 시 자연스러운 질감 제공"은 "단면 노출 시 표면 상태 확인"으로 작성한다.
- 좋은 notes 예시: 단면 적층 레이어가 보이는 구조입니다.
- 좋은 notes 예시: 가구 제작과 CNC 가공 작업에 사용됩니다.
- 좋은 notes 예시: 노출 마감은 입고 제품의 표면 상태를 확인하는 것이 좋습니다.
- 좋은 notes 예시: 재단 주문 시 작업 치수를 먼저 확인합니다.
- 좋은 notes 예시: 단면에는 적층 레이어가 그대로 드러나는 구조입니다.
- 좋은 notes 예시: 가구 제작과 CNC 가공 작업에 많이 사용하는 자재입니다.
- 좋은 notes 예시: 노출 마감으로 사용하는 경우에는 표면 상태를 먼저 확인하는 것이 좋습니다.
- 좋은 notes 예시: 재단 주문 시에는 작업 치수를 함께 확인합니다.
- 좋은 notes 예시: 단면 적층 레이어가 보이는 구조입니다.
- 좋은 notes 예시: 가구 제작과 CNC 가공 작업에 사용됩니다.
- 좋은 notes 예시: 노출 마감으로 사용할 경우 표면 상태를 확인하는 것이 좋습니다.
- 좋은 notes 예시: 재단 주문 시 작업 치수를 먼저 확인합니다.
- 나쁜 notes 예시: 단면 적층 레이어 질감
- 나쁜 notes 예시: 가구 제작
- 나쁜 notes 예시: 카페 벽체 노출 마감
- 나쁜 notes 예시: 다양한 디자인 가능
- 나쁜 notes 예시: 최고급재
- 나쁜 notes 예시: 고급 가구 제작
- 나쁜 notes 예시: 적합합니다
- 나쁜 notes 예시: 뛰어난 품질
- 나쁜 notes 예시: 우수한 성능
- 최종 출력 전 자체 검수: 상단 정보 반복, 영어, 광고 문구, 추정 정보, 불필요한 8개 채우기가 있으면 다시 작성한다.
- 안내 문장은 "주문 전 확인합니다", "자료 기준으로 표기합니다", "현장에서 주로 사용됩니다", "보관 시 주의합니다"처럼 작성한다.
- 대체 방향: "보장합니다" 대신 "입력 데이터 기준으로 표기되어 있습니다"를 사용한다.
- 대체 방향: "뛰어나" 대신 "단면 적층 질감이 보입니다"를 사용한다.
- 대체 방향: "적합합니다" 대신 "많이 사용됩니다"를 사용한다.
- 대체 방향: "제공합니다" 대신 "확인합니다" 또는 "사용됩니다"를 사용한다.
- 대체 방향: "이상적입니다" 대신 "검토됩니다"를 사용한다.
- 예시: 제조 구분은 러시아산 및 핀란드산으로 입력되어 있습니다.
- 예시: 단면 적층 레이어가 보여 인테리어 가구 제작에 많이 사용됩니다.

[제품 데이터]
분류: ${data.category}
제품명: ${data.productName}
규격: ${data.size}
두께: ${data.thickness}
등급: ${data.grade}
제조사: ${data.maker}
핵심표현: ${data.keyValue}
출처: ${data.source}
구조: ${data.structure}
강조포인트: ${data.emphasis}
용도1: ${data.use1}
용도2: ${data.use2}

[Apps Script가 먼저 정리한 참고 정보]
${noteFacts.map(function (note) { return '- ' + note; }).join('\n')}
  `;
}

function callTextAPI(apiKey, prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    Logger.log('텍스트 API 응답코드: ' + response.getResponseCode());
    Logger.log('텍스트 API 응답내용: ' + response.getContentText().substring(0, 500));

    if (result.error) {
      Logger.log('텍스트 API 오류: ' + result.error.message);
      return null;
    }

    if (result.choices && result.choices[0]) {
      return result.choices[0].message.content;
    }

    return null;
  } catch (err) {
    Logger.log('텍스트 API 예외: ' + err.toString());
    return null;
  }
}

function testRow2() {
  createPrompt(2);
}

function testRow2HTML() {
  generateHTML(2);
}

function testRow13() {
  createPrompt(13);
}

function testRow13HTML() {
  generateHTML(13);
}
