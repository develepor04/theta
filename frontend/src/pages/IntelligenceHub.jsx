import React, { useState, useEffect } from 'react';
import { Menu, X, BrainCircuit, TrendingDown, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import Sidebar from '../components/Sidebar';
// Static JSON is used as fallback only when APIs return no data
import staticTrend from '../data/three_month_trend_dashboard_apr2026.json';
import borougeWhatifCriticalExtracted from '../data/borougeWhatifCriticalExtracted.json';
import './IntelligenceHub.css';

// Bar colours matching the project palette
const FLOAT_BAND_COLOURS = ['#B4B2A9', '#BA7517', '#E24B4A', '#0ea5e9', '#8b5cf6'];
const COMPLETION_COLOURS = ['#B4B2A9', '#BA7517', '#E24B4A', '#16a34a', '#0ea5e9'];

const IntelligenceHub = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Live data from APIs ───────────────────────────────────────────────────
  const [slippages,      setSlippages]      = useState([]);
  const [improvements,   setImprovements]   = useState([]);
  const [completionTrend, setCompletionTrend] = useState([]);
  const [floatProfile,   setFloatProfile]   = useState([]);
  const [dataSource,     setDataSource]     = useState('loading'); // 'live' | 'static' | 'loading'
  const [aiHeadline,     setAiHeadline]     = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const hdr   = { Authorization: `Bearer ${token}` };

    // Run all fetches in parallel
    Promise.allSettled([
      fetch('/api/deviations/overview',        { headers: hdr }).then(r => r.ok ? r.json() : null),
      fetch('/api/whatif/project-updates',     { headers: hdr }).then(r => r.ok ? r.json() : null),
      fetch('/api/reports/monthly-trend',      { headers: hdr }).then(r => r.ok ? r.json() : null),
    ]).then(([devRes, updRes, trendRes]) => {
      const devJson   = devRes.status   === 'fulfilled' ? devRes.value   : null;
      const updJson   = updRes.status   === 'fulfilled' ? updRes.value   : null;
      const trendJson = trendRes.status === 'fulfilled' ? trendRes.value : null;

      // ── Slippages from deviations top_delays ───────────────────────────
      const liveSlippages = Array.isArray(devJson?.top_delays)
        ? devJson.top_delays
            .filter(d => (d.days_overdue ?? 0) > 0)
            .slice(0, 8)
            .map(d => ({
              title: d.activity ?? d.description ?? 'Activity',
              badge: `+${d.days_overdue ?? 0}d overdue`,
              body:  d.stage ? `Stage: ${d.stage}` : undefined,
              severity: d.severity,
            }))
        : [];

      // ── Improvements from project-updates faster activities ────────────
      const liveImprovements = Array.isArray(updJson?.top_faster_activities)
        ? updJson.top_faster_activities
            .filter(a => (a.time_saved_days ?? 0) > 0)
            .slice(0, 8)
            .map(a => ({
              title: a.activity_name ?? a.activity_id ?? 'Activity',
              badge: `-${a.time_saved_days ?? 0}d ahead`,
              body:  a.activity_id ? `ID: ${a.activity_id}` : undefined,
            }))
        : [];

      // ── Completion trend from monthly-trend KPIs ───────────────────────
      const months = Array.isArray(trendJson?.months) ? trendJson.months : [];
      const data   = trendJson?.data ?? {};
      const liveCompletion = months.map((month, i) => ({
        month: month.slice(0, 3),
        completions: (data[month]?.onTime ?? 0) + (data[month]?.milestoneAchieved ?? 0),
        fill: COMPLETION_COLOURS[i % COMPLETION_COLOURS.length],
      }));

      // ── Float profile from deviation data: bucket days_overdue into bands
      const allDelays = Array.isArray(devJson?.top_delays) ? devJson.top_delays : [];
      const byMonth   = {};  // month label → band counts
      const bands     = ['0d (on time)', '1–7d', '8–28d', '28–90d', '90d+'];
      const toBand    = (days) => {
        if (days <= 0)  return bands[0];
        if (days <= 7)  return bands[1];
        if (days <= 28) return bands[2];
        if (days <= 90) return bands[3];
        return bands[4];
      };

      // Use monthly counts from deviation report if available, else derive from top_delays
      let liveFloat = [];
      if (months.length >= 2) {
        // Build a per-month float-band profile from the top_delays (rough but real)
        // We'll show month-on-month severity distribution as a grouped bar chart
        // Each "band" bar shows count of deviations in that severity range
        const bandCounts = {};
        bands.forEach(b => { bandCounts[b] = 0; });
        allDelays.forEach(d => { const b = toBand(d.days_overdue ?? 0); bandCounts[b] = (bandCounts[b] || 0) + 1; });
        liveFloat = bands.map(band => ({ band, Count: bandCounts[band] || 0 }));
      }

      const hasLiveData = liveSlippages.length > 0 || liveImprovements.length > 0 || liveCompletion.some(c => c.completions > 0);

      if (hasLiveData) {
        setSlippages(liveSlippages.length   > 0 ? liveSlippages   : _staticSlippages());
        setImprovements(liveImprovements.length > 0 ? liveImprovements : _staticImprovements());
        setCompletionTrend(liveCompletion.some(c => c.completions > 0) ? liveCompletion : _staticCompletion());
        setFloatProfile(liveFloat.some(f => f.Count > 0) ? liveFloat : _staticFloat());
        setDataSource('live');

        // AI narrative headline for the live slippages/improvements panels
        if (liveSlippages.length > 0 || liveImprovements.length > 0) {
          const worstSlip = Math.max(0, ...allDelays.map(d => d.days_overdue ?? 0));
          const allFasterActs = Array.isArray(updJson?.top_faster_activities) ? updJson.top_faster_activities : [];
          const bestGain = Math.max(0, ...allFasterActs.map(a => a.time_saved_days ?? 0));
          fetch('/api/reports/ai-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              context:           'intelligence_hub',
              slippage_count:    liveSlippages.length,
              improvement_count: liveImprovements.length,
              worst_slip_days:   worstSlip,
              best_gain_days:    bestGain,
            }),
          })
            .then(r => (r.ok ? r.json() : null))
            .then(json => { if (json?.ai_note) setAiHeadline(json.ai_note); })
            .catch(() => {});
        }
      } else {
        // No uploaded data yet — fall back to static JSON
        setSlippages(_staticSlippages());
        setImprovements(_staticImprovements());
        setCompletionTrend(_staticCompletion());
        setFloatProfile(_staticFloat());
        setDataSource('static');
      }
    });
  }, []);

  // ── Static JSON fallback helpers ─────────────────────────────────────────
  const _staticSlippages    = () => Array.isArray(staticTrend?.slippages)    ? staticTrend.slippages    : [];
  const _staticImprovements = () => Array.isArray(staticTrend?.improvements) ? staticTrend.improvements : [];
  const _staticCompletion   = () => {
    const cfg    = (staticTrend?.charts || []).find(c => c?.id === 'compChart') || {};
    const labels = Array.isArray(cfg.labels)   ? cfg.labels   : [];
    const ds     = Array.isArray(cfg.datasets) ? (cfg.datasets[0] || {}) : {};
    const vals   = Array.isArray(ds.data)      ? ds.data      : [];
    const cols   = Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [];
    return labels.map((month, i) => ({ month, completions: Number(vals[i] || 0), fill: cols[i] || '#94a3b8' }));
  };
  const _staticFloat = () => {
    const cfg     = (staticTrend?.charts || []).find(c => c?.id === 'floatChart') || {};
    const labels  = Array.isArray(cfg.labels)   ? cfg.labels   : [];
    const datasets = Array.isArray(cfg.datasets) ? cfg.datasets : [];
    const _fds = (lbl) => datasets.find(d => String(d?.label || '').toLowerCase().includes(lbl)) || datasets[0] || {};
    return labels.map((band, i) => ({
      band,
      February: Number(_fds('feb')?.data?.[i] || 0),
      March:    Number(_fds('mar')?.data?.[i] || 0),
      April:    Number(_fds('apr')?.data?.[i] || 0),
    }));
  };

  const isLive    = dataSource === 'live';
  const isLoading = dataSource === 'loading';
  const isFloatBanded = floatProfile.length > 0 && 'Count' in (floatProfile[0] || {});

  // ── Extracted critical data from JSON ────────────────────────────────────
  const extractedCritical = borougeWhatifCriticalExtracted || {};
  const extractedProject = extractedCritical.project || {};
  const extractedKpis = Array.isArray(extractedCritical.kpis) ? extractedCritical.kpis : [];
  const extractedWaterfall = Array.isArray(extractedCritical?.recovery_architecture?.waterfall)
    ? extractedCritical.recovery_architecture.waterfall : [];
  const extractedRecoveryProgress = extractedCritical?.recovery_architecture?.progress || {};
  const extractedCivilOverruns = Array.isArray(extractedCritical?.recovery_architecture?.civil_overruns)
    ? extractedCritical.recovery_architecture.civil_overruns : [];
  const extractedCivilOverrunSummary = extractedCritical?.recovery_architecture?.civil_overrun_summary || '';
  const extractedWaterfallMax = Math.max(1, ...extractedWaterfall.map((step) => Math.abs(Number(step?.days || 0))));
  const extractedCivilCurrentMax = Math.max(1, ...extractedCivilOverruns.map((row) => Number(row?.current_days || 0)));
  const extractedCivilVarianceMax = Math.max(1, ...extractedCivilOverruns.map((row) => Number(row?.finish_variance_days || 0)));

  const toneStyleMap = {
    teal: { bg: '#ecfdf5', border: '#86efac', title: '#166534' },
    amber: { bg: '#fffbeb', border: '#fcd34d', title: '#92400e' },
    red: { bg: '#fff1f2', border: '#fda4af', title: '#9f1239' },
    neutral: { bg: '#eff6ff', border: '#93c5fd', title: '#1e40af' },
    teal_light: { bg: '#ecfeff', border: '#67e8f9', title: '#155e75' },
  };
  const getBadgeStyle = (tone) => toneStyleMap[tone] || toneStyleMap.neutral;

  return (
    <div className='dashboard-page'>
      <button className='mobile-menu-button' onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <div className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <div className='main-content'>
        <div className='ih-pro-shell'>

          <header className='dashboard-header ih-pro-header'>
            <div className='ih-pro-title-wrap'>
              <div className='ih-pro-title-row'>
                <div className='ih-pro-logo'><BrainCircuit size={22} /></div>
                <h1>Intelligence Hub</h1>
              </div>
            </div>
          </header>

          <section className='ih-analytics-surface'>

            {!isLive && !isLoading && (
              <div style={{ padding: '10px 14px', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: 10, fontSize: 12, color: '#713f12', marginBottom: 14 }}>
                Showing sample data — upload project files to see real slippages, improvements and completion trend.
              </div>
            )}

            {/* ── AI narrative headline (live data only) ── */}
            {isLive && aiHeadline && (
              <div style={{ border: '1px solid #dbeafe', borderRadius: 14, background: '#eff6ff', padding: '12px 14px', marginBottom: 14, fontSize: '0.82rem', color: '#1e3a5f', lineHeight: 1.6 }}>
                {aiHeadline}
              </div>
            )}

            {/* ── Project card ── */}
            <div style={{ border: '1px solid #d1fae5', borderRadius: '10px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fffb 100%)', padding: '12px', marginBottom: 14 }}>
              <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginTop: '3px' }}>
                {extractedProject?.title || 'Schedule Recovery'}
              </div>
              {extractedProject?.subtitle && (
                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '4px' }}>{extractedProject.subtitle}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {extractedProject?.mc_target && (
                  <span style={{ fontSize: '0.72rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '3px 8px', fontWeight: 700 }}>
                    MC Target: {extractedProject.mc_target}
                  </span>
                )}
                {extractedProject?.status && (
                  <span style={{ fontSize: '0.72rem', color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '999px', padding: '3px 8px', fontWeight: 700 }}>
                    {extractedProject.status}
                  </span>
                )}
              </div>
            </div>

            {/* ── Status Update (points 1–3) ── */}
            {(() => {
              const kpiRecovered = extractedKpis.find(k => k.id === 'days_recovered');
              const kpiRisk      = extractedKpis.find(k => k.id === 'residual_risk');
              const civilSaved   = Number(extractedRecoveryProgress.civil_saved      ?? 0);
              const compSaved    = Number(extractedRecoveryProgress.compressor_saved ?? 0);
              const totalRecovered = civilSaved + compSaved || Number(kpiRecovered?.value ?? 0);

              // Pull live-trend metrics from three_month_trend_dashboard_apr2026.json
              const trendMetrics  = Array.isArray(staticTrend?.metrics) ? staticTrend.metrics : [];
              const mcSlipMetric  = trendMetrics.find(m => String(m.value).includes('28') && m.severity === 'red');
              const c1000Metric   = trendMetrics.find(m => String(m.label || '').includes('C1000'));
              const vendorMetric  = trendMetrics.find(m => String(m.label || '').toLowerCase().includes('vendor'));
              const mcSlipVal     = mcSlipMetric?.value  ?? '+28d';
              const c1000Val      = c1000Metric?.value   ?? '+15d';

              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Status Update — Apr 2026 Schedule Position
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>

                    {/* 1. Days Gained / Lost Overall */}
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        1. Days Gained / Lost Overall
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {mcSlipVal} slip to MC
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 700, marginTop: 2 }}>
                        Jan 20 → Feb 17, 2027 · all milestones moved
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                        {totalRecovered}d recovery plan embedded (civil + compressor). Net overrun vs original baseline: {mcSlipVal}.
                      </div>
                    </div>

                    {/* 2. What Has Been Recovered */}
                    <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        2. What Has Been Recovered
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {totalRecovered > 0 ? `${totalRecovered}d` : kpiRecovered?.value ?? '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                        {civilSaved > 0 && (
                          <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                            Civil: {civilSaved}d
                          </span>
                        )}
                        {compSaved > 0 && (
                          <span style={{ fontSize: '0.7rem', background: '#cffafe', color: '#155e75', border: '1px solid #a5f3fc', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                            Compressor: {compSaved}d
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>
                          C1000: {c1000Val} float
                        </span>
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                        Downstream compression embedded · C1000 improved from −7d float (Feb) to {c1000Val} (Apr)
                      </div>
                    </div>

                    {/* 3. What Is Still at Risk */}
                    <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        3. What Is Still at Risk
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {mcSlipVal} MC · {kpiRisk ? `+${String(kpiRisk.value).replace(/^\+/, '')}d` : '+7d'} residual
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 5 }}>
                        {vendorMetric && (
                          <div style={{ fontSize: '0.71rem', color: '#be185d', lineHeight: 1.4 }}>
                            • {vendorMetric.change_note ?? 'A31580, A34220 stuck at 1d float'}
                          </div>
                        )}
                        <div style={{ fontSize: '0.71rem', color: '#be185d', lineHeight: 1.4 }}>
                          • Sub-station: 3d float — 2nd consecutive month
                        </div>
                        <div style={{ fontSize: '0.71rem', color: '#be185d', lineHeight: 1.4 }}>
                          • Instrument / telecom chain: 1d float to Feb 2027 MC
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* ── KPIs grid ── */}
            {extractedKpis.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: 14 }}>
                {extractedKpis.map((kpi) => {
                  const toneStyle = getBadgeStyle(kpi.tone);
                  return (
                    <div key={kpi.id} style={{ background: toneStyle.bg, border: `1px solid ${toneStyle.border}`, borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.73rem', color: toneStyle.title, fontWeight: 700 }}>{kpi.label}</div>
                      <div style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>{kpi.value}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px', lineHeight: 1.35 }}>{kpi.sub}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Waterfall + Civil Overruns ── */}
            {(extractedWaterfall.length > 0 || extractedCivilOverruns.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', marginBottom: 14 }}>
                {extractedWaterfall.length > 0 && (
                  <div style={{ borderRadius: '14px', border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', padding: '14px' }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#00000', marginBottom: '10px' }}>
                      98-Day Recovery Waterfall
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.max(extractedWaterfall.length, 1)}, minmax(0, 1fr))`,
                      gap: '10px',
                      alignItems: 'end',
                      minHeight: '165px',
                      borderBottom: '1px solid #dbeafe',
                      paddingBottom: '10px',
                    }}>
                      {extractedWaterfall.map((step, idx) => {
                        const rawDays = Number(step?.days || 0);
                        const absDays = Math.abs(rawDays);
                        const barHeight = Math.max(12, (absDays / extractedWaterfallMax) * 120);
                        const label = String(step?.label || `Step ${idx + 1}`);
                        const tone = String(step?.tone || '').toLowerCase();
                        const barColor = tone === 'amber' ? '#f59e0b'
                          : tone === 'teal' || tone === 'teal_light' ? '#14d5be'
                          : tone === 'neutral' ? 'transparent' : '#94a3b8';
                        const valueColor = rawDays > 0 ? '#f59e0b' : '#22d3ee';
                        return (
                          <div key={`wf-card-${label}-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                            <div style={{ fontSize: '0.72rem', color: rawDays === 0 ? '#cbd5e1' : valueColor, fontWeight: 800 }}>
                              {rawDays > 0 ? `+${rawDays}d` : rawDays < 0 ? `${rawDays}d` : '0'}
                            </div>
                            <div style={{
                              width: '100%', maxWidth: '58px', height: `${barHeight}px`,
                              borderRadius: rawDays === 0 ? '6px' : '6px 6px 0 0',
                              border: rawDays === 0 ? '2px solid #22d3ee' : 'none',
                              background: rawDays === 0 ? '#f8fafc' : barColor,
                            }} />
                            <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                    {(Number(extractedRecoveryProgress?.civil_total || 0) > 0 || Number(extractedRecoveryProgress?.compressor_total || 0) > 0) && (
                      <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                            <span>Civil Stage Recovery</span>
                            <span>{Number(extractedRecoveryProgress?.civil_saved || 0)} / {Number(extractedRecoveryProgress?.civil_total || 0)} days</span>
                          </div>
                          <div style={{ height: '12px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (Number(extractedRecoveryProgress?.civil_saved || 0) / Math.max(Number(extractedRecoveryProgress?.civil_total || 1), 1)) * 100))}%`, background: 'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                            <span>Compressor Stage Recovery</span>
                            <span>{Number(extractedRecoveryProgress?.compressor_saved || 0)} / {Number(extractedRecoveryProgress?.compressor_total || 0)} days</span>
                          </div>
                          <div style={{ height: '12px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (Number(extractedRecoveryProgress?.compressor_saved || 0) / Math.max(Number(extractedRecoveryProgress?.compressor_total || 1), 1)) * 100))}%`, background: 'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {extractedCivilOverruns.length > 0 && (
                  <div style={{ borderRadius: '14px', border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', padding: '14px' }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>Upstream Civil Overruns</div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#64748b', marginBottom: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#94a3b8', display: 'inline-block' }} /> Baseline
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }} /> Current
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {extractedCivilOverruns.map((row, idx) => {
                        const baselineDays = Number(row?.baseline_days || 0);
                        const currentDays = Number(row?.current_days || 0);
                        const varianceDays = Number(row?.finish_variance_days || 0);
                        const baselineWidth = Math.max(3, (baselineDays / extractedCivilCurrentMax) * 100);
                        const currentWidth = Math.max(6, (currentDays / extractedCivilCurrentMax) * 100);
                        const varianceWidth = Math.max(8, (varianceDays / extractedCivilVarianceMax) * 100);
                        return (
                          <div key={`civil-overrun-${row?.id || idx}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 0.75fr) minmax(170px, 1fr) minmax(90px, 0.45fr)', alignItems: 'center', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{row?.id || '-'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{row?.name || '-'}</div>
                            </div>
                            <div style={{ position: 'relative', height: '28px', borderRadius: '6px', background: '#eff6ff', overflow: 'hidden' }}>
                              <div style={{ position: 'absolute', top: '8px', left: 0, height: '12px', width: `${baselineWidth}%`, background: '#94a3b8', borderRadius: '4px' }} />
                              <div style={{ position: 'absolute', top: '8px', left: 0, height: '12px', width: `${currentWidth}%`, background: '#f59e0b', borderRadius: '4px' }} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>{currentDays}d vs {baselineDays}d</div>
                              <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700 }}>+{varianceDays}d late</div>
                              <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(248, 113, 113, 0.2)', marginTop: '3px' }}>
                                <div style={{ height: '100%', width: `${varianceWidth}%`, background: '#f87171', borderRadius: '999px' }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '0.86rem', fontWeight: 700, background: '#fff7ed' }}>
                      {extractedCivilOverrunSummary || '5 activities - 243 total days overrun - 103-day finish variance'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceHub;