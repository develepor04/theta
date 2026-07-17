import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { 
  AlertCircle, Target, CheckCircle, Activity, BrainCircuit, Lightbulb, 
  TrendingUp, Info, ShieldAlert, BarChart3, LayoutDashboard, 
  X, Sparkles, Zap, ThumbsUp, ThumbsDown, ChevronRight, Loader2,
  AlertTriangle, Eye, Flame, Layers
} from 'lucide-react';
import useStore from '../store/useStore';
import api, { engageService } from '../services/api';

const isNumericScore = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return Number.isFinite(Number(value));
};

const BenchmarkOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overall');

  // AI Insight Modal
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  const [precomputeStatus, setPrecomputeStatus] = useState('idle');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [shareSuccess, setShareSuccess] = useState(null);
  const [lastInsightRequest, setLastInsightRequest] = useState(null);
  const [animatedIndex, setAnimatedIndex] = useState(0);
  const [animatedReviewCount, setAnimatedReviewCount] = useState(0);
  const [animatedBottomLineWords, setAnimatedBottomLineWords] = useState(0);
  const [chartListModal, setChartListModal] = useState({
    open: false,
    title: '',
    items: [],
    tone: 'slate',
  });
  const [selectedStrategicNode, setSelectedStrategicNode] = useState(null);
  const [selectedRiskPulse, setSelectedRiskPulse] = useState(null);
  const [selectedPerformanceSignal, setSelectedPerformanceSignal] = useState(null);
  const [selectedPerformanceVector, setSelectedPerformanceVector] = useState(null);

  const { user } = useStore();

  useEffect(() => {
    const fetchBenchmark = async () => {
      try {
        const response = await api.get('/benchmark');
        setData(response.data);
        if (response.data?.precomputeStatus) {
          setPrecomputeStatus(response.data.precomputeStatus);
        }
      } catch (err) {
        setError("Failed to load benchmark data. Please ensure the Excel file is present.");
      } finally {
        setLoading(false);
      }
    };
    fetchBenchmark();
  }, []);

  const benchmarkIndexValue = useMemo(() => {
    const raw = String(data?.overallInfo?.index || '68 / 100');
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 68;
  }, [data?.overallInfo?.index]);

  const managementReviewCount = useMemo(() => {
    const strong = data?.managementReview?.strong?.length || 0;
    const weak = data?.managementReview?.weak?.length || 0;
    return strong + weak;
  }, [data?.managementReview?.strong, data?.managementReview?.weak]);

  const bottomLineWordCount = useMemo(() => {
    const txt = String(data?.managementReview?.conclusion || '').trim();
    return txt ? txt.split(/\s+/).length : 0;
  }, [data?.managementReview?.conclusion]);

  const overallGaugeData = useMemo(() => ([
    {
      name: 'Benchmark Index',
      value: Number(benchmarkIndexValue || 0),
      fill: '#059669',
    },
  ]), [benchmarkIndexValue]);

  const overallKpiBars = useMemo(() => {
    const rows = (data?.scorecard || [])
      .filter((x) => typeof x?.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => {
        const raw = String(x.area || 'KPI');
        const short = raw.length > 22 ? `${raw.slice(0, 22)}…` : raw;
        return {
          area: short,
          fullArea: raw,
          score: x.score,
          fill: x.score >= 80 ? '#10b981' : x.score < 60 ? '#f43f5e' : '#f59e0b',
        };
      });

    return rows;
  }, [data?.scorecard]);

  const managementReviewSplit = useMemo(() => {
    const strongCount = data?.managementReview?.strong?.length || 0;
    const weakCount = data?.managementReview?.weak?.length || 0;
    const total = strongCount + weakCount;

    if (total === 0) {
      return [{ name: 'No review data', value: 1, fill: '#cbd5e1' }];
    }

    return [
      { name: 'Strong Areas', value: strongCount, fill: '#10b981' },
      { name: 'Weak Areas', value: weakCount, fill: '#f43f5e' },
    ];
  }, [data?.managementReview?.strong, data?.managementReview?.weak]);

  const managementVisualMetrics = useMemo(() => {
    const strongCount = data?.managementReview?.strong?.length || 0;
    const weakCount = data?.managementReview?.weak?.length || 0;
    const conclusionText = String(data?.managementReview?.conclusion || '').trim();
    const conclusionPoints = conclusionText
      ? conclusionText
          .split(/\n|[•]|\.\s+/)
          .map((x) => x.trim())
          .filter(Boolean).length
      : 0;

    return [
      { metric: 'Strong Items', value: strongCount, fill: '#10b981' },
      { metric: 'Weak Items', value: weakCount, fill: '#f43f5e' },
      { metric: 'Conclusion Points', value: conclusionPoints, fill: '#6366f1' },
    ];
  }, [data?.managementReview?.strong, data?.managementReview?.weak, data?.managementReview?.conclusion]);

  const strategicConstellation = useMemo(() => {
    const insights = (data?.strategicInsights || []).filter(Boolean);
    const themeRules = [
      { name: 'Execution', fill: '#22c55e', test: /(execution|deliver|handover|milestone|plan|progress)/i },
      { name: 'Risk', fill: '#f43f5e', test: /(risk|delay|critical|issue|bottleneck|escalat)/i },
      { name: 'Governance', fill: '#818cf8', test: /(governance|review|decision|stakeholder|compliance)/i },
      { name: 'Resources', fill: '#06b6d4', test: /(resource|manpower|cost|budget|procure|capacity)/i },
      { name: 'Quality', fill: '#f59e0b', test: /(quality|rework|assurance|test|technical|engineering)/i },
    ];
    const urgencyRegex = /(urgent|immediate|critical|must|high|delay|risk|escalat)/i;

    if (!insights.length) {
      return { nodes: [], themeCounts: [], themePointers: [] };
    }

    const counts = {};
    themeRules.forEach((t) => { counts[t.name] = 0; });
    counts.Other = 0;

    const themeBuckets = {
      Execution: [],
      Risk: [],
      Governance: [],
      Resources: [],
      Quality: [],
      Other: [],
    };

    const nodes = insights.map((text, idx) => {
      const safeText = String(text || '').trim();
      const theme = themeRules.find((t) => t.test.test(safeText)) || { name: 'Other', fill: '#94a3b8' };
      counts[theme.name] = (counts[theme.name] || 0) + 1;
      themeBuckets[theme.name] = [...(themeBuckets[theme.name] || []), safeText];

      const urgency = urgencyRegex.test(safeText) ? 'high' : safeText.length > 140 ? 'medium' : 'low';
      const angle = (idx / insights.length) * Math.PI * 2 + (idx % 2 ? 0.18 : -0.12);
      const ring = idx % 4;
      const radius = 16 + ring * 9 + Math.floor(idx / 4) * 2.5;
      const clampedRadius = Math.min(radius, 44);

      return {
        id: idx,
        title: `Strategic Insight ${idx + 1}`,
        text: safeText,
        theme: theme.name,
        fill: theme.fill,
        urgency,
        x: 50 + clampedRadius * Math.cos(angle),
        y: 50 + clampedRadius * Math.sin(angle),
        size: urgency === 'high' ? 14 : urgency === 'medium' ? 12 : 10,
      };
    });

    const themeCounts = [
      ...themeRules.map((t) => ({ name: t.name, value: counts[t.name], fill: t.fill })),
      { name: 'Other', value: counts.Other, fill: '#94a3b8' },
    ].filter((x) => x.value > 0);

    const themePointers = [
      ...themeRules.map((t) => ({ name: t.name, fill: t.fill, points: (themeBuckets[t.name] || []).slice(0, 2) })),
      { name: 'Other', fill: '#94a3b8', points: (themeBuckets.Other || []).slice(0, 2) },
    ].filter((x) => x.points.length > 0);

    return { nodes, themeCounts, themePointers };
  }, [data?.strategicInsights]);

  const riskIntelligenceBoard = useMemo(() => {
    const rows = (data?.heatmapDetails || []).slice(1).filter((row) => Array.isArray(row) && row.length > 2);
    const levelWeight = { High: 1, 'Medium-High': 0.72, Medium: 0.45 };

    const grouped = {
      High: [],
      'Medium-High': [],
      Medium: [],
    };

    const normalized = rows
      .map((row, idx) => {
        const level = String(row?.[2] || '').trim();
        if (!grouped[level]) return null;
        const title = String(row?.[1] || `Risk ${idx + 1}`).trim();
        const detail = String(row?.[3] || '').trim();
        const impact = String(row?.[4] || '').trim();
        const score = Math.max(18, 96 - idx * 7);
        const slot = (idx % 6) + 1;
        const id = `${level}-${idx}-${title}`;

        return {
          id,
          idx: row?.[0],
          title,
          level,
          detail,
          impact,
          score,
          slot,
        };
      })
      .filter(Boolean);

    normalized.forEach((risk) => {
      grouped[risk.level] = [...grouped[risk.level], risk];
    });

    const total = normalized.length;
    const highCount = grouped.High.length;
    const mediumHighCount = grouped['Medium-High'].length;
    const mediumCount = grouped.Medium.length;

    const weighted =
      highCount * levelWeight.High +
      mediumHighCount * levelWeight['Medium-High'] +
      mediumCount * levelWeight.Medium;

    const exposureIndex = total > 0 ? Math.round((weighted / total) * 100) : 0;

    const driverNodes = (data?.topDrivers || []).slice(0, 6).map((driver, i) => ({
      name: String(driver || '').trim(),
      weight: Math.max(28, 100 - i * 12),
      rank: i + 1,
    }));

    const allRisks = [...grouped.High, ...grouped['Medium-High'], ...grouped.Medium];

    return {
      grouped,
      allRisks,
      total,
      highCount,
      mediumHighCount,
      mediumCount,
      exposureIndex,
      driverNodes,
    };
  }, [data?.heatmapDetails, data?.topDrivers]);

  const performanceCommandDeck = useMemo(() => {
    const scoreRows = (data?.scorecard || []).filter((x) => typeof x?.score === 'number');
    const total = scoreRows.length || 1;
    const avgScore = Math.round(scoreRows.reduce((acc, item) => acc + Number(item.score || 0), 0) / total);

    const statusCounts = scoreRows.reduce((acc, item) => {
      const key = String(item?.status || '').toLowerCase();
      if (key === 'green') acc.green += 1;
      else if (key === 'amber') acc.amber += 1;
      else if (key === 'red') acc.red += 1;
      else acc.other += 1;
      return acc;
    }, { green: 0, amber: 0, red: 0, other: 0 });

    const radarRows = (data?.radarData || [])
      .filter((x) => x && typeof x.A === 'number')
      .map((x) => ({
        subject: String(x.subject || 'Dimension'),
        value: Number(x.A || 0),
      }));

    const topMomentum = [...radarRows].sort((a, b) => b.value - a.value).slice(0, 3);
    const focusZones = [...radarRows].sort((a, b) => a.value - b.value).slice(0, 3);

    const allSignals = scoreRows.map((item, idx) => {
      const score = Number(item.score || 0);
      const status = String(item.status || 'amber').toLowerCase();
      return {
        id: `kpi-${idx}-${String(item.area || 'kpi')}`,
        area: String(item.area || 'KPI'),
        score,
        status,
        basis: String(item.basis || ''),
        lane: status === 'green' ? 'Green' : status === 'red' ? 'Red' : 'Amber',
      };
    });

    const groupedSignals = {
      Green: allSignals.filter((x) => x.lane === 'Green').sort((a, b) => b.score - a.score),
      Amber: allSignals.filter((x) => x.lane === 'Amber').sort((a, b) => b.score - a.score),
      Red: allSignals.filter((x) => x.lane === 'Red').sort((a, b) => b.score - a.score),
    };

    const varianceVectors = radarRows.map((row, idx) => {
      const status = row.value >= 80 ? 'green' : row.value < 60 ? 'red' : 'amber';
      const angle = (idx / Math.max(1, radarRows.length)) * Math.PI * 2 + (idx % 2 ? 0.2 : -0.14);
      const radius = Math.min(38, 16 + (idx % 4) * 7 + Math.floor(idx / 4) * 2);
      return {
        id: `variance-${idx}-${row.subject}`,
        subject: row.subject,
        score: row.value,
        status,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        size: row.value < 60 ? 13 : row.value >= 80 ? 10 : 11,
      };
    });

    const statusPriority = { red: 0, amber: 1, green: 2 };
    const signalFabric = [...allSignals]
      .sort((a, b) => {
        const pa = statusPriority[a.status] ?? 1;
        const pb = statusPriority[b.status] ?? 1;
        if (pa !== pb) return pa - pb;
        return b.score - a.score;
      })
      .map((item, idx) => ({
        ...item,
        pulseRank: idx + 1,
      }));

    const trajectoryStreams = radarRows
      .sort((a, b) => b.value - a.value)
      .map((row, idx) => {
        const status = row.value >= 80 ? 'green' : row.value < 60 ? 'red' : 'amber';
        return {
          id: `stream-${idx}-${row.subject}`,
          subject: row.subject,
          score: row.value,
          status,
          force: Math.max(12, row.value),
          drag: Math.max(5, 100 - row.value),
          band: row.value >= 80 ? 'Acceleration' : row.value < 60 ? 'Drag' : 'Stabilize',
        };
      });

    return {
      avgScore,
      statusCounts,
      topMomentum,
      focusZones,
      allSignals,
      groupedSignals,
      varianceVectors,
      signalFabric,
      trajectoryStreams,
    };
  }, [data?.scorecard, data?.radarData]);

  const dimensionalVarianceBars = useMemo(() => {
    return (performanceCommandDeck.trajectoryStreams || [])
      .slice(0, 8)
      .map((item) => ({
        subject: item.subject,
        score: item.score,
        status: item.status,
        color:
          item.status === 'green'
            ? '#10b981'
            : item.status === 'red'
              ? '#f43f5e'
              : '#f59e0b',
      }));
  }, [performanceCommandDeck.trajectoryStreams]);

  useEffect(() => {
    if (!strategicConstellation.nodes.length) {
      setSelectedStrategicNode(null);
      return;
    }
    setSelectedStrategicNode((prev) => {
      if (!prev) return strategicConstellation.nodes[0];
      const stillExists = strategicConstellation.nodes.find((n) => n.id === prev.id);
      return stillExists || strategicConstellation.nodes[0];
    });
  }, [strategicConstellation.nodes]);

  useEffect(() => {
    const seed = riskIntelligenceBoard.allRisks[0] || null;
    if (!seed) {
      setSelectedRiskPulse(null);
      return;
    }

    setSelectedRiskPulse((prev) => {
      if (!prev) return seed;
      const stillExists = riskIntelligenceBoard.allRisks.find((r) => r.id === prev.id);
      return stillExists || seed;
    });
  }, [riskIntelligenceBoard.allRisks]);

  useEffect(() => {
    const firstSignal = performanceCommandDeck.allSignals[0] || null;
    if (!firstSignal) {
      setSelectedPerformanceSignal(null);
      return;
    }
    setSelectedPerformanceSignal((prev) => {
      if (!prev) return firstSignal;
      const keep = performanceCommandDeck.allSignals.find((x) => x.id === prev.id);
      return keep || firstSignal;
    });
  }, [performanceCommandDeck.allSignals]);

  useEffect(() => {
    const firstVector = performanceCommandDeck.varianceVectors[0] || null;
    if (!firstVector) {
      setSelectedPerformanceVector(null);
      return;
    }
    setSelectedPerformanceVector((prev) => {
      if (!prev) return firstVector;
      const keep = performanceCommandDeck.varianceVectors.find((x) => x.id === prev.id);
      return keep || firstVector;
    });
  }, [performanceCommandDeck.varianceVectors]);

  useEffect(() => {
    let rafId;
    const duration = 2500;
    const start = performance.now();

    const fromIndex = 0;
    const fromReview = 0;
    const fromBottomWords = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      setAnimatedIndex(fromIndex + (benchmarkIndexValue - fromIndex) * eased);
      setAnimatedReviewCount(Math.round(fromReview + (managementReviewCount - fromReview) * eased));
      setAnimatedBottomLineWords(Math.round(fromBottomWords + (bottomLineWordCount - fromBottomWords) * eased));

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [benchmarkIndexValue, managementReviewCount, bottomLineWordCount]);

  const requestInsight = useCallback(async ({ section, title, contextText, score, status, basis }) => {
    const requestPayload = { section, title, contextText, score, status, basis };
    setLastInsightRequest(requestPayload);
    setSelectedKpi({ area: title, score: score ?? '-', status: status ?? 'amber', basis: basis ?? '' });
    setAiInsight(null);
    setInsightError(null);
    setShareError(null);
    setShareSuccess(null);
    setInsightLoading(true);
    setShowInsightModal(true);

    try {
      const res = await api.post('/benchmark/insight', {
        section,
        title,
        context_text: contextText,
      });
      setAiInsight(res.data);
    } catch (err) {
      setInsightError(err?.response?.data?.error || 'Failed to generate AI insight. Please try again.');
    } finally {
      setInsightLoading(false);
    }
  }, []);

  // ── Fetch AI insights for a KPI card ──────────────────────────────────
  const handleKpiClick = useCallback(async (item) => {
    await requestInsight({
      section: 'kpi',
      title: item.area,
      contextText: `Area: ${item.area}\nScore: ${item.score}\nStatus: ${item.status}\nBasis: ${item.basis || ''}`,
      score: item.score,
      status: item.status,
      basis: item.basis,
    });
  }, [requestInsight]);

  const handleShareToEngage = useCallback(async () => {
    if (!aiInsight || !selectedKpi?.area) return;
    setShareLoading(true);
    setShareError(null);
    setShareSuccess(null);
    try {
      const hasScore = isNumericScore(selectedKpi?.score);
      const post = [
        `## Intelligence Hub AI Insight`,
        `**Section:** ${aiInsight.section || activeTab}`,
        `**Item:** ${selectedKpi.area}`,
        hasScore ? `**Score:** ${selectedKpi.score}/100` : '',
        '',
        aiInsight.summary_headline ? `**Headline:** ${aiInsight.summary_headline}` : '',
        aiInsight.present_analysis ? `**Present Analysis:** ${aiInsight.present_analysis}` : '',
        aiInsight.future_impact ? `**Future Impact:** ${aiInsight.future_impact}` : '',
        '',
        aiInsight.recommendations?.length ? `### Recommendations\n${aiInsight.recommendations.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '',
      ].filter(Boolean).join('\n');

      await engageService.createPost(post, 'ai_chat');
      setShareSuccess('✅ Insight shared successfully to Theta Engage.');
    } catch (err) {
      setShareError(err?.response?.data?.error || 'Failed to share insight to Theta Engage.');
    } finally {
      setShareLoading(false);
    }
  }, [aiInsight, selectedKpi, activeTab]);

  useEffect(() => {
    if (!user?.id) return;
    let timer = null;

    const startPrecompute = async () => {
      try {
        await api.post('/benchmark/precompute-insights', {});
      } catch {
        // silent - not blocking dashboard usage
      }
    };

    const pollPrecompute = async () => {
      try {
        const res = await api.get('/benchmark/precompute-status');
        const nextStatus = res?.data?.status?.status || 'idle';
        setPrecomputeStatus(nextStatus);
        if (nextStatus === 'running') {
          timer = setTimeout(pollPrecompute, 3500);
        }
      } catch {
        // no-op
      }
    };

    startPrecompute();
    pollPrecompute();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user?.id]);

  const closeInsightModal = () => {
    setShowInsightModal(false);
    setSelectedKpi(null);
    setAiInsight(null);
    setInsightError(null);
    setShareError(null);
    setShareSuccess(null);
    setLastInsightRequest(null);
  };

  const openChartListModal = useCallback((title, items = [], tone = 'slate') => {
    setChartListModal({
      open: true,
      title,
      items: Array.isArray(items) ? items : [],
      tone,
    });
  }, []);

  const closeChartListModal = useCallback(() => {
    setChartListModal({ open: false, title: '', items: [], tone: 'slate' });
  }, []);

  const handleReviewSplitClick = useCallback((slice) => {
    const strong = data?.managementReview?.strong || [];
    const weak = data?.managementReview?.weak || [];
    const name = String(slice?.name || '');

    if (name === 'Strong Areas') {
      openChartListModal('Strong Areas Represented', strong, 'emerald');
      return;
    }

    if (name === 'Weak Areas') {
      openChartListModal('Weak Areas Represented', weak, 'rose');
      return;
    }

    openChartListModal('Review Strength Split', ['No review points available in the current dataset.'], 'slate');
  }, [data?.managementReview?.strong, data?.managementReview?.weak, openChartListModal]);

  const handleMatrixMetricClick = useCallback((bar) => {
    const metric = String(bar?.metric || '');
    const strong = data?.managementReview?.strong || [];
    const weak = data?.managementReview?.weak || [];
    const conclusion = String(data?.managementReview?.conclusion || '').trim();
    let conclusionPoints = conclusion
      .split(/\n|[•]|\.\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (conclusionPoints.length === 0 && conclusion) {
      conclusionPoints = [conclusion];
    }

    if (metric === 'Strong Items') {
      openChartListModal('Strong Items Represented', strong, 'emerald');
      return;
    }

    if (metric === 'Weak Items') {
      openChartListModal('Weak Items Represented', weak, 'rose');
      return;
    }

    if (metric === 'Conclusion Points') {
      openChartListModal('Conclusion Depth Elements', conclusionPoints, 'indigo');
      return;
    }

    openChartListModal('Matrix Elements', ['No mapped elements available for this metric.'], 'slate');
  }, [data?.managementReview?.strong, data?.managementReview?.weak, data?.managementReview?.conclusion, openChartListModal]);

  const handleStrategicNodeSelect = useCallback((node) => {
    setSelectedStrategicNode(node);
  }, []);

  const handlePerformanceStatusDrilldown = useCallback((lane) => {
    const laneKey = String(lane || '').toLowerCase();
    const statusMap = {
      optimal: 'Green',
      warning: 'Amber',
      critical: 'Red',
    };

    const mappedLane = statusMap[laneKey];
    if (!mappedLane) return;

    const items = (performanceCommandDeck.groupedSignals?.[mappedLane] || []).map((item) => (
      `${item.area} — Score ${item.score}/100${item.basis ? ` | Basis: ${item.basis}` : ''}`
    ));

    const titleMap = {
      Green: 'Optimal KPIs',
      Amber: 'Warning KPIs',
      Red: 'Critical KPIs',
    };

    const toneMap = {
      Green: 'emerald',
      Amber: 'amber',
      Red: 'rose',
    };

    openChartListModal(
      `${titleMap[mappedLane]} (${items.length})`,
      items.length ? items : [`No ${laneKey} KPIs found in current dataset.`],
      toneMap[mappedLane] || 'slate'
    );
  }, [performanceCommandDeck.groupedSignals, openChartListModal]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
        <AlertCircle size={20} />
        <span className="font-medium">{error || "No data available"}</span>
      </div>
    );
  }

  const getStatusClasses = (status) => {
    switch (status) {
      case 'green': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'red': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'green': return <CheckCircle size={14} className="text-emerald-500 mr-1" />;
      case 'amber': return <Activity size={14} className="text-amber-500 mr-1" />;
      case 'red': return <AlertCircle size={14} className="text-rose-500 mr-1" />;
      default: return null;
    }
  };

  const tabContentVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
  };

  const tabs = [
    { id: 'overall', label: 'Overall Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'performance', label: 'Performance Command Deck', icon: <BarChart3 size={16} /> },
    { id: 'risks', label: 'Risks & Delays', icon: <ShieldAlert size={16} /> },
    { id: 'strategic', label: 'Strategic Intelligence', icon: <Lightbulb size={16} /> }
  ];

  const roundedAnimatedIndex = Math.max(0, Math.min(100, Math.round(animatedIndex)));
  const benchmarkRingRadius = 54;
  const benchmarkRingCircumference = 2 * Math.PI * benchmarkRingRadius;
  const benchmarkRingOffset = benchmarkRingCircumference - (roundedAnimatedIndex / 100) * benchmarkRingCircumference;

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      
      {/* Category Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold font-medium text-sm transition-all shadow-sm
              ${activeTab === tab.id ? 'bg-white text-emerald-600 shadow border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200 border border-transparent'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">AI cache status:</span>
        <span className={`px-2.5 py-1 rounded-full border font-semibold ${
          precomputeStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          precomputeStatus === 'running' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          precomputeStatus === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
          'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          {precomputeStatus === 'completed' ? 'Ready' : precomputeStatus === 'running' ? 'Preparing insights' : precomputeStatus}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* OVERALL TAB */}
        {activeTab === 'overall' && (
          <motion.div key="overall" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6">
            
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="flex items-center justify-between gap-3 mb-4 z-10 relative">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-900 m-0">
                    <Activity className="text-emerald-600" />
                    Overall Project Health Profile
                  </h2>
                  
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                   <div className="flex flex-col justify-center items-center bg-white rounded-xl shadow-sm p-6 border border-emerald-100 relative overflow-hidden">
                      <p className="text-xs text-emerald-700 font-bold uppercase tracking-[0.12em] mb-3 z-10">Benchmark Index</p>

                      <div className="relative w-[180px] h-[180px] flex items-center justify-center z-10">
                        <div className="absolute inset-3 rounded-full bg-emerald-200/55 blur-2xl animate-pulse" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 via-white to-cyan-100" />

                        <svg viewBox="0 0 140 140" className="relative z-10 w-[170px] h-[170px] -rotate-90">
                          <defs>
                            <linearGradient id="benchmarkRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="55%" stopColor="#14b8a6" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                          </defs>

                          <circle
                            cx="70"
                            cy="70"
                            r={benchmarkRingRadius}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.22)"
                            strokeWidth="10"
                          />

                          <circle
                            cx="70"
                            cy="70"
                            r={benchmarkRingRadius}
                            fill="none"
                            stroke="url(#benchmarkRingGradient)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={benchmarkRingCircumference}
                            strokeDashoffset={benchmarkRingOffset}
                            style={{ transition: 'stroke-dashoffset 0.9s ease-in-out' }}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                          <span className="text-5xl font-black text-emerald-900 leading-none">{roundedAnimatedIndex}</span>
                          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700/80">of 100</span>
                        </div>
                      </div>

                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700 z-10">
                        <Sparkles size={12} /> Soft Dynamic Circle
                      </div>

                      <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none">
                         <Target size={120} />
                      </div>
                   </div>
                   <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-emerald-100 flex flex-col justify-center">
                     <div className="inline-flex items-center gap-2 w-fit mb-3 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-semibold tracking-wide uppercase text-emerald-700">
                       <ShieldAlert size={14} /> Executive Snapshot
                     </div>
                     <p className="text-slate-700 font-medium leading-relaxed mb-0">
                       {data.overallInfo?.summary || "Project data overview summary not available."}
                     </p>
                   </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800 m-0 flex items-center gap-2">
                  <Target size={18} className="text-emerald-600" />
                  Top KPI Radar Mapping
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 h-[320px] bg-slate-50/50 rounded-xl border border-slate-100 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={overallKpiBars}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="area" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                      <Radar name="KPI Score" dataKey="score" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.25} />
                      <Tooltip 
                        formatter={(value) => [`${value}/100`, 'Score']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullArea || label}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 flex flex-col justify-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-5">
                   <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">Apex Performers</h4>
                   {overallKpiBars.slice(0, 4).map((kpi, idx) => (
                      <div key={`kpi-apex-${idx}`} className="flex items-center justify-between border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-semibold text-slate-700 truncate mr-2" title={kpi.fullArea}>{kpi.area}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                           <span className="text-xs font-bold text-emerald-700">{kpi.score}</span>
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
               <div className="flex items-center justify-between gap-3 mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 m-0">
                   <BrainCircuit className="text-indigo-600" size={20} />
                   Management Review Area Mapping
                 </h3>
                 
               </div>
               
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 h-[280px] bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 text-center pb-2 border-b border-slate-200/50">Click points on wave to inspect details</span>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={managementVisualMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <Tooltip cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#6366f1" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                          activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2, onClick: (e, payload) => handleMatrixMetricClick(payload.payload) }}
                          cursor="pointer"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center p-5 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                    <h4 className="font-bold text-slate-800 m-0">Bottom Line Management View</h4>
                    
                  </div>
                  <div className="text-slate-600 font-medium leading-relaxed relative z-10">
                    {data.managementReview?.conclusion}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <motion.div key="performance" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

              <div className="mb-6 border-b border-slate-100 pb-4 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                    <Activity className="text-indigo-600" size={22} />
                    Performance Command Deck
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 mb-0">Variance radar vectors, KPI telemetry waves, and dynamic AI insight</p>
                </div>
                
                <div className="flex items-center gap-3">
                   <button
                     onClick={() => handlePerformanceStatusDrilldown('optimal')}
                     className="flex flex-col bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-emerald-300 cursor-pointer text-left"
                     title="View Optimal KPI list"
                   >
                     <span className="text-[10px] uppercase font-bold text-emerald-600">Optimal</span>
                     <span className="text-lg font-black text-emerald-700 leading-none">{performanceCommandDeck.statusCounts.green}</span>
                   </button>
                   <button
                     onClick={() => handlePerformanceStatusDrilldown('warning')}
                     className="flex flex-col bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-amber-300 cursor-pointer text-left"
                     title="View Warning KPI list"
                   >
                     <span className="text-[10px] uppercase font-bold text-amber-600">Warning</span>
                     <span className="text-lg font-black text-amber-700 leading-none">{performanceCommandDeck.statusCounts.amber}</span>
                   </button>
                   <button
                     onClick={() => handlePerformanceStatusDrilldown('critical')}
                     className="flex flex-col bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-rose-300 cursor-pointer text-left"
                     title="View Critical KPI list"
                   >
                     <span className="text-[10px] uppercase font-bold text-rose-600">Critical</span>
                     <span className="text-lg font-black text-rose-700 leading-none">{performanceCommandDeck.statusCounts.red}</span>
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
                {/* Variance Scatter / Radar Chart */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/45 to-cyan-50/45 flex flex-col overflow-hidden shadow-sm h-[430px]">
                  <div className="px-5 py-4 border-b border-indigo-100/70 bg-white/90 backdrop-blur-sm flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold tracking-wide text-indigo-900 m-0 uppercase">Dimensional Variance Matrix</h4>
                      <span className="text-[11px] text-slate-500 font-semibold">High-clarity ranked view of dimensional performance</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">Top dimensions</span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
                    <div className="flex-1 min-h-0 rounded-xl border border-indigo-100/70 bg-white/90">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dimensionalVarianceBars}
                          layout="vertical"
                          margin={{ top: 16, right: 18, left: 16, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eef2ff" />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="subject"
                            width={120}
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => value?.length > 16 ? `${value.slice(0, 16)}…` : value}
                          />
                          <Tooltip
                            formatter={(value, name, props) => [`${value}/100`, props?.payload?.status?.toUpperCase() || 'Score']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.subject || label}
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid #c7d2fe',
                              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                              background: 'rgba(255,255,255,0.98)'
                            }}
                          />
                          <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={16}>
                            {dimensionalVarianceBars.map((entry, idx) => (
                              <Cell key={`variance-bar-${idx}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-2 text-center">Strong</div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-2 text-center">Watch</div>
                      <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-2.5 py-2 text-center">Critical</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-1">Insight</div>
                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        Ranked bars reduce visual clutter and keep dimensional comparison directly readable for executive review.
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Interactive Panel for Radar */}
                <div className="flex flex-col justify-center bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden group h-[430px]">
                   <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                   <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <BrainCircuit size={14} className="text-indigo-500" /> Dimension AI Reactor
                   </h5>
                   
                   <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                     Click any data point on the visualizations, or use the centralized AI system to generate strategic guidance on your aggregated dimensional variance structure.
                   </p>
                   
                   <div className="flex flex-col gap-3">
                     <button
                       onClick={() => requestInsight({
                         section: 'performance-variance',
                         title: `Overall Dimensional Strategy`,
                         contextText: `Trajectory dimensions analyzed over ${performanceCommandDeck.trajectoryStreams.length} structural models. Average command deck score: ${performanceCommandDeck.avgScore}/100.`,
                         score: performanceCommandDeck.avgScore,
                         status: performanceCommandDeck.avgScore >= 80 ? 'green' : performanceCommandDeck.avgScore < 60 ? 'red' : 'amber',
                         basis: 'Analyzed via aggregated dimensional variance matrix',
                       })}
                       className="w-full flex items-center justify-between px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-200"
                     >
                       <span>Generate Overall Dimension Insight</span>
                       <ChevronRight size={16} />
                     </button>
                     
                     <div className="flex flex-wrap gap-2 mt-2">
                       {performanceCommandDeck.topMomentum.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => requestInsight({
                               section: 'performance-variance',
                               title: `Variance Dimension - ${item.subject}`,
                               contextText: `Trajectory dimension: ${item.subject}\nScore: ${item.value}/100`,
                               score: item.value,
                               status: item.value >= 80 ? 'green' : item.value < 60 ? 'red' : 'amber',
                               basis: 'Analyzed specifically from Top Momentum indicators. Focus on actionable insights to sustain or elevate.'
                            })}
                            className="px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            Analyze {item.subject}
                          </button>
                       ))}
                     </div>
                   </div>
                </div>
              </div>

              {/* Area Chart for KPIs */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                 <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                   <h4 className="text-sm font-bold tracking-wide text-slate-800 m-0 uppercase flex items-center gap-2"><Layers size={16} className="text-emerald-500"/> Performance Telemetry Wave</h4>
                   <span className="text-xs font-semibold text-slate-500">Live signal pressure mapping</span>
                 </div>
                 
                 <div className="p-4 grid grid-cols-1 xl:grid-cols-4 gap-6 items-center">
                    <div className="xl:col-span-3 h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceCommandDeck.signalFabric} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="area" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => val.length > 12 ? `${val.substring(0,12)}...` : val} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip 
                             formatter={(value, name, props) => {
                                 const status = props.payload.status;
                                 return [`${value}/100 (${status})`, 'Signal Score'];
                             }}
                             labelFormatter={(label, payload) => payload?.[0]?.payload?.area || label}
                             contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2, onClick: (e, payload) => requestInsight({
                               section: 'kpi',
                               title: payload.payload.area,
                               contextText: `Area: ${payload.payload.area}\nScore: ${payload.payload.score}\nStatus: ${payload.payload.status}\nBasis: ${payload.payload.basis || ''}`,
                               score: payload.payload.score,
                               status: payload.payload.status,
                               basis: payload.payload.basis || 'Telemetry target selected',
                             }) }} cursor="pointer" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="xl:col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-5">
                       <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Live Signal Insight</h5>
                       <p className="text-sm text-slate-600 font-medium mb-4 leading-relaxed">
                         Click any active dot on the telemetry wave to generate immediate AI insight on that specific KPI signal, or generate a consolidated wave check here.
                       </p>
                       <button
                         onClick={() => requestInsight({
                           section: 'performance-summary',
                           title: 'Performance Telemetry Summary',
                           contextText: `Evaluating ${performanceCommandDeck.signalFabric.length} signal endpoints forming the telemetry wave.`,
                           score: performanceCommandDeck.avgScore,
                           status: performanceCommandDeck.avgScore >= 80 ? 'green' : performanceCommandDeck.avgScore < 60 ? 'red' : 'amber',
                           basis: 'Summary generated from overall performance telemetry pressure map',
                         })}
                         className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                       >
                         Execute Wave Check
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && (
          <motion.div key="risks" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

              <div className="mb-6 border-b border-slate-100 pb-4 relative z-10">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                  <ShieldAlert className="text-rose-500" size={22} />
                  Risk Signal Studio
                </h3>
                <p className="text-sm text-slate-500 mt-1 mb-0">Live pressure lanes, focused risk context, and delay force vectors</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white px-4 py-3 relative overflow-hidden">
                  <div className="absolute right-2 top-2 w-10 h-10 rounded-full border-4 border-emerald-300/70 border-t-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <div className="text-[11px] uppercase tracking-wide font-bold text-emerald-700">Exposure Index</div>
                  <div className="text-3xl font-black text-emerald-800 leading-tight mt-1">{riskIntelligenceBoard.exposureIndex}</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-slate-600">High Severity</div>
                  <div className="text-2xl font-black text-rose-700 leading-tight mt-1">{riskIntelligenceBoard.highCount}</div>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-slate-600">Medium-High</div>
                  <div className="text-2xl font-black text-orange-600 leading-tight mt-1">{riskIntelligenceBoard.mediumHighCount}</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide font-bold text-slate-600">Medium</div>
                  <div className="text-2xl font-black text-amber-600 leading-tight mt-1">{riskIntelligenceBoard.mediumCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 relative z-10">
                <div className="xl:col-span-2 rounded-2xl border border-slate-200 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_rgba(255,255,255,1)_56%)]">
                  <div className="px-4 py-3 border-b border-slate-200 bg-white/70 backdrop-blur flex items-center justify-between">
                    <h4 className="text-xs font-bold tracking-[0.13em] uppercase text-slate-700 m-0">Risk Signal Lanes</h4>
                    <span className="text-[11px] font-semibold text-slate-500">Click a pulse node</span>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {['High', 'Medium-High', 'Medium'].map((level) => {
                      const laneItems = riskIntelligenceBoard.grouped[level] || [];
                      const laneTone =
                        level === 'High'
                          ? 'from-rose-50/95 to-white border-rose-200'
                          : level === 'Medium-High'
                            ? 'from-amber-50/95 to-white border-amber-200'
                            : 'from-emerald-50/95 to-white border-emerald-200';
                      const laneDot = level === 'High' ? 'bg-rose-500' : level === 'Medium-High' ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <div key={level} className={`rounded-2xl border bg-gradient-to-r ${laneTone} p-3 relative overflow-hidden`}>
                          <div className="absolute inset-y-0 left-0 right-0 opacity-30 pointer-events-none" style={{ background: 'repeating-linear-gradient(110deg, transparent 0 22px, rgba(148,163,184,0.15) 22px 27px)' }} />
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${laneDot}`} />
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">{level}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">{laneItems.length} pulse(s)</span>
                          </div>

                          {laneItems.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 relative z-10">
                              {laneItems.map((risk) => (
                                <button
                                  key={risk.id}
                                  onClick={() => setSelectedRiskPulse(risk)}
                                  className={`text-left px-3 py-2 rounded-xl border transition-all w-full ${selectedRiskPulse?.id === risk.id ? 'border-emerald-600 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white/95 text-slate-700 hover:border-emerald-300 hover:shadow-sm'}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Pulse {risk.slot}</div>
                                    <div className={`text-[10px] font-bold ${selectedRiskPulse?.id === risk.id ? 'text-white/85' : 'text-slate-500'}`}>S {risk.score}</div>
                                  </div>
                                  <div className="text-xs font-semibold leading-snug mt-0.5 truncate">{risk.title}</div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs italic text-slate-500">No risk pulses in this lane.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 text-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-500/15 blur-2xl" />
                  <h5 className="text-sm font-bold text-emerald-800 m-0 mb-3 tracking-wide uppercase">Impact Reactor</h5>

                  {selectedRiskPulse ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${selectedRiskPulse.level === 'High' ? 'bg-rose-500' : selectedRiskPulse.level === 'Medium-High' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                        <span className="text-xs uppercase tracking-wide font-bold text-slate-700">{selectedRiskPulse.level}</span>
                        <span className="ml-auto text-xs font-semibold text-slate-500">Signal {selectedRiskPulse.score}</span>
                      </div>

                      <div className="text-sm font-bold text-slate-800 leading-snug">{selectedRiskPulse.title}</div>

                      {selectedRiskPulse.detail && (
                        <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 leading-relaxed">
                          {selectedRiskPulse.detail}
                        </div>
                      )}

                      {selectedRiskPulse.impact && (
                        <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 text-xs text-indigo-800 font-medium leading-relaxed">
                          {selectedRiskPulse.impact}
                        </div>
                      )}

                      <button
                        onClick={() => requestInsight({
                          section: 'risk-delay',
                          title: `${selectedRiskPulse.level} Risk - ${selectedRiskPulse.title}`,
                          contextText: `Risk level: ${selectedRiskPulse.level}\nRisk name: ${selectedRiskPulse.title}\nDescription: ${selectedRiskPulse.detail || ''}\nImpact note: ${selectedRiskPulse.impact || ''}`,
                          status: selectedRiskPulse.level === 'High' ? 'red' : 'amber',
                          basis: selectedRiskPulse.detail || selectedRiskPulse.impact || 'Risk pulse selected from command deck',
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-all"
                      >
                        Open AI Insight
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No risk pulse available in this dataset.</div>
                  )}
                </div>

                <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h4 className="text-xs font-bold tracking-[0.13em] uppercase text-slate-700 m-0">Delay Force Ribbons</h4>
                    <span className="text-[11px] font-semibold text-slate-500">Skewed vectors ranked by projected drag</span>
                  </div>

                  {riskIntelligenceBoard.driverNodes.length > 0 ? (
                    <div className="p-4 flex flex-col gap-2.5">
                      {riskIntelligenceBoard.driverNodes.map((driver) => (
                        <button
                          key={driver.name}
                          onClick={() => requestInsight({
                            section: 'risk-delay',
                            title: `Delay Driver - ${driver.name}`,
                            contextText: `Delay driver: ${driver.name}\nDriver force index: ${driver.weight}\nRank: ${driver.rank}`,
                            status: driver.rank <= 2 ? 'red' : driver.rank <= 4 ? 'amber' : 'green',
                            basis: 'Selected from delay driver power stack',
                          })}
                          className="text-left rounded-xl border border-slate-200 bg-white p-0 hover:shadow-md hover:border-slate-300 transition-all overflow-hidden"
                        >
                          <div className="relative px-4 py-3">
                            <div className={`absolute inset-y-0 left-0 ${driver.rank <= 2 ? 'bg-rose-500' : driver.rank <= 4 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${driver.weight}%`, transform: 'skewX(-18deg)', transformOrigin: 'left center', opacity: 0.92 }} />
                            <div className="relative z-10 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Rank #{driver.rank}</div>
                                <div className="text-sm font-black text-slate-900 leading-snug">{driver.name}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-white/90 border border-slate-200 text-xs font-bold text-slate-700">Force {driver.weight}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-slate-500">No delay drivers available in this dataset.</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STRATEGIC TAB */}
        {activeTab === 'strategic' && (
          <motion.div key="strategic" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="mb-6 border-b border-slate-100 pb-4 relative z-10">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                  <Lightbulb className="text-blue-500" size={24} />
                  Strategic Intelligence
                </h3>
                <p className="text-sm text-slate-500 mt-1 mb-0">Actionable recommendations from benchmark comparison — in one command-center visual</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden relative z-10 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold tracking-[0.13em] uppercase text-slate-700 m-0">Strategic Constellation Command Map</h4>
                  {/* <span className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-200">
                    Click any node for AI insight
                  </span> */}
                </div>

                <div className="p-4 md:p-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 relative h-[420px] md:h-[500px] rounded-xl border border-slate-200 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12)_0%,_rgba(248,250,252,1)_62%)]">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {[16, 27, 38, 47].map((r) => (
                        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.34)" strokeWidth="0.28" />
                      ))}
                      {strategicConstellation.nodes.map((n) => (
                        <line
                          key={`link-${n.id}`}
                          x1="50"
                          y1="50"
                          x2={n.x}
                          y2={n.y}
                          stroke={n.fill}
                          strokeOpacity={0.45}
                          strokeWidth="0.34"
                        />
                      ))}
                    </svg>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_8px_30px_rgba(2,132,199,0.20)] border border-white flex items-center justify-center z-20">
                      <BrainCircuit size={26} className="text-white" />
                    </div>

                    {strategicConstellation.nodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleStrategicNodeSelect(node)}
                        title={node.text}
                        className={`absolute rounded-full border transition-all duration-200 hover:scale-110 hover:z-30 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${selectedStrategicNode?.id === node.id ? 'ring-2 ring-emerald-300 border-white' : 'border-white/70'}`}
                        style={{
                          left: `${node.x}%`,
                          top: `${node.y}%`,
                          width: `${node.size * 2}px`,
                          height: `${node.size * 2}px`,
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: node.fill,
                          boxShadow: `0 0 ${node.size * 1.6}px ${node.fill}`,
                        }}
                      >
                        <span className="sr-only">{node.title}</span>
                      </button>
                    ))}

                    {!strategicConstellation.nodes.length && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-semibold">
                        No strategic insights available in current benchmark data.
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-1 border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h5 className="text-sm font-bold text-slate-800 m-0 mb-3">Node Detail Panel</h5>
                    {selectedStrategicNode ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedStrategicNode.fill }} />
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{selectedStrategicNode.theme}</span>
                        </div>

                        <div className="text-sm font-bold text-slate-800 leading-snug">{selectedStrategicNode.title}</div>

                        <div className="text-xs text-slate-500 font-medium">Urgency: <span className="capitalize text-slate-700">{selectedStrategicNode.urgency}</span></div>

                        <div className="p-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 leading-relaxed">
                          {selectedStrategicNode.text}
                        </div>

                        <button
                          onClick={() => requestInsight({
                            section: 'strategic-intelligence',
                            title: selectedStrategicNode.title,
                            contextText: `Strategic insight statement: ${selectedStrategicNode.text}`,
                            status: selectedStrategicNode.urgency === 'high' ? 'red' : selectedStrategicNode.urgency === 'medium' ? 'amber' : 'green',
                            basis: selectedStrategicNode.text,
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-colors"
                        >
                          Open AI Insight
                        </button>

                        <div className="mt-1 pt-3 border-t border-slate-200">
                          <h6 className="text-xs font-bold uppercase tracking-wide text-slate-600 m-0 mb-2">Strategy Theme Pointers</h6>
                          <div className="flex flex-col gap-2.5">
                            {strategicConstellation.themePointers
                              .filter((group) => group.name === selectedStrategicNode.theme)
                              .map((group) => (
                              <div key={group.name} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: group.fill }} />
                                  <span className="text-xs font-bold text-slate-700">{group.name}</span>
                                </div>
                                <ul className="m-0 pl-4 list-disc text-xs text-slate-600 space-y-1">
                                  {group.points.map((point, idx) => (
                                    <li key={`${group.name}-${idx}`} className="leading-relaxed">{point}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                            {strategicConstellation.themePointers.filter((group) => group.name === selectedStrategicNode.theme).length === 0 && (
                              <div className="text-xs text-slate-500">No pointers found for selected theme.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">Select a node from the map to view details.</div>
                    )}
                  </div>

                  <div className="xl:col-span-3 mt-1 flex flex-wrap gap-2.5">
                    {strategicConstellation.themeCounts.map((item) => (
                      <div
                        key={item.name}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
                        style={{
                          color: '#334155',
                          borderColor: `${item.fill}66`,
                          backgroundColor: `${item.fill}22`,
                        }}
                      >
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}: {item.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*  AI INSIGHT MODAL                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showInsightModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={closeInsightModal}
          >
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', stiffness: 240, damping: 22 } }}
              exit={{ scale: 0.94, y: 16, opacity: 0, transition: { duration: 0.18 } }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* ── Modal Header ── */}
              <div className="relative px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 rounded-t-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_70%)] pointer-events-none rounded-t-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                      <BrainCircuit size={15} className="text-white" />
                    </div>
                    <span className="text-white/80 text-xs font-semibold tracking-widest uppercase">AI Intelligence Analysis</span>
                  </div>
                  <h2 className="text-white text-xl font-bold leading-tight m-0">{selectedKpi?.area}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    {isNumericScore(selectedKpi?.score) && (
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        selectedKpi?.status === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        selectedKpi?.status === 'red'   ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                                          'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        Score: {selectedKpi?.score} / 100
                      </div>
                    )}
                    {aiInsight?.urgency && (
                      <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        aiInsight.urgency === 'high'   ? 'bg-rose-500/20 text-rose-100 border border-rose-300/40' :
                        aiInsight.urgency === 'medium' ? 'bg-amber-500/20 text-amber-100 border border-amber-300/40' :
                                                          'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40'
                      }`}>
                        {aiInsight.urgency === 'high' ? <Flame size={10} /> : aiInsight.urgency === 'medium' ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        &nbsp;{aiInsight.urgency.charAt(0).toUpperCase() + aiInsight.urgency.slice(1)} Urgency
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={closeInsightModal} className="relative z-10 p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-full transition-all ml-4 flex-shrink-0">
                  <X size={18} />
                </button>
              </div>

              {/* ── Modal Body ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">

                {/* Loading State */}
                {insightLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <Loader2 size={28} className="text-indigo-500 animate-spin" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                        <Sparkles size={10} className="text-white" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-700 text-base">Generating with Pulse assistance…</p>
                      <p className="text-sm text-slate-400 mt-1">Generating present analysis, future impact &amp; recommendations</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {['Present Analysis', 'Future Impact', 'Recommendations', "Do's & Don'ts"].map((label, i) => (
                        <div key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-medium animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error State */}
                {!insightLoading && insightError && (
                  <div className="p-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                      <AlertCircle size={24} className="text-rose-500" />
                    </div>
                    <p className="font-bold text-slate-700">Could not generate insight</p>
                    <p className="text-sm text-slate-500 max-w-sm">{insightError}</p>
                    <button
                      onClick={() => lastInsightRequest ? requestInsight(lastInsightRequest) : null}
                      className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* AI Insight Content */}
                {!insightLoading && aiInsight && !insightError && (
                  <div className="p-6 flex flex-col gap-5">

                    {/* Headline Banner */}
                    {aiInsight.summary_headline && (
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-start gap-3">
                        <Zap size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <p className="font-bold text-indigo-900 text-sm leading-relaxed m-0">{aiInsight.summary_headline}</p>
                      </div>
                    )}

                    {/* Present Analysis */}
                    {aiInsight.present_analysis && (
                      <div className="rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
                          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Eye size={12} className="text-white" />
                          </div>
                          <h4 className="font-bold text-blue-800 text-sm m-0">Present Status Analysis</h4>
                        </div>
                        <div className="p-4 bg-white">
                          <p className="text-sm text-slate-700 leading-relaxed m-0">{aiInsight.present_analysis}</p>
                        </div>
                      </div>
                    )}

                    {/* Future Impact */}
                    {aiInsight.future_impact && (
                      <div className="rounded-xl border border-amber-100 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
                          <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={12} className="text-white" />
                          </div>
                          <h4 className="font-bold text-amber-800 text-sm m-0">Future Impact &amp; Consequences</h4>
                        </div>
                        <div className="p-4 bg-white">
                          <p className="text-sm text-slate-700 leading-relaxed m-0">{aiInsight.future_impact}</p>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiInsight.recommendations?.length > 0 && (
                      <div className="rounded-xl border border-violet-100 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100">
                          <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center flex-shrink-0">
                            <Lightbulb size={12} className="text-white" />
                          </div>
                          <h4 className="font-bold text-violet-800 text-sm m-0">Strategic Recommendations</h4>
                        </div>
                        <div className="p-4 bg-white flex flex-col gap-2.5">
                          {aiInsight.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-violet-50/50 rounded-lg border border-violet-100/70">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                              <span className="text-sm text-slate-700 font-medium leading-relaxed">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Do's and Don'ts */}
                    {(aiInsight.do_list?.length > 0 || aiInsight.dont_list?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Do's */}
                        {aiInsight.do_list?.length > 0 && (
                          <div className="rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                              <ThumbsUp size={14} className="text-emerald-600 flex-shrink-0" />
                              <h4 className="font-bold text-emerald-800 text-sm m-0">What To Do</h4>
                            </div>
                            <div className="p-4 bg-white flex flex-col gap-2">
                              {aiInsight.do_list.map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Don'ts */}
                        {aiInsight.dont_list?.length > 0 && (
                          <div className="rounded-xl border border-rose-100 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border-b border-rose-100">
                              <ThumbsDown size={14} className="text-rose-600 flex-shrink-0" />
                              <h4 className="font-bold text-rose-800 text-sm m-0">What NOT To Do</h4>
                            </div>
                            <div className="p-4 bg-white flex flex-col gap-2">
                              {aiInsight.dont_list.map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Basis footer */}
                    {selectedKpi?.basis && (
                      <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-500 leading-relaxed m-0"><strong className="text-slate-600">Assessment Basis:</strong> {selectedKpi.basis}</p>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!insightLoading && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between rounded-b-2xl">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1 m-0">
                      <Sparkles size={11} />&nbsp;AI insights powered by Azure AI Foundry
                    </p>
                    {shareError && <p className="text-xs text-rose-600 m-0">{shareError}</p>}
                    {shareSuccess && <p className="text-xs text-emerald-700 m-0">{shareSuccess}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShareToEngage}
                      disabled={shareLoading || !aiInsight}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {shareLoading ? 'Sharing...' : 'Share to Theta Engage'}
                    </button>
                    <button onClick={closeInsightModal} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chartListModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm"
            onClick={closeChartListModal}
          >
            <motion.div
              initial={{ y: 14, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h4 className="m-0 text-base font-bold text-slate-800">{chartListModal.title}</h4>
                <button onClick={closeChartListModal} className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {chartListModal.items?.length > 0 ? (
                  <ul className="m-0 p-0 list-none space-y-2.5">
                    {chartListModal.items.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="w-6 h-6 flex-shrink-0 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-slate-700 leading-relaxed font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">No elements found for this visual.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
};

export default BenchmarkOverview;
