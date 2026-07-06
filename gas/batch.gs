function findReadyRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const values = sheet.getDataRange().getValues();
  const readyRows = [];

  for (let i = 1; i < values.length; i++) {
    const status = String(values[i][5]).trim();
    if (status === "READY") {
      readyRows.push(i + 1);
    }
  }

  return readyRows;
}

function processSingleRow(rowIndex) {

  // rowIndex is 1-based actual sheet row number
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rowDataRaw = sheet.getRange(rowIndex, 1, 1, 9).getValues()[0];

  const rowData = {
    productName: rowDataRaw[1],        // B column (index 1)
    descriptionHtml: rowDataRaw[2],    // C column (index 2)
    productImageUrl: rowDataRaw[3],    // D column (index 3)
    section2Type: rowDataRaw[4],       // E column (index 4)
    status: rowDataRaw[5],             // F column (index 5)
    retryCount: parseInt(rowDataRaw[8]) || 0 // I column (index 8)
  };

  try {
    // 1. State transition: READY -> PROCESSING (F column = 6th column)
    sheet.getRange(rowIndex, 6).setValue("PROCESSING");
    SpreadsheetApp.flush();

    // 2. GPT call (Phase 1)
    const gptJson = callGpt(rowData);

    // 3. Nanobanana call (Phase 2 - Prompt Driven)
    const payload = buildNanoPayload(gptJson.full_image_prompt);
    const resultImageUrl = callNano(payload);

    // 4. Success handling
    sheet.getRange(rowIndex, 6).setValue("DONE"); // F
    sheet.getRange(rowIndex, 7).setValue(resultImageUrl); // G
    sheet.getRange(rowIndex, 8).setValue(""); // H

    return "DONE";
  } catch (e) {
    // 5. Failure handling and retry logic
    const nextRetry = rowData.retryCount + 1;
    sheet.getRange(rowIndex, 9).setValue(nextRetry); // I
    sheet.getRange(rowIndex, 8).setValue(e.message || e.toString()); // H
    sheet.getRange(rowIndex, 7).setValue(""); // G (clear URL on failure)

    if (nextRetry >= 2) {
      sheet.getRange(rowIndex, 6).setValue("FAIL"); // F
      return "FAIL";
    } else {
      sheet.getRange(rowIndex, 6).setValue("READY"); // F (ready for next retry)
      return "RETRY";
    }
  }
}

function runBatchInternal() {
  const readyIndices = findReadyRows();
  if (readyIndices.length === 0) return "SUCCESS";

  const results = [];
  for (let i = 0; i < readyIndices.length; i++) {
    results.push(processSingleRow(readyIndices[i]));
  }

  const allDone = results.every(res => res === "DONE");
  const allFail = results.every(res => res === "FAIL");
  const anyFail = results.some(res => res === "FAIL");

  if (allDone) return "SUCCESS";
  if (allFail) return "FAIL";
  if (anyFail) return "PARTIAL";

  // If none are DONE or FAIL (e.g., some RETRY/READY), return PARTIAL
  return "PARTIAL";
}
