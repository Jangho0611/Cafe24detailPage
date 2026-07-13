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
  const entityData = buildEntityData(data);
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
.ds-wrap h2{font-size:28px;font-weight:800;color:#1C1C1C;margin:0 0 24px;}
.ds-block-title{font-size:18px;font-weight:700;color:#1C1C1C;margin:32px 0 14px;padding-left:10px;border-left:4px solid #123628;}
.ds-wrap h2 + .ds-block-title{margin-top:0;}
.ds-ai-summary{background:#FBFCF8;border:1px solid #E3E1D8;border-left:3px solid #123628;border-radius:6px;padding:18px;margin:0 0 22px 0;font-size:15px;color:#1C1C1C;}
.ds-ai-summary p{margin:0 0 6px 0;}
.ds-ai-summary p:last-child{margin:0;}
.ds-define{background:#FAFAF7;border-left:3px solid #123628;border-radius:6px;color:#616161;padding:18px;margin:0 0 22px 0;font-size:15px;}
.ds-spec-table{width:100%;border-collapse:separate;border-spacing:0;margin:0 0 22px 0;border-top:1px solid #E6E3DA;}
.ds-spec-table th{background:#FAFAF7;color:#616161;font-weight:600;font-size:14px;padding:13px 12px;border-bottom:1px solid #E6E3DA;width:30%;text-align:left;}
.ds-spec-table td{background:#FFFFFF;color:#1C1C1C;font-weight:400;font-size:15px;padding:13px 12px;border-bottom:1px solid #E6E3DA;text-align:left;}
.ds-section-title{font-size:18px;font-weight:700;color:#1C1C1C;margin:24px 0 12px;}
.ds-infographic{border:1px solid #E0E0E0;border-radius:4px;overflow:hidden;margin:0 0 24px 0;}
.ds-reason{background:#FAFAF7;border:1px solid #E3E1D8;border-top:2px solid #123628;border-radius:6px;padding:18px;margin:0 0 22px 0;font-size:15px;color:#616161;}
.ds-ai-summary,.ds-define,.ds-spec-table,.ds-infographic,.ds-reason{margin-bottom:24px;}
.ds-reason p{margin:0 0 8px 0;}
.ds-reason p:last-child{margin:0;}
.ds-faq{margin:0 0 22px 0;padding:0;}
.ds-faq-item{background:#FCFCFA;border:1px solid #DEDAD0;border-radius:6px;padding:15px 16px;margin:0 0 12px 0;}
.ds-faq-q{font-size:16px;font-weight:800;color:#123628;margin:0 0 6px 0;}
.ds-faq-a{font-size:14px;color:#616161;margin:0;}
.ds-cta{display:block;width:100%;background:#123628;color:#FFFFFF;padding:16px;border-radius:6px;text-align:center;text-decoration:none;font-size:15px;font-weight:600;margin:0 0 12px 0;}
.ds-cta:hover{opacity:0.92;}
.ds-phone{color:#616161;font-size:13px;text-align:center;margin:0 0 20px 0;}
.ds-footer{background:#123628;color:#FFFFFF;text-align:center;padding:20px;font-size:13px;}
@media(max-width:768px){.ds-wrap{padding:0 16px;}.ds-wrap h2{font-size:20px;}.ds-spec-table th,.ds-spec-table td{display:block;width:100%;}}
</style>`;

  let defaultNotes = buildDefaultNotes(data)
    .map(sanitizeNoteText)
    .filter(function (text) { return text && String(text).trim() !== ''; });
  if (defaultNotes.length === 0) {
    defaultNotes = buildFallbackNotes()
      .map(sanitizeNoteText)
      .filter(function (text) { return text && String(text).trim() !== ''; });
  }

  const reasonHtml = defaultNotes
    .map(function (text) { return '    <p>' + text + '</p>'; })
    .join('\n');

  const gradeRowHtml = shouldDisplayGrade(data.grade)
    ? `    <tr><th>성능·인증</th><td>${data.grade}</td></tr>`
    : '';
  const faqItems = buildFAQItems(data, defaultNotes);
  const faqHtml = buildFAQHtml(faqItems);
  const schemaHtml = buildSchemaHtml(data, content.define, faqItems);
  const aiSummary = buildAISummary(entityData);
  const aiSummaryHtml = buildAISummaryHtml(aiSummary);
  const contentQualityScore = evaluateContentQuality({
    entity: entityData,
    aiSummary: aiSummary,
    defineText: content.define,
    reasonNotes: defaultNotes,
    faqItems: faqItems,
    schemaHtml: schemaHtml
  });
  Logger.log('Content Quality Score: ' + JSON.stringify(contentQualityScore));

  const html = `${css}
<div class="ds-wrap">
  <h2>${data.productName}</h2>
  <div class="ds-block-title">제품 한눈에 보기</div>
${aiSummaryHtml}
  <div class="ds-block-title">제품 소개</div>
  <div class="ds-define">${content.define}</div>
  <div class="ds-block-title">규격 정보</div>
  <table class="ds-spec-table">
    <tr><th>규격</th><td>${data.size}</td></tr>
    <tr><th>두께옵션</th><td>${data.thickness}</td></tr>
${gradeRowHtml}
    <tr><th>제조사</th><td>${data.maker}</td></tr>
    <tr><th>출고안내</th><td>${getStockStatusText(data.stockType)}</td></tr>
  </table>
  <div class="ds-section-title">${sectionTitle}</div>
  ${infraImg}
  <div class="ds-block-title">구매 전 체크포인트</div>
  <div class="ds-reason">
${reasonHtml}
  </div>
${faqHtml}
  <a class="ds-cta" href="https://web-cadalog-ver10.vercel.app/">대량구매 견적 · 규격 확인하기 →</a>
  <div class="ds-phone">전화 031-388-3833 · 평일 09:00–18:00</div>
  <div class="ds-footer">(주)대산 · 35년 신뢰의 건축자재 전문 공급사</div>
</div>
${schemaHtml}`;

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
  const guide = buildProductCategoryGuide(data);
  return `
아래 A~D, F~G열 입력값만 근거로 상품 정보 입력값을 보완하라.
응답은 JSON만 반환한다. 설명 문장, 마크다운, 코드블록은 출력하지 않는다.

출력 형식:
{
  "grade": "E열 성능·인증",
  "keyValue": "H열 구매자가 한눈에 보는 핵심 포지션",
  "source": "I열 출처 또는 확인 상태",
  "structure": "J열 재료·층·제조 방식 설명",
  "emphasis": "K열 작업 또는 확인 포인트",
  "use1": "L열 대표 용도 1",
  "use2": "M열 대표 용도 2"
}

제품군 기준 DB 우선 적용:
- GPT는 아래 제품군 DB를 변경하지 않고 문장 표현만 자연스럽게 보완한다.
- 제품군 DB와 입력 데이터가 충돌하면 제품군 DB를 우선한다.
- 일치 제품군: ${guide.name}
- keyValue 기준: ${guide.keyValue || '일치 기준 없음'}
- structure 기준: ${guide.structure || '일치 기준 없음'}
- emphasis 후보: ${guide.emphasisCandidates.join(', ') || '일치 기준 없음'}
- use 후보: ${guide.useCandidates.join(', ') || '일치 기준 없음'}
- infographicStructure 기준: ${guide.infographicStructure || '일치 기준 없음'}
- infographicKeywords 기준: ${guide.infographicKeywords.join(', ') || '일치 기준 없음'}
- priorityMetrics 기준: ${(guide.priorityMetrics || []).join(', ') || '일치 기준 없음'}
- forbiddenKeywords: ${guide.forbiddenKeywords.join(', ') || '없음'}

작성 규칙:
- A~D, F~G열 입력값만 근거로 작성한다.
- 제조사 공식 자료, 인증, 성능, 원산지는 추정하지 않는다.
- grade는 등급이 아니라 E열 성능·인증 입력값이다.
- 성능·인증은 추정하지 않는다.
- A~D, F~G 입력값에 성능, 인증, 처리 상태가 명시되어 있으면 해당 명시값을 짧게 작성한다.
- 예: 제품명이나 분류에 KD, 방부, 준불연, 불연, 난연, 방염, E0/E1, KS, 내수, 방수, 차음, 흡음이 명시된 경우 해당 표현만 작성한다.
- 성능·인증·처리 상태를 확정할 수 있는 명시값이 없으면 "확인 필요"만 작성한다.
- 근거 없는 KS, 준불연, E0/E1, 열전도율, 밀도, 방염, 친환경 등급은 작성하지 않는다.
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
- keyValue는 구매자가 한눈에 보는 핵심 포지션만 작성한다. 제품명을 반복하지 않는다.
- keyValue는 상품을 분류·이해하기 위한 짧은 포지션 표현으로 작성하고, structure의 재료·층·제조 방식 설명을 그대로 반복하지 않는다.
- keyValue 좋은 예: "다층 단판 판재", "시멘트계 바탕 보드", "균일 단면 가공 판재", "페놀폼 단열재".
- structure는 재료·층·제조 방식만 설명한다.
- structure 좋은 예: "원목 단판을 교차 적층한 판재", "목재 섬유를 고온고압으로 성형한 판재", "석고 코어 양면에 원지를 결합한 판재", "시멘트와 섬유질 원료를 압축 성형한 보드".
- keyValue와 structure는 같은 문장이나 같은 의미로 반복하지 않는다.
- keyValue가 제품의 핵심 포지션이면 structure는 그 포지션의 재료, 층 구성, 제조 방식을 설명한다.
- keyValue와 structure 조합 예: keyValue "시멘트계 보드 / 벽체·천장 바탕재", structure "시멘트와 섬유질 원료를 압축 성형한 보드".
- emphasis는 작업 전 확인 항목 3개를 쉼표로 나열하고 반드시 "확인"으로 끝낸다.
- emphasis 좋은 예: "절단면 처리, 고정 방식, 마감 조건 확인", "표면 상태, 도장 조건, 재단 치수 확인", "단열 시공 조건, 연결 부위, 마감 방식 확인".
- use1은 대표 사용처를 장소/부위 + 작업명 형태로 구체적으로 작성한다.
- use1 좋은 예: "실내 벽체 바탕재 및 칸막이 시공", "가구 문짝 제작 및 인테리어 몰딩", "외벽 단열 시공 및 천장 단열 작업".
- use2는 보조 사용처를 장소/부위 + 작업명 형태로 구체적으로 작성한다.
- use2 좋은 예: "천장 바탕재 및 외장 마감 하지재", "도장 마감 가구 및 필름 래핑 작업", "연결 부위 보강 및 마감 조건 확인".
- use에 "건축자재", "보드", "실내 마감재", "벽체 바탕재", "인테리어 몰딩", "자재"처럼 짧거나 추상적인 표현만 작성하지 않는다.
- 제품명을 그대로 반복하지 않는다.
- category를 structure에 그대로 쓰지 않는다.
- K/L/M은 단어 하나가 아니라 구체적인 작업 단위로 작성한다.
- 나쁜 예: "다양한 용도", "고품질 자재", "프리미엄 보드", "실내 마감재", "벽체 바탕재", "인테리어 몰딩", "건축자재", "입력 데이터 기준", "제조사 자료 확인 필요".

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

function cleanEntityValue(value) {
  return String(value || '').trim();
}

function splitEntityTerms(value) {
  const terms = [];
  String(value || '')
    .split(/[，、,]/)
    .map(function (term) { return term.trim(); })
    .filter(function (term) { return term !== ''; })
    .forEach(function (term) {
      if (terms.indexOf(term) === -1) {
        terms.push(term);
      }
    });
  return terms;
}

function inferEntityMaterial(data, productGroup) {
  const label = [
    data && data.productName,
    data && data.category,
    data && data.structure
  ].map(cleanEntityValue).join(' ');

  if (productGroup === 'MDF') return '목재 섬유';
  if (productGroup === 'PLYWOOD') return '원목 단판';
  if (productGroup === 'GYPSUM') return '석고';
  if (productGroup === 'PF') return '페놀수지 단열재';
  if (productGroup === 'XPS') return '압출법 폴리스티렌';
  if (productGroup === 'WOOD') return '목재';
  if (label.indexOf('석고') !== -1) return '석고';
  if (label.indexOf('단판') !== -1 || label.indexOf('합판') !== -1) return '원목 단판';
  if (label.indexOf('목재') !== -1 || label.indexOf('각재') !== -1) return '목재';
  return '';
}

function buildEntityData(data) {
  const productGroup = getFAQCategoryType(data);
  const uses = uniqueCleanTerms([data.use1, data.use2]);
  const cautions = splitEntityTerms(data.emphasis);
  const preorderChecks = [];

  if (cleanEntityValue(data.size)) preorderChecks.push('규격');
  if (cleanEntityValue(data.thickness)) preorderChecks.push('두께');
  if (uses.length > 0) preorderChecks.push('사용 위치');
  if (cautions.length > 0) preorderChecks.push('시공/재단 조건');

  return {
    productName: cleanEntityValue(data.productName),
    productGroup: productGroup,
    material: inferEntityMaterial(data, productGroup),
    structure: cleanEntityValue(data.structure),
    size: cleanEntityValue(data.size),
    thickness: cleanEntityValue(data.thickness),
    maker: cleanEntityValue(data.maker),
    uses: uses,
    installationCautions: cautions,
    compareProduct: cleanEntityValue(data.compareTarget),
    preorderChecks: preorderChecks
  };
}

function cleanHumanWritingText(text) {
  return limitAndUsage(String(text || '')
    .replace(/용도로 선택됩니다/g, '에 많이 사용합니다')
    .replace(/선택됩니다/g, '사용합니다')
    .replace(/활용됩니다/g, '사용합니다')
    .replace(/사용 작업/g, '사용')
    .replace(/활용 작업/g, '사용')
    .replace(/선호도\s*1위/g, '')
    .replace(/판매\s*1위/g, '')
    .replace(/1위/g, '')
    .replace(/친환경/g, '')
    .replace(/최적/g, '')
    .replace(/우수한/g, '')
    .replace(/뛰어난/g, '')
    .replace(/효율적/g, '')
    .replace(/프리미엄/g, '')
    .replace(/최고급/g, '')
    .replace(/최고/g, '')
    .replace(/고급/g, '')
    .replace(/추천/g, '')
    .replace(/가성비/g, '')
    .replace(/보장/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim());
}

function filterAISummaryText(text) {
  return cleanHumanWritingText(text);
}

function getHumanExpressionDictionary(productGroup) {
  const dictionaries = {
    PLYWOOD: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 얇은 단판을 겹쳐 만든 판재입니다.'; },
      summaryUse: function (useText) { return useText + '에 많이 사용합니다.'; },
      preorder: '주문 전에는 두께, 규격, 마감 방향을 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 함께 봅니다.'; }
    },
    MDF: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 목재 섬유를 압축해 만든 판재입니다.'; },
      summaryUse: function (useText) { return useText + '에 많이 사용합니다.'; },
      preorder: '주문 전에는 두께, 표면 상태, 도장이나 필름 작업 여부를 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 작업 조건에 맞춰 봅니다.'; }
    },
    GYPSUM: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 석고 코어 양면에 원지를 붙인 판재입니다.'; },
      summaryUse: function (useText) { return useText + '에 사용합니다.'; },
      preorder: '주문 전에는 두께, 시공 위치, 이음부 처리 조건을 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 함께 봅니다.'; }
    },
    PF: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 페놀수지 발포층에 면재를 더한 단열재입니다.'; },
      summaryUse: function (useText) { return useText + '에 사용합니다.'; },
      preorder: '주문 전에는 두께, 시공 위치, 연결 부위 마감 조건을 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + '도 현장 조건에 맞춰 봅니다.'; }
    },
    XPS: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 압출법 폴리스티렌 계열 단열재입니다.'; },
      summaryUse: function (useText) { return useText + '에 사용합니다.'; },
      preorder: '주문 전에는 두께, 시공 위치, 하중 조건을 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + '도 현장 조건에 맞춰 봅니다.'; }
    },
    WOOD: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 목재를 길이 방향으로 가공한 각재입니다.'; },
      summaryUse: function (useText) { return useText + '에 사용합니다.'; },
      preorder: '주문 전에는 단면 치수, 길이, 노출면 상태를 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 같이 봅니다.'; }
    },
    DECK_BOARD: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 실외 바닥이나 테라스 시공에 사용하는 장척 목재 자재입니다.'; },
      summaryUse: function (useText) { return useText + '에 사용합니다.'; },
      preorder: '주문 전에는 수종, 폭, 두께, 길이, 표면 상태, 고정 방식과 시공 간격을 확인하는 것이 좋습니다.',
      secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 현장 조건에 맞춰 봅니다.'; }
    }
  };

  return dictionaries[productGroup] || {
    summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 현장 조건에 맞춰 규격을 확인하는 자재입니다.'; },
    summaryUse: function (useText) { return useText + '에 사용합니다.'; },
    preorder: '주문 전에는 규격, 두께, 사용할 위치를 확인하는 것이 좋습니다.',
    secondaryUse: function (useText) { return useText + getUseParticle(useText) + '도 함께 확인합니다.'; }
  };
}

function buildAISummary(entity) {
  if (!entity) return [];

  const summary = [];
  const name = cleanEntityValue(entity.productName) || '이 제품';
  const uses = entity.uses || [];
  const dictionary = getHumanExpressionDictionary(entity.productGroup);

  summary.push(buildAISummaryDefinition(entity));

  if (uses.length > 0) {
    summary.push(dictionary.summaryUse(buildNaturalUseList(uses)));
  }

  summary.push(dictionary.preorder);

  const cleanedSummary = summary
    .slice(0, 3)
    .map(filterAISummaryText)
    .filter(function (text) { return text !== ''; });

  if (cleanedSummary.length > 0) {
    return cleanedSummary;
  }

  return [cleanHumanWritingText(name + getSubjectParticle(name) + ' 주문 전 규격과 사용 위치를 확인해야 하는 건축자재입니다.')];
}

function buildAISummaryDefinition(entity) {
  const name = cleanEntityValue(entity.productName) || '이 제품';
  const group = cleanEntityValue(entity.productGroup);
  const material = cleanEntityValue(entity.material);
  const dictionary = getHumanExpressionDictionary(group);

  if (group !== 'DEFAULT') return dictionary.summaryDefinition(name);
  if (material) return name + getSubjectParticle(name) + ' ' + material + ' 계열 자재입니다.';
  return dictionary.summaryDefinition(name);
}

function getObjectParticle(text) {
  const value = String(text || '').trim();
  if (!value) return '를';
  const lastChar = value.charCodeAt(value.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '를';
  return ((lastChar - 0xAC00) % 28) === 0 ? '를' : '을';
}

function buildAISummaryHtml(summary) {
  if (!summary || summary.length === 0) return '';

  const summaryHtml = summary
    .map(function (text) { return '    <p>' + escapeHtml(text) + '</p>'; })
    .join('\n');

  return `  <div class="ds-ai-summary">
${summaryHtml}
  </div>`;
}

function getStockStatusText(stockType) {
  const value = String(stockType || '').trim();
  if (value === '재고') return '재고보유 즉시출고 가능';
  if (value === '주문재') return '주문재 / 입고 일정 확인 필요';
  if (value === '일부재고') return '일부 규격 재고보유 / 주문 전 재고 확인 필요';
  return '재고 및 출고 일정 확인 필요';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getProductUseText(data) {
  const use1 = normalizeUseTerm(cleanNoteSource(data.use1));
  const use2 = normalizeUseTerm(cleanNoteSource(data.use2));
  if (use1 && use2) return use1 + ', ' + use2;
  if (use1) return use1;
  if (use2) return use2;
  return '제품 정보에 표시된 용도';
}

function getSubjectParticle(text) {
  const value = String(text || '').trim();
  if (!value) return '은';
  const lastChar = value.charCodeAt(value.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '는';
  return ((lastChar - 0xAC00) % 28) === 0 ? '는' : '은';
}

function getAndParticle(text) {
  const value = String(text || '').trim();
  if (!value) return '와';
  const lastChar = value.charCodeAt(value.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '와';
  return ((lastChar - 0xAC00) % 28) === 0 ? '와' : '과';
}

function uniqueCleanTerms(values) {
  const terms = [];
  (values || []).forEach(function (value) {
    const clean = normalizeUseTerm(cleanNoteSource(value));
    if (clean && terms.indexOf(clean) === -1) {
      terms.push(clean);
    }
  });
  return terms;
}

function buildNaturalUseList(terms) {
  const items = (terms || []).filter(function (term) {
    return term && String(term).trim() !== '';
  });

  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ', ' + items[1];
  return items.slice(0, 3).join(', ');
}

function getFAQCategoryType(data) {
  const productLabel = String(data && data.productName || '');
  const categoryLabel = String(data && data.category || '');
  const label = categoryLabel + ' ' + productLabel;
  if (productLabel.indexOf('MDF') !== -1) return 'MDF';
  if (productLabel.indexOf('합판') !== -1) return 'PLYWOOD';
  if (label.indexOf('석고') !== -1) return 'GYPSUM';
  if (label.indexOf('아이소핑크') !== -1 || label.indexOf('XPS') !== -1 || label.indexOf('압출법') !== -1 || label.indexOf('폴리스티렌') !== -1) return 'XPS';
  if (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('페놀') !== -1) return 'PF';
  if (label.indexOf('데크재') !== -1 || label.toLowerCase().indexOf('deck') !== -1) return 'DECK_BOARD';
  if (label.indexOf('각재') !== -1 || label.indexOf('뉴송') !== -1) return 'WOOD';
  if (label.indexOf('합판') !== -1) return 'PLYWOOD';
  if (label.indexOf('MDF') !== -1) return 'MDF';
  return 'DEFAULT';
}

function buildFAQUseAnswer(data) {
  const useTerms = uniqueCleanTerms([data.use1, data.use2]);
  const useText = buildNaturalUseList(useTerms);
  if (useText) {
    return useText + ' 등에 사용됩니다.';
  }

  const categoryType = getFAQCategoryType(data);
  const fallback = {
    PLYWOOD: '가구 제작, 실내 벽체 바탕, 천장 마감 등에 사용됩니다.',
    MDF: '가구 제작, 도장 마감, 필름 래핑 바탕 등에 사용됩니다.',
    GYPSUM: '실내 벽체, 천장 시공, 마감 바탕 등에 사용됩니다.',
    PF: '벽체와 천장 단열, 마감 전 바탕 시공 등에 사용됩니다.',
    XPS: '바닥 단열, 벽체 단열, 지하층 단열 등에 사용됩니다.',
    WOOD: '틀 작업, 보강재, 현장 목공 작업 등에 사용됩니다.',
    DEFAULT: '현장 마감, 제작, 보조 자재 용도 등에 사용됩니다.'
  };
  return fallback[categoryType];
}

function buildFAQCheckAnswer(data) {
  const checks = [];
  if (data.size) checks.push('규격');
  if (data.thickness) checks.push('두께');
  checks.push('사용 위치');
  checks.push('필요한 재단 여부');
  return '주문 전에는 ' + buildNaturalUseList(checks) + '를 확인하세요.';
}

function buildFAQProcessAnswer(data) {
  const categoryType = getFAQCategoryType(data);
  const answers = {
    PLYWOOD: '재단 방향과 마감면을 먼저 정하고, 현장 치수에 맞춰 가공 조건을 확인하세요.',
    MDF: '재단면과 표면 마감 상태를 확인하고, 도장이나 필름 작업 조건에 맞춰 진행하세요.',
    GYPSUM: '절단면 파손을 줄이도록 취급하고, 이음부와 고정 간격을 현장 조건에 맞춰 확인하세요.',
    PF: '단열층 손상과 연결 부위 틈을 줄이도록 재단하고, 마감 방법을 함께 확인하세요.',
    XPS: '재단할 때는 절단면과 시공 위치를 확인하고, 이음부 틈이 생기지 않도록 작업하세요.',
    WOOD: '길이 재단 전 치수를 다시 확인하고, 휨이나 노출면 상태를 살펴본 뒤 시공하세요.',
    DEFAULT: '재단 치수, 마감 방향, 현장 고정 조건을 먼저 확인한 뒤 작업하세요.'
  };
  return answers[categoryType];
}

function normalizeFAQCompareText(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[.,!?。]/g, '')
    .trim();
}

function ensureFAQDistinctAnswer(answer, notes, fallback) {
  const answerKey = normalizeFAQCompareText(answer);
  const duplicated = (notes || []).some(function (note) {
    return normalizeFAQCompareText(note) === answerKey;
  });
  return duplicated ? fallback : answer;
}

function buildFAQItems(data, notes) {
  const entity = buildEntityData(data);
  const categoryItems = buildProductGroupFAQItems(entity, notes);
  if (categoryItems.length > 0) {
    return categoryItems;
  }

  const faqNotes = notes || [];
  const useAnswer = ensureFAQDistinctAnswer(
    buildFAQUseAnswer(data),
    faqNotes,
    '사용 위치와 작업 목적에 맞춰 현장에서 사용합니다.'
  );
  const checkAnswer = ensureFAQDistinctAnswer(
    buildFAQCheckAnswer(data),
    faqNotes,
    '주문 전에는 필요한 치수, 두께, 시공 위치를 먼저 확인하세요.'
  );
  const processAnswer = ensureFAQDistinctAnswer(
    buildFAQProcessAnswer(data),
    faqNotes,
    '재단 전 치수와 마감 방향을 확인하고 현장 조건에 맞춰 작업하세요.'
  );

  return [
    {
      question: '이 제품은 어디에 사용하나요?',
      answer: cleanHumanWritingText(useAnswer)
    },
    {
      question: '주문 전에 무엇을 확인해야 하나요?',
      answer: cleanHumanWritingText(checkAnswer)
    },
    {
      question: '재단·시공 시 주의사항은 무엇인가요?',
      answer: cleanHumanWritingText(processAnswer)
    }
  ];
}

function buildProductGroupFAQItems(entity, notes) {
  const productGroup = entity && entity.productGroup;
  const productName = cleanEntityValue(entity && entity.productName) || '이 제품';
  const itemsByGroup = {
    PLYWOOD: [
      {
        question: productName + getSubjectParticle(productName) + ' 어디에 사용하나요?',
        answer: buildEntityUseAnswer(entity)
      },
      {
        question: '일반합판과 MDF는 무엇이 다른가요?',
        answer: '일반합판은 단판을 겹친 판재이고, MDF는 목재 섬유를 압축한 판재입니다.'
      },
      {
        question: '주문 전에 무엇을 확인해야 하나요?',
        answer: buildEntityPreorderAnswer(entity)
      }
    ],
    MDF: [
      {
        question: 'MDF는 무엇인가요?',
        answer: 'MDF는 목재 섬유를 압축해 만든 판재입니다.'
      },
      {
        question: 'MDF와 PB는 무엇이 다른가요?',
        answer: 'MDF는 목재 섬유를 압축한 판재이고, PB는 목재 칩을 압착한 판재입니다.'
      },
      {
        question: '도장 전 무엇을 확인해야 하나요?',
        answer: '도장 전에는 표면 상태와 재단면을 먼저 확인하는 것이 좋습니다.'
      }
    ],
    GYPSUM: [
      {
        question: '일반석고보드는 어디에 사용하나요?',
        answer: buildEntityUseAnswer(entity)
      },
      {
        question: '일반석고보드와 방수석고보드는 무엇이 다른가요?',
        answer: '일반석고보드는 실내 벽체와 천장에 쓰고, 방수석고보드는 습기가 있는 공간에 맞춰 확인합니다.'
      },
      {
        question: '석고보드 재단 시 무엇을 확인해야 하나요?',
        answer: '재단할 때는 절단면 파손과 이음부 처리 조건을 함께 확인하는 것이 좋습니다.'
      }
    ],
    PF: [
      {
        question: 'PF보드는 어디에 사용하나요?',
        answer: buildEntityUseAnswer(entity)
      },
      {
        question: 'PF보드 시공 전 무엇을 확인해야 하나요?',
        answer: '시공 전에는 두께, 사용 위치, 연결 부위 마감 조건을 확인하는 것이 좋습니다.'
      },
      {
        question: 'PF보드 재단 시 주의사항은 무엇인가요?',
        answer: '재단할 때는 단열층 손상과 연결 부위 틈이 생기지 않도록 확인해야 합니다.'
      }
    ],
    WOOD: [
      {
        question: '각재는 어디에 사용하나요?',
        answer: buildEntityUseAnswer(entity)
      },
      {
        question: '각재 주문 전 어떤 치수를 확인해야 하나요?',
        answer: '주문 전에는 단면 치수, 길이, 재단 여부를 먼저 확인하는 것이 좋습니다.'
      },
      {
        question: '노출면으로 사용할 각재는 무엇을 확인해야 하나요?',
        answer: '노출면으로 쓸 경우 표면 상태와 휨 여부를 먼저 확인하는 것이 좋습니다.'
      }
    ],
    DECK_BOARD: [
      {
        question: '데크재는 어디에 사용하나요?',
        answer: '테라스, 외부 바닥, 조경 데크처럼 사람이 밟는 바닥면 시공에 사용합니다.'
      },
      {
        question: '데크재 주문 전 무엇을 확인해야 하나요?',
        answer: '주문 전에는 수종, 폭, 두께, 길이, 표면 상태, 고정 방식과 시공 간격을 확인하는 것이 좋습니다.'
      },
      {
        question: '데크재 시공 시 주의할 점은 무엇인가요?',
        answer: '시공 시에는 피스 고정 위치, 배수 방향, 데크 간 간격과 절단면 처리를 함께 확인해야 합니다.'
      }
    ]
  };

  return (itemsByGroup[productGroup] || []).map(function (item) {
    return {
      question: cleanHumanWritingText(item.question),
      answer: cleanHumanWritingText(ensureFAQDistinctAnswer(item.answer, notes || [], item.answer))
    };
  });
}

function buildEntityUseAnswer(entity) {
  const uses = entity && entity.uses || [];
  if (uses.length > 0) {
    return '대표적으로 ' + buildNaturalUseList(uses) + '에 많이 사용합니다.';
  }
  return '사용 위치와 작업 목적에 맞춰 확인하는 것이 좋습니다.';
}

function buildEntityPreorderAnswer(entity) {
  const dictionary = getHumanExpressionDictionary(entity && entity.productGroup);
  return dictionary.preorder;
}

function buildFAQHtml(items) {
  if (!items || items.length === 0) return '';

  const itemHtml = items.map(function (item) {
    return `    <div class="ds-faq-item">
      <p class="ds-faq-q">Q. ${escapeHtml(item.question)}</p>
      <p class="ds-faq-a">${escapeHtml(item.answer)}</p>
    </div>`;
  }).join('\n');

  return `  <div class="ds-block-title">자주 묻는 질문</div>
  <div class="ds-faq">
${itemHtml}
  </div>`;
}

function buildSchemaHtml(data, defineText, faqItems) {
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(data.productName || '').trim(),
    description: String(defineText || '').trim()
  };

  if (data.infographic) {
    productSchema.image = String(data.infographic).trim();
  }
  const pageUrl = String(data.pageUrl || data.productUrl || data.url || '').trim();
  if (pageUrl) {
    productSchema.url = pageUrl;
  }
  if (data.maker) {
    productSchema.manufacturer = {
      '@type': 'Organization',
      name: String(data.maker).trim()
    };
  }

  const additionalProperty = [];
  if (data.size) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: '규격',
      value: String(data.size).trim()
    });
  }
  if (data.thickness) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: '두께',
      value: String(data.thickness).trim()
    });
  }
  if (shouldDisplayGrade(data.grade)) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: '성능·인증',
      value: String(data.grade).trim()
    });
  }
  if (additionalProperty.length > 0) {
    productSchema.additionalProperty = additionalProperty;
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faqItems || []).map(function (item) {
      return {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      };
    })
  };

  return [
    '<script type="application/ld+json">' + stringifyJsonLd(productSchema) + '</script>',
    '<script type="application/ld+json">' + stringifyJsonLd(faqSchema) + '</script>'
  ].join('\n');
}

