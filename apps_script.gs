
function doGet() {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return jsonOut({ status: "error", message: "Could not acquire lock" });
  }

  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();

    ensureHeaders_(sheet);

    if (payload.type === "bulk-results" && Array.isArray(payload.results)) {
      payload.results.forEach(r => appendResultRow_(sheet, r));
      return jsonOut({ status: "success", rows: payload.results.length });
    }

    if (payload.type === "result" && payload.record) {
      appendResultRow_(sheet, payload.record);
      return jsonOut({ status: "success" });
    }

    return jsonOut({ status: "ok" });
  } catch (err) {
    return jsonOut({ status: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Email", "Skor", "Ringkasan", "Jawaban JSON"]);
  }
}

function appendResultRow_(sheet, record) {
  const time = record.time || new Date().toLocaleString();
  const email = record.email || "";
  const score = Number(record.score || 0);
  const summary = record.summary || "";
  const answers = JSON.stringify(record.answers || {});
  sheet.appendRow([time, email, score, summary, answers]);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
