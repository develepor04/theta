import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';
import {
  Bell,
  ChevronDown,
  Calendar,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Lightbulb,
  BarChart2,
  Zap,
  Check,
  X,
  Menu,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import useStore from '../store/useStore';
import useSheetData from '../hooks/useSheetData';
import useIsMobile from '../hooks/useIsMobile';

// ── Synthetic dataset per period ─────────────────────────────────────────────

const DATASETS = {
  'Feb – Apr 2024': {
    healthIndex: 72,
    healthStatus: 'At Risk',
    healthTrend: 'Declining',
    scheduleVariance: 62,
    baselineDate: 'Jan 2027',
    forecastDate: 'Mar 2027',
    costExposure: 2.8,
    budget: 120,
    forecastCost: 122.8,
    productivity: 72,
    productivityGap: -28,
    recoveryDays: 45,
    recoverySavings: '900K',
    recoveryConf: 87,
    scheduleRows: [
      { phase: 'Engineering',  variance: '+30 days', rootCause: 'Approval Delay',    impact: 'Med',      badge: { bg: '#f1f5f9', color: '#475569' } },
      { phase: 'Procurement',  variance: '+60 days', rootCause: 'Vendor Delay',      impact: 'High',     badge: { bg: '#fef2f2', color: '#dc2626' } },
      { phase: 'Construction', variance: '+62 days', rootCause: 'Productivity Loss', impact: 'Critical', badge: { bg: '#dc2626', color: '#fff' } },
    ],
    costChart: [
      { period: 'Jan', budget: 68, overrun: 0,  tag: '' },
      { period: 'Feb', budget: 75, overrun: 14, tag: '+1.4M' },
      { period: 'Mar', budget: 82, overrun: 22, tag: '+2.2M' },
      { period: 'Fcst', budget: 90, overrun: 8, tag: 'Fcst' },
    ],
    costBreakdown: [
      { label: 'Civil Works',          value: '+1.4M AED' },
      { label: 'Material Procurement', value: '+800K AED' },
      { label: 'Equipment Idle Time',  value: '+600K AED' },
    ],
    aiInsight: 'The 62-day shift is a cascading effect. The initial 30-day engineering approval delay pushed procurement into a high-demand window, causing a 60-day vendor delay for specialised equipment, which directly stalled civil construction.',
    costLinkage: '60% of the AED 2.8M overrun is directly tied to the 62-day schedule delay. Prolonged equipment rental and idle labour due to paused civil works represent a heavy burn rate.',
  },

  'May – Jul 2024': {
    healthIndex: 65,
    healthStatus: 'Critical',
    healthTrend: 'Declining',
    scheduleVariance: 78,
    baselineDate: 'Jan 2027',
    forecastDate: 'Apr 2027',
    costExposure: 4.1,
    budget: 120,
    forecastCost: 124.1,
    productivity: 61,
    productivityGap: -39,
    recoveryDays: 30,
    recoverySavings: '600K',
    recoveryConf: 71,
    scheduleRows: [
      { phase: 'Engineering',  variance: '+30 days', rootCause: 'Approval Delay',      impact: 'Med',      badge: { bg: '#f1f5f9', color: '#475569' } },
      { phase: 'Procurement',  variance: '+75 days', rootCause: 'Supply Chain Gaps',   impact: 'Critical', badge: { bg: '#dc2626', color: '#fff' } },
      { phase: 'Construction', variance: '+78 days', rootCause: 'Resource Shortage',   impact: 'Critical', badge: { bg: '#dc2626', color: '#fff' } },
    ],
    costChart: [
      { period: 'Apr', budget: 88, overrun: 0,  tag: '' },
      { period: 'May', budget: 92, overrun: 28, tag: '+2.8M' },
      { period: 'Jun', budget: 96, overrun: 38, tag: '+3.8M' },
      { period: 'Fcst', budget: 102, overrun: 12, tag: 'Fcst' },
    ],
    costBreakdown: [
      { label: 'Civil Works',         value: '+1.9M AED' },
      { label: 'Material Procurement',value: '+1.2M AED' },
      { label: 'Equipment Idle Time', value: '+1.0M AED' },
    ],
    aiInsight: 'Compounding delays in procurement have created a critical bottleneck across all construction phases. Supply chain disruptions in Q2 2024 amplified the original 30-day approval delay by 2.5×, pushing the overall schedule variance to 78 days.',
    costLinkage: 'AED 4.1M overrun is now driven by three concurrent factors: idle labour (42%), extended equipment rental (33%), and emergency procurement premiums (25%). Intervention is needed before Aug handover deadline.',
  },

  'Aug – Oct 2024': {
    healthIndex: 79,
    healthStatus: 'Recovering',
    healthTrend: 'Improving',
    scheduleVariance: 44,
    baselineDate: 'Jan 2027',
    forecastDate: 'Feb 2027',
    costExposure: 1.9,
    budget: 120,
    forecastCost: 121.9,
    productivity: 81,
    productivityGap: -19,
    recoveryDays: 58,
    recoverySavings: '1.2M',
    recoveryConf: 91,
    scheduleRows: [
      { phase: 'Engineering',  variance: '+30 days', rootCause: 'Closed',              impact: 'Done',  badge: { bg: '#f0fdf4', color: '#16a34a' } },
      { phase: 'Procurement',  variance: '+44 days', rootCause: 'Partial Recovery',    impact: 'Med',   badge: { bg: '#f1f5f9', color: '#475569' } },
      { phase: 'Construction', variance: '+44 days', rootCause: 'Fast-Track Underway', impact: 'High',  badge: { bg: '#fef2f2', color: '#dc2626' } },
    ],
    costChart: [
      { period: 'Jul', budget: 98, overrun: 18, tag: '+1.8M' },
      { period: 'Aug', budget: 103, overrun: 12, tag: '+1.2M' },
      { period: 'Sep', budget: 108, overrun: 7,  tag: '+0.7M' },
      { period: 'Fcst', budget: 112, overrun: 4, tag: 'Fcst' },
    ],
    costBreakdown: [
      { label: 'Civil Works',          value: '+0.9M AED' },
      { label: 'Material Procurement', value: '+0.6M AED' },
      { label: 'Equipment Idle Time',  value: '+0.4M AED' },
    ],
    aiInsight: 'Recovery interventions are producing measurable results. Fast-tracking of civil works and resource reallocation have reduced the schedule variance from 78 to 44 days. Productivity has recovered to 81% — the highest level in three quarters.',
    costLinkage: 'Cost overrun trending down from AED 4.1M peak to AED 1.9M. Accelerated procurement in Aug reduced idle-equipment costs by 60%. Maintaining current recovery trajectory avoids AED 1.2M in further exposure.',
  },

  'Nov 2024 – Jan 2025': {
    healthIndex: 88,
    healthStatus: 'On Track',
    healthTrend: 'Improving',
    scheduleVariance: 18,
    baselineDate: 'Jan 2027',
    forecastDate: 'Jan 2027',
    costExposure: 0.6,
    budget: 120,
    forecastCost: 120.6,
    productivity: 93,
    productivityGap: -7,
    recoveryDays: 18,
    recoverySavings: '1.8M',
    recoveryConf: 96,
    scheduleRows: [
      { phase: 'Engineering',  variance: 'Closed',   rootCause: '—',                impact: 'Done',   badge: { bg: '#f0fdf4', color: '#16a34a' } },
      { phase: 'Procurement',  variance: 'Closed',   rootCause: '—',                impact: 'Done',   badge: { bg: '#f0fdf4', color: '#16a34a' } },
      { phase: 'Construction', variance: '+18 days', rootCause: 'Weather Delay',    impact: 'Low',    badge: { bg: '#fffbeb', color: '#b45309' } },
    ],
    costChart: [
      { period: 'Oct', budget: 112, overrun: 4,  tag: '+0.4M' },
      { period: 'Nov', budget: 115, overrun: 2,  tag: '+0.2M' },
      { period: 'Dec', budget: 118, overrun: 0,  tag: '' },
      { period: 'Fcst', budget: 120, overrun: 1, tag: 'Fcst' },
    ],
    costBreakdown: [
      { label: 'Civil Works',          value: '+0.3M AED' },
      { label: 'Material Procurement', value: '+0.2M AED' },
      { label: 'Equipment Idle Time',  value: '+0.1M AED' },
    ],
    aiInsight: 'Project has substantially recovered. Only 18 days of schedule variance remain, attributable to a 2-week weather window in December. Engineering and procurement phases are fully closed ahead of schedule.',
    costLinkage: 'Total overrun reduced to AED 0.6M — a 85% reduction from the Q2 peak. Cost savings from fast-tracking and renegotiated vendor contracts total AED 1.8M, exceeding original recovery targets.',
  },
};

const PRESET_PERIODS = Object.keys(DATASETS);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = ['2024', '2025', '2026', '2027'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectIntelligenceDashboard({ embedded = false } = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useStore();
  const isMobile = useIsMobile();

  const [activePeriod, setActivePeriod] = useState(PRESET_PERIODS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState({ month: 'Feb', year: '2024' });
  const [customTo, setCustomTo] = useState({ month: 'Apr', year: '2024' });
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
        setCustomMode(false);
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const applyCustomPeriod = () => {
    const label = `${customFrom.month} ${customFrom.year} – ${customTo.month} ${customTo.year}`;
    setActivePeriod(label);
    setShowPicker(false);
    setCustomMode(false);
  };

  const { metrics: liveMetrics, lastUpdated: liveUpdatedAt } = useSheetData({
    mode: 'metrics',
    useActive: true,
    pollIntervalMs: 2500,
  });

  const staticData = DATASETS[activePeriod] || DATASETS[PRESET_PERIODS[0]];
  const data = liveMetrics ?? staticData;
  const isLiveData = !!liveMetrics;
  const isImproving = data.healthTrend === 'Improving';
  const isOnTrack = data.healthStatus === 'On Track';

  return (
    <div className="dashboard-page" style={embedded ? { height: '100%' } : undefined}>
      <style>{`
        @keyframes pid-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
        .period-option:hover { background: #f0fdf4 !important; }
        .period-option.active { background: #f0fdf4 !important; border-color: #16a34a !important; }
      `}</style>

      {!embedded && (
        <>
          <button
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div
            className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        </>
      )}

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', ...(embedded ? { marginLeft: 0 } : null) }}>

        {/* ── Top selector bar ── */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? (embedded ? '10px 14px' : '10px 14px 10px 64px') : '10px 28px',
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'flex-start' : 'flex-end',
          flexWrap: 'wrap', gap: isMobile ? 12 : 24, flexShrink: 0, position: 'relative', zIndex: 200,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Project Selector</span>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>CP Construction Project</span>
              <ChevronDown size={14} color="#64748b" />
            </button>
          </div>

          <div style={{ width: 1, height: 32, background: '#e5e7eb' }} />

          {/* Analysis Period picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Analysis Period</span>
              <button
                onClick={() => { setShowPicker(p => !p); setCustomMode(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Calendar size={14} color="#16a34a" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{activePeriod}</span>
                <ChevronDown size={13} color="#64748b" style={{ transform: showPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
            </div>

            {showPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.14)', width: 320, zIndex: 500, overflow: 'hidden',
              }}>
                {!customMode ? (
                  <>
                    <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Select Analysis Period</span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {PRESET_PERIODS.map(p => (
                        <button
                          key={p}
                          className={`period-option${activePeriod === p ? ' active' : ''}`}
                          onClick={() => { setActivePeriod(p); setShowPicker(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'none', border: '1px solid transparent', borderRadius: 8,
                            padding: '9px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
                            transition: 'background 0.12s',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {DATASETS[p]
                                ? `Health ${DATASETS[p].healthIndex}% · ${DATASETS[p].healthStatus}`
                                : 'Custom range'}
                            </span>
                          </div>
                          {activePeriod === p && <Check size={14} color="#16a34a" />}
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => setCustomMode(true)}
                        style={{
                          width: '100%', padding: '9px', background: '#f8fafc',
                          border: '1px dashed #cbd5e1', borderRadius: 8,
                          fontSize: 12, fontWeight: 600, color: '#475569',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <Calendar size={13} /> Custom range
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Custom Period</span>
                      <button onClick={() => setCustomMode(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <MonthYearPicker label="From" value={customFrom} onChange={setCustomFrom} />
                      <MonthYearPicker label="To"   value={customTo}   onChange={setCustomTo} />
                    </div>
                    <div style={{ padding: '0 18px 16px', display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setCustomMode(false)}
                        style={{ flex: 1, padding: '9px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyCustomPeriod}
                        style={{ flex: 1, padding: '9px', background: '#16a34a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                      >
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#64748b', display: 'flex' }}>
            <Bell size={18} />
          </button>

          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: '#7e22ce',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* ── Main scrollable area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 32px' : '28px 28px 48px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Project Intelligence Dashboard
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
                AI-powered visibility across time, cost, productivity and project risks.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isLiveData && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#fff', border: '1.5px solid #e9d5ff', borderRadius: 20, padding: '7px 16px',
                }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%', background: '#7e22ce', flexShrink: 0,
                    animation: 'pid-pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Live Sheet Data{liveUpdatedAt ? ` · ${liveUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', border: '1.5px solid #bbf7d0', borderRadius: 20, padding: '7px 16px',
              }}>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%', background: '#16a34a', flexShrink: 0,
                  animation: 'pid-pulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Live AI Monitoring
                </span>
              </div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>

            {/* Health Index */}
            <KpiCard>
              <CardRow>
                <CardLabel>Health Index</CardLabel>
                {isOnTrack
                  ? <Check size={15} color="#16a34a" />
                  : <AlertTriangle size={15} color={data.healthStatus === 'Critical' ? '#dc2626' : '#f59e0b'} />
                }
              </CardRow>
              <BigNum color="#0f172a">{data.healthIndex}%</BigNum>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  background: isOnTrack ? '#f0fdf4' : data.healthStatus === 'Critical' ? '#fef2f2' : data.healthStatus === 'Recovering' ? '#fffbeb' : '#fef2f2',
                  color: isOnTrack ? '#16a34a' : data.healthStatus === 'Critical' ? '#dc2626' : data.healthStatus === 'Recovering' ? '#b45309' : '#dc2626',
                }}>{data.healthStatus}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: isImproving ? '#16a34a' : '#dc2626' }}>
                  {isImproving ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {data.healthTrend}
                </span>
              </div>
            </KpiCard>

            {/* Schedule Variance */}
            <KpiCard>
              <CardRow>
                <CardLabel>Schedule Var.</CardLabel>
                <Clock size={15} color="#64748b" />
              </CardRow>
              {typeof data.scheduleVariance === 'number' ? (
                <div style={{ fontSize: 28, fontWeight: 800, color: data.scheduleVariance <= 20 ? '#f59e0b' : '#dc2626', lineHeight: 1 }}>
                  +{data.scheduleVariance} <span style={{ fontSize: 17, fontWeight: 700 }}>Days</span>
                </div>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', lineHeight: 1, paddingTop: 4 }}>On Schedule</div>
              )}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Baseline: <strong style={{ color: '#0f172a' }}>{data.baselineDate}</strong></span>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Forecast: <strong style={{ color: data.scheduleVariance <= 20 ? '#f59e0b' : '#dc2626' }}>{data.forecastDate}</strong></span>
              </div>
            </KpiCard>

            {/* Cost Exposure */}
            <KpiCard>
              <CardRow>
                <CardLabel>Cost Exposure</CardLabel>
                <BarChart2 size={15} color="#64748b" />
              </CardRow>
              <div style={{ fontSize: 28, fontWeight: 800, color: data.costExposure <= 1 ? '#f59e0b' : '#dc2626', lineHeight: 1 }}>
                +{data.costExposure}<span style={{ fontSize: 17, fontWeight: 700 }}>M</span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Budget: <strong style={{ color: '#0f172a' }}>AED {data.budget}M</strong></span>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Forecast: <strong style={{ color: data.costExposure <= 1 ? '#f59e0b' : '#dc2626' }}>AED {data.forecastCost}M</strong></span>
              </div>
            </KpiCard>

            {/* Productivity */}
            <KpiCard>
              <CardRow>
                <CardLabel>Productivity</CardLabel>
                <Users size={15} color="#64748b" />
              </CardRow>
              <BigNum color="#0f172a">{data.productivity}%</BigNum>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: data.productivityGap >= -10 ? '#f59e0b' : '#dc2626' }}>{data.productivityGap}%</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Gap</div>
                </div>
                <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{data.productivity >= 90 ? 'Near' : 'Below'}</div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Target</div>
                </div>
              </div>
            </KpiCard>

            {/* Recovery Potential */}
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12,
              padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <CardRow>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Recovery Potential</span>
                <Zap size={15} color="#16a34a" />
              </CardRow>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d', lineHeight: 1, marginTop: 10 }}>
                {data.recoveryDays} <span style={{ fontSize: 16, fontWeight: 700 }}>Days</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>AED {data.recoverySavings} Sav.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#bbf7d0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${data.recoveryConf}%`, height: '100%', background: '#16a34a', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{data.recoveryConf}% Conf.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom panels ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>

            {/* Schedule Intelligence */}
            <Panel>
              <PanelHeader
                icon={<Activity size={17} color="#0f172a" />}
                title="Schedule Intelligence"
                action="View Critical Path"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr 0.7fr', gap: 8, paddingBottom: 10, borderBottom: '1px solid #f1f5f9', marginBottom: 2 }}>
                {['Phase', 'Variance', 'Root Cause', 'Impact'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>

              {data.scheduleRows.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.2fr 0.7fr', gap: 8,
                  padding: '13px 0', borderBottom: i < data.scheduleRows.length - 1 ? '1px solid #f8fafc' : 'none',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{row.phase}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.variance === 'Closed' ? '#16a34a' : '#dc2626' }}>{row.variance}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>{row.rootCause}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    background: row.badge.bg, color: row.badge.color,
                    padding: '3px 9px', borderRadius: 6, textAlign: 'center',
                    display: 'inline-block', whiteSpace: 'nowrap',
                  }}>{row.impact}</span>
                </div>
              ))}

              <InsightBox color="#16a34a" borderColor="#bbf7d0" bg="#f0fdf4">
                <InsightHeader icon={<Lightbulb size={14} color="#16a34a" />} title="Theta AI Insight" />
                <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.65 }}>
                  {data.aiInsight}
                </p>
              </InsightBox>
            </Panel>

            {/* Cost Intelligence */}
            <Panel>
              <PanelHeader
                icon={<BarChart2 size={17} color="#0f172a" />}
                title="Cost Intelligence"
                action="Full Breakdown"
              />

              <ResponsiveContainer width="100%" height={155}>
                <BarChart data={data.costChart} barSize={24} margin={{ top: 18, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v, name) => [`AED ${v}M`, name === 'budget' ? 'Budget' : 'Overrun']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="budget" fill="#bfdbfe" radius={[3, 3, 0, 0]} name="Budget" />
                  <Bar dataKey="overrun" fill="#fca5a5" radius={[3, 3, 0, 0]} name="Overrun">
                    <LabelList dataKey="tag" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#dc2626' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.costBreakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <InsightBox color="#dc2626" borderColor="#fecaca" bg="#fff8f8">
                <InsightHeader icon={<AlertTriangle size={14} color="#dc2626" />} title="Cost-Schedule Linkage" />
                <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.65 }}>
                  {data.costLinkage}
                </p>
              </InsightBox>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MonthYearPicker ───────────────────────────────────────────────────────────

function MonthYearPicker({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={value.month}
          onChange={e => onChange({ ...value, month: e.target.value })}
          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
        >
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={value.year}
          onChange={e => onChange({ ...value, year: e.target.value })}
          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function KpiCard({ children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {children}
    </div>
  );
}

function CardRow({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{children}</span>;
}

function BigNum({ children, color = '#0f172a' }) {
  return <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>{children}</div>;
}

function Panel({ children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
      padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {children}
    </div>
  );
}

function PanelHeader({ icon, title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</span>
      </div>
      {action && (
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#16a34a', padding: 0 }}>
          {action}
        </button>
      )}
    </div>
  );
}

function InsightBox({ children, color, borderColor, bg }) {
  return (
    <div style={{
      marginTop: 18, background: bg,
      border: `1px solid ${borderColor}`, borderLeft: `3.5px solid ${color}`,
      borderRadius: 8, padding: '13px 16px',
    }}>
      {children}
    </div>
  );
}

function InsightHeader({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{title}</span>
    </div>
  );
}
