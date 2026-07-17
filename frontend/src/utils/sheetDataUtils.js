// Grid <-> Univer IWorkbookData conversion for Theta Sheets.
// Grid shape: { sheets: [{ name, headers, rows }] }
// Univer IWorkbookData shape: { id, name, sheetOrder, sheets: { [id]: {...} }, styles }

// Full schedule/cost/productivity column schema, matching the business-logic
// reference workbook (Dashboard KPIs / Schedule Intelligence / Cost
// Intelligence formulas). Only 'Activity ID' and 'Activity Name' are actually
// required for a row to count as an activity -- the rest are optional and
// used by compute_metrics_from_sheet() when present.
export const REQUIRED_SHEET_COLUMNS = [
  'Activity ID',
  'Activity Name',
  'Phase',
  'Cost Category',
  'Period',
  'Baseline Start',
  'Baseline Finish',
  'Forecast Start',
  'Forecast Finish',
  'Actual Start',
  'Actual Finish',
  '% Complete',
  'Status',
  'Variance (Days)',
  'Root Cause',
  'Impact',
  'Budget Cost (AED)',
  'Actual Cost (AED)',
  'Forecast Cost (AED)',
  'Planned Hours',
  'Actual Hours',
  'Planned Output',
  'Actual Output',
  'Output Unit',
  'Productivity Index',
];

const HEADER_STYLE_ID = 'theta-header-style';

export function blankGrid(name = 'Theta Sheets') {
  return { name, sheets: [{ name: 'Schedule', headers: REQUIRED_SHEET_COLUMNS, rows: [] }] };
}

export function toUniverWorkbookData({ sheets = [], name = 'Theta Sheets' } = {}) {
  const sheetList = sheets.length ? sheets : [{ name: 'Schedule', headers: REQUIRED_SHEET_COLUMNS, rows: [] }];
  const sheetOrder = [];
  const sheetsObj = {};

  sheetList.forEach((s, idx) => {
    const sheetId = `sheet-${idx}`;
    sheetOrder.push(sheetId);
    const headers = s.headers || [];
    const rows = s.rows || [];
    const cellData = {};

    cellData[0] = {};
    headers.forEach((h, c) => {
      cellData[0][c] = { v: h, s: HEADER_STYLE_ID };
    });

    rows.forEach((row, r) => {
      cellData[r + 1] = {};
      row.forEach((val, c) => {
        cellData[r + 1][c] = { v: val === undefined || val === null ? '' : val };
      });
    });

    sheetsObj[sheetId] = {
      id: sheetId,
      name: s.name || `Sheet${idx + 1}`,
      cellData,
      rowCount: Math.max(rows.length + 20, 50),
      columnCount: Math.max(headers.length + 5, 12),
    };
  });

  return {
    id: `wb-${Date.now()}`,
    name,
    sheetOrder,
    sheets: sheetsObj,
    styles: {
      [HEADER_STYLE_ID]: { bl: 1, bg: { rgb: '#F1F5F9' } },
    },
  };
}

export function fromUniverWorkbookData(snapshot) {
  if (!snapshot || !snapshot.sheets) return { sheets: [] };
  const order = snapshot.sheetOrder && snapshot.sheetOrder.length
    ? snapshot.sheetOrder
    : Object.keys(snapshot.sheets);

  const sheets = order
    .map(id => snapshot.sheets[id])
    .filter(Boolean)
    .map(sheet => {
      const cellData = sheet.cellData || {};
      const rowKeys = Object.keys(cellData).map(Number).sort((a, b) => a - b);
      if (rowKeys.length === 0) {
        return { name: sheet.name, headers: [], rows: [] };
      }

      const headerRow = cellData[rowKeys[0]] || {};
      const headerCols = Object.keys(headerRow).map(Number).sort((a, b) => a - b);
      const headers = headerCols.map(c => String(headerRow[c]?.v ?? '').trim());

      const rows = rowKeys
        .slice(1)
        .map(r => headers.map((_, c) => {
          const cell = cellData[r]?.[c];
          return cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
        }))
        .filter(row => row.some(v => String(v).trim() !== ''));

      return { name: sheet.name, headers, rows };
    });

  return { sheets };
}