function stringifyJsonLd(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function evaluateContentQuality(input) {
  const data = input || {};
  const textBlocks = collectQualityTextBlocks(data);
  const schemaState = getFAQSchemaState(data.schemaHtml);
  const result = {
    humanWriting: scoreHumanWriting(textBlocks),
    duplication: scoreDuplication(textBlocks),
    trustworthiness: scoreTrustworthiness(textBlocks, data.entity, data.schemaHtml),
    aiSummary: scoreAISummary(data.aiSummary),
    faqSchemaSync: scoreFAQSchemaSync(data.faqItems, schemaState)
  };

  const total = result.humanWriting.score +
    result.duplication.score +
    result.trustworthiness.score +
    result.aiSummary.score +
    result.faqSchemaSync.score;
  const qualityIssues = []
    .concat(result.humanWriting.failures)
    .concat(result.duplication.failures)
    .concat(result.trustworthiness.failures)
    .concat(result.aiSummary.failures)
    .concat(result.faqSchemaSync.failures);
  const immediateFailures = qualityIssues.filter(isImmediateQualityFailure);

  return {
    total: total,
    status: getContentQualityStatus(total, immediateFailures),
    issues: qualityIssues,
    immediateFailures: immediateFailures,
    items: result
  };
}

function collectQualityTextBlocks(data) {
  const blocks = [];
  (data.aiSummary || []).forEach(function (text, index) {
    blocks.push({ section: 'AI Summary ' + (index + 1), text: text });
  });
  if (data.defineText) {
    blocks.push({ section: 'Define', text: data.defineText });
  }
  (data.reasonNotes || []).forEach(function (text, index) {
    blocks.push({ section: 'ds-reason ' + (index + 1), text: text });
  });
  (data.faqItems || []).forEach(function (item, index) {
    blocks.push({ section: 'FAQ Q' + (index + 1), text: item.question });
    blocks.push({ section: 'FAQ A' + (index + 1), text: item.answer });
  });
  return blocks;
}

function scoreHumanWriting(blocks) {
  const failures = [];
  let score = 20;
  const endings = [];
  const forbidden = [
    '용도로 선택됩니다',
    '선택됩니다',
    '활용됩니다',
    '사용 작업',
    '활용 작업',
    '?좏깮?⑸땲?',
    '?쒖슜?⑸땲?',
    '?ъ슜 ?묒뾽',
    '?쒖슜 ?묒뾽'
  ];

  blocks.forEach(function (block) {
    const text = normalizeQualityText(block.text);
    const found = findQualityMatches(text, forbidden);
    if (found.length > 0) {
      score -= 6;
      failures.push(block.section + ' forbidden expression: ' + found.join(', '));
    }
    splitQualitySentences(text).forEach(function (sentence) {
      if ((sentence.match(/및/g) || []).length > 1) {
        score -= 3;
        failures.push(block.section + ' repeated and-expression');
      }
      if (sentence.length > 110) {
        score -= 2;
        failures.push(block.section + ' long sentence');
      }
      endings.push(getQualityEnding(sentence));
    });
  });

  for (let i = 1; i < endings.length; i += 1) {
    if (endings[i] && endings[i] === endings[i - 1]) {
      score -= 2;
      failures.push('repeated sentence ending: ' + endings[i]);
      break;
    }
  }

  return buildScoreItem(score, failures);
}

function scoreDuplication(blocks) {
  const failures = [];
  let score = 20;
  const seen = {};

  blocks.forEach(function (block) {
    splitQualitySentences(block.text).forEach(function (sentence) {
      const normalized = normalizeQualityText(sentence)
        .replace(/[.!?。]/g, '')
        .toLowerCase();
      if (normalized.length < 12) return;
      if (seen[normalized]) {
        score -= 8;
        failures.push('duplicate sentence: ' + block.section + ' / ' + seen[normalized]);
      } else {
        seen[normalized] = block.section;
      }
    });
  });

  return buildScoreItem(score, failures);
}

function scoreTrustworthiness(blocks, entity, schemaHtml) {
  const failures = [];
  let score = 20;
  const blockedClaims = [
    '최적',
    '우수한',
    '효율적',
    '프리미엄',
    '최고',
    '완벽',
    '강력',
    '보장',
    '理쒖쟻',
    '?곗닔?',
    '?⑥쑉?',
    '?꾨━誘몄뾼'
  ];
  const schemaText = String(schemaHtml || '');

  blocks.forEach(function (block) {
    const found = findQualityMatches(normalizeQualityText(block.text), blockedClaims);
    if (found.length > 0) {
      score -= 8;
      failures.push(block.section + ' unsupported claim: ' + found.join(', '));
    }
  });

  if (!entity || !entity.productName || !entity.productGroup) {
    score -= 4;
    failures.push('missing core entity data');
  }
  if (/"offers"|"price"|"aggregateRating"|"review"|"availability"/i.test(schemaText)) {
    score -= 6;
    failures.push('unsupported commercial schema field');
  }
  if (!schemaText || schemaText.indexOf('"@type":"Product"') === -1) {
    score -= 2;
    failures.push('product schema missing');
  }

  return buildScoreItem(score, failures);
}

function scoreAISummary(summary) {
  const failures = [];
  let score = 20;
  const lines = (summary || []).filter(function (text) {
    return normalizeQualityText(text) !== '';
  });
  const joined = lines.join(' ');

  if (lines.length === 0 || lines.length > 3) {
    score -= 10;
    failures.push('ai summary sentence count invalid');
  }
  if (!hasAnyQualityTerm(joined, ['입니다', '합니다', '납니다', '됩니다', '?낅땲'])) {
    score -= 3;
  }
  if (!hasAnyQualityTerm(joined, ['사용', '쓰', '용도', '?ъ슜'])) {
    score -= 4;
  }
  if (!hasAnyQualityTerm(joined, ['확인', '주문', '?뺤씤', '二쇰Ц'])) {
    score -= 3;
  }

  return buildScoreItem(score, failures);
}

function scoreFAQSchemaSync(faqItems, schemaState) {
  const failures = [];
  let score = 20;
  const items = faqItems || [];
  const schemaItems = schemaState.items || [];

  if (items.length < 3) {
    score -= 5;
    failures.push('faq item count below 3');
  }
  if (!schemaState.exists) {
    score -= 8;
    failures.push('faq schema missing');
  }
  if (items.length !== schemaItems.length) {
    score -= 5;
    failures.push('faq schema item count mismatch');
  }
  items.forEach(function (item, index) {
    const schemaItem = schemaItems[index] || {};
    if (normalizeQualityText(item.question) !== normalizeQualityText(schemaItem.question)) {
      score -= 2;
      failures.push('faq schema question mismatch: ' + (index + 1));
    }
    if (normalizeQualityText(item.answer) !== normalizeQualityText(schemaItem.answer)) {
      score -= 4;
      failures.push('faq schema answer mismatch: ' + (index + 1));
    }
  });

  return buildScoreItem(score, failures);
}

function getFAQSchemaState(schemaHtml) {
  const state = { exists: false, items: [] };
  const scripts = String(schemaHtml || '').match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || [];

  scripts.forEach(function (script) {
    const jsonText = script
      .replace(/^<script type="application\/ld\+json">/, '')
      .replace(/<\/script>$/, '');
    try {
      const schema = JSON.parse(jsonText);
      if (schema && schema['@type'] === 'FAQPage') {
        state.exists = true;
        state.items = (schema.mainEntity || []).map(function (item) {
          return {
            question: item.name,
            answer: item.acceptedAnswer && item.acceptedAnswer.text
          };
        });
      }
    } catch (error) {
      state.exists = false;
    }
  });

  return state;
}

function findQualityMatches(text, patterns) {
  return patterns.filter(function (pattern) {
    return text.indexOf(pattern) !== -1;
  });
}

function hasAnyQualityTerm(text, patterns) {
  return patterns.some(function (pattern) {
    return String(text || '').indexOf(pattern) !== -1;
  });
}

function normalizeQualityText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitQualitySentences(text) {
  return (normalizeQualityText(text).match(/[^.!?。]+[.!?。]?/g) || [])
    .map(function (sentence) { return sentence.trim(); })
    .filter(function (sentence) { return sentence !== ''; });
}

function getQualityEnding(sentence) {
  const text = normalizeQualityText(sentence).replace(/[.!?。]/g, '');
  if (!text) return '';
  return text.slice(Math.max(0, text.length - 4));
}

function buildScoreItem(score, failures) {
  return {
    score: Math.max(0, Math.min(20, score)),
    failures: failures
  };
}

function isImmediateQualityFailure(message) {
  return [
    'forbidden expression',
    'duplicate sentence',
    'unsupported claim',
    'missing core entity data',
    'unsupported commercial schema field',
    'product schema missing',
    'ai summary sentence count invalid',
    'faq schema missing',
    'faq schema item count mismatch',
    'faq schema question mismatch',
    'faq schema answer mismatch'
  ].some(function (pattern) {
    return String(message || '').indexOf(pattern) !== -1;
  });
}

function getContentQualityStatus(total, immediateFailures) {
  if ((immediateFailures || []).length > 0) {
    return '재생성 또는 수정';
  }
  if (total >= 85) return '운영 가능';
  if (total >= 75) return '검토 권장';
  return '재생성 또는 수정';
}

function shouldDisplayGrade(value) {
  const text = String(value || '').trim();
  if (!text) return false;

  return ![
    '확인 필요',
    '확인필요',
    '확인 불가',
    '확인불가'
  ].some(function (placeholder) {
    return text.indexOf(placeholder) !== -1;
  });
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

  return limitAndUsage(String(text)
    .replace(/사용 작업/g, '사용')
    .replace(/활용 작업/g, '활용')
    .replace(/(으)?로 사용$/g, '')
    .replace(/(으)?로 활용$/g, '')
    .replace(/ 작업$/g, '')
    .replace(/ 사용$/g, '')
    .replace(/ 활용$/g, '')
    .replace(/^(사용|활용)$/g, '')
    .replace(/ 마감$/g, ' 마감')
    .trim());
}

function limitAndUsage(text) {
  return String(text || '')
    .split(/([.!?。]\s*)/)
    .map(function (part) {
      if (/^[.!?。]\s*$/.test(part)) return part;
      const parts = part.split(' 및 ');
      if (parts.length <= 1) return part;
      if (parts.length === 2) return parts[0] + getAndParticle(parts[0]) + ' ' + parts[1];
      return parts[0] + getAndParticle(parts[0]) + ' ' + parts.slice(1).join(', ');
    })
    .join('');
}

function buildUseNote(cleanUse1, cleanUse2, data) {
  const uses = uniqueCleanTerms([cleanUse1, cleanUse2]);
  const dictionary = getHumanExpressionDictionary(getFAQCategoryType(data || {}));

  if (uses.length >= 2) {
    return cleanHumanWritingText(uses[0] + '에 많이 사용합니다. ' + dictionary.secondaryUse(uses[1]));
  }
  if (uses.length === 1) {
    return cleanHumanWritingText(uses[0] + '에 많이 사용합니다.');
  }
  return '';
}

function getUseParticle(text) {
  const value = String(text || '').trim();
  if (!value) return '로';
  const lastChar = value.charCodeAt(value.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '로';
  return ((lastChar - 0xAC00) % 28) === 0 ? '로' : '으로';
}

function buildEmphasisNote(cleanEmphasis, data) {
  if (!cleanEmphasis) return '';
  const label = String(data && data.category || '') + ' ' + String(data && data.productName || '');
  const rawEmphasis = String(data && data.emphasis || '');
  if (label.indexOf('석고') !== -1 && cleanEmphasis.indexOf('재단') !== -1) {
    return '석고보드는 절단면이 깨지지 않도록 칼선과 지지 상태를 먼저 보는 것이 좋습니다.';
  }
  if (
    label.indexOf('MDF') !== -1 &&
    ['가공성', '도장', '필름', '래핑'].some(function (word) {
      return cleanEmphasis.indexOf(word) !== -1 || rawEmphasis.indexOf(word) !== -1;
    })
  ) {
    return '도장이나 필름 래핑을 할 때는 표면 상태와 재단면을 먼저 확인하는 것이 좋습니다.';
  }
  if (
    (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('단열') !== -1) &&
    ['에너지절약기준', '두께를 최소화', '만족', '단열 성능'].some(function (word) {
      return cleanEmphasis.indexOf(word) !== -1;
    })
  ) {
    return '단열 성능이나 기준 충족 여부는 제조사 자료를 기준으로 확인해야 합니다.';
  }
  if (cleanEmphasis.indexOf('CNC') !== -1) {
    return 'CNC 가공이 필요하면 재단 치수와 작업 조건을 먼저 확인하는 것이 좋습니다.';
  }
  if (cleanEmphasis.indexOf('노출') !== -1) {
    return '노출 마감으로 쓸 경우 입고 제품의 표면 상태를 먼저 확인하는 것이 좋습니다.';
  }
  return cleanHumanWritingText('주문 전에는 ' + cleanEmphasis + ' 기준을 먼저 확인하는 것이 좋습니다.');
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
  if (label.indexOf('MDF') !== -1) {
    return cleanStructure.indexOf('판재') !== -1
      ? cleanStructure + '입니다.'
      : cleanStructure + ' 판재입니다.';
  }
  if (label.indexOf('합판') !== -1) {
    return cleanStructure.indexOf('판재') !== -1
      ? cleanStructure + '입니다.'
      : cleanStructure + ' 합판 구조입니다.';
  }
  if (cleanStructure.indexOf('판재') !== -1 || cleanStructure.indexOf('자재') !== -1) {
    return cleanStructure + '입니다.';
  }
  return cleanStructure.indexOf('구조') !== -1
    ? cleanStructure + '입니다.'
    : cleanStructure + ' 구조입니다.';
}

function getCategoryDefaultNotes(data) {
  const label = String(data.category || '') + ' ' + String(data.productName || '');

  if (label.indexOf('MDF') !== -1) {
    return [
      '노출 마감은 입고 제품의 표면 상태를 기준으로 검토합니다.',
      '도장 작업은 표면 상태와 작업 조건을 함께 살펴봅니다.',
      '재단이 필요한 경우 작업 치수를 먼저 확인합니다.'
    ];
  }

  if (label.indexOf('석고') !== -1) {
    return [
      '시공 전 벽체와 천장 규격을 확인합니다.',
      '이음부와 마감 방법을 함께 살펴봅니다.',
      '현장 반입 전 필요한 수량과 시공 면적을 확인합니다.',
      '보관 시 습기와 충격에 주의합니다.'
    ];
  }

  if (label.indexOf('각재') !== -1) {
    return [
      '구조재 사용 여부와 각재 치수를 먼저 확인합니다.',
      '절단이 필요한 경우 작업 치수를 먼저 확인합니다.',
      '노출 마감은 입고 제품의 표면 상태를 기준으로 검토합니다.'
    ];
  }

  if (label.indexOf('PF') !== -1 || label.indexOf('피에프') !== -1 || label.indexOf('단열') !== -1) {
    return [
      '시공 환경에 맞는 두께와 마감 조건을 확인합니다.',
      '단열 시공 조건을 먼저 확인합니다.',
      '연결 부위와 마감 방법을 함께 살펴봅니다.'
    ];
  }

  return [
    'CNC 가공이 필요한 경우 작업 조건을 먼저 살펴봅니다.',
    '재단이 필요한 경우 작업 치수를 먼저 확인합니다.',
    '노출 마감은 입고 제품의 표면 상태를 기준으로 검토합니다.'
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

  const useNote = buildUseNote(cleanUse1, cleanUse2, data);
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
    '마감 방향은 현장 조건에 맞춰 검토합니다.',
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
    '마감 방법은 사용 환경에 맞춰 검토합니다.',
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

  return cleanHumanWritingText(clean);
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

function buildInfographicStructureGuide(data) {
  const guide = buildProductCategoryGuide(data);
  return `
제품군 기준 DB 우선 적용:
- 아래 일치 제품군 DB를 가장 우선한다.
- AI는 제품군 DB를 변경하지 않고 구조 표현만 이미지에 맞게 정리한다.
- 인포그래픽은 AI가 자유롭게 구성하는 이미지가 아니라 제품군별 정보 디자인 시스템으로 만든다.
- 일치 제품군: ${guide.name}
- keyValue 기준: ${guide.keyValue || '일치 기준 없음'}
- structure 기준: ${guide.structure || '일치 기준 없음'}
- emphasis 후보: ${guide.emphasisCandidates.join(', ') || '일치 기준 없음'}
- use 후보: ${guide.useCandidates.join(', ') || '일치 기준 없음'}
- infographicStructure 기준: ${guide.infographicStructure || '일치 기준 없음'}
- infographicKeywords 기준: ${guide.infographicKeywords.join(', ') || '일치 기준 없음'}
- forbiddenKeywords: ${guide.forbiddenKeywords.join(', ') || '없음'}

제품군별 고정 레이아웃 템플릿:
- 합판: 비교 → 핵심 구조 → 적층 단면 → 비교 포인트.
- 집성판: 비교 → 목재 무늬 비교 → 라멜 구조 → 접합 방식.
- MDF: 비교 → 섬유 압축 구조 → 단면 → 가공 특성.
- PB / 파티클보드: 우드칩 구조 → 단면 → 체결 특성.
- 석고보드: 석고코어 → 원지 구조 → 시공 포인트.
- CRC / 시멘트보드 / 섬유시멘트보드: 섬유시멘트 구조 → 단면 → 절단/시공.
- 단열재: 제품 비교 → 레이어 구조 → 열 흐름 → 시공 포인트.
- 제품군이 무엇이든 정보 우선순위는 구조 > 비교 > 수치 순서다.
- 수치가 부족하면 수치 영역을 억지로 만들지 말고 구조, 재질, 비교, 아이콘으로 채운다.

INFOGRAPHIC_STRUCTURE_LIBRARY:
- PLYWOOD: 단판 적층(Veneer Layers) 단면. 얇은 단판 레이어 / 교차 방향 / 접착선(Glue Line)만 표현한다. 접착선은 독립된 두꺼운 층이 아니라 레이어 사이의 얇은 선으로 표현한다. 블록코어, 집성코어, 라멜 코어는 표현하지 않는다.
- SOLID_PANEL: 솔리드 라멜 집성 단면. 폭 방향 라멜 접합만 표현하고 핑거조인트는 표현하지 않는다.
- FINGER_JOINT_PANEL: 핑거조인트 라멜 집성 단면. 라멜 / 접합부 / 핑거조인트만 표현하고 합판식 단판 적층은 표현하지 않는다.
- SIDE_FINGER_PANEL: 측면 핑거 접합 구조. 측면 접합부 중심으로 표현하고 상판 전체 톱니 패턴은 금지한다.
- TOP_FINGER_PANEL: 상판 또는 길이 방향 핑거 접합 구조. 상판 면에서 핑거조인트가 보이는 구조로 표현한다.
- MDF: 목재 섬유 압축 단면. 균일한 섬유 조직으로 표현한다.
- PB: 우드칩 압축 단면. 칩 입자 / 압축 코어로 표현한다.
- GYPSUM_BOARD: 원지 / 석고 코어 / 원지 구조로 표현한다.
- CEMENT_BOARD: 시멘트 매트릭스 / 섬유 보강 / 압축 보드로 표현한다.
- PF_BOARD: 면재 / PF 폼 코어 / 면재 구조로 표현한다.
- XPS: 폐쇄 셀 압출 발포 구조로 표현한다.
- EPS: 비드 발포 입자 구조로 표현한다.
- GLASS_WOOL: 유리섬유 매트 구조로 표현한다.
- MINERAL_WOOL: 광물섬유 매트 구조로 표현한다.
- PIR_URETHANE: 면재 / PIR 또는 우레탄 폼 코어 / 면재 구조로 표현한다.
- REFLECTIVE_INSULATION: 반사 필름 / 공기층 / 완충층 구조로 표현한다.
- DECK_BOARD: 노출 상판 / 길이 방향 목재 결 / 측면 단면 / 피스 고정 위치 / 데크 간격으로 표현한다.

구조 템플릿 선택 규칙:
- 제품군 판별 결과에 따라 반드시 하나의 구조 템플릿만 선택한다.
- 선택한 구조 템플릿 외 다른 제품군 구조를 섞지 않는다.
- 합판은 PLYWOOD만 사용한다.
- 솔리드 집성판은 SOLID_PANEL만 사용한다.
- 집성목 / 집성판은 SOLID_PANEL만 사용한다.
- 핑거조인트 집성판은 FINGER_JOINT_PANEL만 사용한다.
- 사이드핑거 집성판은 SIDE_FINGER_PANEL만 사용한다.
- 탑핑거 집성판은 TOP_FINGER_PANEL만 사용한다.
- MDF는 MDF만 사용한다.
- PB / 파티클보드는 PB만 사용한다.
- 석고보드는 GYPSUM_BOARD만 사용한다.
- CRC / 시멘트보드 / 섬유시멘트보드는 CEMENT_BOARD만 사용한다.
- PF보드는 PF_BOARD만 사용한다.
- XPS는 XPS만 사용한다.
- EPS는 EPS만 사용한다.
- 글라스울은 GLASS_WOOL만 사용한다.
- 미네랄울 / 암면은 MINERAL_WOOL만 사용한다.
- PIR / 우레탄폼은 PIR_URETHANE만 사용한다.
- 열반사 단열재는 REFLECTIVE_INSULATION만 사용한다.
- 데크재는 DECK_BOARD만 사용한다.

제품군별 고정 아이콘 규칙:
- 합판: 교차 적층 아이콘, 단판 레이어 아이콘, 접착층 아이콘.
- 솔리드 집성판 / 집성목 / 집성판: 라멜 아이콘, 목재 무늬 아이콘, 폭 접합선 아이콘.
- 핑거조인트 집성판: 라멜 아이콘, 핑거조인트 아이콘, 접합부 아이콘.
- 사이드핑거 집성판: 라멜 아이콘, 측면 핑거조인트 아이콘, 접합부 아이콘.
- 탑핑거 집성판: 라멜 아이콘, 상판 핑거조인트 아이콘, 길이 방향 접합 아이콘.
- MDF: 목재섬유 아이콘, 압축 코어 아이콘, 가공 아이콘.
- PB / 파티클보드: Wood Chip 아이콘, Pressed Core 아이콘, 체결 위치 아이콘.
- 석고보드: Paper 아이콘, Gypsum Core 아이콘, 이음부 아이콘.
- CRC / 시멘트보드 / 섬유시멘트보드: Cement Matrix 아이콘, Fiber Reinforcement 아이콘, 절단면 아이콘.
- PF보드: Facing 아이콘, PF Foam Core 아이콘, 이음부 아이콘.
- XPS: Closed Cell 아이콘, 압출 폼 코어 아이콘, 이음부 아이콘.
- EPS: Expanded Bead 아이콘, EPS Foam 아이콘, 비드 구조 아이콘.
- 글라스울: Glass Fiber 아이콘, Fiber Mat 아이콘, 충진 상태 아이콘.
- 미네랄울 / 암면: Mineral Fiber 아이콘, Board Form 아이콘, 밀착 시공 아이콘.
- PIR / 우레탄폼: Facing 아이콘, Urethane/PIR Foam Core 아이콘, 이음부 아이콘.
- 열반사 단열재: Reflective Film 아이콘, Air Layer 아이콘, Cushion Layer 아이콘.
- 데크재: 노출 상판 아이콘, 길이 방향 목재 결 아이콘, 피스 고정/간격 아이콘.
- 아이콘 형태, 크기, 선 굵기, 배치 비율은 제품군별 고정 스타일을 유지하고 임의 변경하지 않는다.

INFOGRAPHIC_QUALITY_CHECKLIST:
- 합판: 라멜 구조 금지, 집성판 구조 금지, 블록코어 금지, 집성코어 금지, 교차 적층 구조만 사용, Veneer Layer 사용, 단판 적층 표현, 접착층은 얇은 접착선(Glue Line)으로만 표현, 집성판 아이콘 사용 금지, 근거 없는 수치 생성 금지.
- 솔리드 집성판: 핑거조인트 없음, 톱니형 접합 없음, 폭 방향 라멜 접합, 라멜 폭 자연스럽게 표현, 접착선 최소 표현, 단판 적층 금지, 근거 없는 수치 생성 금지.
- 사이드핑거: 측면 접합부에만 핑거조인트, 상판 전체 톱니 표현 금지, 단판 적층 금지, 근거 없는 수치 생성 금지.
- 탑핑거: 상판 또는 길이 방향 접합만 표현, 측면 전체 핑거 금지, 단판 적층 금지, 근거 없는 수치 생성 금지.
- MDF: 섬유 압축 구조, 라멜 금지, Veneer Layer 금지, 근거 없는 수치 생성 금지.
- PB: 우드칩 구조, 섬유 구조 금지, Veneer Layer 금지.
- 석고보드: Paper / Gypsum / Paper, 단열재 구조 금지, 라멜 금지.
- CRC: 섬유시멘트 구조, 석고보드 구조 금지, 단열재 구조 금지.
- PF: Facing / PF Foam Core / Facing, XPS 구조 금지, EPS 구조 금지, 글라스울 구조 금지.
- XPS: Closed Cell, PF 구조 금지, EPS 비드 구조 금지.
- EPS: 비드 구조, Closed Cell 금지.
- 글라스울: 섬유 매트 구조, 발포 구조 금지.
- 미네랄울: 광물섬유 구조, 글라스울 질감 혼용 금지.
- 데크재: 노출 상판, 길이 방향 목재 결, 측면 단면, 피스 고정 위치, 데크 간격만 사용하고 단판 적층, MDF/PB 압축 코어, 석고 코어, 단열재 코어, 근거 없는 성능/내구성/방부 등급 수치 생성을 금지.

제품군별 구조 규칙:
- 합판(Plywood): 목재 단판(Veneer)을 여러 겹 쌓은 단판 적층(Veneer Layers) 구조. 구조도는 얇은 단판 레이어, 교차 적층 방향, 레이어 사이의 얇은 접착선(Glue Line) 중심. 접착선은 별도 두꺼운 접착층이나 젤 형태로 표현하지 않는다. 허용: 적층, Veneer, Layer, Glue Line. 금지: 라멜, 집성, 핑거조인트, 블록코어, 집성코어, OSB처럼 보이는 조각 코어.
- 합판 라벨 규칙: "접착층"이라는 라벨을 쓰지 말고 반드시 "접착선(Glue Line)" 또는 "얇은 접착선"으로 표기한다.
- 솔리드 집성판: 원목 라멜을 폭 방향으로 접합한 솔리드 패널 구조. 구조도는 라멜, 폭 접합, 접착 중심. 허용: 라멜, 폭 접합, 접착, 솔리드 패널. 금지: 핑거조인트, Finger Joint, FJ, 탑핑거, 사이드핑거, 톱니형 접합, 길이 방향 접합, 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 사이드핑거 집성판: 제품명에 사이드핑거, 사이드 핑거, Side Finger가 명확히 포함될 때만 측면 접합부 중심으로 핑거조인트를 표현한다. 표면 전체에 과한 톱니 패턴을 만들지 않는다. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 탑핑거 집성판: 제품명에 탑핑거, 탑 핑거, Top Finger가 명확히 포함될 때만 상판 면 또는 길이 방향 접합부에 핑거조인트를 표현한다. 합판식 레이어 단면으로 표현하지 않는다. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 핑거조인트 집성판: 제품명에 핑거, FJ, Finger가 명확히 포함될 때만 핑거조인트 표현을 허용한다. 구조도는 라멜, 접합부, 접착 중심. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 집성판 / 집성목: 제품명에 핑거, FJ, Finger가 없으면 핑거조인트를 생성하지 않는다. 원목 라멜을 폭 방향으로 접합한 집성 구조로 표현한다. 구조도는 라멜, 접착, 집성, 폭 접합 중심. 허용: Lamella, Edge Glued, Solid Panel. 금지: 핑거조인트, Finger Joint, FJ, 탑핑거, 사이드핑거, 톱니형 접합, 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- MDF: 목재 섬유 압축 성형 구조. 구조도는 목재섬유, 고밀도 압축, 균일 구조 중심. 금지: 단판 적층, 라멜 집성.
- PB / 파티클보드: 우드칩과 접착제를 압축 성형한 구조. 구조도는 Wood Chip, Resin, Pressed Core 중심. 금지: 단판 적층, 라멜 집성, 석고 코어.
- 석고보드: 석고 코어 양면에 원지를 결합한 구조. 구조도는 원지, 석고 코어, 원지 중심. 금지: 단판 적층, 라멜 집성, 목재 섬유 압축.
- CRC / 시멘트보드 / 섬유시멘트보드: 시멘트계 원료와 섬유질 원료를 압축 성형한 구조. 구조도는 Cement Matrix, Fiber Reinforcement, Pressed Board 중심. 금지: 단판 적층, 라멜 집성, 석고 코어.
- PF보드 / 페놀폼 단열재: 페놀수지 발포 단열재 코어에 면재를 복합한 구조. 구조도는 Facing, PF Foam Core, Facing 중심. 금지: 단판 적층, 라멜 집성, 석고 코어.
- XPS / 아이소핑크 / 압출법 단열재: 폴리스티렌 수지를 압출 발포한 폐쇄 셀 구조. 구조도는 Closed Cell Foam, Extruded Polystyrene, Uniform Foam Core 중심. 허용: 폐쇄 셀, 압출 발포, XPS Core. 금지: PF Core, Glass Wool Fiber, 단판 적층, 라멜 집성.
- EPS / 스티로폼 / 비드법 단열재: 폴리스티렌 비드를 발포 성형한 단열재. 구조도는 Expanded Bead, EPS Foam, Bead Structure 중심. 허용: 비드 구조, 발포 입자, EPS Core. 금지: 압출 발포 구조, PF Core, Glass Wool Fiber, 단판 적층.
- 글라스울: 유리섬유를 솜 형태로 집합한 섬유계 단열재. 구조도는 Glass Fiber, Fiber Mat, Air Layer 중심. 허용: 섬유 매트, 유리섬유, 흡음, 단열. 금지: 발포 코어, 단판 적층, 라멜 집성.
- 미네랄울 / 암면: 광물 섬유를 매트 또는 보드 형태로 성형한 단열재. 구조도는 Mineral Fiber, Fiber Mat, Board Form 중심. 허용: 광물섬유, 섬유 매트, 보드형 단열재. 금지: 발포 코어, 단판 적층, 라멜 집성.
- 우레탄폼 / PIR 단열재: 우레탄 또는 PIR 발포 단열재 코어에 면재를 결합한 구조. 구조도는 Facing, Urethane/PIR Foam Core, Facing 중심. 허용: Foam Core, Facing, PIR Core. 금지: PF Core로 단정, Glass Wool Fiber, 단판 적층.
- 열반사 단열재: 반사 필름과 공기층 또는 완충재를 결합한 구조. 구조도는 Reflective Film, Air Layer, Cushion Layer 중심. 허용: 반사층, 공기층, 알루미늄 필름. 금지: 발포 코어 단정, 단판 적층, 라멜 집성.
- 데크재: 실외 바닥이나 테라스 시공에 사용하는 장척 목재 자재. 구조도는 노출 상판, 길이 방향 목재 결, 측면 단면, 피스 고정 위치, 데크 간격 중심. 허용: 수종, 폭, 두께, 길이, 표면 상태, 고정 방식, 시공 간격. 금지: 단판 적층, MDF/PB 압축 코어, 석고 코어, 단열재 코어, 근거 없는 성능/내구성/방부 등급 수치.

구조 혼용 금지:
- 집성판이면 단판 적층, 3~13겹, Veneer Layer, 교차 적층을 절대 사용하지 않는다.
- 합판이면 라멜, 집성, 핑거조인트를 절대 사용하지 않는다.
- 단열재는 제품명에 따라 PF보드, XPS, EPS, 글라스울, 미네랄울, 우레탄폼, 열반사 단열재를 구분하고 서로 혼용하지 않는다.
- 데크재는 각재, 방부목, 합판, 집성판 구조로 임의 대체하지 않는다.

구조도 일치 규칙:
- 제목, 구조 설명, 단면 이미지, 레이어 구조, 아이콘, 수치 비교는 모두 동일한 제품 구조를 사용한다.
- 제품군이 바뀌면 모든 요소가 함께 변경되어야 한다.
- 부분적으로 다른 제품군 구조를 혼합하지 않는다.
- 실제 단면과 최대한 유사하게 표현한다.
- 합판은 교차 적층 단면으로 표현한다.
- 집성판은 라멜과 최소한의 접착선 중심으로 표현한다.
- 솔리드, 핑거조인트, 사이드핑거, 탑핑거는 모두 별도 구조로 표현한다.
- MDF는 목재 섬유 압축 구조로 표현한다.
- PB는 Chip 기반 압축 구조로 표현한다.
- 석고보드는 Paper / Gypsum / Paper 구조로 표현한다.
- PF보드는 Facing / PF Foam Core / Facing 구조로 표현한다.

사실성 우선:
- 검색성과 디자인보다 실제 제품 구조와 일치하는 설명을 우선한다.
- 모르는 내용은 추정하지 않는다.
- 성능 수치, 인증, KS/KC, 준불연, 열전도율, 흡음률, 밀도 등은 A~M열 또는 제조사 자료에 명확히 있을 때만 사용한다.
- A~M열 또는 제조사 자료에 명확한 공식 수치가 있으면 핵심 수치 섹션에 우선 배치한다.
- 공식 수치의 숫자는 #C9A84C 골드로 크게 강조하고 단위는 정확히 표기한다.
- 출처가 명확하면 수치 주변에 작게 표기한다.
- 강조 가능한 공식 수치 예시는 열전도율, 밀도, 함수율, 흡수율, 압축강도, 접착강도, 준불연 / 불연 / 난연 등급, KS / KC 인증, E0 / E1 등급, 방염 등급, 두께 옵션, 규격이다.
- 위 공식 수치는 A~M열 또는 제조사 자료에 명확히 있을 때만 사용한다.
- A~M열에 명확한 수치가 없는 경우 임의 숫자를 생성하지 않는다.
- 함수율, 밀도, 접착율, 접착률, 라멜 수, 열전도율, 강도, 접착제 도포량 등은 근거가 있을 때만 표시한다.
- 근거 없는 수치 섹션은 만들지 않는다.
- A~M열에 명확한 수치가 없으면 수치 카드나 핵심 수치 섹션을 만들지 않는다.
- 임의 라멜 수, 임의 접착률, 임의 접착제 도포량, 임의 함수율, 임의 밀도, 임의 열전도율, 임의 강도는 절대 생성하지 않는다.
- 출처 없는 "100%", 출처 없는 "10장", 출처 없는 "150g/m²", 출처 없는 "8~12%", 출처 없는 "30~50mm" 같은 임의 수치를 생성하지 않는다.
- 공식 수치가 없으면 수치 카드 생성 금지, 임의 숫자 생성 금지를 지키고 구조 특징, 단면 구조, 비교 포인트, 작업 확인 포인트로 대체한다.
- 수치가 부족하면 구조 특징, 단면 구조, 작업 확인 포인트, 비교 포인트 섹션으로 대체한다.
- 수치가 부족한 경우 구조 특징, 단면 구조, 작업 확인 포인트 중심으로 구성한다.
- 비교는 실제 차이만 표현하고 광고 문구나 추정 표현을 사용하지 않는다.
- 비교 문구는 A~M 입력값에 근거가 있을 때만 사용한다.
- 입력 근거 없는 단정 표현 금지: "100%", "미적용", "관리 기준 낮음", "높음", "낮음", "완전", "불필요", "항상", "최고", "최적".
- 비교 대상의 단점은 확인된 차이만 중립적으로 표현하고, 근거 없는 부정 라벨을 만들지 않는다.
- "고광택", "저감", "향상", "강화" 같은 정성 표현을 임의의 퍼센트나 등급으로 바꾸지 않는다.
- 비교 대상의 상세 입력값이 없으면 비교 대상 단점 bullet을 만들지 않는다.
- 동일한 여백, 폰트, 비율, 아이콘 크기, 선 굵기, 카드 스타일을 유지한다.

출처 규칙:
- 출처는 실제 제조사 자료나 A~M열에 명확한 근거가 있을 때만 표기한다.
- "출처: 제품 데이터", "출처: 제품 사양서", "출처: 입력 데이터"는 사용하지 않는다.
- 실제 근거가 없으면 출처 영역 자체를 만들지 않는다.

최종 자기검증 규칙:
- 이미지 생성 전 제품군 구조가 맞는지 확인한다.
- 다른 제품군 구조가 섞이지 않았는지 확인한다.
- 근거 없는 수치가 없는지 확인한다.
- 근거 없는 출처가 없는지 확인한다.
- 단면 구조가 실제 제품과 일치하는지 확인한다.
- 하나라도 만족하지 않으면 해당 요소를 제거하거나 구조 중심으로 다시 구성한다.

[제품군 판단 참고]
분류: ${data.category}
제품명: ${data.productName}
핵심표현: ${data.keyValue}
구조: ${data.structure}
강조포인트: ${data.emphasis}
  `;
}

function buildTypeAPrompt(data) {
  const compareTargetText = String(data.compareTarget || '').trim();
  const compareParts = compareTargetText
    .split(/\s+VS\s+/i)
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return part; });
  const isVsCompareMode = compareParts.length >= 2;
  const leftCompareLabel = isVsCompareMode ? compareParts[0] : data.compareTarget;
  const rightCompareLabel = isVsCompareMode ? compareParts.slice(1).join(' VS ') : data.productName;
  const productGroup = data.productGroup || getFAQCategoryType(data);
  const compareTargetLower = compareTargetText.toLowerCase();
  function hasAnyCompareKeyword(keywords) {
    return keywords.some(function (keyword) {
      return compareTargetLower.indexOf(String(keyword).toLowerCase()) !== -1;
    });
  }
  const isPlywoodOriginCompare =
    productGroup === 'PLYWOOD' &&
    compareTargetText.indexOf('베트남산') !== -1 &&
    compareTargetText.indexOf('동남아산') !== -1;
  const hasDifferentStructureCompareTarget = hasAnyCompareKeyword([
    'pf', '피에프', '페놀', 'xps', '아이소핑크', '압출법', 'eps', '스티로폼', '비드법',
    '글라스울', '미네랄울', '암면', '우레탄', 'pir', 'pb', '파티클', '석고',
    '시멘트보드', 'crc', '데크재', 'deck'
  ]) || (productGroup !== 'PLYWOOD' && hasAnyCompareKeyword(['합판', 'plywood']))
    || (productGroup !== 'MDF' && hasAnyCompareKeyword(['mdf', '엠디에프']));
  const isSameGroupSoftCompare =
    isVsCompareMode &&
    !hasDifferentStructureCompareTarget &&
    (
      productGroup === 'MDF' ||
      (
        productGroup === 'PLYWOOD' &&
        hasAnyCompareKeyword(['원산지', '산', '표면', '선별', '브랜드', '제조사'])
      )
    );
  const shouldSkipTypeAStructureCompare = isPlywoodOriginCompare || isSameGroupSoftCompare;
  const typeAGoalInstruction = shouldSkipTypeAStructureCompare
    ? '- 비교 핵심 포인트까지만 시각화하고 3단은 생성하지 않는다'
    : '- 비교 핵심 포인트와 좌우 구조 차이를 시각화';
  const sourceInstruction = data.source
    ? `- 출처는 작게 표시: "출처: ${data.source}"`
    : '';
  const secondSectionInstruction = shouldSkipTypeAStructureCompare
    ? `
2단: 비교 핵심 포인트
- 좌우 대상의 핵심 차이 2~3개만 카드형으로 표시
- "무엇이 다른가"만 짧은 키워드로 요약
- 같은 의미의 항목 반복 금지
- 구조가 같은 경우 접착선, 적층 방향, 공통 단면을 비교 항목으로 억지 생성하지 않는다.
- PLYWOOD 원산지 비교는 단판 균일성, 표면 상태, 외관 편차 중심으로 표시한다.
- 가격, 성능 우열, 내구성, 수명, 인증, 등급 비교 금지
${sourceInstruction}
- 근거 없는 차이 생성 금지
- 현장 선택 기준, 구매 체크포인트, 추천 용도, 외관 확인, 마감 방향 결정, 제품별 상태 점검 문구 금지
- HTML 구매 체크포인트와 유사한 문구 금지
- 입력값에 실제 차이가 부족하면 섹션을 억지로 채우지 않는다.
`
    : `
2단: 비교 핵심 포인트
- 좌우 대상의 차이 3~4개만 카드형으로 표시
- "무엇이 다른가"만 짧은 키워드로 요약
- 구조, 시공 방식, 특징 차이만 사용
- 가격, 성능 우열, 내구성, 수명, 인증, 등급 비교 금지
- 3단 좌우 구조 비교에서 보여줄 정보와 반복하지 않는다.
${sourceInstruction}
- 근거 없는 차이 생성 금지
- 입력값에 실제 차이가 부족하면 확인 가능한 구조, 시공 방식, 특징만 표시
`;
  const thirdSectionInstruction = shouldSkipTypeAStructureCompare
    ? `
3단 생성 금지:
- 이 비교는 1단과 2단까지만 구성한다.
- 3단 섹션, 3단 제목, 하단 추가 카드, 하단 체크포인트를 만들지 않는다.
- 좌우 구조 비교, 현장 선택 기준, 구매 체크포인트, 추천 용도 섹션을 생성하지 않는다.
- 외관 확인, 마감 방향 결정, 제품별 상태 점검 문구로 빈 영역을 채우지 않는다.
- 합판 공통 구조 설명, 단판 적층도, 접착선 비교를 생성하지 않는다.
- 정보가 부족하면 섹션을 억지로 채우지 않는다.
`
    : `
3단: 좌우 구조 비교
- 좌측 구조와 우측 구조를 동일한 시점에서 비교
- 좌우는 동일한 위치, 동일한 비율, 동일한 확대 수준으로 배치
- 차이가 나는 구조 요소만 강조
- 제품 설명형 단면 구조도 금지
- B타입의 단일 제품 구조 설명을 복사하지 않는다.
- 2단 비교 핵심 포인트와 같은 정보 반복 금지
- 긴 설명문 금지
`;
  const vsCompareInstruction = isVsCompareMode
    ? `
VS 비교 모드 공통 규칙:
- compareTarget에 VS가 포함되어 있으므로 1단 비교 라벨은 VS 기준 좌우 대상을 사용한다.
- 왼쪽 라벨은 "${leftCompareLabel}"로 표시한다.
- 오른쪽 라벨은 "${rightCompareLabel}"로 표시한다.
- 오른쪽 라벨에 상품명을 사용하지 않는다.
- 비교는 구조, 시공 방식, 특징 차이만 표현한다.
- 가격 비교, 성능 우열 비교, 내구성/수명/등급/인증 비교를 생성하지 않는다.
- 좌우 구조가 서로 섞이지 않도록 Product Fidelity를 유지한다.
- 비교는 차이를 보여주되 한쪽을 근거 없이 과도하게 낮추지 않는다.
- 우열 비교가 필요한 경우 반드시 제품군 DB 또는 운영 기준에 근거해야 한다.
- 비교 기준이 제품군 DB 또는 운영 기준에 정의되어 있으면 반드시 그 기준을 따른다.
- 모델의 일반 지식이나 추론으로 비교 방향을 변경하지 않는다.
- 정의된 비교 우선순위를 반대로 표현하지 않는다.
- 근거가 없으면 객관적 구조, 외관, 시공 차이만 비교한다.
`
    : '';
  const deckBoardStructureInstruction = productGroup === 'DECK_BOARD'
    ? `
DECK_BOARD A타입 좌우 구조 비교 품질 규칙:
- 3단은 제품 설명형 구조도가 아니라 좌측 구조와 우측 구조를 같은 시점에서 비교하는 영역이다.
- 좌측/우측 구조는 동일한 위치, 동일한 비율, 동일한 확대 수준으로 배치한다.
- 좌우 비교 이미지는 동일한 카메라 각도, 동일한 조명, 동일한 비율로 표현한다.
- 비교 대상 외 배경, 하부 구조, 시점은 최대한 동일하게 유지한다.
- 차이가 나는 체결 구조만 강조하고 2단 비교 핵심 포인트와 같은 정보를 반복하지 않는다.
- AI 일러스트 느낌보다 제조사 기술자료 수준의 현실적인 제품 렌더링을 우선한다.
- 원목 데크재의 자연스러운 목재 결, 측면 단면, 두께감, 모서리 질감을 선명하게 표현한다.
- 클립, 피스, 하부 각재는 실제 시공 가능한 위치와 비율로만 표현한다.
- 장난감 같은 클립, 과도하게 단순화된 피스, 비현실적인 금속 부품을 생성하지 않는다.
- 상부 피스 노출 시공은 평평한 원목 상판 위 피스 체결로 표현한다.
- 히든 클립 시공은 측면 홈가공과 클립 체결 구조가 실제처럼 보이게 표현한다.
- 하단이 단순 아이콘이나 도식처럼 보이지 않게 하고 실제 원목 데크재 단면과 시공 부품이 보이는 기술자료형 구조 비교로 표현한다.
- 텍스트는 짧은 부품명만 사용하고 설명문은 넣지 않는다.
- 실제 판매되는 구조만 표현하고 가상의 부품이나 연결구를 생성하지 않는다.
`
    : '';
  const deckBoardProductFidelityInstruction = productGroup === 'DECK_BOARD'
    ? `
DECK_BOARD A타입 구조 혼용 금지 규칙:
- 데크재 비교에서 각 영역은 선택된 비교 대상의 구조만 표현한다.
- 상부 피스 노출 시공 영역에는 Hidden Clip, 클립 부품, 측면 홈가공을 생성하지 않는다.
- 좌측 체결 방식은 상부 피스 직접 체결만 사용한다.
- 상부 피스 노출 시공 하부에는 실제 장선을 기본으로 표현한다.
- 상부 피스 노출 시공 영역에는 Hidden Clip용 클립, 별도 브래킷, 금속 받침을 추가하지 않는다.
- 측면 홈가공 히든 클립 시공 영역에는 상판 피스 노출을 생성하지 않는다.
- 우측 체결 방식은 측면 홈, Hidden Clip, 클립 고정 피스를 중심으로 표현한다.
- 한 이미지나 한 구조물 안에서 상부 피스 노출 시공과 Hidden Clip 시공을 혼용하지 않는다.
- 두 시공 방식은 같은 구조물에 동시에 적용된 것처럼 표현하지 않는다.
- 좌우 방식의 부품이 서로 섞이면 FAIL로 본다.
- 하단 단면 비교에서도 좌측 체결 방식은 상부 피스 직접 체결만 사용하고, 우측 체결 방식은 측면 홈, Hidden Clip, 클립 고정 피스를 중심으로 표현한다.
`
    : '';
  const plywoodOriginCompareInstruction =
    isPlywoodOriginCompare
      ? `
PLYWOOD 원산지 비교 고정 데이터:
- 이 규칙은 PLYWOOD 원산지 비교에만 적용한다.
- 아래 좌우 고정 데이터의 라벨과 선택한 bullet 문구를 1단/2단 비교 문구에 그대로 사용한다.
- 2단 비교 핵심 포인트는 고정 데이터 중 핵심 차이 2~3개만 사용한다.
- 고정 데이터 문구 재작성 금지, 요약 금지, 확장 금지, 순서 변경 금지, 다른 문구 추가 금지.
- VS 순서를 반드시 따른다.

왼쪽 고정 데이터:
- 라벨: "${leftCompareLabel}"
${leftCompareLabel.indexOf('베트남산') !== -1
  ? `- bullet 1: 일반 사용 중심
- bullet 2: 단판 편차 확인
- bullet 3: 표면 상태 확인
- bullet 4: 제품별 외관 차이 확인`
  : `- bullet 1: 단판 균일성이 비교적 안정적
- bullet 2: 표면 상태가 비교적 안정적
- bullet 3: 외관 편차가 적은 편
- bullet 4: 마감용 선택 시 우선 검토`}

오른쪽 고정 데이터:
- 라벨: "${rightCompareLabel}"
${rightCompareLabel.indexOf('베트남산') !== -1
  ? `- bullet 1: 일반 사용 중심
- bullet 2: 단판 편차 확인
- bullet 3: 표면 상태 확인
- bullet 4: 제품별 외관 차이 확인`
  : `- bullet 1: 단판 균일성이 비교적 안정적
- bullet 2: 표면 상태가 비교적 안정적
- bullet 3: 외관 편차가 적은 편
- bullet 4: 마감용 선택 시 우선 검토`}

PLYWOOD 원산지 비교 금지 문구:
- 라디아타파인
- 프리미엄 수종
- 균일 선별
- 편차 최소화
- 혼합 수종 위주
- 일반 선별
- 입력에 없는 수종명
- 근거 없는 품질 우열 문구
`
      : '';
  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

이 이미지는 카페24 상품 상세설명 HTML 안에 삽입되는 보조 이미지다.
광고 포스터가 아니라, 제품 설명을 보완하는 실무형 인포그래픽으로 만든다.

목표:
- 상세설명 HTML 텍스트와 중복 금지
- 비교요소, 비교 대상만 시각화
${typeAGoalInstruction}
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

${buildInfographicStructureGuide(data)}

1단: 비교
- 좌우 비교 구조
- 왼쪽 라벨: "${leftCompareLabel}"
- 오른쪽 라벨: "${rightCompareLabel}"
- 제품명은 이 비교 라벨에서만 1회 허용
- 비교 차이는 2~3개 짧은 키워드로 표현
- 비교 문구는 입력값에 실제로 있는 차이만 사용
- 비교 대상에 "미적용", "높음", "낮음", "관리 기준 낮음" 같은 부정 단정 금지
- 근거가 부족하면 비교 대상의 단점을 쓰지 말고 오른쪽 제품의 확인 가능한 특징만 표시
- compareTarget 이름만 있고 비교 대상의 별도 스펙 근거가 없으면 왼쪽 영역은 제품명 또는 중립 이미지로만 표시
- 왼쪽 비교 영역에 "품질 편차", "방출량 높음", "내수성 낮음", "일반 접착제" 같은 추정 단점 bullet 금지
- 긴 설명문 금지

${secondSectionInstruction}
${thirdSectionInstruction}

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
  ` + vsCompareInstruction + deckBoardProductFidelityInstruction + deckBoardStructureInstruction + plywoodOriginCompareInstruction;
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

${buildInfographicStructureGuide(data)}

1단: 단면 구조 메인
- "${data.structure}"을 기반으로 큰 단면 도해 또는 분해도를 생성
- 레이어, 코어, 표면층, 접합부 등 실제 존재하는 구조 포인트만 시각화
- 라벨은 3개 이하
- 긴 설명문 금지

2단: 구조 상세 확대 영역
- exactly three zoom windows of the same product structure
- 제품군별 구조에 맞는 확대뷰만 사용한다.
- 합판: veneer layer zoom / cross grain zoom / thin glue line zoom
- 합판 확대뷰는 반드시 단판 적층(Veneer Layers)만 보여준다.
- 합판 확대뷰에서 블록코어, 집성코어, 라멜 코어, OSB 조각 코어, 두꺼운 젤 형태 접착층을 만들지 않는다.
- 합판 접착 표현은 독립된 두꺼운 층이 아니라 단판 사이 얇은 접착선(Glue Line)으로만 표현한다.
- 합판 접착선은 흰색/노란색의 두꺼운 밴드, 거품, 젤, 충전재처럼 보이면 안 된다.
- 합판 Type B 라벨에서 "접착층" 단어 금지, "접착선(Glue Line)"만 사용한다.
- 솔리드 집성판, 집성목, 집성판: lamella zoom / wood grain zoom / edge joint zoom
- 핑거조인트 집성판: lamella zoom / finger joint zoom / adhesive joint zoom
- 사이드핑거 집성판: side finger joint zoom / lamella zoom / adhesive joint zoom
- 탑핑거 집성판: top finger joint zoom / lamella zoom / length joint zoom
- 데크재: surface grain zoom / side profile zoom / fastening gap zoom
- MDF: surface fiber zoom / compressed fiber core zoom / cut edge zoom
- PB / 파티클보드: surface layer zoom / wood chip core zoom / fastening point zoom
- 석고보드: paper face zoom / gypsum core zoom / board joint zoom
- CRC / 시멘트보드 / 섬유시멘트보드: cement matrix zoom / fiber reinforcement zoom / cut edge zoom
- PF보드: facing zoom / PF foam core zoom / joint treatment zoom
- XPS: closed cell zoom / uniform foam core zoom / board joint zoom
- EPS: expanded bead zoom / EPS foam core zoom / board joint zoom
- 글라스울: glass fiber zoom / fiber mat zoom / filled cavity zoom
- 미네랄울 / 암면: mineral fiber zoom / board edge zoom / tight joint zoom
- PIR / 우레탄폼: facing zoom / urethane/PIR foam core zoom / joint treatment zoom
- 열반사 단열재: reflective film zoom / air layer zoom / cushion layer zoom
- no product names in this section
- no title bars in this section
- each zoom window must show magnified details from the top structure only
- 동일 제품 구조 확대뷰 3개
- 선택한 제품군에 존재하는 실제 구조 요소만 확대
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

${buildInfographicStructureGuide(data)}

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
