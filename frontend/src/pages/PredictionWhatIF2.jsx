import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { renderMarkdown } from '../utils/renderMarkdown';
import toast from 'react-hot-toast';
import {
  FolderKanban,
  Lightbulb,
  Menu,
  X,
  Sparkles,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  HardHat,
  Wrench,
  Briefcase,
  MessageSquare,
  ChevronDown,
  Building2,
  Package,
  Settings,
  Bot,
  Send,
  History,
  Trash2,
  Plus,
  Calendar,
  Loader2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import useStore from '../store/useStore';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import borougePredSuccAccelerationExtracted from '../data/borougePredSuccAccelerationExtracted.json';
import './Chat.css';
import './PredictionWhatIF2.css';

const PredictionWhatIF = () => {
  const { user } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scenario & Category state
  const [selectedScenario, setSelectedScenario] = useState('whatif_critical_activities');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analysisRequest, setAnalysisRequest] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const outputRef = useRef(null);

  // Real-time dashboard data (replaces hardcoded arrays)
  const [threatTrackerData, setThreatTrackerData] = useState([]);
  const [compressorSavings, setCompressorSavings] = useState([]);
  const [criticalChartPlan, setCriticalChartPlan] = useState([]);
  const [dashboardKpis, setDashboardKpis] = useState({});
  const [criticalNarrative, setCriticalNarrative] = useState({
    core_threat_title: 'The Core Threat: Cascading Civil Overruns',
    core_threat_summary: 'Major civil delays are consuming float and pushing the critical chain right.',
    step1_title: 'Recovery Step 1: Downstream Civil Compression',
    step1_summary: 'Re-planning downstream civil works at dramatically shorter durations absorbs 85 days, reducing the delay entering the compressor installation sequence to just 7 days.',
    step1_baseline_days: [40, 47, 46],
    step1_compressed_days: [16, 16, 16],
    step1_activity_chips: ['A15870 Formwork Removal', 'A15880 Protective Coating', 'A15890 Back Filling'],
    step1_recovered_days: 85,
    step1_residual_to_sequence_days: 7,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // Live recovery narrative — replaces all three static JSON imports
  const [recoveryNarrative, setRecoveryNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  // Resource scenario planner — AI feedback mechanism
  const [rsRows, setRsRows] = useState([
    { activity: 'Mechanical Works (Construction)', fromDays: 270, toDays: 180, type: 'Extra Crew' },
  ]);
  const [rsEffFactors, setRsEffFactors] = useState({
    'Extra Crew':       1.00,
    'Extra Shift':      0.85,
    'Float Compression':0.70,
    'Overtime':         0.75,
    'Fast-Track':       1.10,
  });
  const [showEffTable, setShowEffTable] = useState(false);
  const [rsMonthlyUploads, setRsMonthlyUploads] = useState([]);
  const [rsDataLastUpdated, setRsDataLastUpdated] = useState(null);
  const [rsDataLoading, setRsDataLoading] = useState(false);

  // Predecessor/Successor data (for Predecessor/Successor tab)
  const [predecessorSuccessorData, setPredecessorSuccessorData] = useState([]);
  const [predecessorSuccessorAnalysis, setPredecessorSuccessorAnalysis] = useState(null);
  const [predSuccLoading, setPredSuccLoading] = useState(false);
  const [predSuccError, setPredSuccError] = useState(null);

  // Chatbot state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Category definitions
  const categories = [
    { id: 'construction_precomm', label: 'Construction & Pre-commissioning', icon: HardHat, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { id: 'civil_construction', label: 'Civil Construction', icon: Building2, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
    { id: 'bulk_materials', label: 'Bulk Materials', icon: Package, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
    { id: 'engineering', label: 'Engineering', icon: Wrench, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
    { id: 'mechanical_construction', label: 'Mechanical Construction', icon: Settings, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { id: 'overall', label: 'Overall', icon: TrendingUp, color: '#0f172a', gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' },
  ];

  // What-IF Scenario definitions (the 3 sub-labels)
  const whatIfScenarios = [
    {
      id: 'whatif_critical_activities',
      title: 'WhatIf-Critical Activities',
      subtitle: 'What happens if critical activities or dependencies get delayed?',
      description: 'Analyze delay propagation for highly delayed activities and their ripple effect on predecessors/successors using Word knowledge documents only.',
      recoverableDays: criticalNarrative.step1_recovered_days || 85,
      icon: BarChart3,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      quickActions: [
        'Analyze impact of delayed critical activities',
        'Show successor delays due to current delays',
        'Identify most delayed activities in path'
      ],
      kpiParameters: [
        'Critical Path Length Index (CPLI)',
        'Baseline Execution Index (BEI)',
        'Float Variance',
        'Delay Propagation Impact'
      ],
      buildPrompt: (category) => {
        return `WHAT-IF SCENARIO ANALYSIS — CRITICAL ACTIVITIES DELAY IMPACT

Category: "${category}"

  CRITICAL DATA REQUIREMENT: You MUST ONLY read and use the Word documents available in Knowledgebase/whatifKnowledge. Do NOT use any Excel/JSON data source.

Please provide the following:
1. FIXED WEEKLY KPIs (Always show these at the top):
    Provide a valid JSON code block with \`\`\`json_chart representing a pie chart of issue distribution inferred from the Word knowledge notes.
   Format: \`\`\`json_chart\n{ "type": "pie", "title": "CP Issue Type Distribution", "data": [ { "name": "Issue type", "value": count } ] }\n\`\`\`
   And another JSON code block for Top 5 Delayed activities:
   Format: \`\`\`json_chart\n{ "type": "bar", "title": "Top Delays (Duration vs BL)", "data": [ { "name": "Activity ID", "value": delay_days } ] }\n\`\`\`

2. ACTIVITY DELAY & RIPPLE EFFECT:
    - Identify critical activities under "${category}" that are currently experiencing significant delays from Word-doc context.
    - Explain recovery/risk impact for each activity based only on Word-doc content.
    - Analyze ripple effects on successors and overall project finish only from Word-doc evidence.`;
      },
    },
    // {
    //   id: 'predecessor_successor',
    //   title: 'Predecessor and Successor',
    //   subtitle: 'What are the dependencies and chain impacts for this category?',
    //   description: 'Analyze the predecessor and successor relationships to identify logic sequence and ripple effects.',
    //   recoverableDays: 30,
    //   icon: FolderKanban,
    //   color: '#f59e0b',
    //   gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    //   quickActions: [
    //     'Show activities starting this week',
    //     'Identify critical path driver activities',
    //     'List open-ended/missing logic activities'
    //   ],
    //   kpiParameters: [
    //     'Logic Density',
    //     'Predecessor/Successor Ratio',
    //     'Lag / Lead Variance',
    //     'Open-Ends / Dangling Logic'
    //   ],
    //   buildPrompt: (category) => {
    //     return `Act as an AI Project Advisor using Azure AI Foundry. WHAT-IF SCENARIO ANALYSIS — PREDECESSOR AND SUCCESSOR\n\nCategory: "${category}"\n\nPlease analyze ONLY the Word documents in Knowledgebase/whatifKnowledge and evaluate KPIs such as Logic Density, Pre/Suc Ratio, Lag Variances, and Open-Ends. Do NOT use Excel/JSON sources. Include a visual generated bar chart for dependency triggers by logic type:\n\nUse \`\`\`json_chart for the chart:\n\`\`\`json_chart\n{ "type": "bar", "title": "Dependencies Triggered", "data": [ { "name": "Activity ID", "value": predecessor_count } ] }\n\`\`\`\n\nFocus on the following for the "${category}":\n1. Activities likely to start in the current week based only on Word-doc predecessor completion notes.\n2. For these activities, identify predecessor completion triggers from Word-doc content.\n3. State what this current activity acts as a successor for based on Word-doc evidence.\n4. Highlight the most sensitive predecessor-successor relationships that could drive the critical path from Word-doc knowledge only.`;
    //   },
    // },
  ];

  // History / Session Management
  const sessionStorageKey = user?.id ? `whatIfHistory_${user.id}` : 'whatIfHistory';
  const [sessionHistory, setSessionHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSessionHistory, setShowSessionHistory] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    const saved = localStorage.getItem(sessionStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSessionHistory(parsed);
          loadSession(parsed[0]);
          return;
        }
      } catch (e) {}
    }
    createNewSession();
  }, [user]);

  // Save current session changes
  useEffect(() => {
    if (!currentSessionId) return;
    setSessionHistory(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            selectedScenario,
            selectedCategory,
            analysisRequest,
            startDate,
            endDate,
            output,
            chatMessages,
            title: selectedScenario ? `${whatIfScenarios.find(ws=>ws.id===selectedScenario)?.title} - ${selectedCategory || 'Draft'}` : 'New Analysis',
            lastModified: Date.now()
          };
        }
        return s;
      });
      localStorage.setItem(sessionStorageKey, JSON.stringify(updated));
      return updated;
    });
  }, [output, chatMessages, selectedScenario, selectedCategory, analysisRequest, startDate, endDate]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Analysis',
      selectedScenario: null,
      selectedCategory: '',
      analysisRequest: '',
      startDate: '',
      endDate: '',
      output: '',
      chatMessages: [],
      lastModified: Date.now()
    };
    setSessionHistory(prev => {
      const newHistory = [newSession, ...prev];
      localStorage.setItem(sessionStorageKey, JSON.stringify(newHistory));
      return newHistory;
    });
    loadSession(newSession);
    setShowSessionHistory(false);
  };

  const loadSession = (session) => {
    setCurrentSessionId(session.id);
    setSelectedScenario(session.selectedScenario || 'whatif_critical_activities');
    setSelectedCategory(session.selectedCategory || '');
    setAnalysisRequest(session.analysisRequest || '');
    setStartDate(session.startDate || '');
    setEndDate(session.endDate || '');
    setOutput(session.output || '');
    setChatMessages(session.chatMessages || []);
    setShowSessionHistory(false);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setSessionHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem(sessionStorageKey, JSON.stringify(updated));
      if (updated.length === 0) {
        setTimeout(createNewSession, 0);
      } else if (currentSessionId === id && updated.length > 0) {
        loadSession(updated[0]);
      }
      return updated;
    });
  };

  // Scroll output into view when generated
  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [output]);

  // Fetch dashboard real-time data when critical activities scenario is selected
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (selectedScenario !== 'whatif_critical_activities') {
        setDashboardLoading(false);
        return;
      }

      const cacheKey = user?.company_id
        ? `whatif_critical_dashboard_cache_v1_${user.company_id}`
        : null;
      let hasWarmCache = false;
      try {
        const cachedRaw = cacheKey ? localStorage.getItem(cacheKey) : null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && typeof cached === 'object' && cached.threat_tracker && cached.compressor_savings && cached.kpis) {
            hasWarmCache = true;
            setThreatTrackerData(cached.threat_tracker || []);
            setCompressorSavings(cached.compressor_savings || []);
            setCriticalChartPlan(Array.isArray(cached.chart_plan) ? cached.chart_plan : []);
            setDashboardKpis(cached.kpis || {});
            applyCriticalNarrative(cached.ui_payload || {});
            setDashboardError(null);
            setDashboardLoading(false);
          }
        }
      } catch (cacheErr) {
        console.warn('Critical dashboard cache read failed:', cacheErr);
      }

      setDashboardLoading(!hasWarmCache);
      setDashboardError(null);

      try {
        const response = await api.get('/whatif/critical-dashboard', {
          params: { cached_only: true },
        });

        // Handle response being stringified
        let dashboardData = response.data;
        if (typeof dashboardData === 'string') {
          dashboardData = JSON.parse(dashboardData);
        }

        console.log('Parsed dashboardData:', dashboardData);
        console.log('threat_tracker:', dashboardData.threat_tracker?.length || 0, 'items');
        console.log('compressor_savings:', dashboardData.compressor_savings?.length || 0, 'items');

        if (dashboardData && typeof dashboardData === 'object') {
          const resolvedThreatTracker = dashboardData.threat_tracker || dashboardData?.ui_payload?.threat_tracker || [];
          const resolvedCompressorSavings = dashboardData.compressor_savings || dashboardData?.ui_payload?.compressor_savings || [];
          const resolvedKpis = dashboardData.kpis || dashboardData?.ui_payload?.kpis || {};
          const resolvedChartPlan = Array.isArray(dashboardData.chart_plan) ? dashboardData.chart_plan : [];

          setThreatTrackerData(resolvedThreatTracker);
          setCompressorSavings(resolvedCompressorSavings);
          setCriticalChartPlan(resolvedChartPlan);
          setDashboardKpis(resolvedKpis);
          applyCriticalNarrative(dashboardData.ui_payload || {});

          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              threat_tracker: resolvedThreatTracker,
              compressor_savings: resolvedCompressorSavings,
              kpis: resolvedKpis,
              chart_plan: resolvedChartPlan,
              ui_payload: dashboardData.ui_payload || {},
              generated_at: dashboardData.generated_at || new Date().toISOString(),
              cached: Boolean(dashboardData.cached),
              cache_key: dashboardData.cache_key || null,
            }));
          } catch (cacheWriteErr) {
            console.warn('Critical dashboard cache write failed:', cacheWriteErr);
          }
        }
      } catch (err) {
        // 404 with cached_only=true just means no server cache yet — not a real error
        if (err?.response?.status === 404) {
          console.info('Critical dashboard: no server cache yet, using local JSON fallback');
          setDashboardError(null);
        } else {
          console.error('Dashboard data fetch error:', err);
          setDashboardError(err.response?.data?.error || 'Failed to load cached dashboard data');
        }
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedScenario]);

  // Fetch monthly upload records — used to show which months have data and drive refresh
  const fetchMonthlyUploads = async () => {
    setRsDataLoading(true);
    try {
      const resp = await api.get('/reports/monthly-trend');
      const raw = Array.isArray(resp.data?.rows) ? resp.data.rows
                : Array.isArray(resp.data) ? resp.data : [];
      // Deduplicate by month+year (server already does ON CONFLICT upsert, but guard on frontend too)
      const seen = new Set();
      const deduped = raw.filter(r => {
        const key = `${r.month}-${r.year || 2026}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setRsMonthlyUploads(deduped);
      setRsDataLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.warn('[Recovery] Monthly upload fetch failed:', err);
    } finally {
      setRsDataLoading(false);
    }
  };

  const fetchRecoveryNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const resp = await api.get('/whatif/recovery-narrative');
      if (resp.data && typeof resp.data === 'object') {
        setRecoveryNarrative(resp.data);
      }
    } catch (err) {
      console.warn('[RecoveryNarrative] fetch failed:', err);
    } finally {
      setNarrativeLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyUploads();
    fetchRecoveryNarrative();
  }, []);

  // Fetch predecessor/successor data when predecessor_successor scenario is selected
  useEffect(() => {
    const fetchPredecessorSuccessor = async () => {
      if (selectedScenario !== 'predecessor_successor') {
        setPredSuccLoading(false);
        setPredecessorSuccessorAnalysis(null);
        return;
      }

      setPredSuccLoading(true);
      setPredSuccError(null);

      try {
        const response = await api.get('/whatif/predecessor-successor');

        // Handle response being stringified
        let predSuccData = response.data;
        if (typeof predSuccData === 'string') {
          predSuccData = JSON.parse(predSuccData);
        }

        console.log('Parsed predecessor/successor:', predSuccData);

        if (predSuccData && typeof predSuccData === 'object') {
          setPredecessorSuccessorData(Array.isArray(predSuccData) ? predSuccData : predSuccData.dependencies || []);
          setPredecessorSuccessorAnalysis(predSuccData.analysis || null);
        }
      } catch (err) {
        console.error('Predecessor/successor fetch error:', err);
        setPredSuccError(err.response?.data?.error || 'Failed to load predecessor/successor data');
        // Fall back to empty array on error
        setPredecessorSuccessorData([]);
        setPredecessorSuccessorAnalysis(null);
      } finally {
        setPredSuccLoading(false);
      }
    };

    fetchPredecessorSuccessor();
  }, [selectedScenario]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const criticalDashboardCacheKey = user?.company_id
    ? `whatif_critical_dashboard_cache_v1_${user.company_id}`
    : null;

  const readCriticalDashboardCache = () => {
    if (!criticalDashboardCacheKey) return null;
    try {
      const cachedRaw = localStorage.getItem(criticalDashboardCacheKey);
      if (!cachedRaw) return null;
      const cached = JSON.parse(cachedRaw);
      if (!cached || typeof cached !== 'object') return null;
      if (!cached.threat_tracker || !cached.compressor_savings || !cached.kpis) return null;
      return cached;
    } catch (err) {
      console.warn('Critical dashboard cache read failed:', err);
      return null;
    }
  };

  const persistCriticalDashboardCache = (payload) => {
    if (!criticalDashboardCacheKey) return;
    try {
      localStorage.setItem(criticalDashboardCacheKey, JSON.stringify({
        threat_tracker: payload?.threat_tracker || [],
        compressor_savings: payload?.compressor_savings || [],
        kpis: payload?.kpis || {},
        chart_plan: payload?.chart_plan || [],
        ui_payload: payload?.ui_payload || {},
        generated_at: payload?.generated_at || new Date().toISOString(),
        cached: true,
        cache_key: payload?.cache_key || null,
      }));
    } catch (err) {
      console.warn('Critical dashboard cache write failed:', err);
    }
  };

  const applyCriticalNarrative = (uiPayload = {}) => {
    if (!uiPayload || typeof uiPayload !== 'object') return;

    const baseline = Array.isArray(uiPayload.step1_baseline_days)
      ? uiPayload.step1_baseline_days.map(v => Number(v) || 0).slice(0, 3)
      : [];
    const compressed = Array.isArray(uiPayload.step1_compressed_days)
      ? uiPayload.step1_compressed_days.map(v => Number(v) || 0).slice(0, 3)
      : [];
    const chips = Array.isArray(uiPayload.step1_activity_chips)
      ? uiPayload.step1_activity_chips.filter(Boolean).map(String).slice(0, 6)
      : [];

    setCriticalNarrative(prev => ({
      ...prev,
      core_threat_title: uiPayload.core_threat_title || prev.core_threat_title,
      core_threat_summary: uiPayload.core_threat_summary || prev.core_threat_summary,
      step1_title: uiPayload.step1_title || prev.step1_title,
      step1_summary: uiPayload.step1_summary || prev.step1_summary,
      step1_baseline_days: baseline.length > 0 ? baseline : prev.step1_baseline_days,
      step1_compressed_days: compressed.length > 0 ? compressed : prev.step1_compressed_days,
      step1_activity_chips: chips.length > 0 ? chips : prev.step1_activity_chips,
      step1_recovered_days: Number(uiPayload.step1_recovered_days) || prev.step1_recovered_days,
      step1_residual_to_sequence_days: Number(uiPayload.step1_residual_to_sequence_days) || prev.step1_residual_to_sequence_days,
    }));
  };

  const executeWhatIfAnalysis = async ({ scenarioId, categoryLabel, requestText, prompt }) => {
    const scenario = whatIfScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setIsGenerating(true);
    setOutput('');
    setChatMessages([]);

    try {
      const response = await api.post('/whatif/claude-analysis', {
        scenario_id: scenarioId,
        category: categoryLabel,
        analysis_request: requestText,
        prompt,
        include_whatif_knowledge: true,
      });

      const aiMessage = response.data?.message || 'No response generated.';
      const uiPayload = response.data?.ui_payload || {};
      const chartPlan = Array.isArray(response.data?.chart_plan) ? response.data.chart_plan : [];
      const endpointMap = Array.isArray(response.data?.endpoint_map) ? response.data.endpoint_map : [];
      const knowledgeSources = Array.isArray(response.data?.knowledge_sources)
        ? response.data.knowledge_sources
        : [];
      const knowledgeContextLoaded = Boolean(response.data?.knowledge_context_loaded);
      const knowledgeFolder = response.data?.knowledge_folder || '';
      const jsonRepaired = Boolean(response.data?.json_repaired);

      if (scenarioId === 'whatif_critical_activities') {
        applyCriticalNarrative(uiPayload);

        if (Array.isArray(uiPayload.threat_tracker) && uiPayload.threat_tracker.length > 0) {
          setThreatTrackerData(uiPayload.threat_tracker);
        }
        if (Array.isArray(uiPayload.compressor_savings) && uiPayload.compressor_savings.length > 0) {
          setCompressorSavings(uiPayload.compressor_savings);
        }
        if (uiPayload.kpis && typeof uiPayload.kpis === 'object') {
          setDashboardKpis(prev => ({ ...prev, ...uiPayload.kpis }));
        }

        persistCriticalDashboardCache({
          threat_tracker: uiPayload.threat_tracker || [],
          compressor_savings: uiPayload.compressor_savings || [],
          kpis: uiPayload.kpis || {},
          ui_payload: uiPayload,
          generated_at: response.data?.timestamp,
          cache_key: response.data?.id || null,
        });
      }

      const chartLines = chartPlan
        .map((c, idx) => `${idx + 1}. ${c.title || 'Untitled chart'} (${c.type || 'chart'})`)
        .join('\n');

      const endpointLines = endpointMap
        .map((e, idx) => `${idx + 1}. [${e.method || 'GET'}] ${e.path || ''} - ${e.purpose || ''}`)
        .join('\n');

      const knowledgeLines = knowledgeSources
        .map((k, idx) => `${idx + 1}. ${k.file || 'Unknown source'} (${k.chars_loaded || 0} chars)`)
        .join('\n');

      const diagnosticsLines = [
        `Knowledge context loaded: ${knowledgeContextLoaded ? 'Yes' : 'No'}`,
        `Knowledge sources count: ${knowledgeSources.length}`,
        `JSON repair used: ${jsonRepaired ? 'Yes' : 'No'}`,
        knowledgeFolder ? `Knowledge folder: ${knowledgeFolder}` : '',
      ].filter(Boolean).join('\n');

      const enrichedOutput = [
        aiMessage,
        chartLines ? `\n\n### Recommended Charts\n${chartLines}` : '',
        endpointLines ? `\n\n### Data Endpoints\n${endpointLines}` : '',
        knowledgeLines ? `\n\n### What-IF Knowledge Sources Used\n${knowledgeLines}` : '',
        `\n\n### Runtime Diagnostics\n${diagnosticsLines}`,
      ].join('');

      setOutput(enrichedOutput || 'No response generated.');
    } catch (err) {
      console.error('What-IF generation error:', err);
      setOutput(
        err.response?.data?.message ||
          'Failed to generate analysis. Please ensure the backend is running and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedScenario) {
      toast.error('Please select a scenario');
      return;
    }
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    if (!analysisRequest.trim()) {
      toast.error('Please add what data or insight you want');
      return;
    }

    const scenario = whatIfScenarios.find(s => s.id === selectedScenario);
    if (!scenario) return;

    const categoryObj = categories.find(c => c.id === selectedCategory);
    const categoryLabel = categoryObj?.label || selectedCategory;

    let dateConstraint = '';
    if (startDate || endDate) {
      dateConstraint = `\n\nCRITICAL DATE FILTER: You must ONLY consider and output activities that fall into the given date range: ${startDate ? `From ${startDate}` : 'Any time before endDate'} ${endDate ? `to ${endDate}` : 'and onwards'}.\n`;
    }

    const prompt = `${scenario.buildPrompt(categoryLabel)}${dateConstraint}

Additional user request for this analysis:
${analysisRequest.trim()}

  Make sure the response is aligned to this request and uses ONLY Knowledgebase/whatifKnowledge Word files. Do not use Excel, JSON, or other data sources.`;

    await executeWhatIfAnalysis({
      scenarioId: selectedScenario,
      categoryLabel,
      requestText: analysisRequest.trim(),
      prompt,
    });
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopiedOutput(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedOutput(false), 2000);
    });
  };

  // Chatbot send
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    const categoryObj = categories.find(c => c.id === selectedCategory);
    const categoryLabel = categoryObj?.label || selectedCategory || 'All';
    const scenarioObj = whatIfScenarios.find(s => s.id === selectedScenario);
    const scenarioLabel = scenarioObj?.title || '';

    let dateConstraint = '';
    if (startDate || endDate) {
      dateConstraint = `\n\nCRITICAL DATE FILTER: The user has selected a date filter. Only answer keeping in mind the activities that fall into the given date range: ${startDate ? `From ${startDate}` : 'Any time before endDate'} ${endDate ? `to ${endDate}` : 'and onwards'}. Please respect this filter.`;
    }

    const contextPrompt = `You are an AI Project Advisor using Azure AI Foundry. The user is currently analyzing "${categoryLabel}" for "${scenarioLabel}".

    Answer their question using project context from Knowledgebase Word files only. Be specific. Trace the predecessor and successor path if asking about time periods or dates.${dateConstraint}
    
    User's question: "${userMsg}"`;

    try {
      const response = await api.post('/chat', {
        message: contextPrompt,
        selected_sheets: [],
        history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        suggestion: 'Activity Search & Time Period',
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.message || 'No response.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const activeScenario = whatIfScenarios.find(s => s.id === selectedScenario);
  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const isCriticalScenario = selectedScenario === 'whatif_critical_activities';
  const predecessorSuccessorStats = {
    total: predecessorSuccessorData.length,
    critical: predecessorSuccessorData.filter(dep => dep.on_critical_path).length,
    fs: predecessorSuccessorData.filter(dep => (dep.logic_type || 'FS') === 'FS').length,
    ss: predecessorSuccessorData.filter(dep => (dep.logic_type || 'FS') === 'SS').length,
  };
  const predecessorSuccessorTopLag = [...predecessorSuccessorData]
    .sort((a, b) => (b.lag_days || 0) - (a.lag_days || 0))
    .slice(0, 3);
  const hasPredecessorClaudeAnalysis = Boolean(
    predecessorSuccessorAnalysis && (
      Number(predecessorSuccessorAnalysis.total_time_saving_days || 0) > 0 ||
      (Array.isArray(predecessorSuccessorAnalysis.suggestions) && predecessorSuccessorAnalysis.suggestions.length > 0) ||
      (typeof predecessorSuccessorAnalysis.executive_summary === 'string' && predecessorSuccessorAnalysis.executive_summary.trim()) ||
      (typeof predecessorSuccessorAnalysis.critical_path_review === 'string' && predecessorSuccessorAnalysis.critical_path_review.trim())
    )
  );
  const hasPredecessorDependencies = predecessorSuccessorData.length > 0;
  const predecessorSuccessorFlow = [
    {
      label: 'Predecessor Load',
      value: predecessorSuccessorStats.total,
      detail: 'Read from Word knowledge dependency narrative',
      tone: 'slate',
    },
    {
      label: 'Fast-Track Opportunities',
      value: predecessorSuccessorStats.ss,
      detail: 'Start-to-Start overlaps and parallelism',
      tone: 'orange',
    },
    {
      label: 'Critical Path Links',
      value: predecessorSuccessorStats.critical,
      detail: 'Edges that can move finish dates',
      tone: 'green',
    },
  ];
  const parseSignedNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };
  const criticalSaveDays = Math.round(dashboardKpis?.max_delay_days || 0);
  const criticalOpportunityDays = compressorSavings.reduce((acc, item) => acc + Math.max(parseSignedNumber(item.days), 0), 0);
  const criticalResidualDays = Math.max(criticalSaveDays - criticalOpportunityDays, 0);
  const criticalRecoveryPercent = criticalSaveDays > 0 ? Math.round((criticalOpportunityDays / criticalSaveDays) * 100) : 0;
  const chartPalette = ['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6'];
  const formatAxisLabel = (value, max = 16) => {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
  };

  const renderCriticalChart = (chart, idx) => {
    const type = String(chart?.type || 'bar').toLowerCase();
    const data = Array.isArray(chart?.data) ? chart.data : [];
    const keyField = data[0]?.name !== undefined ? 'name' : 'x';
    const valueField = data[0]?.value !== undefined ? 'value' : 'y';

    if (data.length === 0) {
      return (
        <div key={`chart-empty-${idx}`} style={{ padding: '10px', fontSize: '0.8rem', color: '#64748b' }}>
          No chart data available.
        </div>
      );
    }

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueField}
              nameKey={keyField}
              cx="50%"
              cy="50%"
              outerRadius={85}
              label={false}
              labelLine={false}
            >
              {data.map((entry, cellIdx) => (
                <Cell key={`${entry?.[keyField] || 'slice'}-${cellIdx}`} fill={chartPalette[cellIdx % chartPalette.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, _name, item) => [value, item?.payload?.[keyField] || 'Item']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={false} tickLine={false} axisLine={false} />
            <YAxis dataKey="y" />
            <Tooltip />
            <Scatter data={data} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={valueField} stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <defs>
              <linearGradient id={`criticalAreaGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.78} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={valueField} stroke="#16a34a" fill={`url(#criticalAreaGradient-${idx})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'waterfall') {
      const waterfallData = [];
      let running = 0;
      for (const row of data) {
        const delta = Number(row?.value || 0);
        const start = running;
        running += delta;
        waterfallData.push({
          name: row?.name || 'Step',
          start,
          delta,
        });
      }

      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={waterfallData} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={false} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="start" stackId="wf" fill="transparent" />
            <Bar dataKey="delta" stackId="wf" name="Change (days)">
              {waterfallData.map((entry, barIdx) => (
                <Cell
                  key={`wf-cell-${barIdx}`}
                  fill={Number(entry.delta || 0) < 0 ? '#ef4444' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={valueField} fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const fallbackCriticalCharts = [
    {
      id: 'fallback-top-threats',
      type: 'bar',
      title: 'Top Delay Threats (Variance)',
      data: threatTrackerData.slice(0, 8).map((item) => ({
        name: item?.id || 'N/A',
        value: Number(item?.late ?? 0),
      })),
    },
    {
      id: 'fallback-recovery-steps',
      type: 'bar',
      title: 'Recovery Steps (Days)',
      data: compressorSavings.slice(0, 8).map((item) => ({
        name: item?.step || 'Step',
        value: Number(parseSignedNumber(item?.days)),
      })),
    },
  ].filter((chart) => Array.isArray(chart.data) && chart.data.length > 0);

  const effectiveCriticalCharts = criticalChartPlan.length > 0 ? criticalChartPlan : fallbackCriticalCharts;
  const visibleCriticalCharts = effectiveCriticalCharts.slice(0, 6);

  const fallbackPredecessorCharts = [
    {
      id: 'pred-logic-type-mix',
      type: 'bar',
      title: 'Dependency Logic Mix',
      data: [
        { name: 'FS', value: predecessorSuccessorStats.fs },
        { name: 'SS', value: predecessorSuccessorStats.ss },
        {
          name: 'Other',
          value: Math.max(
            predecessorSuccessorStats.total - predecessorSuccessorStats.fs - predecessorSuccessorStats.ss,
            0,
          ),
        },
      ],
    },
    {
      id: 'pred-top-lag-links',
      type: 'line',
      title: 'Top Lag Dependency Links',
      data: predecessorSuccessorTopLag.map((dep) => ({
        name: `${dep.from_id || 'N/A'}→${dep.to_id || 'N/A'}`,
        value: Number(dep.lag_days || 0),
      })),
    },
    {
      id: 'pred-critical-links-load',
      type: 'area',
      title: 'Critical Dependency Link Load',
      data: [
        { name: 'Critical Links', value: predecessorSuccessorStats.critical },
        {
          name: 'Non-Critical Links',
          value: Math.max(predecessorSuccessorStats.total - predecessorSuccessorStats.critical, 0),
        },
      ],
    },
  ].filter((chart) => Array.isArray(chart.data) && chart.data.length > 0);

  const predecessorChartPlan = (Array.isArray(predecessorSuccessorAnalysis?.chart_plan) && predecessorSuccessorAnalysis.chart_plan.length > 0)
    ? predecessorSuccessorAnalysis.chart_plan
    : fallbackPredecessorCharts;

  const renderPredecessorChart = (chart, idx) => {
    const type = String(chart?.type || 'bar').toLowerCase();
    const data = Array.isArray(chart?.data) ? chart.data : [];
    const keyField = data[0]?.name !== undefined ? 'name' : 'x';
    const valueField = data[0]?.value !== undefined ? 'value' : 'y';

    if (data.length === 0) {
      return (
        <div key={`pred-chart-empty-${idx}`} style={{ padding: '10px', fontSize: '0.8rem', color: '#64748b' }}>
          No chart data available.
        </div>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={valueField} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
            <defs>
              <linearGradient id={`predAreaGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={valueField} stroke="#ea580c" fill={`url(#predAreaGradient-${idx})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={keyField} tick={false} tickLine={false} axisLine={false} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={valueField} fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // All structural data now comes from the live API endpoint (/api/whatif/recovery-narrative)
  // which is seeded from the bundled JSON and updated on every monthly file upload.
  const rn = recoveryNarrative || {};
  const extractedProject = rn.project || {};
  const extractedKpis = Array.isArray(rn.kpis) ? rn.kpis : [];
  const extractedWaterfall = Array.isArray(rn.recovery_architecture?.waterfall)
    ? rn.recovery_architecture.waterfall : [];
  const extractedRecoveryProgress = rn.recovery_architecture?.progress || {};
  const extractedCivilOverruns = Array.isArray(rn.recovery_architecture?.civil_overruns)
    ? rn.recovery_architecture.civil_overruns : [];
  const extractedCivilOverrunSummary = rn.recovery_architecture?.civil_overrun_summary || '';
  const extractedStage1 = rn.stage_recovery?.stage1 || {};
  const extractedStage2 = rn.stage_recovery?.stage2 || {};
  const extractedStage1Activities = Array.isArray(rn.stage_recovery?.stage1?.activities)
    ? rn.stage_recovery.stage1.activities : [];
  const extractedStage2Chain = Array.isArray(rn.stage_recovery?.stage2?.chain)
    ? rn.stage_recovery.stage2.chain : [];
  const extractedRiskRegister = Array.isArray(rn.critical_path_calibration?.risk_register)
    ? rn.critical_path_calibration.risk_register : [];
  const extractedCpCalibration = rn.critical_path_calibration || {};
  const extractedMandates = Array.isArray(rn.forward_operating_mandate)
    ? rn.forward_operating_mandate : [];
  const extractedActiveMitigation = rn.active_mitigation || {};
  const extractedPredSucc = borougePredSuccAccelerationExtracted || {};
  const extractedPredSuccProject = extractedPredSucc.project || {};
  const extractedPredSuccKpis = Array.isArray(extractedPredSucc.kpis) ? extractedPredSucc.kpis : [];
  const extractedPredSuccRootPaths = Array.isArray(extractedPredSucc?.root_problem?.paths)
    ? extractedPredSucc.root_problem.paths
    : [];
  const extractedPredSuccApproach1Items = Array.isArray(extractedPredSucc?.approach_1?.items)
    ? extractedPredSucc.approach_1.items
    : [];
  const extractedPredSuccApproach2Primary = Array.isArray(extractedPredSucc?.approach_2?.primary)
    ? extractedPredSucc.approach_2.primary
    : [];
  const extractedPredSuccApproach2Secondary = Array.isArray(extractedPredSucc?.approach_2?.secondary)
    ? extractedPredSucc.approach_2.secondary
    : [];
  const extractedPredSuccComparison = Array.isArray(extractedPredSucc.comparison)
    ? extractedPredSucc.comparison
    : [];
  const predSuccApproach1Max = Math.max(1, ...extractedPredSuccApproach1Items.map((item) => Number(item?.days || 0)));
  const extractedFpCount = Number(extractedCpCalibration?.false_positive || 0);
  const extractedFnCount = Number(extractedCpCalibration?.false_negative || 0);
  const extractedTrueCriticalCount = Number(extractedCpCalibration?.optimized_state_count || extractedCpCalibration?.true_critical || 0);
  const extractedWaterfallMax = Math.max(
    1,
    ...extractedWaterfall.map((step) => Math.abs(Number(step?.days || 0))),
  );
  const extractedCivilCurrentMax = Math.max(
    1,
    ...extractedCivilOverruns.map((row) => Number(row?.current_days || 0)),
  );
  const extractedCivilVarianceMax = Math.max(
    1,
    ...extractedCivilOverruns.map((row) => Number(row?.finish_variance_days || 0)),
  );

  const toneStyleMap = {
    teal: { bg: '#ecfdf5', border: '#86efac', title: '#166534' },
    amber: { bg: '#fffbeb', border: '#fcd34d', title: '#92400e' },
    red: { bg: '#fff1f2', border: '#fda4af', title: '#9f1239' },
    neutral: { bg: '#eff6ff', border: '#93c5fd', title: '#1e40af' },
    teal_light: { bg: '#ecfeff', border: '#67e8f9', title: '#155e75' },
  };

  const getBadgeStyle = (tone) => toneStyleMap[tone] || toneStyleMap.neutral;
  const getRiskImpactStyle = (impact) => {
    if (impact === 'HIGH') {
      return { bg: '#fee2e2', text: '#b91c1c' };
    }
    if (impact === 'MED') {
      return { bg: '#fef3c7', text: '#92400e' };
    }
    return { bg: '#dcfce7', text: '#166534' };
  };

  return (
    <div className="chat-page">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsMobileMenuOpen(false);
          }
        }}
      />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* Main AI Workspace */}
      <div className="chat-main">
        <div className="ai-workspace">

          {/* ── Top Bar ── */}
          <div className="ai-topbar">
            <div className="ai-topbar-left">
              <div className="ai-topbar-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <TrendingUp size={20} color="white" />
              </div>
              <div>
                <div className="ai-topbar-title">Recovery Scenarios</div>
                <div className="ai-topbar-sub">
                  <span className="ai-status-dot" style={{ background: '#10b981' }} />
                  {' '}
                  Model how many days can be recovered — select a scenario and category to run the analysis
                </div>
              </div>
            </div>
          </div>

          {/* ── Recovery Context Banner ── */}
          <div style={{ margin: '0 0 14px', padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(120deg, #fff7ed 0%, #fef3c7 100%)', border: '1px solid #fed7aa', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#b45309' }}>
                {criticalNarrative.step1_recovered_days ? `${criticalNarrative.step1_recovered_days}d` : (dashboardKpis?.total_days_recoverable ? `${dashboardKpis.total_days_recoverable}d` : '85d+')}
              </span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recoverable via Float Compression</div>
                <div style={{ fontSize: '0.72rem', color: '#78350f' }}>{criticalNarrative.core_threat_title || 'Use scenarios below to model how much time can be saved'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Days at Risk', value: dashboardKpis?.total_delay_days ?? criticalNarrative.step1_residual_to_sequence_days ?? '—', color: '#dc2626' },
                { label: 'Stage 1 Recovery', value: criticalNarrative.step1_recovered_days ? `+${criticalNarrative.step1_recovered_days}d` : '—', color: '#16a34a' },
                { label: 'After Stage 1', value: criticalNarrative.step1_residual_to_sequence_days !== undefined ? `${criticalNarrative.step1_residual_to_sequence_days}d left` : '—', color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 80 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="ai-body chat-body-responsive">
            <div className="ai-right-panel">
              <div className="pa-unified-panel">
                <div className="ai-console-messages pa-unified-messages">
                  {!selectedScenario && !output && !isGenerating && (
                    <div className="ai-empty-state">
                      <BrainCircuit size={40} className="ai-empty-icon" />
                      <p className="ai-empty-title">Select a Scenario to Begin</p>
                      <p className="ai-empty-sub">Click a scenario in the top row to open the dashboard container and charts.</p>
                    </div>
                  )}

                  {selectedScenario === 'whatif_critical_activities' && (
                    <div className="pa-deck-shell">

                      {dashboardLoading && (
                        <div className="ih-loading-overlay">
                          <Loader2 size={32} className="ih-spinner" />
                          <p>Loading critical dashboard...</p>
                        </div>
                      )}

                      {dashboardError && (
                        <div style={{
                          padding: '12px',
                          margin: '12px 0',
                          background: '#fff1f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          color: '#991b1b',
                          fontSize: '0.85rem'
                        }}>
                          <strong>Error:</strong> {dashboardError}
                        </div>
                      )}

                      {!dashboardLoading && !dashboardError && (
                        <>

                          <div className="pa-slide-card pa-slide-card-wide" style={{ marginTop: '12px' }}>
                          
                            <div className="pa-visual-block" style={{ display: 'grid', gap: '12px' }}>

                              {/* ── Phase-Wise Analysis ── */}
                              {(() => {
                                const trendMetrics = Array.isArray(rn.trend_metrics) ? rn.trend_metrics : [];
                                const mcSlip = trendMetrics.find(m => String(m.label || '').toLowerCase().includes('mc slip') && m.severity === 'red');
                                const PHASES = [
                                  {
                                    phase: 'Engineering',
                                    status: 'Monitor',
                                    statusColor: '#92400e', statusBg: '#fef3c7', borderColor: '#fde68a',
                                    gap: 'Vendor drawings A31580 & A34220 stuck at 1-day float for 2 consecutive months. Feeds directly into construction start.',
                                    focus: 'Issue contractual notice. Require written weekly-milestone recovery plan from vendor.',
                                    metric: '2 items at TF=1d', metricColor: '#b45309',
                                  },
                                  {
                                    phase: 'Procurement',
                                    status: 'Monitor',
                                    statusColor: '#0369a1', statusBg: '#e0f2fe', borderColor: '#bae6fd',
                                    gap: 'Instrument/telecom equipment supply feeding the 1-day-float construction chain. Piping lot 85.D10 healthy at 28d float.',
                                    focus: 'Expedite instrument/telecom deliveries. Use piping supply buffer to offset — sequence piping installation ahead of the critical chain.',
                                    metric: 'Piping: 28d float', metricColor: '#16a34a',
                                  },
                                  {
                                    phase: 'Construction',
                                    status: 'Critical',
                                    statusColor: '#991b1b', statusBg: '#fee2e2', borderColor: '#fecaca',
                                    gap: 'Instrument/telecom chain 1d float, sub-station 3d float (2nd month), C1059 punch list 3d float to Mar 23 MC.',
                                    focus: 'Activate sub-station intervention this week. Begin punch list tracking now. Protect compressor buffer (C1000 at +15d float).',
                                    metric: 'C1000: +15d float ✓', metricColor: '#16a34a',
                                  },
                                ];
                                return (
                                  <>
                                    <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#1e40af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                      Phase-Wise Analysis — Where Are the Gaps
                                    </div>
                                    {mcSlip && (
                                      <div style={{ padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.74rem', color: '#9f1239', lineHeight: 1.5 }}>
                                        <strong>{rn.source_month || 'Apr'} {rn.source_year || 2026} position:</strong> MC slipped {mcSlip.value}. {(rn.trend_summary?.body || '').slice(0, 120)}…
                                      </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                      {PHASES.map(item => (
                                        <div key={item.phase} style={{ border: `1px solid ${item.borderColor}`, background: '#ffffff', borderRadius: 10, padding: '11px 13px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{item.phase}</span>
                                            <span style={{ background: item.statusBg, color: item.statusColor, borderRadius: 999, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>{item.status}</span>
                                          </div>
                                          <div style={{ fontSize: '0.71rem', color: '#475569', lineHeight: 1.45, marginBottom: 5 }}>
                                            <strong style={{ color: '#dc2626' }}>Gap: </strong>{item.gap}
                                          </div>
                                          <div style={{ fontSize: '0.71rem', color: '#065f46', lineHeight: 1.45, marginBottom: 6 }}>
                                            <strong>Focus: </strong>{item.focus}
                                          </div>
                                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: item.metricColor }}>{item.metric}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()}

                              {/* ── Recovery Decision Framework ── */}
                              {(() => {
                                const steps = [
                                  { label: 'Slip Detected',       value: '+62d MC',        detail: 'Apr 2026 · all milestones', color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
                                  { label: 'Route A — Float',     value: '85d absorbed',   detail: 'Civil compression · no extra cost', color: '#0f766e', bg: '#ecfdf5', border: '#86efac' },
                                  { label: 'Route B — Resource',  value: '13d absorbed',   detail: 'Compressor +1 shift/week', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
                                  { label: 'After A + B',         value: '+7d residual',   detail: 'Needs planning sign-off', color: '#b45309', bg: '#fff7ed', border: '#fed7aa' },
                                  { label: 'Detailed Review',     value: 'Escalate',       detail: 'If residual > buffer, re-plan required', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
                                ];
                                return (
                                  <>
                                    <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#0f766e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                      Recovery Decision Framework
                                    </div>
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: '12px 14px', overflowX: 'auto' }}>
                                      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', minWidth: 560 }}>
                                        {steps.map((step, idx) => (
                                          <React.Fragment key={step.label}>
                                            {idx > 0 && (
                                              <div style={{ display: 'flex', alignItems: 'center', padding: '0 5px', color: '#94a3b8', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>→</div>
                                            )}
                                            <div style={{ border: `1px solid ${step.border}`, background: step.bg, borderRadius: 10, padding: '9px 11px', flex: 1, minWidth: 90 }}>
                                              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{step.label}</div>
                                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{step.value}</div>
                                              <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 3, lineHeight: 1.3 }}>{step.detail}</div>
                                            </div>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                      <div style={{ marginTop: 10, fontSize: '0.71rem', color: '#475569', lineHeight: 1.5 }}>
                                        <strong>Method:</strong> Route A (float compression) is executable by the planning team — no approvals.
                                        Route B (resource addition) needs project planning sign-off and resource mobilisation.
                                        If residual remains after A+B, a detailed re-plan by the planning team is required. If still unrecoverable after re-plan, escalate to management.
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}

                              {/* ── Resource Scenario Input (AI Feedback Mechanism) ── */}
                              {(() => {
                                const RS_EFF = rsEffFactors;
                                const RS_GAP = Number(dashboardKpis?.max_delay_days || dashboardKpis?.total_delay_days || 62);
                                const rsRecoveredDays = rsRows.reduce((acc, r) => {
                                  const eff = RS_EFF[r.type] ?? 1.0;
                                  return acc + Math.round(Math.max(0, (Number(r.fromDays) || 0) - (Number(r.toDays) || 0)) * eff);
                                }, 0);
                                const rsResidual = Math.max(0, RS_GAP - rsRecoveredDays);
                                const EFF_META = {
                                  'Extra Crew':        { formula: '(Baseline − Target) × 1.00', desc: 'Full-capacity additional crew; 100% compression realized.' },
                                  'Extra Shift':       { formula: '(Baseline − Target) × 0.85', desc: '2nd/3rd shift adds ~85% due to handover & fatigue.' },
                                  'Float Compression': { formula: '(Baseline − Target) × 0.70', desc: 'Float absorption; 70% recovery — sequencing constraints apply.' },
                                  'Overtime':          { formula: '(Baseline − Target) × 0.75', desc: 'Extended hours yield ~75% due to productivity drop.' },
                                  'Fast-Track':        { formula: '(Baseline − Target) × 1.10', desc: 'Parallel sequencing; 110% where predecessor overlap is possible.' },
                                };
                                return (
                                  <>
                                    <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                      Resource Scenario Input — Embed AI Feedback
                                    </div>
                                    <div style={{ border: '1px solid #e9d5ff', borderRadius: 12, background: '#faf5ff', padding: '12px 14px' }}>

                                      {/* ── Header row: description + monthly status + refresh ── */}
                                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '0.76rem', color: '#4c1d95', lineHeight: 1.5, flex: 1 }}>
                                          Enter resource-based compressions (e.g. "Mechanical: 9 months → 6 months via extra crew"). The model recalculates recoverable days and the updated residual against the current <strong style={{ color: '#dc2626' }}>+{RS_GAP}d MC slip</strong> (live from latest upload).
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                          <button
                                            type="button"
                                            disabled={rsDataLoading || narrativeLoading}
                                            onClick={() => { fetchMonthlyUploads(); fetchRecoveryNarrative(); }}
                                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #c4b5fd', background: '#ede9fe', color: '#4c1d95', fontSize: '0.7rem', fontWeight: 700, cursor: (rsDataLoading || narrativeLoading) ? 'not-allowed' : 'pointer', opacity: (rsDataLoading || narrativeLoading) ? 0.6 : 1 }}
                                          >
                                            {(rsDataLoading || narrativeLoading) ? 'Refreshing…' : '↻ Refresh Data'}
                                          </button>
                                          {rn.last_updated && (
                                            <span style={{ fontSize: '0.62rem', color: '#7c3aed' }}>
                                              Analysis: {rn.source_month} {rn.source_year}
                                              {rn.last_tracker_month && ` · Tracker: ${rn.last_tracker_month} ${rn.last_tracker_year}`}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* ── Monthly uploads status strip ── */}
                                      {rsMonthlyUploads.length > 0 && (
                                        <div style={{ marginBottom: 10, padding: '6px 10px', background: '#ede9fe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Months on file:</span>
                                          {rsMonthlyUploads.map(r => (
                                            <span key={`${r.month}-${r.year}`} style={{ fontSize: '0.68rem', fontWeight: 700, background: '#ffffff', color: '#4c1d95', border: '1px solid #c4b5fd', borderRadius: 999, padding: '2px 8px' }}>
                                              {r.month} {r.year || 2026}
                                            </span>
                                          ))}
                                          <span style={{ fontSize: '0.64rem', color: '#6d28d9', marginLeft: 'auto' }}>One record per month — re-uploading the same month overwrites, no duplicates.</span>
                                        </div>
                                      )}

                                      {/* ── Efficiency Factors Formula Table (toggle) ── */}
                                      <div style={{ marginBottom: 10 }}>
                                        <button
                                          type="button"
                                          onClick={() => setShowEffTable(p => !p)}
                                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #c4b5fd', background: showEffTable ? '#c4b5fd' : '#f5f3ff', color: '#4c1d95', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          {showEffTable ? '▲ Hide' : '▼ Show'} Efficiency Factors Table
                                        </button>
                                        {showEffTable && (
                                          <div style={{ marginTop: 8, border: '1px solid #ddd6fe', borderRadius: 10, overflow: 'hidden' }}>
                                            <div style={{ padding: '6px 10px', background: '#ede9fe', fontSize: '0.69rem', fontWeight: 800, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                              Compression Formula: Saved Days = (Baseline − Target) × Efficiency Factor
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                                              <thead>
                                                <tr style={{ background: '#f5f3ff' }}>
                                                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#4c1d95', fontWeight: 700 }}>Resource Type</th>
                                                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#4c1d95', fontWeight: 700 }}>Formula</th>
                                                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#4c1d95', fontWeight: 700 }}>Factor</th>
                                                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Rationale</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {Object.entries(rsEffFactors).map(([type, factor], fi) => (
                                                  <tr key={type} style={{ borderBottom: '1px solid #ede9fe', background: fi % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                                                    <td style={{ padding: '5px 10px', fontWeight: 700, color: '#0f172a' }}>{type}</td>
                                                    <td style={{ padding: '5px 10px', color: '#6d28d9', fontFamily: 'monospace', fontSize: '0.7rem' }}>{EFF_META[type]?.formula || `(BL − TGT) × ${factor}`}</td>
                                                    <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                                                      <input
                                                        type="number"
                                                        value={factor}
                                                        min="0"
                                                        max="2"
                                                        step="0.05"
                                                        onChange={e => setRsEffFactors(prev => ({ ...prev, [type]: Math.round(Number(e.target.value) * 100) / 100 }))}
                                                        style={{ width: 60, border: '1px solid #c4b5fd', borderRadius: 6, padding: '3px 6px', fontSize: '0.78rem', textAlign: 'center', outline: 'none', background: '#f5f3ff', fontWeight: 700, color: '#4c1d95' }}
                                                      />
                                                    </td>
                                                    <td style={{ padding: '5px 10px', color: '#475569', fontSize: '0.7rem' }}>{EFF_META[type]?.desc || ''}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                            <div style={{ padding: '6px 10px', background: '#f5f3ff', fontSize: '0.66rem', color: '#6d28d9', borderTop: '1px solid #ede9fe' }}>
                                              Edit the Factor column to model different efficiency assumptions. Values are applied live to the Saved column above.
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* ── Activity input table ── */}
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem', marginBottom: 10 }}>
                                          <thead>
                                            <tr style={{ background: '#ede9fe' }}>
                                              <th style={{ padding: '7px 10px', textAlign: 'left', color: '#4c1d95', fontWeight: 700 }}>Activity / Phase</th>
                                              <th style={{ padding: '7px 10px', textAlign: 'right', color: '#4c1d95', fontWeight: 700 }}>Baseline (d)</th>
                                              <th style={{ padding: '7px 10px', textAlign: 'right', color: '#4c1d95', fontWeight: 700 }}>Target (d)</th>
                                              <th style={{ padding: '7px 10px', textAlign: 'left', color: '#4c1d95', fontWeight: 700 }}>Resource Type</th>
                                              <th style={{ padding: '7px 10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>Saved</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rsRows.map((row, idx) => (
                                              <tr key={idx} style={{ borderBottom: '1px solid #ede9fe', background: idx % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                                                <td style={{ padding: '5px 10px' }}>
                                                  <input
                                                    value={row.activity}
                                                    onChange={e => setRsRows(prev => prev.map((r, i) => i === idx ? { ...r, activity: e.target.value } : r))}
                                                    placeholder="e.g. Mechanical Works"
                                                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', fontSize: '0.75rem', outline: 'none' }}
                                                  />
                                                </td>
                                                <td style={{ padding: '5px 10px' }}>
                                                  <input
                                                    type="number"
                                                    value={row.fromDays}
                                                    onChange={e => setRsRows(prev => prev.map((r, i) => i === idx ? { ...r, fromDays: e.target.value } : r))}
                                                    style={{ width: 68, border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', fontSize: '0.75rem', textAlign: 'right', outline: 'none', display: 'block', marginLeft: 'auto' }}
                                                  />
                                                </td>
                                                <td style={{ padding: '5px 10px' }}>
                                                  <input
                                                    type="number"
                                                    value={row.toDays}
                                                    onChange={e => setRsRows(prev => prev.map((r, i) => i === idx ? { ...r, toDays: e.target.value } : r))}
                                                    style={{ width: 68, border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', fontSize: '0.75rem', textAlign: 'right', outline: 'none', display: 'block', marginLeft: 'auto' }}
                                                  />
                                                </td>
                                                <td style={{ padding: '5px 10px' }}>
                                                  <select
                                                    value={row.type}
                                                    onChange={e => setRsRows(prev => prev.map((r, i) => i === idx ? { ...r, type: e.target.value } : r))}
                                                    style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 7px', fontSize: '0.75rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                                  >
                                                    {Object.keys(rsEffFactors).map(t => <option key={t}>{t}</option>)}
                                                  </select>
                                                </td>
                                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                                                  {Math.round(Math.max(0, (Number(row.fromDays) || 0) - (Number(row.toDays) || 0)) * (RS_EFF[row.type] ?? 1.0))}d
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* ── Action row ── */}
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                          type="button"
                                          onClick={() => setRsRows(prev => [...prev, { activity: '', fromDays: '', toDays: '', type: 'Extra Crew' }])}
                                          style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #c4b5fd', background: '#ede9fe', color: '#4c1d95', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          + Add Row
                                        </button>
                                        {rsRows.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => setRsRows(prev => prev.slice(0, -1))}
                                            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}
                                          >
                                            Remove Last
                                          </button>
                                        )}
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                          <div style={{ textAlign: 'center', background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 8, padding: '5px 12px' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669' }}>{rsRecoveredDays}d</div>
                                            <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>Recovered via inputs</div>
                                          </div>
                                          <div style={{ textAlign: 'center', background: rsResidual > 0 ? '#fff1f2' : '#ecfdf5', border: `1px solid ${rsResidual > 0 ? '#fecaca' : '#86efac'}`, borderRadius: 8, padding: '5px 12px' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: rsResidual > 0 ? '#dc2626' : '#16a34a' }}>
                                              {rsResidual > 0 ? `+${rsResidual}d` : 'Closed'}
                                            </div>
                                            <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>Residual after inputs</div>
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ marginTop: 8, fontSize: '0.69rem', color: '#7c3aed', lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid #ede9fe', paddingTop: 7 }}>
                                        Route B inputs (resource addition) require project planning sign-off before mobilisation.
                                        If residual remains after all inputs, a detailed re-plan by the planning team is required — flag for management escalation.
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}

                              {(extractedStage1Activities.length > 0 || extractedStage2Chain.length > 0) && (
                                <>
                                  <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#0f766e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Stage-by-Stage Recovery
                                  </div>

                                  {/* Recovery flow bar */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    {[
                                      { label: 'Delay In', value: `+${Number(extractedStage1?.delay_before_days || 103)}d`, bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                                      { label: 'Stage 1 (Civil)', value: `−${Number(extractedRecoveryProgress.civil_saved || 85)}d`, bg: '#ecfdf5', color: '#059669', border: '#86efac' },
                                      { label: 'Stage 2 (Compressor)', value: `−${Number(extractedRecoveryProgress.compressor_saved || 13)}d`, bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' },
                                      { label: 'Net Residual', value: `+${Number(extractedStage1?.delay_after_days || 7)}d`, bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
                                    ].map((step, i, arr) => (
                                      <div key={step.label} style={{ flex: 1, minWidth: 80, padding: '9px 12px', background: step.bg, borderRight: i < arr.length - 1 ? `1px solid ${step.border}` : 'none', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.label}</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: step.color, marginTop: 2 }}>{step.value}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Stage 1 table */}
                                  <div style={{ border: '1px solid #d1fae5', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ padding: '7px 12px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46' }}>Stage 1 — Civil Compression</span>
                                      <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>{Number(extractedStage1?.reduction_percent || 96)}% of delay absorbed</span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                                      <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                          <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Activity</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b', fontWeight: 700 }}>Baseline</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'right', color: '#0ea5e9', fontWeight: 700 }}>Re-planned</th>
                                          <th style={{ padding: '6px 10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>Saved</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {extractedStage1Activities.map((item, idx) => (
                                          <tr key={`s1-${item.id}`} style={{ borderTop: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fffe' }}>
                                            <td style={{ padding: '7px 10px', color: '#0f172a', fontWeight: 600 }}>
                                              <span style={{ fontSize: '0.67rem', color: '#6ee7b7', fontWeight: 700, marginRight: 5 }}>{item.id}</span>{item.name}
                                            </td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94a3b8' }}>{item.baseline_days}d</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#0ea5e9', fontWeight: 700 }}>{item.planned_days}d</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#059669', fontWeight: 800 }}>−{item.saved_days}d</td>
                                          </tr>
                                        ))}
                                        <tr style={{ borderTop: '2px solid #bbf7d0', background: '#ecfdf5' }}>
                                          <td colSpan={3} style={{ padding: '7px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>Total saved → net delay entering Stage 2</td>
                                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>−{extractedStage1Activities.reduce((s, i) => s + Number(i.saved_days || 0), 0)}d → {Number(extractedStage1?.delay_after_days || 7)}d left</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Stage 2 compact */}
                                  <div style={{ border: '1px solid #ccfbf1', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ padding: '7px 12px', background: '#f0fdfa', borderBottom: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e' }}>Stage 2 — Compressor Chain</span>
                                      <span style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 700 }}>{extractedStage2Chain.length} activities · −{Number(extractedStage2?.total_saved_days || 13)}d total</span>
                                    </div>
                                    <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                      {extractedStage2Chain.map((node, i) => (
                                        <React.Fragment key={`s2-${node.id}`}>
                                          <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 7, padding: '4px 8px', textAlign: 'center', minWidth: 52 }}>
                                            <div style={{ fontSize: '0.62rem', color: '#164e63', fontWeight: 700 }}>{node.id}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0e7490' }}>−{Math.abs(node.saved_days)}d</div>
                                          </div>
                                          {i < extractedStage2Chain.length - 1 && (
                                            <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>→</span>
                                          )}
                                        </React.Fragment>
                                      ))}
                                      <div style={{ marginLeft: 'auto', background: '#0f766e', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: '0.8rem', fontWeight: 800 }}>
                                        = −{Number(extractedStage2?.total_saved_days || 13)}d
                                      </div>
                                    </div>
                                    <div style={{ padding: '7px 12px', background: '#f0fdf4', borderTop: '1px solid #d1fae5', fontSize: '0.73rem', color: '#166534', fontWeight: 700 }}>
                                      {extractedStage2?.outcome || 'All downstream activities restored to baseline finish dates'}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* ── Recovery Plan (point 4) ── */}
                              {(() => {
                                const kpiRisk = extractedKpis.find(k => k.id === 'residual_risk');
                                const residualDays = kpiRisk ? Number(String(kpiRisk.value).replace(/[^0-9.]/g, '')) : 7;
                                const civilSaved  = Number(extractedRecoveryProgress.civil_saved      ?? 85);
                                const compSaved   = Number(extractedRecoveryProgress.compressor_saved ?? 13);
                                return (
                                  <>
                                    <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#0369a1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                      Recovery Plan
                                    </div>

                                    {/* Route A / Route B / Residual cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>

                                      <div style={{ border: '1px solid #86efac', background: '#ecfdf5', borderRadius: 10, padding: '11px 13px' }}>
                                        <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                          Route A — Float Compression
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#14532d', lineHeight: 1.45, marginBottom: 6 }}>
                                          Three downstream civil activities re-planned to their achievable durations. Their original baseline included schedule padding (float), not extra work. Same crew, same scope — the padding is removed. No extra resources.
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>{civilSaved}d recovered</div>
                                        <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700, marginTop: 3 }}>
                                          Simple — plannable within current scope
                                        </div>
                                      </div>

                                      <div style={{ border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: 10, padding: '11px 13px' }}>
                                        <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                          Route B — Resource Addition
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#7c2d12', lineHeight: 1.45, marginBottom: 6 }}>
                                          The 7-day residual entering the compressor chain is absorbed by tightening 10 sequential activities by 1-2 days each via an extra shift. This requires resource mobilisation and project planning sign-off.
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>{compSaved}d additional</div>
                                        <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700, marginTop: 3 }}>
                                          Needs detailed review by project planning
                                        </div>
                                      </div>

                                      {residualDays > 0 && (
                                        <div style={{ border: '1px solid #fecaca', background: '#fff1f2', borderRadius: 10, padding: '11px 13px' }}>
                                          <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                            Residual — After Both Routes
                                          </div>
                                          <div style={{ fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.45, marginBottom: 6 }}>
                                            {kpiRisk?.sub ?? `+${residualDays}d slip after A+B — mitigable via shift increase or scope adjustment`}
                                          </div>
                                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>+{residualDays}d</div>
                                          <div style={{ fontSize: '0.68rem', color: '#991b1b', fontWeight: 700, marginTop: 3 }}>
                                            Still needs resolution
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Resource Scenario Planner table */}
                                    {(extractedStage1Activities.length > 0 || extractedStage2Chain.length > 0) && (
                                      <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>Recovery Breakdown — Baseline vs Re-planned Duration</div>
                                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                                            Float Compression rows show activities re-planned to their achievable duration (same resources, less padding). Resource Addition rows show activities shortened via extra shift — these need mobilisation approval.
                                          </div>
                                        </div>
                                        {/* Bar chart */}
                                        {(() => {
                                          const s1 = extractedStage1Activities.map(a => ({ id: a.id, name: a.name, bl: a.baseline_days, pr: a.planned_days, sv: a.saved_days }));
                                          const s2 = extractedStage2Chain.map(a => ({ id: a.id, name: a.name ?? a.id, sv: a.saved_days }));
                                          if (!s1.length && !s2.length) return null;
                                          const maxSv2 = Math.max(...s2.map(a => Math.abs(a.sv)), 1);
                                          return (
                                            <div style={{ borderBottom: '1px solid #e2e8f0' }}>
                                              {/* Legend */}
                                              <div style={{ display: 'flex', gap: 16, padding: '9px 16px 5px', flexWrap: 'wrap' }}>
                                                {[
                                                  { bg: '#475569', label: 'Baseline — original scheduled duration' },
                                                  { bg: 'linear-gradient(90deg,#0284c7,#38bdf8)', label: 'Proposed — re-planned (Route A)' },
                                                  { bg: 'linear-gradient(90deg,#d97706,#fbbf24)', label: 'Freed — days recovered via extra shift (Route B)' },
                                                  { bg: '#ecfdf5', border: '1px solid #86efac', label: '−Xd saved / +Xd freed shown right' },
                                                ].map(({ bg, border, label }) => (
                                                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.67rem', fontWeight: 700, color: '#64748b' }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: border ?? 'none', display: 'inline-block', flexShrink: 0 }} />
                                                    {label}
                                                  </span>
                                                ))}
                                              </div>

                                              {/* Float Compression rows */}
                                              {s1.length > 0 && (
                                                <>
                                                  <div style={{ padding: '6px 16px 5px', background: '#f0fdf4', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.07em', color: '#166534', textTransform: 'uppercase' }}>Float Compression — Route A</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#166534', marginTop: 2, lineHeight: 1.35 }}>
                                                      Baseline durations included schedule float (buffer). Proposed = achievable at current resource levels. The difference is recovered float, not compressed work.
                                                    </div>
                                                  </div>
                                                  {s1.map((item, i) => (
                                                    <div key={`fc-${item.id}-${i}`} style={{ display: 'grid', gridTemplateColumns: '148px 1fr 68px', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                                                      {/* Label */}
                                                      <div>
                                                        <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{item.id}</div>
                                                        <div style={{ fontSize: '0.77rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.3 }}>
                                                          {item.name.length > 22 ? item.name.slice(0, 21) + '…' : item.name}
                                                        </div>
                                                      </div>
                                                      {/* Two bars */}
                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                        {/* Baseline bar — full width, dark slate */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                          <span style={{ fontSize: '0.59rem', fontWeight: 700, color: '#64748b', width: 46, flexShrink: 0, textAlign: 'right' }}>Baseline</span>
                                                          <div style={{ flex: 1, height: 18, borderRadius: 4, background: '#475569', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                                            <span style={{ fontSize: '0.67rem', fontWeight: 700, color: '#fff' }}>{item.bl}d</span>
                                                          </div>
                                                        </div>
                                                        {/* Proposed bar — proportional, blue */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                          <span style={{ fontSize: '0.59rem', fontWeight: 700, color: '#0284c7', width: 46, flexShrink: 0, textAlign: 'right' }}>Proposed</span>
                                                          <div style={{ flex: 1, height: 18, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', position: 'relative' }}>
                                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(item.pr / item.bl) * 100}%`, background: 'linear-gradient(90deg,#0284c7,#38bdf8)', borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', paddingLeft: 7 }}>
                                                              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#fff' }}>{item.pr}d</span>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                      {/* Saved badge */}
                                                      <div style={{ textAlign: 'center' }}>
                                                        <span style={{ background: '#ecfdf5', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, padding: '4px 7px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-block' }}>
                                                          −{item.sv}d
                                                        </span>
                                                        <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: 2 }}>saved</div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </>
                                              )}

                                              {/* Resource Addition rows */}
                                              {s2.length > 0 && (
                                                <>
                                                  <div style={{ padding: '6px 16px 5px', background: '#fffbeb', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.07em', color: '#92400e', textTransform: 'uppercase' }}>Resource Addition — Route B</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#92400e', marginTop: 2, lineHeight: 1.35 }}>
                                                      Each activity shortened 1-2 days via an extra shift or crew. Requires project planning sign-off and resource mobilisation before implementation.
                                                    </div>
                                                  </div>
                                                  {s2.map((item, i) => (
                                                    <div key={`ra-${item.id}-${i}`} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 76px', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                      {/* Activity ID */}
                                                      <div>
                                                        <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>{item.id}</div>
                                                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>Compressor Chain</div>
                                                      </div>
                                                      {/* Resource action */}
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 10px', fontSize: '0.71rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                                          + 1 Extra Shift
                                                        </span>
                                                        <span style={{ fontSize: '0.66rem', color: '#78716c' }}>shortens activity by {Math.abs(item.sv)}d</span>
                                                      </div>
                                                      {/* Days freed badge */}
                                                      <div style={{ textAlign: 'center' }}>
                                                        <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-block' }}>
                                                          +{Math.abs(item.sv)}d
                                                        </span>
                                                        <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: 2 }}>freed</div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          );
                                        })()}
<div style={{ padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#475569' }}>
                                          Route A (Float Compression) can be planned internally. Route B (Resource Addition) requires project planning sign-off and resource mobilisation.
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              {/* {((extractedFpCount > 0 || extractedFnCount > 0 || extractedTrueCriticalCount > 0) || extractedRiskRegister.length > 0) && (
                                <>
                                  <div style={{ fontSize: '0.79rem', fontWeight: 800, color: '#0f766e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Critical Path Calibration
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                                    <div style={{ border: '1px solid #dbeafe', borderRadius: '10px', background: '#ffffff', padding: '12px' }}>
                                      <div style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Critical Path Health Matrix</div>
                                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginBottom: '10px' }}>{extractedCpCalibration?.summary || 'Critical path recalibration from current to optimized state.'}</div>

                                      <div style={{ display: 'grid', gap: '8px' }}>
                                        {[
                                          { label: 'False + (Noise)', count: extractedFpCount, color: '#f59e0b' },
                                          { label: 'False - (Blind Spots)', count: extractedFnCount, color: '#ef4444' },
                                          { label: 'True Critical (Optimized)', count: extractedTrueCriticalCount, color: '#14b8a6' },
                                        ].map((row) => (
                                          <div key={`cp-row-${row.label}`} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 36px', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 700 }}>{row.label}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', minHeight: '16px' }}>
                                              {Array.from({ length: row.count }).map((_, i) => (
                                                <span
                                                  key={`cp-dot-${row.label}-${i}`}
                                                  style={{ width: '12px', height: '12px', borderRadius: '3px', background: row.color, display: 'inline-block' }}
                                                />
                                              ))}
                                            </div>
                                            <div style={{ fontSize: '0.86rem', color: row.color, fontWeight: 800, textAlign: 'right' }}>{row.count}</div>
                                          </div>
                                        ))}
                                      </div>

                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                        <div style={{ border: '1px solid #fed7aa', borderRadius: '8px', background: '#fff7ed', textAlign: 'center', padding: '8px' }}>
                                          <div style={{ fontSize: '1.2rem', color: '#b45309', fontWeight: 800 }}>{Number(extractedCpCalibration?.current_state_count || 0)}</div>
                                          <div style={{ fontSize: '0.65rem', color: '#78350f', fontWeight: 700 }}>CURRENT STATE</div>
                                        </div>
                                        <div style={{ fontSize: '1.1rem', color: '#0d9488', fontWeight: 700 }}>-&gt;</div>
                                        <div style={{ border: '1px solid #99f6e4', borderRadius: '8px', background: '#ecfeff', textAlign: 'center', padding: '8px' }}>
                                          <div style={{ fontSize: '1.2rem', color: '#0f766e', fontWeight: 800 }}>{Number(extractedCpCalibration?.optimized_state_count || 0)}</div>
                                          <div style={{ fontSize: '0.65rem', color: '#155e75', fontWeight: 700 }}>OPTIMIZED STATE</div>
                                        </div>
                                      </div>
                                    </div>

                                    {extractedRiskRegister.length > 0 && (
                                      <div style={{ border: '1px solid #dbeafe', borderRadius: '10px', background: '#ffffff', padding: '12px' }}>
                                        <div style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Risk & Blind Spot Register</div>
                                        <div style={{ overflowX: 'auto' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                            <thead>
                                              <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#334155' }}>Item</th>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#334155' }}>Description</th>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#334155' }}>Impact</th>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#334155' }}>Status</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {extractedRiskRegister.map((risk, idx) => {
                                                const impactStyle = getRiskImpactStyle(risk.impact);
                                                return (
                                                  <tr key={`cp-risk-${risk.item}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                    <td style={{ padding: '8px', color: '#0f172a', fontWeight: 700 }}>{risk.item}</td>
                                                    <td style={{ padding: '8px', color: '#475569' }}>{risk.description}</td>
                                                    <td style={{ padding: '8px' }}>
                                                      <span style={{ background: impactStyle.bg, color: impactStyle.text, borderRadius: '999px', padding: '3px 8px', fontWeight: 700, fontSize: '0.68rem' }}>{risk.impact}</span>
                                                    </td>
                                                    <td style={{ padding: '8px', color: '#334155', fontWeight: 700 }}>{risk.status}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )} */}

                              <div style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700, marginBottom: '6px' }}>
                                  Active Mitigation: {extractedActiveMitigation.title || '-'}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#14532d', lineHeight: 1.45 }}>
                                  {extractedActiveMitigation.detail || '-'}
                                </div>
                              </div>

                              {extractedMandates.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                  {extractedMandates.map((mandate) => (
                                    <div key={mandate.id} style={{ border: '1px solid #d1fae5', borderRadius: '8px', background: '#ffffff', padding: '10px' }}>
                                      <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 800 }}>Mandate {mandate.id}</div>
                                      <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>{mandate.title}</div>
                                      <div style={{ fontSize: '0.76rem', color: '#334155', marginTop: '5px', lineHeight: 1.4 }}>{mandate.description}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}


                  {/* {selectedScenario === 'predecessor_successor' && (
                    <div className="pa-deck-shell">
                      <div className="pa-dependency-hero">
                        <div className="pa-dependency-hero-copy">
                          <div className="pa-dependency-eyebrow">Predecessor & Successor</div>
                          <h2>Dependencies & Logic Chain Analysis</h2>
                          <p>Word-doc based critical-path review with timeline-shortening recommendations, time-saving impact, and logic chain highlights.</p>
                          <div className="pa-dependency-badges">
              
                          </div>
                        </div>
                      </div>

                      <div
                        className="pa-slide-card pa-slide-card-wide"
                        style={{
                          marginTop: '12px',
                          border: '1px solid #dbe5ef',
                          background: '#ffffff',
                          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
                        }}
                      >
                        <div className="pa-slide-header" style={{ background: '#f8fbff', borderBottom: '1px solid #e2e8f0' }}>
                          <span className="pa-slide-no">Acceleration</span>
                          <h3>{extractedPredSuccProject?.title || 'Schedule Acceleration and De-Lagging'}</h3>
                          <p>{extractedPredSuccProject?.subtitle || 'Predecessor/successor acceleration mapping from extracted dashboard HTML.'}</p>
                        </div>
                        <div className="pa-visual-block" style={{ display: 'grid', gap: '14px', padding: '16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            {extractedPredSuccKpis.slice(0, 6).map((kpi) => {
                              const tone = String(kpi?.tone || '').toLowerCase();
                              const boxStyle = tone === 'amber'
                                ? { bg: '#fffbeb', bd: '#fde68a', title: '#92400e' }
                                : tone === 'green'
                                  ? { bg: '#f0fdf4', bd: '#bbf7d0', title: '#166534' }
                                  : { bg: '#f0f9ff', bd: '#bae6fd', title: '#0c4a6e' };
                              return (
                                <div key={`predsucc-kpi-${kpi.id}`} style={{ border: `1px solid ${boxStyle.bd}`, background: boxStyle.bg, borderRadius: '10px', padding: '10px' }}>
                                  <div style={{ fontSize: '0.7rem', color: boxStyle.title, fontWeight: 700 }}>{kpi.label}</div>
                                  <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>{kpi.value}</div>
                                  <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>{kpi.sub}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                        

                            <div style={{ border: '1px solid #dbe5ef', borderRadius: '10px', background: '#fcfdff', padding: '12px' }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Approach 1 vs Approach 2</div>
                              <div style={{ display: 'grid', gap: '8px', marginBottom: '9px' }}>
                                {extractedPredSuccApproach1Items.slice(0, 3).map((item, idx) => (
                                  <div key={`a1-${idx}`} style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: '8px', padding: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>{item.name}</div>
                                      <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800 }}>{Number(item.days || 0)}d</div>
                                    </div>
                                  </div>
                                ))}
                                {extractedPredSuccApproach2Primary.slice(0, 2).map((item, idx) => (
                                  <div key={`a2p-${idx}`} style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700 }}>{item.name}</div>
                                      <div style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 800 }}>+{Number(item.days || 0)}d</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '9px' }}>
                                <div style={{ border: '1px solid #86efac', background: '#ecfdf5', borderRadius: '8px', padding: '8px' }}>
                                  <div style={{ fontSize: '0.66rem', color: '#166534', fontWeight: 700 }}>BACK-END</div>
                                  <div style={{ fontSize: '0.95rem', color: '#059669', fontWeight: 800 }}>{Number(extractedPredSucc?.approach_1?.total_days || 0)} Days</div>
                                </div>
                                <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '8px' }}>
                                  <div style={{ fontSize: '0.66rem', color: '#92400e', fontWeight: 700 }}>FRONT-END</div>
                                  <div style={{ fontSize: '0.95rem', color: '#b45309', fontWeight: 800 }}>{Number(extractedPredSucc?.approach_2?.total_days || 0)} Days</div>
                                </div>
                              </div>
                              <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', padding: '8px 10px', fontSize: '0.74rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                                <strong>MVT:</strong> {extractedPredSucc?.mvt?.definition || 'Minimum Viable Trigger principle applied to both back-end and front-end constraints.'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ROOT PROBLEM - LOA ANCHOR CHAIN SECTION */}
                      {/* <div
                        className="pa-slide-card pa-slide-card-wide"
                        style={{
                          marginTop: '14px',
                          border: '1px solid #dbe5ef',
                          background: '#ffffff',
                          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
                        }}
                      > */}
                        {/* Timeline Overview */}
                        {/* <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fbff' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Project Timeline</div>
                          <div style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>
                            {Number(extractedPredSucc?.timeline?.span_days || 0)}-calendar-day span from {extractedPredSucc?.timeline?.baseline_start || '-'} to {extractedPredSucc?.timeline?.baseline_end || '-'}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                            Combined Recovery: {extractedPredSucc?.timeline?.combined_recovery || '~3 Months'}
                          </div>
                        </div> */}

                        {/* Root Problem Heading */}
                        {/* <div style={{ padding: '12px 16px', background: '#fef3c7', borderBottom: '1px solid #fcd34d' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            The Root Problem – LOA Anchor Chain
                          </div>
                        </div> */}

                        {/* Two-Column Layout */}
                        {/* <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}> */}
                          {/* Left Column: The Staircase Bottleneck */}
                          {/* <div style={{ border: '1px solid #dbe5ef', borderRadius: '10px', background: '#fcfdff', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '1.3rem' }}>⚓</div>
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>The Staircase Bottleneck</h4>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45, marginBottom: '12px' }}>
                              The project is not failing due to construction duration. Sequential execution logic and front-end administrative wait times are gating physical progress.
                            </div>
                            <div style={{ border: '1px solid #bae6fd', background: '#f0f9ff', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.76rem', color: '#0c4a6e', fontWeight: 700, marginBottom: '4px' }}>Construction - 100% required</div>
                              <div style={{ fontSize: '0.74rem', color: '#334155' }}>Work cannot proceed until full design sign-off</div>
                            </div>
                            <div style={{ border: '1px solid #fecaca', background: '#fff1f2', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.76rem', color: '#991b1b', fontWeight: 700, marginBottom: '4px' }}>⚠ Suffocating from 100% completion prerequisites</div>
                              <div style={{ fontSize: '0.74rem', color: '#334155' }}>All 5 parallel paths blocked by admin gates before physical work starts</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 700 }}>LOA Lag Chains</div>
                                <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>{Number(extractedPredSucc?.root_problem?.lag_relationships || 0).toLocaleString()}</div>
                              </div>
                              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 700 }}>Total Lag-Days</div>
                                <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>{Number(extractedPredSucc?.root_problem?.total_lag_days || 0).toLocaleString()}</div>
                              </div>
                            </div>
                          </div> */}

                          {/* Right Column: 5 Parallel Paths */}
                          {/* <div style={{ border: '1px solid #dbe5ef', borderRadius: '10px', background: '#fcfdff', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '1.3rem' }}>🔗</div>
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>5 Parallel Paths – All Choked by Admin Lag</h4>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45, marginBottom: '12px' }}>
                              Administrative gateways — logins, full-set design freezes — are artificially gating physical mobilization. Separating credentials from actual outputs lets engineering and procurement run concurrently.
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {extractedPredSuccRootPaths.map((path, idx) => {
                                const statusColor = path.status === 'BLOCKED' ? '#fecaca' : path.status === 'LAGGED' ? '#fecaca' : path.status === 'DEFERRED' ? '#fed7aa' : '#fecaca';
                                const statusBg = path.status === 'BLOCKED' ? '#fff1f2' : path.status === 'LAGGED' ? '#fff1f2' : path.status === 'DEFERRED' ? '#fff7ed' : '#fff1f2';
                                const statusTextColor = path.status === 'BLOCKED' ? '#991b1b' : path.status === 'LAGGED' ? '#991b1b' : path.status === 'DEFERRED' ? '#92400e' : '#991b1b';

                                return (
                                  <div key={`root-path-full-${idx}`} style={{ border: `1px solid ${statusColor}`, background: statusBg, borderRadius: '8px', padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{path.name}</div>
                                      <span style={{ display: 'inline-block', background: statusBg, color: statusTextColor, border: `1px solid ${statusColor}`, borderRadius: '999px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {path.status}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#334155', lineHeight: 1.35 }}>{path.description}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', fontSize: '0.76rem', color: '#1e3a8a', fontWeight: 700 }}>
                              ✓ Expedite Protocol compresses all 5 paths simultaneously
                            </div>
                          </div>
                        </div>
                      </div> */}

{/* 
                      {hasPredecessorDependencies && (
                        <div className="pa-dependency-summary-grid">
                          <div className="pa-dependency-summary-card accent-slate">
                            <span>Total Dependencies</span>
                            <strong>{predecessorSuccessorStats.total}</strong>
                            <p>Predecessor-successor rows loaded from the Word knowledge narrative.</p>
                          </div>
                          <div className="pa-dependency-summary-card accent-orange">
                            <span>Finish-to-Start</span>
                            <strong>{predecessorSuccessorStats.fs}</strong>
                            <p>Linear logic links that control handoff timing.</p>
                          </div>
                          <div className="pa-dependency-summary-card accent-green">
                            <span>Start-to-Start</span>
                            <strong>{predecessorSuccessorStats.ss}</strong>
                            <p>Overlap-ready links that support fast-tracking.</p>
                          </div>
                          <div className="pa-dependency-summary-card accent-blue">
                            <span>Critical Path Edges</span>
                            <strong>{predecessorSuccessorStats.critical}</strong>
                            <p>Relationships that can shift project finish dates.</p>
                          </div>
                        </div>
                      )} */}
{/* 
                      {hasPredecessorClaudeAnalysis && (
                        <div className="pa-slide-card pa-slide-card-wide" style={{ marginTop: hasPredecessorDependencies ? '0' : '12px' }}>
                          <div className="pa-slide-header">
                            <span className="pa-slide-no">Advisory Pack</span>
                            <h3>Timeline Shortening Recommendations</h3>
                            <p>Claude-generated response based on the Word knowledge file and client prompt.</p>
                          </div>
                          <div className="pa-visual-block">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                              <div style={{ padding: '12px', borderRadius: '10px', background: '#ecfeff', border: '1px solid #a5f3fc' }}>
                                <div style={{ fontSize: '0.76rem', color: '#0e7490', fontWeight: 700, marginBottom: '4px' }}>Total Time Saving</div>
                                <div style={{ fontSize: '1.35rem', color: '#155e75', fontWeight: 800 }}>{Number(predecessorSuccessorAnalysis.total_time_saving_days || 0)} days</div>
                              </div>
                              <div style={{ padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #86efac' }}>
                                <div style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>Critical Path Review</div>
                                <div style={{ fontSize: '0.82rem', color: '#14532d', lineHeight: 1.45 }}>{predecessorSuccessorAnalysis.critical_path_review || 'Critical path review generated from Word knowledge.'}</div>
                              </div>
                            </div>

                            {predecessorSuccessorAnalysis.executive_summary && (
                              <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', fontSize: '0.82rem' }}>
                                {predecessorSuccessorAnalysis.executive_summary}
                              </div>
                            )}

                            <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                              {Array.isArray(predecessorSuccessorAnalysis.suggestions) && predecessorSuccessorAnalysis.suggestions.map((s, idx) => (
                                <div key={`${s.title || 'suggestion'}-${idx}`} style={{ border: '1px solid #dbeafe', background: '#f8fbff', borderRadius: '8px', padding: '10px 12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <strong style={{ color: '#1e3a8a', fontSize: '0.86rem' }}>{s.title || `Suggestion ${idx + 1}`}</strong>
                                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '6px', padding: '2px 8px', fontSize: '0.74rem', fontWeight: 700 }}>
                                      Save {Number(s.time_saving_days || 0)}d
                                    </span>
                                  </div>
                                  <div style={{ color: '#334155', fontSize: '0.8rem', marginBottom: '4px' }}>{s.reorder_action || '-'}</div>
                                  <div style={{ color: '#475569', fontSize: '0.76rem', marginBottom: '4px' }}><strong>Guardrail:</strong> {s.risk_guardrail || '-'}</div>
                                  {Array.isArray(s.dependencies_affected) && s.dependencies_affected.length > 0 && (
                                    <div style={{ color: '#64748b', fontSize: '0.74rem' }}>
                                      <strong>Dependencies:</strong> {s.dependencies_affected.join(', ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {predecessorChartPlan.length > 0 && (
                              <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Dependency Chart Studio</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                  {predecessorChartPlan.map((chart, idx) => (
                                    <div
                                      key={`${chart?.id || chart?.title || 'pred-chart'}-${idx}`}
                                      style={{
                                        border: '1px solid #fde68a',
                                        borderRadius: '10px',
                                        background: '#fffef7',
                                        padding: '10px',
                                      }}
                                    >
                                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                                        {chart?.title || `Chart ${idx + 1}`}
                                      </div>
                                      {renderPredecessorChart(chart, idx)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )} */}

                      {/* {predSuccLoading && (
                        <div className="ih-loading-overlay">
                          <Loader2 size={32} className="ih-spinner" />
                          <p>Loading predecessor/successor data...</p>
                        </div>
                      )}

                      {predSuccError && (
                        <div style={{
                          padding: '12px',
                          margin: '12px 0',
                          background: '#fff1f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          color: '#991b1b',
                          fontSize: '0.85rem'
                        }}>
                          <strong>Error:</strong> {predSuccError}
                        </div>
                      )} */}

                      {/* {!predSuccLoading && hasPredecessorDependencies && (
                        <>
                          <div className="pa-slide-card pa-slide-card-wide">
                            <div className="pa-slide-header">
                              <span className="pa-slide-no">Strategic Shift</span>
                              <h3>Linear to Parallel Dependency Flow</h3>
                              <p>How predecessor gates and successor links shape the schedule path.</p>
                            </div>
                            <div className="pa-visual-block">
                              {hasPredecessorDependencies ? (
                                <div className="pa-dependency-flow">
                                  {predecessorSuccessorFlow.map((item, idx) => (
                                    <React.Fragment key={item.label}>
                                      <div className={`pa-dependency-flow-card tone-${item.tone}`}>
                                        <span>{item.label}</span>
                                        <strong>{item.value}</strong>
                                        <small>{item.detail}</small>
                                      </div>
                                      {idx < predecessorSuccessorFlow.length - 1 && <div className="pa-dependency-flow-arrow" />}
                                    </React.Fragment>
                                  ))}
                                </div>
                              ) : (
                                <div className="base-history-empty">
                                  No dependency links were extracted from the Word document, so this section is hidden.
                                </div>
                              )}
                            </div>
                          </div>

                          {hasPredecessorDependencies && (
                            <>
                              <div className="pa-slide-card pa-slide-card-wide">
                                <div className="pa-slide-header">
                                  <span className="pa-slide-no">Tactical Execution</span>
                                  <h3>Dependency Hotspots</h3>
                                  <p>Highest lag links surfaced from the Word-driven dependency narrative.</p>
                                </div>
                                <div className="pa-visual-block">
                                  <div className="pa-hotspot-grid">
                                    {predecessorSuccessorTopLag.map((dep, idx) => (
                                      <div className="pa-hotspot-card" key={`${dep.from_id}-${dep.to_id}-${idx}`}>
                                        <div className="pa-hotspot-index">0{idx + 1}</div>
                                        <h4>{dep.from_id || 'N/A'} → {dep.to_id || 'N/A'}</h4>
                                        <p>{dep.from_name || 'Predecessor'} to {dep.to_name || 'Successor'}</p>
                                        <div className="pa-hotspot-footer">
                                          <span>{dep.logic_type || 'FS'}</span>
                                          <strong>{dep.lag_days ?? 0} Days Lag</strong>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pa-slide-card pa-slide-card-wide">
                                <div className="pa-slide-header">
                                  <span className="pa-slide-no">Logic Table</span>
                                  <h3>Predecessor / Successor Breakdown</h3>
                                  <p>Standard response box preserved; only the source-fed predecessor & successor data updates.</p>
                                </div>
                                <div className="pa-visual-block">
                                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2eaf2' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                      <thead>
                                        <tr style={{ background: 'linear-gradient(120deg, #fef3c7 0%, #fde047 100%)' }}>
                                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#713f12', borderBottom: '1px solid #fcd34d' }}>From Activity</th>
                                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#713f12', borderBottom: '1px solid #fcd34d' }}>To Activity</th>
                                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#713f12', borderBottom: '1px solid #fcd34d' }}>Logic Type</th>
                                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#713f12', borderBottom: '1px solid #fcd34d' }}>Lag (Days)</th>
                                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#713f12', borderBottom: '1px solid #fcd34d' }}>On Critical Path</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {predecessorSuccessorData.map((dep, idx) => (
                                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fffbeb', borderBottom: '1px solid #e2eaf2' }}>
                                            <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '600' }}>
                                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{dep.from_id || dep.predecessor_id || '-'}</div>
                                              <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{dep.from_name || dep.predecessor_name || '-'}</div>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '600' }}>
                                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{dep.to_id || dep.successor_id || '-'}</div>
                                              <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{dep.to_name || dep.successor_name || '-'}</div>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#425770' }}>
                                              <span style={{ display: 'inline-block', background: dep.logic_type === 'FS' ? '#dbeafe' : dep.logic_type === 'SS' ? '#c7d2fe' : '#fecdd3', color: dep.logic_type === 'FS' ? '#1e40af' : dep.logic_type === 'SS' ? '#4f46e5' : '#be123c', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                {dep.logic_type || 'FS'}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#425770', textAlign: 'center', fontWeight: '600' }}>{dep.lag_days ?? 0}</td>
                                            <td style={{ padding: '10px 12px', color: '#425770' }}>
                                              <span style={{ display: 'inline-block', background: (dep.on_critical_path || false) ? '#dcfce7' : '#f3f4f6', color: (dep.on_critical_path || false) ? '#166534' : '#6b7280', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                {(dep.on_critical_path || false) ? 'Yes' : 'No'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div style={{ marginTop: '10px', padding: '8px 10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', color: '#713f12', fontSize: '0.76rem', fontWeight: '600' }}>
                                    Total Dependencies: <strong>{predecessorSuccessorData.length}</strong>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )} */}

                      {/* {!predSuccLoading && !hasPredecessorDependencies && !hasPredecessorClaudeAnalysis && !predSuccError && (
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}>
                          <p>No predecessor/successor analysis returned from the Word document.</p>
                        </div>
                      )}
                    </div>
                  )}  */}

                  {/* {output && !isGenerating && (
                    <div className="ai-message bot" ref={outputRef}>
                      <div className="ai-msg-avatar bot"><Sparkles size={13} /></div>
                      <div className="ai-msg-body">
                        {activeScenario && activeCategoryObj && (
                          <div className="ai-msg-module-tag">{activeScenario.title} - {activeCategoryObj.label}</div>
                        )}
                        <div className="ai-msg-bubble bot">
                          {renderMarkdown(output)}
                        </div>
                        <div className="ai-msg-footer">
                          <span className="ai-msg-time">
                            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            className={`ai-copy-btn ${copiedOutput ? 'copied' : ''}`}
                            onClick={handleCopyOutput}
                            title="Copy analysis"
                          >
                            {copiedOutput ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {isGenerating && (
                    <div className="pa-response-loader-backdrop" role="status" aria-live="polite">
                      <div className="ih-loading-overlay pa-response-loader">
                        <Loader2 size={36} className="ih-spinner" />
                        <p>Running {activeScenario?.title || 'What-IF'} analysis...</p>
                        <span>Please wait</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionWhatIF;