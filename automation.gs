const CONFIG = {
  GPT_API_KEY: "YOUR_GPT_API_KEY",
  NANOBANANA_API_KEY: "YOUR_NANOBANANA_API_KEY",
  TEMPLATE_UID: "YOUR_TEMPLATE_UID",
  MAX_RETRY: 2
};

/**
 * 전역 배치 실행 함수
 */
function runBatchProcess() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  let results = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === "READY") { // Column F (5)
      const success = processRow(i + 1);
      results.push(success);
    }
  }

  if (results.length === 0) return;

  const allSuccess = results.every(r => r === true);
  const allFail = results.every(r => r === false);

  if (allSuccess) {
    console.log("SUCCESS");
  } else if (allFail) {
    console.log("FAIL");
  } else {
    console.log("PARTIAL");
  }
}

/**
 * 기존 단일 행 처리 로직 (이름 변경 없이 유지 가능하도록 래핑)
 */
function processReadyRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === "READY") {
      processRow(i + 1);
      break;
    }
  }
}

/**
 * 실질적인 1행 처리 로직
 * @param {number} targetRowIndex 1-based row index
 * @returns {boolean} 성공 여부
 */
function processRow(targetRowIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const row = sheet.getRange(targetRowIndex, 1, 1, 9).getValues()[0];
  const productName = row[1]; // B (1)
  const descriptionHtml = row[2]; // C (2)
  const productImageUrl = row[3]; // D (3)
  const section2Type = row[4]; // E (4)
  let retryCount = parseInt(row[8]) || 0; // I (8)

  try {
    sheet.getRange(targetRowIndex, 6).setValue("PROCESSING");
    SpreadsheetApp.flush();

    const extractedData = callGpt(productName, descriptionHtml, section2Type);
    const resultImageUrl = callNanobanana(productName, productImageUrl, extractedData);

    sheet.getRange(targetRowIndex, 6).setValue("DONE");
    sheet.getRange(targetRowIndex, 7).setValue(resultImageUrl);
    sheet.getRange(targetRowIndex, 8).setValue("");
    
    return true;
  } catch (error) {
    retryCount++;
    sheet.getRange(targetRowIndex, 9).setValue(retryCount);
    sheet.getRange(targetRowIndex, 8).setValue(error.toString());

    if (retryCount > CONFIG.MAX_RETRY) {
      sheet.getRange(targetRowIndex, 6).setValue("FAIL");
      return false;
    } else {
      sheet.getRange(targetRowIndex, 6).setValue("READY");
      return false; // 재시도 예정이지만 현재 호출은 실패로 간주
    }
  }
}

function callGpt(productName, descriptionHtml, section2Type) {
  // ... (기본 로직 유지)
  const systemPrompt = `당신은 건축자재 상세설명을 분석하여 고정 템플릿(나노바나나) 주입용 JSON 데이터를 생성하는 AI다.
반드시 JSON만 출력하라. 설명, 주석, 코드블록 금지. 모든 키를 반드시 포함하라. 데이터가 없으면 "" 로 채워라. 단위는 원문 그대로 유지하라.
section2_type: ${section2Type}`;

  const userPrompt = `입력:
product_name: ${productName}
description_html: ${descriptionHtml}`;

  const payload = {
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + CONFIG.GPT_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
  const resJson = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() !== 200) {
    throw new Error("GPT API Error: " + (resJson.error ? resJson.error.message : response.getContentText()));
  }

  return JSON.parse(resJson.choices[0].message.content);
}

function callNanobanana(productName, productImageUrl, extractedData) {
  // ... (기본 로직 유지)
  const modifications = [
    { name: "product_image_url", image_url: productImageUrl },
    { name: "product_name", text: productName, font_family: "NotoSansKR-Regular" },
    { name: "product_density", text: extractedData.product_density, font_family: "NotoSansKR-Regular" },
    { name: "grade", text: extractedData.grade, font_family: "NotoSansKR-Regular" },
    { name: "grade_label", text: extractedData.grade_label, font_family: "NotoSansKR-Regular" },
    { name: "compare_left_label", text: extractedData.compare_left_label, font_family: "NotoSansKR-Regular" },
    { name: "compare_right_label", text: extractedData.compare_right_label, font_family: "NotoSansKR-Regular" },
    { name: "chart_top_label", text: extractedData.chart_top_label, font_family: "NotoSansKR-Regular" },
    { name: "chart_center_label", text: extractedData.chart_center_label, font_family: "NotoSansKR-Regular" },
    { name: "strength_value", text: extractedData.strength_value, font_family: "NotoSansKR-Regular" },
    { name: "use_label_1", text: extractedData.use_label_1, font_family: "NotoSansKR-Regular" },
    { name: "use_label_2", text: extractedData.use_label_2, font_family: "NotoSansKR-Regular" },
    { name: "use_label_3", text: extractedData.use_label_3, font_family: "NotoSansKR-Regular" }
  ];

  const payload = {
    template: CONFIG.TEMPLATE_UID,
    modifications: modifications
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "X-API-KEY": CONFIG.NANOBANANA_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.nanobanana.com/v1/render", options);
  const resJson = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error("Nanobanana API Error: " + (resJson.error || response.getContentText()));
  }

  return resJson.image_url;
}
