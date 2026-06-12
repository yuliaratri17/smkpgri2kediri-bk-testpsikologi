const DEFAULT_SHEET_NAME = 'Rekap';

function doGet() {
  return ContentService.createTextOutput('OK');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const type = payload.type || 'result';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(DEFAULT_SHEET_NAME) || ss.getActiveSheet();
    ensureHeader_(sheet);

    if (type === 'ping') {
      return json_({ status: 'ok', message: 'ping received' });
    }

    if (type === 'result') {
      appendOne_(sheet, payload.record || payload);
      return json_({ status: 'ok', rows: 1 });
    }

    if (type === 'bulk-results') {
      const records = Array.isArray(payload.results) ? payload.results : [];
      appendMany_(sheet, records);
      return json_({ status: 'ok', rows: records.length });
    }

    return json_({ status: 'ignored', type: type });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Email', 'Skor', 'Ringkasan', 'Status', 'Jawaban JSON', 'Source']);
  }
}

function appendOne_(sheet, record) {
  sheet.appendRow(toRow_(record));
}

function appendMany_(sheet, records) {
  if (!records.length) return;
  const rows = records.map(r => toRow_(r.record || r));
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}

function toRow_(record) {
  const rec = record || {};
  return [
    rec.time || rec.submittedAt || new Date().toISOString(),
    rec.email || '',
    rec.score || 0,
    rec.summary || '',
    rec.status || 'ok',
    JSON.stringify(rec.answers || {}),
    rec.source || 'SMK PGRI 2 Kediri Psychological Test'
  ];
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}