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
  IMAGE_URL_2: 17,
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
  let prompt;
  try {
    prompt = buildInfographicPrompt(data);
  } catch (e) {
    setError(sheet, row, e && e.message ? e.message : String(e));
    return;
  }

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

  const isGluedWoodHtml = Boolean(entityData.productKnowledge && entityData.productKnowledge.gluedWood);
  const sectionTitle = isGluedWoodHtml ? '표면과 집성 구조' : ({
    A: '구조와 수치 비교',
    B: '단면 구조 분석',
    C: '표면 질감 비교'
  }[data.type] || '제품 상세 정보');

  const infraImg = buildInfographicHtml(data, sectionTitle, true);

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

  const schemaDefine = content.define;
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
.ds-infographic-stack{display:block;margin:0;padding:0;line-height:0;gap:0;}
.ds-infographic-stack img{display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;}
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
  const gradeRowHtml = !isGluedWoodHtml && shouldDisplayGrade(data.grade)
    ? `    <tr><th>${gradeLabel}</th><td>${data.grade}</td></tr>`
    : '';
  const gluedWoodSpecRows = isGluedWoodHtml ? buildGluedWoodSpecRowsHtml(data) : '';
  const faqItems = buildFAQItems(data, defaultNotes);
  const faqHtml = buildFAQHtml(faqItems);
  const schemaHtml = buildSchemaHtml(data, isGsNaturalWaterResistantGypsumBoard(data) ? schemaDefine : content.define, faqItems);
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
${gluedWoodSpecRows}
${cleanEntityValue(data.maker) ? `    <tr><th>제조사</th><td>${escapeHtml(data.maker)}</td></tr>` : ''}
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
  content = normalizeGluedWoodAutoFillContent(content, data);

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

