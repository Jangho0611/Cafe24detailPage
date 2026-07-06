function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Zart Image Engine")
    .addItem("Run Batch", "runBatch")
    .addToUi();
}

function runBatch() {
  const config = getConfig();
  return withLock(function () {
    return runBatchInternal();
  });
}
