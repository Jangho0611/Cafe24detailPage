// ==========================================
// 대산우드랜드 상세페이지 자동화 스크립트
// ==========================================

const SHEET_ID = '1N11hwkpsc2T9ix4CBbqpkrZKko6RvRreSz4N8Ix2mME';
const SHEET_NAME = '시트4';
const IMAGE_VERSION = '20260714';

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
    ? `<div class="ds-infographic"><img src="${appendImageVersion(data.infographic)}" alt="${data.productName} ${sectionTitle}" style="max-width:100%;width:100%;height:auto;display:block;margin:0;"></div>`
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

  content.define = buildProductIntroductionFromKnowledge(data, content.define);

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

  const isBirchSurfaceGradeRow = entityData.productKnowledge && entityData.productKnowledge.isBirchPlywood &&
    extractPlywoodSurfaceGrades(data.grade).length > 0;
  const gradeLabel = isBirchSurfaceGradeRow ? '표면 등급' : '성능·인증';
  const gradeRowHtml = shouldDisplayGrade(data.grade)
    ? `    <tr><th>${gradeLabel}</th><td>${data.grade}</td></tr>`
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

  content = normalizePlywoodAutoFillContent(content, data);

  missingFields.forEach(function (field) {
    const currentValue = sheet.getRange(row, field.col).getValue();
    const nextValue = normalizeAutoFillGluedWoodTerms(content[field.key]);
    if (String(currentValue || '').trim() === '' && nextValue) {
      sheet.getRange(row, field.col).setValue(String(nextValue).trim());
    }
  });

  sheet.getRange(row, COL.ERROR).setValue('');
  SpreadsheetApp.getActiveSpreadsheet().toast(row + '행 E, H~M 자동보완 완료');
}