function cleanInfographicAltFact(value, productName) {
  let text = removeCommerceRemedyGuidance(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (productName) text = text.split(productName).join(' ').replace(/\s{2,}/g, ' ').trim();
  text = text
    .replace(/(?:확인합니다|활용됩니다|선택됩니다|선택할 수 있습니다|사용됩니다|적합합니다)[.!]?$/g, '')
    .replace(/[.!?。]+$/g, '')
    .replace(/^[-–—:：·,\s]+|[-–—:：·,\s]+$/g, '')
    .trim();
  return text;
}

function limitInfographicAlt(text) {
  const value = String(text || '').replace(/\s{2,}/g, ' ').trim();
  if (value.length <= 120) return value;
  const shortened = value.slice(0, 120);
  const lastSpace = shortened.lastIndexOf(' ');
  return (lastSpace > 70 ? shortened.slice(0, lastSpace) : shortened).trim();
}

function isSafeInfographicAltFact(value, data) {
  const text = String(value || '');
  const needsSource = /강도|내구성|성능|인증|방수|내수|습기|뒤틀림|변형|수축|팽창|친환경|준불연|불연|난연|열전도율/i.test(text);
  return !needsSource || cleanEntityValue(data && data.source) !== '';
}

function collectInfographicAltFacts(data, productName, values) {
  const facts = [];
  (values || []).forEach(function (value) {
    const fact = cleanInfographicAltFact(value, productName);
    if (!fact || !isSafeInfographicAltFact(fact, data) || facts.indexOf(fact) !== -1) return;
    facts.push(fact);
  });
  return facts;
}

function hasTypeAAltPromptInstruction(value) {
  return /이미지\s*추천|표현해야|표현해야함|극대화|(?:^|\s)[123]단(?:에서는|:)|생성(?:한다|하지)|배치(?:한다|하지)|확대뷰|라벨은|금지/.test(String(value || ''));
}

function getTypeAProductLabel(productName) {
  return cleanEntityValue(productName)
    .replace(/\(\s*([^)]*\/[^)]*)\s*\)/g, function (_, grades) {
      return ' ' + String(grades).split(/\s*,\s*/).join('·');
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getTypeASafeFeatureFact(data, productName) {
  return [data && data.keyValue, data && data.emphasis, data && data.structure]
    .map(function (value) { return cleanInfographicAltFact(value, productName); })
    .find(function (fact) {
      return fact && fact.length <= 90 && !hasTypeAAltPromptInstruction(fact) && isSafeInfographicAltFact(fact, data) &&
        /표면|단면|적층|단판|등급|코팅|필름|섬유|결|무늬|질감|규격|내수/.test(fact);
    }) || '';
}

function getTypeAComparisonTarget(data, productName) {
  const source = cleanEntityValue(data && data.compareTarget);
  if (!source || hasTypeAAltPromptInstruction(source)) return '';
  if (/고밀도|\bHDF\b/i.test(source)) return '고밀도 제품';
  if (/일반\s*합판/.test(source)) return '일반합판';
  return '';
}

function buildTypeABirchAlt(productLabel, data, imageIndex) {
  const grades = extractPlywoodSurfaceGrades(productLabel);
  const normalizedLabel = grades.length > 1
    ? '자작합판 ' + grades.filter(function (grade, index, values) { return values.indexOf(grade) === index; }).join('·')
    : productLabel;
  const description = normalizedLabel + '의 앞면과 뒷면 표면 등급 차이';
  return {
    role: Number(imageIndex) > 1 ? 'surface-grade-detail' : 'surface-grade',
    alt: limitInfographicAlt(description + (Number(imageIndex) > 1 ? '를 설명하는 구조 인포그래픽' : '를 비교한 인포그래픽'))
  };
}

function buildTypeAInfographicAlt(data, productName, imageIndex, knowledge) {
  const productLabel = getTypeAProductLabel(productName) || '제품';
  const featureFact = getTypeASafeFeatureFact(data, productName);
  const comparisonTarget = getTypeAComparisonTarget(data, productName);
  const isBirch = Boolean(knowledge && knowledge.isBirchPlywood);

  if (isUvCoatedBirchFinishCompare(data)) {
    const description = productLabel + '의 상도와 하도 마감 차이';
    return {
      role: Number(imageIndex) > 1 ? 'finish-detail' : 'finish-comparison',
      alt: limitInfographicAlt(description + (Number(imageIndex) > 1 ? '를 설명하는 구조 인포그래픽' : '를 비교한 인포그래픽'))
    };
  }
  if (isBirch) return buildTypeABirchAlt(productLabel, data, imageIndex);
  if (comparisonTarget) {
    const description = productLabel + getAndParticle(productLabel) + ' ' + comparisonTarget + '의 특성';
    return {
      role: Number(imageIndex) > 1 ? 'comparison-detail' : 'comparison',
      alt: limitInfographicAlt(description + (Number(imageIndex) > 1 ? '을 설명하는 구조 인포그래픽' : '을 비교한 인포그래픽'))
    };
  }
  if (/내수/.test(productLabel)) {
    const description = productLabel + '의 규격과 내수 기준';
    return {
      role: Number(imageIndex) > 1 ? 'detail' : 'overview',
      alt: limitInfographicAlt(description + (Number(imageIndex) > 1 ? '을 설명하는 구조 인포그래픽' : '을 설명하는 인포그래픽'))
    };
  }
  if (featureFact) {
    const description = productLabel + '의 ' + featureFact;
    return {
      role: Number(imageIndex) > 1 ? 'feature-detail' : 'feature',
      alt: limitInfographicAlt(description + getObjectParticle(description) + (Number(imageIndex) > 1 ? ' 설명하는 구조 인포그래픽' : ' 보여주는 인포그래픽'))
    };
  }
  return {
    role: Number(imageIndex) > 1 ? 'detail' : 'overview',
    alt: limitInfographicAlt(productLabel + '의 구조를 설명하는 인포그래픽')
  };
}

function isRauanGakjaeProduct(data) {
  return cleanEntityValue(data && data.productName).replace(/\s+/g, '') === '라왕각재';
}

function isGsNaturalWaterResistantGypsumBoard(data) {
  return cleanEntityValue(data && data.productName) === 'GS자이 천연 방수석고보드';
}

function getProductSpecificInfographicAlt(data, productName, imageIndex) {
  const name = cleanEntityValue(productName);
  const detail = Number(imageIndex) > 1;
  const describe = function (description, comparison) {
    if (comparison) return limitInfographicAlt(description + getObjectParticle(description) + ' 비교한 인포그래픽');
    return limitInfographicAlt(description + getObjectParticle(description) + (detail ? ' 설명하는 구조 인포그래픽' : ' 보여주는 인포그래픽'));
  };
  if (isRauanGakjaeProduct(data)) {
    const description = '라왕 각재의 라왕다루끼·후지·심재 옵션';
    return detail ? describe(description, false) : describe(description, true);
  }
  if (name === 'CRC보드') return describe('CRC보드의 회백색 무기질 표면과 균일한 판재 단면');
  if (/^LVL\s*합판각재$/i.test(name)) return describe('LVL 합판각재의 길이 방향 단판 적층 구조');
  if (name === 'GS자이 천연 방수석고보드') return describe('GS자이 천연 방수석고보드의 방수 처리 원지 표면과 석고보드 구조');
  if (name === '라디에타파인 계단재') return describe('라디에타파인 계단재의 밝은 원목 색감과 곧은 소나무 결, 집성판 구조');
  if (name === '자나무(미장용)') return describe('자나무(미장용)의 목재 표면과 미장 작업용 판재 형태');
  if (/^소송\s*각재\s*\(KD\)$/i.test(name)) return '소송 각재 (KD)의 사각 단면과 규격별 각재 형태를 보여주는 인포그래픽';
  if (name === '뉴송 각재') return describe('뉴송 각재의 사각 단면과 목재 결이 보이는 각재 형태');
  return '';
}

function hasTypeBAltPromptInstruction(value) {
  return /이미지\s*추천|표현해야|표현해야함|얇게\s*표현|두껍게\s*표현|극대화|(?:^|\s)[123]단(?:에서는|:)|가로\s*\/\s*세로|코어층\s*표현|라미네이팅[^.!?\n]{0,80}표현해야|생성(?:한다|하지)|배치(?:한다|하지)|확대뷰|라벨은|금지/.test(String(value || ''));
}

function getTypeBSafeAltFact(value, data, productName) {
  const fact = cleanInfographicAltFact(value, productName);
  if (!fact || fact.length > 100 || hasTypeBAltPromptInstruction(fact)) return '';
  if (!isSafeInfographicAltFact(fact, data)) return '';
  return /표면|나뭇결|결|무늬|단면|적층|단판|필름|코팅|브러싱|엠보|곡면|유연|휘어|접합|구조|방향/.test(fact) ? fact : '';
}

function buildTypeBAltVisualFacts(data, knowledge, productName) {
  const sourceText = [data && data.productName, data && data.keyValue, data && data.emphasis, data && data.structure, data && data.compareTarget]
    .map(function (value) { return cleanEntityValue(value); })
    .join(' ');
  const facts = [];
  const add = function (fact) {
    if (fact && facts.indexOf(fact) === -1) facts.push(fact);
  };

  if (/오징어합판|아로합판|곡면\s*시공|유연한\s*구조/.test(sourceText)) {
    add('단판 배열과 곡면 시공이 가능한 유연한 구조');
  }
  if (/낙엽송[^\n]{0,40}(?:엠보|브러싱)|(?:엠보|브러싱)[^\n]{0,40}낙엽송/.test(sourceText)) {
    add('브러싱 표면과 입체적인 나뭇결');
  }
  if (/백색[^\n]{0,40}(?:코팅|필름)|(?:코팅|필름)[^\n]{0,40}백색|(?:포리|polyester)\s*(?:필름|코팅)|라미네이팅/.test(sourceText)) {
    add('백색 필름 표면');
  }

  const structure = getProductKnowledgeStructure(data, knowledge);
  const safeStructure = getTypeBSafeAltFact(structure, data, productName);
  if (safeStructure) add(safeStructure);

  [data && data.keyValue, data && data.emphasis, data && data.compareTarget, data && data.structure].forEach(function (value) {
    const fact = getTypeBSafeAltFact(value, data, productName);
    if (fact) add(fact);
  });
  return facts.slice(0, 2);
}

function getTypeBAltLead(sourceText) {
  if (/오징어합판|아로합판/.test(sourceText)) return '오징어합판의 ';
  if (/낙엽송[^\n]{0,40}(?:엠보|브러싱)|(?:엠보|브러싱)[^\n]{0,40}낙엽송/.test(sourceText)) return '낙엽송 엠보합판의 ';
  if (/백색[^\n]{0,40}(?:코팅|필름)|(?:코팅|필름)[^\n]{0,40}백색/.test(sourceText)) return '백색 코팅합판의 ';
  return '';
}

function buildTypeBInfographicAlt(data, knowledge, productName, imageIndex) {
  const sourceText = [data && data.productName, data && data.keyValue, data && data.emphasis, data && data.structure, data && data.compareTarget]
    .map(function (value) { return cleanEntityValue(value); })
    .join(' ');
  const facts = buildTypeBAltVisualFacts(data, knowledge, productName);
  const lead = getTypeBAltLead(sourceText);
  const primaryFact = facts[0] || '제품 구조';
  const secondaryFact = facts[1] || '';

  if (Number(imageIndex) > 1) {
    if (secondaryFact) return { role: 'structure-detail', alt: limitInfographicAlt(secondaryFact + getObjectParticle(secondaryFact) + ' 설명하는 구조 인포그래픽') };
    return { role: 'structure-detail', alt: limitInfographicAlt(lead + primaryFact + getObjectParticle(primaryFact) + ' 설명하는 구조 인포그래픽') };
  }
  if (lead) return { role: 'feature', alt: limitInfographicAlt(lead + primaryFact + getObjectParticle(primaryFact) + ' 보여주는 인포그래픽') };
  if (secondaryFact) return { role: 'feature', alt: limitInfographicAlt(primaryFact + getAndParticle(primaryFact) + ' ' + secondaryFact + getObjectParticle(secondaryFact) + ' 보여주는 인포그래픽') };
  return { role: 'structure', alt: limitInfographicAlt(lead + primaryFact + getObjectParticle(primaryFact) + ' 보여주는 인포그래픽') };
}

function getNonGluedTypeCSurfaceFact(data, productName) {
  const sourceText = [data && data.productName, data && data.keyValue, data && data.emphasis, data && data.grade, data && data.structure]
    .map(function (value) { return cleanEntityValue(value); })
    .join(' ');
  if (/오징어합판|아로합판|곡면\s*시공|유연한\s*구조/.test(sourceText)) return '단판 배열과 곡면 시공이 가능한 유연한 구조';
  if (/엠보|브러싱/.test(sourceText)) return '브러싱 표면과 입체적인 나뭇결';
  if (/양면무절/.test(sourceText)) return '깨끗한 무절 표면과 밝은 나뭇결';
  if (/무절/.test(sourceText)) return '깨끗한 무절 표면과 자연스러운 나뭇결';
  if (/(?:유절|옹이)/.test(sourceText)) return '자연스러운 나뭇결과 옹이가 드러나는 표면 질감';

  const fact = [data && data.keyValue, data && data.emphasis, data && data.grade]
    .map(function (value) { return cleanInfographicAltFact(value, productName); })
    .find(function (value) {
      return value && value.length <= 90 && isSafeInfographicAltFact(value, data) && /표면|나뭇결|결\b|무늬|질감|색감|색상|코팅|광택|브러싱|엠보/.test(value);
    }) || '';
  return fact;
}

function buildNonGluedTypeCInfographicAlt(data, productName, imageIndex) {
  const surfaceFact = getNonGluedTypeCSurfaceFact(data, productName) || '표면 특징';
  const lead = productName + '의 ';
  if (Number(imageIndex) > 1) {
    return limitInfographicAlt(lead + surfaceFact + getObjectParticle(surfaceFact) + ' 설명하는 인포그래픽');
  }
  return limitInfographicAlt(lead + surfaceFact + getObjectParticle(surfaceFact) + ' 보여주는 인포그래픽');
}

function buildInfographicSemanticInfo(data, sectionTitle, imageIndex) {
  const productName = cleanEntityValue(data && data.productName) || '제품';
  const type = cleanEntityValue(data && data.type);
  const index = Number(imageIndex) || 1;
  const knowledge = buildProductKnowledgeContext(data);

  const specificAlt = getProductSpecificInfographicAlt(data, productName, index);
  if (specificAlt) return { role: index > 1 ? 'detail' : 'overview', alt: specificAlt };

  if (knowledge.isGeneralImportedPlywood && knowledge.generalPlywood) {
    return index === 2
      ? { role: 'guide', alt: '일반합판의 원산지별 특징과 표면·측면·재단면을 비교한 인포그래픽' }
      : { role: 'overview', alt: '일반합판의 적층 구조와 고급합판·콤비·알비자·MLH 구성을 보여주는 인포그래픽' };
  }

  if (type === 'A') return buildTypeAInfographicAlt(data, productName, index, knowledge);

  if (type === 'B') return buildTypeBInfographicAlt(data, knowledge, productName, index);

  if (type === 'C') {
    const gluedWoodFacts = buildGluedWoodHtmlFacts(data);
    if (gluedWoodFacts) {
      return { role: index > 1 ? 'structure-detail' : 'surface', alt: buildGluedWoodInfographicAlt(data, index) };
    }
    return {
      role: index > 1 ? 'surface-detail' : 'surface',
      alt: buildNonGluedTypeCInfographicAlt(data, productName, index)
    };
  }

  return index > 1
    ? { role: 'detail', alt: '제품 특징을 보여주는 상세 인포그래픽' }
    : { role: 'overview', alt: '제품 특징을 설명하는 인포그래픽' };
}

function buildInfographicHtml(data, sectionTitle, withVersion) {
  const firstUrl = cleanEntityValue(data && data.infographic);
  const secondUrl = cleanEntityValue(data && data.infographic2);
  if (!firstUrl) return '';
  const resolveUrl = function (url) { return escapeHtml(withVersion ? appendImageVersion(url) : url); };
  const firstAlt = escapeHtml(buildInfographicSemanticInfo(data, sectionTitle, 1).alt);
  if (!secondUrl) {
    return `<div class="ds-infographic"><img src="${resolveUrl(firstUrl)}" alt="${firstAlt}" style="max-width:100%;width:100%;height:auto;display:block;margin:0;"></div>`;
  }
  const secondAlt = escapeHtml(buildInfographicSemanticInfo(data, sectionTitle, 2).alt);
  return `<div class="ds-infographic-stack"><img src="${resolveUrl(firstUrl)}" alt="${firstAlt}" style="display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;"><img src="${resolveUrl(secondUrl)}" alt="${secondAlt}" style="display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;"></div>`;
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
    infographic2: sheet.getRange(row, COL.IMAGE_URL_2).getValue(),
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

function getGeneralImportedPlywoodKnowledge(data) {
  const productName = cleanEntityValue(data && data.productName).replace(/\s+/g, ' ');
  const match = productName.match(/^일반합판\(수입산\)\s+(4\*8|3\*6)$/);
  if (!match || !/^BB\s*\/\s*CC$/i.test(cleanEntityValue(data && data.grade))) return null;

  const format = match[1];
  return {
    productType: 'GENERAL_PLYWOOD_BBCC',
    format: format,
    currentGrade: 'BB/CC',
    currentOrigin: '인도네시아 또는 베트남',
    definition: '얇은 목재 베니어를 여러 겹 교차 적층하여 제작하는 일반합판',
    whyUsed: '일반합판은 가구 심재, 인테리어 제작, 벽체·천장 바탕재와 건축 바닥 작업 등 다양한 용도로 사용합니다. 사용 목적에 맞는 구성을 선택하면 작업성과 경제성을 함께 고려할 수 있습니다.',
    gradeGuide: '고급합판(BB/CC)은 업계에서 고급합판으로 통용되며 일반적으로 가장 많이 선택되는 일반합판입니다. 표면 상태가 우수하여 가구 및 인테리어 제작에 많이 사용되고, 일반합판 제품군에서 상위 등급으로 많이 선택되는 제품입니다.',
    selectionNotice: '고급합판(BB/CC)은 라왕계열 베니어 중심 구성으로 가구·인테리어 제작에 많이 사용합니다. 콤비는 라왕계열과 알비자계열의 혼합 구성으로 품질과 경제성을 함께 고려할 때 선택합니다. 알비자는 비교적 가벼워 실외 거푸집, 포장재와 임시 구조물에 많이 사용하며 경제성을 고려할 때 선택하는 일반합판입니다. MLH는 여러 수종을 혼합하여 제작하는 일반합판으로 일반 건축 및 다양한 용도에 사용합니다.',
    selectionGuide: [
      { name: '고급합판(BB/CC)', veneer: '라왕계열 베니어 중심 구성', feature: '표면 상태가 우수한 고급합판', use: '가구·인테리어 제작' },
      { name: '콤비', veneer: '라왕계열과 알비자계열 베니어의 혼합 구성', feature: '품질과 경제성을 함께 고려하는 일반합판', use: '가구 심재와 인테리어 바탕 작업' },
      { name: '알비자', veneer: '알비자계열 베니어 중심 구성', feature: '비교적 가볍고 경제성을 고려할 때 선택하는 일반합판', use: '실외 거푸집, 포장재와 임시 구조물' },
      { name: 'MLH', veneer: 'Mixed Light Hardwood 혼합 활엽수 구성', feature: '여러 수종을 혼합하여 제작하는 일반합판', use: '일반 건축 및 다양한 바탕 작업' }
    ],
    selectionCriteria: '사용 용도, 표면 상태, 내부 베니어 구성, 측면 적층, 재단면과 색상·무늬를 함께 살펴 용도에 맞는 일반합판을 선택합니다.',
    applications: ['가구 심재', '가구·인테리어 제작', '벽체·천장 바탕재', '일반 건축 바탕 작업'],
    originGuide: '일반합판은 동남아시아와 베트남 등 다양한 국가에서 생산됩니다. 동남아산은 비교적 정돈된 적층과 깔끔한 표면, 비교적 균일한 재단면이 나타나는 경우가 있습니다. 베트남산은 제품에 따라 베니어 배열, 표면 무늬와 색상, 측면 적층과 재단면에 편차가 나타날 수 있습니다. 원산지와 함께 실제 제품의 구성과 상태를 확인하면 제품 선택에 도움이 됩니다.',
    originChecks: ['베니어 구성', '표면 상태', '측면 적층', '재단면'],
    originComparison: {
      southeastAsia: ['내부 층이 비교적 정돈되고 균일하게 적층된 대표적인 사례', '표면의 패치·요철이 비교적 적은 대표적인 사례', '측면 적층선이 비교적 일정하고 공극이 적은 대표적인 사례', '재단면의 벌어짐이 비교적 적고 정돈된 대표적인 사례'],
      vietnam: ['내부 베니어 두께와 배열에 일부 편차가 보이는 대표적인 사례', '표면 색상·무늬·패치 편차가 더 보이는 대표적인 사례', '측면 적층선에 일부 겹침·공극·불균일이 보이는 대표적인 사례', '재단면에 일부 뜯김·벌어짐·거친 부분이 보이는 대표적인 사례'],
      conclusion: '일반합판은 동남아시아와 베트남 등 다양한 국가에서 생산됩니다. 원산지와 함께 실제 제품의 구성과 상태를 확인하면 제품 선택에 도움이 됩니다.'
    },
    checks: ['표면 베니어 상태', '측면 적층 상태', '재단면', '공극·겹침', '두께 편차', '색상·무늬 편차']
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
  const generalPlywood = getGeneralImportedPlywoodKnowledge(data);
  const isEboard = isEboardProduct(data);
  const isGcsBoard = isGcsBoardProduct(data);
  const isCrcBoard = isCrcBoardProduct(data);
  const isWoodWoolBoard = isWoodWoolBoardProduct(data);
  const isReflectiveInsulation = isReflectiveInsulationProduct(data);
  const resolvedProductGroup = isCrcBoard
    ? 'CRC_BOARD'
    : isWoodWoolBoard
    ? 'WOOD_WOOL_BOARD'
    : isReflectiveInsulation
    ? 'REFLECTIVE_INSULATION'
    : isEboard || isGcsBoard
    ? 'COMPOSITE_BOARD'
    : getFAQCategoryType(data);
  const resolvedProductType = isCrcBoard
    ? 'CRC_BOARD'
    : isWoodWoolBoard
    ? 'WOOD_WOOL_BOARD'
    : isReflectiveInsulation
    ? 'REFLECTIVE_INSULATION'
    : isEboard
    ? 'EBOARD'
    : isGcsBoard
    ? 'GCS_BOARD'
    : generalPlywood
    ? generalPlywood.productType
    : isBirchPlywood
    ? 'BIRCH_PLYWOOD'
    : isPlywood
    ? 'PLYWOOD'
    : 'DEFAULT';
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
    productGroup: resolvedProductGroup,
    productType: resolvedProductType,
    manufacturer: cleanEntityValue(data && data.maker),
    compareTarget: cleanEntityValue(data && data.compareTarget),
    surfaceGrade: grade ? grade.surfaceGrade : '',
    faceGrade: grade ? grade.faceGrade : '',
    backGrade: grade ? grade.backGrade : '',
    hasAdhesiveEvidence: isWaterResistantPlywood,
    isBirchPlywood: isBirchPlywood,
    isGeneralImportedPlywood: Boolean(generalPlywood),
    generalPlywood: generalPlywood,
    isWaterResistantPlywood: isWaterResistantPlywood,
    hasMdfInput: mdfEvidenceLabel.indexOf('mdf') !== -1 || mdfEvidenceLabel.indexOf('엠디에프') !== -1,
    stockType: stockType,
    availableSurfaceGrades: availableSurfaceGrades,
    gluedWood: addGluedWoodJointMatch(data, resolveGluedWoodProductKnowledge(data))
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
  if (isCrcBoardProduct(data)) {
    return '규산칼슘계 원료로 성형한 균일한 무기질 판재';
  }
  if (isWoodWoolBoardProduct(data)) {
    return '길고 가는 목재 섬유를 무기질 결합재로 성형한 개방형 표면의 평판';
  }
  if (isReflectiveInsulationProduct(data)) {
    return '은색 알루미늄 반사면과 발포 폴리에틸렌층을 결합한 롤·시트형 단열재';
  }
  if (isEboardProduct(data)) {
    return 'PP 중공 구조판과 단열재를 결합한 복합보드';
  }
  if (isGcsBoardProduct(data)) {
    return '준불연 단열재와 시멘트계 면재를 결합한 복합보드';
  }
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

function normalizeGluedWoodAutoFillContent(content, data) {
  const gluedWood = addGluedWoodJointMatch(data, resolveGluedWoodProductKnowledge(data));
  if (!gluedWood) return content;
  const next = Object.assign({}, content || {});
  const species = gluedWood.species;
  const joint = gluedWood.joint;
  const verifiedUses = resolveVerifiedGluedWoodProductUses(data);

  if (!cleanEntityValue(data && data.keyValue)) {
    next.keyValue = species.identificationLevel === 'TRADE_NAME_UNVERIFIED' || species.identificationLevel === 'UNKNOWN'
      ? '집성 목재 판재'
      : species.standardName + (species.identificationLevel === 'GROUP' ? ' 계열 수종을 사용한 집성판' : ' 수종을 사용한 집성판');
  }
  if (!cleanEntityValue(data && data.structure)) next.structure = joint.structure;
  if (!cleanEntityValue(data && data.emphasis)) {
    const checks = (species.purchaseChecks || []).slice(0, 2).concat((joint.checks || []).slice(0, 1));
    next.emphasis = checks.join(', ') + ' 확인';
  }

  // I열은 기존 입력만 보존하고, L/M은 exact 상품의 검증된 운영 데이터로만 빈 셀을 보완한다.
  if (!cleanEntityValue(data && data.source)) next.source = '';
  next.use1 = cleanEntityValue(data && data.use1)
    ? data.use1
    : verifiedUses ? verifiedUses.use1 : '';
  next.use2 = cleanEntityValue(data && data.use2)
    ? data.use2
    : verifiedUses ? verifiedUses.use2 : '';
  return next;
}

function addGluedWoodJointMatch(data, gluedWood) {
  if (!gluedWood) return null;
  const productName = String(data && data.productName || '').toLowerCase();
  gluedWood.joint.matched = [
    '솔리드', 'solid', '사이드핑거', '사이드 핑거', 'side finger',
    '탑핑거', '탑 핑거', 'top finger', 'finger joint', 'finger', 'fj'
  ].some(function (keyword) { return productName.indexOf(keyword) !== -1; });
  return gluedWood;
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
    category: cleanEntityValue(data.category),
    productGroup: productGroup,
    productType: knowledge.productType,
    productKnowledge: knowledge,
    keyValue: cleanEntityValue(removeCommerceRemedyGuidance(data.keyValue)),
    material: inferEntityMaterial(data, productGroup),
    structure: cleanEntityValue(removeCommerceRemedyGuidance(data.structure)),
    size: cleanEntityValue(data.size),
    thickness: cleanEntityValue(data.thickness),
    maker: cleanEntityValue(data.maker),
    use1: cleanEntityValue(data.use1),
    use2: cleanEntityValue(data.use2),
    uses: uses,
    installationCautions: cautions,
    compareProduct: cleanEntityValue(data.compareTarget),
    preorderChecks: preorderChecks
  };
}

function cleanHumanWritingText(text) {
  const generalPlywoodNameToken = 'GENERALPLYWOODBBCCNAME';
  const cleaned = limitAndUsage(removeCommerceRemedyGuidance(String(text || '').replace(/고급합판\(BB\/CC\)/g, generalPlywoodNameToken))
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
  return cleaned.replace(new RegExp(generalPlywoodNameToken, 'g'), '고급합판(BB/CC)');
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

  if (isRauanGakjaeProduct(entity)) {
    return [
      '라왕다루끼·후지·심재 중 필요한 단면 규격과 길이에 맞춰 선택합니다.',
      '세 옵션은 상품에서 선택 가능한 규격·형태 구분입니다.',
      '주문 전 옵션명, 단면 치수와 재단 여부를 함께 확인합니다.'
    ];
  }

  if (knowledge.gluedWood) {
    return buildGluedWoodAISummary(entity);
  }

  if (knowledge.isGeneralImportedPlywood && knowledge.generalPlywood) {
    const guide = knowledge.generalPlywood;
    const lines = [
      '목재 베니어를 여러 겹 교차 적층해 만든 판재입니다.',
      '가구 심재, 인테리어 제작과 벽체·천장 바탕 작업에 사용합니다.',
      '작업 목적과 마감 방식에 맞춰 규격과 표면 상태를 살펴 선택합니다.'
    ];
    return lines.map(filterAISummaryText);
  }

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

function getNominativeParticle(text) {
  const value = String(text || '').trim();
  if (!value) return '이';
  const lastChar = value.charCodeAt(value.length - 1);
  if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '가';
  return ((lastChar - 0xAC00) % 28) === 0 ? '가' : '이';
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
  if (isRauanGakjaeProduct(entity)) {
    return items(
      '라왕다루끼·후지·심재는 어떻게 선택하나요?',
      '세 옵션 중 필요한 단면 규격과 길이에 맞는 항목을 상품 옵션에서 선택합니다.',
      '옵션별 성능 차이가 있나요?',
      '현재 승인 데이터에는 옵션별 성능이나 우열 정보가 없으므로, 규격·형태 구분으로만 확인합니다.',
      '주문 전에 무엇을 확인해야 하나요?',
      '옵션명, 단면 치수, 길이와 재단 여부를 주문 조건에 맞춰 확인합니다.'
    );
  }
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

  if (knowledge.gluedWood) {
    const facts = buildGluedWoodHtmlFacts(entity);
    return buildGluedWoodConsultationFAQItems(facts, items);
  }

  if (knowledge.isGeneralImportedPlywood && knowledge.generalPlywood) {
    return items(
      '고급합판(BB/CC)은 어떤 제품인가요?',
      '표면 상태가 우수하여 가구와 인테리어 제작에 일반적으로 가장 많이 선택되는 일반합판입니다.',
      '일반합판은 어떤 종류를 많이 사용하나요?',
      '고급합판(BB/CC), 콤비, 알비자, MLH 등 용도와 예산에 따라 다양한 종류를 선택합니다.',
      '노출 마감용으로 사용할 때 무엇을 확인해야 하나요?',
      '표면 상태와 보수 여부를 먼저 확인하고 원하는 마감 품질에 맞는 제품을 선택하는 것이 좋습니다.'
    );
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
  const gluedWoodFacts = productKnowledge.gluedWood ? buildGluedWoodHtmlFacts(data) : null;
  const schemaDescription = gluedWoodFacts
    ? buildGluedWoodSchemaDescription(data)
    : productKnowledge.isGeneralImportedPlywood && productKnowledge.generalPlywood
    ? '목재 베니어를 교차 적층한 일반합판으로 가구와 인테리어 제작, 벽체·천장 바탕재에 사용합니다.'
    : String(defineText || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(data.productName || '').trim(),
    description: schemaDescription
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
  if (gluedWoodFacts) {
    if (gluedWoodFacts.jointLabel) {
      additionalProperty.push({ '@type': 'PropertyValue', name: '집성 방식', value: gluedWoodFacts.jointLabel });
    }
    const surfaceOptionText = gluedWoodFacts.surfaceOptions.map(function (option) { return option.title; }).join(' / ');
    if (surfaceOptionText) {
      additionalProperty.push({ '@type': 'PropertyValue', name: '표면 옵션', value: surfaceOptionText });
    }
    const jointOptionText = getGluedWoodJointOptionText(gluedWoodFacts);
    if (jointOptionText) {
      additionalProperty.push({ '@type': 'PropertyValue', name: '집성 방식 옵션', value: jointOptionText });
    }
  } else if (shouldDisplayGrade(data.grade)) {
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

function buildNonGluedTypeCEmphasisNote(cleanEmphasis, data) {
  if (!cleanEmphasis || cleanEntityValue(data && data.type) !== 'C') return '';
  const knowledge = buildProductKnowledgeContext(data);
  if (knowledge.gluedWood) return '';
  const sourceText = [data && data.category, data && data.productName, cleanEmphasis]
    .map(function (value) { return cleanEntityValue(value); })
    .join(' ');

  if (/오징어합판|아로합판|곡면|라운드/.test(sourceText)) {
    return '주문 전에는 필요한 곡률과 시공 방향을 먼저 확인하는 것이 좋습니다.';
  }
  if (/백색[^\n]{0,40}(?:코팅|면)|(?:코팅|시트지)[^\n]{0,40}백색/.test(sourceText)) {
    return '주문 전에는 백색 코팅면의 상태와 사용 방향을 먼저 확인하는 것이 좋습니다.';
  }
  if (/미송합판|내추럴|빈티지|목재\s*본연|분위기|연출/.test(sourceText)) {
    return '주문 전에는 원하는 목재 분위기에 맞는 표면 상태를 먼저 확인하는 것이 좋습니다.';
  }
  if (/표면|옹이|무절|유절|나뭇결|결\b|재단/.test(sourceText)) {
    return '주문 전에는 표면 상태와 재단면을 먼저 확인하는 것이 좋습니다.';
  }
  return '';
}

function buildEmphasisNote(cleanEmphasis, data) {
  if (!cleanEmphasis) return '';
  const label = String(data && data.category || '') + ' ' + String(data && data.productName || '');
  const rawEmphasis = String(data && data.emphasis || '');
  const nonGluedTypeCNote = buildNonGluedTypeCEmphasisNote(cleanEmphasis, data);
  if (nonGluedTypeCNote) return nonGluedTypeCNote;
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
  if (isGsNaturalWaterResistantGypsumBoard(data)) {
    return ['주문 전에는 습기가 많은 공간의 시공 위치와 마감 조건을 먼저 확인하는 것이 좋습니다.'];
  }
  if (isRauanGakjaeProduct(data)) {
    return [
      '• 라왕다루끼·후지·심재 중 필요한 옵션명을 먼저 정하세요.',
      '• 단면 치수와 길이를 작업 기준에 맞춰 확인하세요.',
      '• 재단이 필요하면 주문 조건에 함께 적어두세요.'
    ];
  }
  if (knowledge.gluedWood) {
    const facts = buildGluedWoodHtmlFacts(data);
    return buildGluedWoodPurchaseNotes(facts);
  }
  if (knowledge.isGeneralImportedPlywood && knowledge.generalPlywood) {
    return [
      '• 작업 용도에 맞는 합판 종류 선택',
      '• 필요한 규격과 두께 확인',
      '• 노출 마감 여부에 맞는 표면 상태 확인',
      '• 재단이 필요한 경우 치수 확인',
      '• 사용 환경에 맞는 제품 선택'
    ];
  }
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

function buildRauanGakjaeComparisonPrompt() {
  return `
추가 옵션 안내 — 라왕 각재:
- 기존 각재 인포그래픽의 제품 설명, 사각 단면 형태, 규격·길이·건조 상태·재단 확인과 기존 선택 정보를 그대로 유지한다.
- 기존 레이아웃 안에 라왕다루끼, 후지, 심재가 하나의 상품에서 선택 가능한 규격·형태 옵션임을 보조 정보로 추가한다.
- 세 옵션은 기존 각재 제품 이미지와 함께 자연스럽게 배치하고 옵션 카드 3개만 나열한 비교 화면으로 만들지 않는다.
- 각 카드에는 "라왕다루끼", "후지", "심재"만 정확히 표기한다.
- 옵션별 성능, 강도, 내구성, 품질, 가격 우열이나 승인되지 않은 용도를 추가하지 않는다.
- 단면 치수와 길이는 실제 입력값이 없는 한 숫자로 추정해 표기하지 않는다.
- 옵션명·단면 치수·길이·재단 여부 확인은 기존 선택 정보와 중복하지 않게 한 번만 보조 안내한다.
`;
}

function buildRubberwoodJointOptionComparisonPrompt() {
  return `
선택 가능한 집성 방식 추가 안내:
- 기존 고무나무 집성판 Type C 인포그래픽의 색감·나뭇결·여러 원목 부재를 이어 만든 구조·상판과 측면 형태·기존 구매 확인 정보와 레이아웃을 그대로 유지한다.
- 메인 영역에서 이미 설명한 탑핑거 구조와 확대 이미지를 하단에서 다시 복제하지 않는다.
- 하단에는 "선택 가능한 집성 방식"이라는 짧은 선택 안내만 둔다. "탑핑거 — 상판", "사이드핑거 — 측면"처럼 연결 무늬가 보이는 면만 한 줄씩 표기하고, 연결부 확대 이미지·상세 구조 설명·추가 사진은 넣지 않는다.
- 이 안내는 두 옵션을 비교하기 위한 보조 정보이며, 연결부 비교 화면만 단독으로 구성하지 않는다.
- 두 옵션 모두 기존 고무나무의 밝은 황갈색과 연한 베이지 계열 표면, 차분하고 고른 나뭇결을 유지한다.
- 강도, 내구성, 가격, 품질, 성능 우열을 만들지 않는다.
`;
}

function buildInfographicPrompt(data) {
  const knowledge = buildProductKnowledgeContext(data);
  const outputType = knowledge.productGroup === 'PLYWOOD' || (data.type === 'C' && knowledge.gluedWood) ? 'image' : '';
  const isVertical = isVerticalGeneralPlywoodInfographic(data);
  if (isVertical) {
    const images = buildGeneralImportedPlywoodTypeAPrompts(data).map(function (image) {
      return {
        key: image.key,
        prompt: image.prompt + buildGlobalImageReadabilityRule(true) + buildGeneratedContentRemedyGuard(outputType)
      };
    });
    return JSON.stringify({ version: 1, images: images });
  }
  let prompt = null;
  if (data.type === 'A') prompt = buildTypeAPrompt(data);
  if (data.type === 'B') prompt = buildTypeBPrompt(data);
  if (data.type === 'C') prompt = buildTypeCPrompt(data);
  const optionPrompt = isRauanGakjaeProduct(data) ? buildRauanGakjaeComparisonPrompt() : '';
  return prompt ? prompt + optionPrompt + buildGlobalImageReadabilityRule(false) + buildGeneratedContentRemedyGuard(outputType) : null;
}

function isVerticalGeneralPlywoodInfographic(data) {
  if (String(data && data.type || '').trim() !== 'A') return false;
  const productName = cleanEntityValue(data && data.productName).replace(/\s+/g, ' ');
  if (!/^일반합판\(수입산\) (?:4\*8|3\*6)$/.test(productName)) return false;
  const knowledge = buildProductKnowledgeContext(data);
  return Boolean(knowledge.generalPlywood && knowledge.generalPlywood.productType === 'GENERAL_PLYWOOD_BBCC');
}

function buildGlobalImageReadabilityRule(isVertical) {
  const canvasRule = isVertical
    ? '1024×1536px 세로형 상세페이지에서 PC와 모바일 모두 확대 없이 핵심 정보를 읽을 수 있는 충분한 텍스트 크기로 구성한다.'
    : '1024×1024 상세페이지에서 PC와 모바일 모두 확대 없이 핵심 정보를 읽을 수 있는 충분한 텍스트 크기로 구성한다.';
  return `

[GLOBAL IMAGE READABILITY RULE]
- ${canvasRule}
- 작은 글씨를 많이 배치하지 않고 한 정보 블록은 제목과 최대 2~3줄의 설명으로 제한하며 장문의 문단을 생성하지 않는다.
- 열전도율, 압축강도, 규격, 두께 등 핵심 수치는 다른 설명보다 크게 강조한다.
- 이미지와 텍스트 비율은 약 65~70 : 30~35로 유지하고 정보량보다 가독성을 우선한다.
- 여백을 충분히 확보하고 아이콘 아래 긴 설명을 배치하지 않는다.
- 동일 크기의 작은 카드 여러 개를 나열하지 말고 중요한 정보를 우선 크게 배치한다.
- 제품 사진과 텍스트가 서로 겹치지 않게 한다.
- 브로슈어처럼 작은 글씨가 빽빽한 인포그래픽을 생성하지 않는다.
- 모바일에서 한눈에 핵심 내용이 보이는 레이아웃을 우선하고 디자인보다 정보 전달성과 가독성을 최우선으로 한다.
`;
}

function isUvCoatedBirchFinishCompare(data) {
  const productName = String(data && data.productName || '');
  const compareTarget = String(data && data.compareTarget || '');
  return /UV\s*코팅\s*자작(?:나무)?합판/i.test(productName) &&
    /UV/i.test(compareTarget) &&
    compareTarget.indexOf('상도') !== -1 &&
    compareTarget.indexOf('하도') !== -1;
}

function isGcsBoardProduct(data) {
  return /GCS\s*보드/i.test(String(data && data.productName || ''));
}

function isEboardProduct(data) {
  return /(?:^|\s|단열재)\s*(?:이보드|e-?board)(?:\s|$)/i.test(String(data && data.productName || ''));
}

function isCrcBoardProduct(data) {
  return String(data && data.productName || '').trim() === 'CRC보드';
}

function isWoodWoolBoardProduct(data) {
  return String(data && data.productName || '').trim() === '목모보드';
}

function isReflectiveInsulationProduct(data) {
  return String(data && data.productName || '').trim() === '열반사 단열재';
}

function getInsulationInfographicProfile(data) {
  const productName = String(data && data.productName || '').trim();
  const profiles = {
    '프리미엄 단열재 PF보드': {
      title: 'PF보드의 외벽 단열 적용 특징',
      feature: '열전도율 0.020 W/m·K 이하를 먼저 보여주는 PF 폼 단열보드 완제품',
      locations: ['건물 외피의 외벽 단열', '바닥 단열', '기초 단열'],
      selections: ['요구 단열성능', '적용 부위', '두께 선택', '시공 방향과 이음부'],
      roles: ['면재는 PF 폼 코어를 보호하는 보조 구성', 'PF 폼 코어는 단열 역할'],
      visual: '실제 판매 PF보드의 완제품 외관을 우선한다. PF 코어는 균일한 연한 분홍빛 또는 옅은 살구빛에 미세 셀 질감을 더한다. 알루미늄 라미네이팅 면재는 얇은 금속 면재의 은은한 메탈 질감과 무광 은색을 실제 제품처럼 표현하고 코어와 명확히 구분한다. 건물 외피에서 외벽 단열 위치를 강조한다.',
      guard: '실제 벽체 레이어, 면재 개수, 접착층과 제조 단면을 추정하지 않는다. PF 코어의 완전한 흰색·노란색·진한 분홍색, XPS처럼 진한 핑크, PIR처럼 진한 노란색·크림색, 코어와 면재의 색상 혼합을 금지한다. 알루미늄 라미네이팅 면재를 흰색 종이 면재, 일반 석고보드 또는 일반 판재처럼 표현하지 않는다.'
    },
    '단열재 아이소핑크': {
      title: '아이소핑크의 바닥·지하 단열 특징',
      feature: '하중과 습기 환경을 고려하는 XPS 단열보드',
      locations: ['기초 외벽 단열', '기초 슬래브 단열', '바닥 단열'],
      selections: ['하중 조건', '습기 노출 환경', '두께 선택', '평면 이음부 확인'],
      roles: ['미세 독립기포 구조는 단열과 습기 대응을 위한 보조 개념', '보드 전체는 하중을 받는 위치의 단열 역할'],
      visual: '실제 아이소핑크의 깨끗한 핑크 계열 완제품 외관을 유지하고 기초 외벽·기초 슬래브·바닥의 단열 위치를 정확히 구분해 보여준다.',
      guard: '완전 방수, 수분 완전 차단, 침수에도 변형 없음, 맞물림 가공을 생성하지 않는다. 실제 핑크 XPS 보드 표면에는 ISOPINK, 아이소핑크, 벽산, 제품명, 규격, LOT 번호, QR 코드, 바코드, 로고, 숫자, 인쇄, 워터마크, 임의 텍스트와 읽을 수 없는 AI 글자를 생성하지 않는다.'
    },
    '단열재 GCS보드': {
      title: 'GCS보드의 벽체·천장 단열 특징',
      feature: 'GFC 시멘트계 면재와 PIR 단열 심재를 결합한 준불연 복합보드',
      locations: ['내단열 벽체', '천장 단열', '대피공간 벽체', '복도 벽체'],
      selections: ['준불연 근거 확인', '적용 위치', '후속 마감 조건', '규격과 시공 방향'],
      roles: ['GFC 면재는 표면 보호와 마감 바탕 역할', 'PIR 심재는 단열 역할'],
      visual: '회색 시멘트 질감의 GFC 면재와 연한 크림색 PIR 심재가 결합된 하나의 완제품 외관을 우선한다.',
      guard: '고정 대칭 샌드위치 구조, 양면 면재 단정, 접착층, 폭발도와 실제 제조 단면을 추정하지 않는다.'
    },
    '단열재 이보드': {
      title: '이보드 두께와 표면 마감 선택',
      feature: 'PP 표면 구조판과 핑크 XPS가 결합된 후속 마감용 복합단열보드',
      locations: ['실내 벽체', '천장', '발코니 확장부'],
      selections: ['도배용·페인트용 표면 선택', '13mm·23mm·33mm 두께 선택', '바탕면 상태', '이음부 처리'],
      roles: ['PP 표면 구조판은 후속 마감 바탕 역할', 'XPS는 단열 역할'],
      visual: '기존 이보드의 품질 좋은 완제품 단면 표현을 유지한다. 얇은 흰색·밝은 회백색 PP 표면 구조판과 상대적으로 두꺼운 동일한 연한 핑크 XPS가 실제 제품 비율로 붙어 있는 하나의 완제품처럼 표현한다.',
      guard: 'PP와 XPS를 분리 부품, 폭발도, 고정 3층 단면 또는 PP → XPS → PP 구조로 표현하지 않는다. 새로운 단면 비율, 코팅층, 보강층, 접착층과 가상 레이어를 추론하지 않는다.'
    },
    '열반사 단열재': {
      title: '열반사 단열재의 복사열 차단 원리',
      feature: '은색 알루미늄 반사면과 발포 폴리에틸렌(PE)층을 결합한 롤·시트형 단열재',
      locations: ['지붕 하부', '천장', '벽체'],
      selections: ['적용 위치', '공기층 확보', '반사면 방향', '이음부 밀착'],
      roles: ['알루미늄 반사면은 복사열 반사 역할', '공기층은 반사면과 함께 복사열 차단 개념을 구성'],
      visual: '실제 제품처럼 은색 금속성 표면과 얇은 발포 폴리에틸렌(PE)층이 보이는 유연한 롤 또는 시트 형태를 우선한다. 반사면 방향과 열 흐름을 명확히 표현한다.',
      guard: '생활·자기계발 포스터, 캘린더·시계, 사람·캐릭터와 건강 콘텐츠를 생성하지 않는다. 다른 단열재나 판재의 재료·구조를 혼합하지 않고 코어 확대, 단면 폭발도와 고정된 내부 공기층을 생성하지 않는다.'
    }
  };
  return profiles[productName] || null;
}

function buildInsulationInfographicPrompt(data, type) {
  const profile = getInsulationInfographicProfile(data);
  if (!profile) return '';
  const lines = function (items) {
    return items.map(function (item) { return '- ' + item; }).join('\n');
  };
  const isReflectiveInsulation = isReflectiveInsulationProduct(data);
  const reflectivePerformanceItems = String(data.keyValue || '').split(/[,;|\n]+/).map(function (item) {
    return item.replace(/(?:6|10)\s*mm/gi, '').replace(/^[\s/·]+|[\s/·]+$/g, '').trim();
  }).filter(function (item) {
    return /열전도율|압축강도|준불연/.test(item) && !/Google Sheet 확인 성능|제조사 스펙시트/.test(item);
  });
  const performance = isReflectiveInsulation
    ? reflectivePerformanceItems.length
      ? '- 객관적인 성능: ' + reflectivePerformanceItems.join(' / ')
      : '- 확인된 객관적 성능 수치가 없으면 성능 영역을 만들지 않는다.'
    : data.keyValue
    ? `- Google Sheet 확인 성능: ${data.keyValue}`
    : '- 확인된 성능 수치가 없으면 수치 카드를 만들지 않는다.';
  const source = isReflectiveInsulation
    ? data.source
      ? `- 이미지 최하단에만 작은 글씨로 "출처: ${data.source}"를 표시한다.`
      : '- 출처 근거가 없으면 출처 문구를 생성하지 않는다.'
    : data.source ? `- 출처: ${data.source}` : '- 별도 출처 영역을 만들지 않는다.';
  const isPfBoard = data.productName === '프리미엄 단열재 PF보드';
  const isXpsBoard = data.productName === '단열재 아이소핑크';
  const isEboard = data.productName === '단열재 이보드';
  const typeAHeadings = isPfBoard
    ? ['PF보드 열전도율과 완제품', '외벽·바닥·기초 적용 위치', 'PF보드 선택 기준']
    : isXpsBoard
    ? ['아이소핑크 핵심 성능', '기초 외벽·슬래브·바닥 적용', '아이소핑크 선택 기준']
    : isEboard
    ? ['이보드 완제품과 두께 옵션', '도배용과 페인트용 표면 비교', '이보드 적용 위치와 선택 기준']
    : isReflectiveInsulation
    ? ['열반사 단열재 실제 외관', '지붕·천장·벽체 적용 위치', '열반사 단열재 선택 기준']
    : ['1단: 완제품과 제품 특징', '2단: 실제 시공 위치', '3단: 선택 기준'];
  const typeBHeadings = isPfBoard
    ? ['PF보드 실제 설치 모습', '열 흐름과 시공 흐름', '구조 역할과 시공 주의사항']
    : isXpsBoard
    ? ['아이소핑크 실제 설치 모습', '기초와 바닥의 열 흐름', '성능과 시공 확인사항']
    : isEboard
    ? ['도배용과 페인트용 실제 표면', '두께 선택과 후속 마감 흐름', '이보드 적용 위치와 확인사항']
    : isReflectiveInsulation
    ? ['열반사 단열재 실제 제품 외관', '실제 시공 위치와 반사면 방향', '복사열 차단 원리', '제품 규격과 시공 선택 기준']
    : ['1단: 실제 설치 모습', '2단: 열 흐름과 시공 흐름', '3단: 구조 역할과 주의사항'];
  const stageLabelBan = isPfBoard || isReflectiveInsulation
    ? '- 숫자나 영문으로 된 단계형 섹션 라벨을 이미지에 생성하지 않고 위 설명형 제목만 사용한다.'
    : '';
  const eboardFlow = data.productName === '단열재 이보드'
    ? '- 시공 흐름은 "바탕면 확인 → 이보드 설치 → 도배 또는 페인트 후속 마감"으로 표현한다.'
    : '- 시공 순서는 입력에 없는 접착제, 고정구, 마감 레이어를 추가하지 않고 위치 확인 → 보드 배치 → 이음부 확인 수준으로만 표현한다.';
  const productSpecificPerformance = isPfBoard
    ? '- 핵심 비교 수치: PF 0.020 W/m·K 이하 ↔ XPS 0.028 W/m·K. PF의 열전도율을 가장 먼저, 가장 크게 인식하도록 배치하되 이 수치만 객관적으로 비교하고 과장된 우위 문구는 쓰지 않는다.'
    : isXpsBoard
    ? '- 핵심 성능에 열전도율 0.028 W/m·K와 Google Sheet의 압축강도를 함께 표시한다.'
    : '';
  const eboardFinishComparison = isEboard
    ? `- 13mm / 23mm / 33mm 세 규격을 모두 명확히 표시한다.
- 좌측 "도배용"과 우측 "페인트용"의 실제 표면을 확대 비교한다.
- 도배용은 벽지 부착을 고려한 표면, 페인트용은 샌딩·도장 마감을 고려한 표면으로 구분하되 색상만 바꾸지 않는다.
- 도배용 표면에 벽지를 붙이거나 페인트용 표면에 페인트를 칠한 완성품처럼 표현하지 않는다.
- 두 유형 모두 동일한 연한 핑크 XPS 복합보드이며 표면 질감과 후속 작업의 선택 차이를 우선한다.`
    : '';
  const reflectiveTypeBLayout = isReflectiveInsulation && type === 'B'
    ? `${typeBHeadings[0]}
- ${profile.feature}
- ${profile.visual}
- 완제품의 은색 알루미늄 반사면, 발포 폴리에틸렌(PE)층과 롤·시트 형태를 실사 중심으로 보여준다.

${typeBHeadings[1]}
${lines(profile.locations)}
- 공기층과 함께 시공되는 개념을 표현하되 공기층을 제품 내부 고정 레이어로 만들지 않는다.
- 지붕·천장·벽체에서 알루미늄 반사면 방향과 이음부 위치를 단순 개념도로 표시한다.

${typeBHeadings[2]}
- 태양 복사열 → 알루미늄 반사면 → 공기층 → 실내 열 유입 감소 순서로 열 흐름을 표현한다.
- 알루미늄 반사면의 복사열 반사 역할과 공기층을 함께 보여준다.
- 입력에 없는 차단율과 성능 수치를 추가하지 않는다.

${typeBHeadings[3]}
제품 규격
- 선택 가능한 두께: 6mm / 10mm
- 6mm와 10mm는 성능값이 아니라 제품 옵션으로만 표시한다.
${lines(profile.selections)}
${performance}
${source}
- 성능 영역에는 입력에서 확인된 열전도율, 압축강도, 준불연 등 객관적인 수치·등급만 배치한다.
- 시트 확인 여부를 성능 제목으로 만들지 않고 자료 출처를 성능명이나 카드 제목으로 표시하지 않는다.
- 제품 규격과 성능을 같은 카드나 같은 라벨로 혼합하지 않는다.
- 코어 확대와 단면 폭발도를 생성하지 않는다.`
    : '';
  const typeLayout = reflectiveTypeBLayout || (type === 'A'
    ? `${typeAHeadings[0]}
- ${profile.feature}
- ${profile.visual}
${productSpecificPerformance}
${eboardFinishComparison}
${performance}
${source}

${typeAHeadings[1]}
${lines(profile.locations)}
- 건물 또는 공간의 단순한 위치 개념도에서 단열 위치와 열 흐름 화살표를 표시한다.
- 특정 벽체·바닥·천장의 상세 레이어는 추정하지 않는다.

${typeAHeadings[2]}
${lines(profile.selections)}
- 구조 역할은 작은 보조 개념도 1개 이하로만 표현한다.
${lines(profile.roles)}`
    : `${typeBHeadings[0]}
- ${profile.visual}
${lines(profile.locations)}
${productSpecificPerformance}
${eboardFinishComparison}
- 제품을 무조건 절단하지 않고 실제 적용 위치에 설치된 완제품을 먼저 보여준다.

${typeBHeadings[1]}
- 실내·외 또는 상·하부의 열 흐름과 단열 위치를 간단한 화살표로 표시한다.
${eboardFlow}
- 실제 시공 상세와 벽체 레이어를 추정하지 않는다.

${typeBHeadings[2]}
${lines(profile.roles)}
${lines(profile.selections)}
${performance}
${source}
- 구조 확대는 역할 설명용 개념도 1개 이하로 제한한다.`);

  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

메인 제목: ${profile.title}

목표:
- 구조 설명보다 제품 특징 → 시공 위치 → 선택 기준이 먼저 이해되게 한다.
- 실제 완제품과 시공 위치를 중심으로 한 실무형 시공 카탈로그 스타일로 구성한다.
- 열 흐름, 단열 위치와 시공 흐름은 단순한 아이콘과 개념도로 표현한다.
- 상세설명 HTML 문장을 그대로 반복하지 않는다.

캔버스와 색상:
- 1024 x 1024px, 배경 #FFFFFF
- 메인 #123628, 포인트 #C9A84C, 텍스트 #1C1C1C, 서브텍스트 #616161, 보더 #E0E0E0만 사용한다.

[Type ${type} 구성]
${typeLayout}

제품 고정 규칙:
- ${profile.guard}
${stageLabelBan}
- 제품을 무조건 절단하거나 구조 확대만 반복하지 않는다.
- 절단도, 폭발도, 추정 단면과 입력에 없는 시공 부자재를 생성하지 않는다.
- 다른 단열재의 코어, 색상, 면재와 시공 위치를 혼합하지 않는다.
- 성능 수치는 Google Sheet 값만 사용하고 근거 없는 성능 우위를 만들지 않는다.
- 범용 마케팅 제목, 영어 라벨, 광고 배너와 과장 표현을 사용하지 않는다.
`;
}

function getSelectionInfographicProfile(data) {
  const productName = String(data && data.productName || '').trim();
  const gluedWoodProfiles = {
    '고무나무 집성판 탑핑거': ['TOP_FINGER', ['균일한 밝은 색감', '가공·재단 작업성', '상판 제작 시 선택하기 쉬운 실용성'], ['밝고 고른 표면', '탑핑거 접합은 보조 표현'], ['카페 테이블 상판', '주방 상판']],
    '라디에타파인 집성판 탑핑거': ['TOP_FINGER', ['밝고 깨끗한 색감', '도장 마감에 어울리는 표면', '가구 상판·전면재 제작'], ['미백색 표면', '도장 전후 마감 이미지'], ['모던 가구 상판', '서랍 가구 전면재']],
    '라디에타파인 계단재': ['STAIR', ['밝은 미백색과 연한 크림색의 원목 색감', '은은하고 곧게 이어지는 소나무 결', '여러 개의 긴 원목을 나란히 이어 만든 집성판'], ['밝은 원목 색감', '곧게 이어지는 소나무 결'], ['계단판', '챌판']],
    '삼나무 집성판 솔리드': ['SOLID', ['자연스러운 원목 느낌', '유절 표면의 개성', '따뜻한 인테리어 감성'], ['붉은 결·옹이가 보이는 모습', '솔리드 집성은 보조 표현'], ['옷장 내부 가구', '인테리어 가구']],
    '쏘노클린 집성판 사이드핑거': ['SIDE_FINGER', ['자줏빛·검붉은 디자인 패턴', '표면을 드러내는 노출 마감', '포인트 가구 선택'], ['색조가 교차하는 표면 패턴', '완성 가구의 노출면'], ['디자인 가구 상판', '포인트 월']],
    '아카시아 집성판 사이드핑거': ['SIDE_FINGER', ['원목마다 색이 조금씩 다른 자연스러운 무늬', '빈티지한 원목 분위기', '카페·인테리어 상판 선택'], ['짙고 밝은 원목 조각이 어우러진 모습', '노출 상판'], ['카페 카운터', '인테리어 테이블']],
    '엘더 집성판 사이드핑거': ['SIDE_FINGER', ['따뜻한 붉은 황색', '비교적 고르게 이어지는 색조', '도어·프레임 노출 마감'], ['은은하고 따뜻한 표면 톤', '가구 도어 노출면'], ['수제 가구 도어', '침대 프레임']],
    '티크 집성판 사이드핑거': ['SIDE_FINGER', ['골드브라운 색감', '천연 유분이 있는 목재 표면', '고급 상판의 노출 마감'], ['골드브라운 표면과 자연스러운 광택', '노출 상판'], ['카운터 상판', '내장 가구']],
    '탄화 애쉬(물푸레나무) 집성판': ['SOLID', ['탄화 전후의 색감 변화', '진한 갈색의 포인트 표면', '탄화 처리에 따른 치수 안정성 고려'], ['일반 애쉬와 탄화 애쉬의 색감 비교', '탄화 후 표면'], ['테이블 상판', '포인트 월']],
    '멀바우 집성판 사이드핑거': ['SIDE_FINGER', ['중후한 붉은 갈색', '무겁고 치밀한 하드우드 느낌', '중량감 있는 상업 공간 상판'], ['짙은 적갈색 표면', '두꺼운 상판의 존재감'], ['대형 테이블', '진열대 상판']],
    '오크 집성판 사이드핑거': ['SIDE_FINGER', ['굵고 선명한 타이거 패턴', '클래식한 원목 가구 분위기', '결을 드러내는 노출 마감'], ['호반문이 보이는 표면', '가구 도어·상판 노출면'], ['가구 도어', '책상 상판']],
    '오동나무 집성판 솔리드': ['SOLID', ['가벼운 목재 특성', '재단·가공 편의', '가구와 선반 제작용 선택'], ['밝고 가벼운 원목 느낌', '솔리드 집성은 보조 표현'], ['가구 제작', '선반 제작']],
    '레드파인 집성판 솔리드': ['SOLID', ['자연스러운 붉은 소나무 결', '유절 원목 분위기', '가구·선반 제작 범용성'], ['붉은 결·옹이가 보이는 모습', '솔리드 집성은 보조 표현'], ['가구 제작', '선반·인테리어 마감']]
  };
  const gluedWoodTypeCOverrides = {
    '고무나무 집성판 탑핑거': {
      title: '밝고 따뜻한 원목 색감', speciesTitle: '고무나무', appearance: ['밝고 따뜻한 베이지 계열의 원목 색감', '차분한 원목 결이 살아있는 모습'],
      applications: ['테이블 상판', '가구 상판', '주방 상판'], selections: ['상판 제작 시 가공 조건', '표면 마감 방식'],
      joint: '탑핑거 접합부는 작은 보조 확대 1개로만 표현한다.', guard: '과도한 노란색, 강한 옹이와 진한 적갈색을 생성하지 않는다.'
    },
    '라디에타파인 집성판 탑핑거': {
      title: '밝은 원목 느낌', speciesTitle: '라디에타파인', appearance: ['밝은 미백색과 연한 크림색의 원목 색감', '은은하고 부드러운 소나무 결'],
      applications: ['책상 상판', '선반', '가구 프레임'], selections: ['도장·마감 방식', '노출할 표면 상태'],
      joint: '탑핑거 접합은 표면보다 작게 보조 설명한다.', guard: '주황색, 진한 옹이와 고무나무의 균일한 활엽수 결을 혼합하지 않는다.'
    },
    '라디에타파인 계단재': {
      title: '밝은 원목 색감과 소나무 결', speciesTitle: '라디에타파인 계단재', appearance: ['밝은 미백색과 연한 크림색의 원목 색감', '은은하고 곧게 이어지는 소나무 결', '여러 개의 긴 원목을 나란히 이어 만든 집성판'],
      applications: ['복층 공간의 설치된 계단', '계단 디딤판과 챌판'], selections: ['30mm / 38mm 두께 선택', '적용할 계단 위치'],
      joint: '여러 개의 긴 원목을 나란히 이어 만든 집성판으로만 설명한다.', guard: '일반 상판, 테이블, 평판 상품 이미지를 메인으로 만들거나 주황색으로 과장하지 않는다.',
      structureLibrary: 'TOP_FINGER'
    },
    '삼나무 집성판 솔리드': {
      title: '옹이가 자연스럽게 보이는 원목', speciesTitle: '삼나무', appearance: ['밝고 따뜻한 베이지 계열의 원목 색감', '붉은빛은 일부 결·옹이 주변에만 약하게 보이는 원목', '여러 개의 긴 원목을 나란히 이어 만든 집성판'],
      applications: ['옷장 내부 가구', '원목 감성 인테리어 가구'], selections: ['옹이와 색상 편차 확인', '노출할 표면 선택'],
      joint: '솔리드 폭 방향 집성은 작은 보조 개념도로만 표현한다.', guard: '붉은기는 옹이 주변과 일부 결에만 약하게 둔다. 상면 스트립 위치와 전면 단면의 접합선은 자연스럽게 이어져야 하며 제품 전체를 붉은색·주황색으로 만들거나 균일한 무절 표면으로 바꾸지 않는다.'
    },
    '쏘노클린 집성판 사이드핑거': {
      title: '따뜻한 브라운 계열의 자연스러운 원목 색감', speciesTitle: '쏘노클린', appearance: ['중간 밝기의 따뜻한 브라운 원목 색감', '원목마다 색이 조금씩 다른 자연스러운 무늬', '실제 원목 느낌이 살아있는 모습'],
      applications: ['포인트 테이블', '디자인 가구와 포인트 월'], selections: ['검붉은 패턴의 노출 방향', '공간과 어울리는 색조'],
      joint: '측면 핑거조인트는 가장 작은 보조 확대에만 사용한다.', guard: '일반 쏘노클린 판매 제품을 기준으로 자연광 아래 저채도·무도장·무광 표면을 유지한다. 쏘노클린 지브라 수준의 강한 명암 대비, 전체 진갈색·초콜릿색·검정·보라·자주색·와인색·다크월넛과 월넛 표면, 검정에 가까운 스트립 과다, 염색·스테인·고광택을 생성하지 않는다.'
    },
    '아카시아 집성판 사이드핑거': {
      title: '색 차이가 살아있는 나뭇결', speciesTitle: '아카시아', appearance: ['밝은 크림·황갈색과 중간 갈색이 어우러진 원목 색감', '원목마다 결과 색이 조금씩 다른 자연스러운 무늬', '실제 원목 느낌이 살아있는 모습'],
      applications: ['카페 카운터', '인테리어 테이블'], selections: ['심재·변재 색상 편차', '노출할 모자이크 무늬'],
      joint: '측면의 한 원목 부재 한 곳에만 작은 핑거 이음이 약하게 보이게 한다. 확대는 그 동일한 측면 한 곳만 보여준다.',
      guard: '상면과 전면 단면의 스트립 위치를 자연스럽게 연결한다. 지나치게 노란 표면, 회색으로 탈색된 표면, 오크·고무나무처럼 균일한 표면, 합판 적층선, 벽돌형 짧은 블록 반복, 상판 Finger Joint, 굵은 사각 톱니, 직각 블록과 모서리 한 줄 핑거를 생성하지 않는다.',
      structureVisualOverride: '아카시아 전용: 실제 원목의 색 차이와 결을 유지한다. 측면의 한 원목 부재 한 곳에만 작은 핑거 이음을 두고, 확대는 그 동일한 측면 한 곳만 보여준다.'
    },
    '엘더 집성판 사이드핑거': {
      title: '따뜻한 연황색과 연갈색 원목 색감', speciesTitle: '엘더', appearance: ['따뜻한 연황색과 연갈색 바탕', '비교적 고르게 이어지는 은은한 나뭇결'],
      applications: ['수제 가구 도어', '가구 전면재와 침대 프레임'], selections: ['도어 노출면의 색조', '후속 마감 방식'],
      joint: '측면 핑거조인트는 표면 안내 뒤의 보조 정보로만 둔다.', guard: '오크 호반문, 강한 명암 대비와 과장된 붉은색을 혼합하지 않는다.'
    },
    '티크 집성판 사이드핑거': {
      title: '골드브라운 원목 색감과 나뭇결', speciesTitle: '티크', appearance: ['자연스러운 골드브라운과 황갈색 바탕', '천연 유분감이 은은하게만 느껴지는 나뭇결'],
      applications: ['카운터 상판', '내장 가구'], selections: ['노출면의 색조와 결', '후속 마감 방식'],
      joint: '측면 핑거조인트는 작은 보조 확대에만 표시한다.', guard: '진한 오렌지색과 고광택을 피하고 방수·방충 성능, 변형 없음과 부패 걱정 없음으로 단정하지 않는다.'
    },
    '탄화 애쉬(물푸레나무) 집성판': {
      title: '탄화 전후로 달라지는 원목 색감', speciesTitle: '탄화 애쉬', appearance: ['일반 애쉬의 밝은 회갈색', '완전 검정색이 아닌 탄화 애쉬의 진한 중갈색과 선명한 결'],
      applications: ['레스토랑 테이블 상판', '주거 공간 포인트 월'], selections: ['탄화 전후 색감 차이', '공간에 맞는 노출면 선택'],
      joint: '솔리드 집성 방식은 작은 보조 정보로만 표현한다.', guard: '함수율과 치수 안정성을 비교 우위 카드로 만들지 않고 무첨가·영구 안정성을 단정하지 않는다.',
      colorCompare: true
    },
    '멀바우 집성판 사이드핑거': {
      title: '중간 톤의 브라운과 적갈색 원목 색감', speciesTitle: '멀바우', appearance: ['중간 톤의 브라운 바탕에\n묵직한 적갈색이 더해진 색감', '자연스럽고 치밀한 하드우드 결이\n표면에 깊이감 있게 드러나는 무늬'],
      applications: ['상업 공간 대형 테이블', '중량감 있는 진열대 상판'], selections: ['상판의 색조와 존재감', '설치 공간과 규격 확인'],
      joint: '측면 핑거조인트는 모서리의 작은 보조 확대만 사용한다.', guard: '검정색·와인색으로 과장하지 않고 수축·팽창 없음과 변형 없음 같은 절대 표현을 사용하지 않는다.'
    },
    '오크 집성판 사이드핑거': {
      title: '호반문과 굵은 나뭇결이 보이는 원목', speciesTitle: '오크', appearance: ['연한 황갈색과 중간 브라운이 어우러진\n밝고 따뜻한 색감', '굵은 결과 호반문이 자연스럽게 드러나\n오크 특유의 표면감을 보여주는 무늬'],
      applications: ['가구 도어', '서재 책상 상판'], selections: ['호반문이 드러나는 노출면', '가구의 결 방향'],
      joint: '측면 핑거조인트는 타이거 패턴보다 작게 보조 설명한다.', guard: '과도한 검은 줄무늬, 고광택과 임의 촉감 설명을 생성하지 않는다.'
    },
    '오동나무 집성판 솔리드': {
      title: '밝고 가벼운 원목 느낌', speciesTitle: '오동나무', appearance: ['매우 밝은 황백색과 연한 베이지 바탕', '가볍고 부드러운 인상의 단순한 나뭇결'],
      applications: ['가구 제작', '선반 제작'], selections: ['경량이 필요한 제작물', '재단·가공 조건'],
      joint: '폭 방향 솔리드 집성은 가장 작은 보조 정보로만 표시한다.', guard: '금지된 집성 용어를 사용하지 않고 삼나무처럼 붉은 결과 옹이를 혼합하지 않는다.'
    },
    '레드파인 집성판 솔리드': {
      title: '소나무 결과 옹이가 보이는 원목', speciesTitle: '레드파인', appearance: ['밝은 황갈색과 연한 적갈색의 소나무 톤', '자연스러운 옹이와 소나무 결이 보이는 유절 표면'],
      applications: ['가구와 선반 제작', '테이블 상판'], selections: ['옹이와 표면 상태', '가구·선반·상판의 적용 위치'],
      joint: '폭 방향 솔리드 집성은 작은 보조 개념도로만 표현한다.', guard: '제품 전체를 진한 붉은색으로 만들지 않고 다른 제품군의 재료·코어·보드 구조를 포함하지 않는다.'
    }
  };
  const gluedWood = gluedWoodProfiles[productName];
  if (gluedWood) {
    const acaciaComparisonEvidence = [
      data && data.productName,
      data && data.grade,
      data && data.compareTarget,
      data && data.keyValue,
      data && data.structure,
      data && data.emphasis
    ].map(function (value) { return String(value || ''); }).join(' ');
    const productTitle = productName
      .replace(/\s+(?:탑핑거|사이드핑거|솔리드)$/, '')
      .replace(/^탄화 애쉬\(물푸레나무\) 집성판$/, '탄화 애쉬 집성판');
    return {
      family: 'GLUED_WOOD',
      isExactProfile: true,
      library: gluedWood[0],
      productTitle: productTitle,
      title: productName + '의 특징',
      reasons: gluedWood[1],
      visuals: gluedWood[2],
      applications: gluedWood[3],
      typeC: gluedWoodTypeCOverrides[productName],
      structureVisualStandard: '실제 목공 가공 사진·실제 판매 제품 사진·실제 단면 구조 우선',
      hasAcaciaKnotComparison: productName === '아카시아 집성판 사이드핑거' &&
        acaciaComparisonEvidence.indexOf('유절') !== -1 && acaciaComparisonEvidence.indexOf('무절') !== -1,
      guard: '접합 구조는 제품 식별에 필요한 범위에서만 보조적으로 표시하고, 제품 선택 이유보다 크게 다루지 않는다.'
    };
  }

  const fallbackGluedWood = addGluedWoodJointMatch(data, resolveGluedWoodProductKnowledge(data));
  if (fallbackGluedWood) {
    const species = fallbackGluedWood.species;
    const jointName = fallbackGluedWood.joint.name;
    const library = fallbackGluedWood.joint.matched !== true
      ? 'UNKNOWN'
      : jointName === '사이드핑거 집성판'
      ? 'SIDE_FINGER'
      : jointName === '탑핑거 집성판' || jointName === '핑거조인트 집성판'
      ? 'TOP_FINGER'
      : jointName === '솔리드 집성판'
      ? 'SOLID'
      : 'UNKNOWN';
    if (library) {
      const speciesTitle = species.standardName || '수종 확인 필요';
      return {
        family: 'GLUED_WOOD',
        isExactProfile: false,
        library: library,
        productTitle: productName.replace(/\s+(?:탑핑거|사이드핑거|솔리드)$/, ''),
        title: productName + '의 특징',
        reasons: [],
        visuals: [],
        applications: [],
        typeC: {
          title: speciesTitle + ' 집성판의 표면과 사용 안내',
          speciesTitle: speciesTitle,
          appearance: species.appearance ? [species.appearance, species.variationNotice] : [species.variationNotice],
          applications: [],
          selections: (species.purchaseChecks || []).slice(0, 2),
          joint: fallbackGluedWood.joint.structure + '를 실제 제품 접합부 중심으로 보여준다.',
          guard: '입력에 없는 수종 외관·성능·용도와 비교 우위를 생성하지 않는다.'
        },
        structureVisualStandard: '실제 목공 가공 사진·실제 판매 제품 사진·실제 단면 구조 우선',
        hasAcaciaKnotComparison: false,
        guard: '현재 제품 하나만 설명하고 일반 솔리드나 다른 집성판을 비교 대상으로 만들지 않는다.'
      };
    }
  }

  const gypsumNames = [
    'GS자이 천연 일반석고보드',
    'GS자이 천연 방수석고보드',
    'GS자이 천연 방화석고보드',
    'KCC방화 석고보드',
    'KCC차음 석고보드',
    'KCC 석고텍스'
  ];
  if (gypsumNames.indexOf(productName) === -1) return null;

  let library = '일반';
  if (productName.indexOf('석고텍스') !== -1) library = '석고텍스';
  else if (productName.indexOf('방수') !== -1) library = '방수';
  else if (productName.indexOf('방화') !== -1) library = '방화';
  else if (productName.indexOf('차음') !== -1) library = '차음';
  const isGsNatural = productName.indexOf('GS자이 천연') === 0;
  const gsNaturalTitles = {
    '일반': 'GS자이 천연석고의 특징',
    '방수': 'GS자이 천연 방수석고의 특징',
    '방화': 'GS자이 천연 방화석고의 특징'
  };
  const gypsumTitles = {
    '일반': '일반석고보드의 특징',
    '방수': '방수석고보드의 특징',
    '방화': productName.indexOf('KCC') !== -1 ? 'KCC 방화석고보드의 특징' : '방화석고보드의 특징',
    '차음': productName.indexOf('KCC') !== -1 ? 'KCC 차음석고보드의 특징' : '차음석고보드의 특징',
    '석고텍스': '석고텍스 표면과 시공 특징'
  };
  const gypsumProfiles = {
    '일반': [['건조한 실내의 벽체·천장 바탕', '칼 재단이 가능한 기본 시공성', '일반 실내 바탕재 선택'], ['완제품 보드 외관', '벽체·천장 바탕 적용'], ['사무실 벽체 바탕', '아파트 천장 바탕']],
    '방수': [['전흡수율 10% 이하', '습기 노출을 고려한 방수 처리', '욕실·주방 바탕재 선택'], ['습기 대응 성능 개념도', '욕실·주방의 바탕 시공'], ['욕실 벽체 타일 바탕', '주방 싱크 배면']],
    '방화': [['화재 시 형상 유지를 돕는 보강', '내화구조 벽체 구성에 적용', '방화 구획용 보드 선택'], ['열에 노출된 보드의 형상 유지 개념', '방화 구획 벽체 구성'], ['방화 구획 벽체', '엘리베이터 홀 벽면']],
    '차음': [['밀도 0.85g/cm³ 이상', '미세하고 조밀한 고밀도 코어', '차음 벽체 시스템 구성용 선택'], ['일반 보드보다 조밀한 코어 입자감', '석고보드·스터드·흡음재 조합'], ['세대 간 경계벽', '회의실 칸막이벽']],
    '석고텍스': [['노출 천장 마감재', '짧은 웜홀과 미세 도트가 섞인 비반복 표면', '300×600 규격형 패널 시공'], ['방향과 길이가 다른 불규칙한 짧은 선형 홈 사이에 미세 도트가 섞인 무광 백색 표면', 'M-Bar·T-Bar에 정돈되게 설치된 천장 패널'], ['사무실 천장', '학교 천장', '상가 천장']]
  };
  const gypsum = gypsumProfiles[library];
  return {
    family: 'GYPSUM',
    library: isGsNatural ? 'GS자이 천연석고 / ' + library : library,
    title: isGsNatural ? gsNaturalTitles[library] : gypsumTitles[library],
    reasons: gypsum[0],
    visuals: gypsum[1],
    applications: gypsum[2],
    isGsNatural: isGsNatural,
    gsNaturalTitle: isGsNatural ? gsNaturalTitles[library] : '',
    isKccSoundBoard: productName === 'KCC차음 석고보드',
    isGypsumTex: library === '석고텍스',
    paperAppearance: library === '일반' ? '흰색 원지 외관' : library === '방수' ? '하늘색 원지 외관' : library === '방화' ? '핑크색 원지 외관' : productName === 'KCC차음 석고보드' ? '일반석고보드와 동일한 원지 외관' : library === '차음' ? '연두색 원지 외관' : '',
    guard: library === '석고텍스'
      ? '일반 석고보드 단면, 석고 코어와 원지 확대를 생성하지 않는다.'
      : '공통 원지·석고 코어 단면은 보조 정보로만 사용하고 성능, 적용 공간, 선택 이유를 우선한다.'
  };
}

const GLUED_WOOD_JOINT_TYPE_KNOWLEDGE = {
  SOLID: {
    title: '솔리드 집성',
    description: '여러 원목을 나란히 이어 만든\n집성 구조',
    detailCaption: '여러 원목이 나란히 이어진 접합선이 상판에 자연스럽게 보이는 구조입니다.',
    visualBan: '핑거조인트와 톱니형 접합을 표현하지 않는다.'
  },
  SIDE_FINGER: {
    title: '사이드핑거 집성',
    description: '원목을 길이 방향으로 이어 만든\n집성 구조',
    detailCaption: '측면의 한 원목 부재에서만\n짧은 핑거 이음이 국소적으로 보입니다.',
    visualBan: '상품명 근거 없이 상판에 핑거조인트를 만들지 않는다.'
  },
  TOP_FINGER: {
    title: '탑핑거 집성',
    description: '짧은 원목을 이어\n하나의 판재로 만든 집성 구조',
    detailCaption: '상판에서 여러 원목 부재의 연결선이 이어져 보이는 집성 방식',
    visualBan: '측면 전용 접합으로 바꾸지 않는다.'
  },
  UNKNOWN: {
    title: '집성판 구조',
    description: '여러 목재 부재를 이어 만든 집성 구조',
    visualBan: '특정 핑거 위치와 방향을 생성하지 않는다.'
  }
};

function resolveGluedWoodJointTypeFromProductName(data) {
  const productName = cleanEntityValue(data && data.productName).toLowerCase();
  if (/사이드\s*핑거|side\s*[-_ ]?finger/.test(productName)) return 'SIDE_FINGER';
  if (/탑\s*핑거|top\s*[-_ ]?finger/.test(productName)) return 'TOP_FINGER';
  if (/솔리드|solid/.test(productName)) return 'SOLID';
  return 'UNKNOWN';
}

function validateGluedWoodJointEvidence(data, jointType) {
  const source = cleanEntityValue(data && data.structure);
  const lower = source.toLowerCase();
  if (!source) return { status: 'NEUTRAL', detectedType: 'UNKNOWN' };

  const detected = [];
  if (/사이드\s*핑거|side\s*[-_ ]?finger|측면[^.!?\n]{0,24}(?:핑거|finger)/.test(lower)) detected.push('SIDE_FINGER');
  if (/탑\s*핑거|top\s*[-_ ]?finger|(?:상판|길이\s*방향)[^.!?\n]{0,24}(?:핑거|finger)/.test(lower)) detected.push('TOP_FINGER');
  if (/솔리드|solid/.test(lower)) detected.push('SOLID');

  const uniqueDetected = detected.filter(function (item, index, items) { return items.indexOf(item) === index; });
  if (uniqueDetected.length > 1) {
    return { status: 'CONFLICT', detectedType: uniqueDetected.join('+'), reason: 'J열에 둘 이상의 집성 방식이 함께 명시되어 있습니다.' };
  }
  if (jointType === 'UNKNOWN' || uniqueDetected.length === 0) {
    if (jointType === 'SOLID' && /핑거|finger|\bfj\b/.test(lower)) {
      return { status: 'CONFLICT', detectedType: 'FINGER_UNSPECIFIED', reason: 'SOLID 상품의 J열에 핑거조인트가 명시되어 있습니다.' };
    }
    return { status: 'NEUTRAL', detectedType: uniqueDetected[0] || 'UNKNOWN' };
  }
  if (uniqueDetected[0] !== jointType) {
    return {
      status: 'CONFLICT',
      detectedType: uniqueDetected[0],
      reason: '상품명은 ' + jointType + '로 판정되지만 J열에는 ' + uniqueDetected[0] + '가 명시되어 있습니다.'
    };
  }
  return { status: 'MATCH', detectedType: uniqueDetected[0] };
}

function classifyGluedWoodReferenceFacts(data) {
  const source = [data && data.keyValue, data && data.emphasis].map(cleanEntityValue).filter(Boolean).join(' ');
  return {
    colorEvidence: /색감|색상|밝은|붉은|갈색|황갈색|적갈색|크림|베이지/.test(source),
    grainEvidence: /나뭇결|목리|결\b|무늬/.test(source),
    knotEvidence: /옹이|유절|무절/.test(source),
    scentEvidence: /향|향기/.test(source) && !/피톤치드|항균|스트레스|아토피|호흡기/.test(source),
    surfaceOptionEvidence: /양면유절|양면무절|일면무절|유절|무절/.test(source),
    workabilityEvidence: /가공|재단/.test(source),
    rejectedClaims: {
      health: /피톤치드|항균|스트레스|아토피|호흡기|건강/.test(source),
      advertising: /최고급|고급스러운|프리미엄|뛰어|우수|적합/.test(source),
      performance: /강도|내구성|습기|뒤틀림|수축|팽창|충격|스크래치|탄성/.test(source),
      priceRanking: /가격|가성비|합리적/.test(source)
    }
  };
}

function normalizeGluedWoodApplicationFacts(value) {
  const cleaned = cleanEntityValue(value)
    .replace(/아토피\s*\/?\s*/g, '')
    .replace(/유아용\s*/g, '')
    .replace(/친환경\s*/g, '')
    .replace(/고급\s*/g, '')
    .replace(/원목\s*/g, '')
    .replace(/다양한\s*/g, '')
    .replace(/제작\s*시공/g, '제작')
    .replace(/마감재\s*작업/g, '마감 작업')
    .replace(/\s*같은\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return [];
  return cleaned
    .replace(/[()]/g, ',')
    .split(/\s*(?:및|그리고|,|，|\/)\s*/)
    .map(function (item) { return item.trim(); })
    .filter(Boolean);
}

function getGluedWoodApplicationDedupKey(value) {
  const text = cleanEntityValue(value).replace(/\s+/g, '');
  if (/선반/.test(text)) return '선반';
  if (/인테리어.*내장재|실내.*내장재/.test(text)) return '실내내장재';
  if (/벽면.*마감/.test(text)) return '벽면마감';
  return text.replace(/(?:제작|시공|작업|용)$/g, '');
}

function resolveApprovedGluedWoodTypeCCopy(data) {
  const productName = cleanEntityValue(data && data.productName);
  const copy = APPROVED_GLUED_WOOD_TYPE_C_COPY[productName];
  return copy ? JSON.parse(JSON.stringify(copy)) : null;
}

function getApprovedGluedWoodJointOptions(approved) {
  if (!approved || !Array.isArray(approved.jointOptions)) return [];
  return approved.jointOptions.map(function (option) {
    return {
      title: cleanEntityValue(option && option.title),
      jointType: cleanEntityValue(option && option.jointType),
      caption: cleanEntityValue(option && option.caption)
    };
  }).filter(function (option) {
    return option.title && option.jointType && option.caption;
  });
}

function hasGluedWoodJointOptionComparison(facts) {
  return Boolean(facts && facts.jointOptions && facts.jointOptions.length > 1);
}

function getGluedWoodJointOptionText(facts) {
  return hasGluedWoodJointOptionComparison(facts)
    ? facts.jointOptions.map(function (option) { return option.title; }).join('·')
    : '';
}

function normalizeGluedWoodTypeCProductProfileKey(value) {
  return cleanEntityValue(value).toLowerCase().replace(/[‐‑–—]/g, '-').replace(/\s+/g, '');
}

function resolveGluedWoodTypeCProductProfile(data) {
  if (typeof GLUED_WOOD_TYPE_C_PRODUCT_PROFILES === 'undefined') return null;
  const normalizedProductName = normalizeGluedWoodTypeCProductProfileKey(data && data.productName);
  if (!normalizedProductName) return null;
  const optionBundleProductName = normalizedProductName.replace(/\([^)]*\/[^)]*\)/g, '');
  const matchedKey = Object.keys(GLUED_WOOD_TYPE_C_PRODUCT_PROFILES).find(function (key) {
    return normalizeGluedWoodTypeCProductProfileKey(key) === normalizedProductName;
  }) || Object.keys(GLUED_WOOD_TYPE_C_PRODUCT_PROFILES).find(function (key) {
    return normalizeGluedWoodTypeCProductProfileKey(key) === optionBundleProductName;
  });
  return matchedKey ? {
    key: matchedKey,
    profile: GLUED_WOOD_TYPE_C_PRODUCT_PROFILES[matchedKey]
  } : null;
}

function selectGluedWoodTypeCProfileCaption(productProfile, captions) {
  const variants = Array.isArray(captions) ? captions.filter(Boolean) : [];
  if (variants.length <= 1) return variants[0] || '';
  const key = normalizeGluedWoodTypeCProductProfileKey(productProfile && productProfile.key);
  const seed = key.split('').reduce(function (sum, character) {
    return ((sum * 31) + character.charCodeAt(0)) >>> 0;
  }, 0);
  return variants[seed % variants.length];
}

function buildGluedWoodTypeCProfileTopFeature(productProfile) {
  const signatureFeature = productProfile && productProfile.profile && productProfile.profile.signatureFeature;
  if (signatureFeature && cleanEntityValue(signatureFeature.title) && cleanEntityValue(signatureFeature.caption)) {
    return {
      title: cleanEntityValue(signatureFeature.title),
      caption: cleanEntityValue(signatureFeature.caption)
    };
  }
  const physicalFacts = productProfile && productProfile.profile && Array.isArray(productProfile.profile.physical)
    ? productProfile.profile.physical.map(cleanEntityValue).filter(Boolean)
    : [];
  const supportedFacts = physicalFacts.filter(function (fact) {
    return !/수종 구성|제품별|편차/.test(fact);
  });
  const evidence = supportedFacts.join(' ');
  if (!evidence) return null;

  const hasNaturalOil = /자연\s*유분/.test(evidence);
  const hasHardness = /단단|하드우드/.test(evidence);
  const hasDensity = /치밀|밀도감/.test(evidence);
  const hasWeight = /무게감|무겁/.test(evidence);
  const hasLightness = /가벼운|매우\s*가벼운/.test(evidence);
  const hasSoftTexture = /부드러운/.test(evidence);
  const hasFineTexture = /고운|매끈한/.test(evidence);
  const hasEvenStructure = /고른 조직/.test(evidence);
  const hasWoodScent = /(?:목재|나무)\s*향|향기/.test(evidence);

  if (hasWoodScent) return { title: '은은한 목재 향', caption: '은은한 목재 향이 자연스럽게\n느껴지는 원목' };
  if (hasNaturalOil) return {
    title: '자연 유분',
    caption: selectGluedWoodTypeCProfileCaption(productProfile, [
      '자연 유분이 은은하게 남아 있는\n원목의 고유한 특성',
      '은은한 유분감이 자연스럽게\n드러나는 목재'
    ])
  };
  if ((hasHardness || hasDensity) && hasWeight) {
    return {
      title: '치밀한 목재',
      caption: selectGluedWoodTypeCProfileCaption(productProfile, [
        '무게감 있고 치밀한 조직이 특징인\n단단한 목재',
        '묵직하고 단단한 조직이 돋보이는\n치밀한 목재',
        '단단하고 무게감 있는 조직이 특징인\n치밀한 목재'
      ])
    };
  }
  if (hasHardness && hasDensity) return { title: '단단한 목재', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['단단하고 밀도감 있는 조직이\n안정적으로 이어지는 목재', '치밀하고 단단한 조직이\n특징인 원목']) };
  if (hasHardness) return { title: '단단한 목재', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['단단하고 비교적 고른 조직이 특징인\n목재', '단단한 조직감을 갖춘\n고른 조직의 목재']) };
  if (hasDensity) return { title: '치밀한 조직', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['밀도감 있는 조직이 비교적 고르게\n이어지는 목재', '치밀한 조직이 자연스럽게\n드러나는 원목']) };
  if (hasLightness && hasSoftTexture) return { title: '가벼운 목재', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['가벼운 조직과 부드러운 질감이\n특징인 원목', '가볍고 부드러운 조직감이\n자연스럽게 살아 있는 목재', '부드러운 질감이 자연스럽게 살아 있는\n가벼운 목재']) };
  if (hasLightness) return { title: '가벼운 조직', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['가벼운 조직이 특징으로 드러나는\n원목', '가벼운 조직 특성이 자연스럽게\n살아 있는 목재']) };
  if (hasSoftTexture && hasFineTexture) return { title: '고운 질감', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['부드럽고 고운 질감이 자연스럽게\n드러나는 목재', '고운 질감과 부드러운 조직이\n특징인 원목']) };
  if (hasSoftTexture) return { title: '부드러운 질감', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['부드러운 목재 질감이 특징으로\n드러나는 원목', '부드러운 질감이 자연스럽게\n살아 있는 목재']) };
  if (hasFineTexture) return { title: '고운 질감', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['고운 목재 질감이 자연스럽게\n드러나는 원목', '고운 조직감이 특징인\n원목']) };
  if (hasEvenStructure) return { title: '고른 조직', caption: selectGluedWoodTypeCProfileCaption(productProfile, ['비교적 고른 조직이 특징인\n원목', '고른 조직이 자연스럽게\n드러나는 목재']) };
  return null;
}

function buildGluedWoodTopFeatureItems(displayKnowledge, appearanceAxes, uniqueTopFeature) {
  const items = [];
  const heroCopy = cleanEntityValue(displayKnowledge && displayKnowledge.heroCopy);
  if (heroCopy) items.push({ title: '색감', caption: heroCopy });
  (appearanceAxes && appearanceAxes.hero || []).map(cleanEntityValue).filter(Boolean).forEach(function (caption) {
    items.push({ title: '결·무늬', caption: caption });
  });
  if (uniqueTopFeature && uniqueTopFeature.title && uniqueTopFeature.caption) {
    items.push({ title: uniqueTopFeature.title, caption: uniqueTopFeature.caption });
  }
  return items.filter(function (item, index, source) {
    return source.findIndex(function (candidate) {
      return candidate.title === item.title || candidate.caption === item.caption;
    }) === index;
  }).slice(0, 4);
}

function buildGluedWoodUniqueTopFeature(productProfile, profile, displayKnowledge) {
  // H/J/K는 구조 확대의 근거로만 남기고, 상단에는 제품 자체의 승인된 특징만 사용한다.
  const profileFeature = buildGluedWoodTypeCProfileTopFeature(productProfile);
  if (profileFeature) return profileFeature;
  const appearance = displayKnowledge && displayKnowledge.appearance ? displayKnowledge.appearance : {};
  const occupied = [].concat(appearance.color || [], appearance.grain || [], displayKnowledge && displayKnowledge.heroCopy || [])
    .map(cleanEntityValue)
    .filter(Boolean)
    .join(' ');
  const candidates = [].concat(
    profile && Array.isArray(profile.reasons) ? profile.reasons : [],
    appearance.knots || [],
    appearance.texture || [],
    appearance.scent || [],
    appearance.workability || []
  ).map(cleanEntityValue).filter(Boolean);
  const productSpecific = candidates.find(function (item) {
    if (/가구|인테리어|상판|선반|도어|프레임|카운터|제작|공간|노출 마감|표면 인상|실제 원목 느낌|제품별로|색감|색상|색조|색 차이|갈색|베이지|황갈색|적갈색|결|무늬|호반문|타이거/.test(item)) return false;
    if (!/옹이|유절|무절|무도장|치밀|단단|하드우드|묵직|무게감|중량|내구|유분|향|가공성|절삭|샌딩/.test(item)) return false;
    return occupied.indexOf(item) === -1;
  });
  if (!productSpecific) return null;

  const hasDenseStructure = /치밀|하드우드|단단/.test(productSpecific);
  const hasWeight = /무겁|묵직|무게감|중량/.test(productSpecific);
  if (hasDenseStructure && hasWeight) {
    return {
      title: '치밀한 목재',
      caption: '무게감 있고 치밀한 조직이 특징인\n단단한 목재'
    };
  }
  if (hasDenseStructure) return { title: '치밀한 목재', caption: '치밀한 조직이 자연스럽게 드러나는\n단단한 목재' };
  if (/옹이|유절/.test(productSpecific)) return { title: '자연스러운 옹이', caption: '옹이가 자연스럽게 드러나는\n원목 표면의 특징' };
  if (/무절/.test(productSpecific)) return { title: '정돈된 원목 표면', caption: '옹이가 적어 깔끔하게 보이는\n정돈된 원목 표면' };
  if (/무도장/.test(productSpecific)) return { title: '자연스러운 원목 표면', caption: '가공 전 원목의 결이 살아있는\n자연스러운 표면' };
  if (/유분/.test(productSpecific)) return { title: '은은한 유분감', caption: '자연스러운 유분감이 은은하게\n드러나는 원목 표면' };
  if (/(?:나무|목재)\s*향|향기/.test(productSpecific)) return { title: '은은한 나무 향', caption: '은은한 나무 향이 느껴지는\n원목의 특징' };
  if (/가공성|절삭|샌딩/.test(productSpecific)) return { title: '가공 특성', caption: '목재의 가공 특성을 살펴보고\n용도에 맞춰 고를 수 있는 판재' };
  return null;
}

function getApprovedGluedWoodSurfaceOptions(approved) {
  if (!approved || !Array.isArray(approved.surfaceOptions)) return [];
  // 표면 옵션은 상품명·일반 수종 지식이 아니라 승인 Product Knowledge에만 근거한다.
  return approved.surfaceOptions.filter(function (option) {
    return option && cleanEntityValue(option.title) && cleanEntityValue(option.caption);
  }).map(function (option) {
    return { title: cleanEntityValue(option.title), caption: cleanEntityValue(option.caption) };
  });
}

function getGluedWoodKnotOptionComparison(surfaceOptions) {
  const options = (surfaceOptions || []).filter(Boolean);
  const knotty = options.find(function (option) { return cleanEntityValue(option.title) === '유절'; });
  const knotless = options.find(function (option) { return cleanEntityValue(option.title) === '무절'; });
  // 유절·무절이 모두 승인된 동일 상품에서만 비교 이미지를 허용한다.
  return knotty && knotless ? [knotty, knotless] : [];
}

function splitGluedWoodAppearanceAxes(appearance, hasColorCopy) {
  const source = appearance || {};
  return {
    // Hero subtitle states color first; the next line may state grain or pattern only.
    hero: [].concat(hasColorCopy ? [] : (source.color || []), source.grain || []).filter(Boolean).slice(0, 2),
    surface: [].concat(source.knots || [], source.texture || [], source.scent || [], source.workability || [])
      .filter(function (item, index, items) { return item && items.indexOf(item) === index; })
      .slice(0, 4)
  };
}

function resolveSafeGluedWoodTypeCFallback(data, profile, jointType, species) {
  const typeC = profile && profile.isExactProfile && profile.typeC ? profile.typeC : null;
  const blocked = /최고급|고급|프리미엄|우수|뛰어|적합|강도|내구성|안정성|방수|방습|수축|팽창|뒤틀림|피톤치드|항균|건강|친환경/i;
  const safeFacts = typeC && Array.isArray(typeC.appearance)
    ? typeC.appearance.map(cleanEntityValue).filter(function (fact) {
      return fact && fact.length <= 70 && !blocked.test(fact);
    }).slice(0, 3)
    : [];
  const jointKnowledge = GLUED_WOOD_JOINT_TYPE_KNOWLEDGE[jointType] || GLUED_WOOD_JOINT_TYPE_KNOWLEDGE.UNKNOWN;
  if (safeFacts.length > 0) {
    const speciesTitle = cleanEntityValue(typeC.speciesTitle) || cleanEntityValue(profile.productTitle) || cleanEntityValue(data && data.productName);
    return {
      title: cleanEntityValue(data && data.productName),
      heroCopy: safeFacts[0],
      appearance: {
        color: safeFacts.slice(0, 1),
        grain: safeFacts.slice(1, 2),
        knots: [],
        texture: safeFacts.slice(2, 3),
        scent: [],
        workability: []
      },
      surfaceOptions: [],
      jointType: jointType,
      jointTitle: jointKnowledge.title,
      jointCaption: jointKnowledge.description,
      jointDetailCaption: jointKnowledge.detailCaption || jointKnowledge.description,
      identificationLevel: species ? species.identificationLevel : 'UNKNOWN',
      restrictions: ['H/K 원문 출력 금지', '검증되지 않은 수종 특징·용도·성능 생성 금지'],
      source: 'VERIFIED_EXACT_PROFILE_FACTS'
    };
  }
  if (species && (species.identificationLevel === 'EXACT' || species.identificationLevel === 'GROUP') && species.appearance) {
    return {
      title: cleanEntityValue(data && data.productName),
      heroCopy: '',
      appearance: { color: [], grain: [], knots: [], texture: [cleanEntityValue(species.appearance)], scent: [], workability: [] },
      surfaceOptions: [],
      jointType: jointType,
      jointTitle: jointKnowledge.title,
      jointCaption: jointKnowledge.description,
      jointDetailCaption: jointKnowledge.detailCaption || jointKnowledge.description,
      identificationLevel: species.identificationLevel,
      restrictions: ['제품 편차 유지', 'H/K 원문 출력 금지', '용도·성능 임의 생성 금지'],
      source: 'VERIFIED_SPECIES_MASTER'
    };
  }
  return {
    title: cleanEntityValue(data && data.productName),
    heroCopy: '',
    appearance: { color: [], grain: [], knots: [], texture: [], scent: [], workability: [] },
    surfaceOptions: [],
    jointType: jointType,
    jointTitle: jointKnowledge.title,
    jointCaption: jointType === 'UNKNOWN' ? '' : jointKnowledge.description,
    jointDetailCaption: jointType === 'UNKNOWN' ? '' : (jointKnowledge.detailCaption || jointKnowledge.description),
    identificationLevel: species ? species.identificationLevel : 'UNKNOWN',
    restrictions: ['사진 영역 확대', '빈 설명 카드 금지', 'H/K 원문 출력 금지'],
    source: 'SAFE_COMMON_FALLBACK'
  };
}

function buildGluedWoodHtmlFacts(data) {
  const approved = resolveApprovedGluedWoodTypeCCopy(data);
  const typeCProductProfile = resolveGluedWoodTypeCProductProfile(data);
  const profileSurface = typeCProductProfile && typeCProductProfile.profile && Array.isArray(typeCProductProfile.profile.surface)
    ? typeCProductProfile.profile.surface.map(cleanEntityValue).filter(Boolean)
    : [];
  const knowledge = resolveGluedWoodProductKnowledge(data);
  if (!knowledge) return null;
  const jointType = resolveGluedWoodJointTypeFromProductName(data);
  const applications = [data && data.use1, data && data.use2]
    .map(normalizeGluedWoodApplicationFacts)
    .reduce(function (items, group) { return items.concat(group); }, [])
    .filter(function (item, index, items) {
      return item && items.findIndex(function (candidate) {
        return getGluedWoodApplicationDedupKey(candidate) === getGluedWoodApplicationDedupKey(item);
      }) === index;
    });
  const verifiedUses = applications.length === 0 ? resolveVerifiedGluedWoodProductUses(data) : null;
  const resolvedApplications = applications.length > 0
    ? applications
    : verifiedUses
    ? [verifiedUses.use1, verifiedUses.use2].map(normalizeGluedWoodApplicationFacts).reduce(function (items, group) { return items.concat(group); }, [])
    : [];
  return {
    approved: approved,
    productName: cleanEntityValue(data && data.productName),
    productProfile: typeCProductProfile,
    species: knowledge.species,
    jointType: jointType,
    jointLabel: jointType === 'SOLID' ? '솔리드' : jointType === 'SIDE_FINGER' ? '사이드핑거' : jointType === 'TOP_FINGER' ? '탑핑거' : '',
    jointTitle: approved ? approved.jointTitle : GLUED_WOOD_JOINT_TYPE_KNOWLEDGE[jointType].title,
    jointCaption: approved ? approved.jointCaption : '',
    heroCopy: approved ? approved.heroCopy : profileSurface[0] || '',
    appearance: approved && approved.appearance ? approved.appearance : { color: profileSurface.slice(0, 1), grain: profileSurface.slice(1, 2), knots: [], texture: [], scent: [], workability: [] },
    researchNote: approved ? cleanEntityValue(approved.researchNote) : '',
    surfaceOptions: getApprovedGluedWoodSurfaceOptions(approved),
    jointOptions: getApprovedGluedWoodJointOptions(approved),
    applications: resolvedApplications
  };
}

function joinGluedWoodApplications(applications, limit) {
  return (applications || []).slice(0, limit || 5).join('·');
}

function buildGluedWoodNaturalUseList(applications, limit) {
  // Type C의 용도 문장은 대표 용도만 짧게 보여 준다. 이 함수는 소개·FAQ·Schema가 공통으로 사용한다.
  const items = (applications || []).filter(Boolean).slice(0, Math.min(limit || 4, 2));
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + getAndParticle(items[0]) + ' ' + items[1];
  const last = items[items.length - 1];
  const previous = items[items.length - 2];
  return items.slice(0, -1).join(', ') + getAndParticle(previous) + ' ' + last;
}

function ensureSentence(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : value + '.';
}

function resolveGluedWoodWritingStyle(facts) {
  const profile = facts && facts.productProfile && facts.productProfile.profile;
  const evidence = profile && Array.isArray(profile.physical)
    ? profile.physical.map(cleanEntityValue).join(' ')
    : '';
  if (/(?:목재|나무)\s*향|향기|고운|매끈한/.test(evidence)) return 'FINE';
  if (/자연\s*유분/.test(evidence)) return 'OIL';
  if (/(?:단단|치밀|밀도감|하드우드|무게감|무겁)/.test(evidence)) return 'DENSE';
  if (/(?:가벼운|부드러운)/.test(evidence)) return 'LIGHT';
  return 'STANDARD';
}

function getGluedWoodUseEnding(style, role) {
  const endings = {
    DENSE: { overview: '주로 사용합니다', introduction: '적합합니다', faq: '두루 활용합니다' },
    LIGHT: { overview: '자주 사용합니다', introduction: '많이 활용합니다', faq: '두루 활용합니다' },
    FINE: { overview: '자주 활용합니다', introduction: '적합합니다', faq: '주로 활용합니다' },
    OIL: { overview: '자주 사용합니다', introduction: '많이 활용합니다', faq: '주로 사용합니다' },
    STANDARD: { overview: '주로 사용합니다', introduction: '자주 활용합니다', faq: '두루 활용합니다' }
  };
  const selected = endings[style] || endings.STANDARD;
  return selected[role] || selected.overview;
}

function buildGluedWoodUseSentence(applications, limit, facts) {
  const usePhrase = buildGluedWoodUsePhrase(applications, limit, facts, 'overview');
  return usePhrase ? ensureSentence(usePhrase) : '';
}

function buildGluedWoodUsePhrase(applications, limit, facts, role) {
  const useText = buildGluedWoodNaturalUseList(applications, limit || 4);
  if (!useText) return '';
  const ending = getGluedWoodUseEnding(resolveGluedWoodWritingStyle(facts), role || 'overview');
  return /(?:제작|시공|작업|마감)$/.test(useText)
    ? useText + '에 ' + ending
    : useText + ' 제작에 ' + ending;
}

function buildGluedWoodFAQUseSentence(applications, limit, facts) {
  const usePhrase = buildGluedWoodUsePhrase(applications, limit, facts, 'faq');
  return usePhrase ? ensureSentence(usePhrase) : '';
}

function buildGluedWoodIntroductionUseSentence(facts) {
  const usePhrase = buildGluedWoodUsePhrase(
    buildGluedWoodCompactApplications((facts && facts.applications) || [], 4),
    4,
    facts,
    'introduction'
  );
  return usePhrase ? ensureSentence(usePhrase) : '';
}

function buildGluedWoodCompactApplications(applications, limit) {
  const items = (applications || []).filter(Boolean).slice(0, limit || 4);
  const topItems = items.filter(function (item) { return /\s*상판$/.test(item); });
  if (topItems.length < 2) return items;

  const compactTop = topItems.map(function (item, index) {
    const base = item.replace(/\s*상판$/, '').trim();
    if (base === '주방') return '주방용 상판';
    return index === topItems.length - 1 ? item : base;
  }).join(', ');
  let compacted = false;
  return items.reduce(function (result, item) {
    if (/\s*상판$/.test(item)) {
      if (!compacted) {
        result.push(compactTop);
        compacted = true;
      }
      return result;
    }
    result.push(item);
    return result;
  }, []);
}

function buildGluedWoodIntroductionReasonSentence(facts) {
  if (!facts) return '필요한 규격의 원목 판재를 구성할 때 선택합니다.';
  if (facts.jointType === 'TOP_FINGER') {
    return '필요한 길이의 판재를 안정적으로 구성할 때 선택하는 집성 방식입니다.';
  }
  if (facts.jointType === 'SIDE_FINGER') {
    return '원목 부재를 길게 이어 필요한 규격의 판재를 구성할 때 선택하는 방식입니다.';
  }
  if (facts.jointType === 'SOLID') {
    return '원목 부재를 나란히 이어 넓은 규격의 판재를 구성할 때 선택합니다.';
  }
  return '필요한 규격의 원목 판재를 구성할 때 선택합니다.';
}

function buildGluedWoodPurchaseNotes(facts) {
  const optionText = facts && facts.surfaceOptions && facts.surfaceOptions.length > 0
    ? facts.surfaceOptions.map(function (option) { return option.title; }).join('·')
    : '';
  const notesByJoint = {
    TOP_FINGER: [
      '• 필요한 두께와 완성 규격을 먼저 정하세요.',
      '• 재단 후 남겨둘 여유 치수를 작업 전에 계산하세요.',
      '• 노출면의 마감 방향을 주문 조건에 함께 적어두세요.',
      '• 수령 후 확인할 기준면과 수량을 미리 정해두세요.'
    ],
    SIDE_FINGER: [
      '• 필요한 두께와 완성 규격을 먼저 정하세요.',
      '• 재단 후 남겨둘 여유 치수를 작업 전에 계산하세요.',
      '• 노출면의 마감 방향을 주문 조건에 함께 적어두세요.',
      '• 수령 후 확인할 기준면과 수량을 미리 정해두세요.'
    ],
    SOLID: [
      '• 필요한 두께와 완성 규격을 먼저 정하세요.',
      '• 재단 후 남겨둘 여유 치수를 작업 전에 계산하세요.',
      '• 노출면의 마감 방향을 주문 조건에 함께 적어두세요.',
      '• 수령 후 확인할 기준면과 수량을 미리 정해두세요.'
    ],
    UNKNOWN: [
      '• 제품에 적용된 집성 방식과 접합부 위치를 확인하세요.',
      '• 노출면의 색감과 나뭇결을 함께 살펴보세요.',
      '• 사용할 규격과 재단 치수는 작업 전에 정하면 좋습니다.'
    ]
  };
  const notes = (notesByJoint[(facts && facts.jointType) || 'UNKNOWN'] || notesByJoint.UNKNOWN).slice();
  const jointOptionText = getGluedWoodJointOptionText(facts);
  if (jointOptionText) {
    notes.splice(1, 0, '• ' + jointOptionText + ' 중 필요한 집성 방식을 상품 옵션에서 확인하세요.');
  }
  if (optionText) {
    notes.splice(2, 0, '• ' + optionText + ' 중 노출면에 맞는 표면 옵션을 선택하세요.');
  }
  return notes.slice(0, 5);
}

function getGluedWoodSpeciesProfileFacts(facts) {
  const profile = facts && facts.productProfile && facts.productProfile.profile || {};
  const appearance = facts && facts.appearance || {};
  const surface = (Array.isArray(profile.surface) && profile.surface.length > 0
    ? profile.surface
    : [].concat(facts && facts.heroCopy || [], appearance.grain || []))
    .map(normalizeGluedWoodAppearanceFact)
    .filter(Boolean);
  const physical = (profile.physical || []).map(cleanEntityValue).filter(Boolean);
  return {
    surface: surface,
    physical: physical,
    purchaseFeature: cleanEntityValue(profile.purchaseFeature)
  };
}

function buildGluedWoodSpeciesIntroductionSentence(facts) {
  const speciesFacts = getGluedWoodSpeciesProfileFacts(facts);
  const surface = speciesFacts.surface[0] || '';
  const physical = speciesFacts.physical[0] || '';
  if (surface && physical) {
    const combined = /바탕$/.test(surface)
      ? surface + '에 ' + physical + getNominativeParticle(physical) + ' 더해진'
      : surface + getAndParticle(surface) + ' ' + physical + getNominativeParticle(physical) + ' 특징인';
    return ensureSentence(combined + ' 원목입니다');
  }
  if (surface) return ensureSentence(surface + getNominativeParticle(surface) + ' 특징인 원목입니다');
  if (physical) return ensureSentence(physical + getNominativeParticle(physical) + ' 특징인 원목입니다');
  return '';
}

function buildGluedWoodSpeciesPurchaseFeatureSentence(facts) {
  const feature = cleanEntityValue(facts && facts.productProfile && facts.productProfile.profile && facts.productProfile.profile.purchaseFeature);
  if (!feature) return '';
  const guidance = feature
    .replace(/살펴보는\s*(?:원목|제품|소나무 집성판)입니다\.?$/, '확인합니다.')
    .replace(/확인하는\s*(?:원목|제품)입니다\.?$/, '확인합니다.');
  return /^선택할 때에는/.test(guidance) ? guidance : '선택할 때에는 ' + guidance;
}

function buildGluedWoodSpeciesPhysicalQuestion(physicalFact) {
  if (/향|향기/.test(physicalFact)) return '목재 향은 어떤 편인가요?';
  if (/질감/.test(physicalFact)) return '목재 질감은 어떤 편인가요?';
  if (/밀도/.test(physicalFact)) return '조직의 밀도감은 어떤 편인가요?';
  if (/조직/.test(physicalFact)) return '조직은 어떤 편인가요?';
  return '목재의 특징은 무엇인가요?';
}

function buildGluedWoodSpeciesPhysicalAnswer(physicalFact) {
  if (physicalFact) return ensureSentence(physicalFact + getNominativeParticle(physicalFact) + ' 특징입니다');
  return '';
}

function buildGluedWoodSurfaceOptionFAQ(options) {
  const validOptions = (options || []).filter(function (option) {
    return cleanEntityValue(option && option.title) && cleanEntityValue(option && option.caption);
  });
  if (validOptions.length < 2) return null;
  const titles = validOptions.map(function (option) { return cleanEntityValue(option.title); });
  const titleText = titles.length === 2
    ? titles[0] + getAndParticle(titles[0]) + ' ' + titles[1]
    : titles.join('·');
  const answer = validOptions.map(function (option, index) {
    const title = cleanEntityValue(option.title);
    const caption = cleanEntityValue(option.caption).replace(/[.]$/, '');
    return title + getSubjectParticle(title) + ' ' + caption + (index === validOptions.length - 1 ? '입니다' : index === validOptions.length - 2 ? '이고' : '이며');
  }).join(', ');
  return {
    question: titleText + '은 어떻게 다른가요?',
    answer: ensureSentence(answer)
  };
}

function buildGluedWoodSurfaceOptionIntroductionSentence(options) {
  const validOptions = (options || []).filter(function (option) {
    return cleanEntityValue(option && option.title) && cleanEntityValue(option && option.caption);
  });
  if (validOptions.length < 2) return '';
  const titles = validOptions.map(function (option) { return cleanEntityValue(option.title); });
  const titleText = titles.length === 2
    ? titles[0] + getAndParticle(titles[0]) + ' ' + titles[1]
    : titles.join('·');
  return titleText + ' 중 노출면에 맞는 표면 옵션을 선택할 수 있습니다.';
}

function getGluedWoodFAQFactKind(fact, source) {
  const value = cleanEntityValue(fact);
  if (/(?:유절|무절|옹이)/.test(value)) return 'KNOT';
  if (/(?:결|무늬)/.test(value)) return 'GRAIN';
  if (/(?:색|베이지|브라운|황갈색|붉은)/.test(value)) return 'COLOR';
  if (/(?:질감|매끈|고운)/.test(value)) return 'TEXTURE';
  if (/(?:향|향기)/.test(value)) return 'SCENT';
  if (source === 'physical' && /밀도/.test(value)) return 'DENSITY';
  if (source === 'physical' && /조직/.test(value)) return 'STRUCTURE';
  return source === 'physical' ? 'PHYSICAL' : 'SURFACE';
}

function buildGluedWoodSurfaceFAQCandidate(fact, kind) {
  const value = cleanEntityValue(fact);
  if (!value || /표면 인상/.test(value)) return null;
  if (kind === 'KNOT') return { key: kind, question: '옹이는 어떻게 보이나요?', answer: ensureSentence(value + getNominativeParticle(value) + ' 제품 표면에서 드러납니다') };
  if (kind === 'GRAIN') return { key: kind, question: '나뭇결은 어떻게 보이나요?', answer: ensureSentence(value + getNominativeParticle(value) + ' 제품 표면에서 드러납니다') };
  if (kind === 'TEXTURE') return { key: kind, question: '표면 질감은 어떤 편인가요?', answer: ensureSentence(value + getNominativeParticle(value) + ' 특징입니다') };
  if (kind === 'SCENT') return { key: kind, question: '목재 향은 어떤 편인가요?', answer: ensureSentence(value + getNominativeParticle(value) + ' 특징입니다') };
  return { key: kind, question: value + getSubjectParticle(value) + ' 어떻게 보이나요?', answer: ensureSentence(value + getNominativeParticle(value) + ' 제품 표면에서 드러납니다') };
}

function buildGluedWoodPhysicalFAQCandidate(fact, kind) {
  const value = cleanEntityValue(fact);
  if (!value) return null;
  return {
    key: kind,
    question: buildGluedWoodSpeciesPhysicalQuestion(value),
    answer: buildGluedWoodSpeciesPhysicalAnswer(value)
  };
}

function buildGluedWoodSpeciesFAQCandidates(facts) {
  const speciesFacts = getGluedWoodSpeciesProfileFacts(facts);
  const usedKinds = {};
  const candidates = [];
  const introductionSurface = speciesFacts.surface[0] || '';
  const introductionPhysical = speciesFacts.physical[0] || '';
  if (introductionSurface) usedKinds[getGluedWoodFAQFactKind(introductionSurface, 'surface')] = true;
  if (introductionPhysical) usedKinds[getGluedWoodFAQFactKind(introductionPhysical, 'physical')] = true;
  function addCandidate(candidate) {
    if (!candidate || usedKinds[candidate.key]) return;
    usedKinds[candidate.key] = true;
    candidates.push(candidate);
  }

  if (hasGluedWoodJointOptionComparison(facts)) {
    const options = facts.jointOptions;
    addCandidate({
      key: 'JOINT_OPTIONS',
      question: (function () {
        const titleText = options.map(function (option) { return option.title; }).join('·');
        return titleText + getSubjectParticle(titleText) + ' 어떻게 다른가요?';
      })(),
      answer: ensureSentence(options.map(function (option, index) {
        return option.title + getSubjectParticle(option.title) + ' ' + option.caption + (index === options.length - 1 ? '입니다' : '이고');
      }).join(', '))
    });
  }

  const optionFAQ = buildGluedWoodSurfaceOptionFAQ(facts && facts.surfaceOptions);
  if (optionFAQ) addCandidate({ key: 'OPTIONS', question: optionFAQ.question, answer: optionFAQ.answer });

  speciesFacts.surface.slice(1).forEach(function (fact) {
    if (optionFAQ && /(?:유절|무절|옵션)/.test(fact)) return;
    addCandidate(buildGluedWoodSurfaceFAQCandidate(fact, getGluedWoodFAQFactKind(fact, 'surface')));
  });
  speciesFacts.physical.slice(1).forEach(function (fact) {
    addCandidate(buildGluedWoodPhysicalFAQCandidate(fact, getGluedWoodFAQFactKind(fact, 'physical')));
  });

  const appearance = facts && facts.appearance || {};
  ['grain', 'knots', 'texture', 'scent'].forEach(function (axis) {
    (appearance[axis] || []).forEach(function (fact) {
      if (optionFAQ && (axis === 'knots' || /(?:유절|무절|옵션)/.test(fact))) return;
      addCandidate(buildGluedWoodSurfaceFAQCandidate(fact, getGluedWoodFAQFactKind(fact, 'surface')));
    });
  });
  return candidates.slice(0, 3);
}

function buildGluedWoodSpeciesFAQItems(facts, items) {
  const candidates = buildGluedWoodSpeciesFAQCandidates(facts);
  if (candidates.length === 0) return null;
  return candidates.map(function (candidate) {
    return {
      question: cleanHumanWritingText(candidate.question),
      answer: cleanHumanWritingText(candidate.answer)
    };
  });
}

function buildGluedWoodConsultationFAQItems(facts, items) {
  const speciesFAQ = buildGluedWoodSpeciesFAQItems(facts, items);
  if (speciesFAQ) return speciesFAQ;
  const hasKnotOptionComparison = getGluedWoodKnotOptionComparison(facts && facts.surfaceOptions).length === 2;
  const knotOptionAnswer = '유절은 옹이가 자연스럽게 드러나고, 무절은 눈에 띄는 옹이가 적어 비교적 정돈된 표면으로 구분합니다.';
  if (!facts) return items(
    '재단 전에 무엇을 확인해야 하나요?',
    '노출할 면과 필요한 규격을 먼저 정한 뒤 접합부 위치를 함께 확인하세요.',
    '노출면은 어떻게 정하나요?',
    '색감과 나뭇결의 편차가 보이는 면을 기준으로 사용할 방향을 정합니다.',
    '표면 상태는 어떻게 살펴보나요?',
    '옹이와 접합선, 재단면이 작업 기준에 맞는지 확인하세요.'
  );

  if (facts.jointType === 'TOP_FINGER') {
    return items(
      '상판의 핑거 이음은 어떻게 보이나요?',
      '짧은 맞물림이 상판의 한 연결부에만 보이며, 긴 반복 무늬처럼 이어지지 않습니다.',
      '이음 부근의 나뭇결은 어떻게 보이나요?',
      '연결부 양쪽은 같은 결 방향과 색감이 자연스럽게 이어지도록 구성합니다.',
      hasKnotOptionComparison ? '유절과 무절은 어떻게 다른가요?' : '재단 전에 확인할 부분은 무엇인가요?',
      hasKnotOptionComparison
        ? knotOptionAnswer
        : '필요한 규격과 노출 방향을 정한 뒤 이음 위치가 작업 기준에 맞는지 확인하세요.'
    );
  }

  if (facts.jointType === 'SIDE_FINGER') {
    return items(
      '측면 핑거 이음은 어디에서 보이나요?',
      '긴 측면의 한 원목 부재 연결부에만 국소적으로 보입니다.',
      '상판과 측면의 외관은 어떻게 다른가요?',
      '상판에서는 연결선이 크게 드러나지 않고, 측면에서만 이음 위치를 확인할 수 있습니다.',
      hasKnotOptionComparison ? '유절과 무절은 어떻게 다른가요?' : '재단 방향에 따라 연결부는 어떻게 보이나요?',
      hasKnotOptionComparison
        ? knotOptionAnswer
        : '측면을 노출하는 재단이라면 연결부 위치가 남는 방향인지 먼저 확인하세요.'
    );
  }

  if (facts.jointType === 'SOLID') {
    return items(
      '핑거 이음이 없는지 어떻게 확인하나요?',
      '솔리드 집성은 핑거 맞물림 없이 원목 부재를 나란히 이어 만든 방식입니다.',
      hasKnotOptionComparison ? '유절과 무절은 어떻게 다른가요?' : '색감과 나뭇결은 어떻게 고르나요?',
      hasKnotOptionComparison
        ? knotOptionAnswer
        : '원목 부재마다 보이는 색감과 결의 차이를 기준으로 노출할 면을 정하세요.',
      '주문 전에 확인할 항목은 무엇인가요?',
      '필요한 규격과 재단 치수, 노출할 면의 접합선 위치를 함께 확인하세요.'
    );
  }

  return items(
    '재단 전에 무엇을 확인해야 하나요?',
    '필요한 규격과 노출할 면을 먼저 정한 뒤 접합부 위치를 확인하세요.',
    '노출면은 어떻게 정하나요?',
    '색감과 나뭇결, 옹이 상태를 함께 살펴보고 사용할 방향을 정합니다.',
    '표면 상태는 어떻게 살펴보나요?',
    '옹이와 접합선, 재단면이 작업 기준에 맞는지 확인하세요.'
  );
}

function buildGluedWoodJointSentence(facts) {
  if (!facts) return '';
  if (hasGluedWoodJointOptionComparison(facts)) {
    return getGluedWoodJointOptionText(facts) + ' 옵션이 있으며, 연결 무늬가 보이는 위치를 기준으로 선택합니다.';
  }
  if (facts.jointType === 'TOP_FINGER') return '상판에서 짧은 핑거 이음이 보이는 탑핑거 집성판입니다.';
  if (facts.jointType === 'SIDE_FINGER') return '측면의 한 원목 부재에서 핑거 이음이 보이는 사이드핑거 집성판입니다.';
  if (facts.jointType === 'SOLID') return '여러 원목을 나란히 이어 만든 솔리드 집성판입니다.';
  return facts.jointTitle ? ensureSentence(facts.jointTitle + ' 방식의 집성판입니다') : '';
}

function buildGluedWoodFAQDefinitionSentence(facts) {
  if (!facts) return '';
  if (facts.jointType === 'TOP_FINGER') return '짧은 원목 부재를 탑핑거 방식으로 연결한 집성판입니다.';
  if (facts.jointType === 'SIDE_FINGER') return '원목 부재를 길이 방향으로 연결한 사이드핑거 집성판입니다.';
  if (facts.jointType === 'SOLID') return '여러 원목을 나란히 이어 만든 솔리드 집성판입니다.';
  return '여러 원목을 이어 만든 집성판입니다.';
}

function buildGluedWoodIntroductionDefinitionSentence(facts) {
  const style = resolveGluedWoodWritingStyle(facts);
  if (!facts) return '원목을 이어 만든 집성판입니다.';
  const definitions = {
    TOP_FINGER: {
      DENSE: '여러 원목 조각을 핑거 방식으로 연결해 만든 집성판입니다.',
      LIGHT: '짧은 원목을 핑거 방식으로 접합해 만든 집성판입니다.',
      FINE: '짧은 원목 부재를 핑거 이음으로 연결해 만든 집성판입니다.',
      OIL: '짧은 원목 부재를 핑거 방식으로 연결해 만든 집성판입니다.',
      STANDARD: '짧은 원목 부재를 핑거 방식으로 연결해 만든 집성판입니다.'
    },
    SIDE_FINGER: {
      DENSE: '원목 부재를 길이 방향으로 이어 구성한 집성판입니다.',
      LIGHT: '길이를 맞춘 원목 부재를 이어 만든 집성판입니다.',
      FINE: '원목 부재를 길게 이어 완성한 집성판입니다.',
      OIL: '원목 부재를 길이 방향으로 연결한 집성판입니다.',
      STANDARD: '원목 부재를 길이 방향으로 이어 만든 집성판입니다.'
    },
    SOLID: {
      DENSE: '여러 원목 부재를 접합해 완성한 솔리드 집성판입니다.',
      LIGHT: '원목을 나란히 접합해 넓게 만든 솔리드 집성판입니다.',
      FINE: '원목 부재를 나란히 이어 구성한 솔리드 집성판입니다.',
      OIL: '여러 원목을 나란히 이어 만든 솔리드 집성판입니다.',
      STANDARD: '여러 원목을 나란히 이어 만든 집성판입니다.'
    }
  };
  if (definitions[facts.jointType]) return definitions[facts.jointType][style] || definitions[facts.jointType].STANDARD;
  return buildGluedWoodFAQDefinitionSentence(facts);
}

function normalizeGluedWoodAppearanceFact(value) {
  return cleanEntityValue(value).replace(/결과\s*색의 대비/g, '결 패턴과 색의 대비');
}

function joinGluedWoodAppearanceFacts(first, second) {
  if (!first || !second) return '';
  if (/바탕$/.test(first)) return first + '에 ' + second;
  return first + getAndParticle(first) + ' ' + second;
}

function buildGluedWoodAppearanceSentence(facts) {
  if (!facts) return '';
  const appearance = facts.appearance || {};
  const source = []
    .concat(facts.heroCopy || [], appearance.grain || [], appearance.texture || [])
    .map(normalizeGluedWoodAppearanceFact)
    .filter(function (item, index, items) {
      return item && items.indexOf(item) === index && !/표면 인상/.test(item);
    })
    .slice(0, 2);
  if (!source.length) return '';
  if (source.length === 1) return ensureSentence(source[0] + getNominativeParticle(source[0]) + ' 특징입니다');
  return ensureSentence(joinGluedWoodAppearanceFacts(source[0], source[1]) + getNominativeParticle(source[1]) + ' 특징입니다');
}

function buildGluedWoodFAQAppearanceSentence(facts) {
  if (!facts) return '';
  const appearance = facts.appearance || {};
  const color = normalizeGluedWoodAppearanceFact(facts.heroCopy).replace(/\s*원목 색감$/, ' 색조');
  const grain = normalizeGluedWoodAppearanceFact((appearance.grain || [])[0]);
  if (color && grain) return ensureSentence(joinGluedWoodAppearanceFacts(color, grain) + getNominativeParticle(grain) + ' 특징입니다');
  if (color) return ensureSentence(color + getNominativeParticle(color) + ' 특징입니다');
  if (grain) return ensureSentence(grain + getNominativeParticle(grain) + ' 특징입니다');
  return '';
}

function buildGluedWoodColorSentence(facts) {
  const color = cleanEntityValue(facts && facts.heroCopy);
  if (!color) return '';
  const style = resolveGluedWoodWritingStyle(facts);
  const endings = {
    DENSE: '선명하게 드러납니다',
    LIGHT: '부드럽게 드러납니다',
    FINE: '맑게 돋보입니다',
    OIL: '차분하게 조화를 이룹니다',
    STANDARD: '잘 드러납니다'
  };
  const appearance = /원목 색감$/.test(color)
    ? color.replace(/\s*원목 색감$/, ' 색감')
    : color;
  return ensureSentence(appearance + getNominativeParticle(appearance) + ' ' + (endings[style] || endings.STANDARD));
}

function buildGluedWoodAppearanceAndUseSentence(facts) {
  const appearance = (facts && facts.appearance) || {};
  const color = cleanEntityValue(facts && facts.heroCopy);
  const grain = normalizeGluedWoodAppearanceFact((appearance.grain || [])[0] || '');
  const texture = normalizeGluedWoodAppearanceFact((appearance.texture || [])[0] || '');
  const detail = grain || texture;
  const usePhrase = buildGluedWoodUsePhrase((facts && facts.applications) || [], 4, facts, 'introduction');
  let appearancePhrase = '';

  if (color && detail) {
    const combined = joinGluedWoodAppearanceFacts(color, detail);
    appearancePhrase = /(?:색 차이|대비)/.test(combined)
      ? combined + getNominativeParticle(detail) + ' 뚜렷하게 드러나'
      : combined + getNominativeParticle(detail) + getGluedWoodAppearanceEnding(resolveGluedWoodWritingStyle(facts));
  } else if (color) {
    appearancePhrase = color + getNominativeParticle(color) + ' 잘 드러나';
  } else if (detail) {
    appearancePhrase = detail + getNominativeParticle(detail) + ' 돋보이며';
  }

  if (appearancePhrase && usePhrase) return ensureSentence(appearancePhrase + ' ' + usePhrase);
  if (appearancePhrase) return completeGluedWoodAppearancePhrase(appearancePhrase);
  return usePhrase ? ensureSentence(usePhrase) : '';
}

function completeGluedWoodAppearancePhrase(phrase) {
  const completed = String(phrase || '')
    .replace(/드러나$/, '드러납니다')
    .replace(/어우러져$/, '어우러집니다')
    .replace(/이루며$/, '이룹니다')
    .replace(/돋보이며$/, '돋보입니다');
  return ensureSentence(completed);
}

function getGluedWoodAppearanceEnding(style) {
  const endings = {
    DENSE: ' 선명하게 드러나',
    LIGHT: ' 부드럽게 조화를 이루며',
    FINE: ' 고르게 어우러져',
    OIL: ' 차분하게 조화를 이루며',
    STANDARD: ' 잘 어우러져'
  };
  return endings[style] || endings.STANDARD;
}

function buildGluedWoodSurfaceSentence(facts, limit) {
  if (!facts) return '';
  const appearance = facts.appearance || {};
  const source = [].concat(appearance.grain || [], appearance.knots || [], appearance.texture || [])
    .filter(function (item, index, items) { return item && items.indexOf(item) === index && !/표면 인상/.test(item); })
    .slice(0, limit || 2);
  if (!source.length) return '';
  return ensureSentence(source.join('과 ') + '이 특징입니다');
}

function buildGluedWoodInfographicAlt(data, imageIndex) {
  const facts = buildGluedWoodHtmlFacts(data);
  if (!facts) return '';
  if (hasGluedWoodJointOptionComparison(facts)) {
    return Number(imageIndex) > 1
      ? '탑핑거와 사이드핑거의 연결 무늬 위치를 비교한 구조 인포그래픽'
      : '밝은 고무나무 색감과 고른 나뭇결, 탑핑거·사이드핑거 집성 방식 옵션을 비교한 인포그래픽';
  }
  const profile = getSelectionInfographicProfile(data);
  const ui = profile ? buildGluedWoodTypeCUIBlocks(data, profile) : null;
  const optionTitles = [].concat(ui ? ui.surfaceOptions || [] : facts.surfaceOptions || [], ui ? ui.knotOptionComparison || [] : [])
    .map(function (option) { return cleanEntityValue(option && option.title); })
    .filter(Boolean);
  const uniqueOptionTitles = optionTitles.filter(function (title, index, titles) { return titles.indexOf(title) === index; });
  const surfaceFacts = [cleanEntityValue(ui ? ui.hero.surfaceCopy : facts.heroCopy)]
    .concat(ui ? ui.hero.facts || [] : facts.appearance && facts.appearance.grain || [])
    .filter(Boolean)
    .filter(function (fact, index, facts) { return facts.indexOf(fact) === index; })
    .slice(0, 2);
  const jointTitle = cleanEntityValue(ui && ui.joint && ui.joint.title || facts.jointTitle);
  if (Number(imageIndex) > 1) {
    return limitInfographicAlt((jointTitle ? jointTitle + '의 접합부 위치를 설명하는' : '집성 구조를 설명하는') + ' 구조 인포그래픽');
  }
  const surfaceText = surfaceFacts.join('과 ');
  const optionText = uniqueOptionTitles.length > 0 ? uniqueOptionTitles.join('·') + ' 표면 옵션' : '';
  const details = [surfaceText, optionText, jointTitle ? jointTitle + ' 구조' : ''].filter(Boolean);
  return limitInfographicAlt(details.join(', ') + '를 보여주는 인포그래픽');
}

function buildGluedWoodAISummary(data) {
  const facts = buildGluedWoodHtmlFacts(data);
  if (!facts) return [];
  const lines = [];
  const colorSentence = buildGluedWoodColorSentence(facts);
  if (colorSentence) lines.push(colorSentence);
  const jointSentence = buildGluedWoodJointSentence(facts);
  if (jointSentence) lines.push(jointSentence);
  const useSentence = buildGluedWoodUseSentence(facts.applications, 4, facts);
  if (useSentence) lines.push(useSentence);
  return lines.slice(0, 3).map(cleanHumanWritingText);
}

function buildGluedWoodSpecRowsHtml(data) {
  const facts = buildGluedWoodHtmlFacts(data);
  if (!facts) return '';
  const rows = [];
  if (facts.jointLabel) rows.push(`    <tr><th>집성 방식</th><td>${escapeHtml(facts.jointLabel)}</td></tr>`);
  const jointOptionText = getGluedWoodJointOptionText(facts);
  if (jointOptionText) rows.push(`    <tr><th>집성 방식 옵션</th><td>${escapeHtml(jointOptionText)}</td></tr>`);
  const optionText = facts.surfaceOptions.map(function (option) { return option.title; }).join(' / ');
  if (optionText) rows.push(`    <tr><th>표면 옵션</th><td>${escapeHtml(optionText)}</td></tr>`);
  return rows.join('\n');
}

function buildGluedWoodSchemaDescription(data) {
  const facts = buildGluedWoodHtmlFacts(data);
  if (!facts) return '';
  return [
    buildGluedWoodColorSentence(facts),
    buildGluedWoodJointSentence(facts),
    buildGluedWoodUseSentence(facts.applications, 4, facts)
  ].filter(Boolean).join(' ');
}

function buildGluedWoodTypeCUIBlocks(data, profile) {
  const knowledge = resolveGluedWoodProductKnowledge(data);
  const species = knowledge && knowledge.species;
  const jointType = resolveGluedWoodJointTypeFromProductName(data);
  const jointValidation = validateGluedWoodJointEvidence(data, jointType);
  if (jointValidation.status === 'CONFLICT') {
    throw new Error('집성 방식 충돌: ' + jointValidation.reason);
  }
  const approved = resolveApprovedGluedWoodTypeCCopy(data);
  const displayKnowledge = approved || resolveSafeGluedWoodTypeCFallback(data, profile, jointType, species);
  const visualRule = GLUED_WOOD_JOINT_VISUAL_RULES[jointType] || GLUED_WOOD_JOINT_VISUAL_RULES.UNKNOWN;
  if (approved && approved.jointType !== jointType) {
    throw new Error('승인 Product Knowledge와 상품명의 집성 방식이 일치하지 않습니다: ' + data.productName);
  }
  const applicationGroups = [data && data.use1, data && data.use2].map(function (value) {
    return normalizeGluedWoodApplicationFacts(value).slice(0, 2);
  });
  const seenApplications = [];
  const sheetApplications = applicationGroups.map(function (group) {
    return group.filter(function (item) {
      const normalized = getGluedWoodApplicationDedupKey(item);
      if (!normalized || seenApplications.indexOf(normalized) !== -1) return false;
      seenApplications.push(normalized);
      return true;
    });
  });
  const referenceFacts = classifyGluedWoodReferenceFacts(data);
  const approvedSurfaceOptions = getApprovedGluedWoodSurfaceOptions(approved);
  const knotOptionComparison = getGluedWoodKnotOptionComparison(approvedSurfaceOptions).map(function (option, index) {
    return {
      title: option.title,
      caption: option.caption,
      imageRole: 'real_surface_option_comparison_photo',
      position: 'below_joint_' + (index === 0 ? 'left' : 'right'),
      forbidden: ['QUALITY_RANKING', 'PERFORMANCE_RANKING', 'INVENTED_KNOT_LIMIT']
    };
  });
  const surfaceOptions = (knotOptionComparison.length > 0 ? [] : approvedSurfaceOptions).map(function (option, index) {
    return {
      title: option.title,
      caption: option.caption,
      imageRole: 'real_surface_option_photo',
      position: 'middle_left_' + (index + 1),
      forbidden: ['QUALITY_RANKING', 'PERFORMANCE_RANKING', 'INVENTED_KNOT_LIMIT']
    };
  });
  const applications = sheetApplications.reduce(function (items, group, groupIndex) {
    return items.concat(group.map(function (caption, itemIndex) {
      return {
        caption: caption,
        imageRole: 'real_application_photo',
        position: 'bottom_' + (groupIndex === 0 ? 'left' : 'right') + '_' + (itemIndex + 1),
        forbidden: ['UNVERIFIED_USE', 'MARKETING_CLAIM']
      };
    }));
  }, []).slice(0, 4);
  const appearance = displayKnowledge && displayKnowledge.appearance ? displayKnowledge.appearance : { color: [], grain: [], knots: [], texture: [], scent: [], workability: [] };
  const appearanceAxes = splitGluedWoodAppearanceAxes(appearance, Boolean(displayKnowledge.heroCopy));
  const surfaceFacts = appearanceAxes.surface;
  const jointSummary = {
    title: '집성 구조',
    caption: '여러 원목을 이어\n하나의 판재로 만든 구조'
  };
  const typeCProductProfile = resolveGluedWoodTypeCProductProfile(data);
  const uniqueTopFeature = buildGluedWoodUniqueTopFeature(typeCProductProfile, profile, displayKnowledge);
  const topFeatures = buildGluedWoodTopFeatureItems(displayKnowledge, appearanceAxes, uniqueTopFeature);
  return {
    version: 'GLUED_WOOD_TYPE_C_LAYOUT_V3',
    isExactApproved: Boolean(approved),
    hero: {
      title: displayKnowledge.title || profile.productTitle,
      surfaceCopy: displayKnowledge.heroCopy || '',
      facts: appearanceAxes.hero,
      features: topFeatures,
      imageRole: 'full_product_photo',
      position: 'top_55',
      forbidden: ['ADDITIONAL_COPY', 'HEALTH_CLAIM', 'PERFORMANCE_CLAIM', 'MARKETING_CLAIM']
    },
    surfaceOptions: surfaceOptions,
    knotOptionComparison: knotOptionComparison,
    surfaceFacts: surfaceFacts,
    jointSummary: jointSummary,
    joint: {
      type: jointType,
      title: displayKnowledge.jointTitle || GLUED_WOOD_JOINT_TYPE_KNOWLEDGE[jointType].title,
      caption: displayKnowledge.jointCaption || '',
      detailCaption: displayKnowledge.jointDetailCaption || displayKnowledge.jointCaption || '',
      imageRole: visualRule.imageRole,
      position: surfaceOptions.length > 0 ? 'middle_right' : 'middle_full',
      positive: visualRule.positive.slice(),
      forbidden: visualRule.forbidden.slice()
    },
    applications: applications,
    fidelity: {
      identificationLevel: species ? species.identificationLevel : 'UNKNOWN',
      jEvidenceStatus: jointValidation.status,
      referenceFacts: referenceFacts,
      contentSource: displayKnowledge.source || 'APPROVED_EXACT',
      restrictions: (displayKnowledge.restrictions || []).slice(),
      productIdentityRules: GLUED_WOOD_PRODUCT_IDENTITY_RULES.slice(),
      nonRenderingRules: ['NO_HK_SOURCE_TEXT', 'NO_J_SOURCE_TEXT', 'NO_UNAPPROVED_COPY', 'NO_EMPTY_BLOCKS']
    }
  };
}

function buildGluedWoodTypeCUIBlockPrompt(data, profile) {
  const ui = buildGluedWoodTypeCUIBlocks(data, profile);
  const renderText = [
    ui.hero.title
  ].concat(
    ui.hero.features.reduce(function (lines, feature) {
      return lines.concat([feature.title, feature.caption]);
    }, []),
    ui.surfaceFacts,
    ui.surfaceOptions.reduce(function (lines, option) {
      return lines.concat([option.title, option.caption]);
    }, []),
    ui.knotOptionComparison.reduce(function (lines, option) {
      return lines.concat([option.title, option.caption]);
    }, []),
    [ui.jointSummary.title, ui.jointSummary.caption, ui.joint.title, ui.joint.detailCaption],
    ui.applications.map(function (application) { return application.caption; })
  ).filter(Boolean).map(function (text) { return '"' + text + '"'; }).join('\n');
  const surfaceLayout = ui.surfaceOptions.length > 0
    ? 'Keep ' + ui.surfaceOptions.length + ' approved real surface option photo block(s) in the existing surface option area.'
    : 'No surface option photo block is required.';
  const knotOptionComparisonLayout = ui.knotOptionComparison.length === 2
    ? '- BELOW_JOINT: place one side-by-side real-surface comparison photo block directly below the joint structure image, using only the approved "유절" and "무절" labels and captions. Keep this as a surface-choice comparison only; do not imply quality, price, performance or ranking.'
    : '';
  const applicationLayout = ui.applications.length > 1
    ? 'BOTTOM_25: group the approved application captions into two balanced real-photo areas without adding another use.'
    : ui.applications.length === 1
    ? 'BOTTOM_25: one full-width real application photo with one caption.'
    : 'BOTTOM_25: omit this block and expand the hero and joint photo areas.';
  const jointRules = {
    SOLID: `
JOINT_VISUAL=SOLID
- TOP_SURFACE: parallel long wood strips run in the board length direction with consistent strip width and evenly spaced widthwise glue lines.
- LONG_SIDE_FACE: continuous strip boundaries with the same strip count, width and order as the hero TOP_SURFACE.
- SHORT_END_FACE: cross-sections of the widthwise-arranged wood strips only.
- CLOSEUP: enlarge the same product's wood strips and one widthwise edge-glued boundary; preserve identical strip width, order, color and grain.
- ZERO finger joints on TOP_SURFACE, LONG_SIDE_FACE, SHORT_END_FACE and EDGE_LINE.
- No uneven strip width, oversized or undersized strip, random block layout, short pieces, teeth, zipper pattern, plywood-like layers or repeated CGI texture.`,
    SIDE_FINGER: `
JOINT_VISUAL=SIDE_FINGER
- TOP_SURFACE: show a normal glued wood panel with an almost continuous wood surface; any connection trace must be nearly invisible and must not show finger teeth.
- MAIN_IMAGE: use the normal full-panel camera composition with ordinary wood surface, color and grain as the focus. Do not deliberately reveal, mark, zoom or emphasize any finger-jointed connection.
- CLOSEUP: use a side-view closeup of the exact same connection inside that one wood piece; show only a few short, naturally irregular finger interlocks with matching wood color and grain.
- Every adjacent wood piece must remain continuous and must not share that connection line.
- Every other part of LONG_SIDE_FACE, plus SHORT_END_FACE and EDGE_LINE, has ordinary wood boundaries only; zero finger joints, teeth or joint markers.
- Never fill the full side, full thickness, full height or full width with teeth.
- No zipper, ladder, barcode, comb, stitch, layered teeth, repeated finger pattern or plywood-like pattern.`,
    TOP_FINGER: `
JOINT_VISUAL=TOP_FINGER
- TOP_SURFACE: show a normal glued wood panel with only one localized, short finger-jointed length splice inside one wood piece. Keep every other wood piece and ordinary strip boundary continuous.
- MAIN_IMAGE: use a natural top-surface-focused product angle where that one local connection is only subtly recognizable. Never draw a seam across the full panel width or make the board into a block-pattern diagram.
- CLOSEUP: enlarge the exact same single top-surface connection. Center one short interlocking joint between two wood pieces; show no second seam, crossing seam, or repeated joint pattern.
- Strip width before and after the splice must remain identical; preserve continuous grain direction, color distribution and strip arrangement across the splice.
- Main photo and closeup must match in wood color, grain direction, splice position, strip width, panel thickness and finger direction.
- LONG_SIDE_FACE: ordinary wood strip boundaries only; zero finger-joint closeups.
- SHORT_END_FACE: cross-sections of the widthwise-arranged wood strips only; zero finger joints.
- The closeup must not invent a joint absent from the hero or relocate it to another strip or face.
- Use only a few short, broad wood fingers with slight natural irregularity; never use thin dense teeth, metal-zipper regularity, drawn lines, lace, stitch or decorative sawtooth forms.
- No full-panel seam, repeated joint line, enlarged plain strip boundary, oversized glued blocks, full-end teeth, short-block chain, plywood-like layers, zipper, comb or side-finger pattern.`,
    UNKNOWN: `
JOINT_VISUAL=UNKNOWN
- Show the full product and ordinary widthwise wood-strip construction only.
- Do not infer a finger-joint type, position or direction.`
  }[ui.joint.type] || '';

  return `
Create one Korean B2B wood-panel catalog infographic.
NON_RENDERING_PROMPT_VERSION=GLUED_WOOD_TYPE_C_LAYOUT_V3

TEXT_TO_RENDER_BEGIN
${renderText}
TEXT_TO_RENDER_END

RENDER CONTRACT
- Render only the quoted Korean strings inside TEXT_TO_RENDER.
- Do not render quotation marks, block identifiers, field names, rules or English text.
- Do not add, rewrite, summarize or complete Korean copy.
- Do not create empty cards or fill space with benefits, performance, health, advertising or explanatory copy.

FIXED UI BLOCKS
- TOP_55: product title, one dominant full-product photo, the approved catalog subtitle, and exactly ${ui.hero.features.length} valid product feature card(s). Use only color, grain or pattern, surface texture, and product-specific material characteristics. Do not render a joint structure, joint type, or generic fallback card in this block. When there are three valid cards, use a balanced three-card arrangement with no empty fourth slot and keep the existing text scale.
  - MIDDLE_LEFT_10: one compact common joint summary using "${ui.jointSummary.title}" and "${ui.jointSummary.caption}". ${surfaceLayout}
  - MIDDLE_RIGHT_10: one joint structure photo or closeup with the approved structure-specific joint title and the detailed joint caption (jointDetailCaption) only.
  ${knotOptionComparisonLayout}
  - ${applicationLayout}
- Keep the visual hierarchy: product → surface option → joint structure → applications.
- Real product photography first; restrained catalog grid; white background; large readable Korean typography.
- Keep all Type C feature titles to one line and bodies to no more than two lines at one consistent existing text scale; never reduce text size, card size or spacing to fit extra copy.
- Use only #FFFFFF background, #123628 main, #C9A84C accent, #1C1C1C text, #616161 secondary text and #E0E0E0 borders.
- Preserve the existing exact profile's natural-light, low-saturation, uncoated product-photo appearance.
- If a block is omitted, expand existing product or structure photography instead of creating another card.

HERO PHOTO — HIGHEST PRIORITY
- DSLR-style real product catalog photography, not a 3D render or synthetic product mockup.
- Natural studio daylight, realistic lens perspective, believable contact shadow and a physically supported panel.
- Physically plausible wood grain with subtle strip-to-strip color variation and small grain differences between neighboring strips.
- Preserve realistic cut-end grain, small natural machining traces and slightly softened machined edges.
- Matte unfinished wood surface; no plastic gloss and no perfect CGI bevels.
- No perfectly repeated grain, procedural texture tiling, cloned knots, floating product or excessive depth-of-field blur.
- Keep minor natural surface variation; do not make every strip perfectly identical, spotless or digitally polished.
- Hero and closeup must depict the same physical product: identical strip arrangement, grain, knot positions, color distribution, thickness and edge shape.
- SAME_PRODUCT_IDENTITY_STRICT: hero and every closeup must preserve the same strip count, strip width, strip order, grain, knot positions, color distribution, panel thickness, edge shape and joint type.
- JOINT_LOCATION_MATCH: a closeup may enlarge only a joint already visible at the identical location in the hero.
- STRIP_WIDTH_CONSISTENCY: keep each strip width consistent between hero and closeup and across any length splice.
- GRAIN_CONTINUITY and COLOR_CONTINUITY: preserve plausible grain direction and color identity on both sides of a joint.

SURFACE RULES
- Use only the approved hero facts and surface option labels as surface information.
- Present approved information in this order: color, grain or pattern, then joint structure.
- Display at most four surface facts, with no repeated meaning.
- Scent is text-only and must never be visualized.
- H and K source text are validation evidence only and are not renderable content.
- Do not infer scent, health effects, performance, grade, price or quality ranking.

COORDINATE DEFINITIONS
- TOP_SURFACE: the widest top face of the panel.
- LONG_SIDE_FACE: the long narrow face running parallel to the board length; its horizontal span is much longer than panel thickness.
- SHORT_END_FACE: the narrow end-grain face perpendicular to the board length; it terminates the wood strips and is never the SIDE_FINGER display face.
- EDGE_LINE: the line where two faces meet; it is never a joint display surface.
${jointRules}

APPLICATION RULES
- Use only the application captions inside TEXT_TO_RENDER.
- L and M are the sole sources for application photos and captions.
- Do not invent another furniture, space or construction use.

PRODUCT FIDELITY
- IDENTIFICATION_LEVEL=${ui.fidelity.identificationLevel}
- J_EVIDENCE_STATUS=${ui.fidelity.jEvidenceStatus}
- PROFILE_VISUAL_GUARD=${cleanEntityValue(profile.typeC && profile.typeC.guard) || cleanEntityValue(profile.guard) || 'NONE'}
- PROFILE_STRUCTURE_OVERRIDE=${cleanEntityValue(profile.typeC && profile.typeC.structureVisualOverride) || 'NONE'}
- H/K/J raw source text must never appear in the image.
- CONTENT_SOURCE=${ui.fidelity.contentSource}
- PRODUCT_IDENTITY_RULES=${ui.fidelity.productIdentityRules.join(',')}
- Existing exact profile color palette, product-photo style and product-specific visual prohibitions remain in force.
- Do not render any text from this PRODUCT FIDELITY block.
`;
}

function buildSelectionInfographicPrompt(data, type) {
  const profile = getSelectionInfographicProfile(data);
  if (!profile) return '';
  if (type === 'C' && profile.family === 'GLUED_WOOD' && profile.typeC) {
    return buildGluedWoodTypeCUIBlockPrompt(data, profile);
    /*
    const typeC = profile.typeC;
    const content = buildGluedWoodTypeCContent(data, profile);
    const typeCStructureLibrary = content.jointType;
    const jointInstruction = content.jointVisualBan;
    const appearanceLines = content.appearance.map(function (item) { return '- ' + item; }).join('\n');
    const applicationLines = content.applications.map(function (item) { return '- ' + item; }).join('\n');
    const applicationGuide = applicationLines
      ? applicationLines + '\n- 위 용도만 실제 적용 사례로 표현하고 다른 용도를 임의 생성하지 않는다.'
      : '- 확인된 용도 정보가 없으므로 실제 적용 사례 영역과 용도 문구를 생성하지 않는다.';
    const approvedDisplayLines = [
      content.productTitle,
      content.appearance.join(' / '),
      content.surfaceOptions.map(function (option) { return option.name + ' — ' + option.description; }).join(' / '),
      content.jointTitle,
      content.jointDescription
    ].concat(content.applications).filter(Boolean).map(function (line) { return '- ' + line; }).join('\n');
    const surfaceOptionGuide = content.surfaceOptions.length > 0
      ? `표면 옵션 3종
${content.surfaceOptions.map(function (option) { return '- ' + option.name + ': ' + option.description; }).join('\n')}
- 세 옵션은 동일 상품의 표면 구분이며 같은 크기와 비중으로 보여준다.
- 어느 면이 앞면인지, 옹이 개수·크기와 보수 허용 범위는 생성하지 않는다.
- 품질·강도·내구성·가격의 등급이나 순서로 표현하지 않는다.`
      : '';
    const comparisonGuide = typeC.colorCompare
      ? `일반 애쉬 ↔ 탄화 애쉬 색감 변화
- 같은 구도에서 밝은 일반 애쉬와 진한 갈색의 탄화 애쉬 표면 색감만 비교한다.
- 성능, 함수율, 강도, 내구성과 치수 안정성의 우열을 비교하지 않는다.`
      : profile.hasAcaciaKnotComparison
      ? '- 유절·무절 외관 차이는 현재 아카시아 상품 안의 선택 가능한 표면 옵션으로만 비교한다.'
      : '- 좌우 비교 구성과 빈 비교 영역을 만들지 않고 현재 제품 하나만 설명한다.';
    const productFidelityGuard = 'NON_RENDERING_CONSTRAINT: IDENTIFICATION_LEVEL=' +
      content.speciesIdentificationLevel +
      '; never infer a more specific botanical identity than the verified product data.';
    const jointStructureGuide = typeCStructureLibrary === 'TOP_FINGER'
      ? `TOP FINGER 이미지 생성 규칙
MUST: TOP FINGER의 가장 중요한 특징은 상판이며 메인 제품 사진에서 Finger Joint가 실제 판매 제품처럼 자연스럽게 분명히 보여야 한다.
MUST: Finger Joint는 상판 윗면에서 긴 스트립을 길이 방향으로 이어주는 실제 이음으로만 생성한다.
MUST: 메인 상판은 한 원목 부재 안의 짧은 TOP FINGER 연결부가 국소적으로만 인식되는 상판 중심 구도를 사용한다. 일반 집성 블록 경계는 눈에 띄지 않게 최소화한다.
MUST: 핑거 이음은 판재 폭 전체를 가로지르지 않고, 상판의 한 곳에서만 짧게 맞물린 형태로 표현한다.
MUST: 확대 이미지는 독립된 구조를 새로 만들지 않고 메인 상판에 실제 생성된 접합부 1곳을 선택해 그대로 확대한다.
MUST: 메인 상판과 확대 영역의 접합 위치·방향·형상·목재색·나뭇결은 완전히 동일하며 연결선 또는 확대 표시로 두 영역을 연결한다.
MUST: 확대 영역은 상판 시점에서 같은 연결부의 짧은 핑거 맞물림 하나만 화면 중앙에 보여준다. 일반 집성 블록 경계나 단순 접착선은 확대의 주제가 되지 않게 한다.
MUST: 실제 목공 가공처럼 짧고 넓은 소수의 핑거만 사용하며, 약간의 자연스러운 불규칙성을 둔다.
MUST: 측면에는 Finger Joint 없이 일반 집성 단면과 원목 스트립 경계만 보이게 한다.
MUST: 상판 Finger Joint 노출은 선택 사항이 아니라 필수 이미지 요소다.
MUST NOT: 측면(face) 전체에 Finger Joint를 만들거나 측면 전용 맞물림과 SIDE FINGER 확대 형태를 혼입하지 않는다. 이 형태가 나타나면 실패다.
MUST NOT: 메인에 없는 핑거 라인을 확대 영역에 추가하거나 접합부 개수와 밀도를 임의로 늘리지 않는다.
MUST NOT: 확대 영역을 단순한 집성 블록 경계, 넓은 목재 조각의 경계, 일반 접착선 확대, 상하좌우 교차 이음이나 여러 연결선처럼 표현하지 않는다.
MUST NOT: 모든 스트립마다 핑거를 반복하거나 접합부를 제품 전체의 주 패턴으로 만들지 않는다.
MUST NOT: 상판 전체를 가로지르는 연속 이음선, 여러 줄이 길게 반복되는 빗살무늬, 지퍼, 봉제선, 레이스, 톱니 장식, 빗과 솔 브러시 형태를 생성하지 않는다.
MUST NOT: 가늘고 촘촘한 금속 지퍼 이빨 같은 반복, 두 줄 이상 반복된 확대 접합부와 메인·확대의 방향 불일치를 생성하지 않는다.
MUST NOT: 단순 톱니무늬 아이콘, 굵고 성긴 핑거 형상과 가짜 도식으로 표현하지 않는다.`
      : typeCStructureLibrary === 'SIDE_FINGER'
      ? `SIDE FINGER 이미지 생성 규칙
MUST: 상판은 거의 연속된 원목처럼 자연스럽게 보이게 하고, 핑거 이음이나 뚜렷한 연결선을 보이지 않는다.
MUST: 메인 사진은 일반 집성판의 전체 구도를 유지하고 상판의 색감과 나뭇결을 중심으로 보이게 한다. 측면은 자연스럽게만 보이게 하며 핑거 이음을 의도적으로 강조·표시하지 않는다.
MUST NOT: 메인 사진에서 핑거 치형, 측면 중앙의 지퍼형 이음, 구조 설명용 연결부, 여러 인접 원목 부재를 가로지르는 정렬 이음을 만들지 않는다.
MUST: 확대 이미지는 메인 사진의 동일한 측면 연결부를 측면 시점으로만 확대하며, 상판 탑뷰나 판 두께 전체 단면을 보여주지 않는다.
MUST: 확대컷에서는 한 원목 부재를 이루는 좌우 목재가 짧고 자연스러운 소수의 핑거로 맞물린 모습만 분명하게 보여준다.
MUST: 메인 사진과 확대 이미지의 목재색, 나뭇결 방향과 연결 위치를 완전히 동일하게 유지한다.
MUST: 인접한 다른 원목 부재에는 같은 연결선이나 핑거 이음이 없어야 한다.
MUST NOT: 상판, 판 두께 전체, 측면 전체 또는 여러 위치에 Finger Joint를 생성하지 않는다.
MUST NOT: 세로 지퍼, 사다리, 바코드, 봉합선, 반복 핑거, 굵은 사각 톱니와 합판 적층처럼 반복되는 층상 톱니를 생성하지 않는다.
MUST NOT: TOP FINGER 형태와 SOLID 구조를 혼입하지 않는다.`
      : typeCStructureLibrary === 'SOLID'
      ? `SOLID 이미지 생성 규칙
MUST: Finger Joint가 전혀 없는 여러 개의 긴 원목을 나란히 이어 만든 집성판으로 생성한다.
MUST: 상판과 측면 모두 통원목 스트립이 자연스럽게 이어지고 접합선은 원목 스트립 경계만 존재하게 한다.
MUST NOT: 상면·측면·끝단 어디에도 Finger Joint, 톱니형 접합과 짧은 블록 연결을 생성하지 않는다.
MUST NOT: 2개·3개의 대형 블록, 인위적인 접합선, 굵은 반복 접합선, 합판 적층과 벽돌 패턴을 생성하지 않는다.`
      : `UNKNOWN 집성 구조 이미지 생성 규칙
MUST: 여러 목재 부재를 폭 방향으로 이어 만든 일반 집성판 외관만 표현한다.
MUST NOT: Finger Joint, 톱니형 접합, 특정 핑거 위치와 방향을 생성하지 않는다.
MUST NOT: SOLID, SIDE FINGER, TOP FINGER 중 하나로 임의 확정하지 않는다.`;
    const acaciaSurfaceComparisonGuide = profile.hasAcaciaKnotComparison
      ? `
표면 옵션 비교
- 현재 아카시아 상품 한 개 안에 유절·무절 옵션이 모두 있을 때만 표시하고 별도 상품군이나 다른 아카시아 상품으로 확장하지 않는다.
- 이 영역은 접합 방식이 아닌 현재 상품의 선택 가능한 표면 옵션 안내이며 전체 이미지의 약 15~20% 이내로 제한한다.
- 좌측 "유절": 자연스러운 옹이와 일부 색상 편차, 옹이 주변의 결 변화가 보이는 원목 표면. 옹이를 과다하게 만들거나 검은 구멍·갈라짐·부패 흔적으로 표현하지 않는다.
- 우측 "무절": 눈에 띄는 옹이가 적거나 거의 없는 비교적 정돈된 표면. 긴 스트립의 나뭇결과 심재·변재 모자이크 색감은 유지하고 단색·인조 무늬처럼 균일하게 만들지 않는다.
- 유절과 무절 모두 밝은 크림·황갈색 변재와 중간 갈색 심재가 불규칙하게 섞인 아카시아 고유 색감을 동일하게 유지한다.
- 유절은 자연스러운 원목 느낌, 무절은 비교적 정돈된 노출면이라는 선택 차이만 설명하고 노출 위치와 원하는 표면 분위기에 맞춰 선택하게 한다.
- 성능, 강도, 품질, 내구성, 수명, 등급과 가격의 우열을 만들거나 유절을 저급, 무절을 고급·고강도로 표현하지 않는다.
- "유절"과 "무절" 제목은 확대 없이 읽히게 크게 표시하고 각 설명은 최대 1~2줄로 제한한다.
`
      : '';
    return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

메인 제목: ${content.productTitle}

[이미지에 그대로 배치할 확정 한국어 문구]
${approvedDisplayLines}

[확정 문구 사용 규칙]
- 각 줄의 앞 기호는 데이터 구분용이며 화면에 출력하지 않는다.
- 이미지 안의 한국어는 위 블록에서 앞 기호를 제외한 문구만 그대로 배치한다.
- 확정 문구를 요약, 의역, 보충하거나 어미를 바꾸지 않는다.
- 조사 문장, 연결 문장, 장점 문장과 설명을 새로 작성하지 않는다.
- 제공되지 않은 영역은 만들지 않고 빈 공간을 새 제목·카드·설명으로 채우지 않는다.
- 확정 문구 이외의 한국어 문장을 생성하지 않는다.
- 성능 문구가 확정 문구 블록에 없으므로 성능 영역을 만들지 않는다.

 목표:
- 제품 전체 사진 → 표면 인상 또는 표면 옵션 → 접합 방식 확대 → 실제 적용 사례 순서로 시선이 이동하게 한다.
- 구조 설명보다 실제 구매자가 확인하는 표면과 사용 모습을 우선한다.
- 제품 사진이 첫 화면에서 가장 먼저 보이는 실제 목재 상세페이지 스타일로 구성한다.
- 실제 제조사 카탈로그와 실제 판매 제품 사진 수준의 자연광·무도장·무광·저채도 색감, 결, 질감을 최우선으로 재현한다.
- 과도하게 연출한 인테리어 감성사진보다 구매자가 실제 받아볼 평판 완제품 외관을 우선하고 제품을 예쁘게 보이기 위한 인위적인 색 보정을 하지 않는다.
- 장식 프레임, 배지, 배경 소품과 불필요한 아이콘을 최소화하고 구매자가 제품과 집성 방식을 이해하는 데 필요한 정보만 크게 표시한다.
- 확정 문구는 프롬프트 생성 단계에서 H/K의 안전한 표면 사실, 상품명 기반 집성 방식과 L/M 용도를 역할별로 분리한 결과다.
- J열 원문은 집성 방식 일치 검증에만 사용했으며 이미지 문구로 출력하지 않는다.
- 1024×1024 상세페이지에서 확대 없이 읽을 수 있는 텍스트 크기로 구성한다.
- 이미지 비중은 약 65~70%, 텍스트 비중은 약 30~35%로 유지하고 정보량보다 가독성을 우선한다.
- 아이콘은 유지하되 한 영역의 설명은 핵심 키워드 중심 최대 1~2줄로 제한하고 장문을 만들지 않는다.
- 아이콘 아래 장문을 넣지 않고 제품 사진과 텍스트가 서로 겹치지 않게 한다.
- 영역 사이에 충분한 여백을 두고 브로슈어처럼 작은 글씨가 빽빽한 구성을 만들지 않는다.

캔버스:
- 1024 x 1024px, 배경 #FFFFFF
- 메인 #123628, 포인트 #C9A84C, 텍스트 #1C1C1C, 서브텍스트 #616161, 보더 #E0E0E0만 사용한다.

${content.productTitle}
- 상단에는 확정된 상품 제목만 가장 크고 명확하게 표시한다.
- 메인 제목에 특징, 완제품 외관, 밝은 목재 질감, 균일한 표면 같은 설명 문구를 붙이지 않는다.
- 완제품 전체와 실제 두께감이 보이는 사진을 가장 크게 배치한다.
- 접합부 확대나 구조 개념도를 메인 이미지로 사용하지 않는다.

${typeC.speciesTitle} 바탕색과 나뭇결
${appearanceLines}
${comparisonGuide}
- 실제 수종과 다른 색상, 결, 옹이와 표면 패턴을 생성하지 않는다.
- 자연광 아래 실제 무도장 목재 표면처럼 표현하고 채도를 과장하지 않는다.
- 인위적 스테인·염색·고광택 마감을 생성하지 않는다.
- 제품 전체 바탕색과 일부 포인트 결 색상을 구분하고 붉은색·보라색·검은색을 전체 표면에 과장하지 않는다.
- 수종별 고유 색차를 유지한다: 고무나무는 밝은 황베이지, 라디에타파인은 크림화이트에 가까운 밝은 소나무톤, 삼나무는 붉은기를 최소화한 연한 베이지~살구톤, 쏘노클린은 중간 브라운과 일부 진한 스트립, 아카시아는 황갈색 변재와 중간 갈색 심재, 오크는 황갈색과 호반문, 멀바우는 검붉게 과장하지 않은 적갈색이다.

${surfaceOptionGuide}

실제 적용 사례
${applicationGuide}
- L/M에 적힌 용도만 사진과 캡션으로 표현한다.
- L/M에 없는 가구, 공간, 시공 용도와 제품 장점을 추가하지 않는다.
${acaciaSurfaceComparisonGuide}

접합 방식 확대
- Type C 이미지 구조 라이브러리: ${typeCStructureLibrary}
- 구조 시각 기준: ${profile.structureVisualStandard}
- 확정 구조 제목: ${content.jointTitle}
- 확정 구조 설명: ${content.jointDescription}
- ${jointInstruction}
${jointStructureGuide}
${typeC.structureVisualOverride ? '- ' + typeC.structureVisualOverride : ''}
- 접합 확대는 아이콘이나 단순 도식이 아니라 실제 목공 가공 사진처럼 생성한다.
- TOP_FINGER, SIDE_FINGER, SOLID는 이미지 하나만 봐도 서로 구분되게 하며 구조 확대는 실제 교육자료처럼 명확하게 표현한다.
- 제품 전체 사진을 가장 크게 유지하고 표면 옵션·접합 확대·실제 적용 사례를 남은 공간에 자연스럽게 확장한다.
- L/M이 비어 있으면 적용 사례 영역을 만들지 않고 제품 사진과 접합 확대 영역을 넓힌다.
- SIDE_FINGER는 측면의 동일한 국소 연결부 확대에 전체 이미지의 약 25~30%를 사용한다.
- SOLID와 TOP_FINGER는 기존 exact 프로필의 사진 비율과 구조 시각 규칙을 유지한다.
- 동일한 재단 방향 카드와 반복 구조 확대를 생성하지 않는다.

[화면에 표시하지 않는 Product Fidelity 내부 규칙]
${typeC.guard ? '- ' + typeC.guard : ''}
- ${productFidelityGuard}
- 이 블록은 렌더링 데이터가 아니며 제목·카드·캡션으로 출력하지 않는다.

절대 금지:
- 숫자나 영문 단계 제목, 범용 마케팅 제목
- 비교 대상이 없는 좌우 비교와 일반 원목판 비교
- 현재 솔리드 제품을 "일반 솔리드" 또는 다른 솔리드 집성판과 별도 상품처럼 비교하는 구성
- 최적, 1위, 최고급, 가장 선호, 변형 없음, 부패 걱정 없음, 수축·팽창 없음
- 친환경 아동 가구 단정과 입력에 없는 성능·내구성·가성비 우위
- 고급 가구, 유아용 친환경, 건강 효과와 L/M에 없는 임의 용도
- 접합 강도 확보, 외관 안정성 확보, 구조 안정성, 내구성 향상, 변형 방지, 강한 접착력, 품질 우위
- 접착 상태를 장점·성능·효과로 설명하는 문구. 접착 상태는 구매 전 확인 항목으로만 사용할 수 있다.
- 다른 제품군의 구조 라이브러리, 재료와 시공 이미지
- 실제 수종보다 예쁘게 보이도록 고광택·고채도·스테인 색을 더하거나 월넛·멀바우·티크 색감을 다른 수종에 혼합하는 표현
- 집성각재에 이 규칙 적용
`;
    */
  }
  const reasonLines = profile.reasons.map(function (item) { return '- ' + item; }).join('\n');
  const visualLines = profile.visuals.map(function (item) { return '- ' + item; }).join('\n');
  const applicationLines = profile.applications.map(function (item) { return '- ' + item; }).join('\n');
  const performanceLine = profile.family === 'GYPSUM' && data.keyValue
    ? '- 시트에서 확인된 성능·특징: ' + data.keyValue
    : '';
  const sourceLine = data.source ? '- 확인된 수치의 출처만 작게 표시: "출처: ' + data.source + '"' : '- 별도 출처 영역을 만들지 않는다.';
  const gsProductGuide = !profile.isGsNatural ? '' : profile.library.indexOf('방수') !== -1
    ? '- 제품별 차별점: 천연석고 기반, 방수 처리, 습기 대응, 욕실·주방 바탕 적용.'
    : profile.library.indexOf('방화') !== -1
    ? '- 제품별 차별점: 천연석고 기반, 전용 보강 코어, 화재 시 형태 유지 개념, 내화 구획 적용.'
    : '- 제품별 차별점: 천연석고 기반, ISO 9001 품질관리 기반의 생산 관리, 내부 벽체·천장 바탕 적용.';
  const gsNaturalGuide = profile.isGsNatural
    ? `
GS자이 천연석고 전용 규칙:
- 일반 석고보드 라이브러리를 그대로 재사용하지 않는다.
- 메인 제목은 "${profile.gsNaturalTitle}"로 고정하고 범용 선택 이유 제목을 사용하지 않는다.
- ZEIT Gypsum을 생산하는 GS건설 그룹 계열 VGSI의 석고보드 제품이라는 브랜드 정체성을 보조 문구로 1회 표시한다.
- 천연석고 원료 → 확인된 제품 성능 → 적용 공간 순서로 구성한다.
- 제조사 공식 자료에서 확인되는 한국 기술, 유럽 표준 생산설비, ISO 9001 품질관리 중 최대 2개만 짧게 표시한다.
${gsProductGuide}
- 방수 제품은 석고 코어로 수분이 퍼지는 것을 제한하는 공극 차단 방식만 개념적으로 표현한다.
- 방화 제품은 화재 시 형상 유지를 돕는 전용 보강 코어만 개념적으로 표현한다.
- 대산 공급 운영 정보: 대산 직접 수입·직접 유통, 안정적인 재고 운영, 대량 구매 상담, 프로젝트 납품 대응, 전국 GS건설 현장 직접 납품.
- 공급 정보는 "공급 경쟁력", "프로젝트 적용", "납품 대응"처럼 작은 보조 영역에만 배치한다.
- 최대 재고, 항상 즉시출고, 무조건 대량 가능처럼 공급을 보장하거나 과장하지 않는다.
- 브랜드 카탈로그와 시공 카탈로그를 결합한 실사 중심 스타일로 구성하고 과도한 3D CG를 생성하지 않는다.
- 천연석고의 성분 비율, 산지, 순도, 친환경 성능은 입력 근거가 없으므로 생성하지 않는다.
- VOC, 무독성, 항균, 라돈, 석면, 친환경 인증 문구를 생성하지 않는다.
- 브랜드 로고를 임의 생성하지 않고 제조사명은 설명문에서 반복하지 않는다.`
    : '';
  const soundBoardGuide = profile.isKccSoundBoard
    ? `
KCC 차음석고보드 전용 규칙:
- 차음 제품을 일반석고보드와 다른 원지 색상으로 구분하지 않는다.
- 연두색, 형광색, 색상 범례로 차음 성능을 표현하지 않는다.
- 핵심은 일반 보드보다 미세하고 조밀한 입자감의 고밀도 코어다.
- 확대뷰는 동일 배율에서 일반 코어와 고밀도 코어의 입자 간격 차이를 자연스럽게 보여준다.
- 코어를 금속, 콘크리트, 검은 고형물처럼 과장하지 않는다.
- 벽체 단면은 석고보드 + 스터드 + 흡음재 조합으로 표현한다.
- 차음 성능은 보드 색상이 아니라 보드와 스터드, 흡음재를 함께 구성한 벽체 시스템에서 구현된다는 점을 표시한다.
- 단일 보드만으로 완전 차음되는 표현과 근거 없는 차음 수치를 생성하지 않는다.`
    : '';
  const paperGuide = profile.paperAppearance
    ? `- 현재 코드의 제품 식별 외관인 ${profile.paperAppearance}을 유지한다. 색상명은 이미지 텍스트로 출력하지 않는다.`
    : '- 확인되지 않은 원지 색상이나 새로운 제품 색상을 추가하지 않는다.';
  const gypsumTexGuide = profile.isGypsumTex
    ? `
석고텍스 실제 외관 규칙:
- 업로드한 실제 KCC 석고텍스 참고 이미지의 표면 질감을 최우선 기준으로 사용한다.
- 무광 백색 바탕에 벌레가 지나간 흔적처럼 짧고 가는 웜홀형 선형 홈을 불규칙하게 흩어 놓는다.
- 웜홀은 짧은 곡선, 가는 대시, 작은 끊긴 선 형태이며 방향·길이·간격이 조금씩 다르다.
- 선형 웜홀 사이에 아주 작은 점상 홈과 미세 도트를 보조적으로 섞되 원형 도트가 주 패턴이 되지 않게 한다.
- 패턴을 격자나 일정 간격으로 반복하지 않고 패널마다 자연스럽게 다른 분포로 표현한다.
- 요철과 홈은 실제 압축 성형된 석고텍스처럼 매우 얕고 은은하게 표현한다.
- 일반 석고보드 단면이 아니라 완제품 표면과 설치된 천장 모습을 우선한다.
- 실제 제품 사진에 가까운 리얼 포토 스타일과 무광 백색 표면을 사용한다.
- 큰 원형 구멍, 원형 대공, 레이저 타공, 슬롯 타공, 깊은 흡음 타공을 생성하지 않는다.
- 목모보드, 유공 흡음패널, 텍스처 페인트와 같은 표면으로 바꾸지 않는다.
- 300×600 패널 경계와 줄눈을 자연스럽고 정돈되게 반복한다.
- M-Bar 또는 T-Bar 시공은 패널이 정렬된 실제 천장, 자연스러운 패널 줄눈과 고정 상태 중심으로 표현한다.
- 부분 교체와 유지관리 편의는 입력 근거가 없으므로 생성하지 않는다.`
    : '';
  const typeGuide = type === 'A'
    ? (profile.isGypsumTex
      ? `메인 제목: ${profile.title}

1단: 완제품 표면 확대
${visualLines}
- 완제품 표면 확대를 가장 크게 배치하고 불규칙한 짧은 웜홀형 선형 홈과 미세 도트가 함께 보이게 한다.
- 도트만 반복하지 않고 패턴의 방향·길이·간격을 자연스럽게 달리한다.
- 레이저 타공, 원형 대공, 슬롯 타공과 흡음패널처럼 깊은 타공을 생성하지 않는다.

2단: 설치된 천장 패널 배열
- 300×600 패널이 M-Bar 또는 T-Bar 시공 상태로 정돈되게 배열된 천장을 보여준다.
- 사무실·학교·상가의 실제 천장처럼 패널 경계와 줄눈을 자연스럽게 표현한다.

3단: 도트 패턴·규격·적용 공간
${reasonLines}
${applicationLines}`
      : profile.isGsNatural
      ? `메인 제목: ${profile.gsNaturalTitle}

1단: GS자이 천연석고 제품 특징
- 천연석고 원료와 GS건설 그룹 계열 VGSI의 제조 기반을 먼저 보여준다.
- 한국 기술·유럽 표준 생산설비·ISO 9001 품질관리 중 최대 2개만 보조 정보로 사용한다.

2단: 확인된 제품 성능
${reasonLines}
${performanceLine}
- 제조사 자료와 시트에 없는 추가 성능은 만들지 않는다.

3단: 대산 공급 경쟁력과 프로젝트 적용
${applicationLines}
- 실제 시트의 적용 공간을 완제품 시공 이미지로 보여준다.
- 대산 직접 수입·유통, 재고 운영, 대량 구매 상담, 프로젝트 납품 대응을 작은 정보 블록으로 표시한다.
- "전국 GS건설 현장 직접 납품"을 납품 대응 정보로 1회 표시한다.`
      : `메인 제목: ${profile.title}

1단: 제품 선택 특징
${reasonLines}

2단: 제품 고유 외관과 성능
${visualLines}
- 구조 설명보다 현재 제품에서 실제로 확인되는 차이를 크게 보여준다.

3단: 적용 공간과 선택 기준
${applicationLines}
- 추천이나 최상급 표현이 아니라 입력 근거에 맞는 적용 예시로 표시한다.`)
    : (profile.isGypsumTex
      ? `메인 제목: ${profile.title}

1단: 표면 패턴 확대
${visualLines}
- 구조 단면보다 완제품 표면을 우선하여 짧은 웜홀형 선형 홈, 미세 점상 홈과 무광 백색 질감을 함께 확대한다.
- 웜홀의 방향·길이·간격은 불규칙하게 하고 동일 패턴 타일처럼 반복하지 않는다.
- 균일한 원형 도트, 레이저 타공, 원형 대공, 슬롯 타공과 흡음패널처럼 깊은 타공을 생성하지 않는다.

2단: 패널 모서리·홈·시공 방식
- 패널 모서리와 홈, M-Bar 또는 T-Bar 고정 상태를 실제 시공 사진처럼 보여준다.
- 석고 코어, 원지, 일반 석고보드 단면 확대를 만들지 않는다.

3단: 실제 천장 적용 모습
- 300×600 패널이 일정한 줄눈으로 반복되는 설치 천장을 보여준다.
- 사무실·학교·상가의 실제 M-Bar 또는 T-Bar 천장처럼 정돈된 패널 배열과 자연스러운 줄눈을 표현한다.
${applicationLines}`
      : profile.isGsNatural
      ? `메인 제목: ${profile.gsNaturalTitle}

1단: 천연석고와 제조 품질
- 천연석고 원료를 중심에 두고 GS건설 그룹 계열 VGSI의 제조 기반을 함께 보여준다.
- 한국 기술·유럽 표준 생산설비·ISO 9001 품질관리 중 최대 2개만 사용한다.

2단: 제품별 성능 작동 방식
${visualLines}
${performanceLine}
- 일반·방수·방화 제품의 역할을 서로 혼합하지 않는다.

3단: 실제 적용과 납품 대응
${applicationLines}
- 완제품이 벽체 또는 천장에 적용된 상태를 보여준다.
- 대산 직접 수입·유통과 프로젝트 납품 대응 흐름을 실사형 물류·현장 이미지로 작게 연결한다.
- "전국 GS건설 현장 직접 납품"을 공급 경쟁력 보조 문구로 1회 표시한다.`
      : `메인 제목: ${profile.title}

1단: 제품 고유 특징
${visualLines}
- 공통 단면보다 제품 고유 외관 또는 성능 작동 방식을 우선한다.

2단: 선택 이유 확대
${reasonLines}
- 같은 구조를 세 번 확대하지 않고 서로 다른 선택 근거를 보여준다.

3단: 실제 적용
${applicationLines}
- 완제품이 적용된 공간과 선택 기준을 함께 보여준다.`);

  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

목표:
${profile.isGsNatural ? '- GS자이 천연석고의 제조 특징, 확인된 성능, 적용 공간을 순서대로 보여준다.' : '- 제품명을 포함한 설명형 제목과 현재 제품의 고유 특징을 먼저 보여준다.'}
- 상세설명 HTML의 규격·제조사·용도 문장을 그대로 복사하지 않는다.
- 확인되지 않은 성능, 인증, 수치, 우열, 최상급 표현을 생성하지 않는다.
- 1024 x 1024px, 배경 #FFFFFF
- 메인 #123628, 포인트 #C9A84C, 텍스트 #1C1C1C, 서브텍스트 #616161, 보더 #E0E0E0만 사용한다.

[제품별 Infographic Guide]
- 제품: ${data.productName}
- 공통 라이브러리: ${profile.library}
- ${profile.guard}
${performanceLine}
${paperGuide}
${sourceLine}
${gsNaturalGuide}
${soundBoardGuide}
${gypsumTexGuide}

[Type ${type} 구성]
${typeGuide}

절대 금지:
- 입력에 없는 성능·수치·인증·재료 생성 금지
- 구조 설명을 선택 이유보다 크게 반복 금지
- 제품명, 제조사, 규격을 제목과 설명에 반복 금지
${profile.isGsNatural ? '- 공식 브랜드명 ZEIT Gypsum과 ISO 9001 외 영어 라벨, 광고 배너, 과장된 비교 금지' : '- 영어 라벨, 광고 배너, 과장된 비교 금지'}
${profile.isGsNatural ? '- 브랜드 로고 생성, VOC, 무독성, 라돈, 석면, 친환경 인증, 항균, 국내 최고, 세계 최고, 업계 1위, 최고 품질, 최대 재고, 항상 즉시출고, 무조건 대량 가능 금지' : ''}
- 다른 제품군의 구조·표면·색상 혼합 금지
`;
}

function buildInfographicStructureGuide(data) {
  const guide = buildProductCategoryGuide(data);
  const knowledge = buildProductKnowledgeContext(data);
  if (isCrcBoardProduct(data)) {
    return `
CRC보드 전용 구조 가이드:
- 얇고 평평한 밝은 회백색 또는 연회색 무기질 판재 완제품으로 표현한다.
- 표면은 매끈하거나 미세한 시멘트계 질감, 단면은 비교적 균일한 회백색 무기질 조직으로 표현한다.
- 거친 덩어리나 두꺼운 구조체가 아니라 실제 보드 제품의 얇은 판재 형태를 유지한다.
- 벽체·칸막이·천장 바탕에 적용된 모습을 보여준다.
- 입력에 없는 방수·불연·강도 성능과 수치를 생성하지 않는다.
`;
  }
  if (isWoodWoolBoardProduct(data)) {
    return `
목모보드 전용 구조 가이드:
- 길고 가는 목재 섬유(wood wool)가 불규칙하게 얽힌 개방형 표면을 표현한다.
- 섬유 사이의 작은 공극과 베이지·자연 목재색 표면을 실제 평평한 보드 형태로 보여준다.
- 짧은 가루나 넓은 조각, 미세하고 균일한 솜 형태가 아니라 길고 가는 스트랜드를 유지한다.
- 벽체·천장 흡음 마감재로 설치된 실제 공간을 보여준다.
- 입력에 없는 흡음계수·난연등급·환경 인증과 수치를 생성하지 않는다.
`;
  }
  if (isEboardProduct(data)) {
    return `
이보드 전용 구조 가이드:
- 이보드는 PP 중공 구조판과 XPS 단열재가 서로 붙어 있는 하나의 완성된 복합보드 외관을 우선 표현한다.
- PP 중공 구조판은 흰색 또는 밝은 회백색, XPS 단열재는 실제 판매 제품 기준 연한 분홍색으로 표현한다.
- 파란색·하늘색·녹색 XPS와 분홍색 PP 구조판을 생성하지 않는다.
- 구성 요소 색상은 제품 식별 정보이므로 일반적인 단열재 색상으로 임의 변경하거나 서로 혼합하지 않는다.
- PP 중공 구조판은 얇게, XPS 단열재는 상대적으로 더 두껍게 표현하되 입력에 없는 두께 수치는 생성하지 않는다.
- 구성 요소를 서로 떨어뜨린 폭발도·분해도·부품 카탈로그 형태를 생성하지 않는다.
- PP 구조판과 XPS를 서로 독립된 여러 층의 적층 구조처럼 분해하거나 과장하지 않는다.
- 실제 제조 단면을 추측한 절단도보다 PP 중공 구조판, XPS 단열재, 결합 구조의 역할을 보여주는 개념도를 사용한다.
- 도배용과 페인트용은 후속 표면 마감 방식의 차이만 표현하고 내부 제조 단면 차이를 생성하지 않는다.
- 별도 표면층·접착층, PP → XPS → PP 샌드위치, 고정된 3층 단면과 입력에 없는 두께 비율을 생성하지 않는다.
`;
  }
  if (isGcsBoardProduct(data)) {
    return `
GCS보드 전용 구조 가이드:
- GCS보드는 Glass Fiber Cement Sheet와 PIR(경질우레탄) 단열 심재가 서로 붙어 있는 하나의 완성된 준불연 복합보드 외관으로 표현한다.
- Glass Fiber Cement Sheet는 회색 시멘트 질감, PIR 단열 심재는 연한 크림색 또는 미색으로 표현한다.
- PIR 심재를 분홍색 XPS처럼 표현하거나 GFC 면재를 흰색 플라스틱처럼 표현하지 않는다.
- 구성 요소 색상은 제품 식별 정보이므로 GFC와 PIR의 색상·재질을 혼합하거나 임의 변경하지 않는다.
- 구성 요소를 서로 떨어뜨린 폭발도·분해도·부품 카탈로그 형태를 생성하지 않는다.
- 양면 시멘트판과 중앙 심재로 고정된 샌드위치 패널 구조를 추측해 그리지 않는다.
- 실제 제조 단면도 대신 GFC 면재, PIR 단열 심재, 결합 구조의 역할을 보여주는 개념도를 사용한다.
- 면재 개수, 상부·하부 배치, 층 순서, 두께 비율과 접착층 위치를 단정하지 않는다.
- 이보드의 PP 중공 구조판과 XPS 구조를 GCS보드에 혼합하지 않는다.
- 완전 불연, 화재 안전, 방수, 구조 강도 우위와 입력에 없는 성능 수치를 생성하지 않는다.
`;
  }
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
  if (knowledge.gluedWood) {
    const facts = buildGluedWoodHtmlFacts(data);
    const productName = cleanEntityValue(facts && facts.productName);
    const speciesSentence = buildGluedWoodSpeciesIntroductionSentence(facts);
    const purchaseFeatureSentence = buildGluedWoodSpeciesPurchaseFeatureSentence(facts);
    const surfaceOptionSentence = buildGluedWoodSurfaceOptionIntroductionSentence(facts && facts.surfaceOptions);
    const purchaseFeatureAlreadyListsOptions = facts && facts.surfaceOptions && facts.surfaceOptions.length > 1 && facts.surfaceOptions.every(function (option) {
      return purchaseFeatureSentence.indexOf(cleanEntityValue(option && option.title)) !== -1;
    });
    const jointSentence = hasGluedWoodJointOptionComparison(facts)
      ? getGluedWoodJointOptionText(facts) + ' 옵션이 있으며, 탑핑거는 상판에서, 사이드핑거는 측면에서 연결 무늬를 확인합니다.'
      : facts && facts.jointTitle
      ? ensureSentence(facts.jointTitle + ' 방식으로 구성한 집성판입니다')
      : buildGluedWoodIntroductionDefinitionSentence(facts);
    const first = productName && speciesSentence
      ? productName + getSubjectParticle(productName) + ' ' + speciesSentence
      : speciesSentence || jointSentence;
    return cleanHumanWritingText([
      first,
      purchaseFeatureSentence,
      purchaseFeatureAlreadyListsOptions ? '' : surfaceOptionSentence,
      jointSentence
    ].filter(Boolean).join('<br><br>'));
  }
  if (isRauanGakjaeProduct(data)) {
    return cleanHumanWritingText('라왕 각재는 라왕다루끼·후지·심재 중 필요한 단면 규격과 길이에 맞춰 선택하는 목재 각재입니다.<br><br>세 옵션은 상품에서 선택 가능한 규격·형태 구분이며, 주문 전 옵션명과 단면 치수, 길이, 재단 여부를 함께 확인합니다.');
  }
  if (isGsNaturalWaterResistantGypsumBoard(data)) {
    return '석고 코어에 방수제를 첨가하고 표면에 원지를 적용한 방수 석고보드입니다.';
  }
  if (knowledge.productGroup !== 'PLYWOOD') return cleanHumanWritingText(fallback);

  if (knowledge.isGeneralImportedPlywood && knowledge.generalPlywood) {
    const guide = knowledge.generalPlywood;
    return cleanHumanWritingText(
      guide.definition + '입니다.<br><br>' +
      '가구 심재, 인테리어 제작, 벽체·천장 바탕재와 일반 건축 작업에 사용합니다.<br><br>' +
      '사용 용도, 규격, 표면 상태와 필요한 재단 범위를 기준으로 선택합니다.'
    );
  }

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

function buildSpecialBoardInfographicPrompt(data, type) {
  const isCrcBoard = isCrcBoardProduct(data);
  const isWoodWoolBoard = isWoodWoolBoardProduct(data);
  if (!isCrcBoard && !isWoodWoolBoard) return '';

  const title = isCrcBoard
    ? 'CRC보드의 무기질 표면과 적용 특징'
    : '목모보드의 섬유 표면과 흡음 특징';
  const identity = isCrcBoard
    ? `- 규산칼슘계 원료로 성형한 밝은 회백색 또는 연회색의 무기질 보드다.
- 얇고 평평한 완제품, 매끈하거나 미세한 시멘트계 표면, 비교적 균일한 회백색 단면을 표현한다.`
    : `- 이 이미지는 건축자재 목모보드 제품 인포그래픽이다.
- 길고 가는 목재 섬유(wood wool)가 불규칙하게 얽힌 보드 표면을 표현한다.
- 섬유 사이의 작은 공극, 베이지·자연 목재색 표면과 평평한 완제품 형태를 유지한다.`;
  const application = isCrcBoard
    ? `- 벽체·칸막이 바탕에 설치된 모습
- 천장 바탕에 설치된 모습`
    : `- 벽체·천장 흡음 마감 적용을 보여준다.
- 실내 벽체 마감과 천장 흡음 패널의 실제 설치 모습을 사용한다.`;
  const selection = isCrcBoard
    ? `- 적용 위치와 규격·두께 확인
- 절단면, 고정 방식과 후속 퍼티 마감 확인`
    : `- 적용 위치와 규격·두께 확인
- 절단면 처리, 고정 방식과 요구 등급의 상품 표시 확인`;
  const materialGuide = buildInfographicStructureGuide(data);
  const irrelevantContentGuard = isWoodWoolBoard
    ? `- 사람, 음식, 운동, 책, 생활 습관, 건강 관리, 화분, 캐릭터와 교육 포스터를 생성하지 않는다.
- 제품명이 없는 범용 인포그래픽과 제품과 무관한 영어 콘텐츠를 생성하지 않는다.`
    : '- 다른 재료의 표면·코어·적층 구조와 제품 외 콘텐츠를 생성하지 않는다.';
  const typeLayout = type === 'A'
    ? `완제품 외관
${identity}

고유 표면과 재질
${materialGuide}

실제 적용 위치
${application}

선택 기준
${selection}`
    : type === 'B'
    ? `표면과 단면 확대
${identity}
- 실제 표면 확대를 가장 크게 배치하고 재질 구조 개념도는 1개 이하로 제한한다.

재질 구조 확인
${materialGuide}

설치 예시
${application}

가공과 마감 확인
${selection}`
    : `완제품과 표면 특징
${identity}

재질과 설치 모습
${materialGuide}
${application}

선택과 작업 확인
${selection}`;

  return `
건축자재 B2B 쇼핑몰 상세페이지용 한국어 인포그래픽 이미지를 생성하라.

메인 제목: ${title}

목표:
- 현재 제품의 완제품 외관, 고유 표면·재질, 실제 적용 위치와 선택 기준만 설명한다.
- 제품 사진에 가까운 실사형 건축자재 카탈로그 스타일로 구성한다.
- 숫자 또는 영문 단계 라벨과 범용 마케팅 제목을 사용하지 않는다.

캔버스와 색상:
- 1024 x 1024px, 배경 #FFFFFF
- 메인 #123628, 포인트 #C9A84C, 텍스트 #1C1C1C, 서브텍스트 #616161, 보더 #E0E0E0만 사용한다.

[Type ${type} 구성]
${typeLayout}

제품 고정 규칙:
${irrelevantContentGuard}
- 입력에 없는 성능·인증·수치·재료·구조를 생성하지 않는다.
- 거친 덩어리, 과도한 절단도, 폭발도와 재질 구조 확대 반복을 생성하지 않는다.
- 제품명을 포함한 설명형 제목을 유지하고 광고성 우위 표현을 사용하지 않는다.
`;
}

function buildGeneralImportedPlywoodTypeAPrompt(data) {
  const knowledge = buildProductKnowledgeContext(data);
  if (!knowledge.isGeneralImportedPlywood || !knowledge.generalPlywood) return '';
  const guide = knowledge.generalPlywood;
  const application = guide.applications.join(', ');

  return `
카페24 상세페이지용 한 장의 긴 세로형 한국어 일반합판 인포그래픽 포스터를 생성한다.
- Tall infographic poster, long vertical layout, large spacing, large typography, editorial poster 방식으로 구성한다.
- 특정 높이 안에 모든 내용을 압축하지 말고 정보가 선명하게 들어갈 만큼 긴 세로 캔버스를 사용한다.
- 공간이 부족하면 글자와 이미지를 줄이지 말고 캔버스 높이와 섹션 프레임을 늘린다.
- 정사각형 상세페이지나 짧은 3단 카드 레이아웃으로 구성하지 않는다.

제목:
- 메인 제목: "일반합판"
- 부제: "일반합판의 구조와 구성별 선택 가이드"
- 1단, 2단, 3단, STEP, SECTION과 "왜 이 제품을 선택하는가"를 제목으로 사용하지 않는다.

메인 제품 이미지:
- 일반합판 완제품을 실제 제품 사진처럼 크게 표현하고 전체 캔버스의 40~45%를 사용한다.
- 앞면 표면과 얇은 목재 베니어가 여러 겹 적층된 측면이 함께 보이게 한다.
- 제품 이미지가 가장 먼저 보이게 하고 실제 근거 없는 베니어 층 수를 고정하지 않는다.
- 모든 제품에 공극·박리·접착 상태 문제를 필수 특성처럼 만들지 않는다.

상단 소개:
- ${guide.definition}입니다.
- ${guide.whyUsed}
- 상단 소개에는 구성별 종류의 이름을 표시하지 않고 일반합판 전체만 설명한다.

아래 영역을 순서대로 큰 독립 프레임으로 구성하고, 내용을 제한된 높이나 3단 안에 압축하지 않는다.

1. 제목과 일반합판 완제품
2. 일반합판 기본 구조
3. 일반합판 4가지 구성 차이
4. 동남아산·베트남산 상태 비교
5. 실제 적용 사례
6. 구매 전 확인 체크리스트
7. 원산지 안내

프레임 크기와 여백:
- 모든 섹션 프레임을 일반 카드형 구성보다 30~50% 크게 만들고 섹션 사이에 넓은 여백을 둔다.
- 구성별 종류 비교, 원산지 비교, 구매 전 확인은 다른 영역보다 큰 프레임을 사용한다.
- 원산지 비교는 세로 높이 500px 이상, 실제 적용 사례는 400~500px, 구매 전 확인은 450px 이상에 준하는 넉넉한 비중을 확보한다.
- 카드 안의 제품·단면·적용 사진을 크게 보여주고 텍스트는 핵심 문구 1~2줄만 사용한다.
- 작은 이미지 옆에 작은 글씨를 붙이는 카드 구조를 사용하지 않는다.
- 최소 글자 크기를 유지할 수 없으면 글자를 줄이지 말고 전체 캔버스와 해당 프레임을 더 길게 확장한다.

일반합판 기본 구조:
- 얇은 목재 베니어의 결 방향을 교차시키며 여러 겹 적층한 판재 구조를 보여준다.
- 특정 구성의 이름이나 실제 근거 없는 정확한 층 수를 이 영역에 표시하지 않는다.

구성별 종류 비교:
${guide.selectionGuide.map(function (item) { return '- ' + item.name + ' · 구성: ' + item.veneer + ' · 특징: ' + item.feature + ' · 주 사용 용도: ' + item.use; }).join('\n')}
- 네 항목을 같은 크기와 동일한 시각적 비중으로 표시하고 우열을 표현하지 않는다.
- 네 카드의 제품 및 내부 구성 이미지를 크게 배치하고 설명은 카드당 핵심 1~2줄로 제한한다.
- 각 항목에 완제품 표면 또는 측면과 내부 베니어 구성 개념을 함께 표현하고, 표면 사진만 색상만 바꿔 반복하지 않는다.
- 고급합판(BB/CC)은 라왕계열 베니어가 적층된 측면과 표면 상태가 우수한 완제품 예시를 함께 보여준다.
- 콤비는 라왕계열과 알비자계열 베니어가 내부에 자연스럽게 혼합된 측면을 보여주고 기계적으로 반반 나누지 않는다.
- 알비자는 비교적 밝은 알비자계열 내부 베니어와 표면·측면 적층을 함께 보여준다.
- MLH는 색과 밀도가 일부 다른 혼합 활엽수 베니어가 자연스럽게 적층된 측면을 보여주고 OSB·집성목·콤비와 혼동하지 않는다.
- 기계적인 반반 적층·일정한 줄무늬를 만들지 않는다.
- 고급합판(BB/CC)이 가구와 인테리어 제작에 많이 선택되는 이유를 중심으로 설명한다.

동남아산 vs 베트남산 비교:
- 품질 대결이 아닌 일반적인 상태 경향의 예시이며, 같은 크기의 두 카드에 동일한 네 항목을 크게 표시한다.
- 비교 영역 전체를 높고 넓은 독립 프레임으로 만들며 각 촬영 부위를 작은 썸네일로 축소하지 않는다.
- 비교 항목: ${guide.originChecks.join(', ')}.
- 동남아산 예시: ${guide.originComparison.southeastAsia.join(' / ')}.
- 베트남산 예시: ${guide.originComparison.vietnam.join(' / ')}.
- 내부 베니어 구성은 합판 측면의 내부 층 확대, 표면 상태는 윗면 베니어의 정면 확대, 측면 적층은 긴 측면 전체 확대, 재단면은 절단된 모서리 확대를 사용한다.
- 같은 합판 측면 사진을 네 번 재사용하거나 같은 표면 사진에 설명만 바꾸지 않는다.
- 베트남산은 MLH 또는 기타 베니어 구성 여부도 확인하되 베트남산 전체를 MLH로 단정하지 않는다.
- 결론: "${guide.originComparison.conclusion}"
- VS 표기는 허용하되 승패·순위·상하 등급·빨강·초록 평가와 국가별 강도·접착력·내구성 우열을 생성하지 않는다.
- 모든 동남아산이 항상 더 낫거나 모든 베트남산의 품질이 반드시 낮다고 단정하지 않고 파손·박리·폐기품처럼 과장하지 않는다.

적용과 구매 전 확인:
- 실제 적용: ${application}
- 실제 적용 사례는 큰 현장 사진을 중심으로 충분한 세로 높이를 확보한다.
- 구매 전 확인은 큰 독립 영역으로 만들고 실제 제품의 근접 사진을 중심으로 ${guide.checks.join(', ')}을 확인한다.
- 각 확인 항목은 확대 없이 읽을 수 있는 크기로 표시하고 작은 글씨로 빽빽하게 나열하지 않는다.
- 아이콘만 배치하지 않고 표면, 측면, 재단면 등 실제 확인 부위의 확대 사진을 우선한다.
- 구매 전 확인의 여섯 사진은 식별 가능한 크기로 배치하고 공간이 부족하면 캔버스를 아래로 연장한다.

판매 정보 분리:
- 판매 상품명에 붙는 규격, 제품 규격 카드, 두께 옵션 표, 재고·수량·납기·라벨 정보를 이미지에 표시하지 않는다.
- 판매 규격과 두께는 HTML 사양표의 역할이므로 이미지에 생성하지 않는다.

한글 타이포그래피 품질:
- 모든 한글은 실제 인쇄용 산세리프 폰트처럼 선명하고 정확하게 표현한다.
- 글자 획을 끊거나 뭉개지 않고 글자끼리 겹치지 않게 한다.
- 초성·중성·종성을 분리하지 않고 완성형 한글 글리프를 사용한다.
- 이미지 생성형 글자가 아닌 실제 편집 디자인 수준의 선명한 벡터 타이포그래피 품질로 표현한다.
- 카드 제목과 본문 모두 올바른 철자를 사용하고 의미 없는 문자나 유사 한글을 만들지 않는다.
- 한글이 깨질 가능성이 있는 작은 폰트는 사용하지 않으며 글자를 줄이는 대신 여백과 프레임 높이를 늘린다.

금지:
- 국가 간 대결형 비교, 특정 국가를 저품질로 표현, 근거 없는 품질 일반화와 출처 없는 수치 비교.
- 최고·최상·우수·가성비 1위, 실내 사용 부적합, 실외용 추천, 냄새·눈 자극·유해성 표현.
- 콤비 혼합 비율·적층 순서 고정, 알비자를 약하거나 품질이 낮은 합판으로 표현, MLH를 접착 상태 문제·얇은 표면 베니어의 필수 특성으로 표현.
- 자작합판 등급표, 내수합판 접착 성능, 미송·코아·오징어합판, MDF·PB·OSB 구조 혼입.
- 작은 글씨가 빽빽한 브로슈어, 정사각형 캔버스 강제, 짧은 캔버스에 모든 섹션을 압축하는 구성, 제품보다 표·텍스트가 큰 구성.
`;
}

function buildGeneralImportedPlywoodTypeAPrompts(data) {
  const knowledge = buildProductKnowledgeContext(data);
  if (!knowledge.isGeneralImportedPlywood || !knowledge.generalPlywood) return [];
  const guide = knowledge.generalPlywood;
  const sharedDesign = `
- 1024×1536px 세로형 편집 디자인 인포그래픽으로 구성한다.
- 배경 #FFFFFF, 메인 #123628, 포인트 #C9A84C, 텍스트 #1C1C1C, 서브텍스트 #616161, 보더 #E0E0E0만 사용한다.
- 실제 제품 확대 이미지를 중심으로 충분한 여백과 큰 글자를 사용하고 카드 설명은 최대 1~2줄로 제한한다.
- 사진 70%, 텍스트 30% 비율을 기준으로 실제 목재 사진을 크게 배치한다.
- 실제 제품 카탈로그처럼 구성하고 AI 일러스트, 아이콘 남용과 불필요한 벡터 도식을 사용하지 않는다.
- 모든 한글은 인쇄용 산세리프처럼 선명하게 표현하고 획 끊김, 글자 겹침, 자모 분리, 잘못된 철자와 의미 없는 문자를 만들지 않는다.
- 판매 규격, 두께, 재고, 수량, 납기와 라벨 정보를 표시하지 않는다.`;
  const overviewPrompt = `
카페24 상세페이지용 일반합판 인포그래픽 첫 번째 이미지를 생성한다.
${sharedDesign}

제목:
- 메인 제목: "일반합판"
- 부제: "일반합판의 구조와 구성별 선택 가이드"

레이아웃 흐름:
일반합판 소개
- ${guide.definition}입니다. ${guide.whyUsed}
- 일반합판 정의와 메인 완제품 확대 사진만 사용한다.

구성별 종류 비교
${guide.selectionGuide.map(function (item) { return '- ' + item.name + ' · 구성: ' + item.veneer + ' · 특징: ' + item.feature + ' · 주 사용 용도: ' + item.use; }).join('\n')}
- 각 카드에 실제 상판 사진과 실제 측면 사진을 함께 크게 배치한다.
- 네 카드의 폭과 사진 높이를 기존 카드보다 15~20% 확대하고 본문은 2~3줄 이내로 제한한다.
- AI 일러스트나 합성 도식으로 베니어 구성을 대신하지 않는다.

실제 적용 사례
- ${guide.applications.join(', ')}.
- 텍스트보다 실제 시공·제작 사진을 우선한다.

연결 규칙:
- 이 이미지는 두 장 중 첫 번째 이미지다.
- 마지막에 푸터, 결론, 마감 배너, 회사 정보와 종료 문구를 만들지 않는다.
- 두 번째 이미지에서 다룰 품질 및 선택 안내 내용을 미리 표시하지 않는다.
- 하단 디자인이 다음 이미지로 자연스럽게 이어지도록 배경, 컬러와 세로 흐름을 열어 둔다.
- 섹션 제목 앞에 숫자, 번호 배지, STEP 표기를 붙이지 않는다.
`;
  const guidePrompt = `
카페24 상세페이지용 일반합판 인포그래픽 두 번째 이미지를 생성한다.
${sharedDesign}

연결 규칙:
- 첫 번째 이미지의 배경, 컬러, 보더, 여백, 사진 톤과 타이포그래피를 그대로 이어간다.
- 새로운 대표 타이틀, 메인 제품 소개와 구성별 종류 비교를 반복하지 않는다.
- 상단에 큰 제목 대신 "동남아산 / 베트남산 비교" 섹션부터 자연스럽게 시작한다.

레이아웃 흐름:
동남아산 / 베트남산 상태 비교

내부 베니어 구성 비교
- 동남아산: ${guide.originComparison.southeastAsia[0]}
- 베트남산: ${guide.originComparison.vietnam[0]}

표면 상태 비교
- 동남아산: ${guide.originComparison.southeastAsia[1]}
- 베트남산: ${guide.originComparison.vietnam[1]}

측면 적층 비교
- 동남아산: ${guide.originComparison.southeastAsia[2]}
- 베트남산: ${guide.originComparison.vietnam[2]}

재단면 비교
- 동남아산: ${guide.originComparison.southeastAsia[3]}
- 베트남산: ${guide.originComparison.vietnam[3]}

구매 전 체크리스트
- ${guide.checks.join(', ')}.

원산지 안내
- ${guide.originComparison.conclusion}

표현 규칙:
- 네 비교 항목은 각각 다른 촬영 부위의 큰 실제 제품 확대 이미지를 사용한다.
- 원산지만으로 제품 성능을 단정하거나 승패·순위를 표시하지 않고, 심각한 파손과 폐기품 이미지를 만들지 않는다.
- 원산지 안내 다음에서 인포그래픽을 마무리한다.
- 섹션 제목 앞에 숫자, 번호 배지, STEP 표기를 붙이지 않는다.
`;
  return [
    { key: 'overview', prompt: overviewPrompt },
    { key: 'guide', prompt: guidePrompt }
  ];
}

function buildTypeAPrompt(data) {
  const generalPlywoodPrompt = buildGeneralImportedPlywoodTypeAPrompt(data);
  if (generalPlywoodPrompt) return generalPlywoodPrompt;
  const specialBoardPrompt = buildSpecialBoardInfographicPrompt(data, 'A');
  if (specialBoardPrompt) return specialBoardPrompt;
  const insulationPrompt = buildInsulationInfographicPrompt(data, 'A');
  if (insulationPrompt) return insulationPrompt;
  const selectionPrompt = buildSelectionInfographicPrompt(data, 'A');
  if (selectionPrompt) return selectionPrompt;
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
  const isGcsBoard = isGcsBoardProduct(data);
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
  const typeAGoalInstruction = isGcsBoard
    ? '- 이보드의 PP 중공 구조판·XPS와 GCS보드의 GFC 면재·PIR 심재를 실제 단면 추측 없이 구성 요소와 역할 중심으로 비교'
    : isUvBirchFinishCompare
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
    ? '- 이보드 도배용과 페인트용의 복합보드 개념은 유지하고 후속 표면 마감 차이만 시각화'
    : shouldSkipTypeAStructureCompare
      ? '- 비교 핵심 포인트까지만 시각화하고 3단은 생성하지 않는다'
      : '- 비교 핵심 포인트와 좌우 구조 차이를 시각화';
  const firstSectionInstruction = isGcsBoard
    ? `
1단: 완제품 외관 비교
- 왼쪽 이보드: 얇은 흰색·밝은 회백색 PP 중공 구조판과 상대적으로 두꺼운 연한 분홍색 XPS 단열재가 붙어 있는 하나의 완성된 복합보드로 표시한다.
- 오른쪽 GCS보드: 회색 시멘트계 면재와 연한 크림색·미색 PIR 심재가 붙어 있는 하나의 완성된 복합보드로 표시한다.
- 이보드의 PP는 흰색·밝은 회백색, XPS는 연한 분홍색으로 고정한다. 파란색·하늘색·녹색 XPS와 분홍색 PP를 금지한다.
- GCS의 GFC 면재는 회색 시멘트 질감, PIR 심재는 연한 크림색·미색으로 고정한다. 분홍색 PIR와 흰색 플라스틱 질감의 GFC를 금지한다.
- 구성 요소의 역할 설명은 1단에 넣지 않고 2단에서만 표시한다.
- 구성 요소를 각각 따로 배치한 부품 카탈로그, 폭발도와 분해도를 금지한다.
- 실제 제조 단면, 면재 개수, 층 순서와 두께 비율을 추측하지 않는다.
- 이보드와 GCS보드의 구성 요소를 서로 혼합하지 않는다.
`
    : isUvBirchFinishCompare
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
  const secondSectionInstruction = isGcsBoard
    ? `
2단: 구성 요소 역할 비교
- 이보드: PP 중공 구조판은 마감 바탕 역할, XPS 단열재는 단열 역할.
- GCS보드: Glass Fiber Cement Sheet는 표면 보호와 마감 바탕 역할, PIR 단열 심재는 단열 역할.
- 좌우 모두 고정된 적층도, 샌드위치 단면이나 폭발도로 만들지 않는다.
- 접착 결합층을 별도 부품처럼 생성하거나 근거 없는 단열·강도·화재 성능 우위를 만들지 않는다.
`
    : isUvBirchFinishCompare
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
  const thirdSectionInstruction = isGcsBoard
    ? `
3단: 선택 포인트
- 이보드: 경량 시공, 후속 마감, 단열 기능.
- GCS보드: 시멘트계 면재, PIR 단열 심재, 준불연 복합보드.
- 단면 확대를 반복하지 않고 선택 이유만 간결하게 표시한다.
- 폭발도, 상·하부 시멘트판 고정 구조, 접착층 위치와 실제 제조 단면을 생성하지 않는다.
`
    : isUvBirchFinishCompare
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
- PP 중공 구조판과 단열재가 결합된 동일한 복합보드 개념을 유지한다.
- 도배용은 미세 섬유감, 페인트용·도장용은 평활한 표면 느낌으로 구분한다.
- PP와 단열재를 독립된 3층 적층 단면으로 과장하거나 실제 제조 단면을 추측하지 않는다.
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
  const vsCompareInstruction = isGcsBoard
    ? `
GCS보드와 이보드 비교 규칙:
- 좌측 이보드와 우측 GCS보드의 구조를 명확히 분리한다.
- 이보드는 "PP 중공 구조판", "XPS 단열재", "후속 마감용 복합보드"의 역할만 표시한다.
- GCS보드는 "Glass Fiber Cement Sheet", "PIR 단열 심재", "준불연 복합보드"의 역할만 표시한다.
- 실제 판매 제품 기준 색상을 제품 식별 정보로 유지하고 두 제품 구성 요소의 색상과 재질을 서로 혼합하지 않는다.
- 고정된 층 순서, 폭발도, 접착층과 제조 단면을 생성하거나 두 제품의 구성 요소를 서로 복사하지 않는다.
`
    : isUvBirchFinishCompare
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
  const specialBoardPrompt = buildSpecialBoardInfographicPrompt(data, 'B');
  if (specialBoardPrompt) return specialBoardPrompt;
  const insulationPrompt = buildInsulationInfographicPrompt(data, 'B');
  if (insulationPrompt) return insulationPrompt;
  const selectionPrompt = buildSelectionInfographicPrompt(data, 'B');
  if (selectionPrompt) return selectionPrompt;
  const knowledge = buildProductKnowledgeContext(data);
  const isGcsBoard = isGcsBoardProduct(data);
  const isEboard = isEboardProduct(data);
  const isUvBirchFinishCompare = isUvCoatedBirchFinishCompare(data);
  const isPlywoodTypeB = knowledge.productGroup === 'PLYWOOD';
  const typeBRepeatedHtmlBan = isPlywoodTypeB ? '' : '- 상세설명 HTML 문장 반복 금지';
  const typeBDetailInstruction = isGcsBoard
    ? `- GCS보드는 Glass Fiber Cement Sheet, PIR(경질우레탄) 단열 심재와 두 구성 요소의 역할을 보여주는 개념도만 사용한다.
- Glass Fiber Cement Sheet는 회색 시멘트 질감, PIR 심재는 연한 크림색 또는 미색으로 표현한다.
- 분홍색 XPS처럼 보이는 PIR, 흰색 플라스틱처럼 보이는 GFC와 두 구성 요소의 색상·재질 혼합을 금지한다.
- 고정된 상부·중앙·하부 층과 실제 제조 단면을 추측하지 않는다.
- 면재 개수, 배치 순서, 두께 비율과 접착층 위치를 단정하지 않는다.
- XPS, PP 중공 구조판, EPS, PF, 석고 코어를 생성하지 않는다.`
    : isEboard
    ? `- 이보드는 PP 중공 구조판, XPS 단열재, 후속 마감용 복합보드의 역할을 보여주는 개념도만 사용한다.
- PP 중공 구조판은 흰색 또는 밝은 회백색, XPS 단열재는 실제 판매 제품 기준 연한 분홍색으로 표현한다.
- 파란색·하늘색·녹색 XPS와 분홍색 PP 구조판을 금지하고 두 구성 요소의 색상·재질을 혼합하지 않는다.
- PP와 XPS를 독립된 적층 레이어나 고정된 3층 단면으로 표현하지 않는다.
- 실제 제조 절단면, 층 순서와 두께 비율을 추측하지 않는다.
- 입력에 없는 별도 표면층·접착층을 생성하지 않는다.
- 도배용·페인트용은 후속 표면 마감 차이만 표현한다.`
    : isPlywoodTypeB
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
  const typeBGoalInstruction = isGcsBoard
    ? '- GCS보드의 Glass Fiber Cement Sheet와 PIR 단열 심재 역할을 제조 단면 추측 없이 시각화'
    : isEboard
    ? '- 이보드의 PP 중공 구조판과 XPS 단열재 결합 개념을 고정 적층 단면 없이 시각화'
    : isUvBirchFinishCompare
    ? '- UV 코팅 자작합판의 공정 흐름과 하도·상도의 역할 및 사용 목적 차이를 시각화'
    : isBirchOrderGradeGuide
    ? '- 주문 가능한 복합 등급을 독립 카드로 나누고 앞면·뒷면의 표면 차이만 시각화'
    : isBirchStockGuide
      ? '- 재고 상품 S/BB의 앞면 S와 뒷면 BB를 단일 상품 설명형으로 시각화'
      : '- 단면 구조, 구조 상세 확대, 핵심 구조 키워드만 시각화';
  const typeBFirstSection = isGcsBoard
    ? `1단: GCS보드 완제품 외관
- 회색 시멘트 질감의 Glass Fiber Cement Sheet와 연한 크림색·미색 PIR 단열 심재가 붙어 있는 하나의 완성된 준불연 복합보드로 표시한다.
- 구성 요소의 역할 설명은 1단에 넣지 않고 2단에서만 표시한다.
- 구성 요소를 각각 따로 배치한 부품 카탈로그, 폭발도와 분해도를 생성하지 않는다.
- 양면 시멘트판·중앙 심재의 고정 샌드위치 구조로 만들지 않는다.
- 실제 제조 단면, 면재 개수, 층 순서와 비율을 추측하지 않는다.`
    : isEboard
    ? `1단: 이보드 완제품 외관
- 얇은 흰색·밝은 회백색 PP 중공 구조판과 상대적으로 두꺼운 연한 분홍색 XPS 단열재가 붙어 있는 하나의 완성된 복합보드로 표시한다.
- 구성 요소의 역할 설명은 1단에 넣지 않고 2단에서만 표시한다.
- 구성 요소를 각각 따로 배치한 부품 카탈로그, 폭발도와 분해도를 생성하지 않는다.
- PP와 XPS를 독립된 3층 적층 구조로 만들거나 실제 제조 단면을 추측하지 않는다.`
    : isUvBirchFinishCompare
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
  const typeBSecondSection = isGcsBoard
    ? `2단: GCS 구성 요소의 역할
${typeBDetailInstruction}
- 시멘트계 면재는 표면 보호와 마감 바탕 역할, PIR 심재는 단열 역할로 표현한다.
- 실제 판매 제품 기준 색상을 제품 식별 정보로 유지하고 일반적인 단열재 색상으로 임의 변경하지 않는다.
- PIR 심재를 XPS처럼 표현하거나 이보드 구조와 혼합하지 않는다.`
    : isEboard
    ? `2단: 이보드 구성 요소의 역할
${typeBDetailInstruction}
- PP 중공 구조판은 마감 바탕 역할, XPS는 단열 역할로 표현한다.
- 실제 판매 제품 기준 색상을 제품 식별 정보로 유지하고 일반적인 단열재 색상으로 임의 변경하지 않는다.
- PP 중공 구조판과 XPS를 분리된 여러 층으로 과장하지 않는다.`
    : isUvBirchFinishCompare
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
  const typeBThirdSection = isGcsBoard
    ? `3단: 선택 포인트
- 시멘트계 면재와 PIR 단열 심재를 적용한 준불연 복합보드.
- GFC 면재의 표면 보호·마감 바탕 역할과 PIR 심재의 단열 역할을 기준으로 안내한다.
- 완전 불연, 화재 안전, 방수, 구조 강도 우위와 입력에 없는 성능 수치를 생성하지 않는다.`
    : isEboard
    ? `3단: 선택 포인트
- 경량 시공
- 후속 마감
- 단열 기능
- 실제 제조 단면과 입력에 없는 성능 수치를 생성하지 않는다.`
    : isUvBirchFinishCompare
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
  const typeBSingleStructureGuard = isGcsBoard
    ? `- GCS보드의 구조 개념만 표현하고 이보드, XPS, PP 중공 구조판을 혼합하지 않는다.
- 양면 시멘트판과 중앙 심재의 고정 구조, 폭발도, 접착층 또는 실제 제조 단면을 추측하지 않는다.`
    : isEboard
    ? `- 이보드의 구조 개념만 표현하고 PP와 XPS를 고정된 적층 레이어로 과장하지 않는다.
- 실제 제조 단면, 별도 표면층·접착층과 층 순서를 추측하지 않는다.`
    : isUvBirchFinishCompare
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
  const specialBoardPrompt = buildSpecialBoardInfographicPrompt(data, 'C');
  if (specialBoardPrompt) return specialBoardPrompt;
  const optionPrompt = cleanEntityValue(data && data.productName) === '고무나무 집성판 탑핑거'
    ? buildRubberwoodJointOptionComparisonPrompt()
    : '';
  const selectionPrompt = buildSelectionInfographicPrompt(data, 'C');
  if (selectionPrompt) return selectionPrompt + optionPrompt;
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
- 각 아이콘에는 하나의 짧은 설명을 반드시 함께 두고, 아이콘 수와 설명 수를 정확히 같게 한다.
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
  ` + optionPrompt;
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

  const infraImg = buildInfographicHtml(data, sectionTitle, false);

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
