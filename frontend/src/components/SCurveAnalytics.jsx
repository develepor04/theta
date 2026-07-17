import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
  Calendar,
  Target,
  Zap,
  Circle,
  Hourglass,
  Share2,
  Mail,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { fileService, engageService, activityService } from "../services/api";
import "./SCurveAnalytics.css";

const CHART_W = 900;
const CHART_H = 400;

function safeFileName(value = "s-curve") {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "s-curve"
  );
}

function collectSeriesPoints(points, key) {
  const out = [];
  points.forEach((p, i) => {
    const val = p[key];
    if (val !== null && val !== undefined) out.push({ i, val });
  });
  if (out.length === 0) return out;
  if (out[0].i !== 0 || out[0].val !== 0) out.unshift({ i: 0, val: 0 });
  return out;
}

function toSvgPoint(index, value, pointsLength, pad) {
  const cW = CHART_W - pad.left - pad.right;
  const cH = CHART_H - pad.top - pad.bottom;
  const xStep = cW / Math.max(pointsLength - 1, 1);
  return {
    x: pad.left + index * xStep,
    y: pad.top + cH - (value / 100) * cH,
  };
}

function buildPath(points, key, pad) {
  const valid = collectSeriesPoints(points, key).map(({ i, val }) =>
    toSvgPoint(i, val, points.length, pad),
  );
  if (valid.length < 2) return "";
  let d = `M ${valid[0].x},${valid[0].y}`;
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const curr = valid[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function buildArea(points, key, pad) {
  const valid = collectSeriesPoints(points, key).map(({ i, val }) =>
    toSvgPoint(i, val, points.length, pad),
  );
  if (valid.length < 2) return "";
  const cH = CHART_H - pad.top - pad.bottom;
  const baseY = pad.top + cH;
  let d = `M ${valid[0].x},${baseY} L ${valid[0].x},${valid[0].y}`;
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const curr = valid[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  d += ` L ${valid[valid.length - 1].x},${baseY} Z`;
  return d;
}

function makeChartSvgMarkup(points, sheetName, visibleSeries) {
  if (!points || points.length < 2) return "";
  const pad = { top: 28, right: 36, bottom: 60, left: 62 };
  const cW = CHART_W - pad.left - pad.right;
  const cH = CHART_H - pad.top - pad.bottom;
  const n = points.length;
  const xStep = cW / Math.max(n - 1, 1);

  const yGridLines = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const maxLabels = 12;
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const xLabels = points
    .map((p, i) => ({ i, label: p.month }))
    .filter((_, i) => i % step === 0 || i === n - 1);

  const epPath = buildPath(points, "ep", pad);
  const lpPath = buildPath(points, "lp", pad);
  const actualPath = buildPath(points, "actual", pad);
  const epArea = buildArea(points, "ep", pad);
  const actualArea = buildArea(points, "actual", pad);

  const hasEP =
    points.some((p) => p.ep !== null && p.ep > 0) && visibleSeries?.ep;
  const hasLP =
    points.some((p) => p.lp !== null && p.lp > 0) && visibleSeries?.lp;
  const hasActual =
    points.some((p) => p.actual !== null && p.actual > 0) &&
    visibleSeries?.actual;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" viewBox="0 0 ${CHART_W} ${CHART_H}">
  <defs>
    <linearGradient id="grad-ep-export" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0.01" />
    </linearGradient>
    <linearGradient id="grad-act-export" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16a34a" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#16a34a" stop-opacity="0.01" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${CHART_W}" height="${CHART_H}" fill="#ffffff" />
  <text x="${CHART_W / 2}" y="16" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b" font-family="Inter,sans-serif">${sheetName || "S-Curve"}</text>
  <rect x="${pad.left}" y="${pad.top}" width="${cW}" height="${cH}" fill="#fafbfc" rx="2" />
  ${yGridLines
    .map((yv) => {
      const sy = pad.top + cH - (yv / 100) * cH;
      const dashes = yv === 0 ? "none" : yv % 50 === 0 ? "none" : "3,3";
      return `
      <line x1="${pad.left}" y1="${sy}" x2="${pad.left + cW}" y2="${sy}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="${dashes}" />
      <text x="${pad.left - 10}" y="${sy + 4}" text-anchor="end" fill="#94a3b8" font-size="10" font-family="Inter,sans-serif">${yv}%</text>
    `;
    })
    .join("")}
  ${xLabels
    .map(({ i, label }) => {
      const sx = pad.left + i * xStep;
      return `
      <line x1="${sx}" y1="${pad.top}" x2="${sx}" y2="${pad.top + cH}" stroke="#f1f5f9" stroke-width="1" />
      <text x="${sx}" y="${pad.top + cH + 18}" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Inter,sans-serif" transform="rotate(-35 ${sx} ${pad.top + cH + 18})">${String(
        label || "",
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</text>
    `;
    })
    .join("")}
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + cH}" stroke="#cbd5e1" stroke-width="1" />
  <line x1="${pad.left}" y1="${pad.top + cH}" x2="${pad.left + cW}" y2="${pad.top + cH}" stroke="#cbd5e1" stroke-width="1" />
  <path d="${epArea}" fill="url(#grad-ep-export)" />
  <path d="${actualArea}" fill="url(#grad-act-export)" />
  ${hasEP ? `<path d="${epPath}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" />` : ""}
  ${hasLP ? `<path d="${lpPath}" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 4" />` : ""}
  ${hasActual ? `<path d="${actualPath}" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" />` : ""}
  <text x="16" y="${pad.top + cH / 2}" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Inter,sans-serif" transform="rotate(-90 16 ${pad.top + cH / 2})">Progress %</text>
  <text x="${pad.left + cW / 2}" y="${CHART_H - 6}" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Inter,sans-serif">Timeline (Month)</text>
</svg>`;
}

async function svgMarkupToPngBlob(
  svgMarkup,
  width = CHART_W,
  height = CHART_H,
) {
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not create PNG blob"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function svgElementToPngBlob(svgEl) {
  const serialized = new XMLSerializer().serializeToString(svgEl);
  const withNamespace = serialized.includes("xmlns=")
    ? serialized
    : serialized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const viewBox = svgEl.viewBox?.baseVal;
  const width = Math.round(viewBox?.width || svgEl.clientWidth || CHART_W);
  const height = Math.round(viewBox?.height || svgEl.clientHeight || CHART_H);
  return svgMarkupToPngBlob(withNamespace, width, height);
}

function blobToBase64DataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

async function createCombinedChartsBlob(charts, visibleSeries) {
  const rendered = [];
  for (const chart of charts) {
    const svgMarkup = makeChartSvgMarkup(
      chart.points,
      chart.sheetName,
      visibleSeries,
    );
    if (!svgMarkup) continue;
    const blob = await svgMarkupToPngBlob(svgMarkup, CHART_W, CHART_H);
    const url = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    rendered.push({ img, url, sheetName: chart.sheetName });
  }

  if (rendered.length === 0) {
    throw new Error("No charts available to share");
  }

  const titleHeight = 56;
  const sectionGap = 16;
  const width = CHART_W + 40;
  const height = titleHeight + rendered.length * (CHART_H + sectionGap) + 20;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 20px Inter, Arial, sans-serif";
  ctx.fillText("S-Curve Analytics Bundle", 20, 34);
  ctx.fillStyle = "#64748b";
  ctx.font = "500 12px Inter, Arial, sans-serif";
  ctx.fillText(new Date().toLocaleString(), 20, 50);

  let y = titleHeight;
  rendered.forEach(({ img }, index) => {
    ctx.drawImage(img, 20, y, CHART_W, CHART_H);
    y += CHART_H + sectionGap;
    URL.revokeObjectURL(rendered[index].url);
  });

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create combined chart image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

// ─────────────────────────────────────────────
//  Helper: find a column index by priority list
// ─────────────────────────────────────────────
function findColIdx(headers, candidates) {
  const lower = headers.map((h) =>
    String(h || "")
      .toLowerCase()
      .trim(),
  );
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Parse a cell that might be a date string or number
function parseDate(val) {
  const MIN_REASONABLE_YEAR = 1990;
  const MAX_REASONABLE_YEAR = 2100;
  const isReasonableDate = (d) =>
    d instanceof Date &&
    !isNaN(d) &&
    d.getFullYear() >= MIN_REASONABLE_YEAR &&
    d.getFullYear() <= MAX_REASONABLE_YEAR;

  if (!val) return null;
  if (val instanceof Date) return isReasonableDate(val) ? val : null;
  const s = String(val).trim();
  if (!s || s === "None" || s === "null") return null;
  // Accept date strings with status suffixes like "07-Nov-24 A".
  // Keep only the leading date token before parsing.
  // Strip status suffixes (e.g. "Apr 2026 A", "07-Nov-24 On Track") — keep only the date token
  let cleaned = s.replace(/\(.*?\)/g, "").replace(/[^\w\-\/]/g, " ").trim();
  // Repeatedly strip a trailing all-alpha word until none remain
  while (/\s+[A-Za-z]+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\s+[A-Za-z]+$/, "").trim();
  }
  // Excel serial number
  if (/^\d{5}$/.test(cleaned)) {
    const d = new Date((parseInt(cleaned, 10) - 25569) * 86400 * 1000);
    if (isReasonableDate(d)) return d;
  }
  
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Handle DD-MMM-YY (e.g. 07-Nov-24)
  const ddMmmYy = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddMmmYy) {
    const mon = ddMmmYy[2].toLowerCase();
    if (monthMap[mon] !== undefined) {
      const fullYear = parseInt(ddMmmYy[3], 10) >= 70 ? 1900 + parseInt(ddMmmYy[3], 10) : 2000 + parseInt(ddMmmYy[3], 10);
      const parsed = new Date(fullYear, monthMap[mon], parseInt(ddMmmYy[1], 10));
      if (isReasonableDate(parsed)) return parsed;
    }
  }

  // Handle DD-MMM-YYYY (e.g. 07-Nov-2024)
  const ddMmmYyyy = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (ddMmmYyyy) {
    const mon = ddMmmYyyy[2].toLowerCase();
    if (monthMap[mon] !== undefined) {
      const parsed = new Date(parseInt(ddMmmYyyy[3], 10), monthMap[mon], parseInt(ddMmmYyyy[1], 10));
      if (isReasonableDate(parsed)) return parsed;
    }
  }

  // Handle MMM-YY or MMM YY (e.g. "Apr-26", "Apr 26") — month only, day=1
  const mmmYy = cleaned.match(/^([A-Za-z]{3})[\s-](\d{2})$/);
  if (mmmYy) {
    const mon = mmmYy[1].toLowerCase();
    if (monthMap[mon] !== undefined) {
      const yy = parseInt(mmmYy[2], 10);
      const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;
      const parsed = new Date(fullYear, monthMap[mon], 1);
      if (isReasonableDate(parsed)) return parsed;
    }
  }

  // Handle MMM-YYYY or MMM YYYY (e.g. "Apr-2026", "Apr 2026")
  const mmmYyyy = cleaned.match(/^([A-Za-z]{3})[\s-](\d{4})$/);
  if (mmmYyyy) {
    const mon = mmmYyyy[1].toLowerCase();
    if (monthMap[mon] !== undefined) {
      const parsed = new Date(parseInt(mmmYyyy[2], 10), monthMap[mon], 1);
      if (isReasonableDate(parsed)) return parsed;
    }
  }

  // Handle YYYY-MM (e.g. "2026-04")
  const yyyyMm = cleaned.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const parsed = new Date(parseInt(yyyyMm[1], 10), parseInt(yyyyMm[2], 10) - 1, 1);
    if (isReasonableDate(parsed)) return parsed;
  }

  const d = new Date(cleaned);
  return isReasonableDate(d) ? d : null;
}

// Month key  "YYYY-MM"
function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Generate array of month keys between two dates
function monthRange(from, to) {
  const months = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    months.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function formatMonthLabel(raw) {
  if (raw === null || raw === undefined) return "";

  if (raw instanceof Date && !isNaN(raw)) {
    return raw.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const text = String(raw).trim();
  if (!text) return "";

  const ym = text.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const d = new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
    if (!isNaN(d)) {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }

  const parsed = parseDate(text);
  if (parsed && !isNaN(parsed)) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  return text;
}

// ─────────────────────────────────────────────
//  Parse a percentage string "12.34%" → 12.34
// ─────────────────────────────────────────────
function parsePct(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace("%", "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────
//  Build S-curve from activity EP / LP / Actual dates
// ─────────────────────────────────────────────────────────────────
function buildCurveFromDates(
  rows,
  epIdx,
  lpIdx,
  actualIdx,
  actIdIdx = -1,
  actNameIdx = -1,
  filterEarlyStartIdx = -1,
  filterStartIdx = -1,
) {
  const total = rows.length;
  if (total === 0) return null;

  // For P6 exports the "Finish" / "Start" columns are mixed:
  //   - A string like "04-Apr-25 A" means the activity is ACTUALLY complete (the " A" suffix is P6's "Actual" flag).
  //   - A plain datetime means it's still the planned/forecast date — NOT actual.
  // So for the actual series we only accept values that carry the " A" marker.
  const isP6Actual = (val) => {
    if (val == null) return false;
    if (val instanceof Date) return false;           // plain datetime → planned, not actual
    const s = String(val).trim();
    return /\bA\b/.test(s) || s.endsWith(' A');    // "DD-MMM-YY A" pattern
  };

  // ── Detect P6 "data date" ────────────────────────────────────────────────
  // In P6 exports, activities that haven't been scheduled beyond the export cut-off date
  // all receive the data date as their Early/Late Finish. This produces a massive cluster on a
  // single date (often >30% of all activities), which causes the L-shaped spike.
  // We detect this by finding the single most-common EP/LP date; if it accounts for ≥25% of
  // all activities we treat it as the data date and exclude it from that series.
  // The activity is still counted in the denominator (it exists), but its bucket is null.

  function detectDataDateKey(colIdx, sourceRows) {
    const counts = {};
    sourceRows.forEach((row) => {
      const raw = colIdx >= 0 ? row[colIdx] : null;
      const d = parseDate(raw);
      if (d) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    if (total === 0) return null;
    const [topKey, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return topCount / total >= 0.25 ? topKey : null;
  }

  // ── Auto-detect if P6 " A" suffix is used in this file ──────────────────
  const anyP6ActualMarker = actualIdx >= 0 && rows.some((row) => isP6Actual(row[actualIdx]));

  // ── Pre-filter rows FIRST: skip if Activity Name, Early Start, or Start is empty ──
  // Uses dedicated Early Start and Start columns when available (P6 exports),
  // falling back to epIdx / actualIdx if not detected.
  const esFilterIdx = filterEarlyStartIdx >= 0 ? filterEarlyStartIdx : epIdx;
  const stFilterIdx = filterStartIdx >= 0 ? filterStartIdx : actualIdx;

  const filteredRows = rows.filter((row) => {
    // Rule 1: activity name must be non-empty
    if (actNameIdx >= 0) {
      const name = String(row[actNameIdx] ?? "").trim();
      if (!name) return false;
    }
    // Rule 2: Early Start must be non-empty
    if (esFilterIdx >= 0) {
      const esRaw = row[esFilterIdx];
      if (esRaw == null || String(esRaw).trim() === "") return false;
    }
    // Rule 3: Start must be non-empty
    if (stFilterIdx >= 0) {
      const stRaw = row[stFilterIdx];
      if (stRaw == null || String(stRaw).trim() === "") return false;
    }
    return true;
  });

  // ── Detect P6 "data date" on filtered rows only ──────────────────────────
  // Run detectDataDateKey against filteredRows so the threshold isn't skewed
  // by blank/summary rows that were just excluded above.
  const epDataDateKey = detectDataDateKey(epIdx, filteredRows);
  const lpDataDateKey = detectDataDateKey(lpIdx, filteredRows);

  const activities = filteredRows.map((row) => {
    const epRaw = epIdx >= 0 ? row[epIdx] : null;
    const epDate = parseDate(epRaw);
    const epKey = epDate ? `${epDate.getFullYear()}-${epDate.getMonth()}-${epDate.getDate()}` : null;

    const lpRaw = lpIdx >= 0 ? row[lpIdx] : null;
    const lpDate = parseDate(lpRaw);
    const lpKey = lpDate ? `${lpDate.getFullYear()}-${lpDate.getMonth()}-${lpDate.getDate()}` : null;

    // For actual: use P6 " A" marker if present in this file; otherwise accept all parsed dates
    const actualRaw = actualIdx >= 0 ? row[actualIdx] : null;
    const actualDate = anyP6ActualMarker
      ? (isP6Actual(actualRaw) ? parseDate(actualRaw) : null)
      : parseDate(actualRaw);

    return {
      ep:       (epDate && epKey !== epDataDateKey) ? epDate : null,
      lp:       (lpDate && lpKey !== lpDataDateKey) ? lpDate : null,
      actual:   actualDate,
    };
  });

  // Collect activities by month for tooltip drill-down on every hover point
  const activitiesByMonth = {};
  activities.forEach((a, i) => {
    const row = filteredRows[i];
    const id = actIdIdx >= 0 ? String(row[actIdIdx] || "").trim() : "";
    const name = actNameIdx >= 0 ? String(row[actNameIdx] || "").trim() : "";
    if (!id && !name) return;
    const label = id ? (name ? `${id} — ${name}` : id) : name;
    [a.ep, a.lp, a.actual].filter(Boolean).forEach((d) => {
      const mk = monthKey(d);
      if (!activitiesByMonth[mk]) activitiesByMonth[mk] = new Set();
      activitiesByMonth[mk].add(label);
    });
  });

  const allDates = activities.flatMap((a) =>
    [a.ep, a.lp, a.actual].filter(Boolean),
  );
  if (allDates.length === 0) return null;

  // Remove outlier years that can flatten chart and produce unrealistic x-axis labels.
  const years = allDates.map((d) => d.getFullYear()).sort((a, b) => a - b);
  const medianYear = years[Math.floor(years.length / 2)] ?? years[0];
  // ❗ DO NOT DROP DATA — just ignore extreme garbage years
  const isValidYear = (d) => {
    const y = d.getFullYear();
    return y > 1980 && y < 2100; // only reject absurd values
  };

  activities.forEach((a) => {
    if (a.ep && !isValidYear(a.ep)) a.ep = null;
    if (a.lp && !isValidYear(a.lp)) a.lp = null;
    if (a.actual && !isValidYear(a.actual)) a.actual = null;
  });

  const boundedDates = activities.flatMap((a) =>
    [a.ep, a.lp, a.actual].filter(Boolean),
  );
  if (boundedDates.length === 0) return {
    points: [],
    total: filteredRows.length,
    error: "No valid data"
  };

  const validDates = boundedDates;

  if (!validDates.length) {
    return {
      points: [],
      total: filteredRows.length,
      error: "No valid dates after filtering"
    };
  }

  const minDate = new Date(Math.min(...validDates));
  const maxDate = new Date(Math.max(...validDates));
  const months = monthRange(minDate, maxDate);

  const hasEP = activities.some((a) => a.ep !== null);
  const hasLP = activities.some((a) => a.lp !== null);
  const hasActual = activities.some((a) => a.actual !== null);

  // Single shared denominator so all series are on the same scale and comparable.
  // EP activities without an EP date are simply skipped (not pushed to month 0),
  // so EP may not reach 100% if some activities lack EP dates — which is correct.
  const denominator = Math.max(
    activities.filter((a) => a.ep || a.lp || a.actual).length,
    1,
  );

  // Count per-month buckets
  const epBucket = {},
    lpBucket = {},
    actualBucket = {};
  months.forEach((m) => {
    epBucket[m] = 0;
    lpBucket[m] = 0;
    actualBucket[m] = 0;
  });

  function addToMonth(date, bucket) {
    const mk = monthKey(date);
    if (bucket[mk] !== undefined) {
      bucket[mk] += 1;
    }
  }

  // Fill buckets — activities without an EP date are simply skipped for the EP series
  activities.forEach((a) => {
    if (a.ep) addToMonth(a.ep, epBucket);
    if (a.lp) addToMonth(a.lp, lpBucket);
    if (a.actual) addToMonth(a.actual, actualBucket);
  });

  // Trim leading months where NO series has any data yet
  // while (
  //   months.length > 2 &&
  //   (epBucket[months[0]] || 0) < 0.01 &&
  //   (lpBucket[months[0]] || 0) < 0.01 &&
  //   (actualBucket[months[0]] || 0) < 0.01 &&
  //   (forecastBucket[months[0]] || 0) < 0.01
  // ) {
  //   delete epBucket[months[0]];
  //   delete lpBucket[months[0]];
  //   delete actualBucket[months[0]];
  //   delete forecastBucket[months[0]];
  //   months.shift();
  // }
  // if (months.length < 2) return null;

  // Prepend ONE zero-origin month so curves start smoothly from 0%
  const firstActivityDate = new Date(Math.min(...validDates));
  const originDate = new Date(firstActivityDate.getFullYear(), firstActivityDate.getMonth() - 1, 1);
  const originMk = monthKey(originDate);
  if (months[0] !== originMk) {
    months.unshift(originMk);
    epBucket[originMk] = 0;
    lpBucket[originMk] = 0;
    actualBucket[originMk] = 0;
  }
  // Determine the last month that has actual data so we don't draw actual into the future
  const actualDates = activities.map((a) => a.actual).filter(Boolean);
  const lastActualMonth =
    actualDates.length > 0
      ? monthKey(new Date(Math.max(...actualDates)))
      : null;

  let cumEP = 0,
    cumLP = 0,
    cumActual = 0;
  let pastLastActual = false;

  const nMonths = months.length;
  const points = months.map((m, mi) => {

  const clamp = (v) => Math.max(0, Math.min(100, v));

  cumEP += epBucket[m] || 0;
  cumLP += lpBucket[m] || 0;
  cumActual += actualBucket[m] || 0;

  if (lastActualMonth && m > lastActualMonth) pastLastActual = true;

  const actualVal = hasActual
    ? pastLastActual
      ? null
      : (cumActual / denominator) * 100
    : null;

  return {
    month: formatMonthLabel(m),
    ep: hasEP ? clamp((cumEP / denominator) * 100) : null,
    lp: hasLP ? clamp((cumLP / denominator) * 100) : null,
    actual: actualVal !== null ? clamp(actualVal) : null,
    ...(activitiesByMonth[m]
      ? {
          nodeActivities: [...activitiesByMonth[m]].slice(0, 8),
          totalActivitiesInMonth: activitiesByMonth[m].size,
        }
      : {}),
  };
});

  // Trim leading points where cumulative progress is still essentially zero (<1%)
  // This removes years of flat baseline that occur when early LP dates exist
  const TRIM_THRESHOLD = 1.0;
  let trimIdx = 0;
  for (let i = 0; i < points.length - 2; i++) {
    const p = points[i];
    if ((p.ep ?? 0) < TRIM_THRESHOLD && (p.lp ?? 0) < TRIM_THRESHOLD && (p.actual ?? 0) < TRIM_THRESHOLD) {
      trimIdx = i + 1;
    } else {
      break;
    }
  }
  const startIdx = Math.max(0, trimIdx - 1);
  const trimmedPoints = startIdx > 0 ? points.slice(startIdx) : points;
  if (startIdx > 0 && trimmedPoints.length > 0) {
    const first = trimmedPoints[0];
    trimmedPoints[0] = {
      ...first,
      ep: first.ep !== null ? 0 : null,
      lp: first.lp !== null ? 0 : null,
      actual: first.actual !== null ? 0 : null,
    };
  }

  const delayed = activities.filter(
    (a) => a.actual && a.lp && a.actual > a.lp,
  ).length;
  const onTime = activities.filter(
    (a) => a.actual && a.lp && a.actual <= a.lp,
  ).length;
  const withActual = activities.filter((a) => a.actual !== null).length;
  const notStarted = activities.filter((a) => a.actual === null).length;
  const lastActualPoint = [...trimmedPoints]
    .reverse()
    .find((p) => p.actual !== null && p.actual > 0);
  const currentActual = lastActualPoint?.actual ?? 0;
  const currentEP = lastActualPoint?.ep ?? 0;
  const variance = parseFloat((currentActual - currentEP).toFixed(1));

  return {
    points: trimmedPoints,
    total: filteredRows.length,
    activityCount: filteredRows.length,
    delayed,
    onTime,
    notStarted,
    withActual,
    avgDev: 0,
    variance,
    currentActual,
    currentEP,
    epExists: hasEP,
    lpExists: hasLP,
    actualExists: hasActual,
    plannedDataExists: hasEP,
    actualDataExists: hasActual,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Compute S-curve points from sheet data
//  Handles 2 types:
//    Type-1  Monthly time-series  (Date | Baseline EP% | BL-LP% | Actual%)
//    Type-2  Activity date-based  (EP date | LP date | Actual date)
// ─────────────────────────────────────────────────────────────────────────────
function computeSCurve(headers, rows) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) return null;

  const lH = headers.map((h) =>
    String(h || "")
      .toLowerCase()
      .trim(),
  );
  const findCol = (...kwds) => {
    for (const kw of kwds) {
      const idx = lH.findIndex((h) => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // ── Type-2 / Type-2b: Activity date-based ────────────────────────────────
  // Activity trackers: Commissioning, HO-Procurements, HO-Subcontract,
  // Manufacture, Project Management, Const & Pre-Comm
  // Headers contain: Early Planning | Late Planning | Actual Date
  // ── Column detection ─────────────────────────────────────────────────────
  // Supports P6 exports (Early Finish / Late Finish / Finish+A suffix)
  // and custom tracker sheets (Early Planning / Late Planning / Actual Date).
  //
  // P6 schedule logic:
  //   EP curve  → Early Finish  (the baseline planned finish per activity)
  //   LP curve  → Late Finish   (latest allowable finish with float)
  //   Actual    → Finish column (contains "DD-MMM-YY A" when complete, datetime when planned)
  //               We use "Start" / "Start [Actual]" as the actual start fallback.
  //
  // NOTE: "Early Start" is intentionally NOT used for EP — it represents when work
  // can start, not when it finishes. S-curves plot completion dates.

  const epDateIdx = findCol(
    // P6 standard exports
    "early finish",
    "early planed finish",   // typo variant seen in data
    "early planned finish",
    // Custom tracker headers
    "early planning",
    "planned start date (ep)",
    "planned start date",
    "ep start date",
    "ep start",
    "ep date",
  );
  const lpDateIdx = findCol(
    // P6 standard exports
    "late finish",
    "late planning",
    // Custom tracker headers
    "planned end date (lp)",
    "planned end date",
    "lp date",
    "lp end",
  );
  const actualDateIdx = findCol(
    // P6: "Finish [Actual]" or plain "Finish" (contains "DD-MMM-YY A" strings when done)
    "finish [actual]",
    "start [actual]",
    // Custom tracker headers
    "actual date (a)",
    "actual start date",
    "actual_start_date",
    "actual completion date",
    "actual_completion_date",
    "actual complete date",
    "actual date",
    "actual finish",
    // P6 plain "Finish" or "Start" columns — mixed datetime/string, last resort.
    // IMPORTANT: must not match "early finish" or "late finish" — use exact match via boundary.
    // We handle this by checking "^finish" or "^start" (done in findColExact below).
    "__p6_finish__",   // sentinel — resolved below via exact-match fallback
  );
  // Exact-match fallback: if ACT not found yet, try plain "Finish" or "Start"
  // columns whose header is exactly that word (P6 exports).
  let resolvedActualIdx = actualDateIdx;
  if (resolvedActualIdx === -1) {
    resolvedActualIdx = lH.findIndex((h) => h === "finish" || h === "start");
  }

  const hasActivityCols =
    epDateIdx !== -1 || lpDateIdx !== -1 || resolvedActualIdx !== -1;

  // Prefer activity-based parsing first when activity columns exist.
  // This avoids misclassifying tracker sheets that also contain a generic "date" header.
  if (hasActivityCols) {
    const actIdColIdx = findCol("activity id", "act id", "activity_id");
    const actNameColIdx = findCol(
      "activity name",
      "act name",
      "activity description",
    );
    // For filtering: detect "Early Start" and "Start" columns explicitly
    // These are the P6 columns the user wants for the 3-rule activity filter.
    const earlyStartColIdx = findCol("early start");
    const startColIdx = lH.findIndex((h) => h === "start");
    return buildCurveFromDates(
      rows,
      epDateIdx,
      lpDateIdx,
      resolvedActualIdx,
      actIdColIdx,
      actNameColIdx,
      earlyStartColIdx,
      startColIdx,  // filterStartIdx — distinct from trimming startIdx inside function
    );
  }

  // ── Type-1: Direct monthly S-curve ───────────────────────────────────────
  // Detects sheets from overall_s_curve_tracker and PM/EDDR monthly summary tabs.
  const dateColIdx = findCol("date");
  const baselineEpIdx = findCol(
    "baseline ep",
    "revised bl-ep",
    "ep %",
    "ep%",
    "planned %",
    "planned pct",
    "plan %",
    "ep cumulative",
  );
  const revBLLPIdx = findCol(
    "revised bl-lp",
    "bl-lp",
    "lp %",
    "lp%",
    "late plan %",
    "lp cumulative",
  );
  const cummActualIdx = findCol(
    "cumm. actual",
    "cumm actual",
    "actual %",
    "actual pct",
    "actual cumulative",
  );

  const isTimeSeries =
    dateColIdx !== -1 &&
    (baselineEpIdx !== -1 || revBLLPIdx !== -1 || cummActualIdx !== -1);

  if (isTimeSeries) {
    const points = [];
    for (const row of rows) {
      const dateVal = row[dateColIdx];
      if (!dateVal && !row[0]) continue;

      const ep = baselineEpIdx !== -1 ? parsePct(row[baselineEpIdx]) : null;
      const lp = revBLLPIdx !== -1 ? parsePct(row[revBLLPIdx]) : null;
      const actual = cummActualIdx !== -1 ? parsePct(row[cummActualIdx]) : null;
      const rawMonth = dateVal || row[0] || "";
      const parsedMonth = parseDate(rawMonth);

      if (ep === null && lp === null && actual === null) continue;

      // Skip rows whose date parses to an unreasonable year (garbage data / serial numbers)
      if (parsedMonth && (parsedMonth.getFullYear() < 2015 || parsedMonth.getFullYear() > 2035)) continue;

      points.push({
        month: formatMonthLabel(rawMonth),
        monthTs:
          parsedMonth && !isNaN(parsedMonth)
            ? new Date(
                parsedMonth.getFullYear(),
                parsedMonth.getMonth(),
                1,
              ).getTime()
            : null,
        ep,
        lp,
        actual,
      });
    }

    const parseableCount = points.filter((p) => p.monthTs !== null).length;
    if (points.length > 1 && parseableCount >= Math.ceil(points.length * 0.6)) {
      points.sort((a, b) => {
        const ax = a.monthTs === null ? Number.MAX_SAFE_INTEGER : a.monthTs;
        const bx = b.monthTs === null ? Number.MAX_SAFE_INTEGER : b.monthTs;
        return ax - bx;
      });
    }

    points.forEach((p) => {
      delete p.monthTs;
    });

    // Trim leading points where all series are zero or null (avoids long flat start)
    while (
      points.length > 2 &&
      (points[0].ep === null || points[0].ep === 0) &&
      (points[0].lp === null || points[0].lp === 0) &&
      (points[0].actual === null || points[0].actual === 0)
    ) {
      points.shift();
    }

    // Normalize oversized cumulative series (counts) to 0..100 scale.
    const maxEp = Math.max(...points.map((p) => p.ep ?? 0), 0);
    const maxLp = Math.max(...points.map((p) => p.lp ?? 0), 0);
    const maxActual = Math.max(...points.map((p) => p.actual ?? 0), 0);
    const looksCountLike = maxActual > 120 && maxEp <= 100.5 && maxLp <= 100.5;
    if (looksCountLike && maxActual > 0) {
      points.forEach((p) => {
        if (p.actual !== null && p.actual !== undefined) {
          p.actual = (p.actual / maxActual) * 100;
        }
      });
    }

    if (points.length >= 2) {
      const first = points[0];
      if (
        (first.ep != null && first.ep > 0) ||
        (first.lp != null && first.lp > 0) ||
        (first.actual != null && first.actual > 0)
      ) {
        points.unshift({ month: "", ep: 0, lp: 0, actual: 0 });
      }

      const epExists = points.some((p) => p.ep !== null);
      const lpExists = points.some((p) => p.lp !== null);
      const actualExists = points.some((p) => p.actual !== null);

      const lastActualPoint = [...points]
        .reverse()
        .find((p) => p.actual !== null && p.actual > 0);
      const currentActual = lastActualPoint?.actual ?? 0;
      const currentEP = lastActualPoint?.ep ?? 0;
      const variance = parseFloat((currentActual - currentEP).toFixed(1));

      return {
        type: "timeseries",
        points,
        total: points.length,
        delayed: variance < -1 ? 1 : 0,
        onTime: variance >= -1 ? 1 : 0,
        notStarted: 0,
        withActual: points.filter((p) => p.actual !== null && p.actual > 0)
          .length,
        avgDev: 0,
        variance,
        currentActual,
        currentEP,
        epExists,
        lpExists,
        actualExists,
        plannedDataExists: epExists,
        actualDataExists: actualExists,
      };
    }
  }

  // ── Legacy fallback: any planned/actual date columns ──────────────────────
  const pIdx = findColIdx(headers, [
    "ep start date",
    "ep-start date",
    "ep start",
    "baseline start",
    "planned start",
    "early start",
    "ep dates",
    "start date",
    "ep finish date",
    "ep-finish",
    "planned date",
  ]);
  const aIdx = findColIdx(headers, [
    "actual start date",
    "actual start",
    "actual finish date",
    "actual",
    "as built",
    "real start",
  ]);
  const dIdx = findColIdx(headers, ["deviation", "delay", "variance"]);

  if (pIdx === -1 && aIdx === -1) return {
    points: [],
    total: 0,
    delayed: 0,
    onTime: 0,
    notStarted: 0,
    withActual: 0,
    avgDev: 0,
    variance: 0,
    currentActual: 0,
    currentEP: 0,
    epExists: false,
    lpExists: false,
    actualExists: false,
    plannedDataExists: false,
    actualDataExists: false,
  };

  const activities = rows.map((row) => ({
    ep: pIdx >= 0 ? parseDate(row[pIdx]) : null,
    actual: aIdx >= 0 ? parseDate(row[aIdx]) : null,
    deviation: dIdx >= 0 ? parseFloat(row[dIdx]) || 0 : 0,
  }));

  const allDates = activities.flatMap((a) =>
    [a.ep, a.lp, a.actual].filter(Boolean)
  );

  // 🚨 If no valid dates → still proceed using fallback
  if (allDates.length === 0) {
    console.warn("No valid dates → forcing fallback timeline");

    const today = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(monthKey(d));
    }

    return {
      points: months.map((m, i) => ({
        month: m,
        ep: (i / months.length) * 100,
        lp: (i / months.length) * 100,
        actual: null,
      })),
      total: filteredRows.length,
      error: "Fallback used",
    };
  }

  // Filter out date outliers using median ± 6 years to avoid garbage dates stretching the axis
  const allYears = allDates.map((d) => d.getFullYear()).sort((a, b) => a - b);
  const medYr = allYears[Math.floor(allYears.length / 2)];
  activities.forEach((a) => {
    if (a.ep && Math.abs(a.ep.getFullYear() - medYr) > 6) a.ep = null;
    if (a.actual && Math.abs(a.actual.getFullYear() - medYr) > 6) a.actual = null;
  });

  const filteredDates = activities.flatMap((a) => [a.ep, a.actual].filter(Boolean));
  if (filteredDates.length === 0) return null;

  const minDate = new Date(Math.min(...filteredDates));
  const maxDate = new Date(Math.max(...filteredDates));
  const months = monthRange(minDate, maxDate);
  if (months.length < 2) return null;

  // Prepend a zero-origin month so curves start smoothly from 0%
  const legacyOrigin = new Date(
    minDate.getFullYear(),
    minDate.getMonth() - 1,
    1,
  );
  const legacyOriginMk = monthKey(legacyOrigin);
  if (months[0] !== legacyOriginMk) {
    months.unshift(legacyOriginMk);
  }

  const total = activities.length;
  const epBucket = {},
    actualBucket = {};
  months.forEach((m) => {
    epBucket[m] = 0;
    actualBucket[m] = 0;
  });
  activities.forEach((a) => {
    if (a.ep) {
      const mk = monthKey(a.ep);
      if (epBucket[mk] !== undefined) epBucket[mk]++;
    }
    if (a.actual) {
      const mk = monthKey(a.actual);
      if (actualBucket[mk] !== undefined) actualBucket[mk]++;
    }
  });

  // Determine the last month with actual data
  const legacyActualDates = activities.map((a) => a.actual).filter(Boolean);
  const legacyLastActualMonth =
    legacyActualDates.length > 0
      ? monthKey(new Date(Math.max(...legacyActualDates)))
      : null;

  let cumEP = 0,
    cumAct = 0;
  let legacyPastLastActual = false;
  const points = months.map((m) => {
    const clamp = (v) => Math.max(0, Math.min(100, v));
    cumEP += epBucket[m] || 0;
    cumAct += actualBucket[m] || 0;
    if (legacyLastActualMonth && m > legacyLastActualMonth)
      legacyPastLastActual = true;
    return {
      month: formatMonthLabel(m),
      ep: total > 0 ? (cumEP / total) * 100 : 0,
      lp: null,
      actual: legacyPastLastActual
        ? null
        : total > 0
          ? (cumAct / total) * 100
          : 0,
    };
  });

  const delayed = activities.filter((a) => a.deviation > 0).length;
  const onTime = activities.filter((a) => a.deviation <= 0).length;
  const withActual = activities.filter((a) => a.actual !== null).length;
  const notStarted = activities.filter((a) => a.actual === null).length;
  const avgDev =
    activities.length > 0
      ? parseFloat(
          (
            activities.reduce((s, a) => s + a.deviation, 0) / activities.length
          ).toFixed(1),
        )
      : 0;

  return {
    points,
    total,
    delayed,
    onTime,
    notStarted,
    withActual,
    avgDev,
    variance: 0,
    currentActual: 0,
    currentEP: 0,
    epExists: true,
    lpExists: false,
    actualExists: withActual > 0,
    plannedDataExists: true,
    actualDataExists: withActual > 0,
  };
}

// ─────────────────────────────────────────────
//  SVG S-Curve Chart
// ─────────────────────────────────────────────
const SCurveChart = ({ points, sheetName, animKey, visibleSeries }) => {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const hoverRafRef = useRef(null);
  const lastTooltipIdxRef = useRef(-1);

  const W = 900,
    H = 400;
  const pad = { top: 28, right: 36, bottom: 60, left: 62 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const n = points.length;
  if (n < 2) {
    return (
      <div className="sca-no-data">
        <Activity size={40} />
        <p>Not enough date data to render S-curve</p>
        <span>Ensure your sheet has planned/actual date columns</span>
      </div>
    );
  }

  const xStep = cW / (n - 1);

  const toSVG = (i, val) => ({
    x: pad.left + i * xStep,
    y: pad.top + cH - (val / 100) * cH,
  });

  const buildLinePathFromSeries = (series) => {
    if (!Array.isArray(series) || series.length < 2) return "";
    const valid = series
      .filter((pt) => pt && pt.val !== null && pt.val !== undefined)
      .map((pt) => toSVG(pt.i, pt.val));
    if (valid.length < 2) return "";
    let d = `M ${valid[0].x},${valid[0].y}`;
    for (let i = 1; i < valid.length; i++) {
      d += ` L ${valid[i].x},${valid[i].y}`;
    }
    return d;
  };

  // Collect valid {index, value} pairs for a series.
  // Always start from 0% at the chart origin (index 0) for a smooth rise.
  const collectValid = (key) => {
    const raw = [];
    points.forEach((p, i) => {
      const val = p[key];
      if (val !== null && val !== undefined) {
        raw.push({ i, val });
      }
    });
    if (raw.length === 0) return raw;
    // Ensure every curve starts from zero at index 0
    if (raw[0].i !== 0 || raw[0].val !== 0) {
      raw.unshift({ i: 0, val: 0 });
    }
    return raw;
  };

  // Build smooth bezier path
  const buildPath = (key) => {
    const valid = collectValid(key).map(({ i, val }) => toSVG(i, val));
    if (valid.length < 2) return "";
    let d = `M ${valid[0].x},${valid[0].y}`;
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i - 1];
      const curr = valid[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  };

  // Area path (filled below line)
  const buildArea = (key) => {
    const valid = collectValid(key).map(({ i, val }) => toSVG(i, val));
    if (valid.length < 2) return "";
    const baseY = pad.top + cH;
    let d = `M ${valid[0].x},${baseY} L ${valid[0].x},${valid[0].y}`;
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i - 1];
      const curr = valid[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    d += ` L ${valid[valid.length - 1].x},${baseY} Z`;
    return d;
  };

  const yGridLines = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const xLabels = useMemo(() => {
    const maxLabels = 12;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    return points
      .map((p, i) => ({ i, label: p.month }))
      .filter((_, i) => i % step === 0 || i === n - 1);
  }, [n, points]);

  const hasEP = useMemo(
    () => points.some((p) => p.ep !== null && p.ep > 0) && visibleSeries?.ep,
    [points, visibleSeries?.ep],
  );
  const hasLP = useMemo(
    () => points.some((p) => p.lp !== null && p.lp > 0) && visibleSeries?.lp,
    [points, visibleSeries?.lp],
  );
  const hasActual = useMemo(
    () =>
      points.some((p) => p.actual !== null && p.actual > 0) &&
      visibleSeries?.actual,
    [points, visibleSeries?.actual],
  );

  const epPath = useMemo(() => buildPath("ep"), [points]);
  const lpPath = useMemo(() => buildPath("lp"), [points]);
  const actualPath = useMemo(() => buildPath("actual"), [points]);
  const epArea = useMemo(() => buildArea("ep"), [points]);
  const actualArea = useMemo(() => buildArea("actual"), [points]);

  const actualSeries = useMemo(() => {
    let carry = 0;
    return points.map((p, i) => {
      const hasData = p.actual !== null && p.actual !== undefined;
      if (hasData) carry = p.actual;
      return { i, val: hasData ? p.actual : carry, hasData };
    });
  }, [points]);

  const buildActualSegmentPaths = useCallback(() => {
    const solidSegments = [];
    const dottedSegments = [];

    let i = 0;
    while (i < actualSeries.length) {
      if (actualSeries[i].hasData) {
        const start = i;
        while (i + 1 < actualSeries.length && actualSeries[i + 1].hasData) i++;
        const end = i;
        if (end - start >= 1) {
          solidSegments.push(actualSeries.slice(start, end + 1));
        }
        i++;
        continue;
      }

      const startMissing = i;
      while (i + 1 < actualSeries.length && !actualSeries[i + 1].hasData) i++;
      const endMissing = i;

      const segStart = Math.max(0, startMissing - 1);
      const segEnd = Math.min(actualSeries.length - 1, endMissing + 1);
      if (segEnd - segStart >= 1) {
        dottedSegments.push(actualSeries.slice(segStart, segEnd + 1));
      }
      i++;
    }

    return {
      solidPaths: solidSegments
        .map((seg) => buildLinePathFromSeries(seg))
        .filter(Boolean),
      dottedPaths: dottedSegments
        .map((seg) => buildLinePathFromSeries(seg))
        .filter(Boolean),
    };
  }, [actualSeries]);

  const { solidPaths: actualSolidPaths, dottedPaths: actualDottedPaths } =
    useMemo(() => buildActualSegmentPaths(), [buildActualSegmentPaths]);

  // Mouse hover for tooltip — scale pixel coords to SVG viewBox space
  const handleMouseMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX - pad.left;
    const idx = Math.round(mx / xStep);
    if (idx < 0 || idx >= n) return;
    if (idx === lastTooltipIdxRef.current) return;
    lastTooltipIdxRef.current = idx;

    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => {
      const svgX = pad.left + idx * xStep;
      const pixelX = svgX / scaleX;
      const pixelY = e.clientY - rect.top;
      setTooltip({
        idx,
        x: svgX,
        px: pixelX,
        py: pixelY,
        rightHalf: pixelX > rect.width * 0.65,
      });
      hoverRafRef.current = null;
    });
  };

  useEffect(() => {
    return () => {
      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    };
  }, []);

  return (
    <div className="sca-chart-wrapper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="sca-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          lastTooltipIdxRef.current = -1;
          setTooltip(null);
        }}
      >
        <defs>
          {/* EP — subtle fill */}
          <linearGradient id={`grad-ep-${animKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
          {/* Actual — subtle fill */}
          <linearGradient
            id={`grad-act-${animKey}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="#ffffff" rx={6} />

        {/* Chart area bg */}
        <rect
          x={pad.left}
          y={pad.top}
          width={cW}
          height={cH}
          fill="#fafbfc"
          rx={2}
        />

        {/* Horizontal grid lines */}
        {yGridLines.map((yv) => {
          const sy = pad.top + cH - (yv / 100) * cH;
          return (
            <g key={yv}>
              <line
                x1={pad.left}
                y1={sy}
                x2={pad.left + cW}
                y2={sy}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray={
                  yv === 0 ? "none" : yv % 50 === 0 ? "none" : "3,3"
                }
              />
              <text
                x={pad.left - 10}
                y={sy + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={10}
                fontFamily="Inter,sans-serif"
              >
                {yv}%
              </text>
            </g>
          );
        })}

        {/* Vertical grid lines */}
        {xLabels.map(({ i, label }) => {
          const sx = pad.left + i * xStep;
          return (
            <g key={i}>
              <line
                x1={sx}
                y1={pad.top}
                x2={sx}
                y2={pad.top + cH}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={sx}
                y={pad.top + cH + 18}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={10}
                fontFamily="Inter,sans-serif"
                transform={`rotate(-35, ${sx}, ${pad.top + cH + 18})`}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + cH}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <line
          x1={pad.left}
          y1={pad.top + cH}
          x2={pad.left + cW}
          y2={pad.top + cH}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Area fills */}
        <path d={epArea} fill={`url(#grad-ep-${animKey})`} />
        <path d={actualArea} fill={`url(#grad-act-${animKey})`} />

        {/* EP (Early Plan / Baseline EP) — Navy Blue */}
        {hasEP && (
          <path
            d={epPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}

        {/* LP (Late Plan / Revised BL-LP) — Orange dashed */}
        {hasLP && (
          <path
            d={lpPath}
            fill="none"
            stroke="#eab308"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="8 4"
          />
        )}

        {/* Actual placeholder (missing data) — dotted */}
        {hasActual &&
          actualDottedPaths.map((d, idx) => (
            <path
              key={`actual-dotted-${idx}`}
              d={d}
              fill="none"
              stroke="#166534"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="4 5"
              opacity={0.8}
            />
          ))}

        {/* Actual with real data — dark solid */}
        {hasActual && (
          <>
            {actualSolidPaths.length > 0 ? (
              actualSolidPaths.map((d, idx) => (
                <path
                  key={`actual-solid-${idx}`}
                  d={d}
                  fill="none"
                  stroke="#14532d"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
              ))
            ) : (
              <path
                d={actualPath}
                fill="none"
                stroke="#14532d"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            )}
          </>
        )}

        {/* Dot points */}
        {points.map((p, i) => {
          const svgEP = p.ep != null ? toSVG(i, p.ep) : null;
          const svgLP = p.lp != null ? toSVG(i, p.lp) : null;
          const svgA = p.actual != null ? toSVG(i, p.actual) : null;
          return (
            <g key={i}>
              {hasEP && svgEP && p.ep > 0 && (
                <circle cx={svgEP.x} cy={svgEP.y} r={2.5} fill="#2563eb" />
              )}
              {hasLP && svgLP && p.lp > 0 && (
                <circle cx={svgLP.x} cy={svgLP.y} r={2.5} fill="#eab308" />
              )}
              {hasActual && svgA && p.actual > 0 && (
                <circle cx={svgA.x} cy={svgA.y} r={2.5} fill="#14532d" />
              )}
            </g>
          );
        })}

        {/* Tooltip vertical line */}
        {tooltip && (
          <line
            x1={tooltip.x}
            y1={pad.top}
            x2={tooltip.x}
            y2={pad.top + cH}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Y-axis label */}
        <text
          x={16}
          y={pad.top + cH / 2}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={10}
          fontFamily="Inter,sans-serif"
          transform={`rotate(-90, 16, ${pad.top + cH / 2})`}
        >
          Progress %
        </text>

        {/* X-axis label */}
        <text
          x={pad.left + cW / 2}
          y={H - 6}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={10}
          fontFamily="Inter,sans-serif"
        >
          Timeline (Month)
        </text>
      </svg>

      {/* Tooltip card */}
      {tooltip &&
        points[tooltip.idx] &&
        (() => {
          const pt = points[tooltip.idx];
          const delta =
            pt.actual !== null && pt.ep !== null
              ? (pt.actual - pt.ep).toFixed(1)
              : null;
          const isEdge = tooltip.idx === 0 || tooltip.idx === n - 1;
          return (
            <div
              className="sca-tooltip"
              style={{
                left: tooltip.rightHalf ? tooltip.px - 180 : tooltip.px + 15,
                top: tooltip.py - 10,
              }}
            >
              <div className="sca-tooltip-month">{pt.month}</div>
              {pt.ep !== null && (
                <div className="sca-tooltip-row" style={{ color: "#2563eb" }}>
                  <span className="dot" style={{ background: "#2563eb" }} />
                  <span>EP (Early Plan)</span>
                  <strong>{pt.ep.toFixed(1)}%</strong>
                </div>
              )}
              {pt.lp !== null && (
                <div className="sca-tooltip-row" style={{ color: "#eab308" }}>
                  <span className="dot" style={{ background: "#eab308" }} />
                  <span>LP (Late Plan)</span>
                  <strong>{pt.lp.toFixed(1)}%</strong>
                </div>
              )}
              {pt.actual !== null && (
                <div
                  className="sca-tooltip-row actual"
                  style={{ color: "#14532d" }}
                >
                  <span className="dot" style={{ background: "#14532d" }} />
                  <span>Actual</span>
                  <strong>{pt.actual.toFixed(1)}%</strong>
                </div>
              )}
              {delta !== null && (
                <div className="sca-tooltip-delta">Δ vs EP: {delta}%</div>
              )}
              {pt.nodeActivities && pt.nodeActivities.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 10,
                    color: "#475569",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 3,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      color: "#64748b",
                    }}
                  >
                    Activities this month
                  </div>
                  {pt.nodeActivities.map((act, ai) => (
                    <div
                      key={ai}
                      style={{
                        marginBottom: 2,
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {act}
                    </div>
                  ))}
                  {pt.totalActivitiesInMonth > 8 && (
                    <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                      + {pt.totalActivitiesInMonth - 8} more…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

      {/* Legend */}
      <div className="sca-legend">
        {hasEP && (
          <div className="sca-legend-item" style={{ color: "#2563eb" }}>
            <span
              className="sca-legend-line"
              style={{ background: "#2563eb" }}
            />
            EP (Early Plan)
          </div>
        )}
        {hasLP && (
          <div className="sca-legend-item" style={{ color: "#eab308" }}>
            <span
              className="sca-legend-line"
              style={{
                background: "#eab308",
                backgroundImage:
                  "repeating-linear-gradient(90deg,#eab308 0,#eab308 8px,transparent 8px,transparent 12px)",
              }}
            />
            LP (Late Plan)
          </div>
        )}
        {hasActual && (
          <div className="sca-legend-item actual-legend">
            <span className="sca-legend-line" />
            Actual (solid = available, dotted = missing)
          </div>
        )}
        <button
          onClick={() => setShowDataTable(!showDataTable)}
          style={{
            marginLeft: 12,
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "#64748b",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {showDataTable ? "Hide Data Table" : "Show Data Table"}
        </button>
      </div>

      {/* Data Table */}
      {showDataTable && (
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <thead>
              <tr style={{ background: "#f8f9fa", position: "sticky", top: 0 }}>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#475569",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  Period
                </th>
                {hasEP && (
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#2563eb",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    EP %
                  </th>
                )}
                {hasLP && (
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#eab308",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    LP %
                  </th>
                )}
                {hasActual && (
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#16a34a",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    Actual %
                  </th>
                )}
                {hasEP && hasActual && (
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#64748b",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    Variance
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => {
                const variance =
                  p.actual !== null && p.ep !== null
                    ? (p.actual - p.ep).toFixed(1)
                    : null;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        padding: "6px 12px",
                        color: "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      {p.month}
                    </td>
                    {hasEP && (
                      <td
                        style={{
                          padding: "6px 12px",
                          textAlign: "right",
                          color: "#2563eb",
                        }}
                      >
                        {p.ep !== null ? p.ep.toFixed(1) : "—"}
                      </td>
                    )}
                    {hasLP && (
                      <td
                        style={{
                          padding: "6px 12px",
                          textAlign: "right",
                          color: "#eab308",
                        }}
                      >
                        {p.lp !== null ? p.lp.toFixed(1) : "—"}
                      </td>
                    )}
                    {hasActual && (
                      <td
                        style={{
                          padding: "6px 12px",
                          textAlign: "right",
                          color: "#14532d",
                          fontWeight: 600,
                        }}
                      >
                        {p.actual !== null ? p.actual.toFixed(1) : "—"}
                      </td>
                    )}
                    
                    {hasEP && hasActual && (
                      <td
                        style={{
                          padding: "6px 12px",
                          textAlign: "right",
                          fontWeight: 600,
                          color:
                            variance && parseFloat(variance) >= 0
                              ? "#16a34a"
                              : "#dc2626",
                        }}
                      >
                        {variance !== null
                          ? `${parseFloat(variance) >= 0 ? "+" : ""}${variance}%`
                          : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
//  Activity Drill-Down Popup — shows list of Activity ID + Name
// ─────────────────────────────────────────────────────────────────
const ActivityDrillDownPopup = ({ label, activities, onClose }) => {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? activities.filter(
        (a) =>
          String(a.id).toLowerCase().includes(search.toLowerCase()) ||
          String(a.name).toLowerCase().includes(search.toLowerCase()),
      )
    : activities;

  return (
    <div
      className="sca-drilldown-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sca-drilldown-modal">
        <div className="sca-drilldown-header">
          <div className="sca-drilldown-title">
            <Activity size={15} />
            <span>{label}</span>
            <span className="sca-drilldown-count-badge">
              {activities.length}{" "}
              {activities.length === 1 ? "activity" : "activities"}
            </span>
          </div>
          <button className="sca-breakdown-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        {activities.length > 6 && (
          <div className="sca-drilldown-search">
            <input
              type="text"
              placeholder="Search by ID or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sca-drilldown-search-input"
              autoFocus
            />
          </div>
        )}
        <div className="sca-drilldown-body">
          {filtered.length === 0 ? (
            <div className="sca-drilldown-empty">No matching activities</div>
          ) : (
            <table className="sca-drilldown-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Activity ID</th>
                  <th>Activity Name</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((act, i) => (
                  <tr key={i}>
                    <td className="sca-drilldown-num">{i + 1}</td>
                    <td className="sca-drilldown-id">{String(act.id)}</td>
                    <td className="sca-drilldown-name">{String(act.name)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Activity Breakdown Chart (bar chart on KPI click)
// ─────────────────────────────────────────────
const ActivityBreakdownChart = ({ type, curve, headers, rows, onClose }) => {
  const [drillDown, setDrillDown] = useState(null); // { label, activities: [{id, name}] }

  if (!rows || rows.length === 0) return null;

  let chartData = [];
  let chartTitle = "";

  const deviationIdx = findColIdx(headers, ["deviation", "delay", "variance"]);
  const stageIdx = findColIdx(headers, [
    "stage gate",
    "stagegate",
    "stage",
    "gate",
  ]);
  const actualDateIdx = findColIdx(headers, [
    "actual date",
    "actual start date",
    "actual start",
    "actual finish",
  ]);

  // Find Activity ID and Name columns for drill-down
  const actIdIdx = findColIdx(headers, [
    "activity id",
    "act id",
    "activity_id",
    "actid",
    "id",
  ]);
  const actNameIdx = findColIdx(headers, [
    "activity name",
    "act name",
    "activity description",
    "name",
    "description",
    "task name",
    "task",
  ]);

  const rowToActivity = (r) => ({
    id: actIdIdx >= 0 && r[actIdIdx] != null ? String(r[actIdIdx]) : "—",
    name:
      actNameIdx >= 0 && r[actNameIdx] != null ? String(r[actNameIdx]) : "—",
  });

  if (
    type === "total" ||
    type === "ontrack" ||
    type === "delayed" ||
    type === "notstarted"
  ) {
    // Determine delayed using the same logic as the KPI:
    // An activity is delayed if actual_date > lp_date (where both exist)
    // If no lp/actual date columns, fallback to deviation column
    const lpDateCol = findColIdx(headers, [
      "late planning",
      "planned end date (lp)",
      "lp date",
      "planned end date",
      "lp end",
      "lp finish",
    ]);
    const actDateCol = findColIdx(headers, [
      "actual date (a)",
      "actual date",
      "actual start date",
      "actual finish",
    ]);
    const useDateComparison = lpDateCol >= 0 && actDateCol >= 0;

    const groups = {};
    rows.forEach((r) => {
      const stage =
        stageIdx >= 0
          ? String(r[stageIdx] || "Other").trim()
          : "All Activities";
      if (!groups[stage])
        groups[stage] = {
          total: 0,
          onTrack: 0,
          delayed: 0,
          notStarted: 0,
          totalRows: [],
          onTrackRows: [],
          delayedRows: [],
          notStartedRows: [],
        };
      groups[stage].total++;
      groups[stage].totalRows.push(r);

      let isDelayed = false;
      let isAssessable = true;
      if (useDateComparison) {
        const lpDate = parseDate(r[lpDateCol]);
        const actDate = parseDate(r[actDateCol]);
        if (actDate && lpDate) {
          isDelayed = actDate > lpDate;
        } else {
          isAssessable = false; // missing dates — can't classify as on-track or delayed
        }
      } else {
        const dev = deviationIdx >= 0 ? parseFloat(r[deviationIdx]) || 0 : 0;
        isDelayed = dev > 0;
      }

      if (!isAssessable) {
        groups[stage].notStarted++;
        groups[stage].notStartedRows.push(r);
      } else if (isDelayed) {
        groups[stage].delayed++;
        groups[stage].delayedRows.push(r);
      } else {
        groups[stage].onTrack++;
        groups[stage].onTrackRows.push(r);
      }
    });
    const entries = Object.entries(groups)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
    if (type === "total") {
      chartTitle = "Total Activities by Stage Gate";
      chartData = entries.map(([label, v]) => ({
        label,
        value: v.total,
        drillRows: v.totalRows,
      }));
    } else if (type === "ontrack") {
      chartTitle = "On Track Activities by Stage Gate";
      chartData = entries.map(([label, v]) => ({
        label,
        value: v.onTrack,
        drillRows: v.onTrackRows,
      }));
    } else if (type === "delayed") {
      chartTitle = "Delayed Activities by Stage Gate";
      chartData = entries.map(([label, v]) => ({
        label,
        value: v.delayed,
        drillRows: v.delayedRows,
      }));
    } else if (type === "notstarted") {
      chartTitle = "Not Started Activities by Stage Gate";
      chartData = entries.map(([label, v]) => ({
        label,
        value: v.notStarted,
        drillRows: v.notStartedRows,
      }));
    }
  } else if (type === "actual") {
    if (actualDateIdx >= 0) {
      const monthGroups = {};
      rows.forEach((r) => {
        const d = parseDate(r[actualDateIdx]);
        if (d) {
          const mk = monthKey(d);
          if (!monthGroups[mk]) monthGroups[mk] = [];
          monthGroups[mk].push(r);
        }
      });
      const entries = Object.entries(monthGroups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);
      chartTitle = "Actual Records by Month";
      chartData = entries.map(([label, grpRows]) => ({
        label,
        value: grpRows.length,
        drillRows: grpRows,
      }));
    } else {
      chartTitle = "Actual vs Pending";
      chartData = [
        {
          label: "With Actual Date",
          value: curve?.withActual || 0,
          drillRows: [],
        },
        {
          label: "Pending Actual",
          value: Math.max(0, (curve?.total || 0) - (curve?.withActual || 0)),
          drillRows: [],
        },
      ];
    }
  }

  if (chartData.length === 0) return null;
  const maxVal = Math.max(...chartData.map((d) => d.value), 1);

  const handleBarClick = (item) => {
    if (!item.drillRows || item.drillRows.length === 0) return;
    setDrillDown({
      label: item.label,
      activities: item.drillRows.map(rowToActivity),
    });
  };

  return (
    <div className="sca-breakdown-chart">
      <div className="sca-breakdown-header">
        <span className="sca-breakdown-title">{chartTitle}</span>
        <button className="sca-breakdown-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <p className="sca-breakdown-hint">
        Click any bar or count to see the activity list
      </p>
      <div className="sca-breakdown-bars">
        {chartData.map(({ label, value, drillRows }, i) => {
          const clickable = drillRows && drillRows.length > 0;
          return (
            <div
              key={i}
              className={`sca-breakdown-row${clickable ? " sca-breakdown-row-clickable" : ""}`}
              onClick={() =>
                clickable && handleBarClick({ label, value, drillRows })
              }
              title={
                clickable
                  ? `Click to view ${value} ${value === 1 ? "activity" : "activities"}`
                  : undefined
              }
            >
              <div className="sca-breakdown-label" title={label}>
                {label}
              </div>
              <div className="sca-breakdown-track">
                <div
                  className="sca-breakdown-fill"
                  style={{
                    width:
                      value > 0
                        ? `${Math.max(4, (value / maxVal) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="sca-breakdown-count">{value}</div>
            </div>
          );
        })}
      </div>

      {drillDown && (
        <ActivityDrillDownPopup
          label={drillDown.label}
          activities={drillDown.activities}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
//  KPI Card
// ─────────────────────────────────────────────
const KPICard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
  onClick,
  active,
}) => (
  <div
    className={`sca-kpi sca-kpi-${color}${onClick ? " sca-kpi-clickable" : ""}${active ? " sca-kpi-active" : ""}`}
    onClick={onClick}
  >
    <div className="sca-kpi-icon">
      <Icon size={20} />
    </div>
    <div className="sca-kpi-body">
      <div className="sca-kpi-value">{value}</div>
      <div className="sca-kpi-label">{label}</div>
      {sub && <div className="sca-kpi-sub">{sub}</div>}
    </div>
    {trend !== undefined && (
      <div className={`sca-kpi-trend ${trend >= 0 ? "up" : "down"}`}>
        {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────
//  Mini bar chart for stage gate breakdown
// ─────────────────────────────────────────────
const StageGateBar = ({ headers, rows }) => {
  const stageIdx = findColIdx(headers, [
    "stage gate",
    "stagegate",
    "stage",
    "gate",
  ]);
  if (stageIdx < 0) return null;

  const counts = {};
  rows.forEach((r) => {
    const s = String(r[stageIdx] || "Other").trim();
    counts[s] = (counts[s] || 0) + 1;
  });

  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = Math.max(...entries.map((e) => e[1]), 1);

  const colors = [
    "#1e293b",
    "#334155",
    "#475569",
    "#64748b",
    "#2563eb",
    "#3b82f6",
    "#16a34a",
    "#eab308",
  ];

  return (
    <div className="sca-stage-gate">
      <div className="sca-panel-title">
        <Layers size={15} />
        Stage Gate Breakdown
      </div>
      <div className="sca-bars">
        {entries.map(([stage, count], i) => (
          <div className="sca-bar-row" key={stage}>
            <div className="sca-bar-label" title={stage}>
              {stage}
            </div>
            <div className="sca-bar-track">
              <div
                className="sca-bar-fill"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
            <div className="sca-bar-count">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Deviation donut
// ─────────────────────────────────────────────
const DeviationDonut = ({ curve }) => {
  if (!curve) return null;
  const { total, delayed, onTime, notStarted = 0 } = curve;
  const assessed = onTime + delayed;
  const pct = assessed > 0 ? Math.round((onTime / assessed) * 100) : 0;
  const r = 42,
    cx = 54,
    cy = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="sca-donut">
      <div className="sca-panel-title">
        <Target size={15} />
        On-Time Rate
      </div>
      <div className="sca-donut-body">
        <svg viewBox="0 0 108 108" width="108" height="108">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={10}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={pct >= 70 ? "#16a34a" : pct >= 40 ? "#eab308" : "#dc2626"}
            strokeWidth={10}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="#1e293b"
            fontSize={18}
            fontWeight={700}
            fontFamily="Inter,sans-serif"
          >
            {pct}%
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={9}
            fontFamily="Inter,sans-serif"
          >
            On Time
          </text>
        </svg>
        <div className="sca-donut-stats">
          <div className="sca-donut-stat green">
            <CheckCircle size={13} />
            <span>{onTime} On Time</span>
          </div>
          <div className="sca-donut-stat red">
            <AlertTriangle size={13} />
            <span>{delayed} Delayed</span>
          </div>
          <div className="sca-donut-stat orange">
            <Hourglass size={13} />
            <span>{notStarted} Not Started</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Main SCurveAnalytics Modal
// ─────────────────────────────────────────────
const SCurveAnalytics = ({
  jobId,
  filename,
  onClose,
  inline = false,
  preloadedSheets = null,
  baselineOnly = true,
  compareAllKnowledgebaseFiles = false,
}) => {
  // ── Aggregate all plottable sheets into one combined "Overall Project" curve ──
  const aggregateToSingleCurve = useCallback((sheets) => {
    const plottable = sheets.filter((s) => {
      if (!s || !Array.isArray(s.headers) || !Array.isArray(s.rows)) return false;
      const c = computeSCurve(s.headers, s.rows);
      return c && (c.epExists || c.lpExists || c.actualExists);
    });
    if (plottable.length === 0) return sheets;
    if (plottable.length === 1) return plottable;

    // Helper: convert a month label like "Jan 2024" or "2024-01" to a YYYY-MM string for alignment
    const toAlignKey = (label) => {
      if (!label) return null;
      const str = String(label).trim();
      if (/^\d{4}-\d{2}$/.test(str)) return str;
      const d = new Date(str);
      if (!isNaN(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2050) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return null;
    };

    // Weighted aggregation: each sheet contributes proportionally by its activity count
    // monthMap[key] = { label, epSum, lpSum, actualSum, totalWeight, epWeight, lpWeight, actualWeight, sortTs }
    const monthMap = {};
    let totalActivities = 0;

    plottable.forEach((s) => {
      const c = computeSCurve(s.headers, s.rows);
      if (!c || !c.points) return;
      // activityCount is only set by Type-2 (date-based) sheets via buildCurveFromDates.
      // Type-1 timeseries sheets have no meaningful activity count — exclude from total.
      // chartWeight is used separately for proportional blending of the combined curve.
      const actCount = c.activityCount ?? 0;
      const chartWeight = actCount > 0 ? actCount : 1; // fallback=1 so Type-1 sheets still blend
      totalActivities += actCount;

      c.points.forEach((p) => {
        const key = toAlignKey(p.month);
        if (!key) return;
        if (!monthMap[key]) {
          const [yr, mo] = key.split('-').map(Number);
          monthMap[key] = {
            label: p.month || key,
            epSum: 0, epWeight: 0,
            lpSum: 0, lpWeight: 0,
            actualSum: 0, actualWeight: 0,
            sortTs: new Date(yr, mo - 1, 1).getTime(),
          };
        }
        if (p.ep !== null && p.ep !== undefined) {
          monthMap[key].epSum += p.ep * chartWeight;
          monthMap[key].epWeight += chartWeight;
        }
        if (p.lp !== null && p.lp !== undefined) {
          monthMap[key].lpSum += p.lp * chartWeight;
          monthMap[key].lpWeight += chartWeight;
        }
        if (p.actual !== null && p.actual !== undefined) {
          monthMap[key].actualSum += p.actual * chartWeight;
          monthMap[key].actualWeight += chartWeight;
        }
      });
    });

    const sortedKeys = Object.keys(monthMap).sort((a, b) => monthMap[a].sortTs - monthMap[b].sortTs);

    const combinedRows = sortedKeys.map((key) => {
      const m = monthMap[key];
      const ep = m.epWeight > 0 ? m.epSum / m.epWeight : null;
      const lp = m.lpWeight > 0 ? m.lpSum / m.lpWeight : null;
      const actual = m.actualWeight > 0 ? m.actualSum / m.actualWeight : null;
      return [m.label, ep, lp, actual];
    });

    if (combinedRows.length < 2) return plottable;

    // Pre-compute aggregated KPI totals from all disciplines
    let kpiOnTime = 0, kpiDelayed = 0, kpiNotStarted = 0, kpiWithActual = 0;
    plottable.forEach((s) => {
      const c = computeSCurve(s.headers, s.rows);
      if (!c) return;
      kpiOnTime += c.onTime || 0;
      kpiDelayed += c.delayed || 0;
      kpiNotStarted += c.notStarted || 0;
      kpiWithActual += c.withActual || 0;
    });

    const combinedSheet = {
      sheet_name: 'Overall Project',
      description: `Aggregated from ${plottable.length} discipline curves`,
      headers: ['Date', 'Baseline EP', 'Revised BL-LP', 'Cumm. Actual'],
      rows: combinedRows,
      row_count: combinedRows.length,
      total_activities: totalActivities,
      discipline_count: plottable.length,
      // Pre-computed KPI totals across all disciplines
      kpi: { total: totalActivities, onTime: kpiOnTime, delayed: kpiDelayed, notStarted: kpiNotStarted, withActual: kpiWithActual, avgDev: 0 },
    };

    // Return ONLY the Overall Project sheet — disciplines are visible via KPI drill-downs
    return [combinedSheet];
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetsData, setSheetsData] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState({
    ep: true,
    lp: true,
    actual: true,
  });
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState(
    filename || "Project Report",
  );
  const overlayRef = useRef(null);
  const chartPanelRef = useRef(null);

  const displaySourceLabel = dataSourceLabel || filename || "Project Report";

  const filterPlottableSheets = useCallback((allSheets) => {
    const source = Array.isArray(allSheets) ? allSheets : [];
    const filtered = source.filter((s) => {
      if (!s || !Array.isArray(s.headers) || !Array.isArray(s.rows))
        return false;
      const name = (s.sheet_name || "").toLowerCase();
      // Exclude summary tracker tables (no time-series chart data)
      if (
        name.includes("summary") &&
        !name.includes("weekly") &&
        !name.includes("monthly") &&
        !name.includes("s-curve data")
      )
        return false;
      // Exclude weekly eddr count, eddr cntr, and revised bl overall progress (cumulative-only, no S-curve)
      if (name.includes("weekly eddr") || name.includes("weekly_eddr"))
        return false;
      if (name.includes("revised bl") || name.includes("revised_bl"))
        return false;
      if (name.includes("eddr cntr") || name.includes("eddr_cntr"))
        return false;
      // Exclude sheets that have no EP or LP data (not plottable as S-curve)
      const curve = computeSCurve(s.headers, s.rows);
      if (!curve || (!curve.epExists && !curve.lpExists)) return false;
      return true;
    });

    return filtered.length > 0 ? filtered : source;
  }, []);

  const findFirstPlottableIndex = useCallback((allSheets) => {
    const source = Array.isArray(allSheets) ? allSheets : [];
    if (source.length === 0) return 0;
    const idx = source.findIndex((s) => {
      if (!s || !Array.isArray(s.headers) || !Array.isArray(s.rows))
        return false;
      const curve = computeSCurve(s.headers, s.rows);
      return Boolean(curve && (curve.epExists || curve.lpExists));
    });
    return idx >= 0 ? idx : 0;
  }, []);

  // Fetch all sheets analytics data
  useEffect(() => {
    if (Array.isArray(preloadedSheets) && preloadedSheets.length > 0) {
      setSheetsData(aggregateToSingleCurve(preloadedSheets));
      setCurrentIdx(0);
      setLoading(false);
      setError(null);
      return;
    }

    if (baselineOnly) {
      let cancelled = false;
      const loadBaseline = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await activityService.getDashboardBaseAnalytics({
            includeAllKnowledgebaseFiles: compareAllKnowledgebaseFiles,
          });
          if (!cancelled) {
            const allSheets = Array.isArray(data?.sheets) ? data.sheets : [];
            const aggregated = aggregateToSingleCurve(filterPlottableSheets(allSheets));
            setSheetsData(aggregated);
            setCurrentIdx(0);
            setDataSourceLabel(
              compareAllKnowledgebaseFiles
                ? "Knowledgebase Files"
                : data?.base_file?.filename || "Base File",
            );
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err?.response?.data?.error ||
                "Failed to load base S-curve analytics",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      loadBaseline();
      return () => {
        cancelled = true;
      };
    }

    if (!jobId) {
      setSheetsData([]);
      setCurrentIdx(0);
      setLoading(false);
      setError("No analytics source available");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fileService.analytics(jobId);
        if (!cancelled) {
          setDataSourceLabel(filename || "Project Report");
          const allSheets = Array.isArray(data?.sheets) ? data.sheets : [];
          const aggregated = aggregateToSingleCurve(filterPlottableSheets(allSheets));
          setSheetsData(aggregated);
          setCurrentIdx(0);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err?.response?.data?.error || "Failed to load analytics data",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    baselineOnly,
    compareAllKnowledgebaseFiles,
    filename,
    filterPlottableSheets,
    findFirstPlottableIndex,
    jobId,
    preloadedSheets,
  ]);

  const goNext = useCallback(() => {
    setCurrentIdx((i) => {
      const next = (i + 1) % sheetsData.length;
      setAnimKey((k) => k + 1);
      return next;
    });
    setSelectedKPI(null);
  }, [sheetsData.length]);

  const goPrev = useCallback(() => {
    setCurrentIdx((i) => {
      const prev = (i - 1 + sheetsData.length) % sheetsData.length;
      setAnimKey((k) => k + 1);
      return prev;
    });
    setSelectedKPI(null);
  }, [sheetsData.length]);

  const goTo = (idx) => {
    setCurrentIdx(idx);
    setAnimKey((k) => k + 1);
    setSelectedKPI(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  const currentSheet = sheetsData[currentIdx];

  const curve = useMemo(
    () =>
      currentSheet
        ? computeSCurve(currentSheet.headers, currentSheet.rows)
        : null,
    [currentSheet],
  );

  // For the Overall Project sheet, use pre-computed KPI totals from all disciplines
  const aggregatedKPIs = useMemo(() => {
    return currentSheet?.kpi ?? null;
  }, [currentSheet]);

  const wrapperClass = inline
    ? "sca-inline"
    : `sca-overlay${isFullscreen ? " sca-fullscreen" : ""}`;

  const shareableCharts = useMemo(
    () =>
      sheetsData
        .map((sheet) => ({
          sheetName: sheet.sheet_name,
          points: computeSCurve(sheet.headers, sheet.rows)?.points || null,
        }))
        .filter((item) => item.points && item.points.length > 1),
    [sheetsData],
  );

  useEffect(() => {
    if (!shareMenuOpen) return undefined;
    const onDocClick = (event) => {
      if (!event.target.closest(".sca-share-wrap")) {
        setShareMenuOpen(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [shareMenuOpen]);

  const makeImageFile = (blob, baseName) =>
    new File([blob], `${safeFileName(baseName)}.png`, { type: "image/png" });

  const buildSingleChartFile = useCallback(async () => {
    const baseName = `s-curve-${currentSheet?.sheet_name || "chart"}`;
    const liveSvg = chartPanelRef.current?.querySelector(".sca-svg");
    if (liveSvg) {
      const blob = await svgElementToPngBlob(liveSvg);
      return makeImageFile(blob, baseName);
    }

    if (!curve?.points || curve.points.length < 2) {
      throw new Error("Current sheet does not have shareable chart data");
    }

    const svgMarkup = makeChartSvgMarkup(
      curve.points,
      currentSheet?.sheet_name,
      visibleSeries,
    );
    const blob = await svgMarkupToPngBlob(svgMarkup, CHART_W, CHART_H);
    return makeImageFile(blob, baseName);
  }, [currentSheet?.sheet_name, curve?.points, visibleSeries]);

  const buildAllChartsFile = useCallback(async () => {
    if (shareableCharts.length === 0) {
      throw new Error("No chart available to share");
    }
    const blob = await createCombinedChartsBlob(shareableCharts, visibleSeries);
    return makeImageFile(blob, `s-curve-all-${displaySourceLabel || "report"}`);
  }, [displaySourceLabel, shareableCharts, visibleSeries]);

  const openOutlookComposer = (subject, htmlBody) => {
    const composeUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(htmlBody)}`;
    window.open(composeUrl, "_blank", "noopener,noreferrer");
  };

  const handleThetaShare = async (scope) => {
    setShareMenuOpen(null);
    setSharing(true);
    try {
      const file =
        scope === "single"
          ? await buildSingleChartFile()
          : await buildAllChartsFile();
      const uploaded = await engageService.uploadImage(file);
      const imageUrl = uploaded.image_url || "";
      const isSingle = scope === "single";
      const content = isSingle
        ? `S-Curve shared from ${displaySourceLabel} · Sheet: ${currentSheet?.sheet_name || "Current"}\nGenerated on ${new Date().toLocaleString()}`
        : `S-Curve bundle shared from ${displaySourceLabel}\nCharts included: ${shareableCharts.length}\nGenerated on ${new Date().toLocaleString()}`;

      await engageService.createPost(content, "manual", imageUrl, "");
      toast.success("Shared to Theta Engage");
    } catch (err) {
      toast.error(err?.message || "Could not share to Theta Engage");
    } finally {
      setSharing(false);
    }
  };

  const handleOutlookShare = async (scope) => {
    setShareMenuOpen(null);
    setSharing(true);
    try {
      const file =
        scope === "single"
          ? await buildSingleChartFile()
          : await buildAllChartsFile();

      const isSingle = scope === "single";
      const subject = isSingle
        ? `S-Curve Update - ${currentSheet?.sheet_name || "Current Sheet"}`
        : `S-Curve Bundle - ${displaySourceLabel}`;

      // Step 1 — copy the PNG image to the user's clipboard
      let clipboardOk = false;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": file }),
        ]);
        clipboardOk = true;
      } catch (clipErr) {
        console.warn(
          "Clipboard write failed – falling back to download",
          clipErr,
        );
        // Fallback: trigger a download so the user can attach the image manually
        const dlUrl = URL.createObjectURL(file);
        const dlLink = document.createElement("a");
        dlLink.href = dlUrl;
        dlLink.download = file.name;
        document.body.appendChild(dlLink);
        dlLink.click();
        dlLink.remove();
        URL.revokeObjectURL(dlUrl);
      }

      // Step 2 — open mailto: so Outlook / default mail client opens with subject + body
      const pasteNote = clipboardOk
        ? "[Chart image has been copied to your clipboard — paste it here with Ctrl+V]"
        : "[Chart image has been downloaded — please attach it to this email]";

      const bodyText = [
        "Hello,",
        "",
        isSingle
          ? `Please find the latest S-Curve chart for sheet: ${currentSheet?.sheet_name || "Current Sheet"}.`
          : `Please find the latest S-Curve analytics bundle for ${displaySourceLabel} (${shareableCharts.length} charts).`,
        "",
        pasteNote,
        "",
        `Generated at: ${new Date().toLocaleString()}`,
      ].join("\r\n");

      const mailtoLink = document.createElement("a");
      mailtoLink.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      mailtoLink.remove();

      if (clipboardOk) {
        toast.success(
          "📋 Chart copied to clipboard — Outlook is opening. Paste the image with Ctrl+V into the email body.",
        );
      } else {
        toast.success(
          "📥 Chart downloaded — Outlook is opening. Attach the file to the email.",
        );
      }
    } catch (err) {
      toast.error(err?.message || "Could not open Outlook share");
    } finally {
      setSharing(false);
    }
  };

  // ── Loader ──────────────────────────────────
  if (loading) {
    return (
      <div className={inline ? "sca-inline" : "sca-overlay"} ref={overlayRef}>
        <div className="sca-container sca-loading-state">
          <div className="sca-loader-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="rgba(100,116,139,0.15)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#475569"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="60 141"
                className="sca-spin-arc"
              />
            </svg>
          </div>
          <div className="sca-loader-text">
            <span>Building S-Curve Analytics</span>
            <span className="sca-loader-sub">
              Analysing {displaySourceLabel || "report"}…
            </span>
          </div>
          <div className="sca-loader-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────
  if (error) {
    return (
      <div className={inline ? "sca-inline" : "sca-overlay"}>
        <div className="sca-container sca-error-state">
          <AlertTriangle size={48} color="#ef4444" />
          <h3>Failed to load analytics</h3>
          <p>{error}</p>
          <button className="sca-btn sca-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (sheetsData.length === 0) {
    return (
      <div className={inline ? "sca-inline" : "sca-overlay"}>
        <div className="sca-container sca-error-state">
          <BarChart2 size={48} color="#6b7280" />
          <h3>No data available</h3>
          <p>No successfully processed sheets were found for this job.</p>
          <button className="sca-btn sca-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} ref={overlayRef}>
      <div className="sca-container">
        {/* ── TOP HEADER ─────────────────────────── */}
        <header className="sca-header">
          <div className="sca-header-left">
            <div className="sca-header-icon">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="sca-header-title">S-Curve Analytics</h2>
              <p className="sca-header-sub">
                {displaySourceLabel} &nbsp;·&nbsp;
                <span className="sca-sheet-badge">
                  Sheet {currentIdx + 1} of {sheetsData.length}
                </span>
              </p>
            </div>
          </div>
          <div className="sca-header-right">
            <button
              className="sca-icon-btn"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              className="sca-icon-btn"
              title="Refresh"
              onClick={() => setAnimKey((k) => k + 1)}
            >
              <RefreshCw size={16} />
            </button>
            {!inline && (
              <button className="sca-close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* ── SHEET TABS ──────────────────────────── */}
        {sheetsData.length > 1 && (
          <div className="sca-tabs-bar">
            {sheetsData.map((s, i) => (
              <button
                key={i}
                className={`sca-tab ${i === currentIdx ? "active" : ""}`}
                onClick={() => goTo(i)}
              >
                <Layers size={13} />
                {s.sheet_name}
              </button>
            ))}
          </div>
        )}

        {/* ── SHEET CONTENT ───────────────────────── */}
        <div className="sca-body">
          {/* Sheet name banner */}
          <div className="sca-sheet-banner">
            <div className="sca-sheet-info">
              <Calendar size={16} />
              <strong>{currentSheet?.sheet_name}</strong>
              {currentSheet?.description && (
                <span className="sca-sheet-desc">
                  {" "}
                  — {currentSheet.description}
                </span>
              )}
            </div>
            <div className="sca-sheet-meta">
              <Zap size={13} />
              {currentSheet?.total_activities ?? curve?.activityCount ?? currentSheet?.row_count} activities
            </div>
          </div>

          {/* ── KPI Row ─────────────────────────────── */}
          <div className="sca-kpi-row">
            <KPICard
              label="Total Activities"
              value={aggregatedKPIs ? aggregatedKPIs.total : (curve ? (curve.activityCount ?? curve.total) : (currentSheet?.row_count ?? "—"))}
              sub="click to view breakdown"
              icon={Activity}
              color="blue"
              onClick={() =>
                setSelectedKPI(selectedKPI === "total" ? null : "total")
              }
              active={selectedKPI === "total"}
            />
            <KPICard
              label="On Track"
              value={aggregatedKPIs ? aggregatedKPIs.onTime : (curve ? curve.onTime : "—")}
              sub={(() => {
                const kpi = aggregatedKPIs || curve;
                return kpi ? `${kpi.total > 0 ? Math.round((kpi.onTime / kpi.total) * 100) : 0}% — click for chart` : "";
              })()}
              icon={CheckCircle}
              color="green"
              onClick={() =>
                setSelectedKPI(selectedKPI === "ontrack" ? null : "ontrack")
              }
              active={selectedKPI === "ontrack"}
            />
            <KPICard
              label="Delayed"
              value={aggregatedKPIs ? aggregatedKPIs.delayed : (curve ? curve.delayed : "—")}
              sub={(() => {
                const kpi = aggregatedKPIs || curve;
                return kpi ? `avg ${kpi.avgDev > 0 ? "+" : ""}${kpi.avgDev} days — click for chart` : "";
              })()}
              icon={AlertTriangle}
              color={(aggregatedKPIs || curve) && (aggregatedKPIs || curve).delayed > 0 ? "red" : "green"}
              onClick={() =>
                setSelectedKPI(selectedKPI === "delayed" ? null : "delayed")
              }
              active={selectedKPI === "delayed"}
            />
            <KPICard
              label="Not Started"
              value={aggregatedKPIs ? aggregatedKPIs.notStarted : (curve ? curve.notStarted : "—")}
              sub={(() => {
                const kpi = aggregatedKPIs || curve;
                return kpi ? `${kpi.total > 0 ? Math.round((kpi.notStarted / kpi.total) * 100) : 0}% pending — click for chart` : "";
              })()}
              icon={Hourglass}
              color="orange"
              onClick={() =>
                setSelectedKPI(
                  selectedKPI === "notstarted" ? null : "notstarted",
                )
              }
              active={selectedKPI === "notstarted"}
            />
            <KPICard
              label="Actual Recorded"
              value={aggregatedKPIs ? aggregatedKPIs.withActual : (curve ? curve.withActual : "—")}
              sub="click to view breakdown"
              icon={Clock}
              color="purple"
              onClick={() =>
                setSelectedKPI(selectedKPI === "actual" ? null : "actual")
              }
              active={selectedKPI === "actual"}
            />
          </div>

          {/* ── KPI Breakdown Chart ────────────────────────────────── */}
          {selectedKPI && currentSheet && (
            <ActivityBreakdownChart
              type={selectedKPI}
              curve={curve}
              headers={currentSheet.headers}
              rows={currentSheet.rows}
              onClose={() => setSelectedKPI(null)}
            />
          )}

          {/* ── Main Chart ──────────────────────────── */}
          <div className="sca-chart-panel" ref={chartPanelRef}>
            <div className="sca-chart-header">
              <div className="sca-chart-title">
                <BarChart2 size={17} />
                S-Curve — EP · LP · Actual (%)
              </div>
              <div className="sca-chart-controls">
                <div className="sca-share-wrap">
                  <button
                    className="sca-share-btn"
                    disabled={
                      sharing || !curve?.points || curve.points.length < 2
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareMenuOpen((prev) =>
                        prev === "single" ? null : "single",
                      );
                    }}
                    title="Share current chart"
                  >
                    <Share2 size={14} />
                    Share Chart
                  </button>
                  {shareMenuOpen === "single" && (
                    <div
                      className="sca-share-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="sca-share-menu-item"
                        onClick={() => handleThetaShare("single")}
                      >
                        <Users size={14} /> Theta Engage
                      </button>
                      <button
                        className="sca-share-menu-item"
                        onClick={() => handleOutlookShare("single")}
                      >
                        <Mail size={14} /> Outlook
                      </button>
                    </div>
                  )}
                </div>

                <div className="sca-share-wrap">
                  <button
                    className="sca-share-btn"
                    disabled={sharing || shareableCharts.length === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareMenuOpen((prev) =>
                        prev === "all" ? null : "all",
                      );
                    }}
                    title="Share all charts"
                  >
                    <Share2 size={14} />
                    Share All Charts
                  </button>
                  {shareMenuOpen === "all" && (
                    <div
                      className="sca-share-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="sca-share-menu-item"
                        onClick={() => handleThetaShare("all")}
                      >
                        <Users size={14} /> Theta Engage
                      </button>
                      <button
                        className="sca-share-menu-item"
                        onClick={() => handleOutlookShare("all")}
                      >
                        <Mail size={14} /> Outlook
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Series Toggles ── */}
                <div
                  style={{ display: "flex", gap: "6px", marginRight: "16px" }}
                >
                  <button
                    className={`sca-icon-btn ${visibleSeries.ep ? "active-toggle" : ""}`}
                    onClick={() =>
                      setVisibleSeries((prev) => ({ ...prev, ep: !prev.ep }))
                    }
                    title="Toggle Early Plan (EP)"
                    style={{
                      background: visibleSeries.ep ? "#2563eb" : "transparent",
                      color: visibleSeries.ep ? "#fff" : "#2563eb",
                      padding: "2px 8px",
                      fontSize: "11px",
                      width: "auto",
                      fontWeight: 600,
                      border: "1px solid #2563eb",
                    }}
                  >
                    EP
                  </button>
                  <button
                    className={`sca-icon-btn ${visibleSeries.lp ? "active-toggle" : ""}`}
                    onClick={() =>
                      setVisibleSeries((prev) => ({ ...prev, lp: !prev.lp }))
                    }
                    title="Toggle Late Plan (LP)"
                    style={{
                      background: visibleSeries.lp ? "#eab308" : "transparent",
                      color: visibleSeries.lp ? "#fff" : "#eab308",
                      padding: "2px 8px",
                      fontSize: "11px",
                      width: "auto",
                      fontWeight: 600,
                      border: "1px solid #eab308",
                    }}
                  >
                    LP
                  </button>
                  <button
                    className={`sca-icon-btn ${visibleSeries.actual ? "active-toggle" : ""}`}
                    onClick={() =>
                      setVisibleSeries((prev) => ({
                        ...prev,
                        actual: !prev.actual,
                      }))
                    }
                    title="Toggle Actual"
                    style={{
                      background: visibleSeries.actual
                        ? "#16a34a"
                        : "transparent",
                      color: visibleSeries.actual ? "#fff" : "#16a34a",
                      padding: "2px 8px",
                      fontSize: "11px",
                      width: "auto",
                      fontWeight: 600,
                      border: "1px solid #16a34a",
                    }}
                  >
                    Actual
                  </button>
                </div>

                {sheetsData.length > 1 && (
                  <>
                    <button
                      className="sca-nav-btn"
                      onClick={goPrev}
                      disabled={sheetsData.length <= 1}
                      title="Previous sheet"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="sca-dot-nav">
                      {sheetsData.map((_, i) => (
                        <button
                          key={i}
                          className={`sca-dot ${i === currentIdx ? "active" : ""}`}
                          onClick={() => goTo(i)}
                          title={sheetsData[i].sheet_name}
                        />
                      ))}
                    </div>
                    <button
                      className="sca-nav-btn"
                      onClick={goNext}
                      disabled={sheetsData.length <= 1}
                      title="Next sheet"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            {curve && curve.points ? (
              <SCurveChart
                points={curve.points}
                sheetName={currentSheet?.sheet_name}
                animKey={animKey}
                visibleSeries={visibleSeries}
              />
            ) : (
              <div className="sca-no-data">
                <Activity size={40} />
                <p>S-Curve not available for this sheet</p>
                <span>
                  S-curves require time-series percentage data (e.g. Monthly
                  S-Curve Data tab) or activity sheets with EP / LP / Actual
                  date columns. Sheets with only snapshot progress (BL Progress,
                  EDDR counts) are shown as tracker tables.
                </span>
              </div>
            )}
          </div>


        </div>

        {/* ── FOOTER ──────────────────────────────── */}
        <footer className="sca-footer">
          <div className="sca-footer-info">
            <Circle size={8} fill="#64748b" color="#64748b" />
            <span>Theta Pulse Analytics Engine</span>
            <span className="sca-footer-dot">·</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
          {sheetsData.length > 1 && (
            <div className="sca-footer-nav">
              <button className="sca-btn sca-btn-ghost" onClick={goPrev}>
                <ChevronLeft size={14} /> Prev Sheet
              </button>
              <span className="sca-page-indicator">
                {currentIdx + 1} / {sheetsData.length}
              </span>
              <button className="sca-btn sca-btn-ghost" onClick={goNext}>
                Next Sheet <ChevronRight size={14} />
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default SCurveAnalytics;