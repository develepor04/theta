import React, { useId, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import useStore from "../store/useStore";
import api from "../services/api";
import "./History.css";
import staticTrend from "../data/three_month_trend_dashboard_apr2026.json";
import borougeWhatifCriticalExtracted from "../data/borougeWhatifCriticalExtracted.json";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
  Cell,
} from "recharts";
const FALLBACK_MONTHS = [];
const FALLBACK_DATA = {};

// ── Colours shared across phase charts ──────────────────────────────────────
const ORANGE = "#BA7517";
const GREY   = "#B4B2A9";
const GREEN  = "#16a34a";
const RED    = "#dc2626";
const AMBER  = "#f59e0b";

const _BLUE_STYLE = {
  color:    "#185FA5",
  bg:       "#E6F1FB",
  gradient: "linear-gradient(135deg,#5C83C6 0%,#82B8E8 55%,#AFDBF5 100%)",
  accent:   "#505355",
};
const getMonthStyle = () => _BLUE_STYLE;

const DISCIPLINES = [
  { key: "homeOffice", label: "Home Office", color: "#2563EB" },
  { key: "manufacturing", label: "Manufacturing", color: "#3B82F6" },
  { key: "construction", label: "Construction", color: "#60A5FA" },
  { key: "projectMgmt", label: "Project Management", color: "#1D4ED8" },
  { key: "commissioning", label: "Commissioning", color: "#93C5FD" },
];

