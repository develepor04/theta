import React, { useMemo } from 'react';
import {
  AlertTriangle, BarChart2, Clock, Lightbulb, TrendingUp, Activity, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, PieChart, Pie, Cell,
} from 'recharts';
import useStore from '../store/useStore';
import useSheetData from '../hooks/useSheetData';
import useIsMobile from '../hooks/useIsMobile';

const HEALTH_COLOR = { 'On Track': '#16a34a', Recovering: '#16a34a', 'At Risk': '#f59e0b', Critical: '#dc2626' };

// Sheet dates are stored either as Excel serial numbers (days since
// 1899-12-30) or as plain date strings, depending on how the source cell
// was typed -- mirrors thetaValidation.js's isValidDateValue serial range.
function parseSheetDate(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number' && v > 0 && v < 100000) {
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  }
  const s = String(v).trim().replace(/\s*[A*]$/i, '').trim();
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Light-themed executive report shown after Theta Sheets processing/save.
 * Every figure here is either pulled directly from compute_metrics_from_sheet
 * (backend, already verified against the real saved data) or derived
 * client-side from the same active sheet's raw rows (delayed activities,
 * upcoming milestones, progress %). Nothing here is static/demo data --
 * widgets we can't honestly back with real fields (risk score, external
 * data-source freshness, decisions/safety feeds) are intentionally omitted
 * rather than faked.
 */
