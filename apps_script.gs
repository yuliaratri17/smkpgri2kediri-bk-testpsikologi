function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const payload = JSON.parse(e.postData.contents);

    if (payload.type === "bulk-results" && Array.isArray(payload.results)) {
      payload.results.forEach((record) => appendRecord(sheet, record));
    } else if (payload.type === "result" && payload.record) {
      appendRecord(sheet, payload.record);
    } else if (payload.type === "ping") {
      sheet.appendRow([new Date(), "PING", "", "", "", JSON.stringify(payload)]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appendRecord(sheet, record) {
  const answers = record.answers ? JSON.stringify(record.answers) : "";
  sheet.appendRow([
    record.time || new Date(),
    record.email || "",
    record.score || 0,
    record.summary || "",
    answers,
    record.submittedAt || ""
  ]);
}

function doGet() {
  return ContentService.createTextOutput("OK");
}
