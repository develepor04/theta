// Shared Theta Sheets validation rules — single source of truth used by both
// Dashboard.jsx (Transform/Save step) and SpreadsheetEditor.jsx (autosave).
// Column schema matches the business-logic reference workbook (Dashboard
// KPIs / Schedule Intelligence / Cost Intelligence sheets, spec shared
// 2026-07-12). Only Activity ID + Activity Name are required for a row to
// count as a real activity; everything else is optional (rows missing only
// one of the two, e.g. a WBS/section heading, are treated as non-activity
// rows and silently skipped rather than rejected).
// Mirrored server-side in theta_sheet_db.py's validate_sheet_data() —
// kept in sync by hand, not imported, since the backend can't import JS.

export const THETA_REQUIRED_COLUMNS = ['Activity ID', 'Activity Name'];
export const THETA_DATE_FIELDS = [
  'Baseline Start', 'Baseline Finish', 'Forecast Start', 'Forecast Finish',
  'Actual Start', 'Actual Finish',
];
export const THETA_NUMERIC_FIELDS = [
  '% Complete', 'Variance (Days)', 'Budget Cost (AED)', 'Actual Cost (AED)',
  'Forecast Cost (AED)', 'Planned Hours', 'Actual Hours', 'Planned Output',
  'Actual Output', 'Productivity Index',
];

export const isValidDateValue = (v) => {
  if (v === undefined || v === null) return false;
  // Excel often stores dates as raw serial numbers (e.g. 46588) rather than
  // formatted strings, depending on how the source cell was typed.
  if (typeof v === 'number') return v > 0 && v < 100000;
  let s = String(v).trim();
  if (!s) return false;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return n > 0 && n < 100000;
  }
  // P6/MSP exports commonly append a status marker like " A" (Actual) or a
  // trailing "*" after the date itself (e.g. "20-Nov-24 A") -- strip it
  // before parsing, since it isn't part of the date.
  s = s.replace(/\s*[A*]$/i, '').trim();
  return !isNaN(new Date(s).getTime());
};

export const isValidNumericValue = (v) => {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  if (!s) return false;
  return Number.isFinite(parseFloat(s)) && /^-?\d+(\.\d+)?%?$/.test(s);
};

// Validates a Theta Sheets grid, collecting EVERY failing row/field instead
// of stopping at the first one found, so callers can show a complete report
// in one pass rather than a single error per retry.
// Returns { errors: [{row, field, value, reason}], errorCount, isValid }.
// `row` is 1-indexed matching the sheet's own row numbers (header = row 1),
// and is `null` for sheet-level errors (missing columns, no rows at all).
export function validateSheetGrid(gridData) {
  const sheet = gridData?.sheets?.[0];
  if (!sheet) {
    return { errors: [{ row: null, field: null, value: null, reason: 'No sheet data found.' }], errorCount: 1, isValid: false };
  }

  const headers = (sheet.headers || []).map(h => String(h).trim());
  const rows = sheet.rows || [];

  const missingCols = THETA_REQUIRED_COLUMNS.filter(c => !headers.includes(c));
  if (missingCols.length > 0) {
    return {
      errors: [{ row: null, field: null, value: null, reason: `Missing required columns: ${missingCols.join(', ')}` }],
      errorCount: 1, isValid: false,
    };
  }
  if (rows.length === 0) {
    return {
      errors: [{ row: null, field: null, value: null, reason: 'Add at least one row of data before transforming.' }],
      errorCount: 1, isValid: false,
    };
  }

  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const errors = [];
  let realActivityRows = 0;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 2; // header is row 1, rows are 1-indexed for the user

    const activityId = String(row[colIdx['Activity ID']] ?? '').trim();
    const activityName = String(row[colIdx['Activity Name']] ?? '').trim();
    if (!activityId || !activityName) continue;
    realActivityRows += 1;

    for (const field of THETA_DATE_FIELDS) {
      const val = row[colIdx[field]];
      const isBlank = val === undefined || val === null || String(val).trim() === '';
      if (isBlank) continue; // blank is fine; only a garbled value is an error
      if (!isValidDateValue(val)) {
        errors.push({ row: rowNum, field, value: val, reason: `"${field}" value "${val}" is not a valid date.` });
      }
    }
    for (const field of THETA_NUMERIC_FIELDS) {
      const val = row[colIdx[field]];
      const isBlank = val === undefined || val === null || String(val).trim() === '';
      if (isBlank) continue;
      if (!isValidNumericValue(val)) {
        errors.push({ row: rowNum, field, value: val, reason: `"${field}" value "${val}" is not a valid number.` });
      }
    }
  }

  if (realActivityRows === 0) {
    errors.unshift({ row: null, field: null, value: null, reason: 'Add at least one row with both an Activity ID and Activity Name before transforming.' });
  }

  return { errors, errorCount: errors.length, isValid: errors.length === 0 };
}

// For call sites that just need a single summary string (e.g. a toast).
export function summarizeValidationErrors(result, maxLines = 5) {
  if (!result || result.isValid) return null;
  const lines = result.errors.slice(0, maxLines).map(e =>
    e.row != null ? `Row ${e.row}: ${e.reason}` : e.reason
  );
  const more = result.errors.length > maxLines ? ` (+${result.errors.length - maxLines} more)` : '';
  return lines.join('\n') + more;
}