export default function ThetaReportView() {
  const { user } = useStore();
  const isMobile = useIsMobile();
  const { metrics, lastUpdated } = useSheetData({ mode: 'metrics', useActive: true, pollIntervalMs: 3000 });
  const { sheet } = useSheetData({ mode: 'sheet', useActive: true, pollIntervalMs: 5000 });

  const grid = sheet?.data?.sheets?.[0];
  const headers = grid?.headers || [];
  const rows = grid?.rows || [];
  const colIdx = useMemo(() => Object.fromEntries(headers.map((h, i) => [h, i])), [headers]);
  const col = (row, name) => (colIdx[name] !== undefined ? row[colIdx[name]] : undefined);

  const activities = useMemo(
    () => rows.filter(r => String(col(r, 'Activity ID') ?? '').trim() && String(col(r, 'Activity Name') ?? '').trim()),
    [rows, colIdx]
  );

  const progressPct = useMemo(() => {
    const vals = activities
      .map(r => parseFloat(String(col(r, '% Complete') ?? '').replace('%', '')))
      .filter(Number.isFinite);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [activities, colIdx]);

  const delayedActivities = useMemo(() => {
    return activities
      .filter(r => String(col(r, 'Status') ?? '').trim() === 'Delayed')
      .map(r => ({
        id: col(r, 'Activity ID'),
        name: col(r, 'Activity Name'),
        days: Math.round(parseFloat(col(r, 'Variance (Days)')) || 0),
      }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);
  }, [activities, colIdx]);

  const upcomingMilestones = useMemo(() => {
    const now = Date.now();
    const in60d = now + 60 * 24 * 3600 * 1000;
    return activities
      .filter(r => String(col(r, 'Status') ?? '').trim() !== 'Completed')
      .map(r => {
        const d = parseSheetDate(col(r, 'Forecast Finish'));
        return d ? { name: col(r, 'Activity Name'), date: d, status: col(r, 'Status') } : null;
      })
      .filter(Boolean)
      .filter(m => m.date.getTime() >= now && m.date.getTime() <= in60d)
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
  }, [activities, colIdx]);

  if (!metrics) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#94a3b8', fontSize: 13 }}>
        <Loader2 size={16} className="spinning" /> Loading report…
      </div>
    );
  }

  const isOnTrack = metrics.healthStatus === 'On Track';
  const healthColor = HEALTH_COLOR[metrics.healthStatus] || '#f59e0b';
  const scheduleColor = metrics.scheduleVariance > 20 ? '#dc2626' : metrics.scheduleVariance > 0 ? '#f59e0b' : '#16a34a';
  const costColor = metrics.costExposure > 1 ? '#dc2626' : metrics.costExposure > 0 ? '#f59e0b' : '#16a34a';

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'linear-gradient(180deg, #f5f3ff 0%, #f8fafc 220px)' }}>
      <style>{`
        @keyframes trv-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(126,34,206,0.35); } 50% { box-shadow: 0 0 0 6px rgba(126,34,206,0); } }
        .trv-live-dot { animation: trv-pulse 2s ease-in-out infinite; }
      `}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '16px 14px 32px' : '24px 28px 48px' }}>

        {/* ── Hero header ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 55%, #f0fdfa 100%)',
          border: '1px solid #e9d5ff', borderRadius: 18, padding: isMobile ? '16px 16px' : '22px 26px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(126,34,206,0.14), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, #7e22ce, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(126,34,206,0.35)',
            }}>
              <BarChart2 size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 19 : 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Live Project Report
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#64748b' }}>
                Computed directly from your saved Theta Sheet.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e9d5ff', borderRadius: 20, padding: '7px 16px', position: 'relative', boxShadow: '0 2px 8px rgba(126,34,206,0.1)' }}>
            <div className="trv-live-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: '#7e22ce', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Live Sheet Data{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </div>
        </div>

        {/* ── Alert banner ── */}
        {!isOnTrack && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20,
            background: metrics.healthStatus === 'Critical' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${metrics.healthStatus === 'Critical' ? '#fecaca' : '#fde68a'}`,
            borderLeft: `4px solid ${healthColor}`,
            borderRadius: 10, padding: '12px 16px',
          }}>
            <AlertTriangle size={17} color={healthColor} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
              <strong style={{ color: healthColor }}>{metrics.healthStatus} — </strong>{metrics.aiInsight}
            </div>
          </div>
        )}

        {/* ── Stat row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Overall Health" accent={healthColor} iconBg="#faf5ff" icon={<Activity size={16} color={healthColor} />}>
            <BigNum color={healthColor}>{metrics.healthIndex}%</BigNum>
            <Chip bg={isOnTrack ? '#f0fdf4' : metrics.healthStatus === 'Critical' ? '#fef2f2' : '#fffbeb'} color={healthColor} border={healthColor}>
              {metrics.healthStatus}
            </Chip>
          </StatCard>

          <StatCard label="Progress" accent="#2563eb" iconBg="#eff6ff" icon={<TrendingUp size={16} color="#2563eb" />}>
            <BigNum color="#2563eb">{progressPct !== null ? `${progressPct}%` : '—'}</BigNum>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>avg. % complete</span>
          </StatCard>

          <StatCard label="Schedule Variance" accent={scheduleColor} iconBg="#fff7ed" icon={<Clock size={16} color={scheduleColor} />}>
            <BigNum color={scheduleColor}>
              {metrics.scheduleVariance > 0 ? `-${metrics.scheduleVariance}` : '0'} <span style={{ fontSize: 15 }}>days</span>
            </BigNum>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>vs. baseline {metrics.baselineDate}</span>
          </StatCard>

          <StatCard label="Cost Exposure" accent={costColor} iconBg="#fef2f2" icon={<BarChart2 size={16} color={costColor} />}>
            <BigNum color={costColor}>AED {metrics.costExposure}M</BigNum>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>of AED {metrics.budget}M budget</span>
          </StatCard>
        </div>

        {/* ── Cost chart + Health donut ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
          <Panel title="Budget vs Actual" subtitle="cumulative AED, by period" accent="#2563eb">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={metrics.costChart} barSize={26} margin={{ top: 18, right: 8, left: -14, bottom: 0 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="trvBudgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                  <linearGradient id="trvOverrunGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#fca5a5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip
                  formatter={(v, name) => [`AED ${v}M`, name === 'budget' ? 'Budget' : 'Overrun']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="budget" fill="url(#trvBudgetGrad)" radius={[4, 4, 0, 0]} name="Budget" />
                <Bar dataKey="overrun" fill="url(#trvOverrunGrad)" radius={[4, 4, 0, 0]} name="Overrun">
                  <LabelList dataKey="tag" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#dc2626' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {metrics.costBreakdown.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: '#475569' }}>{item.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Project Health" accent={healthColor}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 150, height: 150, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.08))' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="trvHealthGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={healthColor} stopOpacity={0.75} />
                        <stop offset="100%" stopColor={healthColor} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[{ value: metrics.healthIndex }, { value: 100 - metrics.healthIndex }]}
                      dataKey="value" innerRadius={52} outerRadius={68}
                      startAngle={90} endAngle={-270} stroke="none"
                    >
                      <Cell fill="url(#trvHealthGrad)" />
                      <Cell fill="#eef1f6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{metrics.healthIndex}%</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>complete</span>
                </div>
              </div>
              <div style={{ width: '100%', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <StatusRow label="Schedule" value={metrics.scheduleVariance > 20 ? 'Behind' : metrics.scheduleVariance > 0 ? 'Watch' : 'On track'} />
                <StatusRow label="Cost" value={metrics.costExposure > 1 ? 'Watch' : 'On track'} />
                <StatusRow label="Productivity" value={metrics.productivityGap <= -10 ? 'Watch' : 'On track'} />
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Executive summary ── */}
        <Panel title="Executive Summary" badge="AI-generated" accent="#7e22ce" style={{ marginBottom: 20, background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 140px)' }}>
          <SummaryLine icon={<Lightbulb size={14} color="#16a34a" />}>{metrics.aiInsight}</SummaryLine>
          <SummaryLine icon={<AlertTriangle size={14} color="#dc2626" />}>{metrics.costLinkage}</SummaryLine>
        </Panel>

        {/* ── Delayed activities + Upcoming milestones ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <Panel title="Delayed Activities" badge={`${delayedActivities.length} flagged`} accent="#dc2626">
            {delayedActivities.length === 0 ? (
              <EmptyRow text="No delayed activities in the current sheet." />
            ) : delayedActivities.map((a, i) => (
              <ActivityRow key={i} id={a.id} name={a.name} tag={`${a.days}d`} tagColor="#dc2626" tagBg="#fef2f2" dot="#dc2626" last={i === delayedActivities.length - 1} />
            ))}
          </Panel>

          <Panel title="Upcoming Milestones" badge="next 60 days" accent="#0f766e">
            {upcomingMilestones.length === 0 ? (
              <EmptyRow text="No forecasted activities due in the next 60 days." />
            ) : upcomingMilestones.map((m, i) => (
              <ActivityRow
                key={i}
                name={m.name}
                sub={m.date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                tag={m.status || ''}
                tagColor={m.status === 'Delayed' ? '#dc2626' : '#0f766e'}
                tagBg={m.status === 'Delayed' ? '#fef2f2' : '#f0fdfa'}
                dot={m.status === 'Delayed' ? '#dc2626' : '#0f766e'}
                last={i === upcomingMilestones.length - 1}
              />
            ))}
          </Panel>
        </div>

        {/* ── Schedule intelligence ── */}
        <Panel title="Schedule Intelligence" subtitle="by phase" accent="#4338ca">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: isMobile ? 520 : 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr 0.7fr', gap: 8, paddingBottom: 10, borderBottom: '1px solid #f1f5f9', marginBottom: 2 }}>
                {['Phase', 'Variance', 'Root Cause', 'Impact'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {metrics.scheduleRows.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr 0.7fr', gap: 8,
                  padding: '12px 0', borderBottom: i < metrics.scheduleRows.length - 1 ? '1px solid #f8fafc' : 'none',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{row.phase}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.variance === 'Closed' ? '#16a34a' : '#dc2626' }}>{row.variance}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>{row.rootCause}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, background: row.badge.bg, color: row.badge.color,
                    padding: '3px 9px', borderRadius: 6, textAlign: 'center', display: 'inline-block', whiteSpace: 'nowrap',
                  }}>{row.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────────

function StatCard({ label, icon, accent = '#64748b', iconBg = '#f8fafc', children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 18px 16px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function BigNum({ children, color = '#0f172a' }) {
  return <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{children}</div>;
}

function Chip({ children, bg, color, border }) {
  return (
    <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: bg, color, border: border ? `1px solid ${border}33` : 'none', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
      {children}
    </span>
  );
}

function Panel({ title, subtitle, badge, accent = '#7e22ce', children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(15,23,42,0.05)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 4, height: 16, borderRadius: 2, background: accent, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          {subtitle && <span style={{ fontSize: 12, color: '#94a3b8' }}>{subtitle}</span>}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryLine({ icon, children }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function StatusRow({ label, value }) {
  const good = value === 'On track';
  const color = good ? '#16a34a' : '#b45309';
  const bg = good ? '#f0fdf4' : '#fffbeb';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, color: '#475569' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 5, padding: '2px 8px' }}>{value}</span>
    </div>
  );
}

function ActivityRow({ id, name, sub, tag, tagColor, tagBg, dot, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: last ? 'none' : '1px solid #f8fafc' }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {id && <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 6 }}>{id}</span>}
        <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{name}</span>
        {sub && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
      {tag && (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: tagColor, background: tagBg, borderRadius: 6, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {tag}
        </span>
      )}
    </div>
  );
}

function EmptyRow({ text }) {
  return <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12.5, color: '#94a3b8' }}>{text}</div>;
}