function appendImageVersion(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  return value + (value.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(getImageVersion());
}

function getImageVersion() {
  try {
    const range = SpreadsheetApp.openById(SHEET_ID).getRangeByName('IMAGE_VERSION');
    const configuredVersion = range ? String(range.getDisplayValue() || '').trim() : '';
    return configuredVersion || IMAGE_VERSION;
  } catch (error) {
    Logger.log('IMAGE_VERSION 설정값 읽기 실패, 기본값 사용: ' + error.message);
    return IMAGE_VERSION;
  }
}

function normalizeAutoFillGluedWoodTerms(value) {
  return String(value || '')
    .replace(/원목\s*(?:라멜|lamella)(?:을|를)?/gi, '폭 방향으로 접합한 목재를')
    .replace(/(?:라멜|lamella)\s*집성/gi, '집성 목재')
    .replace(/(?:라멜|lamella)/gi, '집성 목재')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildAutoFillSpecPrompt(data) {
  const guide = buildProductCategoryGuide(data);
  const knowledge = buildProductKnowledgeContext(data);
  const forbiddenKeywords = knowledge.hasAdhesiveEvidence
    ? guide.forbiddenKeywords.filter(function (keyword) {
        return ['접착제', '접착층', '접착부', 'Glue Line', '본드층'].indexOf(keyword) === -1;
      })
    : guide.forbiddenKeywords;
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
- forbiddenKeywords: ${forbiddenKeywords.join(', ') || '없음'}

Product Knowledge Context:
- productGroup: ${knowledge.productGroup}
- productType: ${knowledge.productType}
- manufacturer: ${knowledge.manufacturer || '확인 근거 없음'}
- surfaceGrade: ${knowledge.surfaceGrade || '확인 근거 없음'}
- faceGrade: ${knowledge.faceGrade || '확인 근거 없음'}
- backGrade: ${knowledge.backGrade || '확인 근거 없음'}
- hasAdhesiveEvidence: ${knowledge.hasAdhesiveEvidence}
- isBirchPlywood: ${knowledge.isBirchPlywood}
- isWaterResistantPlywood: ${knowledge.isWaterResistantPlywood}

작성 규칙:
- A~D, F~G열 입력값만 근거로 작성한다.
- 집성목/집성판에는 "라멜", "Lamella", "lamella"를 사용하지 않는다.
- 집성목/집성판은 집성 목재, 폭 방향으로 접합한 목재, 집성 접합부, 목재 결 방향, 집성 구조 표현만 사용한다.
- 제조사 공식 자료, 인증, 성능, 원산지는 추정하지 않는다.
- grade는 등급이 아니라 E열 성능·인증 입력값이다.
- E열 기존값은 참고 근거로만 사용하고 S/BB, B/BB, BB/BB, BB/CP, CP/BB, CP/CP 같은 표면 등급을 grade에 작성하지 않는다.
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
- 자작합판 복합 등급은 앞 표기를 앞면, 뒤 표기를 뒷면 표면 등급으로만 해석한다.
- 자작합판 표면 등급을 구조 성능이나 강도 등급과 연결하지 않는다.
- 현재 운영 상품/공급사 자작합판에 한해서만 B=최상급, S=상급, BB=중급, CP=하급 기준을 사용한다.
- 위 기준을 모든 제조사나 다른 자작합판의 공통 등급 체계로 일반화하지 않는다.
- 현재 운영 상품 기준의 표면 설명은 B=패치가 거의 없고 가장 깨끗한 표면, S=일부 패치 허용, BB=패치와 옹이 허용, CP=더 많은 표면 결함 허용이다.
- 제조사 근거가 없으면 패치 개수·크기·직경과 수치를 생성하지 않는다.
- 패치·필러는 해당 표면 등급의 허용 범위에 포함될 수 있으므로 실제 표면을 확인하는 항목으로만 작성한다.
- 모든 자작합판을 전층 자작 단판으로 단정하지 않는다.
- 합판류 기본 설명은 얇은 목재 단판의 여러 겹 적층, 앞·뒷면 표면, 측면 적층 단면 중심으로 작성한다.
- hasAdhesiveEvidence가 false인 합판에는 접착제, 접착층, 접착부, Glue Line, 본드층, 접착 구조, 접착선 확대 표현을 작성하지 않는다.
- hasAdhesiveEvidence가 true인 합판만 "내수성이 고려된 접착 성능" 수준의 표현을 허용한다.
- 접착제 수지명, 완전 방수, 외부 영구 사용 가능 여부를 생성하지 않는다.
${buildGeneratedContentRemedyGuard()}

컬럼별 작성 규칙:
- keyValue는 구매자가 한눈에 보는 핵심 포지션만 작성한다. 제품명을 반복하지 않는다.
- keyValue는 상품을 분류·이해하기 위한 짧은 포지션 표현으로 작성하고, structure의 재료·층·제조 방식 설명을 그대로 반복하지 않는다.
- keyValue 좋은 예: "다층 단판 판재", "시멘트계 바탕 보드", "균일 단면 가공 판재", "페놀폼 단열재".
- structure는 재료·층·제조 방식만 설명한다.
- structure 좋은 예: "얇은 목재 단판을 여러 겹 적층한 판재", "목재 섬유를 고온고압으로 성형한 판재", "석고 코어 양면에 원지를 결합한 판재", "시멘트와 섬유질 원료를 압축 성형한 보드".
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
E열 기존 성능·인증 참고값: ${data.grade || ''}
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

function parsePlywoodSurfaceGrade(data) {
  const text = [
    data && data.productName,
    data && data.grade,
    data && data.category
  ].map(function (value) { return String(value || ''); }).join(' ');
  const match = text.match(/(?:^|[^A-Z])(BB|CP|S|B)\s*\/\s*(BB|CP|S|B)(?=$|[^A-Z])/i);
  if (!match) return null;

  const faceGrade = String(match[1]).toUpperCase();
  const backGrade = String(match[2]).toUpperCase();
  const surfaceGrade = faceGrade + '/' + backGrade;
  const supportedGrades = ['S/BB', 'B/BB', 'BB/BB', 'BB/CP', 'CP/BB', 'CP/CP'];
  if (supportedGrades.indexOf(surfaceGrade) === -1) return null;

  return {
    surfaceGrade: surfaceGrade,
    faceGrade: faceGrade,
    backGrade: backGrade
  };
}

function getCurrentSupplierBirchGradeDescription(grade) {
  const descriptions = {
    B: { level: '최상급', surface: '패치가 거의 없고 가장 깨끗한 표면' },
    S: { level: '상급', surface: '일부 패치 허용' },
    BB: { level: '중급', surface: '패치와 옹이 허용' },
    CP: { level: '하급', surface: '더 많은 표면 결함 허용' }
  };
  return descriptions[String(grade || '').toUpperCase()] || { level: '', surface: '' };
}

function extractPlywoodSurfaceGrades(value) {
  const text = String(value || '');
  const supportedGrades = ['S/BB', 'B/BB', 'BB/BB', 'BB/CP', 'CP/BB', 'CP/CP'];
  const matches = [];
  const pattern = /(?:^|[^A-Z])(BB|CP|S|B)\s*\/\s*(BB|CP|S|B)(?=$|[^A-Z])/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const surfaceGrade = String(match[1]).toUpperCase() + '/' + String(match[2]).toUpperCase();
    if (supportedGrades.indexOf(surfaceGrade) !== -1) matches.push(surfaceGrade);
  }
  return matches;
}

function buildPlywoodGradeComparisonContext(data, knowledge) {
  const compareTarget = cleanEntityValue(data && data.compareTarget);
  const grades = extractPlywoodSurfaceGrades(compareTarget);
  const currentGrade = knowledge && knowledge.surfaceGrade || '';
  const hasListSeparator = /[,，、;]/.test(compareTarget) || compareTarget.indexOf('여러 등급') !== -1;
  const hasExplicitVs = /\s+VS\s+/i.test(compareTarget);
  let targetGrade = '';

  if (!hasListSeparator && currentGrade) {
    if (grades.length === 1 && grades[0] !== currentGrade) {
      targetGrade = grades[0];
    } else if (hasExplicitVs && grades.length === 2) {
      if (grades[0] === currentGrade && grades[1] !== currentGrade) targetGrade = grades[1];
      if (grades[1] === currentGrade && grades[0] !== currentGrade) targetGrade = grades[0];
    }
  }

  const targetParts = targetGrade.split('/');
  return {
    compareGrades: grades,
    hasMultipleGrades: hasListSeparator || grades.length > (hasExplicitVs ? 2 : 1),
    canCompareSurfaceGrade: targetGrade !== '',
    targetSurfaceGrade: targetGrade,
    targetFaceGrade: targetParts[0] || '',
    targetBackGrade: targetParts[1] || ''
  };
}

function buildProductKnowledgeContext(data) {
  const values = [
    data && data.category,
    data && data.productName,
    data && data.grade,
    data && data.maker,
    data && data.compareTarget,
    data && data.keyValue,
    data && data.source,
    data && data.structure,
    data && data.emphasis,
    data && data.use1,
    data && data.use2
  ];
  const label = values.map(function (value) { return String(value || ''); }).join(' ');
  const lowerLabel = label.toLowerCase();
  const productLabel = [data && data.category, data && data.productName]
    .map(function (value) { return String(value || ''); })
    .join(' ');
  const lowerProductLabel = productLabel.toLowerCase();
  const mdfEvidenceLabel = [
    data && data.productName,
    data && data.compareTarget,
    data && data.keyValue,
    data && data.structure,
    data && data.emphasis
  ].map(function (value) { return String(value || ''); }).join(' ').toLowerCase();
  const isPlywood = lowerProductLabel.indexOf('합판') !== -1 || lowerProductLabel.indexOf('plywood') !== -1;
  const isBirchPlywood = isPlywood && [
    '자작합판', '자작 합판', '자작나무합판', '자작나무 합판', 'birch plywood', 'birch ply'
  ].some(function (keyword) { return lowerProductLabel.indexOf(keyword) !== -1; });
  const isWaterResistantPlywood = isPlywood && [
    '내수합판', '내수 합판', '준내수합판', '준내수 합판', '방수합판', '방수 합판',
    'wbp', 'exterior glue', 'exterior bonded', '접착등급', '접착 등급', '사용환경 등급'
  ].some(function (keyword) { return lowerLabel.indexOf(keyword) !== -1; });
  const grade = parsePlywoodSurfaceGrade(data);
  const stockType = cleanEntityValue(data && data.stockType);
  const availableSurfaceGrades = [];
  [data && data.productName, data && data.grade].forEach(function (value) {
    extractPlywoodSurfaceGrades(value).forEach(function (surfaceGrade) {
      if (availableSurfaceGrades.indexOf(surfaceGrade) === -1) availableSurfaceGrades.push(surfaceGrade);
    });
  });
  if (availableSurfaceGrades.length < 2) {
    extractPlywoodSurfaceGrades(data && data.compareTarget).forEach(function (surfaceGrade) {
      if (availableSurfaceGrades.indexOf(surfaceGrade) === -1) availableSurfaceGrades.push(surfaceGrade);
    });
  }
  const birchGradeOrder = { B: 0, S: 1, BB: 2, CP: 3 };
  availableSurfaceGrades.sort(function (left, right) {
    const leftParts = left.split('/');
    const rightParts = right.split('/');
    return (birchGradeOrder[leftParts[0]] - birchGradeOrder[rightParts[0]]) ||
      (birchGradeOrder[leftParts[1]] - birchGradeOrder[rightParts[1]]);
  });
  const context = {
    productGroup: getFAQCategoryType(data),
    productType: isBirchPlywood ? 'BIRCH_PLYWOOD' : (isPlywood ? 'PLYWOOD' : 'DEFAULT'),
    manufacturer: cleanEntityValue(data && data.maker),
    compareTarget: cleanEntityValue(data && data.compareTarget),
    surfaceGrade: grade ? grade.surfaceGrade : '',
    faceGrade: grade ? grade.faceGrade : '',
    backGrade: grade ? grade.backGrade : '',
    hasAdhesiveEvidence: isWaterResistantPlywood,
    isBirchPlywood: isBirchPlywood,
    isWaterResistantPlywood: isWaterResistantPlywood,
    hasMdfInput: mdfEvidenceLabel.indexOf('mdf') !== -1 || mdfEvidenceLabel.indexOf('엠디에프') !== -1,
    stockType: stockType,
    availableSurfaceGrades: availableSurfaceGrades
  };
  context.faceGradeDescription = getCurrentSupplierBirchGradeDescription(context.faceGrade);
  context.backGradeDescription = getCurrentSupplierBirchGradeDescription(context.backGrade);
  const gradeComparison = buildPlywoodGradeComparisonContext(data, context);
  context.compareGrades = gradeComparison.compareGrades;
  context.hasMultipleCompareGrades = gradeComparison.hasMultipleGrades;
  context.canCompareSurfaceGrade = isBirchPlywood && gradeComparison.canCompareSurfaceGrade;
  context.targetSurfaceGrade = gradeComparison.targetSurfaceGrade;
  context.targetFaceGrade = gradeComparison.targetFaceGrade;
  context.targetBackGrade = gradeComparison.targetBackGrade;
  context.targetFaceGradeDescription = getCurrentSupplierBirchGradeDescription(context.targetFaceGrade);
  context.targetBackGradeDescription = getCurrentSupplierBirchGradeDescription(context.targetBackGrade);
  const isBirchInventoryStockType = stockType === '재고' || stockType === '일부재고';
  context.isBirchStockCompare = isBirchPlywood && isBirchInventoryStockType && context.surfaceGrade === 'S/BB' &&
    cleanEntityValue(data && data.compareTarget).indexOf('미송합판') !== -1;
  context.isBirchStockGuide = isBirchPlywood && isBirchInventoryStockType && context.surfaceGrade === 'S/BB' &&
    !context.isBirchStockCompare;
  context.isBirchOrderGradeGuide = isBirchPlywood && stockType === '주문재' && availableSurfaceGrades.length > 1;
  return context;
}

function buildBirchOrderGradeCardGuide(grades) {
  return (grades || []).map(function (surfaceGrade) {
    const parts = surfaceGrade.split('/');
    return '- ' + surfaceGrade + ' 카드: 앞면 ' + parts[0] + ' / 뒷면 ' + parts[1];
  }).join('\n');
}

function removeUnsupportedPlywoodAdhesiveText(value, context) {
  let text = String(value || '');
  if (!context || context.productGroup !== 'PLYWOOD') return text.trim();

  text = text
    .replace(/완전\s*방수|물에\s*절대\s*강\w*|외부\s*영구\s*사용\w*/g, '')
    .replace(/페놀(?:수지)?\s*접착제|요소(?:수지)?\s*접착제|멜라민(?:수지)?\s*접착제/gi, '접착 성능');

  if (context.hasAdhesiveEvidence) {
    text = text.replace(/접착\s*강도|접착\s*품질|접착\s*상태|접착\s*구조|접착층|접착부|접착제|본드층|Glue Line/gi, '내수성이 고려된 접착 성능');
  } else {
    text = text
      .replace(/(?:얇은\s*)?접착선(?:\s*\(\s*Glue Line\s*\))?/gi, '')
      .replace(/Glue Line/gi, '')
      .replace(/수지\s*접착층|본드층|접착층\s*확대|접착선\s*확대|접착부\s*균일성|접착\s*강도|접착\s*품질|접착\s*상태|접착\s*구조|접착층|접착부|접착제/gi, '')
      .replace(/\s*[,，、]\s*[,，、]+/g, ', ')
      .replace(/^[\s,，、]+|[\s,，、]+$/g, '');
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

function getProductKnowledgeStructure(data, context) {
  if (context && context.productGroup === 'PLYWOOD') {
    return '얇은 목재 단판을 여러 겹 적층한 판재';
  }
  return cleanEntityValue(data && data.structure);
}

function normalizePlywoodAutoFillContent(content, data) {
  const context = buildProductKnowledgeContext(data);
  if (context.productGroup !== 'PLYWOOD') return content;

  const next = Object.assign({}, content || {});
  ['keyValue', 'structure', 'emphasis', 'use1', 'use2'].forEach(function (key) {
    next[key] = removeUnsupportedPlywoodAdhesiveText(next[key], context);
  });
  next.structure = getProductKnowledgeStructure(data, context);

  if (context.isBirchPlywood) {
    next.keyValue = context.surfaceGrade
      ? '앞면·뒷면 표면 등급이 표시되는 자작합판'
      : '표면 상태를 확인하는 자작합판';
    next.emphasis = context.surfaceGrade
      ? context.faceGrade + ' 앞면과 ' + context.backGrade + ' 뒷면, 패치·필러 상태, 노출면과 규격 확인'
      : '앞·뒷면 표면 상태, 노출면, 규격 확인';
  }

  if (!cleanEntityValue(data && data.source)) {
    next.source = '';
  }

  if (parsePlywoodSurfaceGrade({ productName: next.grade })) {
    next.grade = '확인 필요';
  }

  return next;
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
  const knowledge = buildProductKnowledgeContext(data);
  const uses = uniqueCleanTerms([data.use1, data.use2]);
  const cautions = splitEntityTerms(removeCommerceRemedyGuidance(data.emphasis));
  const preorderChecks = [];

  if (cleanEntityValue(data.size)) preorderChecks.push('규격');
  if (cleanEntityValue(data.thickness)) preorderChecks.push('두께');
  if (uses.length > 0) preorderChecks.push('사용 위치');
  if (cautions.length > 0) preorderChecks.push('시공/재단 조건');

  return {
    productName: cleanEntityValue(data.productName),
    productGroup: productGroup,
    productType: knowledge.productType,
    productKnowledge: knowledge,
    keyValue: cleanEntityValue(removeCommerceRemedyGuidance(data.keyValue)),
    material: inferEntityMaterial(data, productGroup),
    structure: cleanEntityValue(removeCommerceRemedyGuidance(data.structure)),
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
  return limitAndUsage(removeCommerceRemedyGuidance(String(text || ''))
    .replace(/적층\s*구조\s*[.]\s*판재입니다[.]/g, '적층 구조의 판재입니다.')
    .replace(/구조\s*[.]\s*판재입니다[.]/g, '구조의 판재입니다.')
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

function removeCommerceRemedyGuidance(text) {
  const remedyPattern = /(?:교환|반품|환불|보상|클레임|무상\s*교체|판매처\s*문의|상담\s*후)|(?:^|[^A-Za-z])A\/?S(?:$|[^A-Za-z])/i;
  return String(text || '')
    .split(/(\n+|[^.!?\n]*[.!?])/)
    .filter(function (sentence) {
      return !remedyPattern.test(sentence);
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildGeneratedContentRemedyGuard(outputType) {
  if (outputType === 'image') {
    return '\n- 교환·반품·환불·보상·문의 등 판매 후 조치 문구를 생성하지 않는다.\n';
  }
  return `
판매 후 조치 문구 생성 금지:
- 상품 콘텐츠에서 판매 후 권리구제, 판매자 대응, 금전 처리 또는 이의 접수를 권장·요청·문의하도록 유도하지 않는다.
- 기준 미달이나 품질 불만을 이유로 판매처 조치를 권하는 문장 및 동일 의미의 유사 표현을 생성하지 않는다.
- 확인 필요, 표면 상태, 패치·필러, 옹이, 색상 편차를 판매 후 조치 안내로 연결하지 않는다.
- 패치·필러·옹이·색상 편차는 등급 허용 범위와 실제 제품 상태를 확인하는 중립 표현으로만 설명한다.
- 상품 하자 여부나 소비자 권리를 축소하거나 법적 판매 정책을 새로 만들지 않는다.
- 금지 문장을 삭제한 공간은 다른 문장으로 채우지 않는다.
`;
}

function filterAISummaryText(text) {
  return cleanHumanWritingText(text);
}

function getHumanExpressionDictionary(productGroup) {
  const dictionaries = {
    PLYWOOD: {
      summaryDefinition: function (name) { return name + getSubjectParticle(name) + ' 얇은 목재 단판을 여러 겹 적층한 판재입니다.'; },
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
  const knowledge = entity.productKnowledge || {};

  if (knowledge.isBirchPlywood) {
    summary.push('자작합판은 얇은 목재 단판을 여러 겹 적층한 판재입니다.');
    if (uses.length > 0) {
      summary.push(buildNaturalUseList(uses) + '에 사용하는 판재입니다.');
    }
    summary.push('주문 전에는 규격과 노출면으로 사용할 면을 확인합니다.');
    return summary.map(filterAISummaryText).filter(function (text) { return text !== ''; }).slice(0, 3);
  }

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
    PLYWOOD: '재단이 필요한 경우 규격과 작업 방향을 확인하세요.',
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

function buildProductSpecificFAQItems(entity) {
  const productName = cleanEntityValue(entity && entity.productName);
  const compareTarget = cleanEntityValue(entity && entity.compareProduct);
  const knowledge = entity && entity.productKnowledge || {};
  function items(firstQuestion, firstAnswer, secondQuestion, secondAnswer, thirdQuestion, thirdAnswer) {
    return [
      { question: firstQuestion, answer: firstAnswer },
      { question: secondQuestion, answer: secondAnswer },
      { question: thirdQuestion, answer: thirdAnswer }
    ].map(function (item) {
      return {
        question: cleanHumanWritingText(item.question),
        answer: cleanHumanWritingText(item.answer)
      };
    });
  }

  if (isUvCoatedBirchFinishCompare({ productName: productName, compareTarget: compareTarget })) {
    return items(
      'UV 하도와 UV 상도는 무엇이 다른가요?',
      'UV 하도는 후속 도장이나 추가 마감을 위한 바탕 단계이고, UV 상도는 표면 보호를 위한 최종 마감 단계입니다.',
      'UV 하도 제품은 언제 선택하나요?',
      '후속 도장이나 추가 마감 작업을 계획한 경우 바탕 단계로 선택합니다.',
      'UV 상도 제품은 추가 마감 없이 사용할 수 있나요?',
      'UV 상도는 최종 UV 마감이 완료된 상태로 사용하는 제품입니다. 방수나 절대적인 내구성 보장을 뜻하지는 않습니다.'
    );
  }

  if (/오징어합판|아로합판/.test(productName)) {
    return items(
      '오징어합판(아로합판)은 어디에 사용하나요?',
      '라운드 카운터 벽면, 곡선 기둥 감싸기 등 곡면을 구현하는 작업에 사용합니다.',
      '오징어합판은 왜 곡면 시공이 가능한가요?',
      '얇은 단판을 휘어질 수 있는 방향으로 배열한 유연한 구조여서 곡면 형태에 맞춰 시공할 수 있습니다.',
      '오징어합판은 일반합판과 무엇이 다른가요?',
      '일반합판보다 특정 방향으로 휘어지는 구조에 초점을 둔 판재로, 곡면 벽체와 라운드 가구 제작에 사용합니다.'
    );
  }

  if (knowledge.isBirchPlywood && knowledge.surfaceGrade) {
    if (knowledge.isBirchOrderGradeGuide || (knowledge.availableSurfaceGrades || []).length > 1) {
      return items(
        'B/BB, BB/BB, CP/BB는 무엇을 뜻하나요?',
        '슬래시 앞은 앞면, 뒤는 뒷면의 표면 등급을 뜻하며 각 표기는 앞면과 뒷면의 조합입니다.',
        '자작합판 주문 등급별 표면 차이는 무엇인가요?',
        '현재 상품·공급사 기준으로 B, S, BB, CP 순서의 표면 상태와 허용되는 패치·옹이·색상 편차가 다릅니다.',
        '표면 등급이 합판의 강도 차이를 뜻하나요?',
        '표면 등급은 외관과 허용 결함 기준이며 구조 강도와는 별도로 확인해야 합니다.'
      );
    }
    return items(
      knowledge.surfaceGrade + '는 무엇을 뜻하나요?',
      knowledge.surfaceGrade + '는 현재 상품·공급사 기준으로 앞면 ' + knowledge.faceGrade + ', 뒷면 ' + knowledge.backGrade + '의 표면 등급 조합을 뜻합니다.',
      '표면의 패치나 필러는 불량인가요?',
      '패치와 필러는 표면 등급에서 허용될 수 있는 보수 흔적입니다. 실제 허용 범위는 상품·공급사 기준과 입고 상태를 함께 확인합니다.',
      '표면 등급이 높으면 합판의 강도도 더 높은가요?',
      '표면 등급은 외관과 허용 결함 기준이며 구조 강도와는 별도로 확인해야 합니다.'
    );
  }

  if (/내수\s*합판/.test(productName)) {
    return items(
      '내수합판은 일반합판과 무엇이 다른가요?',
      '내수합판은 습기가 있는 환경을 고려한 접착 성능을 적용한 합판입니다.',
      '내수합판은 어떤 공간에 사용하나요?',
      '주방 가구나 욕실 주변처럼 습기 노출을 고려해야 하는 공간에 사용합니다.',
      '내수합판은 방수합판인가요?',
      '내수 접착 성능을 고려한 제품이지만 물에 직접 노출되는 완전 방수 자재로 단정할 수는 없습니다.'
    );
  }

  if (/일반합판/.test(productName)) {
    return items(
      '일반합판은 어디에 사용하나요?',
      '가구 심재, 벽체와 천장 바탕재, 인테리어 제작 등에 사용합니다.',
      '동남아산과 베트남산 일반합판은 어떤 차이가 있나요?',
      '적층 구조는 같으며 제품별 단판 균일성, 표면 상태와 외관 편차에서 차이가 나타날 수 있습니다.',
      '노출 마감용 일반합판은 무엇이 중요한가요?',
      '노출할 면의 표면 상태와 외관 편차가 마감 목적에 맞는지 판단하는 것이 중요합니다.'
    );
  }

  if (/미송합판/.test(productName)) {
    return items(
      '미송합판은 어떤 표면이 특징인가요?',
      '자연스러운 목재 결과 색감이 드러나는 표면이 특징입니다.',
      '미송합판 유절과 무절은 무엇이 다른가요?',
      '유절은 옹이가 드러나는 자연스러운 표면이고, 무절은 큰 옹이를 줄인 비교적 깨끗한 표면입니다.',
      '미송합판은 어떤 마감에 사용하나요?',
      '목재 결과 표면을 살리는 벽체 패널, 가구 전면과 인테리어 알판 등에 사용합니다.'
    );
  }

  if (/태고합판/.test(productName)) {
    return items(
      '태고합판은 어떤 합판인가요?',
      '합판 표면에 필름을 적용해 거푸집 작업에 사용하는 판재입니다.',
      '태고합판과 내수합판은 무엇이 다른가요?',
      '태고합판은 표면 필름과 거푸집 용도가 핵심이고, 내수합판은 습기 환경을 고려한 접착 성능이 핵심입니다.',
      '태고합판은 어디에 사용하나요?',
      '건축 거푸집과 외부 가설 작업에 사용합니다.'
    );
  }

  if (/코아합판/.test(productName)) {
    return items(
      '코아합판은 어떤 구조인가요?',
      '중심 블록 코어 양면에 단판을 붙인 구조의 판재입니다.',
      '코아합판은 일반합판과 무엇이 다른가요?',
      '얇은 단판을 여러 겹 적층한 일반합판과 달리 중심부에 블록 코어가 있습니다.',
      '코아합판은 어떤 제작에 사용하나요?',
      '붙박이장 긴 선반이나 신발장 문짝처럼 넓고 긴 부재 제작에 사용합니다.'
    );
  }

  if (/미장합판/.test(productName)) {
    return items(
      '미장합판은 어떤 합판인가요?',
      '일반 합판 바탕에 천연 무늬목을 적용해 표면 질감을 살린 마감용 합판입니다.',
      '미장합판은 일반합판과 무엇이 다른가요?',
      '구조용 바탕에 주로 쓰는 일반합판과 달리 천연 무늬목 표면을 노출 마감에 활용합니다.',
      '미장합판은 어디에 사용하나요?',
      '인테리어 알판이나 벽체처럼 목재 표면을 드러내는 마감에 사용합니다.'
    );
  }

  if (/코팅\s*합판/.test(productName)) {
    return items(
      '코팅합판은 어떤 판재인가요?',
      '합판 표면에 마감 필름을 적용해 별도 표면 작업을 줄인 판재입니다.',
      '백색 코팅합판과 MDF는 무엇이 다른가요?',
      '백색 코팅합판은 합판 바탕에 마감 필름을 적용하고, MDF는 목재 섬유를 압축한 판재입니다.',
      '백색 코팅합판은 어디에 사용하나요?',
      '가구 내부 박스와 서랍 내부재처럼 백색 마감면이 필요한 곳에 사용합니다.'
    );
  }

  if (/낙엽송\s*합판/.test(productName)) {
    return items(
      '낙엽송 엠보합판은 어떤 표면이 특징인가요?',
      '낙엽송의 선명한 나뭇결을 브러싱해 입체감을 살린 표면이 특징입니다.',
      '낙엽송합판과 미송합판은 무엇이 다른가요?',
      '낙엽송 엠보합판은 입체적인 결 표현이 중심이고, 미송합판은 자연스러운 목재 결과 옹이 표현이 중심입니다.',
      '낙엽송 엠보합판은 어디에 사용하나요?',
      '아트월이나 상가 카운터 전면처럼 나뭇결을 강조하는 마감에 사용합니다.'
    );
  }

  if (/^MDF$/i.test(productName)) {
    return items(
      'MDF는 무엇인가요?',
      'MDF는 목재 섬유를 고르게 압축해 만든 판재입니다.',
      'MDF와 PB는 무엇이 다른가요?',
      'MDF는 목재 섬유를 압축한 균일한 판재이고, PB는 목재 칩을 압착한 판재입니다.',
      'MDF는 도장·필름 작업에 어떻게 활용하나요?',
      '균일한 표면과 가공성을 활용해 가구 도장이나 필름 래핑 바탕으로 사용합니다.'
    );
  }

  if (/OSB/i.test(productName)) {
    return items(
      'OSB는 어떤 판재인가요?',
      '직사각형 목재 스트랜드를 방향성 있게 배열해 성형한 판재입니다.',
      'OSB 내장용과 외장용은 무엇이 다른가요?',
      '사용 환경 구분이 다르므로 제품에 표시된 내장용·외장용 용도를 기준으로 선택합니다.',
      '내장용 OSB는 어디에 사용하나요?',
      '목조주택 벽체 바탕이나 목재 조각 질감을 살린 실내 벽면에 사용합니다.'
    );
  }

  if (/CRC\s*보드/i.test(productName)) {
    return items(
      'CRC보드는 어떤 판재인가요?',
      '시멘트계 바탕과 섬유 보강 구조를 사용하는 건식 판재입니다.',
      'CRC보드와 석고보드는 무엇이 다른가요?',
      'CRC보드는 시멘트계 판재이고 석고보드는 석고 코어를 원지로 감싼 판재로, 재료와 가공 특성이 다릅니다.',
      'CRC보드는 어디에 사용하나요?',
      '벽체와 칸막이, 천장 바탕 시공에 사용합니다.'
    );
  }

  if (/이보드/.test(productName)) {
    return items(
      '이보드는 어떤 단열재인가요?',
      '압출법 단열재 위에 PP 중공 구조판을 결합한 복합 단열 보드입니다.',
      '이보드 도배용과 페인트용은 무엇이 다른가요?',
      '후속 마감 방식에 맞춰 표면 사양이 구분되며 도배 또는 페인트 작업 목적에 맞게 선택합니다.',
      '이보드는 어떤 작업에 사용하나요?',
      '결로가 발생하기 쉬운 벽면이나 베란다 확장부의 내단열과 후속 마감 바탕에 사용합니다.'
    );
  }

  if (/GCS\s*보드/i.test(productName)) {
    return items(
      'GCS보드는 어떤 제품인가요?',
      '단열재 위에 시멘트계 보드를 결합한 복합 내단열 보드입니다.',
      'GCS보드와 이보드는 무엇이 다른가요?',
      'GCS보드는 시멘트계 표면 보드를, 이보드는 PP 중공 구조판을 결합한 제품으로 표면 구성과 마감 방식이 다릅니다.',
      'GCS보드는 어떤 공간에 사용하나요?',
      '복도나 대피공간 등 내단열과 보드 마감이 함께 필요한 공간에 사용합니다.'
    );
  }

  if (/뉴송\s*각재/.test(productName)) {
    return items(
      '뉴송 각재는 어디에 사용하나요?',
      '건축 가설재와 팔레트·포장재 등 하중을 받는 목재 부재로 사용합니다.',
      '뉴송 각재와 소송 각재는 무엇이 다른가요?',
      '수종에 따른 조직과 무게, 표면 상태가 다르므로 실제 사용 목적과 규격에 맞춰 구분합니다.',
      '뉴송 각재는 어떤 작업에 적합한가요?',
      '가설 구조나 중량물 패킹처럼 단면 규격과 지지 역할이 중요한 작업에 사용합니다.'
    );
  }

  if (/구조재/.test(productName)) {
    return items(
      '마감용 구조재는 어떤 목재인가요?',
      '4면 대패와 모서리 가공을 적용해 구조 역할과 노출 마감을 함께 고려한 목재입니다.',
      '골조용과 마감용 구조재는 무엇이 다른가요?',
      '마감용은 노출되는 표면과 모서리 가공을 함께 고려하고, 골조용은 구조 시공 목적이 중심입니다.',
      '마감용 구조재는 어디에 사용하나요?',
      '중목구조나 노출 천장 보처럼 구조재 표면이 보이는 위치에 사용합니다.'
    );
  }

  if (/방부목/.test(productName)) {
    return items(
      '방부목은 일반 목재와 무엇이 다른가요?',
      '외부의 수분과 해충 노출을 고려해 방부 처리를 적용한 목재입니다.',
      '방부목과 합성목재는 무엇이 다른가요?',
      '방부목은 처리한 천연 목재이고 합성목재는 목분과 수지 등을 조합한 재료로, 재료 구성과 표면 특성이 다릅니다.',
      '방부목은 어디에 사용하나요?',
      '외부 데크 바닥과 야외 울타리처럼 외기에 노출되는 목재 시공에 사용합니다.'
    );
  }

  if (/집성판|집성목/.test(productName)) {
    return items(
      '집성판은 어떻게 만든 목재인가요?',
      '여러 목재 부재를 폭 방향으로 접합해 넓은 판재로 만든 목재입니다.',
      '원목과 집성판은 무엇이 다른가요?',
      '원목은 하나의 목재에서 얻은 재료이고 집성판은 여러 목재 부재를 접합해 필요한 폭으로 만든 판재입니다.',
      '집성판은 어떤 제작에 사용하나요?',
      '가구, 선반, 테이블 상판, 계단재와 인테리어 마감 제작에 사용합니다.'
    );
  }

  if (/방수\s*석고보드/.test(productName)) {
    return items(
      '방수석고보드는 일반석고보드와 무엇이 다른가요?',
      '석고 코어와 표면에 습기 대응 처리를 적용해 일반석고보드보다 습한 공간을 고려한 제품입니다.',
      '방수석고보드는 어떤 공간에 사용하나요?',
      '욕실 벽체의 타일 바탕이나 주방 싱크대 배면처럼 습기 노출을 고려하는 곳에 사용합니다.',
      '방수석고보드는 완전 방수 자재인가요?',
      '습기 대응용 석고보드이며 지속적인 침수에 사용하는 완전 방수 자재로 단정할 수는 없습니다.'
    );
  }

  if (/방화\s*석고보드/.test(productName)) {
    return items(
      '방화석고보드는 일반석고보드와 무엇이 다른가요?',
      '고온 환경에서 형상 유지를 돕는 보강 구조와 내화 재료를 적용한 석고보드입니다.',
      '방화석고보드는 어디에 사용하나요?',
      '방화 구획 벽체, 엘리베이터 홀과 세대 간 경계벽 등 방화 성능이 요구되는 구조에 사용합니다.',
      '방화석고보드만 사용하면 방화벽이 완성되나요?',
      '방화 성능은 보드 한 장만이 아니라 벽체 구성, 두께, 겹 수, 고정과 이음부 시공 조건을 함께 확인해야 합니다.'
    );
  }

  if (/차음\s*석고보드/.test(productName)) {
    return items(
      '차음석고보드는 어떤 제품인가요?',
      '일반석고보드보다 밀도가 높은 석고 코어를 적용해 차음 벽체 구성에 사용하는 보드입니다.',
      '차음석고보드와 일반석고보드는 무엇이 다른가요?',
      '차음석고보드는 소음 전달을 줄이는 벽체 구성을 고려한 고밀도 제품이고 일반석고보드는 일반 벽체와 천장 바탕용입니다.',
      '차음석고보드는 어디에 사용하나요?',
      '세대 간 경계벽이나 회의실 칸막이처럼 소음 전달을 고려하는 벽체에 사용합니다.'
    );
  }

  if (/석고텍스/.test(productName)) {
    return items(
      '석고텍스는 어떤 천장재인가요?',
      '전면 패턴과 뒷면 고정용 구조를 갖춰 천장 마감면으로 사용하는 석고계 텍스입니다.',
      '석고텍스와 석고보드는 무엇이 다른가요?',
      '석고텍스는 노출 천장 마감용이고 석고보드는 벽체와 천장의 바탕 시공에 주로 사용합니다.',
      '석고텍스는 어디에 사용하나요?',
      '사무실, 학교와 학원 등의 천장 마감에 사용합니다.'
    );
  }

  if (/일반\s*석고보드/.test(productName)) {
    return items(
      '일반석고보드는 어디에 사용하나요?',
      '사무실 벽체와 아파트 천장 등 건식 벽체·천장 바탕에 사용합니다.',
      '일반석고보드와 방수석고보드는 무엇이 다른가요?',
      '일반석고보드는 건조한 실내 바탕용이고 방수석고보드는 습기 노출을 고려한 처리를 적용한 제품입니다.',
      '일반석고보드를 습기가 있는 공간에 사용해도 되나요?',
      '일반석고보드는 건조한 실내가 기본이며 습기 노출이 예상되면 해당 환경에 맞는 석고보드를 선택합니다.'
    );
  }

  if (/PF\s*보드/i.test(productName)) {
    return items(
      'PF보드는 어떤 단열재인가요?',
      '페놀수지 발포층에 면재를 더한 보드형 단열재입니다.',
      'PF보드와 XPS는 무엇이 다른가요?',
      'PF보드는 페놀수지 발포 코어를, XPS는 압출 성형한 독립기포 폴리스티렌 구조를 사용하는 단열재입니다.',
      'PF보드는 어떤 단열 시공에 사용하나요?',
      '외벽과 바닥, 기초 단열처럼 보드 규격과 접합부 처리를 함께 고려하는 시공에 사용합니다.'
    );
  }

  if (/아이소핑크|XPS/i.test(productName)) {
    return items(
      '아이소핑크(XPS)는 어떤 단열재인가요?',
      '독립기포 구조를 가진 압출법 폴리스티렌 보온판입니다.',
      'XPS와 EPS는 무엇이 다른가요?',
      'XPS는 압출 성형한 연속 독립기포 구조이고 EPS는 발포 비드를 성형한 구조로 제조 방식과 내부 조직이 다릅니다.',
      '아이소핑크는 어디에 사용하나요?',
      '바닥 난방 하부나 지하층 외벽처럼 단열과 하중 조건을 함께 고려하는 위치에 사용합니다.'
    );
  }

  if (/그라스울|글라스울/.test(productName)) {
    return items(
      '글라스울은 어떤 단열재인가요?',
      '유리 원료를 섬유화해 매트 형태로 만든 흡음·단열재입니다.',
      '글라스울과 스카이비바는 무엇이 다른가요?',
      '두 제품은 원료와 섬유 구조, 밀도와 적용 부위가 다를 수 있으므로 각 제품의 명시된 사양을 기준으로 비교합니다.',
      '글라스울은 어디에 사용하나요?',
      '경량철골 칸막이 내부나 샌드위치 패널 심재처럼 빈 공간을 채우는 단열·흡음 용도에 사용합니다.'
    );
  }

  if (/열반사\s*단열재/.test(productName)) {
    return items(
      '열반사 단열재는 어떤 제품인가요?',
      '알루미늄 호일과 발포 폴리에틸렌층을 조합해 복사열 반사를 고려한 얇은 단열재입니다.',
      '열반사 단열재는 보드형 단열재와 무엇이 다른가요?',
      '두꺼운 발포 코어로 열전달을 줄이는 보드형 단열재와 달리 얇은 반사층과 공기층 조건을 활용합니다.',
      '열반사 단열재는 어디에 사용하나요?',
      '리모델링 외벽 틈새나 구조 코너처럼 시공 공간이 제한된 위치에 사용합니다.'
    );
  }

  return [];
}

function buildProductGroupFAQItems(entity, notes) {
  const productGroup = entity && entity.productGroup;
  const productName = cleanEntityValue(entity && entity.productName) || '이 제품';
  const knowledge = entity && entity.productKnowledge || {};
  const productSpecificItems = buildProductSpecificFAQItems(entity);
  if (productSpecificItems.length > 0) return productSpecificItems;

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

  if (productGroup === 'PLYWOOD' && !knowledge.hasMdfInput) {
    itemsByGroup.PLYWOOD = itemsByGroup.PLYWOOD.filter(function (item) {
      return item.question.indexOf('MDF') === -1;
    });
    itemsByGroup.PLYWOOD.push({
      question: '재단 전에 무엇을 확인해야 하나요?',
      answer: '앞·뒷면 표면 상태와 노출면을 확인하고, 재단이 필요한 경우 규격과 작업 방향을 확인하세요.'
    });
  }

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
  const productKnowledge = buildProductKnowledgeContext(data);
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
      name: productKnowledge.isBirchPlywood && extractPlywoodSurfaceGrades(data.grade).length > 0 ? '표면 등급' : '성능·인증',
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
  const knowledge = buildProductKnowledgeContext(data);
  const facts = [];
  if (knowledge.isBirchPlywood) {
    facts.push('제품 지식: 얇은 목재 단판을 여러 겹 적층한 자작합판');
    if (knowledge.surfaceGrade) {
      facts.push('표면 등급: 앞면 ' + knowledge.faceGrade + ', 뒷면 ' + knowledge.backGrade);
    }
    facts.push('확인사항: 앞·뒷면 표면 상태, 노출면, 패치·필러 상태, 규격');
  }
  return facts.concat([
    getProductKnowledgeStructure(data, knowledge) ? '구조: ' + removeCommerceRemedyGuidance(getProductKnowledgeStructure(data, knowledge)) : '',
    data.keyValue ? '핵심 구조 표현: ' + removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge)) : '',
    data.use1 ? '현장 사용 정보: ' + data.use1 : '',
    data.use2 ? '현장 사용 정보: ' + data.use2 : '',
    data.emphasis ? '입력 강조 정보: ' + removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.emphasis, knowledge)) : '',
    data.source ? '제조사 자료 출처: ' + data.source : ''
  ]).filter(function (text) { return text && String(text).trim() !== ''; });
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
  const knowledge = buildProductKnowledgeContext(data);
  const cleanStructure = cleanNoteSource(getProductKnowledgeStructure(data, knowledge));
  const cleanUse1 = cleanNoteSource(data.use1);
  const cleanUse2 = cleanNoteSource(data.use2);
  const cleanEmphasis = cleanNoteSource(removeUnsupportedPlywoodAdhesiveText(data.emphasis, knowledge));

  if (knowledge.isBirchPlywood) {
    notes.push('노출 마감은 사용할 면의 실제 표면 상태를 먼저 확인합니다.');
    notes.push('패치·필러는 해당 등급에서 허용되는 보수 흔적일 수 있으며 실제 표면 상태를 함께 확인합니다.');
    notes.push('재단이 필요한 경우에는 사용할 규격과 재단 치수를 먼저 확인합니다.');
    return notes;
  }

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
  let prompt = null;
  if (data.type === 'A') prompt = buildTypeAPrompt(data);
  if (data.type === 'B') prompt = buildTypeBPrompt(data);
  if (data.type === 'C') prompt = buildTypeCPrompt(data);
  const outputType = buildProductKnowledgeContext(data).productGroup === 'PLYWOOD' ? 'image' : '';
  return prompt ? prompt + buildGeneratedContentRemedyGuard(outputType) : null;
}

function isUvCoatedBirchFinishCompare(data) {
  const productName = String(data && data.productName || '');
  const compareTarget = String(data && data.compareTarget || '');
  return /UV\s*코팅\s*자작(?:나무)?합판/i.test(productName) &&
    /UV/i.test(compareTarget) &&
    compareTarget.indexOf('상도') !== -1 &&
    compareTarget.indexOf('하도') !== -1;
}

function buildInfographicStructureGuide(data) {
  const guide = buildProductCategoryGuide(data);
  const knowledge = buildProductKnowledgeContext(data);
  if (isUvCoatedBirchFinishCompare(data)) {
    return `
UV 코팅 자작합판 전용 가이드:
- 제품 정체성은 자작합판 원판에 UV 코팅 공정을 적용한 판재이다.
- 공정 순서는 "원판 → 샌딩 → UV 하도 → UV 상도"로 고정한다.
- UV 하도는 최종 마감 전의 바탕 단계, UV 상도는 표면 보호를 위한 최종 마감 단계로 구분한다.
- 하도와 상도를 광택 차이만으로 비교하지 않고 공정 단계, 마감 완료 여부, 후속 작업 필요 여부를 시각화한다.
- S/BB·B/BB 등 표면 등급, 앞면·뒷면 등급 카드, 일반 합판 단면 확대, 접착층 확대를 생성하지 않는다.
- 상도를 두꺼운 투명막처럼 과장하거나 하도를 미완성 불량품처럼 표현하지 않는다.
- 방수·완전 방수·긁힘 방지·스크래치 완전 차단·오염 방지·내구성 보장·구조 강도 우위 표현을 생성하지 않는다.
`;
  }
  const forbiddenKeywords = knowledge.hasAdhesiveEvidence
    ? guide.forbiddenKeywords.filter(function (keyword) {
        return ['접착제', '접착층', '접착부', 'Glue Line', '본드층'].indexOf(keyword) === -1;
      })
    : guide.forbiddenKeywords;
  if (knowledge.productGroup === 'PLYWOOD') {
    const adhesiveRule = knowledge.hasAdhesiveEvidence
      ? '- 내수·준내수 또는 공식 접착등급 근거가 있으므로 "내수성이 고려된 접착 성능" 수준만 보조 설명할 수 있다. 완전 방수, 수지명, 외부 영구 사용은 생성하지 않는다.'
      : '- 접착 성능 근거가 없으므로 접착제·접착층·접착부·Glue Line·본드층·접착선의 생성·비교·확대뷰를 금지한다.';
    const isKnotlessPineCompare = knowledge.isBirchStockCompare &&
      /미송합판\s*\(\s*무절\s*\)/.test(String(data.compareTarget || ''));
    const birchOperationRule = knowledge.isBirchStockCompare
      ? `- 이 재고 상품은 자작합판 S/BB와 실제 compareTarget인 미송합판을 비교한다.
- 자작합판 카드 안에 앞면 S·뒷면 BB 정보를 보조 표시하고 임의 자작합판 등급 비교는 생성하지 않는다.
${isKnotlessPineCompare
  ? '- 미송합판(무절)은 큰 옹이 없이 자연스러운 미송 결·약한 색상 변화를 유지하고, 자작합판 S보다 덜 균일하지만 일반 미송합판보다 깨끗하게 표현한다.'
  : '- 미송합판은 실제 입력 범위에서 미송 단판 적층, 목재 결·옹이, 다른 표면 색감·무늬만 표현한다.'}`
      : knowledge.isBirchStockGuide
      ? `- 이 재고 상품은 S/BB 단일 설명형으로 구성하고 VS를 생성하지 않는다.
- S 앞면은 BB 뒷면보다 깨끗하게, BB는 CP 수준으로 과장하지 말고 표현한다.
- 노출면은 S면을 우선 확인하며 실제 표면 상태는 입고 제품 기준으로 확인한다.`
      : knowledge.isBirchOrderGradeGuide
        ? `- 이 주문재 상품은 복수 등급 안내형으로 구성하고 등급 목록을 한쪽 VS 대상으로 묶지 않는다.
- 각 복합 등급을 독립 카드로 나누고 앞면·뒷면을 각각 표시한다.
${buildBirchOrderGradeCardGuide(knowledge.availableSurfaceGrades)}
- 같은 BB면은 모든 카드에서 동일한 표면 품질로 표현한다.`
        : '';
    const birchSurfaceRule = knowledge.isBirchOrderGradeGuide
      ? `- 현재 상품/공급사 기준은 B > S > BB > CP이며 다른 제조사의 공통 기준으로 일반화하지 않는다.
- 시각 기준: B는 가장 깨끗하고 균일한 표면, S는 B보다 일부 패치·작은 옹이·색상 편차 허용, BB는 S보다 패치·작은 옹이·필러 흔적·색상 편차가 한눈에 더 보이는 일반 표면, CP는 BB보다 표면 보수·옹이·색상 편차가 더 보이는 표면이다.
- CP도 구조적 파손처럼 표현하지 않는다.`
      : `- 현재 상품/공급사 기준으로 감지된 앞면·뒷면 등급만 설명하고 다른 등급 목록을 생성하지 않는다.`;
    const birchRule = knowledge.isBirchPlywood
      ? `- 복합 표면 등급 "${knowledge.surfaceGrade || '확인 근거 없음'}"은 슬래시 앞을 앞면, 뒤를 뒷면 등급으로만 해석한다.
${birchSurfaceRule}
- 표면 등급을 강도·내구성·구조 성능과 연결하지 않으며 패치 개수·크기·직경을 추정하지 않는다.
${birchOperationRule}`
      : '';
    return `
합판 전용 구조 가이드:
- 제품명: ${data.productName}
- 비교 대상: ${data.compareTarget || '없음'}
- 실제 구조: ${getProductKnowledgeStructure(data, knowledge)}
- 얇은 목재 단판을 여러 겹 적층한 판재로 표현한다.
- 앞면, 뒷면, 측면 적층 단면만 시각화한다.
- 확대뷰는 단판 레이어와 앞·뒷면 표면 중 현재 레이아웃에 필요한 항목만 사용한다.
- 단판 방향 화살표, 층별 방향 비교, 결 방향 카드·아이콘을 생성하지 않는다.
${birchRule}
${adhesiveRule}
- 현재 합판 외 제품 이미지·구조·아이콘과 생활습관·건강 등 무관한 인포그래픽을 생성하지 않는다. Product Fidelity를 유지한다.
- 입력에 없는 수종·등급·강도·내구성·성능·인증·수치·구조와 우열 비교를 생성하지 않는다.
- 색상명은 이미지 라벨로 출력하지 않는다.
- 최종 확인: 현재 상품, 레이아웃, 고정 문구, 구조가 모두 일치하지 않으면 잘못된 요소를 제거한다.
`;
  }
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
- forbiddenKeywords: ${forbiddenKeywords.join(', ') || '없음'}
- productType: ${knowledge.productType}
- surfaceGrade: ${knowledge.surfaceGrade || '확인 근거 없음'}
- faceGrade: ${knowledge.faceGrade || '확인 근거 없음'}
- backGrade: ${knowledge.backGrade || '확인 근거 없음'}
- hasAdhesiveEvidence: ${knowledge.hasAdhesiveEvidence}

제품군별 고정 레이아웃 템플릿:
- 합판: 비교 → 핵심 구조 → 적층 단면 → 비교 포인트.
- 집성판: 비교 → 목재 무늬 비교 → 목재 스트립 구조 → 집성 접합 방식.
- MDF: 비교 → 섬유 압축 구조 → 단면 → 가공 특성.
- PB / 파티클보드: 우드칩 구조 → 단면 → 체결 특성.
- 석고보드: 석고코어 → 원지 구조 → 시공 포인트.
- CRC / 시멘트보드 / 섬유시멘트보드: 섬유시멘트 구조 → 단면 → 절단/시공.
- 단열재: 제품 비교 → 레이어 구조 → 열 흐름 → 시공 포인트.
- 이보드: XPS 단열 코어 → 표면 질감 비교 → 결합 구조.
- 제품군이 무엇이든 정보 우선순위는 구조 > 비교 > 수치 순서다.
- 수치가 부족하면 수치 영역을 억지로 만들지 말고 구조, 재질, 비교, 아이콘으로 채운다.

INFOGRAPHIC_STRUCTURE_LIBRARY:
- PLYWOOD: 단판 적층(Veneer Layers) 단면. 얇은 단판 레이어 / 교차 방향 / 앞면 / 뒷면 / 측면 적층 단면만 표현한다. 블록코어, 집성코어, 집성 목재 코어는 표현하지 않는다.
- SOLID_PANEL: 솔리드 목재 스트립 집성 단면. 폭 방향 목재 스트립 접합만 표현하고 핑거조인트는 표현하지 않는다.
- FINGER_JOINT_PANEL: 핑거조인트 목재 스트립 집성 단면. 목재 스트립 / 집성 접합부 / 핑거조인트만 표현하고 합판식 단판 적층은 표현하지 않는다.
- SIDE_FINGER_PANEL: 측면 핑거 접합 구조. 측면 접합부 중심으로 표현하고 상판 전체 톱니 패턴은 금지한다.
- TOP_FINGER_PANEL: 상판 또는 길이 방향 핑거 접합 구조. 상판 면에서 핑거조인트가 보이는 구조로 표현한다.
- MDF: 목재 섬유 압축 단면. 균일한 섬유 조직으로 표현한다.
- PB: 우드칩 압축 단면. 칩 입자 / 압축 코어로 표현한다.
- GYPSUM_BOARD: 원지 / 석고 코어 / 원지 구조로 표현한다.
- CEMENT_BOARD: 시멘트 매트릭스 / 섬유 보강 / 압축 보드로 표현한다.
- PF_BOARD: 면재 / PF 폼 코어 / 면재 구조로 표현한다.
- EBOARD: 흰색 또는 연회색 표면 마감층 → 연회색 상부 PP 중공 구조판(약 3T) → 옅은 핑크 계열 XPS 코어 순서다. PP층은 표면 바로 아래 한쪽에만 두고 XPS 코어 하부에는 생성하지 않는다.
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
- 이보드는 EBOARD만 사용한다.
- XPS는 XPS만 사용한다.
- EPS는 EPS만 사용한다.
- 글라스울은 GLASS_WOOL만 사용한다.
- 미네랄울 / 암면은 MINERAL_WOOL만 사용한다.
- PIR / 우레탄폼은 PIR_URETHANE만 사용한다.
- 열반사 단열재는 REFLECTIVE_INSULATION만 사용한다.
- 데크재는 DECK_BOARD만 사용한다.

제품군별 고정 아이콘 규칙:
- 합판: 교차 적층 아이콘, 단판 레이어 아이콘, 앞면·뒷면 아이콘.
- 솔리드 집성판 / 집성목 / 집성판: 목재 스트립 아이콘, 목재 결 방향 아이콘, 폭 방향 집성 접합부 아이콘.
- 핑거조인트 집성판: 목재 스트립 아이콘, 핑거조인트 아이콘, 집성 접합부 아이콘.
- 사이드핑거 집성판: 목재 스트립 아이콘, 측면 핑거조인트 아이콘, 집성 접합부 아이콘.
- 탑핑거 집성판: 목재 스트립 아이콘, 상판 핑거조인트 아이콘, 길이 방향 집성 접합부 아이콘.
- MDF: 목재섬유 아이콘, 압축 코어 아이콘, 가공 아이콘.
- PB / 파티클보드: Wood Chip 아이콘, Pressed Core 아이콘, 체결 위치 아이콘.
- 석고보드: Paper 아이콘, Gypsum Core 아이콘, 이음부 아이콘.
- CRC / 시멘트보드 / 섬유시멘트보드: Cement Matrix 아이콘, Fiber Reinforcement 아이콘, 절단면 아이콘.
- PF보드: Facing 아이콘, PF Foam Core 아이콘, 이음부 아이콘.
- 이보드: XPS 단열 코어 아이콘, 표면 마감층 아이콘, 결합 구조 아이콘.
- XPS: Closed Cell 아이콘, 압출 폼 코어 아이콘, 이음부 아이콘.
- EPS: Expanded Bead 아이콘, EPS Foam 아이콘, 비드 구조 아이콘.
- 글라스울: Glass Fiber 아이콘, Fiber Mat 아이콘, 충진 상태 아이콘.
- 미네랄울 / 암면: Mineral Fiber 아이콘, Board Form 아이콘, 밀착 시공 아이콘.
- PIR / 우레탄폼: Facing 아이콘, Urethane/PIR Foam Core 아이콘, 이음부 아이콘.
- 열반사 단열재: Reflective Film 아이콘, Air Layer 아이콘, Cushion Layer 아이콘.
- 데크재: 노출 상판 아이콘, 길이 방향 목재 결 아이콘, 피스 고정/간격 아이콘.
- 아이콘 형태, 크기, 선 굵기, 배치 비율은 제품군별 고정 스타일을 유지하고 임의 변경하지 않는다.

INFOGRAPHIC_QUALITY_CHECKLIST:
- 합판: 집성 목재 구조 금지, 집성판 구조 금지, 블록코어 금지, 집성코어 금지, 교차 적층 구조만 사용, Veneer Layer 사용, 단판 적층 표현, 앞면·뒷면과 측면 적층 단면 사용, 접착제·접착층·접착부·Glue Line·본드층·접착선 확대 금지, 집성판 아이콘 사용 금지, 근거 없는 수치 생성 금지.
- 솔리드 집성판: 핑거조인트 없음, 톱니형 접합 없음, 폭 방향 목재 스트립 접합, 목재 스트립 폭 자연스럽게 표현, 접착선 최소 표현, 단판 적층 금지, 근거 없는 수치 생성 금지.
- 사이드핑거: 측면 접합부에만 핑거조인트, 상판 전체 톱니 표현 금지, 단판 적층 금지, 근거 없는 수치 생성 금지.
- 탑핑거: 상판 또는 길이 방향 접합만 표현, 측면 전체 핑거 금지, 단판 적층 금지, 근거 없는 수치 생성 금지.
- MDF: 섬유 압축 구조, 집성 목재 구조 금지, Veneer Layer 금지, 근거 없는 수치 생성 금지.
- PB: 우드칩 구조, 섬유 구조 금지, Veneer Layer 금지.
- 석고보드: Paper / Gypsum / Paper, 단열재 구조 금지, 집성 목재 구조 금지.
- CRC: 섬유시멘트 구조, 석고보드 구조 금지, 단열재 구조 금지.
- PF: Facing / PF Foam Core / Facing, 근거 없는 면재 종류와 복합층 생성 금지, XPS 구조 금지, EPS 구조 금지, 글라스울 구조 금지.
- 이보드: XPS 코어를 단면의 약 80~90%이자 가장 먼저 보이는 핵심 구조로 표현한다. PP층은 표면 바로 아래 상부에만 두고 하부 PP층과 PP → XPS → PP 샌드위치 구조를 금지한다. 도배용/페인트용은 동일 단면에서 표면 질감만 다르게 한다.
- XPS: Closed Cell, PF 구조 금지, EPS 비드 구조 금지.
- EPS: 비드 구조, Closed Cell 금지.
- 글라스울: 섬유 매트 구조, 발포 구조 금지.
- 미네랄울: 광물섬유 구조, 글라스울 질감 혼용 금지.
- 데크재: 노출 상판, 길이 방향 목재 결, 측면 단면, 피스 고정 위치, 데크 간격만 사용하고 단판 적층, MDF/PB 압축 코어, 석고 코어, 단열재 코어, 근거 없는 성능/내구성/방부 등급 수치 생성을 금지.

제품군별 구조 규칙:
- 합판(Plywood): 얇은 목재 단판(Veneer)을 여러 겹 교차 적층한 구조. 구조도는 얇은 단판 레이어, 교차 적층 방향, 앞면, 뒷면, 측면 적층 단면 중심. 허용: 적층, Veneer, Layer, 앞면, 뒷면, 측면 단면. 금지: 접착제, 접착층, 접착부, Glue Line, 본드층, 접착 구조, 접착선 확대, 집성 목재, 집성, 핑거조인트, 블록코어, 집성코어, OSB처럼 보이는 조각 코어.
- 자작합판에 복합 표면 등급이 있으면 앞면 등급과 뒷면 등급을 표면 라벨로만 표현할 수 있다. 표면 등급을 강도·구조 성능·접착 성능과 연결하지 않는다.
- 자작합판 등급 설명은 현재 운영 상품/공급사 기준 B=최상급, S=상급, BB=중급, CP=하급만 사용하며 모든 제조사의 공통 규칙으로 일반화하지 않는다.
- 패치 개수·크기·직경·수치와 전층 자작 구조는 근거 없이 생성하지 않는다.
- 내수·준내수 또는 공식 접착등급 근거가 있는 합판만 "내수성이 고려된 접착 성능" 수준의 보조 설명을 허용한다. 수지명, 완전 방수, 외부 영구 사용 표현은 금지한다.
- 솔리드 집성판: 원목 목재 스트립을 폭 방향으로 접합한 솔리드 패널 구조. 구조도는 목재 스트립, 목재 결 방향, 폭 방향 집성 접합부 중심. 허용: 목재 스트립, 목재 결 방향, 집성 접합부, 솔리드 패널. 금지: 핑거조인트, Finger Joint, FJ, 탑핑거, 사이드핑거, 톱니형 접합, 길이 방향 접합, 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 사이드핑거 집성판: 제품명에 사이드핑거, 사이드 핑거, Side Finger가 명확히 포함될 때만 측면 접합부 중심으로 핑거조인트를 표현한다. 표면 전체에 과한 톱니 패턴을 만들지 않는다. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 탑핑거 집성판: 제품명에 탑핑거, 탑 핑거, Top Finger가 명확히 포함될 때만 상판 면 또는 길이 방향 접합부에 핑거조인트를 표현한다. 합판식 레이어 단면으로 표현하지 않는다. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 핑거조인트 집성판: 제품명에 핑거, FJ, Finger가 명확히 포함될 때만 핑거조인트 표현을 허용한다. 구조도는 목재 스트립, 집성 접합부, 목재 결 방향 중심. 금지: 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- 집성판 / 집성목: 제품명에 핑거, FJ, Finger가 없으면 핑거조인트를 생성하지 않는다. 원목 목재 스트립을 폭 방향으로 접합한 집성 목재 구조로 표현한다. 구조도는 목재 스트립, 집성 접합부, 목재 결 방향, 폭 방향 접합 중심. 허용: 집성 목재, 목재 스트립, 집성 접합부, 목재 결 방향, Edge Glued, Solid Panel. 금지: 핑거조인트, Finger Joint, FJ, 탑핑거, 사이드핑거, 톱니형 접합, 단판 적층, 3~13겹, Veneer Layer, 교차 적층.
- MDF: 목재 섬유 압축 성형 구조. 구조도는 목재섬유, 고밀도 압축, 균일 구조 중심. 금지: 단판 적층, 집성 목재 구조.
- PB / 파티클보드: 우드칩과 접착제를 압축 성형한 구조. 구조도는 Wood Chip, Resin, Pressed Core 중심. 금지: 단판 적층, 집성 목재 구조, 석고 코어.
- 석고보드: 석고 코어 양면에 원지를 결합한 구조. 구조도는 원지, 석고 코어, 원지 중심. 금지: 단판 적층, 집성 목재 구조, 목재 섬유 압축.
- CRC / 시멘트보드 / 섬유시멘트보드: 시멘트계 원료와 섬유질 원료를 압축 성형한 구조. 구조도는 Cement Matrix, Fiber Reinforcement, Pressed Board 중심. 금지: 단판 적층, 집성 목재 구조, 석고 코어.
- PF보드 / 페놀폼 단열재: 기본 구조는 면재 / PF 폼 코어 / 면재다. 상품정보에 알루미늄, GF, 복합면재 근거가 있을 때만 해당 면재를 표현하고, 근거가 없으면 일반 면재 구조를 사용한다. 입력에 없는 면재나 복합층을 생성하지 않는다. 금지: XPS 구조, EPS 비드 구조, 글라스울 섬유 구조, 단판 적층, 집성 목재 구조, 석고 코어.
- 이보드: 실제 구조는 흰색·연회색 표면 마감층 → 연회색 상부 PP 중공 구조판(약 3T) → 옅은 핑크 계열 XPS 코어로 고정한다. XPS 코어만 핑크 계열을 사용하고 표면 마감층은 핑크색으로 만들지 않는다. 금지: XPS 하부 PP층, PP → XPS → PP 샌드위치, EPS·PF·석고 코어.
- XPS / 아이소핑크 / 압출법 단열재: 폴리스티렌 수지를 압출 발포한 폐쇄 셀 구조. 구조도는 Closed Cell Foam, Extruded Polystyrene, Uniform Foam Core 중심. 허용: 폐쇄 셀, 압출 발포, XPS Core. 금지: PF Core, Glass Wool Fiber, 단판 적층, 집성 목재 구조.
- EPS / 스티로폼 / 비드법 단열재: 폴리스티렌 비드를 발포 성형한 단열재. 구조도는 Expanded Bead, EPS Foam, Bead Structure 중심. 허용: 비드 구조, 발포 입자, EPS Core. 금지: 압출 발포 구조, PF Core, Glass Wool Fiber, 단판 적층.
- 글라스울: 유리섬유를 솜 형태로 집합한 섬유계 단열재. 구조도는 Glass Fiber, Fiber Mat, Air Layer 중심. 허용: 섬유 매트, 유리섬유, 흡음, 단열. 금지: 발포 코어, 단판 적층, 집성 목재 구조.
- 미네랄울 / 암면: 광물 섬유를 매트 또는 보드 형태로 성형한 단열재. 구조도는 Mineral Fiber, Fiber Mat, Board Form 중심. 허용: 광물섬유, 섬유 매트, 보드형 단열재. 금지: 발포 코어, 단판 적층, 집성 목재 구조.
- 우레탄폼 / PIR 단열재: 우레탄 또는 PIR 발포 단열재 코어에 면재를 결합한 구조. 구조도는 Facing, Urethane/PIR Foam Core, Facing 중심. 허용: Foam Core, Facing, PIR Core. 금지: PF Core로 단정, Glass Wool Fiber, 단판 적층.
- 열반사 단열재: 반사 필름과 공기층 또는 완충재를 결합한 구조. 구조도는 Reflective Film, Air Layer, Cushion Layer 중심. 허용: 반사층, 공기층, 알루미늄 필름. 금지: 발포 코어 단정, 단판 적층, 집성 목재 구조.
- 데크재: 실외 바닥이나 테라스 시공에 사용하는 장척 목재 자재. 구조도는 노출 상판, 길이 방향 목재 결, 측면 단면, 피스 고정 위치, 데크 간격 중심. 허용: 수종, 폭, 두께, 길이, 표면 상태, 고정 방식, 시공 간격. 금지: 단판 적층, MDF/PB 압축 코어, 석고 코어, 단열재 코어, 근거 없는 성능/내구성/방부 등급 수치.

제품군별 기본 외관 규칙:
- 제조사 자료나 상품 정보에 실제 외관 근거가 있으면 그 근거를 최우선으로 사용한다.
- 실제 외관 근거가 없을 때만 아래 기본 외관을 적용하며, 색상을 임의로 바꾸지 않는다.
- XPS / 아이소핑크는 기본적으로 핑크 계열 단열보드 외관으로 표현하고, 다른 외관 근거가 없는 한 이를 유지한다.
- 일반석고보드는 흰색 원지 외관, 방수석고보드는 하늘색 원지 외관, 방화석고보드는 핑크색 원지 외관, 차음석고보드는 연두색 원지 외관을 기본으로 표현한다.
- PF보드의 면재와 코어 색상은 제품 외관으로만 자연스럽게 표현하고, 색상명을 이미지 텍스트나 라벨로 출력하지 않는다.
- 이보드는 표면 마감층을 흰색 또는 연회색, PP층을 연회색, XPS 코어만 옅은 핑크 계열 외관으로 표현한다. 색상명은 텍스트나 라벨로 출력하지 않는다.
- 이보드 도배용은 미세 섬유감, 페인트용 / 도장용은 평활면으로 표현하고 좌우 단면 구조는 동일하게 유지한다.
- 위 색상은 제품 표면의 자연스러운 시각적 외관에만 사용한다. 색상명, 원지 색상 설명, "핑크색 단열재" 같은 문구를 이미지 텍스트, 라벨, 제목, 범례, 콜아웃으로 생성하지 않는다.
- 색상 외관을 제품 정보나 설명 텍스트로 노출하지 않는다.

구조 혼용 금지:
- 집성판이면 단판 적층, 3~13겹, Veneer Layer, 교차 적층을 절대 사용하지 않는다.
- 합판이면 집성 목재, 집성, 핑거조인트를 절대 사용하지 않는다.
- 단열재는 제품명에 따라 PF보드, XPS, EPS, 글라스울, 미네랄울, 우레탄폼, 열반사 단열재를 구분하고 서로 혼용하지 않는다.
- 데크재는 각재, 방부목, 합판, 집성판 구조로 임의 대체하지 않는다.

단열재 이음부 규칙:
- PF, XPS, EPS, 네오폴 등 단열재는 상품정보나 제조사 자료에 맞물림 가공이 명시된 경우만 예외로 한다.
- 근거가 없으면 판재와 판재가 평면으로 맞닿는 일반 시공 형태를 사용한다.
- 우레탄폼, 기밀테이프, 실란트 등은 이음부 기밀 확보를 위한 시공 방법으로만 표현한다.
- 기밀 시공 표현을 위해 보드 단면 자체를 맞물림 구조로 변경하지 않는다.
- 금지: Tongue & Groove, 암수 결합, 맞물림 패널, 끼움식 패널, 조인트 패널 구조, SIP 패널 형태, Sandwich Panel 조인트, 끼움식 단면.

구조도 일치 규칙:
- 제목, 구조 설명, 단면 이미지, 레이어 구조, 아이콘, 수치 비교는 모두 동일한 제품 구조를 사용한다.
- 제품군이 바뀌면 모든 요소가 함께 변경되어야 한다.
- 부분적으로 다른 제품군 구조를 혼합하지 않는다.
- 실제 단면과 최대한 유사하게 표현한다.
- 합판은 교차 적층 단면으로 표현한다.
- 집성판은 목재 스트립, 목재 결 방향, 최소한의 집성 접합부 중심으로 표현한다.
- 솔리드, 핑거조인트, 사이드핑거, 탑핑거는 모두 별도 구조로 표현한다.
- MDF는 목재 섬유 압축 구조로 표현한다.
- PB는 Chip 기반 압축 구조로 표현한다.
- 석고보드는 Paper / Gypsum / Paper 구조로 표현한다.
- PF보드는 Facing / PF Foam Core / Facing 구조로 표현한다.
- 이보드는 Extruded Insulation Core 중심으로 표현하고 PP Hollow Board는 표면 바로 아래 상부의 얇은 단일 보조층으로만 둔다.

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
- 함수율, 밀도, 접착율, 접착률, 목재 스트립 수, 열전도율, 강도, 접착제 도포량 등은 근거가 있을 때만 표시한다.
- 근거 없는 수치 섹션은 만들지 않는다.
- A~M열에 명확한 수치가 없으면 수치 카드나 핵심 수치 섹션을 만들지 않는다.
- 임의 목재 스트립 수, 임의 접착률, 임의 접착제 도포량, 임의 함수율, 임의 밀도, 임의 열전도율, 임의 강도는 절대 생성하지 않는다.
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
핵심표현: ${removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge))}
구조: ${removeCommerceRemedyGuidance(getProductKnowledgeStructure(data, knowledge))}
강조포인트: ${removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.emphasis, knowledge))}
  `;
}

function buildProductIntroductionFromKnowledge(data, fallback) {
  const knowledge = buildProductKnowledgeContext(data);
  if (knowledge.productGroup !== 'PLYWOOD') return cleanHumanWritingText(fallback);

  let definition = '얇은 목재 단판을 여러 겹 적층한 판재입니다.';
  if (knowledge.isBirchPlywood && knowledge.surfaceGrade) {
    return cleanHumanWritingText('자작합판은 앞면과 뒷면의 표면 등급을 조합해 사용 목적에 맞게 선택합니다.<br><br>현재 상품은 ' + knowledge.surfaceGrade + ' 등급이며, 이 설명은 현재 상품·공급사 기준입니다. 앞면 ' + knowledge.faceGrade + '와 뒷면 ' + knowledge.backGrade + '의 표면 구성을 적용한 제품입니다.<br><br>앞면과 뒷면의 표면 상태가 달라 노출할 면을 먼저 정하고 사용합니다.');
  }

  const uses = uniqueCleanTerms([data && data.use1, data && data.use2]);
  const secondSentence = uses.length > 0
    ? buildNaturalUseList(uses) + '에 사용됩니다.'
    : '노출 마감 전 앞·뒷면 표면 상태를 확인합니다.';
  return cleanHumanWritingText(definition + ' ' + secondSentence);
}

function buildTypeAPrompt(data) {
  const compareTargetText = String(data.compareTarget || '').trim();
  const compareParts = compareTargetText
    .split(/\s+VS\s+/i)
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return part; });
  let isVsCompareMode = compareParts.length >= 2;
  let leftCompareLabel = isVsCompareMode ? compareParts[0] : data.compareTarget;
  let rightCompareLabel = isVsCompareMode ? compareParts.slice(1).join(' VS ') : data.productName;
  const productGroup = data.productGroup || getFAQCategoryType(data);
  const knowledge = buildProductKnowledgeContext(data);
  const isUvBirchFinishCompare = isUvCoatedBirchFinishCompare(data);
  const plywoodImageFidelityGuard = '';
  const isBirchStockPineCompare = knowledge.isBirchStockCompare;
  const isKnotlessPineCompare = isBirchStockPineCompare && /미송합판\s*\(\s*무절\s*\)/.test(compareTargetText);
  const pineSurfaceInstruction = isKnotlessPineCompare
    ? `- 미송합판(무절) 카드 보조 정보: 큰 옹이는 생성하지 않고 작은 점상 흔적만 제한적으로 허용한다.
- 자연스러운 미송 결과 약한 색상 변화는 유지한다.
- 표면 균일도는 자작합판 S보다 낮고 일반 미송합판보다 깨끗하게 표현한다.
- 자작합판과 동일한 텍스처 또는 인공적으로 지나치게 매끈한 표면을 생성하지 않는다.
- 일반 미송합판의 옹이 많은 표면 규칙을 적용하지 않는다.`
    : '- 미송합판 카드 보조 정보: 미송 단판 적층 구조, 자연스러운 목재 결과 옹이, 자작합판과 다른 표면 색감·무늬';
  const isBirchGradeMode = knowledge.isBirchPlywood && knowledge.surfaceGrade && !isBirchStockPineCompare;
  const isBirchStockGuide = isBirchGradeMode && knowledge.isBirchStockGuide;
  const isBirchOrderGradeGuide = isBirchGradeMode && knowledge.isBirchOrderGradeGuide;
  const canCompareBirchGrade = isBirchGradeMode && knowledge.canCompareSurfaceGrade && !isBirchStockGuide && !isBirchOrderGradeGuide;
  if (canCompareBirchGrade) {
    isVsCompareMode = true;
    leftCompareLabel = knowledge.surfaceGrade;
    rightCompareLabel = knowledge.targetSurfaceGrade;
  }
  if (isBirchStockPineCompare) {
    isVsCompareMode = true;
    leftCompareLabel = '자작합판 S/BB';
    rightCompareLabel = isKnotlessPineCompare ? '미송합판(무절)' : '미송합판';
  }
  const compareTargetLower = compareTargetText.toLowerCase();
  const typeAProductLabel = String(data.category || '') + ' ' + String(data.productName || '');
  const isEboardFinishCompare = (
    typeAProductLabel.indexOf('이보드') !== -1 &&
    compareTargetText.indexOf('도배용') !== -1 &&
    (compareTargetText.indexOf('페인트용') !== -1 || compareTargetText.indexOf('도장용') !== -1)
  );
  function hasAnyCompareKeyword(keywords) {
    return keywords.some(function (keyword) {
      return compareTargetLower.indexOf(String(keyword).toLowerCase()) !== -1;
    });
  }
  const isPlywoodOriginCompare =
    productGroup === 'PLYWOOD' &&
    compareTargetText.indexOf('베트남산') !== -1 &&
    compareTargetText.indexOf('동남아산') !== -1;
  const waterResistantEvidenceText = [
    data.category, data.productName, data.grade, data.maker, data.compareTarget,
    data.keyValue, data.source, data.structure, data.emphasis, data.use1, data.use2
  ].join(' ');
  const isKsWaterResistantPlywoodCompare =
    productGroup === 'PLYWOOD' &&
    knowledge.isWaterResistantPlywood &&
    knowledge.hasAdhesiveEvidence === true &&
    /일반\s*합판/.test(compareTargetText) &&
    /(?:^|[^A-Z])KS(?:[^A-Z]|$)/i.test(waterResistantEvidenceText);
  const repeatedGlueCompareBan = productGroup === 'PLYWOOD'
    ? ''
    : '- 구조가 같은 경우 접착선, 적층 방향, 공통 단면을 비교 항목으로 억지 생성하지 않는다.';
  const repeatedGlueThirdBan = productGroup === 'PLYWOOD'
    ? ''
    : '- 합판 공통 구조 설명, 단판 적층도, 접착선 비교를 생성하지 않는다.';
  const repeatedHtmlBan = productGroup === 'PLYWOOD' ? '' : '- 상세설명 HTML 문장 반복 금지';
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
  const typeAGoalInstruction = isUvBirchFinishCompare
    ? '- UV 코팅 자작합판의 하도와 상도를 등급이 아닌 공정 단계와 사용 목적 차이로 시각화'
    : isBirchStockPineCompare
    ? '- 자작합판 S/BB와 미송합판의 실제 표면·무늬 차이를 좌우 비교'
    : isBirchGradeMode
    ? isBirchOrderGradeGuide
      ? '- 주문재의 복수 등급을 독립 카드로 나누어 앞면·뒷면 표면 차이를 안내'
      : canCompareBirchGrade
      ? '- 현재 자작합판 복합 등급과 단일 비교 등급의 앞면·뒷면 표면 등급만 분리해 비교'
      : '- 다른 등급과 비교하지 않고 현재 자작합판 복합 등급의 앞면·뒷면 의미만 설명'
    : isEboardFinishCompare
    ? '- 이보드 도배용과 페인트용의 동일한 단면 구조를 유지하고 표면 질감 차이만 시각화'
    : shouldSkipTypeAStructureCompare
      ? '- 비교 핵심 포인트까지만 시각화하고 3단은 생성하지 않는다'
      : '- 비교 핵심 포인트와 좌우 구조 차이를 시각화';
  const firstSectionInstruction = isUvBirchFinishCompare
    ? `
1단: UV 코팅 공정 흐름
- "원판 → 샌딩 → UV 하도 → UV 상도"를 왼쪽에서 오른쪽 순서로 표시한다.
- 각 단계를 독립된 공정 카드로 연결하고 자작합판 원판에서 최종 UV 마감까지의 진행이 한눈에 보이게 한다.
- 단면 구조, 앞면·뒷면 등급, 복합 등급 카드를 넣지 않는다.
`
    : isBirchStockPineCompare
    ? `
1단: 제품 비교
- 왼쪽 라벨: "자작합판 S/BB"
- 오른쪽 라벨: "${rightCompareLabel}"
- 두 라벨 사이에 VS만 표시하고 별도 대제목은 생성하지 않는다.
- 자작합판 카드 보조 정보: 얇은 단판 여러 겹 적층, 앞면 S / 뒷면 BB, 밝고 비교적 균일한 표면
${pineSurfaceInstruction}
- 자작합판의 BB면은 S면보다 패치·작은 옹이·필러 흔적·색상 편차가 한눈에 더 보이게 표현하되 CP 수준으로 과장하지 않는다.
- 실제 입력에 없는 미송합판 수종 세부정보·성능은 생성하지 않는다.
`
    : isBirchGradeMode
    ? isBirchOrderGradeGuide
      ? `
1단: 주문 가능 복합 등급 카드
${buildBirchOrderGradeCardGuide(knowledge.availableSurfaceGrades)}
- 각 카드는 독립 항목이며 앞면과 뒷면을 분리해 표시한다.
- 등급 목록 전체를 한쪽 비교 대상이나 하나의 문자열로 표시하지 않는다.
- VS와 좌우 제품 비교 레이아웃을 생성하지 않는다.
`
      : canCompareBirchGrade
      ? `
1단: 복합 표면 등급 비교
- 왼쪽 라벨: "${knowledge.surfaceGrade}"
- 왼쪽 앞면: "${knowledge.faceGrade}"
- 왼쪽 뒷면: "${knowledge.backGrade}"
- 오른쪽 라벨: "${knowledge.targetSurfaceGrade}"
- 오른쪽 앞면: "${knowledge.targetFaceGrade}"
- 오른쪽 뒷면: "${knowledge.targetBackGrade}"
- 등급 설명은 현재 상품/공급사 기준으로만 한정한다.
- 왼쪽 앞면 설명: "${knowledge.faceGradeDescription.level} · ${knowledge.faceGradeDescription.surface}"
- 오른쪽 앞면 설명: "${knowledge.targetFaceGradeDescription.level} · ${knowledge.targetFaceGradeDescription.surface}"
- 입력된 두 복합 등급 표기를 그대로 유지하고 앞면과 뒷면을 각각 분리해 표시한다.
- 표면 등급 차이와 뒷면 등급 동일 여부만 표현한다.
- 강도, 내구성, 구조 성능, 접착 성능 우열로 확대하지 않는다.
`
      : `
1단: 현재 복합 표면 등급 설명
- 비교 레이아웃과 VS를 생성하지 않는다.
- 현재 상품 등급 "${knowledge.surfaceGrade}"만 표시한다.
- 앞면: "${knowledge.faceGrade}"
- 뒷면: "${knowledge.backGrade}"
- 슬래시 앞은 앞면, 뒤는 뒷면의 표면 등급임을 설명한다.
- 현재 상품/공급사 기준 앞면 설명: "${knowledge.faceGradeDescription.level} · ${knowledge.faceGradeDescription.surface}"
- 현재 상품/공급사 기준 뒷면 설명: "${knowledge.backGradeDescription.level} · ${knowledge.backGradeDescription.surface}"
- 이 기준을 모든 제조사 자작합판의 공통 규칙으로 일반화하지 않는다.
- 실제 패치·필러·표면 상태는 입고 제품과 제조사 기준을 확인하도록 안내한다.
- compareTarget의 여러 등급 목록을 이미지에 표시하지 않는다.
`
    : `
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
`;
  const sourceInstruction = data.source
    ? `- 출처는 작게 표시: "출처: ${data.source}"`
    : '';
  const secondSectionInstruction = isUvBirchFinishCompare
    ? `
2단: UV 하도 ↔ UV 상도
- 왼쪽 "UV 하도": 최종 마감 전 단계, 후속 도장 또는 추가 마감용 바탕면, 표면 균일화 목적, 무광 또는 낮은 광택 느낌.
- 오른쪽 "UV 상도": 최종 UV 마감 완료 단계, 표면 보호를 위한 마감, 바로 사용하는 완성 마감 상태, 하도보다 마감된 표면 느낌.
- 광택만 다르게 표현하지 않고 마감 완료 여부, 후속 작업 필요 여부, 표면 보호 마감 여부를 함께 구분한다.
- 하도를 미완성 불량품처럼 표현하거나 상도를 두꺼운 투명막처럼 과장하지 않는다.
`
    : isBirchStockPineCompare
    ? `
2단: 표면 비교 포인트
- 표면 색감, 무늬와 옹이 표현, 앞·뒷면 표면 등급 유무, 노출 마감 선택 포인트만 비교한다.
- 자작합판은 노출 마감 시 앞면 S의 실제 상태를 확인하는 보조 정보만 표시한다.
- 자작합판의 절대 우수, 강도·내구성 우열, 임의 등급 비교를 생성하지 않는다.
`
    : isBirchGradeMode
    ? isBirchOrderGradeGuide
      ? `
2단: 등급별 표면 차이
- 현재 상품/공급사 기준 B > S > BB > CP 순서로 표면 차이만 시각화한다.
- B는 가장 깨끗하고 균일하게, S는 일부 패치·작은 옹이·색상 편차가 보이게 표현한다.
- BB는 S보다 패치·작은 옹이·필러 흔적·색상 편차가 한눈에 더 보이되 CP 수준으로 과장하지 않는다.
- CP는 BB보다 표면 보수·옹이·색상 편차가 더 보이되 구조적 파손처럼 표현하지 않는다.
- 같은 BB면은 모든 카드에서 동일한 질감·패치·옹이·색상 편차 수준으로 고정한다.
`
      : canCompareBirchGrade
      ? `
2단: 앞면·뒷면 확인
- 왼쪽과 오른쪽의 앞면 등급 차이를 그대로 표시한다.
- 뒷면 등급이 같으면 "뒷면 등급 동일", 다르면 각 뒷면 등급만 표시한다.
- 노출면 선택 시 실제 표면 상태를 확인하도록 안내한다.
- 현재 상품/공급사 기준의 최상급·상급·중급·하급 표기만 허용하고 우수·열위 표현은 금지한다.
- 다른 등급의 패치·필러 상태와 허용 수량을 추정하지 않는다.
`
      : `
2단: 현재 등급 확인 포인트
- "${knowledge.surfaceGrade}"의 앞면 "${knowledge.faceGrade}"와 뒷면 "${knowledge.backGrade}"만 설명한다.
- 앞면과 뒷면의 표면 품질 조합이라는 점을 표시한다.
- S/BB 재고 상품은 S면이 BB면보다 깨끗하게 보이도록 하고 노출면은 S면을 우선 확인하도록 안내한다.
- BB면은 S보다 패치·옹이·색상 편차가 더 보이되 CP 수준으로 과장하지 않는다.
- 실제 표면 상태는 입고 제품 기준으로 확인하도록 안내한다.
- 다른 자작합판 등급을 생성하거나 비교하지 않는다.
`
    : isEboardFinishCompare
    ? `
2단: 표면 질감 핵심 차이
- 도배용은 미세 섬유감, 페인트용 / 도장용은 평활면으로 표현한다.
- 실제 질감 차이는 2개 이하만 사용하고 구조 차이나 반복 설명을 만들지 않는다.
- 정보가 부족하면 카드 수를 줄이고 빈 공간을 추가 설명으로 채우지 않는다.
`
    : shouldSkipTypeAStructureCompare
      ? `
2단: 비교 핵심 포인트
- 좌우 대상의 핵심 차이 2~3개만 카드형으로 표시
- "무엇이 다른가"만 짧은 키워드로 요약
- 같은 의미의 항목 반복 금지
${repeatedGlueCompareBan}
- 이 합판 비교는 단판 균일성, 표면 상태, 외관 편차 중심으로 표시한다.
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
  const thirdSectionInstruction = isUvBirchFinishCompare
    ? `
3단: 사용 목적 차이
- UV 하도: 후속 도장·추가 마감 작업을 위한 바탕 단계.
- UV 상도: 별도 추가 마감 없이 사용하는 최종 마감 단계.
- 단면 구조를 반복하지 않고 공정 역할과 사용 목적만 간결하게 표시한다.
- 방수, 내구성 보장, 스크래치 완전 차단, 구조 강도 우위 표현을 생성하지 않는다.
`
    : isKsWaterResistantPlywoodCompare
    ? `
3단: 내수합판의 차이
- 단면 확대를 반복하지 않고 접착 성능 차이, 사용 환경 차이, 선택 이유만 강조한다.
- 일반합판: 일반 실내용 접착 성능, 건조한 실내 중심으로 사용한다.
- 내수합판: KS 기준 내수 접착 성능을 적용하고 습기가 있는 공간까지 고려한 제품이다.
- 내수합판은 내수 성능을 고려한 접착제를 사용한 구조로 설명한다.
- 방수합판, 완전 방수, 물에 젖어도 문제없음, 침수 시 변형 없음, 구조 강도가 더 높음, 외부 사용 가능 단정 표현을 생성하지 않는다.
- 접착층을 과도하게 확대하거나 두껍게 표현하지 않는다.
`
    : isBirchStockPineCompare
    ? `
3단 생성 금지:
- 비교는 위 두 영역으로만 구성하고 접착층·접착선 확대나 추가 구조 비교를 생성하지 않는다.
`
    : isBirchGradeMode
    ? isBirchOrderGradeGuide
      ? `
하단 안내:
- 표면 등급은 외관 기준이며 구조 강도와 별개임을 표시한다.
- 주문 시 앞면·뒷면 등급 조합을 확인하도록 안내한다.
- 실제 표면 상태는 입고 제품 기준으로 확인한다고 표시한다.
`
      : `
3단 생성 금지:
- 자작합판 등급 안내는 1단과 2단까지만 구성한다.
- 현재 비교 대상 외 등급 순위표, 여러 등급 목록, 구조 성능 비교, 강도 비교를 생성하지 않는다.
- 패치 개수 비교와 제조사 근거 없는 표면 상태 비교를 생성하지 않는다.
`
    : isEboardFinishCompare
    ? `
3단: 동일 구조의 표면 비교
- XPS 코어를 두께의 약 80~90%이자 가장 먼저 보이는 핵심 구조로 표현하고 좌우 단면은 동일하게 유지한다.
- 표면 마감층은 흰색 또는 연회색 외관에서 질감만 다르게 하고 핑크색으로 만들지 않는다.
- 약 3T PP층은 연회색 상부 단일층으로만 두고 XPS 하부 PP층과 샌드위치 구조는 금지한다. XPS 코어만 옅은 핑크 계열로 표현하며 색상명은 라벨로 출력하지 않는다.
`
    : shouldSkipTypeAStructureCompare
      ? `
3단 생성 금지:
- 이 비교는 1단과 2단까지만 구성한다.
- 3단 섹션, 3단 제목, 하단 추가 카드, 하단 체크포인트를 만들지 않는다.
- 좌우 구조 비교, 현장 선택 기준, 구매 체크포인트, 추천 용도 섹션을 생성하지 않는다.
- 외관 확인, 마감 방향 결정, 제품별 상태 점검 문구로 빈 영역을 채우지 않는다.
${repeatedGlueThirdBan}
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
  const vsCompareInstruction = isUvBirchFinishCompare
    ? `
UV 하도·상도 공정 비교 규칙:
- compareTarget은 UV 하도와 UV 상도의 공정 비교 근거로만 사용한다.
- 표시 순서는 실제 공정에 맞춰 UV 하도에서 UV 상도로 고정한다.
- 두 단계를 표면 등급이나 제품 성능 우열로 비교하지 않는다.
- 일반 자작합판 등급 카드와 합판 단면 비교를 재사용하지 않는다.
`
    : isBirchStockPineCompare
    ? `
자작합판 S/BB와 미송합판 비교 규칙:
- 실제 compareTarget인 미송합판 비교를 자작합판 등급 비교보다 우선한다.
- S/BB는 자작합판 카드 내부의 앞면 S·뒷면 BB 보조 정보로만 사용한다.
- 다른 자작합판 복합 등급과의 임의 비교를 생성하지 않는다.
`
    : isBirchGradeMode
    ? isBirchOrderGradeGuide
      ? `
자작합판 주문재 복수 등급 안내 규칙:
- 복수 등급을 각각 독립 카드로 표시하고 VS를 생성하지 않는다.
- 각 카드의 슬래시 앞은 앞면, 뒤는 뒷면 등급으로 표시한다.
- 같은 BB면은 카드가 달라도 동일한 표면 품질 기준을 사용한다.
- 등급 차이는 표면 품질에만 한정하고 강도·내구성·구조 성능 차이로 확대하지 않는다.
`
      : canCompareBirchGrade
      ? `
자작합판 단일 복합 등급 비교 규칙:
- 비교는 "${knowledge.surfaceGrade}"와 "${knowledge.targetSurfaceGrade}" 두 등급만 사용한다.
- 왼쪽은 앞면 ${knowledge.faceGrade}, 뒷면 ${knowledge.backGrade}로 표시한다.
- 오른쪽은 앞면 ${knowledge.targetFaceGrade}, 뒷면 ${knowledge.targetBackGrade}로 표시한다.
- 표면 등급 표기 외 다른 등급 특성은 제조사 근거 없이 생성하지 않는다.
- 여러 등급 목록과 현재 비교 대상 밖의 등급 순위를 생성하지 않고 강도·내구성·구조 성능 우열로 확대하지 않는다.
`
      : `
자작합판 현재 등급 설명 규칙:
- compareTarget은 단일 복합 등급 비교 조건을 충족하지 않으므로 비교 대상으로 사용하지 않는다.
- "${knowledge.surfaceGrade}" 자체의 앞면·뒷면 의미만 설명한다.
- VS, 좌우 비교, 등급 목록, 우열 표현을 생성하지 않는다.
`
    : isVsCompareMode && !isPlywoodOriginCompare
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
PLYWOOD 비교 고정 데이터 (내부 지시):
- 이 규칙은 동남아산과 베트남산 비교에만 적용한다.
- 별도 상단 대제목과 상품명 전체 제목을 생성하지 않는다.
- "비교 안내" 문구도 제목으로 생성하지 않는다.
- 상단은 좌우 원산지 라벨과 VS만 표시한다.
- 아래 좌우 고정 데이터의 라벨과 선택한 bullet 문구를 1단/2단 비교 문구에 그대로 사용한다.
- 2단 비교 핵심 포인트는 고정 데이터 중 핵심 차이 2~3개만 사용한다.
- 고정 데이터 문구 재작성 금지, 요약 금지, 확장 금지, 순서 변경 금지, 다른 문구 추가 금지.
- VS 순서를 반드시 따른다.
- 동남아산과 베트남산의 적층 구조와 단면 구조는 동일하게 유지한다.
- 구조 차이를 만들지 않고 표면 톤·결 변화·표면 질감·외관 편차만 다르게 표현한다.
- 동남아산 표면은 밝고 비교적 균일한 톤, 완만한 결 변화, 비교적 일정한 질감, 외관 편차가 적은 느낌으로 표현한다.
- 베트남산 표면은 동남아산보다 색상 편차가 조금 더 보이고 결 변화가 조금 더 다양하며 제품별 표면·외관 편차가 조금 더 느껴지게 표현한다.
- 좌우 표면을 복사한 것처럼 동일하게 만들지 않고, 베트남산을 불량이나 저품질처럼 과장하지 않는다.

왼쪽 고정 데이터:
- 라벨: "${leftCompareLabel}"
${leftCompareLabel.indexOf('베트남산') !== -1
  ? `- bullet 1: 일반 사용 중심으로 선택되는 편
- bullet 2: 제품별 단판 편차가 있을 수 있음
- bullet 3: 제품별 표면 상태의 차이가 있을 수 있음
- bullet 4: 제품별 외관 편차가 나타날 수 있음`
  : `- bullet 1: 단판 균일성이 비교적 안정적
- bullet 2: 표면 상태가 비교적 안정적
- bullet 3: 외관 편차가 적은 편
- bullet 4: 마감용으로 검토되는 편`}

오른쪽 고정 데이터:
- 라벨: "${rightCompareLabel}"
${rightCompareLabel.indexOf('베트남산') !== -1
  ? `- bullet 1: 일반 사용 중심으로 선택되는 편
- bullet 2: 제품별 단판 편차가 있을 수 있음
- bullet 3: 제품별 표면 상태의 차이가 있을 수 있음
- bullet 4: 제품별 외관 편차가 나타날 수 있음`
  : `- bullet 1: 단판 균일성이 비교적 안정적
- bullet 2: 표면 상태가 비교적 안정적
- bullet 3: 외관 편차가 적은 편
- bullet 4: 마감용으로 검토되는 편`}

PLYWOOD 비교 금지 문구:
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

${plywoodImageFidelityGuard}

${buildInfographicStructureGuide(data)}

${firstSectionInstruction}

${secondSectionInstruction}
${thirdSectionInstruction}

절대 금지:
- 규격 표시 금지
- 두께 표시 금지
- 자작합판 복합 표면 등급 외 등급 표시 금지
- 제조사 표시 금지
- 용도 표시 금지
- 제품명을 제목이나 설명문으로 반복 금지
${repeatedHtmlBan}
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
  const knowledge = buildProductKnowledgeContext(data);
  const isUvBirchFinishCompare = isUvCoatedBirchFinishCompare(data);
  const isPlywoodTypeB = knowledge.productGroup === 'PLYWOOD';
  const typeBRepeatedHtmlBan = isPlywoodTypeB ? '' : '- 상세설명 HTML 문장 반복 금지';
  const typeBDetailInstruction = isPlywoodTypeB
    ? `- 동일한 합판 단면에서 최대 3개의 확대뷰만 사용한다.
- 단판 레이어와 앞면·뒷면 표면 중 실제로 표시할 정보만 확대한다.
- 블록형 또는 조각형 내부 구조를 만들지 않는다.
- 자작합판 복합 등급이 있으면 앞면과 뒷면 등급을 표면 라벨로 표시한다.
- 확대뷰는 위 단면과 같은 제품에서 연결된 부분만 보여준다.
- 제품명·표 제목·긴 설명문을 확대 영역에 넣지 않는다.`
    : `- exactly three zoom windows of the same product structure
- 제품군별 구조에 맞는 확대뷰만 사용한다.
- 합판: veneer layer zoom / cross grain zoom / face and back surface zoom
- 합판 확대뷰는 반드시 단판 적층(Veneer Layers)만 보여준다.
- 합판 확대뷰에서 블록코어, 집성코어, 집성 목재 코어, OSB 조각 코어를 만들지 않는다.
- 합판 확대뷰와 라벨에서 접착제, 접착층, 접착부, Glue Line, 본드층, 접착 구조, 접착선을 만들지 않는다.
- 자작합판 복합 표면 등급이 있으면 앞면과 뒷면 확대뷰에 해당 표면 등급을 표시할 수 있다.
- 자작합판의 표면 등급을 강도나 구조 성능과 연결하지 않고 패치 개수를 생성하지 않는다.
- 솔리드 집성판, 집성목, 집성판: wood strip zoom / wood grain direction zoom / edge-glued joint zoom
- 핑거조인트 집성판: wood strip zoom / finger joint zoom / glued joint zoom
- 사이드핑거 집성판: side finger joint zoom / wood strip zoom / glued joint zoom
- 탑핑거 집성판: top finger joint zoom / wood strip zoom / lengthwise joint zoom
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
- 단열재의 board joint / joint treatment 확대뷰는 근거가 없으면 평면 맞댐 이음부로 표현한다.
- 우레탄폼, 기밀테이프, 실란트는 시공 보조재로만 표현하고 보드 단면을 Tongue & Groove, 암수 결합, 맞물림 또는 끼움식 패널 구조로 변경하지 않는다.
- 상품정보나 제조사 자료에 맞물림 가공이 명시된 단열재만 예외로 한다.
- no product names in this section
- no title bars in this section
- each zoom window must show magnified details from the top structure only
- 동일 제품 구조 확대뷰 3개
- 선택한 제품군에 존재하는 실제 구조 요소만 확대
- 좌우 카드/제품명/표 제목 없이 확대 이미지 중심`;
  const isBirchStockGuide = knowledge.isBirchStockGuide;
  const isBirchOrderGradeGuide = knowledge.isBirchOrderGradeGuide;
  const typeBGoalInstruction = isUvBirchFinishCompare
    ? '- UV 코팅 자작합판의 공정 흐름과 하도·상도의 역할 및 사용 목적 차이를 시각화'
    : isBirchOrderGradeGuide
    ? '- 주문 가능한 복합 등급을 독립 카드로 나누고 앞면·뒷면의 표면 차이만 시각화'
    : isBirchStockGuide
      ? '- 재고 상품 S/BB의 앞면 S와 뒷면 BB를 단일 상품 설명형으로 시각화'
      : '- 단면 구조, 구조 상세 확대, 핵심 구조 키워드만 시각화';
  const typeBFirstSection = isUvBirchFinishCompare
    ? `1단: UV 코팅 공정 흐름
- "원판 → 샌딩 → UV 하도 → UV 상도"를 순서대로 연결한다.
- 자작합판 원판에서 최종 UV 마감까지 공정 단계가 한눈에 보이게 한다.
- 합판 단면 확대와 앞면·뒷면 등급 카드를 생성하지 않는다.`
    : isBirchOrderGradeGuide
    ? `1단: 주문 가능 복합 등급 카드
${buildBirchOrderGradeCardGuide(knowledge.availableSurfaceGrades)}
- 각 카드는 독립 항목으로 두고 앞면과 뒷면을 분리한다.
- 여러 등급을 한쪽 VS 대상이나 하나의 문자열로 묶지 않는다.`
    : isBirchStockGuide
      ? `1단: S/BB 재고 상품
- 앞면: S
- 뒷면: BB
- 슬래시 앞은 앞면, 뒤는 뒷면 표면 등급임을 표시한다.
- 현재 상품/공급사 기준으로만 설명하고 VS를 생성하지 않는다.`
      : `1단: 단면 구조 메인
- "${getProductKnowledgeStructure(data, knowledge)}"을 기반으로 큰 단면 도해 또는 분해도를 생성
- 레이어, 코어, 표면층, 접합부 등 실제 존재하는 구조 포인트만 시각화
- 라벨은 3개 이하
- 긴 설명문 금지`;
  const typeBSecondSection = isUvBirchFinishCompare
    ? `2단: UV 하도와 UV 상도의 표면·공정 차이
- UV 하도: 최종 마감 전 바탕 단계, 후속 도장 또는 추가 마감용, 표면 균일화 목적, 무광 또는 낮은 광택 느낌.
- UV 상도: 최종 UV 마감 완료 단계, 표면 보호를 위한 마감, 바로 사용하는 완성 마감 상태.
- 광택만 다르게 표현하지 않고 마감 완료 여부와 후속 작업 필요 여부를 구분한다.
- 상도를 두꺼운 투명막처럼 과장하거나 하도를 불량품처럼 표현하지 않는다.`
    : isBirchOrderGradeGuide
    ? `2단: 등급별 표면 차이
- 현재 상품/공급사 기준 B > S > BB > CP 순서로 표면 차이만 표현한다.
- B는 가장 깨끗하고 균일하게, S는 일부 패치·작은 옹이·색상 편차가 보이게 표현한다.
- BB는 S보다 패치·작은 옹이·필러 흔적·색상 편차가 한눈에 더 보이되 CP 수준으로 과장하지 않는다.
- CP는 BB보다 표면 보수·옹이·색상 편차가 더 보이되 구조적 파손처럼 표현하지 않는다.
- 같은 BB면은 모든 카드에서 동일한 표면 품질로 고정한다.`
    : isBirchStockGuide
      ? `2단: 앞면·뒷면 표면
- S 앞면은 BB 뒷면보다 깨끗하고 패치·옹이가 적게 보이도록 표현한다.
- BB 뒷면은 S보다 패치·옹이·색상 편차가 더 보이되 CP 수준으로 과장하지 않는다.
- 노출면은 S면을 우선 확인하고 실제 표면 상태는 입고 제품 기준으로 확인한다.
- 패치 개수·크기·직경을 숫자로 생성하지 않는다.`
      : `2단: 구조 상세 확대 영역
${typeBDetailInstruction}`;
  const typeBThirdSection = isUvBirchFinishCompare
    ? `3단: 사용 목적 차이
- UV 하도: 후속 도장·추가 마감 작업을 위한 바탕 단계.
- UV 상도: 별도 추가 마감 없이 사용하는 최종 마감 단계.
- 방수, 긁힘 방지, 내구성 보장, 구조 강도 우위 표현과 단면 구조 반복을 금지한다.`
    : isBirchOrderGradeGuide
    ? `하단 안내:
- 표면 등급은 외관 기준이며 구조 강도와 별개임을 표시한다.
- 주문 시 앞면·뒷면 등급 조합을 확인하도록 안내한다.
- 실제 표면 상태는 입고 제품 기준으로 확인한다고 표시한다.`
    : isBirchStockGuide
    ? `3단 생성 금지:
- 등급 안내는 위 두 영역으로만 구성하고 빈 공간을 다른 문장으로 채우지 않는다.
- 강도·내구성·구조 성능 비교와 임의 등급을 생성하지 않는다.`
    : `3단: 핵심 구조 키워드
- 3개 또는 4개 카드형 키워드 구성
- "${removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge)}"과 "${getProductKnowledgeStructure(data, knowledge)}"에서 구조 키워드만 추출
- 단일 제품의 구조 키워드 카드만 사용
- 아이콘은 단순하게
- 긴 설명문 금지`;
  const typeBSingleStructureGuard = isUvBirchFinishCompare
    ? `- UV 하도와 상도의 공정 역할만 표현하고 합판 단면·앞뒷면·등급 카드를 생성하지 않는다.
- S/BB·B/BB 등 표면 등급 비교와 일반 자작합판 등급 규칙을 적용하지 않는다.`
    : isBirchOrderGradeGuide || isBirchStockGuide
    ? '- 하나의 자작합판 상품 안에서 등급 표면만 안내하고 다른 제품이나 소재를 생성하지 않는다.'
    : `- 단일 제품의 단면 구조만 표현
- 하단은 단일 제품의 구조 키워드 카드만 사용
- Create infographic for ONE product only.
- Do not display any alternative material.
- The infographic must describe only one product.
- Middle section must contain enlarged structure detail views of the same product.
- Do not split the layout into left and right product sections.`;
  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

이 이미지는 카페24 상품 상세설명 HTML 안에 삽입되는 보조 이미지다.
광고 포스터가 아니라, 제품의 구조를 이해시키는 실무형 인포그래픽으로 만든다.

목표:
- 상세설명 HTML 텍스트와 중복 금지
${typeBGoalInstruction}
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

${typeBFirstSection}

${typeBSecondSection}

${typeBThirdSection}

절대 금지:
- 두 제품을 나란히 배치 금지
- 화면을 좌우로 분할하는 레이아웃 금지
${typeBSingleStructureGuard}
- 규격 표시 금지
- 두께 표시 금지
- 자작합판 복합 표면 등급 외 등급 표시 금지
- 제조사 표시 금지
- 용도 표시 금지
- 제품명을 제목이나 설명문으로 반복 금지
${typeBRepeatedHtmlBan}
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
  const knowledge = buildProductKnowledgeContext(data);
  const typeCProductLabel = String(data && data.productName || '') + ' ' + String(data && data.category || '');
  const isGluedWoodTypeC = (
    typeCProductLabel.indexOf('집성목') !== -1 || typeCProductLabel.indexOf('집성판') !== -1
  );
  const typeCFirstTitle = isGluedWoodTypeC ? '외관' : '1단: 표면 질감 클로즈업';
  const typeCSecondTitle = isGluedWoodTypeC ? '핵심 비교' : '2단: 표면 비교';
  const typeCThirdTitle = isGluedWoodTypeC ? '선택 포인트' : '3단: 핵심 질감 키워드';
  const typeCFirstInstruction = isGluedWoodTypeC
    ? `- 제품 표면을 크게 보여주는 기존 이미지 중심 구성을 유지
- 결, 색감, 표면 질감 중 입력 근거가 있는 시각 정보만 최대 2개 사용
- 향은 시각 정보가 아니므로 제외
- 결 / 무늬 / 결감, 색감 / 색상 톤, 표면 질감 / 촉감 / 표면감은 각각 같은 정보로 보고 한 번만 사용`
    : `- "${removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge)}"을 중심으로 제품 표면 질감을 크게 보여준다.
- 나뭇결, 엠보, 코팅감, 광택감, 무늬를 자연스럽게 표현
- 라벨은 3개 이하`;
  const typeCSecondInstruction = isGluedWoodTypeC
    ? `- 외관 영역에서 사용한 결, 색감, 질감, 향은 반복하지 않는다.
- 폭 방향 집성 방식, 목재 스트립 구성, 집성 접합부, 목재 결 방향, 수종 차이 중 입력 근거가 있는 내용만 최대 2개 사용
- 집성 접합 / 폭 방향 접합 / 집성부는 같은 정보로 보고 한 번만 사용
- 정보가 부족하면 항목 수를 줄이고 외관 유의어로 보충하지 않는다.`
    : `- 비교 차이는 2~3개 짧은 키워드로 표현`;
  const typeCThirdInstruction = isGluedWoodTypeC
    ? `- 기존 카드 디자인을 유지하고 접합부 상태 확인, 재단 방향, 표면 상태, 마감 여부 중 입력 근거가 있는 항목만 최대 2개 사용
- 기존의 단순한 아이콘 표현을 유지하고 새로운 카드나 레이아웃을 만들지 않는다.
- 외관과 핵심 비교에서 사용한 정보는 반복하지 않는다.
- 활용 예시, 추천 가구, 아동가구, 테이블 등 용도를 생성하지 않는다.
- 정보가 부족하면 카드 수를 줄이고 유의어나 설명 문장으로 빈 공간을 채우지 않는다.`
    : `- 3개 또는 4개 카드형 키워드 구성
- "${removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge)}"과 "${removeUnsupportedPlywoodAdhesiveText(data.emphasis, knowledge)}"에서 질감 관련 키워드만 추출하여 명사형으로 배치
- 아이콘은 단순하게 표현`;
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

${typeCFirstTitle}
${typeCFirstInstruction}
- 긴 설명문 금지

${typeCSecondTitle}
- 좌우 비교 구조
- 왼쪽 라벨: "${data.compareTarget}"
- 오른쪽 라벨: "${data.productName}"
- 제품명은 이 비교 라벨에서만 1회 허용
${typeCSecondInstruction}
- 긴 설명문 금지

${typeCThirdTitle}
${typeCThirdInstruction}
- 긴 설명문 금지

절대 금지:
- 규격(mm), 두께(T), 자작합판 복합 표면 등급 외 등급(E1 등), 제조사, 용도 표시 금지
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
  const knowledge = buildProductKnowledgeContext(data);
  const safeKeyValue = removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.keyValue, knowledge));
  const safeStructure = removeCommerceRemedyGuidance(getProductKnowledgeStructure(data, knowledge));
  const safeEmphasis = removeCommerceRemedyGuidance(removeUnsupportedPlywoodAdhesiveText(data.emphasis, knowledge));

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
- define 예시1: 얇은 목재 단판을 여러 겹 적층한 합판입니다. 인테리어 가구 심재와 벽체 바탕재에 사용됩니다.
- define 예시2: 목재 섬유를 고온고압으로 성형한 판재입니다. 가구 제작과 인테리어 마감 작업에 사용됩니다.
- define 예시3: 천연 석고를 압축 성형한 판재입니다. 벽체와 천장 시공에 사용됩니다.
- define 예시4: PF보드는 페놀수지 발포 단열재입니다. 외벽과 천장 단열 시공에 사용됩니다.
- define 생성 후 금지 표현이 포함되어 있으면 다시 작성한다.
- Product Knowledge Context가 있는 경우 시트의 일반 표현보다 해당 Context를 우선한다.
- 자작합판은 얇은 목재 단판의 여러 겹 적층, 앞·뒷면 표면 등급, 노출면 중심으로 작성한다.
- 자작합판 복합 표면 등급은 구조 성능이나 강도와 연결하지 않는다.
- 현재 운영 상품/공급사 자작합판에 한해서만 B=최상급, S=상급, BB=중급, CP=하급 표면 기준을 사용한다.
- 모든 제조사에 등급 기준을 일반화하지 않고 패치 개수·크기·직경·수치와 전층 자작 구조를 근거 없이 생성하지 않는다.
- 일반 합판류에는 접착제, 접착층, 접착부, Glue Line, 본드층, 접착 구조를 작성하지 않는다.
- 접착 성능 근거가 있는 합판만 "내수성이 고려된 접착 성능" 수준으로 작성할 수 있다.
${buildGeneratedContentRemedyGuard()}
- 수지명, 완전 방수, 외부 영구 사용 표현을 작성하지 않는다.

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
핵심표현: ${safeKeyValue}
출처: ${data.source}
구조: ${safeStructure}
강조포인트: ${safeEmphasis}
용도1: ${data.use1}
용도2: ${data.use2}

[Product Knowledge Context]
productGroup: ${knowledge.productGroup}
productType: ${knowledge.productType}
surfaceGrade: ${knowledge.surfaceGrade || '확인 근거 없음'}
faceGrade: ${knowledge.faceGrade || '확인 근거 없음'}
backGrade: ${knowledge.backGrade || '확인 근거 없음'}
hasAdhesiveEvidence: ${knowledge.hasAdhesiveEvidence}

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