function pct(val, total) {
  const n = Number(val);
  const t = Number(total);
  if (!t || isNaN(n)) return '0.0';
  return ((n / t) * 100).toFixed(1);
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function formatPercentNumber(val, digits = 1) {
  const n = Number(val);
  if (isNaN(n)) return '0.0%';
  return `${n.toFixed(digits)}%`;
}

function getTrend(prev, curr) {
  if (prev == null) return null;
  const diff = curr - prev;
  const direction = diff === 0 ? "flat" : diff > 0 ? "up" : "down";
  return { diff, direction };
}

function getTrendTone(direction, positiveWhenUp = true) {
  if (direction === "flat") return "neutral";
  if (positiveWhenUp) return direction === "up" ? "positive" : "negative";
  return direction === "up" ? "negative" : "positive";
}

function getHealthBand(score) {
  if (score >= 85) return { label: "Healthy", tone: "positive" };
  if (score >= 65) return { label: "Watchlist", tone: "warning" };
  return { label: "Critical", tone: "negative" };
}

function getRiskLevel(score) {
  if (score >= 70) return { label: "High", tone: "high" };
  if (score >= 40) return { label: "Medium", tone: "medium" };
  return { label: "Low", tone: "low" };
}

function getRiskRows(d) {
  const constructionJump = Math.max(
    0,
    (d.futurePlanned?.construction?.may ?? d.futurePlanned?.construction?.jun ?? 0) -
      (d.scurves?.construction?.actual ?? 0)
  );
  const homeOfficeJump = Math.max(
    0,
    (d.futurePlanned?.homeOffice?.jun ?? d.futurePlanned?.homeOffice?.may ?? 0) -
      (d.scurves?.homeOffice?.actual ?? 0)
  );
  const projectMgmtJump = Math.max(
    0,
    (d.futurePlanned?.projectMgmt?.jun ?? d.futurePlanned?.projectMgmt?.may ?? 0) -
      (d.scurves?.projectMgmt?.actual ?? 0)
  );
  const durationGapPct = (d.durationMissing / d.totalActivities) * 100;

  return [
    {
      name: "Construction Risk",
      score: clamp(constructionJump * 1.4 + durationGapPct * 0.8, 0, 100),
      detail: `${constructionJump.toFixed(1)}% forward-loaded ramp vs current actual`,
    },
    {
      name: "Manufacturing Risk",
      score: clamp((5 - (d.scurves.manufacturing?.actual ?? 0)) * 14 + durationGapPct * 0.55, 0, 100),
      detail: `${formatPercentNumber(d.scurves.manufacturing?.actual ?? 0, 2)} actual completion`,
    },
    {
      name: "Project Management Risk",
      score: clamp(projectMgmtJump * 1.5 + durationGapPct * 0.45, 0, 100),
      detail: `${projectMgmtJump.toFixed(1)}% planned ramp remaining`,
    },
    {
      name: "Home Office Risk",
      score: clamp(Math.max(0, 30 - (d.scurves.homeOffice?.actual ?? 0)) * 1.35 + homeOfficeJump * 0.45, 0, 100),
      detail: `${formatPercentNumber(d.scurves.homeOffice?.actual ?? 0, 2)} actual progress to date`,
    },
    {
      name: "Commissioning Risk",
      score: clamp((d.scurves.commissioning?.actual ?? 0) === 0 ? 52 + durationGapPct * 0.35 : durationGapPct * 0.35, 0, 100),
      detail: "Phase not yet active in current reporting window",
    },
  ].map((row) => ({ ...row, level: getRiskLevel(row.score) }));
}

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

function MonthTab({ month, active, onClick }) {
  return (
    <button
      type="button"
      className={`month-chip ${active ? "active" : ""}`}
      style={{
        "--month-color": getMonthStyle(month).color,
        "--month-gradient": getMonthStyle(month).gradient,
        "--month-bg": getMonthStyle(month).bg,
      }}
      onClick={() => onClick(month)}
    >
      {month}
    </button>
  );
}

function TrendPill({ prev, curr, formatter = (value) => value, positiveWhenUp = true, suffix }) {
  const trend = getTrend(prev, curr);
  if (!trend) {
    return <span className="trend-pill tone-neutral">Baseline</span>;
  }

  const tone = getTrendTone(trend.direction, positiveWhenUp);
  const absValue = formatter(Math.abs(trend.diff));

  return (
    <span className={`trend-pill tone-${tone}`}>
      {trend.direction === "flat" ? "No change" : trend.direction === "up" ? "Up" : "Down"} {absValue}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function KpiCard({ icon, label, value, accent, gradient, glow }) {
  return (
    <article
      className="kpi-card glass-card"
      style={{
        "--accent": accent,
        "--accent-gradient": gradient,
        "--glow": glow ?? `${accent}25`,
      }}
    >
      <div className="kpi-card-top">
        <div className="kpi-card-main">
          <div className="kpi-card-heading">
            <span className="kpi-card-icon" aria-hidden="true">{icon}</span>
            <span className="kpi-card-label">{label}</span>
          </div>
          <strong className="kpi-card-value">{value}</strong>
        </div>
      </div>
    </article>
  );
}

function ProgressStat({ name, value, total, color, onClick, expanded }) {
  const width = (value / total) * 100;
  return (
    <div
      className={`progress-stat${onClick ? " progress-stat-clickable" : ""}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div className="progress-stat-meta">
        <div className="progress-stat-name">
          <span className="progress-stat-dot" style={{ background: color }} />
          <span>{name}</span>
        </div>
        <div className="progress-stat-values">
          <strong>{value.toLocaleString()}</strong>
          <span>{formatPercentNumber(width)}</span>
          {onClick && (
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ marginLeft: 4, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
      <div className="progress-rail">
        <div className="progress-fill" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

function InsightCard({ tone, icon, title, value, description }) {
  return (
    <article className={`insight-card tone-${tone}`}>
      <div className="insight-icon">{icon}</div>
      <div className="insight-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </article>
  );
}

// ── Overrun bar chart (reference: "Upstream Civil Overruns" image) ──────────
const OVERRUN_TOOLTIP_STYLE = {
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 12px 32px rgba(15,23,42,0.10)",
  fontSize: 12,
  fontWeight: 600,
};

function OverrunTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const baseline = payload.find((p) => p.dataKey === "baseline");
  const current = payload.find((p) => p.dataKey === "current");
  const row = payload[0]?.payload ?? {};
  return (
    <div style={{ ...OVERRUN_TOOLTIP_STYLE, padding: "10px 14px", minWidth: 180 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>
        {label}
      </div>
      {baseline && (
        <div style={{ color: "#94a3b8", marginBottom: 3 }}>
          Baseline: <strong>{baseline.value}d</strong>
        </div>
      )}
      {current && (
        <div style={{ color: "#f59e0b", marginBottom: 3 }}>
          Current: <strong>{current.value}d</strong>
        </div>
      )}
      {row.overrun != null && (
        <div style={{ color: "#ef4444", fontWeight: 800 }}>+{row.overrun}d overrun</div>
      )}
    </div>
  );
}

// ── Status Update section ────────────────────────────────────────────────────
const PHASE_COLORS = {
  Engineering:   { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", badge: "#DBEAFE" },
  Procurement:   { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", badge: "#FEF3C7" },
  Construction:  { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412", badge: "#FFEDD5" },
};

function PhaseStatusCard({ phase, status, percentComplete, baselineComplete, daysGained, daysLost, atRisk, recovered }) {
  const c = PHASE_COLORS[phase] ?? PHASE_COLORS.Engineering;
  const netDays = daysGained - daysLost;
  const netColor = netDays >= 0 ? "#16a34a" : "#dc2626";
  const netPrefix = netDays >= 0 ? "+" : "";
  return (
    <div
      className="phase-status-card"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: c.text }}>{phase}</span>
        <span
          style={{
            background: c.badge,
            color: c.text,
            borderRadius: 999,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {status}
        </span>
      </div>
      <div className="phase-progress-rail" style={{ background: c.border }}>
        <div
          className="phase-progress-fill"
          style={{ width: `${percentComplete}%`, background: c.text }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
        <span>Actual <strong style={{ color: c.text }}>{percentComplete}%</strong></span>
        <span>Baseline <strong>{baselineComplete}%</strong></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: netColor }}>{netPrefix}{netDays}d</div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Net Schedule</div>
        </div>
        <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>+{recovered}d</div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Recovered</div>
        </div>
        <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>{atRisk}d</div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>At Risk</div>
        </div>
      </div>
    </div>
  );
}

function RecoveryStep({ step, title, description, before, after, recovered, tag }) {
  return (
    <div className="recovery-step-card">
      <div className="recovery-step-header">
        <span className="recovery-step-number">{step}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{title}</div>
          {tag && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "#dbeafe",
                color: "#1e40af",
                borderRadius: 999,
                padding: "2px 8px",
                marginTop: 3,
                display: "inline-block",
              }}
            >
              {tag}
            </span>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, margin: "8px 0" }}>
        {description}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 8,
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            padding: "7px 4px",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#b45309" }}>{before}d</div>
          <div style={{ fontSize: 10, color: "#78350f", fontWeight: 600 }}>BASELINE</div>
        </div>
        <div style={{ fontSize: 18, color: "#0d9488", fontWeight: 700 }}>→</div>
        <div
          style={{
            textAlign: "center",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: "7px 4px",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d" }}>{after}d</div>
          <div style={{ fontSize: 10, color: "#166534", fontWeight: 600 }}>COMPRESSED</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          padding: "7px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>Days Recovered</span>
        <strong style={{ fontSize: 15, color: "#15803d" }}>+{recovered}d</strong>
      </div>
    </div>
  );
}

// Static overrun data — replace with API data when available
const STATIC_OVERRUN_DATA = [
  { id: "A15750", name: "Waterproofing",    baseline: 19,  current: 136, overrun: 103 },
  { id: "A15850", name: "Concrete Pouring", baseline: 40,  current: 80,  overrun: 81  },
  { id: "A15840", name: "Rebar Works",      baseline: 40,  current: 75,  overrun: 79  },
  { id: "A15790", name: "Formworks",        baseline: 40,  current: 71,  overrun: 79  },
  { id: "A15860", name: "Concrete Curing",  baseline: 47,  current: 67,  overrun: 71  },
];

export default function EPCReport() {
  const { user } = useStore();
  const [MONTHS, setMONTHS] = useState(FALLBACK_MONTHS);
  const [DATA, setDATA]     = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedStat, setExpandedStat] = useState(null);
  const [activeSection, setActiveSection] = useState('timeline');
  const [msExpanded, setMsExpanded] = useState(false);
  const [devExpanded, setDevExpanded] = useState(false);
  const [notStartedActivities, setNotStartedActivities] = useState(null);
  const [notStartedLoading, setNotStartedLoading] = useState(false);
  const [xyTooltip, setXyTooltip] = useState(null);
  const [msData, setMsData] = useState(null);
  const [cpData, setCpData] = useState(null);
  const [onePagerData, setOnePagerData] = useState(null);
  const chartId = useId().replace(/:/g, "");

  // Dynamic status update (phase deviation, recovery plan)
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [recomputing, setRecomputing] = useState(false);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await api.post('/reports/recompute');
      const saved = (res.data.results || []).filter(r => r.status === 'ok');
      if (saved.length === 0) {
        const failed = (res.data.results || []);
        if (failed.length === 0) {
          alert('No processed files found for your company. Upload a file first.');
        } else {
          alert(`Found ${failed.length} file(s) but could not extract reports. Check that your uploaded files were processed successfully.`);
        }
      } else {
        window.location.reload();
      }
    } catch {
      alert('Failed to build reports. Please try again.');
    } finally {
      setRecomputing(false);
    }
  };

  // Delayed activities (from output tracker file directly)
  const [deviationActivities, setDeviationActivities] = useState([]);
  const [deviationMeta, setDeviationMeta]             = useState(null);
  // Full deviations list (with review_reason) for the High Severity tab
  const [allDeviations, setAllDeviations]             = useState([]);

  // Live AI note for the Status Update section
  const [aiInsightNote,    setAiInsightNote]    = useState('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  useEffect(() => {
    api.get('/reports/monthly-trend')
      .then(({ data: { months, data } }) => {
        setMONTHS(months);
        setDATA(data);
        setActiveMonth(months[months.length - 1] ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load monthly reports:", err);
        setError("Could not load report data.");
        setLoading(false);
      });

    // Fetch delayed activities from the deviations DB (real flagged activities)
    api.get('/deviations/overview')
      .then(({ data: json }) => {
        const acts = Array.isArray(json.top_delays) ? json.top_delays : [];
        setDeviationActivities(acts.filter(d => (d.days_overdue ?? 0) > 0));
        setDeviationMeta({ source_file: `${acts.length} activities from deviation database`, total_delayed: acts.length });
      })
      .catch(() => {});

    // Fetch full deviations (includes review_reason) for the High Severity tab
    api.get('/deviations')
      .then(({ data: devs }) => { if (Array.isArray(devs)) setAllDeviations(devs); })
      .catch(() => {});

    // Fetch schedule JSON data (milestones, CP, one-pager) from Knowledgebase
    api.get('/schedule/milestones')
      .then(({ data: json }) => { if (json?.milestones) setMsData(json.milestones); })
      .catch(() => {});
    api.get('/schedule/critical-path')
      .then(({ data: json }) => { if (json?.activities) setCpData(json.activities); })
      .catch(() => {});
    api.get('/schedule/one-pager')
      .then(({ data: json }) => { if (json) setOnePagerData(json); })
      .catch(() => {});
  }, []);

  // Re-fetch status-update whenever active month changes
  useEffect(() => {
    if (!activeMonth) return;
    setStatusLoading(true);
    api.get('/reports/status-update', { params: { month: activeMonth } })
      .then(({ data: json }) => { if (json) setStatusUpdate(json); })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [activeMonth]);

  // Generate a live AI note when the status-update API returns no stored ai_note
  useEffect(() => {
    if (!activeMonth || !statusUpdate) return;
    if (statusUpdate?.recoveryPlan?.ai_note) return;
    const _d = DATA[activeMonth];
    if (!_d) return;
    const _overall = statusUpdate?.deviation?.overall ?? null;
    const _sc = _d.scurves || {};
    setAiInsightNote('');
    setAiInsightLoading(true);
    api.post('/reports/ai-insight', {
      month: activeMonth,
      total_activities: _d.totalActivities,
      days_lost:         _overall?.totalDaysLost    ?? 0,
      already_recovered: _overall?.alreadyRecovered ?? 0,
      still_at_risk:     _overall?.stillAtRisk      ?? 0,
      phase_actuals: {
        engineering:  ((_sc.homeOffice?.actual  ?? 0) + (_sc.projectMgmt?.actual  ?? 0)) / 2,
        procurement:    _sc.manufacturing?.actual ?? 0,
        construction: ((_sc.construction?.actual ?? 0) + (_sc.commissioning?.actual ?? 0)) / 2,
      },
    })
      .then(({ data: json }) => { if (json?.ai_note) setAiInsightNote(json.ai_note); })
      .catch(() => {})
      .finally(() => setAiInsightLoading(false));
  }, [statusUpdate, activeMonth]);

  if (loading) {
    return (
      <div className="history-page">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>Loading report data…</p>
        </main>
      </div>
    );
  }

  if (error || !activeMonth || !DATA[activeMonth]) {
    const isNoData = !error && (!activeMonth || !DATA[activeMonth]);
    const canRecompute = ['admin', 'company_admin', 'super_admin'].includes(user?.role);
    return (
      <div className="history-page">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <div style={{ textAlign: "center", maxWidth: 460, padding: "0 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {isNoData ? "📂" : "⚠️"}
            </div>
            <p style={{ color: "#1e293b", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {isNoData ? "No reports yet" : "Unable to load reports"}
            </p>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {isNoData
                ? "Monthly performance reports will appear here once a tracker has been processed. Upload a schedule file to get started."
                : "Something went wrong loading your report data. Please refresh the page or contact support if the problem persists."}
            </p>
            {isNoData && canRecompute && (
              <button
                onClick={handleRecompute}
                disabled={recomputing}
                style={{
                  padding: '11px 28px',
                  background: recomputing ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: recomputing ? 'not-allowed' : 'pointer',
                  boxShadow: recomputing ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {recomputing ? 'Building reports…' : 'Build Reports from Uploaded Files'}
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const d = DATA[activeMonth];
  const prevMonth = MONTHS[MONTHS.indexOf(activeMonth) - 1];
  const prevD = prevMonth ? DATA[prevMonth] : null;

  const { color, accent, gradient } = getMonthStyle(activeMonth);

  // totalActivities is activity-only (milestones excluded) — keep all rates consistent
  const scheduleHealth = Number(pct(d.onTime, d.totalActivities));
  const onPlanRate = Number(pct(d.onPlan, d.totalActivities));
  const dataCoverage = Number(pct(d.onPlan + d.inProgress, d.totalActivities));
  const healthScore = Math.round(Math.min(scheduleHealth, 100) * 0.45 + onPlanRate * 0.3 + dataCoverage * 0.25);
  const healthBand = getHealthBand(healthScore);

  // Milestones are tracked separately — not divided against the activity total
  const statusData = [
    { name: "Activity On Time", value: d.onTime, fill: "#3B82F6" },
    { name: "Not Started", value: d.notStarted, fill: "#94A3B8" },
  ];

  const flagData = [
    { name: "On Plan", value: d.onPlan, fill: "#10B981" },
    { name: "Duration Missing", value: d.durationMissing, fill: "#F59E0B" },
    { name: "In Progress", value: d.inProgress, fill: "#3B82F6" },
  ];

  const momData = MONTHS.map((month) => ({
    month: month.slice(0, 3),
    total: DATA[month].totalActivities,
    onTime: DATA[month].onTime,
    milestones: DATA[month].milestoneAchieved,
  }));

  const scurveMonthData = MONTHS.map((month) => {
    const row = { month: month.slice(0, 3) };
    DISCIPLINES.forEach((discipline) => {
      row[discipline.key] = DATA[month].scurves?.[discipline.key]?.actual ?? 0;
    });
    return row;
  });

  const radarData = DISCIPLINES.map((discipline) => ({
    discipline: discipline.label,
    value: DATA[activeMonth].scurves?.[discipline.key]?.actual ?? 0,
    fullMark: 100,
  }));

  const durationTrend = MONTHS.map((month) => ({
    month: month.slice(0, 3),
    avg: DATA[month].avgPlannedDuration,
    max: DATA[month].maxPlannedDuration,
  }));

  const riskRows = getRiskRows(d);
  const highestRisk = [...riskRows].sort((a, b) => b.score - a.score)[0];
  const constructionForecast = d.futurePlanned?.construction?.may ?? d.futurePlanned?.construction?.jun ?? d.scurves?.construction?.actual ?? 0;
  const homeOfficeForecast = d.futurePlanned?.homeOffice?.jun ?? d.futurePlanned?.homeOffice?.may ?? d.scurves?.homeOffice?.actual ?? 0;
  const durationGapRate = Number(pct(d.durationMissing, d.totalActivities));

  // ── EPC phase completion helper (always has data from uploads) ──────────
  const _phaseActuals = (sc) => {
    const r = (v) => Math.round(Number(v || 0) * 10) / 10;
    return {
      eng:  r(((sc.homeOffice?.actual  ?? 0) + (sc.projectMgmt?.actual  ?? 0)) / 2),
      proc: r(  sc.manufacturing?.actual ?? 0),
      con:  r(((sc.construction?.actual ?? 0) + (sc.commissioning?.actual ?? 0)) / 2),
      // planned — only meaningful when it differs from actual (i.e. file has Planned % column)
      engP:  r(((sc.homeOffice?.planned  ?? sc.homeOffice?.actual  ?? 0) + (sc.projectMgmt?.planned  ?? sc.projectMgmt?.actual  ?? 0)) / 2),
      procP: r(  sc.manufacturing?.planned ?? sc.manufacturing?.actual  ?? 0),
      conP:  r(((sc.construction?.planned ?? sc.construction?.actual  ?? 0) + (sc.commissioning?.planned ?? sc.commissioning?.actual ?? 0)) / 2),
    };
  };

  // ── Month-wise EPC phase completion % line chart (actual — always available from uploads) ─
  const statusLineData = MONTHS.map((month) => {
    const { eng, proc, con } = _phaseActuals(DATA[month].scurves || {});
    return { month: month.slice(0, 3), Engineering: eng, Procurement: proc, Construction: con };
  });

  // ── Phase bar chart data (current month) ─────────────────────────────────
  // Uses planned vs actual when the file contains a "Planned %" column.
  // When planned ≈ actual (column missing) falls back to actual-only display.
  const _phaseBarData = (() => {
    // Prefer live status-update API data
    if (statusUpdate?.deviation?.phases) {
      const ph = statusUpdate.deviation.phases;
      return [
        { phase: 'Engineering',  planned: Math.round((ph.Engineering?.planned  ?? 0) * 10) / 10, actual: Math.round((ph.Engineering?.actual  ?? 0) * 10) / 10 },
        { phase: 'Procurement',  planned: Math.round((ph.Procurement?.planned  ?? 0) * 10) / 10, actual: Math.round((ph.Procurement?.actual  ?? 0) * 10) / 10 },
        { phase: 'Construction', planned: Math.round((ph.Construction?.planned ?? 0) * 10) / 10, actual: Math.round((ph.Construction?.actual  ?? 0) * 10) / 10 },
      ];
    }
    // Fallback: derive from S-curves
    const { eng, proc, con, engP, procP, conP } = _phaseActuals(d.scurves || {});
    return [
      { phase: 'Engineering',  planned: engP,  actual: eng  },
      { phase: 'Procurement',  planned: procP, actual: proc },
      { phase: 'Construction', planned: conP,  actual: con  },
    ];
  })();

  // True when the file contains a real Planned % (i.e. gap is meaningful)
  const _hasPlanGap = _phaseBarData.some((p) => p.planned > 0 && Math.abs(p.planned - p.actual) > 0.5);

  // ── Overall deviation — ONLY from real data (Planned % vs Actual % in S-curve sheets) ─
  // Never estimate or derive this. If the file has no Planned % column, show nothing.
  const _overall      = statusUpdate?.deviation?.overall ?? null;
  const overallLost      = _overall?.totalDaysLost     ?? 0;
  const overallRecovered = _overall?.alreadyRecovered  ?? 0;
  const overallAtRisk    = _overall?.stillAtRisk        ?? 0;
  const overallNetSlip   = _overall?.netScheduleSlip    ?? 0;
  const _hasDeviationData = overallLost > 0 || overallRecovered > 0 || overallAtRisk > 0;

  // ── Deviation DB summary (always available from uploaded file) ─────────────
  const _devTotal    = deviationActivities.length;
  const _devCritical = deviationActivities.filter(d => (d.days_overdue ?? 0) >= 28).length;
  const _devHigh     = deviationActivities.filter(d => (d.severity || '').toLowerCase() === 'high').length;
  const _devWorst    = deviationActivities.reduce((mx, d) => Math.max(mx, d.days_overdue ?? 0), 0);
  const _hasDevDB    = _devTotal > 0;

  // ── Dynamic recovery steps ────────────────────────────────────────────────
  const _apiSteps       = statusUpdate?.recoveryPlan?.steps;
  const _apiStepsHaveData = Array.isArray(_apiSteps) && _apiSteps.some(s => (s.baseline ?? s.before ?? 0) > 0);

  // Try What-IF cache before falling back to static benchmark steps
  const _cacheSteps = (() => {
    if (_apiStepsHaveData) return null;
    try {
      const raw = localStorage.getItem(`whatif_critical_dashboard_cache_v1_${user?.company_id || 'global'}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ui = parsed?.ui_payload;
      if (!ui?.step1_title) return null;
      const steps = [];
      for (let i = 1; i <= 3; i++) {
        const pfx = `step${i}_`;
        if (!ui[`${pfx}title`]) break;
        const baselineDays   = Array.isArray(ui[`${pfx}baseline_days`])   ? ui[`${pfx}baseline_days`]   : [];
        const compressedDays = Array.isArray(ui[`${pfx}compressed_days`]) ? ui[`${pfx}compressed_days`] : [];
        const chips          = Array.isArray(ui[`${pfx}activity_chips`])  ? ui[`${pfx}activity_chips`]  : [];
        steps.push({
          step:        String(i).padStart(2, '0'),
          title:       ui[`${pfx}title`],
          description: ui[`${pfx}summary`] || '',
          baseline:    baselineDays.reduce((s, v) => s + v, 0) || 0,
          compressed:  compressedDays.reduce((s, v) => s + v, 0) || 0,
          recovered:   ui[`${pfx}recovered_days`] || 0,
          tag:         chips.length > 0 ? chips[0].split(' ').slice(0, 2).join(' ') : undefined,
        });
      }
      return steps.length > 0 ? steps : null;
    } catch {
      return null;
    }
  })();

  const _recoverySteps  = _apiStepsHaveData ? _apiSteps : (_cacheSteps ?? []);
  const _recoveryNote   = statusUpdate?.recoveryPlan?.ai_note ?? 'Recovery plan is computed from schedule float analysis. If compression via float is not achievable, a more detailed review by project planning is needed.';

  const executiveSummary = `${activeMonth} reports ${d.totalActivities.toLocaleString()} total activities with  ${formatPercentNumber(onPlanRate)} duration compliance, and ${d.durationMissing.toLocaleString()} records requiring baseline duration attention.`;

  const insights = [
    {
      tone: healthBand.tone,
      icon: "KH",
      title: "Key Observation",
      value: `${formatPercentNumber(scheduleHealth)} schedule health`,
      description: `${d.onTime.toLocaleString()} on-time activities and ${d.milestoneAchieved.toLocaleString()} achieved milestones keep the current month in ${healthBand.label.toLowerCase()} territory.`,
    },
    {
      tone: highestRisk.level.tone,
      icon: "RF",
      title: "Risk Forecast",
      value: highestRisk.name.replace(" Risk", ""),
      description: `${highestRisk.detail}. This is the highest monitored exposure in the ${activeMonth} portfolio.`,
    },
    {
      tone: "warning",
      icon: "SR",
      title: "Schedule Recommendation",
      value: `${d.durationMissing.toLocaleString()} duration gaps`,
      description: `Backfill planned duration for ${formatPercentNumber(durationGapRate)} of activities to improve downstream forecasting confidence and reduce planning blind spots.`,
    },
    {
      tone: "positive",
      icon: "TH",
      title: "Trend Highlight",
      value: `${constructionForecast.toFixed(2)}% construction forecast`,
      description: `Construction has the sharpest forward ramp, while home office is projected to reach ${homeOfficeForecast.toFixed(2)}% in the next visible horizon.`,
    },
  ];

  const tooltipStyle = {
    borderRadius: 18,
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
  };

  // ── Phase Gantt shared constants (used by Timeline, Milestones, and CP tabs) ──
  const GANTT_START = new Date('2024-11-27');
  const GANTT_END   = new Date('2027-09-20');
  const GANTT_SPAN  = GANTT_END - GANTT_START;
  const gdp  = (iso) => ((new Date(iso) - GANTT_START) / GANTT_SPAN) * 100;
  const gdw  = (s, e) => Math.max(((new Date(e) - new Date(s)) / GANTT_SPAN) * 100, 0.4);
  const GANTT_PHASES = [
    { phase: 'Engineering',   color: '#3B82F6', forecast: { s: '2024-11-27', e: '2026-11-13' }, early: { s: '2024-11-27', e: '2026-09-25' } },
    { phase: 'Procurement',   color: '#F59E0B', forecast: { s: '2025-06-21', e: '2026-10-19' }, early: { s: '2025-06-21', e: '2026-09-24' } },
    { phase: 'Construction',  color: '#EF4444', forecast: { s: '2025-07-03', e: '2027-03-23' }, early: { s: '2025-07-03', e: '2027-01-20' } },
    { phase: 'Commissioning', color: '#8B5CF6', forecast: { s: '2027-03-23', e: '2027-06-22' }, early: { s: '2027-01-20', e: '2027-04-21' } },
    { phase: 'Closeout',      color: '#10B981', forecast: { s: '2027-06-05', e: '2027-09-20' }, early: { s: '2027-04-04', e: '2027-07-20' } },
  ];
  const GANTT_TICKS = (() => {
    const ticks = [];
    const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let td = new Date('2025-01-01');
    while (td <= GANTT_END) {
      ticks.push({ label: `${MO[td.getMonth()]}'${String(td.getFullYear()).slice(2)}`, p: gdp(td.toISOString().split('T')[0]) });
      td = new Date(td.getFullYear(), td.getMonth() + 3, 1);
    }
    return ticks;
  })();
  const GANTT_PA = {
    Engineering:   Number((_phaseBarData.find(p => p.phase === 'Engineering')?.actual  ?? 0).toFixed(1)),
    Procurement:   Number((_phaseBarData.find(p => p.phase === 'Procurement')?.actual  ?? 0).toFixed(1)),
    Construction:  Number((_phaseBarData.find(p => p.phase === 'Construction')?.actual ?? 0).toFixed(1)),
    Commissioning: Math.round((d.scurves?.commissioning?.actual ?? 0) * 10) / 10,
    Closeout:      0,
  };
  const GANTT_TODAY_MS = new Date().setHours(0, 0, 0, 0);
  const GANTT_TODAY_P  = ((GANTT_TODAY_MS - GANTT_START) / GANTT_SPAN) * 100;
  const ganttTimeElapsed = (phaseStart, phaseEnd) => {
    const s = new Date(phaseStart).getTime();
    const e = new Date(phaseEnd).getTime();
    if (GANTT_TODAY_MS <= s) return 0;
    if (GANTT_TODAY_MS >= e) return 100;
    return Math.round((GANTT_TODAY_MS - s) / (e - s) * 1000) / 10;
  };

  return (
    <div className="history-page">
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
        type="button"
      >
        {isMobileMenuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="main-content">
        <div className="history-dashboard">

          <section
            className="hero-command-center"
            style={{
              "--hero-color": color,
              "--hero-accent": accent,
              "--hero-gradient": gradient,
            }}
          >
            <div className="hero-aurora hero-aurora-one" />
            <div className="hero-aurora hero-aurora-two" />
            <div className="hero-panel">
              <div className="hero-copy">
                <span className="hero-eyebrow">Executive Analytics Platform</span>
                <h1>Project Controls Command Center</h1>
                <p>{executiveSummary}</p>
              </div>

              <div className="hero-months">
                <span className="hero-months-label">Active Period</span>
                <div className="hero-months-list">
                  {MONTHS.map((month) => (
                    <MonthTab key={month} month={month} active={activeMonth === month} onClick={setActiveMonth} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Hero summary strip: project-level context only ── */}
            <div style={{
              position: "relative", zIndex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              marginTop: 18,
            }}>
              {[
                { label: "Total Activities", value: d.totalActivities.toLocaleString() },
                { label: "Active Month",     value: activeMonth },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Performance KPI cards ── */}
          <section style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}>
            {[
              { label: "Duration Compliance", value: formatPercentNumber(onPlanRate),       color: "#F59E0B" },
              { label: "Milestones Achieved", value: d.milestoneAchieved.toLocaleString(),  color: "#8B5CF6" },
              { label: "Avg Planned Duration",value: `${d.avgPlannedDuration.toFixed(1)}d`, color: "#0EA5E9" },
              { label: "Max Duration",        value: `${d.maxPlannedDuration}d`,            color: "#EF4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "#fff",
                border: `1px solid ${color}22`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                <strong style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{value}</strong>
              </div>
            ))}
          </section>

          {/* ── Section Navigation Tabs ── */}
          {(() => {
            const TABS = [
              { id: 'timeline',   label: 'Timeline',      icon: '▦' },
              { id: 'milestones', label: 'Milestones',    icon: '◆' },
              { id: 'cp',         label: 'Critical Path', icon: '⚑' },
              { id: 'highsev',    label: 'Deviations',    icon: '⚠' },
              { id: 'trend',      label: 'One Pager',     icon: '↗' },
            ];
            return (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 0 2px', borderBottom: '2px solid #f1f5f9', marginBottom: 4 }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px 8px 0 0',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: activeSection === tab.id ? 800 : 600,
                      color: activeSection === tab.id ? '#185FA5' : '#64748b',
                      background: activeSection === tab.id ? '#EFF6FF' : 'transparent',
                      borderBottom: activeSection === tab.id ? '2px solid #185FA5' : '2px solid transparent',
                      marginBottom: -2,
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════
              PROJECT TIMELINE — Phase Gantt
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'timeline' && (() => {
            return (
              <section className="glass-card analytics-card">
                <SectionHeader eyebrow="Schedule Overview" title="High-Level Project Timeline" subtitle="Baseline schedule with live actual progress · upload a file to update fills" />
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{ position: 'relative', height: 16, marginLeft: 90, marginBottom: 6 }}>
                    {GANTT_TICKS.map(t => (
                      <span key={t.label} style={{ position: 'absolute', left: `${t.p}%`, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{t.label}</span>
                    ))}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 90, right: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                      {GANTT_TICKS.map(t => (
                        <div key={t.label} style={{ position: 'absolute', left: `${t.p}%`, top: 0, bottom: 0, width: 1, background: '#f1f5f9' }} />
                      ))}
                      <div style={{ position: 'absolute', left: `${GANTT_TODAY_P}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', opacity: 0.75 }}>
                        <span style={{ position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap' }}>Today</span>
                      </div>
                    </div>
                    {GANTT_PHASES.map(({ phase, color, forecast, early }) => {
                      const pctDone    = GANTT_PA[phase] ?? 0;
                      const tElapsed   = ganttTimeElapsed(forecast.s, forecast.e);
                      const behindPct  = Math.round((tElapsed - pctDone) * 10) / 10;
                      const phaseActive = tElapsed > 0 && tElapsed < 100;
                      return (
                        <div key={phase} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', height: 38 }}>
                            <div style={{ width: 90, flexShrink: 0, paddingRight: 10, fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'right' }}>{phase}</div>
                            <div style={{ flex: 1, position: 'relative', height: 38 }}>
                              {/* Early finish (thin dashed, top) */}
                              <div style={{ position: 'absolute', left: `${gdp(early.s)}%`, width: `${gdw(early.s, early.e)}%`, height: 6, top: 2, background: `${color}22`, borderRadius: 3, border: `1px dashed ${color}55` }} />
                              {/* Baseline bar (faded) with live progress fill inside */}
                              <div style={{ position: 'absolute', left: `${gdp(forecast.s)}%`, width: `${gdw(forecast.s, forecast.e)}%`, height: 22, top: 12, background: `${color}18`, borderRadius: 4, border: `1px solid ${color}44`, overflow: 'hidden' }}>
                                {pctDone > 0 && (
                                  <div style={{ position: 'absolute', left: 0, width: `${pctDone}%`, height: '100%', background: color, opacity: 0.88, borderRadius: 'inherit' }} />
                                )}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', zIndex: 1, pointerEvents: 'none' }}>
                                  {pctDone > 10 && (
                                    <span style={{ fontSize: 9, fontWeight: 800, color: pctDone > 28 ? '#fff' : color, whiteSpace: 'nowrap' }}>{pctDone}%</span>
                                  )}
                                  <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                                    {new Date(forecast.e).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Insight column: vs baseline total + vs today */}
                            <div style={{ width: 160, flexShrink: 0, paddingLeft: 12, display: 'flex', gap: 6 }}>
                              <div style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '3px 8px', flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color }}>{pctDone}%</div>
                                <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>vs baseline</div>
                              </div>
                              {phaseActive && (
                                <div style={{
                                  textAlign: 'center',
                                  background: behindPct > 5 ? '#fff1f2' : behindPct > 0 ? '#fffbeb' : '#ecfdf5',
                                  border: `1px solid ${behindPct > 5 ? '#fecdd3' : behindPct > 0 ? '#fde68a' : '#bbf7d0'}`,
                                  borderRadius: 8, padding: '3px 8px', flex: 1,
                                }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: behindPct > 5 ? '#dc2626' : behindPct > 0 ? '#b45309' : '#16a34a' }}>
                                    {behindPct > 0 ? `-${behindPct}%` : `+${Math.abs(behindPct)}%`}
                                  </div>
                                  <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>vs today</div>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Detail row: time elapsed vs actual */}
                          {phaseActive && (
                            <div style={{ display: 'flex', marginLeft: 90, paddingLeft: 0, marginTop: 2, gap: 12 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>
                                Time elapsed: <strong style={{ color: '#475569' }}>{tElapsed}%</strong>
                              </span>
                              <span style={{ fontSize: 10, color: '#64748b' }}>
                                Actual done: <strong style={{ color }}>{pctDone}%</strong>
                              </span>
                              {behindPct > 0 ? (
                                <span style={{ fontSize: 10, fontWeight: 700, color: behindPct > 10 ? '#dc2626' : '#b45309' }}>
                                  {behindPct.toFixed(1)}% behind schedule today
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>
                                  {Math.abs(behindPct).toFixed(1)}% ahead of schedule
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Actual progress (from latest upload)', el: <div style={{ width: 18, height: 10, background: '#64748b', borderRadius: 3 }} /> },
                    { label: 'Remaining baseline',                   el: <div style={{ width: 18, height: 10, background: '#64748b18', border: '1px solid #64748b44', borderRadius: 3 }} /> },
                    { label: 'Early / optimistic finish',            el: <div style={{ width: 18, height: 6, background: '#64748b22', border: '1px dashed #64748b55', borderRadius: 2 }} /> },
                    { label: `Today — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, el: <div style={{ width: 2, height: 14, background: '#ef4444' }} /> },
                  ].map(({ label, el }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {el}
                      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {activeSection === 'milestones' && (() => {
            const slipDays = overallNetSlip ?? 0;
            const shiftDate = (iso, days) => {
              if (!days) return null;
              const dt = new Date(iso); dt.setDate(dt.getDate() + days);
              return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            };
            // Hardcoded fallback for 4 key cards — overridden by msData below
            const _MILESTONES_FALLBACK = [
              { id: 'TA',   label: 'Turnaround Scope Completion (TA)',         iso: '2025-05-17', early: null,          achieved: true  },
              { id: 'MC',   label: 'Mechanical Completion (MC)',               iso: '2027-03-23', early: '20 Jan 2027', achieved: false },
              { id: 'RFSU', label: 'Ready for Start-up (RFSU)',                iso: '2027-06-22', early: '21 Apr 2027', achieved: false },
              { id: 'PAC',  label: 'Provisional Acceptance Certificate (PAC)', iso: '2027-09-20', early: '20 Jul 2027', achieved: false },
            ];
            // Timeline position helper (project span Nov 2024 → Sep 2027)
            const MS_START = new Date('2024-11-07').getTime();
            const MS_END   = new Date('2027-09-20').getTime();
            const MS_SPAN  = MS_END - MS_START;
            const msp = (iso) => ((new Date(iso).getTime() - MS_START) / MS_SPAN) * 100;
            const TODAY_MSP = ((new Date().setHours(0,0,0,0) - MS_START) / MS_SPAN) * 100;

            // All 33 MS-flagged milestones from SCHEDULE -EPC BOROUGE.xlsx (col J = "MS")
            // Sorted chronologically by forecast finish. key=true → labelled on timeline.
            const MS_DATA = [
              { id: 'LOA',  label: 'Letter of Award (LOA)',                               f: '2024-11-07', e: '2024-11-07', done: true,  key: true  },
              { id: 'KOM',  label: '10.A-Kick-off Meeting Completed',                     f: '2024-12-06', e: '2024-12-06', done: true,  key: false },
              { id: 'PPF',  label: '113.E-Start Piping Prefabrication',                   f: '2025-03-25', e: '2025-03-25', done: true,  key: false },
              { id: 'PPS',  label: '117.E-Start Piping Erection',                         f: '2025-04-15', e: '2025-04-15', done: true,  key: false },
              { id: 'EPR',  label: '1.A*-Issue Engineering Procedure',                    f: '2025-04-30', e: '2025-04-30', done: true,  key: false },
              { id: 'TA',   label: 'Turnaround Scope Completion (TA)',                    f: '2025-05-17', e: '2025-05-17', done: true,  key: true  },
              { id: 'COM',  label: '94.E*-Commence on SITE',                              f: '2025-05-31', e: '2025-05-31', done: true,  key: false },
              { id: 'E60',  label: 'Engineering Workshops — 60% Model Review',            f: '2025-09-19', e: '2025-09-19', done: true,  key: false },
              { id: 'OGC',  label: 'Off Gas Compressor delivery',                         f: '2026-02-06', e: '2026-03-01', done: true,  key: false },
              { id: 'E90',  label: 'Engineering Workshops — 90% Model Review',            f: '2026-03-15', e: '2026-03-06', done: true,  key: true  },
              { id: '101',  label: '101.E-Complete all Piperack foundations',             f: '2026-05-25', e: '2026-04-09', done: false, key: false },
              { id: 'FGC',  label: '76.D*-Compressors delivered to SITE',                f: '2026-06-22', e: '2026-03-03', done: false, key: true  },
              { id: 'FGA',  label: 'Feed Gas Compressor (Baseplate, Gear, Gas Seal)',     f: '2026-06-22', e: '2026-03-03', done: false, key: false },
              { id: '110',  label: '110.E-Complete installation Turbines/Compressors',    f: '2026-07-19', e: '2026-05-18', done: false, key: false },
              { id: '102',  label: '102.E-Complete all underground piping',               f: '2026-08-19', e: '2026-07-19', done: false, key: false },
              { id: '86D',  label: '86.D*-Bulk piping materials final MTO to SITE',      f: '2026-09-17', e: '2026-08-22', done: false, key: false },
              { id: '88D',  label: '88.D-Bulk electrical materials final MTO to SITE',   f: '2026-09-28', e: '2026-08-31', done: false, key: false },
              { id: '90D',  label: '90.D-Bulk instrument materials final MTO to SITE',   f: '2026-10-19', e: '2026-09-24', done: false, key: false },
              { id: '82D',  label: '82.D-Instrument Control SYSTEMS for CCB to SITE',    f: '2026-10-30', e: '2026-09-29', done: false, key: false },
              { id: '79D',  label: '79.D*-All major electrical Equipment to SITE',       f: '2026-10-30', e: '2026-09-29', done: false, key: false },
              { id: '115',  label: '115.E-Complete prefabrication 98% piping',           f: '2026-10-26', e: '2026-10-05', done: false, key: false },
              { id: '81D',  label: '81.D*-Major instrument control SYSTEMS to SITE',     f: '2026-11-06', e: '2026-09-29', done: false, key: false },
              { id: '83D',  label: '83.D-Field instrument tagged items to SITE',         f: '2026-11-06', e: '2026-09-27', done: false, key: false },
              { id: '125',  label: '125.E-Complete Heat Tracing, Insulation & Painting', f: '2026-11-07', e: '2026-10-05', done: false, key: false },
              { id: 'STL',  label: '106.E-Complete steel structural works',              f: '2026-11-11', e: '2026-09-10', done: false, key: true  },
              { id: '119',  label: '119.E-Piping Erection 100% complete',                f: '2026-11-14', e: '2026-10-22', done: false, key: false },
              { id: '122',  label: '122.E-Piping Hydrotesting 100% complete',            f: '2026-12-07', e: '2026-12-03', done: false, key: false },
              { id: '129',  label: '129.E-Complete electrical cabling & termination',    f: '2026-12-28', e: '2026-12-21', done: false, key: false },
              { id: '136',  label: '136.E-Complete instrumentation loop checks',         f: '2026-12-28', e: '2026-12-21', done: false, key: false },
              { id: 'ANZ',  label: 'Analyzer (PO pending) — delivery',                   f: '2026-12-31', e: '2026-10-07', done: false, key: false },
              { id: 'ABT',  label: '8.A*-As Built drawings handover to COMPANY',         f: '2027-03-24', e: '2027-01-21', done: false, key: false },
              { id: 'MC',   label: '138.F-Mechanical Completion',                        f: '2027-03-23', e: '2027-01-20', done: false, key: true  },
              { id: 'RFSU', label: 'Ready for Start-up (RFSU)',                          f: '2027-06-22', e: '2027-04-21', done: false, key: true  },
              { id: 'PAC',  label: 'Provisional Acceptance Certificate (PAC)',           f: '2027-09-20', e: '2027-07-20', done: false, key: true  },
            ];

            const today      = new Date(); today.setHours(0,0,0,0);
            const daysUntil  = (iso) => Math.round((new Date(iso) - today) / 86400000);
            const fmtDate    = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            // Unified milestone source: API data takes priority, falls back to hardcoded MS_DATA
            const _MS = msData
              ? msData.map(m => ({ id: m.id, label: m.label, f: m.forecast_finish, e: m.early_finish, done: m.done, key: m.key }))
              : MS_DATA;

            // 4 key milestone cards — built from _MS (API-driven)
            const MILESTONES = ['TA', 'MC', 'RFSU', 'PAC'].map(id => {
              const ms    = _MS.find(m => m.id === id);
              const apiMs = msData?.find(m => m.id === id);
              const fb    = _MILESTONES_FALLBACK.find(m => m.id === id);
              return {
                id,
                label:    apiMs?.label ?? ms?.label ?? fb?.label ?? id,
                iso:      ms?.f ?? fb?.iso ?? '',
                early:    ms?.e && ms.e !== ms.f ? fmtDate(ms.e) : (fb?.early ?? null),
                achieved: ms?.done ?? fb?.achieved ?? false,
              };
            }).filter(m => m.iso);
            const CONTRACT_MAP = Object.fromEntries(MILESTONES.map(m => [m.id, m]));

            const upcoming = _MS.filter(ms => !ms.done);
            const achieved = _MS.filter(ms =>  ms.done);
            const visibleAchieved = msExpanded ? achieved : achieved.slice(0, 3);

            return (
              <section className="glass-card analytics-card">
                <SectionHeader eyebrow="Milestones" title="Project Milestones" subtitle={`${upcoming.length} upcoming · ${achieved.length} achieved · April 2026 schedule baseline`} />

                {/* ── 1. Contractual milestone cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {MILESTONES.map(m => {
                    const days = daysUntil(m.iso);
                    const isAchieved = m.achieved;
                    const contract = CONTRACT_MAP[m.id];
                    const currentDate = contract && !isAchieved && _hasDeviationData && slipDays > 0
                      ? shiftDate(m.iso, slipDays) : null;
                    const slippedDays = currentDate ? daysUntil(new Date(m.iso).setDate(new Date(m.iso).getDate() + slipDays)) : null;
                    return (
                      <div key={m.id} style={{
                        borderRadius: 12,
                        padding: '14px 16px',
                        background: isAchieved ? '#f0fdf4' : '#fffbeb',
                        border: `1.5px solid ${isAchieved ? '#86efac' : '#fcd34d'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: isAchieved ? '#15803d' : '#92400e', background: isAchieved ? '#dcfce7' : '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>{m.id}</span>
                          {isAchieved
                            ? <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>✓ Done</span>
                            : <span style={{ fontSize: 11, fontWeight: 800, color: days <= 90 ? '#dc2626' : days <= 270 ? '#b45309' : '#374151' }}>
                                {days > 0 ? `${days}d away` : `${Math.abs(days)}d overdue`}
                              </span>
                          }
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 6 }}>{m.label.replace(/ \(\w+\)$/, '')}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Forecast: <strong style={{ color: '#374151' }}>{fmtDate(m.iso)}</strong>
                        </div>
                        {m.early && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            Early target: <strong style={{ color: '#15803d' }}>{m.early}</strong>
                          </div>
                        )}
                        {currentDate && (
                          <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>
                            +{slipDays}d risk → {currentDate}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── 2. Focused timeline + quarter groups ── */}
                {(() => {
                  const VIEW_START = new Date('2026-01-01').getTime();
                  const VIEW_END   = new Date('2027-10-01').getTime();
                  const VIEW_SPAN  = VIEW_END - VIEW_START;
                  const vsp = (iso) => Math.max(-1, Math.min(101, ((new Date(iso).getTime() - VIEW_START) / VIEW_SPAN) * 100));
                  const TODAY_V = vsp(new Date().toISOString());

                  const gridLines = [];
                  for (let yr = 2026; yr <= 2027; yr++) {
                    for (const mo of [0, 3, 6, 9]) {
                      const d = new Date(yr, mo, 1);
                      const p = vsp(d.toISOString());
                      if (p >= 0 && p <= 100) gridLines.push({ p, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) });
                    }
                  }

                  const achievedInView = achieved.filter(ms => { const p = vsp(ms.f); return p >= 0 && p <= 100; });
                  const upcomingWithPos = upcoming.map((ms, i) => ({ ...ms, pct: vsp(ms.f), above: i % 2 === 0, days: daysUntil(ms.f) }));

                  const byMonth = {};
                  upcoming.forEach(ms => {
                    const d = new Date(ms.f);
                    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
                    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                    if (!byMonth[key]) byMonth[key] = { label, items: [] };
                    byMonth[key].items.push(ms);
                  });
                  const quarterGroups = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => [v.label, v.items]);

                  return (
                    <>
                      {/* ── Horizontal Overview Timeline ── */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          Schedule Overview — {new Date('2024-11-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })} to {new Date('2027-10-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                        </div>
                        {(() => {
                          const _src = _MS; // already API-aware (msData ?? MS_DATA)
                          const OV_W = 4000; const OV_H = 380; const OV_LY = 190;
                          const OV_PAD = 52; const OV_PLOT = OV_W - OV_PAD * 2;
                          const OV_VS = new Date('2024-10-01').getTime();
                          const OV_VE = new Date('2027-10-01').getTime();
                          const OV_SPAN = OV_VE - OV_VS;
                          const ovX = iso => OV_PAD + Math.max(0, Math.min(OV_PLOT, ((new Date(iso).getTime() - OV_VS) / OV_SPAN) * OV_PLOT));
                          const ovToday = OV_PAD + Math.max(0, Math.min(OV_PLOT, ((Date.now() - OV_VS) / OV_SPAN) * OV_PLOT));
                          const nowOv = new Date(); nowOv.setHours(0,0,0,0);
                          const ovTicks = [];
                          for (let yr = 2024; yr <= 2027; yr++) for (let mo = 0; mo < 12; mo += 3) {
                            const t = new Date(yr, mo, 1);
                            if (t.getTime() < OV_VS || t.getTime() > OV_VE) continue;
                            ovTicks.push({ x: ovX(t.toISOString()), label: t.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) });
                          }
                          const sorted = [..._src].sort((a, b) => new Date(a.f) - new Date(b.f));

                          // Greedy lane assignment — 10 lanes: 5 above + 5 below
                          // Handles Oct-Nov 2026 cluster with 10 items including same-date pairs
                          const STEP = 30; // px between lane levels
                          const GAP  = 44; // min horizontal clearance between same-lane labels
                          const lanes = [
                            { above: true,  off: 1 * STEP, lastX: -999 },
                            { above: false, off: 1 * STEP, lastX: -999 },
                            { above: true,  off: 2 * STEP, lastX: -999 },
                            { above: false, off: 2 * STEP, lastX: -999 },
                            { above: true,  off: 3 * STEP, lastX: -999 },
                            { above: false, off: 3 * STEP, lastX: -999 },
                            { above: true,  off: 4 * STEP, lastX: -999 },
                            { above: false, off: 4 * STEP, lastX: -999 },
                            { above: true,  off: 5 * STEP, lastX: -999 },
                            { above: false, off: 5 * STEP, lastX: -999 },
                          ];
                          const placed = sorted.map(ms => {
                            const cx = ovX(ms.f);
                            const r = ms.key ? 6 : 4.5;
                            const lane = lanes.find(l => cx - l.lastX >= GAP) ?? lanes[0];
                            lane.lastX = cx;
                            const stem = lane.above ? OV_LY - r - 6 : OV_LY + r + 6;
                            const dateY = lane.above ? stem - lane.off + 14 : stem + lane.off - 14;
                            const labelY = lane.above ? stem - lane.off : stem + lane.off;
                            return { ms, cx, r, lane, stem, dateY, labelY };
                          });

                          return (
                            <div
                              ref={el => { if (el && !el._scrolled) { el._scrolled = true; el.scrollLeft = Math.max(0, ovToday - el.clientWidth * 0.35); } }}
                              style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'grab' }}
                            >
                              <svg width={OV_W} height={OV_H} style={{ display: 'block' }}>
                                {ovTicks.map(t => <line key={t.label} x1={t.x} y1={10} x2={t.x} y2={OV_H - 22} stroke="#f1f5f9" strokeWidth={1} />)}
                                <line x1={ovToday} y1={0} x2={ovToday} y2={OV_H} stroke="#ef4444" strokeWidth={1.5} opacity={0.65} />
                                <text x={ovToday + 4} y={14} fontSize={11} fontWeight={800} fill="#ef4444">Today</text>
                                <line x1={OV_PAD} y1={OV_LY} x2={OV_W - OV_PAD} y2={OV_LY} stroke="#cbd5e1" strokeWidth={2} />
                                {ovTicks.map(t => (
                                  <React.Fragment key={t.label + 'ov'}>
                                    <line x1={t.x} y1={OV_LY - 5} x2={t.x} y2={OV_LY + 5} stroke="#94a3b8" strokeWidth={1} />
                                    <text x={t.x} y={OV_H - 6} fontSize={11} fontWeight={600} fill="#94a3b8" textAnchor="middle">{t.label}</text>
                                  </React.Fragment>
                                ))}
                                {placed.map(({ ms, cx, r, lane, stem, dateY, labelY }) => {
                                  const days = Math.round((new Date(ms.f) - nowOv) / 86400000);
                                  const col = ms.done ? '#16a34a' : days < 0 ? '#dc2626' : days <= 60 ? '#dc2626' : days <= 180 ? '#b45309' : '#f59e0b';
                                  const anchor = cx < OV_PAD + 30 ? 'start' : cx > OV_W - OV_PAD - 30 ? 'end' : 'middle';
                                  return (
                                    <React.Fragment key={ms.id + 'ov'}>
                                      <line x1={cx} y1={lane.above ? OV_LY - r : OV_LY + r} x2={cx} y2={stem} stroke={col} strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
                                      <circle cx={cx} cy={OV_LY} r={r} fill={col} opacity={ms.done ? 1 : 0.9} />
                                      {ms.done && <text x={cx} y={OV_LY + 4} fontSize={6.5} fill="#fff" fontWeight={900} textAnchor="middle">✓</text>}
                                      <text x={cx} y={labelY} fontSize={11} fontWeight={800} fill={col} textAnchor={anchor}>{ms.id}</text>
                                      <text x={cx} y={dateY} fontSize={9.5} fill="#64748b" textAnchor={anchor}>
                                        {new Date(ms.f).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                      </text>
                                    </React.Fragment>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── XY Staggered Chart ── */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          Activity Detail — XY Staggered · Nov 2024 to Sep 2027
                        </div>
                        {(() => {
                          const _msSource = _MS; // already API-aware (msData ?? MS_DATA)
                          const allMs = [..._msSource].sort((a, b) => new Date(a.f) - new Date(b.f));
                          const MS_ROW_H = 20;
                          const MS_TOP_PAD = 44;
                          const MS_Y_W = 80;
                          const MS_SCROLL_W = 2400;
                          const MS_CH = MS_TOP_PAD + allMs.length * MS_ROW_H + 10;
                          const MS_VS = new Date('2024-10-01').getTime();
                          const MS_VE = new Date('2027-10-01').getTime();
                          const MS_VSPAN = MS_VE - MS_VS;
                          const msToX = (iso) => Math.max(0, Math.min(MS_SCROLL_W - 10, ((new Date(iso).getTime() - MS_VS) / MS_VSPAN) * (MS_SCROLL_W - 10)));
                          const MS_TODAY_X = msToX(new Date().toISOString());
                          const nowMs = new Date(); nowMs.setHours(0, 0, 0, 0);
                          const msdu = (iso) => Math.round((new Date(iso) - nowMs) / 86400000);
                          const msTicks = [];
                          for (let yr = 2024; yr <= 2027; yr++) {
                            for (let mo = 0; mo < 12; mo++) {
                              const t = new Date(yr, mo, 1);
                              if (t.getTime() < MS_VS || t.getTime() > MS_VE) continue;
                              msTicks.push({ x: msToX(t.toISOString()), label: t.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), isQ: mo % 3 === 0 });
                            }
                          }
                          return (
                            <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
                              {/* Fixed Y-axis panel */}
                              <div style={{ flexShrink: 0, width: MS_Y_W, borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <svg width={MS_Y_W} height={MS_CH} style={{ display: 'block' }}>
                                  <rect x={0} y={0} width={MS_Y_W} height={MS_TOP_PAD} fill="#f8fafc" />
                                  <text x={MS_Y_W - 8} y={MS_TOP_PAD - 10} fontSize={11} fontWeight={700} fill="#94a3b8" textAnchor="end">ID</text>
                                  {allMs.map((ms, i) => {
                                    const cy = MS_TOP_PAD + i * MS_ROW_H + MS_ROW_H / 2;
                                    const days = msdu(ms.f);
                                    const col = ms.done ? '#16a34a' : days < 0 ? '#dc2626' : days <= 60 ? '#dc2626' : days <= 180 ? '#b45309' : '#F59E0B';
                                    const apiMs = msData?.find(m => m.id === ms.id);
                                    return (
                                      <g key={ms.id + 'ya'}
                                        onMouseEnter={(e) => setXyTooltip({
                                          x: e.clientX, y: e.clientY,
                                          id: ms.id,
                                          name: apiMs?.label ?? ms.label,
                                          category: apiMs?.category ?? '',
                                          color: col,
                                          description: apiMs?.description ?? '',
                                          fields: [
                                            { label: 'Forecast Finish', value: new Date(ms.f).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), tone: 'neutral' },
                                            ms.done
                                              ? { label: 'Status', value: '✓ Achieved', tone: 'green' }
                                              : { label: 'Status', value: days < 0 ? `${Math.abs(days)}d overdue` : `${days}d away`, tone: days < 0 ? 'red' : days <= 60 ? 'red' : 'amber' },
                                            ...(apiMs?.variance_days != null ? [{ label: 'Variance', value: `${apiMs.variance_days > 0 ? '+' : ''}${apiMs.variance_days}d`, tone: apiMs.variance_days > 30 ? 'red' : apiMs.variance_days > 0 ? 'amber' : 'green' }] : []),
                                            ...(apiMs?.early_finish && apiMs.early_finish !== ms.f ? [{ label: 'Early Finish', value: new Date(apiMs.early_finish).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), tone: 'neutral' }] : []),
                                            ...(apiMs?.responsible ? [{ label: 'Responsible', value: apiMs.responsible, tone: 'neutral' }] : []),
                                          ],
                                        })}
                                        onMouseMove={(e) => setXyTooltip(p => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                                        onMouseLeave={() => setXyTooltip(null)}
                                        style={{ cursor: 'default' }}>
                                        <rect x={0} y={MS_TOP_PAD + i * MS_ROW_H} width={MS_Y_W} height={MS_ROW_H} fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
                                        <text x={MS_Y_W - 8} y={cy + 4.5} fontSize={12} fontWeight={700} fill={col} textAnchor="end">{ms.id}</text>
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>
                              {/* Scrollable plot panel */}
                              <div
                                ref={(el) => { if (el && !el._scrolled) { el._scrolled = true; el.scrollLeft = Math.max(0, MS_TODAY_X - el.clientWidth * 0.35); } }}
                                style={{ overflowX: 'auto', flex: 1, cursor: 'grab' }}
                              >
                                <svg width={MS_SCROLL_W} height={MS_CH} style={{ display: 'block' }}>
                                  {allMs.map((_, i) => (
                                    <rect key={'msbg' + i} x={0} y={MS_TOP_PAD + i * MS_ROW_H} width={MS_SCROLL_W} height={MS_ROW_H} fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
                                  ))}
                                  {msTicks.map(t => (
                                    <line key={t.label + 'g'} x1={t.x} y1={MS_TOP_PAD} x2={t.x} y2={MS_CH} stroke={t.isQ ? '#e8edf2' : '#f3f4f6'} strokeWidth={t.isQ ? 1 : 0.5} />
                                  ))}
                                  <line x1={MS_TODAY_X} y1={0} x2={MS_TODAY_X} y2={MS_CH} stroke="#ef4444" strokeWidth={2} opacity={0.7} />
                                  <rect x={0} y={0} width={MS_SCROLL_W} height={MS_TOP_PAD} fill="#f8fafc" />
                                  <line x1={0} y1={MS_TOP_PAD} x2={MS_SCROLL_W} y2={MS_TOP_PAD} stroke="#e2e8f0" strokeWidth={1} />
                                  {msTicks.filter(t => t.isQ).map(t => (
                                    <React.Fragment key={t.label + 'tk'}>
                                      <line x1={t.x} y1={MS_TOP_PAD - 6} x2={t.x} y2={MS_TOP_PAD + 3} stroke="#d1d5db" strokeWidth={1} />
                                      <text x={t.x} y={MS_TOP_PAD - 11} fontSize={13} fontWeight={700} fill="#374151" textAnchor="middle">{t.label}</text>
                                    </React.Fragment>
                                  ))}
                                  <text x={MS_TODAY_X + 4} y={18} fontSize={12} fontWeight={800} fill="#ef4444">Today</text>
                                  {allMs.map((ms, i) => {
                                    const cy = MS_TOP_PAD + i * MS_ROW_H + MS_ROW_H / 2;
                                    const cx = msToX(ms.f);
                                    const days = msdu(ms.f);
                                    const col = ms.done ? '#16a34a' : days < 0 ? '#dc2626' : days <= 60 ? '#dc2626' : days <= 180 ? '#b45309' : '#F59E0B';
                                    const r = ms.key ? 6 : 4.5;
                                    return (
                                      <React.Fragment key={ms.id + 'dot' + i}>
                                        <circle cx={cx} cy={cy} r={r} fill={col} opacity={ms.done ? 1 : 0.9} />
                                        {ms.done && <text x={cx} y={cy + 4} fontSize={8} fill="#fff" fontWeight={900} textAnchor="middle">✓</text>}
                                        <text x={cx + r + 5} y={cy + 4.5} fontSize={11} fontWeight={500} fill="#374151" textAnchor="start">
                                          {new Date(ms.f).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </text>
                                      </React.Fragment>
                                    );
                                  })}
                                </svg>
                              </div>
                            </div>
                          );
                        })()}
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                          {[
                            { col: '#16a34a', label: 'Achieved' },
                            { col: '#F59E0B', label: 'Upcoming' },
                            { col: '#dc2626', label: 'Overdue / within 60 days' },
                          ].map(({ col, label }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col }} />
                              <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 2, height: 14, background: '#ef4444' }} />
                            <span style={{ fontSize: 11, color: '#64748b' }}>Today — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quarter-grouped upcoming */}
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                        Upcoming by Month — {upcoming.length} milestones
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                        {quarterGroups.map(([qLabel, qMs]) => (
                          <div key={qLabel}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', background: '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>{qLabel}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>{qMs.length} milestone{qMs.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {qMs.map(ms => {
                                const days = daysUntil(ms.f);
                                const col  = days < 0 ? '#dc2626' : days <= 60 ? '#dc2626' : days <= 180 ? '#b45309' : '#F59E0B';
                                return (
                                  <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: col, background: `${col}15`, border: `1px solid ${col}40`, padding: '2px 7px', borderRadius: 6, flexShrink: 0, minWidth: 38, textAlign: 'center' }}>{ms.id}</span>
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.label}</span>
                                    <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{fmtDate(ms.f)}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: col, flexShrink: 0, minWidth: 58, textAlign: 'right' }}>{days < 0 ? `${Math.abs(days)}d late` : `${days}d away`}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* ── 4. Achieved (collapsible) ── */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Achieved — {achieved.length} completed
                </div>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #dcfce7' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px', gap: 8, padding: '6px 12px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                    {['Date', 'Milestone', 'ID'].map(h => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                    ))}
                  </div>
                  {visibleAchieved.map((ms, idx) => (
                    <div key={ms.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px', gap: 8, padding: '9px 12px', background: idx % 2 === 0 ? '#ffffff' : '#f9fffe', borderBottom: idx < visibleAchieved.length - 1 ? '1px solid #f0fdf4' : 'none', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{fmtDate(ms.f)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '2px 7px', borderRadius: 6, width: 'fit-content' }}>✓ {ms.id}</span>
                    </div>
                  ))}
                </div>
                {achieved.length > 3 && (
                  <button type="button" onClick={() => setMsExpanded(v => !v)}
                    style={{ marginTop: 6, width: '100%', padding: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {msExpanded ? '▲ Collapse' : `▼ Show ${achieved.length - 3} more achieved`}
                  </button>
                )}
              </section>
            );
          })()}

          {activeSection === 'cp' && (() => {
            const delayMap = {};
            deviationActivities.forEach(a => { if (a.activity_id) delayMap[a.activity_id] = a.days_overdue ?? 0; });

            // All 23 CP (LF) flagged activities from SCHEDULE -EPC BOROUGE.xlsx (col K = "CP")
            // bl = baseline duration days (early_finish - early_start), cu = current duration (finish - start)
            // vd = finish variance days (forecast_finish - early_finish)
            const CP = [
              { id: '76.D',            name: 'FG Compressor — Delivery',                              cat: 'P', bl: null, cu: null, vd: 111, cf: '22 Jun 2026'  },
              { id: 'A62300',          name: 'Feed Gas Compressor (Baseplate, Gear, Gas Seal)',       cat: 'P', bl: null, cu: null, vd: 111, cf: '22 Jun 2026'  },
              { id: 'C1000',           name: 'FG Foundation Check & Dimensional Examination',        cat: 'C', bl: 16,   cu: 7,   vd: 74,  cf: '22 Jun 2026'  },
              { id: 'C1001',           name: 'Installation of FG Compressor (Setting, Leveling)',    cat: 'C', bl: 13,   cu: 13,  vd: 62,  cf: '19 Jul 2026'  },
              { id: 'C1002',           name: 'Setting of FG Compressor Base Plate',                  cat: 'C', bl: 23,   cu: 7,   vd: 62,  cf: '5 Jul 2026'   },
              { id: 'A17810',          name: 'Compressors Area — Steel Structure Erection',          cat: 'C', bl: 114,  cu: 114, vd: 62,  cf: '11 Nov 2026'  },
              { id: 'A17820',          name: 'Pipe Rack SR81 — Structure Installation',              cat: 'C', bl: 74,   cu: 74,  vd: 62,  cf: '11 Nov 2026'  },
              { id: 'A23500',          name: 'Piping Platforms',                                      cat: 'C', bl: 29,   cu: 29,  vd: 62,  cf: '11 Nov 2026'  },
              { id: 'C1007',           name: 'Installation of Piping — FG Compressor',               cat: 'C', bl: 51,   cu: 52,  vd: 62,  cf: '3 Jan 2027'   },
              { id: 'C1139',           name: 'Installation of Piping — OG Compressor',               cat: 'C', bl: 40,   cu: 40,  vd: 62,  cf: '2 Jan 2027'   },
              { id: 'C1008',           name: 'E&I Installation — FG Compressor',                     cat: 'C', bl: 45,   cu: 45,  vd: 62,  cf: '20 Jan 2027'  },
              { id: 'C1149',           name: 'E&I Installation — OG Compressor',                     cat: 'C', bl: 41,   cu: 41,  vd: 62,  cf: '9 Jan 2027'   },
              { id: 'C1009',           name: 'Punch List Close Out — FG Compressor',                 cat: 'C', bl: 10,   cu: 11,  vd: 62,  cf: '1 Feb 2027'   },
              { id: 'C1159',           name: 'Punch List Close Out — OG Compressor',                 cat: 'C', bl: 15,   cu: 15,  vd: 62,  cf: '24 Jan 2027'  },
              { id: 'C1010',           name: 'Flushing / Airblowing and inspection of piping',       cat: 'C', bl: 17,   cu: 16,  vd: 61,  cf: '18 Feb 2027'  },
              { id: 'C1011',           name: 'Lube Oil Flushing',                                     cat: 'C', bl: 11,   cu: 11,  vd: 62,  cf: '13 Feb 2027'  },
              { id: 'C1013',           name: 'Final compressor / driver alignment',                   cat: 'C', bl: 20,   cu: 20,  vd: 62,  cf: '6 Mar 2027'   },
              { id: 'C1014',           name: 'Pre-commissioning punchlist clearing',                  cat: 'C', bl: 16,   cu: 16,  vd: 62,  cf: '23 Mar 2027'  },
              { id: 'A1-PM-PKM-0002',  name: 'Mechanical Completion (MC)',                           cat: 'M', bl: null, cu: null, vd: 62,  cf: '23 Mar 2027'  },
              { id: 'A1-PM-PKM-0003',  name: 'Ready for Start-up (RFSU)',                            cat: 'M', bl: null, cu: null, vd: 62,  cf: '22 Jun 2027'  },
              { id: 'A61440',          name: 'Main Scope As-Built',                                   cat: 'C', bl: 83,   cu: 83,  vd: 62,  cf: '14 Sep 2027'  },
              { id: 'A1-PM-PKM-0004',  name: 'Provisional Acceptance Certificate (PAC)',             cat: 'M', bl: null, cu: null, vd: 62,  cf: '20 Sep 2027'  },
              { id: 'A1-PM-CMM-0005',  name: '144.F-Provisional Acceptance Certificate',             cat: 'M', bl: null, cu: null, vd: 62,  cf: '20 Sep 2027'  },
            ];
            // Unified CP source: API data takes priority, falls back to hardcoded CP
            const _cpSource = cpData
              ? cpData.map(a => ({ id: a.id, name: a.name, cat: a.category, bl: a.baseline_duration, cu: a.current_duration, vd: a.variance_days, cf: a.forecast_finish }))
              : CP;

            const MAX_SLIP = Math.max(..._cpSource.map(a => a.vd));
            const MAX_BL = Math.max(..._cpSource.filter(a => a.bl != null).map(a => a.bl), 1);
            const CAT_META = {
              P: { label: 'Procurement',  color: '#2563EB', bg: '#eff6ff', border: '#bfdbfe' },
              C: { label: 'Construction', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
              M: { label: 'Milestone',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            };

            return (
              <section className="glass-card analytics-card">
                <SectionHeader eyebrow="Critical Path" title="Critical Path Activities" subtitle={`${_cpSource.length} CP (LF) activities · April 2026 schedule baseline · slip = days the forecast finish moved past baseline`} />

                {/* ── Month-wise CP activity timeline ── */}
                {(() => {
                  const CP_VIEW_START = new Date('2026-01-01').getTime();
                  const CP_VIEW_END   = new Date('2027-10-01').getTime();
                  const CP_VIEW_SPAN  = CP_VIEW_END - CP_VIEW_START;
                  const CP_CW = 2400;
                  const LINE_Y = 108;

                  const parseFinish = (s) => {
                    if (!s) return 0;
                    const str = s.trim();
                    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str).getTime();
                    const parts = str.split(' ');
                    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
                    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0])).getTime();
                  };
                  const toPx = (ms) => Math.max(0, Math.min(CP_CW, ((ms - CP_VIEW_START) / CP_VIEW_SPAN) * CP_CW));
                  const TODAY_PX = toPx(new Date().setHours(0,0,0,0));

                  const gridLines = [];
                  for (let yr = 2026; yr <= 2027; yr++) {
                    for (let mo = 0; mo < 12; mo++) {
                      const t = new Date(yr, mo, 1).getTime();
                      if (t < CP_VIEW_START || t > CP_VIEW_END) continue;
                      gridLines.push({ x: toPx(t), label: new Date(yr, mo, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), isQ: mo % 3 === 0 });
                    }
                  }

                  // _cpSource is defined in outer scope — sort it for the chart
                  const sortedCp = [..._cpSource].sort((a, b) => parseFinish(a.cf) - parseFinish(b.cf));
                  const CP_ROW_H = 20;
                  const CP_TOP_PAD = 44;
                  const CP_Y_W = 120;
                  const CP_SCROLL_W = 2400;
                  const CP_CHART_H = CP_TOP_PAD + CP.length * CP_ROW_H + 10;
                  const toXcp = (ts) => Math.max(0, Math.min(CP_SCROLL_W - 10, ((ts - CP_VIEW_START) / CP_VIEW_SPAN) * (CP_SCROLL_W - 10)));
                  const TODAY_X_CP = toXcp(new Date().setHours(0, 0, 0, 0));
                  const cpXyTicks = [];
                  for (let yr = 2026; yr <= 2027; yr++) {
                    for (let mo = 0; mo < 12; mo++) {
                      const t = new Date(yr, mo, 1).getTime();
                      if (t < CP_VIEW_START || t > CP_VIEW_END) continue;
                      cpXyTicks.push({ x: toXcp(t), label: new Date(yr, mo, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), isQ: mo % 3 === 0 });
                    }
                  }

                  return (
                    <div style={{ marginBottom: 22 }}>
                      {/* ── CP Horizontal Overview ── */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          CP Schedule Overview — Jan 2026 to Oct 2027
                        </div>
                        {(() => {
                          const OV_W = 2800; const OV_H = 320; const OV_LY = 160;
                          const OV_PAD = 36; const OV_PLOT = OV_W - OV_PAD * 2;
                          const ovX = ts => OV_PAD + Math.max(0, Math.min(OV_PLOT, ((ts - CP_VIEW_START) / CP_VIEW_SPAN) * OV_PLOT));
                          const ovToday = ovX(new Date().setHours(0,0,0,0));
                          const ovTicks = [];
                          for (let yr = 2026; yr <= 2027; yr++) for (let mo = 0; mo < 12; mo += 3) {
                            const t = new Date(yr, mo, 1).getTime();
                            if (t < CP_VIEW_START || t > CP_VIEW_END) continue;
                            ovTicks.push({ x: ovX(t), label: new Date(yr, mo, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) });
                          }

                          // Greedy lane assignment — 10 lanes (5 above + 5 below)
                          // Handles same-date clusters: A17810/A17820/A23500 (11 Nov), C1014/MC (23 Mar)
                          const CP_STEP = 26; const CP_GAP = 48;
                          const cpLanes = [
                            { above: true,  off: 1 * CP_STEP, lastX: -999 },
                            { above: false, off: 1 * CP_STEP, lastX: -999 },
                            { above: true,  off: 2 * CP_STEP, lastX: -999 },
                            { above: false, off: 2 * CP_STEP, lastX: -999 },
                            { above: true,  off: 3 * CP_STEP, lastX: -999 },
                            { above: false, off: 3 * CP_STEP, lastX: -999 },
                            { above: true,  off: 4 * CP_STEP, lastX: -999 },
                            { above: false, off: 4 * CP_STEP, lastX: -999 },
                            { above: true,  off: 5 * CP_STEP, lastX: -999 },
                            { above: false, off: 5 * CP_STEP, lastX: -999 },
                          ];
                          const cpPlaced = [...sortedCp].sort((a, b) => parseFinish(a.cf) - parseFinish(b.cf)).map(act => {
                            const cx = ovX(parseFinish(act.cf));
                            const r = act.cat === 'M' ? 7 : 5.5;
                            const lane = cpLanes.find(l => cx - l.lastX >= CP_GAP) ?? cpLanes[0];
                            lane.lastX = cx;
                            const stem = lane.above ? OV_LY - r - 6 : OV_LY + r + 6;
                            const dateY  = lane.above ? stem - lane.off + 15 : stem + lane.off - 15;
                            const labelY = lane.above ? stem - lane.off : stem + lane.off;
                            return { act, cx, r, lane, stem, dateY, labelY };
                          });

                          return (
                            <div
                              ref={el => { if (el && !el._scrolled) { el._scrolled = true; el.scrollLeft = Math.max(0, ovToday - el.clientWidth * 0.35); } }}
                              style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'grab' }}
                            >
                              <svg width={OV_W} height={OV_H} style={{ display: 'block' }}>
                                {ovTicks.map(t => <line key={t.label} x1={t.x} y1={10} x2={t.x} y2={OV_H - 22} stroke="#f1f5f9" strokeWidth={1} />)}
                                <line x1={ovToday} y1={0} x2={ovToday} y2={OV_H} stroke="#ef4444" strokeWidth={1.5} opacity={0.65} />
                                <text x={ovToday + 4} y={14} fontSize={11} fontWeight={800} fill="#ef4444">Today</text>
                                <line x1={OV_PAD} y1={OV_LY} x2={OV_W - OV_PAD} y2={OV_LY} stroke="#cbd5e1" strokeWidth={2} />
                                {ovTicks.map(t => (
                                  <React.Fragment key={t.label + 'cov'}>
                                    <line x1={t.x} y1={OV_LY - 5} x2={t.x} y2={OV_LY + 5} stroke="#94a3b8" strokeWidth={1} />
                                    <text x={t.x} y={OV_H - 6} fontSize={11} fontWeight={600} fill="#94a3b8" textAnchor="middle">{t.label}</text>
                                  </React.Fragment>
                                ))}
                                {cpPlaced.map(({ act, cx, r, lane, stem, dateY, labelY }) => {
                                  const meta = CAT_META[act.cat] ?? { color: '#64748b' };
                                  const anchor = cx < OV_PAD + 30 ? 'start' : cx > OV_W - OV_PAD - 30 ? 'end' : 'middle';
                                  const shortId = act.id.length > 12 ? act.id.slice(0, 12) : act.id;
                                  return (
                                    <React.Fragment key={act.id + 'cov'}>
                                      <line x1={cx} y1={lane.above ? OV_LY - r : OV_LY + r} x2={cx} y2={stem} stroke={meta.color} strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
                                      <circle cx={cx} cy={OV_LY} r={r} fill={meta.color} opacity={0.9} />
                                      {act.cat === 'M' && <text x={cx} y={OV_LY + 4} fontSize={6.5} fill="#fff" fontWeight={900} textAnchor="middle">M</text>}
                                      <text x={cx} y={labelY} fontSize={11} fontWeight={800} fill={meta.color} textAnchor={anchor}>{shortId}</text>
                                      <text x={cx} y={dateY} fontSize={9.5} fill="#64748b" textAnchor={anchor}>{act.cf}</text>
                                    </React.Fragment>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── CP XY Staggered Chart ── */}
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        CP Activity XY Chart — Jan 2026 to Oct 2027
                      </div>
                      <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
                        {/* Fixed Y-axis panel */}
                        <div style={{ flexShrink: 0, width: CP_Y_W, borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <svg width={CP_Y_W} height={CP_CHART_H} style={{ display: 'block' }}>
                            <rect x={0} y={0} width={CP_Y_W} height={CP_TOP_PAD} fill="#f8fafc" />
                            <text x={CP_Y_W - 8} y={CP_TOP_PAD - 10} fontSize={11} fontWeight={700} fill="#94a3b8" textAnchor="end">ID</text>
                            {sortedCp.map((act, i) => {
                              const meta = CAT_META[act.cat] ?? { color: '#64748b', label: 'Unknown', bg: '#f8fafc', border: '#e2e8f0' };
                              const cy = CP_TOP_PAD + i * CP_ROW_H + CP_ROW_H / 2;
                              return (
                                <g key={act.id + 'ya'}
                                  onMouseEnter={(e) => {
                                    const apiAct = cpData?.find(a => a.id === act.id);
                                    const blDt = new Date(act.cf); blDt.setDate(blDt.getDate() - act.vd);
                                    const blLabel = blDt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const durChg = act.bl !== null && act.cu !== null && act.bl !== act.cu;
                                    setXyTooltip({
                                      x: e.clientX, y: e.clientY,
                                      id: act.id,
                                      name: act.name,
                                      category: meta.label,
                                      color: meta.color,
                                      description: apiAct?.description ?? '',
                                      fields: [
                                        { label: 'Forecast Finish', value: act.cf, tone: 'neutral' },
                                        { label: 'Baseline Finish', value: blLabel, tone: 'neutral' },
                                        { label: 'Schedule Slip', value: `+${act.vd}d`, tone: act.vd >= 100 ? 'red' : act.vd >= 62 ? 'amber' : 'neutral' },
                                        ...(durChg ? [{ label: 'Duration', value: `${act.bl}d → ${act.cu}d`, tone: act.cu < act.bl ? 'green' : 'amber' }] : []),
                                        { label: 'Float', value: `${apiAct?.float_days ?? 0}d`, tone: (apiAct?.float_days ?? 0) === 0 ? 'red' : (apiAct?.float_days ?? 0) <= 3 ? 'amber' : 'green' },
                                        ...(apiAct?.responsible ? [{ label: 'Responsible', value: apiAct.responsible, tone: 'neutral' }] : []),
                                        ...(apiAct?.risk_level ? [{ label: 'Risk', value: apiAct.risk_level.toUpperCase(), tone: apiAct.risk_level === 'critical' ? 'red' : apiAct.risk_level === 'high' ? 'amber' : 'neutral' }] : []),
                                      ],
                                    });
                                  }}
                                  onMouseMove={(e) => setXyTooltip(p => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                                  onMouseLeave={() => setXyTooltip(null)}
                                  style={{ cursor: 'default' }}>
                                  <rect x={0} y={CP_TOP_PAD + i * CP_ROW_H} width={CP_Y_W} height={CP_ROW_H} fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
                                  <text x={CP_Y_W - 8} y={cy + 4.5} fontSize={12} fontWeight={700} fill={meta.color} textAnchor="end">
                                    {act.id.length > 14 ? act.id.slice(0, 14) : act.id}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        {/* Scrollable plot panel */}
                        <div
                          ref={(el) => { if (el && !el._scrolled) { el._scrolled = true; el.scrollLeft = Math.max(0, TODAY_X_CP - el.clientWidth * 0.35); } }}
                          style={{ overflowX: 'auto', flex: 1, cursor: 'grab' }}
                        >
                          <svg width={CP_SCROLL_W} height={CP_CHART_H} style={{ display: 'block' }}>
                            {sortedCp.map((_, i) => (
                              <rect key={'cpbg' + i} x={0} y={CP_TOP_PAD + i * CP_ROW_H} width={CP_SCROLL_W} height={CP_ROW_H} fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'} />
                            ))}
                            {cpXyTicks.map(t => (
                              <line key={t.label + 'g'} x1={t.x} y1={CP_TOP_PAD} x2={t.x} y2={CP_CHART_H} stroke={t.isQ ? '#e8edf2' : '#f3f4f6'} strokeWidth={t.isQ ? 1 : 0.5} />
                            ))}
                            <line x1={TODAY_X_CP} y1={0} x2={TODAY_X_CP} y2={CP_CHART_H} stroke="#ef4444" strokeWidth={2} opacity={0.7} />
                            <rect x={0} y={0} width={CP_SCROLL_W} height={CP_TOP_PAD} fill="#f8fafc" />
                            <line x1={0} y1={CP_TOP_PAD} x2={CP_SCROLL_W} y2={CP_TOP_PAD} stroke="#e2e8f0" strokeWidth={1} />
                            {cpXyTicks.filter(t => t.isQ).map(t => (
                              <React.Fragment key={t.label + 'tk'}>
                                <line x1={t.x} y1={CP_TOP_PAD - 6} x2={t.x} y2={CP_TOP_PAD + 3} stroke="#d1d5db" strokeWidth={1} />
                                <text x={t.x} y={CP_TOP_PAD - 11} fontSize={13} fontWeight={700} fill="#374151" textAnchor="middle">{t.label}</text>
                              </React.Fragment>
                            ))}
                            <text x={TODAY_X_CP + 4} y={18} fontSize={12} fontWeight={800} fill="#ef4444">Today</text>
                            {sortedCp.map((act, i) => {
                              const meta = CAT_META[act.cat] ?? { color: '#64748b', label: 'Unknown', bg: '#f8fafc', border: '#e2e8f0' };
                              const cy = CP_TOP_PAD + i * CP_ROW_H + CP_ROW_H / 2;
                              const cx = toXcp(parseFinish(act.cf));
                              const r = act.cat === 'M' ? 7 : 5;
                              return (
                                <React.Fragment key={act.id + 'dot' + i}>
                                  <circle cx={cx} cy={cy} r={r} fill={meta.color} opacity={0.9} />
                                  {act.cat === 'M' && (
                                    <text x={cx} y={cy + 4} fontSize={7} fill="#fff" fontWeight={900} textAnchor="middle">M</text>
                                  )}
                                  <text x={cx + r + 5} y={cy + 4.5} fontSize={11} fontWeight={500} fill="#374151" textAnchor="start">{act.cf}</text>
                                </React.Fragment>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        {Object.entries(CAT_META).map(([k, m]) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                            <span style={{ fontSize: 11, color: '#64748b' }}>{m.label}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 2, height: 12, background: '#ef4444' }} />
                          <span style={{ fontSize: 11, color: '#64748b' }}>Today</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Summary chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Activities on CP',   value: `${CP.length}`,  sub: 'Late Finish (LF) flagged',        color: '#475569' },
                    { label: 'Worst slip',          value: '+111d',          sub: 'FG/OG Compressor delivery',       color: '#dc2626' },
                    { label: 'Common slip',         value: '+62d',           sub: 'Most construction activities',    color: '#b45309' },
                    { label: 'Impact on MC',        value: '+62d',           sub: 'Jan 20 → Mar 23, 2027',           color: '#7c3aed' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Column header */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 160px 72px', gap: 12, padding: '5px 14px 8px', borderBottom: '2px solid #f1f5f9', marginBottom: 4 }}>
                  {['ID', 'Activity', 'Forecast Finish', 'Schedule Slip', 'Delay'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                  ))}
                </div>

                {/* Category groups */}
                {['P','C','M'].map(catKey => {
                  const meta  = CAT_META[catKey];
                  const items = _cpSource.filter(a => a.cat === catKey);
                  if (!items.length) return null;
                  return (
                    <div key={catKey} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: meta.bg, borderRadius: 8, marginBottom: 2, border: `1px solid ${meta.border}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</span>
                        <span style={{ fontSize: 10, color: meta.color, opacity: 0.7 }}>{items.length} activit{items.length !== 1 ? 'ies' : 'y'}</span>
                      </div>
                      <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: `1px solid ${meta.border}`, borderTop: 'none' }}>
                        {items.map((act, idx) => {
                          const slipPct       = Math.min((act.vd / MAX_SLIP) * 100, 100);
                          const durationChgd  = act.bl !== null && act.cu !== null && act.bl !== act.cu;
                          const slipColor     = act.vd >= 100 ? '#dc2626' : act.vd >= 70 ? '#b45309' : '#f59e0b';
                          const daysLate      = delayMap[act.id];
                          const isDelayed     = daysLate !== undefined && daysLate > 0;
                          const baselineDt    = new Date(act.cf);
                          baselineDt.setDate(baselineDt.getDate() - act.vd);
                          const baselineLabel = baselineDt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <div key={act.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 160px 72px', gap: 12, padding: '10px 14px', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: idx < items.length - 1 ? `1px solid ${meta.border}` : 'none', alignItems: 'center' }}>
                              {/* ID */}
                              <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, lineHeight: 1.3 }}>{act.id}</span>
                              {/* Full name */}
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.4 }}>{act.name}</span>
                              {/* Forecast finish */}
                              <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{act.cf}</span>
                              {/* Slip bar */}
                              <div>
                                <div style={{ height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: durationChgd ? 3 : 2 }}>
                                  <div style={{ height: '100%', width: `${slipPct}%`, background: slipColor, borderRadius: 4, minWidth: 4 }} />
                                </div>
                                {durationChgd && (
                                  <>
                                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
                                      <div style={{ height: '100%', width: `${Math.min((act.bl / MAX_BL) * 100, 100)}%`, background: '#64748b', borderRadius: 3, minWidth: 3 }} />
                                    </div>
                                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
                                      <div style={{ height: '100%', width: `${Math.min((act.cu / MAX_BL) * 100, 100)}%`, background: slipColor, borderRadius: 3, minWidth: 3 }} />
                                    </div>
                                  </>
                                )}
                                <div style={{ fontSize: 10, color: '#374151', marginTop: 2, fontWeight: 600 }}>
                                  {durationChgd
                                    ? `Duration: ${act.bl}d → ${act.cu}d · was due ${baselineLabel}`
                                    : `Was due: ${baselineLabel}`}
                                </div>
                              </div>
                              {/* Days late */}
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: slipColor }}>+{act.vd}d</span>
                                {_hasDevDB && daysLate !== undefined && (
                                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: isDelayed ? '#dc2626' : '#15803d' }}>
                                    {isDelayed ? `live +${daysLate}d` : '✓ tracked'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  <strong>Root cause:</strong> FG Compressor delivery slipped +111d, driving all downstream construction into a +62d chain delay that pushes MC from Jan 20 to Mar 23, 2027.
                </div>
                {!_hasDevDB && (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>Upload a monthly progress file to show live delay status per activity.</p>
                )}
              </section>
            );
          })()}

          {/* <section className="dashboard-grid dashboard-grid-primary">
            <article className="glass-card analytics-card analytics-card-wide">
              <SectionHeader
                eyebrow="Operational View"
                title="Activity Status Performance"
                subtitle={`${activeMonth} status mix across ${d.totalActivities.toLocaleString()} activities`}
              />
              <div className="stats-stack">
                {statusData.map((item) => {
                  const isExpanded = expandedStat === item.name;
                  const isNotStarted = item.name === "Not Started";

                  const handleClick = () => {
                    const next = isExpanded ? null : item.name;
                    setExpandedStat(next);
                    if (next === "Not Started" && notStartedActivities === null && !notStartedLoading) {
                      setNotStartedLoading(true);
                      api.get('/reports/not-started-activities')
                        .then(({ data: json }) => setNotStartedActivities(json?.activities ?? []))
                        .catch(() => setNotStartedActivities([]))
                        .finally(() => setNotStartedLoading(false));
                    }
                  };

                  return (
                    <React.Fragment key={item.name}>
                      <ProgressStat
                        name={item.name}
                        value={item.value}
                        total={d.totalActivities}
                        color={item.fill}
                        expanded={isExpanded}
                        onClick={handleClick}
                      />
                      {isExpanded && (
                        isNotStarted ? (
                          <div style={{
                            margin: "2px 0 10px 18px",
                            padding: "10px 14px",
                            background: "#f8fafc",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                              Not Started Activities
                            </span>
                            {notStartedLoading ? (
                              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Loading…</p>
                            ) : notStartedActivities && notStartedActivities.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {notStartedActivities.map((act, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < notStartedActivities.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", minWidth: 80 }}>{act.activity_id || "—"}</span>
                                    <span style={{ fontSize: 11, color: "#475569", flex: 1 }}>{act.activity || "—"}</span>
                                    {act.planned_start && (
                                      <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>Start: {act.planned_start}</span>
                                    )}
                                    {act.planned_end && (
                                      <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>End: {act.planned_end}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>No not-started activities found.</p>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            margin: "2px 0 10px 18px",
                            padding: "10px 14px",
                            background: "#f8fafc",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                              Remaining {formatPercentNumber(pct(d.totalActivities - item.value, d.totalActivities))}
                            </span>
                            {statusData.filter(s => s.name !== item.name).map(s => {
                              const w = (s.value / d.totalActivities) * 100;
                              return (
                                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.fill, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: "#475569", flex: 1 }}>{s.name}</span>
                                  <strong style={{ fontSize: 12, color: "#0f172a", minWidth: 42, textAlign: "right" }}>{s.value.toLocaleString()}</strong>
                                  <span style={{ fontSize: 11, color: s.fill, fontWeight: 700, minWidth: 44, textAlign: "right" }}>{formatPercentNumber(w)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="summary-callout tone-positive">
                {d.milestoneAchieved > 0 && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: "#10B981", fontWeight: 600, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 10px" }}>
                    + {d.milestoneAchieved.toLocaleString()} milestones achieved
                  </span>
                )}
              </div>
            </article>

          </section> */}

          {activeSection === 'deviation' && (<section className="glass-card analytics-card">
            <SectionHeader
              eyebrow="Schedule Deviation Report"
              title="Activities Flagged as Delayed"
              subtitle="Activities detected as overdue vs their planned dates. Sorted by most days delayed."
            />
            {deviationMeta?.source_file && (
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 8px" }}>
                Source: <strong style={{ color: "#475569" }}>{deviationMeta.source_file}</strong>
                {deviationMeta.source_job ? ` (${deviationMeta.source_job})` : ""}
                {" "}· processed {deviationMeta.processed_at ? new Date(deviationMeta.processed_at).toLocaleString() : ""}
              </p>
            )}
            {deviationActivities.length === 0 ? (
              <div style={{ padding: "16px 0" }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>
                  No delayed activities found in the output tracker.
                </p>
                <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                  The tracker is read directly from your uploaded file. If the table is empty, the output file&apos;s
                  &quot;Timeline Deviation Tracker&quot; sheet may not have any rows flagged as delayed,
                  or the &quot;Status&quot; / &quot;Timeline_Deviation_Flag&quot; columns contain different values.
                </p>
              </div>
            ) : (() => {
              const maxDays   = Math.max(...deviationActivities.map(a => a.days_overdue ?? 0), 1);
              const SHOW_INIT = 5;
              const visible   = devExpanded ? deviationActivities : deviationActivities.slice(0, SHOW_INIT);
              const hiddenCnt = deviationActivities.length - SHOW_INIT;
              return (
                <>
                  <p style={{ fontSize: 10, color: "#94a3b8", margin: "0 0 10px", letterSpacing: "0.02em" }}>
                    {deviationActivities.length} delayed activit{deviationActivities.length === 1 ? "y" : "ies"} ·{" "}
                    {deviationActivities.filter(a => (a.days_overdue ?? 0) >= 28).length} with ≥28 days · sorted by most delayed
                  </p>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {visible.map((item, idx) => {
                      const days   = item.days_overdue ?? 0;
                      const barPct = (days / maxDays) * 100;
                      const isCritical = days >= 28;
                      let baselineDays = null, currentDays = null;
                      if (item.planned_start && item.planned_end) {
                        const bd = Math.round((new Date(item.planned_end) - new Date(item.planned_start)) / 86400000);
                        if (bd > 0) { baselineDays = bd; currentDays = bd + days; }
                      }
                      return (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 2px", borderBottom: idx < visible.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <div style={{ width: 130, flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "#BA7517", letterSpacing: "0.01em" }}>
                              {item.activity_id || "—"}
                            </div>
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.activity || "—"}
                            </div>
                          </div>
                          <div style={{ flex: 1, height: 10, background: "#f1f5f9", borderRadius: 5 }}>
                            <div style={{ height: "100%", width: `${barPct}%`, background: "#F59E0B", borderRadius: 5, minWidth: 4 }} />
                          </div>
                          <div style={{ width: 100, flexShrink: 0, textAlign: "right" }}>
                            {currentDays && baselineDays && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: "#BA7517", lineHeight: 1.4 }}>{currentDays}d vs {baselineDays}d</div>
                            )}
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#BA7517", lineHeight: 1.4 }}>+{days}d late</div>
                            <div style={{ height: 1.5, background: "#F59E0B", borderRadius: 1, marginTop: 2, opacity: 0.7 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show more / collapse toggle */}
                  {deviationActivities.length > SHOW_INIT && (
                    <button
                      type="button"
                      onClick={() => setDevExpanded(v => !v)}
                      style={{ marginTop: 10, width: '100%', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {devExpanded
                        ? '▲ Show less'
                        : `▼ Show ${hiddenCnt} more delayed activit${hiddenCnt !== 1 ? 'ies' : 'y'}`}
                    </button>
                  )}
                </>
              );
            })()}
          </section>

          )}

          {activeSection === 'highsev' && (() => {
            const getActivityName = (dev) => {
              const row = (() => {
                const r = dev.row_data;
                if (!r) return {};
                if (typeof r === 'string') { try { return JSON.parse(r); } catch { return {}; } }
                return r;
              })();
              return row.activity_name || dev.description || dev.sheet || '—';
            };

            const fmtDate = (iso) => {
              if (!iso) return '—';
              try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
              catch { return iso; }
            };

            const highSev = allDeviations.filter(d => (d.severity || '').toLowerCase() === 'high');

            const STATUS_STYLE = {
              'Approved':     { bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
              'Not Approved': { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626' },
              'Reviewed':     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
              'Pending':      { bg: '#fef9c3', border: '#fde047', color: '#854d0e' },
            };

            return (
              <section className="glass-card analytics-card">
                <SectionHeader
                  eyebrow="High Severity Deviations"
                  title="Critical Deviation Report"
                  subtitle={`${highSev.length} high severity item${highSev.length !== 1 ? 's' : ''} · reason submitted or awaiting response`}
                />

                {/* Summary chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'High Severity',     value: highSev.length,                                                      color: '#dc2626' },
                    { label: 'Reason Submitted',   value: highSev.filter(d => d.review_reason?.trim()).length,                 color: '#15803d' },
                    { label: 'Awaiting Response',  value: highSev.filter(d => !d.review_reason?.trim()).length,                color: '#b45309' },
                    { label: 'Approved',           value: highSev.filter(d => d.review_status === 'Approved').length,          color: '#1d4ed8' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {highSev.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>No high severity deviations found.</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12 }}>All CP and milestone deviations are low or medium severity.</p>
                  </div>
                ) : (
                  <>
                    {/* Column header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 200px', gap: 12, padding: '6px 14px 8px', borderBottom: '2px solid #f1f5f9', marginBottom: 2 }}>
                      {['Activity / Description', 'Status', 'Reason / Response'].map(h => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                      ))}
                    </div>

                    {highSev.map((dev, idx) => {
                      const name    = getActivityName(dev);
                      const status  = dev.review_status || 'Pending';
                      const reason  = (dev.review_reason || '').trim();
                      const sc      = STATUS_STYLE[status] ?? STATUS_STYLE['Pending'];
                      return (
                        <div key={dev.id ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 200px', gap: 12, padding: '11px 14px', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{name}</div>
                            {dev.sheet && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{dev.sheet}</div>}
                            {dev.detected_at && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Detected: {fmtDate(dev.detected_at)}</div>}
                          </div>
                          <div style={{ paddingTop: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{status}</span>
                          </div>
                          <div style={{ paddingTop: 2 }}>
                            {reason
                              ? <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{reason}</span>
                              : <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>⏳ Awaiting Response</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            );
          })()}

          {activeSection === 'trend' && (<>
          {(() => {
            // Source: one_pager.json (onePagerData) with static fallback
            const _sc = onePagerData?.status_cards;
            const _dgl = _sc?.days_gained_lost;
            const _rec = _sc?.recovered;
            const _ar  = _sc?.at_risk;
            const _mcSlipDisplay = _dgl?.mc_slip_display ?? '+62d slip to MC';
            const _mcBaseline2   = _dgl?.mc_baseline ?? '20 Jan 2027';
            const _mcForecast2   = _dgl?.mc_forecast ?? '23 Mar 2027';
            const _totalRec2     = _rec?.total_recovered_days ?? 98;
            const _civilRec      = _rec?.civil_saved_days ?? 85;
            const _compRec       = _rec?.compressor_saved_days ?? 13;
            const _c1000Float    = _rec?.c1000_float_improvement ?? '+15d';
            const _residual2     = _ar?.residual_risk_display ?? '+7d';
            const _riskItems     = Array.isArray(_ar?.risk_items) ? _ar.risk_items : [
              { id: 'A31580', name: 'A31580, A34220 stuck at 1d float', float_days: 1 },
              { id: 'GFS',   name: 'Sub-station: 3d float — 2nd consecutive month', float_days: 3 },
              { id: 'INST',  name: 'Instrument / telecom chain: 1d float to Mar 2027 MC', float_days: 1 },
            ];
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Status Update — {_dgl ? `${_mcBaseline2} → ${_mcForecast2}` : 'Apr 2026 Schedule Position'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>

                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {_dgl?.label ?? '1. Days Gained / Lost Overall'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {_mcSlipDisplay}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 700, marginTop: 2 }}>
                      {_mcBaseline2} → {_mcForecast2} · all milestones moved
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                      {_totalRec2}d recovery plan embedded (civil + compressor). Net overrun vs original baseline.
                    </div>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {_rec?.label ?? '2. What Has Been Recovered'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {_totalRec2}d
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                        Civil: {_civilRec}d
                      </span>
                      <span style={{ fontSize: '0.7rem', background: '#cffafe', color: '#155e75', border: '1px solid #a5f3fc', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                        Compressor: {_compRec}d
                      </span>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                        C1000: {_c1000Float} float
                      </span>
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                      {_rec?.note ?? `Downstream compression embedded · C1000 improved from −7d float (Feb) to ${_c1000Float} (Apr)`}
                    </div>
                  </div>

                  <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {_ar?.label ?? '3. What Is Still at Risk'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {_mcSlipDisplay} · {_residual2} residual
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 5 }}>
                      {_riskItems.map(ri => (
                        <div key={ri.id} style={{ fontSize: '0.71rem', color: '#be185d', lineHeight: 1.4 }}>
                          • {ri.note ?? ri.name}
                          {ri.float_days != null && <span style={{ fontWeight: 700 }}> ({ri.float_days}d float)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
          <section className="glass-card analytics-card" style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4 }}>Schedule Position Waterfall</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>How we got to +62 days at risk</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>CP &amp; MS activities only · April 2026 schedule baseline · delays add days, recoveries subtract days</div>
            </div>

            {(() => {
              // Source: one_pager.json via /api/schedule/one-pager (falls back to hardcoded)
              const _wfSource = onePagerData?.waterfall ?? [
                { name: 'Baseline',         sub: 'Apr 2026 programme',              base: 0,   bar: 2,   color: '#64748b', delta: null,   is_negative: false, activities: [] },
                { name: 'Started later',    sub: 'Civil chain 48–92d late starts',  base: 2,   bar: 57,  color: '#dc2626', delta: '+57d', is_negative: false, activities: [] },
                { name: 'Took longer',      sub: 'A15750 waterproofing overrun',    base: 59,  bar: 103, color: '#f59e0b', delta: '+103d', is_negative: false, activities: [] },
                { name: 'Started sooner',   sub: 'Compressor chain acceleration',   base: 149, bar: 13,  color: '#16a34a', delta: '−13d', is_negative: true,  activities: [] },
                { name: 'Happened quicker', sub: 'Civil compression plan',          base: 64,  bar: 85,  color: '#0ea5e9', delta: '−85d', is_negative: true,  activities: [] },
                { name: 'Net position',     sub: 'MC: 23 Mar 2027 (+62d)',          base: 0,   bar: 62,  color: '#7c3aed', delta: '+62d', is_negative: false, activities: [] },
              ];
              const wfData = _wfSource.map(w => ({ ...w, isNeg: w.is_negative }));
              const _rs = onePagerData?.recovery_summary;
              const _totalRecovered = _rs?.total_recovered ?? 98;
              const _civilComp = _rs?.civil_compression ?? 85;
              const _compAcc = _rs?.compressor_acceleration ?? 13;
              const _stillRisk = _rs?.still_at_risk ?? 62;
              const _mcBaseline = _rs?.mc_baseline ?? '20 Jan 2027';
              const _mcForecast = _rs?.mc_forecast ?? '23 Mar 2027';
              const _pacBaseline = _rs?.pac_baseline ?? '20 Jul 2027';
              const _pacForecast = _rs?.pac_forecast ?? '20 Sep 2027';
              const _residual = _rs?.residual_with_extra_shift ?? 7;
              const _summaryText = onePagerData?.summary_text ?? `A15750 Waterproofing ran 117 days over its planned 19-day duration (19d → 136d), cascading a +103d finish variance through the civil foundation chain. Despite 57 days of late starts across CP activities, the recovery plan absorbed ${_totalRecovered} days (${_civilComp}d civil compression + ${_compAcc}d compressor acceleration), leaving a net <strong>+${_stillRisk}d risk to Mechanical Completion</strong> (${_mcBaseline} → ${_mcForecast}). With +1 shift/week on the C1000 foundation chain the residual reduces to approximately +${_residual} days.`;

              const CustomTick = ({ x, y, payload, index }) => {
                const d = wfData[index];
                return (
                  <g transform={`translate(${x},${y + 6})`}>
                    <text textAnchor="middle" fontSize={10} fontWeight={700} fill={d?.color ?? '#64748b'} dy={0}>{payload.value}</text>
                    <text textAnchor="middle" fontSize={8.5} fill="#94a3b8" dy={13}>{d?.sub ?? ''}</text>
                  </g>
                );
              };

              const CustomTooltip = ({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = wfData.find(w => w.name === label);
                const shown = payload.find(p => p.dataKey === 'bar');
                if (!shown || !d) return null;
                const acts = Array.isArray(d.activities) ? d.activities : [];
                return (
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', fontSize: 12, minWidth: 220, maxWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    <div style={{ fontWeight: 800, color: d.color, marginBottom: 4, fontSize: 13 }}>{label}</div>
                    <div style={{ color: '#94a3b8', marginBottom: 6, fontSize: 11 }}>{d.sub}</div>
                    <div style={{ fontWeight: 800, color: d.color, fontSize: 18, marginBottom: acts.length ? 8 : 0 }}>{d.delta ?? '—'}</div>
                    {acts.length > 0 && (
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                          {acts.length} activit{acts.length !== 1 ? 'ies' : 'y'}
                        </div>
                        {acts.map(a => (
                          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 5 }}>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: d.color, background: `${d.color}22`, borderRadius: 4, padding: '1px 6px', marginRight: 6 }}>{a.id}</span>
                              <span style={{ fontSize: 11, color: '#e2e8f0' }}>{a.name}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: d.isNeg ? '#4ade80' : '#f87171', flexShrink: 0 }}>{a.value_label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  <div style={{ height: 270 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wfData} margin={{ top: 28, right: 16, bottom: 44, left: 28 }}>
                        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={<CustomTick />} axisLine={false} tickLine={false} interval={0} height={52} />
                        <YAxis domain={[0, 175]} tickFormatter={v => `${v}d`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="base" stackId="wf" fill="transparent" />
                        <Bar dataKey="bar" stackId="wf" radius={[4, 4, 0, 0]} maxBarSize={64}>
                          {wfData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={d.isNeg ? 0.85 : 1} />)}
                          <LabelList dataKey="delta" position="top" content={({ x, y, width, value, index }) => {
                            if (!value) return null;
                            const d = wfData[index];
                            return (
                              <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill={d?.color ?? '#374151'}>{value}</text>
                            );
                          }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Recovery + Risk summary — dynamic */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>What's been recovered</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{_totalRecovered}d</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>{_civilComp}d civil compression + {_compAcc}d compressor acceleration</div>
                    </div>
                    <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Still at risk</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>+{_stillRisk}d</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>MC: {_mcBaseline} → {_mcForecast}. PAC: {_pacBaseline} → {_pacForecast}. Residual ~+{_residual}d with +1 shift/week on C1000.</div>
                    </div>
                  </div>

                  {/* Overall position — dynamic */}
                  <div style={{ marginTop: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#0f172a', lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{ __html: `<strong>Overall position:</strong> ${_summaryText}` }} />
                </>
              );
            })()}
          </section>

          <section className="glass-card analytics-card">
            <SectionHeader
              eyebrow="Phase Trend"
              title="Monthly Phase Completion Trend"
              subtitle="Engineering · Procurement · Construction — one data point per uploaded file"
            />
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 10px" }}>
              Source: S-curve sheets (Home_Office_Services, Manufacturing_and_Delivery, Construction_and_Pre-Com, Project_Management, Commissioning)
            </p>
            <div className="chart-shell" style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statusLineData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke="#DCE7F5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5B6B84", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7C8AA5" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Line type="monotone" dataKey="Engineering"  name="Engineering"  stroke={ORANGE} strokeWidth={2.5} dot={{ r: 4, fill: ORANGE, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="Engineering"  position="top" formatter={(v) => v > 0 ? `${v}%` : ""} style={{ fill: ORANGE, fontSize: 10, fontWeight: 700 }} />
                  </Line>
                  <Line type="monotone" dataKey="Procurement"  name="Procurement"  stroke={GREY}   strokeWidth={2.5} dot={{ r: 4, fill: GREY,   stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="Procurement"  position="top" formatter={(v) => v > 0 ? `${v}%` : ""} style={{ fill: "#6B7280", fontSize: 10, fontWeight: 700 }} />
                  </Line>
                  <Line type="monotone" dataKey="Construction" name="Construction" stroke={GREEN}   strokeWidth={2.5} dot={{ r: 4, fill: GREEN,   stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="Construction" position="top" formatter={(v) => v > 0 ? `${v}%` : ""} style={{ fill: GREEN, fontSize: 10, fontWeight: 700 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-grid dashboard-grid-charts">
            <article className="glass-card analytics-card">
              <SectionHeader
                eyebrow="Phase Mix"
                title={`Discipline Completion Radar - ${activeMonth}`}
                subtitle="Relative actual progress by discipline in the active month"
              />
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#DBE7F2" />
                    <PolarAngleAxis dataKey="discipline" tick={{ fontSize: 11, fill: "#607089", fontWeight: 600 }} />
                    <Radar
                      name={activeMonth}
                      dataKey="value"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.18}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: accent, stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-table-wrap">
                <table className="chart-value-table">
                  <thead>
                    <tr>
                      <th>Discipline</th>
                      <th>Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radarData.map((item) => (
                      <tr key={item.discipline}>
                        <td>{item.discipline}</td>
                        <td>{Number(item.value).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
          </>)}

          {xyTooltip && (
            <div style={{
              position: 'fixed',
              left: xyTooltip.x + 16,
              top: xyTooltip.y - 14,
              background: '#0f172a',
              color: '#f1f5f9',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 12,
              pointerEvents: 'none',
              zIndex: 9999,
              maxWidth: 340,
              minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              lineHeight: 1.55,
            }}>
              {/* Title row */}
              {xyTooltip.id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: xyTooltip.color ?? '#94a3b8', background: `${xyTooltip.color ?? '#94a3b8'}22`, border: `1px solid ${xyTooltip.color ?? '#94a3b8'}44`, borderRadius: 5, padding: '2px 7px' }}>{xyTooltip.id}</span>
                  {xyTooltip.category && <span style={{ fontSize: 10, color: '#64748b' }}>{xyTooltip.category}</span>}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc', marginBottom: 6 }}>{xyTooltip.name}</div>
              {/* Fields */}
              {xyTooltip.fields && xyTooltip.fields.map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, borderTop: '1px solid #1e293b', paddingTop: 4, marginTop: 4 }}>
                  <span style={{ color: '#94a3b8' }}>{f.label}</span>
                  <span style={{ fontWeight: 600, color: f.tone === 'red' ? '#f87171' : f.tone === 'green' ? '#4ade80' : f.tone === 'amber' ? '#fbbf24' : '#e2e8f0', textAlign: 'right' }}>{f.value}</span>
                </div>
              ))}
              {xyTooltip.description && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, borderTop: '1px solid #1e293b', paddingTop: 6, lineHeight: 1.5 }}>{xyTooltip.description}</div>
              )}
            </div>
          )}

          <footer className="history-footer">
            {MONTHS.map((month) => (
              <div
                key={month}
                className={`footer-month-card ${activeMonth === month ? "active" : ""}`}
                style={{ "--month-color": getMonthStyle(month).color, "--month-bg": getMonthStyle(month).bg }}
              >
                <span>{month}</span>
                <strong>{DATA[month].totalActivities.toLocaleString()}</strong>
              </div>
            ))}
          </footer>
        </div>
      </main>
    </div>
  );
}