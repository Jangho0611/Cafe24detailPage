function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Zart Image Engine")
    .addItem("Run Batch", "runBatch")
    .addToUi();

  SpreadsheetApp.getUi()
    .createMenu("상품 정보 자동보완")
    .addItem("선택 행 H~M 자동보완", "fillMissingProductInfoForActiveRow")
    .addToUi();
}

function runBatch() {
  const config = getConfig();
  return withLock(function () {
    return runBatchInternal();
  });
}
