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
import './Chat.css';
import './PredictionWhatIF.css';

const PredictionWhatIF = () => {
  const { user } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scenario & Category state
  const [selectedScenario, setSelectedScenario] = useState(null);
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

  // ── 2 scenarios only (Project Scope Update moved to Intelligence Hub) ──
  const whatIfScenarios = [
    {
      id: 'whatif_critical_activities',
      title: 'WhatIf-Critical Activities',
      subtitle: 'What happens if critical activities or dependencies get delayed?',
      description: 'Analyze delay propagation for highly delayed activities and their ripple effect on predecessors/successors using Word knowledge documents only.',
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
    {
      id: 'predecessor_successor',
      title: 'Predecessor and Successor',
      subtitle: 'What are the dependencies and chain impacts for this category?',
      description: 'Analyze the predecessor and successor relationships to identify logic sequence and ripple effects.',
      icon: FolderKanban,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      quickActions: [
        'Show activities starting this week',
        'Identify critical path driver activities',
        'List open-ended/missing logic activities'
      ],
      kpiParameters: [
        'Logic Density',
        'Predecessor/Successor Ratio',
        'Lag / Lead Variance',
        'Open-Ends / Dangling Logic'
      ],
      buildPrompt: (category) => {
        return `Act as an AI Project Advisor using Azure AI Foundry. WHAT-IF SCENARIO ANALYSIS — PREDECESSOR AND SUCCESSOR\n\nCategory: "${category}"\n\nPlease analyze ONLY the Word documents in Knowledgebase/whatifKnowledge and evaluate KPIs such as Logic Density, Pre/Suc Ratio, Lag Variances, and Open-Ends. Do NOT use Excel/JSON sources. Include a visual generated bar chart for dependency triggers by logic type:\n\nUse \`\`\`json_chart for the chart:\n\`\`\`json_chart\n{ "type": "bar", "title": "Dependencies Triggered", "data": [ { "name": "Activity ID", "value": predecessor_count } ] }\n\`\`\`\n\nFocus on the following for the "${category}":\n1. Activities likely to start in the current week based only on Word-doc predecessor completion notes.\n2. For these activities, identify predecessor completion triggers from Word-doc content.\n3. State what this current activity acts as a successor for based on Word-doc evidence.\n4. Highlight the most sensitive predecessor-successor relationships that could drive the critical path from Word-doc knowledge only.`;
      },
    },
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
    setSelectedScenario(session.selectedScenario || null);
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
      try {
        const cachedRaw = cacheKey ? localStorage.getItem(cacheKey) : null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && typeof cached === 'object' && cached.threat_tracker && cached.compressor_savings && cached.kpis) {
            setThreatTrackerData(cached.threat_tracker || []);
            setCompressorSavings(cached.compressor_savings || []);
            setDashboardKpis(cached.kpis || {});
            applyCriticalNarrative(cached.ui_payload || {});
            setDashboardError(null);
            setDashboardLoading(false);
            return;
          }
        }
      } catch (cacheErr) {
        console.warn('Critical dashboard cache read failed:', cacheErr);
      }

      setDashboardLoading(true);
      setDashboardError(null);

      try {
        const response = await api.get('/whatif/critical-dashboard', {
          params: { cached_only: true },
        });

        let dashboardData = response.data;
        if (typeof dashboardData === 'string') dashboardData = JSON.parse(dashboardData);

        if (dashboardData && typeof dashboardData === 'object') {
          const resolvedThreatTracker = dashboardData.threat_tracker || [];
          const resolvedCompressorSavings = dashboardData.compressor_savings || [];
          const resolvedKpis = dashboardData.kpis || {};

          setThreatTrackerData(resolvedThreatTracker);
          setCompressorSavings(resolvedCompressorSavings);
          setDashboardKpis(resolvedKpis);
          applyCriticalNarrative(dashboardData.ui_payload || {});

          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              threat_tracker: resolvedThreatTracker,
              compressor_savings: resolvedCompressorSavings,
              kpis: resolvedKpis,
              ui_payload: dashboardData.ui_payload || {},
              generated_at: dashboardData.generated_at || new Date().toISOString(),
            }));
          } catch (_) {}
        }
      } catch (err) {
        setDashboardError('Failed to load critical dashboard data.');
        console.error('Critical dashboard fetch error:', err);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedScenario]);

  // Fetch predecessor/successor data
  useEffect(() => {
    const fetchPredSuccData = async () => {
      if (selectedScenario !== 'predecessor_successor') return;

      setPredSuccLoading(true);
      setPredSuccError(null);

      try {
        const response = await api.get('/whatif/predecessor-successor');

        const data = response.data;
        setPredecessorSuccessorData(Array.isArray(data?.dependencies) ? data.dependencies : []);
        setPredecessorSuccessorAnalysis(data?.analysis || null);
      } catch (err) {
        setPredSuccError('Failed to load predecessor/successor data.');
        console.error('Pred/Succ fetch error:', err);
      } finally {
        setPredSuccLoading(false);
      }
    };

    fetchPredSuccData();
  }, [selectedScenario]);

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
          if (e.key === 'Enter' || e.key === ' ') setIsMobileMenuOpen(false);
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
                <div className="ai-topbar-title">Prediction WhatIF</div>
                <div className="ai-topbar-sub">
                  <span className="ai-status-dot" style={{ background: '#10b981' }} />
                  {' '}
                  Select a scenario and category — AI generates data for every activity in that group
                </div>
              </div>
            </div>
            <div className="ai-topbar-right">
              {/* Session History dropdown */}
              <div className="chat-history-dropdown">
                <button
                  className="ai-session-btn"
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                >
                  <History size={15} />
                  <span>Sessions ({sessionHistory.length})</span>
                  <ChevronDown size={13} className={showSessionHistory ? 'rotated' : ''} />
                </button>
                {showSessionHistory && (
                  <div className="history-dropdown-menu">
                    <div className="history-dropdown-header"><span>Recent Sessions</span></div>
                    <div className="chat-list">
                      {sessionHistory.map(session => (
                        <div
                          key={session.id}
                          className={`chat-item ${currentSessionId === session.id ? 'active' : ''}`}
                          onClick={() => loadSession(session)}
                        >
                          <History size={14} className="chat-item-icon" />
                          <div className="chat-item-info">
                            <span className="chat-item-title">{session.title || 'New Analysis'}</span>
                            <span className="chat-item-date">{new Date(session.lastModified || session.id * 1).toLocaleString()}</span>
                          </div>
                          <button
                            className="delete-chat-btn"
                            onClick={(e) => deleteSession(e, session.id)}
                            title="Delete Session"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="ai-new-session-btn" onClick={createNewSession}>
                <Plus size={15} />
                New Session
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="ai-body chat-body-responsive">

            {/* LEFT: Configuration panel */}
            <div className="ih-left-panel">

              {/* Scenarios section */}
              <div className="ai-section">
                <div className="ai-section-label">
                  <Lightbulb size={13} style={{ color: '#10b981' }} /> Scenarios
                </div>
                <div className="ai-modules-grid">
                  {whatIfScenarios.map((scenario) => {
                    const Icon = scenario.icon;
                    const isActive = selectedScenario === scenario.id;
                    return (
                      <button
                        key={scenario.id}
                        className={`ai-module-card ${isActive ? 'active-scenario' : ''}`}
                        onClick={() => {
                          setSelectedScenario(scenario.id);
                          setOutput('');

                          if (scenario.id === 'whatif_critical_activities') {
                            const cached = readCriticalDashboardCache();
                            if (cached) {
                              setSelectedCategory(prev => prev || 'overall');
                              setAnalysisRequest(prev => prev || (scenario.quickActions?.[0] || 'Analyze impact of delayed critical activities'));
                              setThreatTrackerData(cached.threat_tracker || []);
                              setCompressorSavings(cached.compressor_savings || []);
                              setDashboardKpis(cached.kpis || {});
                              applyCriticalNarrative(cached.ui_payload || {});
                              setDashboardError(null);
                              setDashboardLoading(false);
                              return;
                            }

                            const categoryObj = categories.find(c => c.id === selectedCategory);
                            const categoryLabel = categoryObj?.label || selectedCategory || 'Overall';
                            const requestText = analysisRequest.trim() || scenario.quickActions?.[0] || 'Analyze impact of delayed critical activities';

                            setSelectedCategory(prev => prev || 'overall');
                            setAnalysisRequest(prev => prev || requestText);

                            let dateConstraint = '';
                            if (startDate || endDate) {
                              dateConstraint = `\n\nCRITICAL DATE FILTER: You must ONLY consider and output activities that fall into the given date range: ${startDate ? `From ${startDate}` : 'Any time before endDate'} ${endDate ? `to ${endDate}` : 'and onwards'}\.\n`;
                            }

                            const prompt = `${scenario.buildPrompt(categoryLabel)}${dateConstraint}\n\nAdditional user request for this analysis:\n${requestText}\n\n  Make sure the response is aligned to this request and uses ONLY Knowledgebase Word files. Do not use Excel, JSON, or other data sources.`;

                            executeWhatIfAnalysis({
                              scenarioId: scenario.id,
                              categoryLabel,
                              requestText,
                              prompt,
                            });
                          }
                        }}
                      >
                        <div className="ai-module-icon">
                          <Icon size={18} />
                        </div>
                        <div className="ai-module-text">
                          <span className="ai-module-title">{scenario.title}</span>
                          <span className="ai-module-desc">{scenario.subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Output panel */}
            <div className="ai-right-panel">
              <div className="pa-unified-panel">
                <div className="ai-console-header pa-unified-header">
                  <BrainCircuit size={14} />
                  <span>
                    {selectedScenario === 'whatif_critical_activities' && 'Critical Activities Dashboard'}
                    {selectedScenario === 'predecessor_successor' && 'Predecessor & Successor Analysis'}
                    {!selectedScenario && 'Analysis Console'}
                  </span>
                  {activeCategoryObj && (
                    <span className="pa-chat-context-badge" style={{ background: activeCategoryObj.color + '18', color: activeCategoryObj.color, border: `1px solid ${activeCategoryObj.color}33` }}>
                      {activeCategoryObj.label}
                    </span>
                  )}
                  {activeScenario && (
                    <span className="pa-chat-context-badge" style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98133' }}>
                      {activeScenario.title}
                    </span>
                  )}
                </div>

                <div className="ai-console-messages pa-unified-messages">
                  {!selectedScenario && !output && !isGenerating && (
                    <div className="ai-empty-state">
                      <BrainCircuit size={40} className="ai-empty-icon" />
                      <p className="ai-empty-title">Select a Scenario to Begin</p>
                      <p className="ai-empty-sub">Choose WhatIf-Critical Activities or Predecessor & Successor to open the analysis dashboard.</p>
                    </div>
                  )}

                  {/* Critical Activities tab content — preserved from original */}
                  {selectedScenario === 'whatif_critical_activities' && (
                    <div className="pa-deck-shell">
                      <div className="pa-critical-overview">
                        <h2>Critical Activities Dashboard</h2>
                        <p>Cached critical path insights, delay threats, and recovery opportunities.</p>
                      </div>

                      {dashboardLoading && (
                        <div className="ih-loading-overlay">
                          <Loader2 size={32} className="ih-spinner" />
                          <p>Loading critical dashboard...</p>
                        </div>
                      )}

                      {dashboardError && (
                        <div style={{ padding: '12px', margin: '12px 0', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                          <strong>Error:</strong> {dashboardError}
                        </div>
                      )}

                      {!dashboardLoading && !dashboardError && threatTrackerData.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                          <p>No critical activities data loaded yet. Run an analysis to populate this dashboard.</p>
                        </div>
                      )}

                      {!dashboardLoading && !dashboardError && threatTrackerData.length > 0 && (
                        <div className="pa-slide-card pa-slide-card-wide" style={{ marginBottom: '12px' }}>
                          <div className="pa-slide-header">
                            <span className="pa-slide-no">Threats</span>
                            <h3>Top Critical Delay Threats</h3>
                            <p>Activities driving the largest baseline variance.</p>
                          </div>
                          <div className="pa-visual-block">
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                  <tr style={{ background: 'linear-gradient(120deg, #f5f9ff 0%, #eef8f3 100%)' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>Activity ID</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>Activity Name</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>Baseline</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>Actual</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>Variance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {threatTrackerData.slice(0, 10).map((item, idx) => (
                                    <tr key={`threat-${idx}`} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 600 }}>{item.id || '-'}</td>
                                      <td style={{ padding: '9px 12px', color: '#334155' }}>{item.name || '-'}</td>
                                      <td style={{ padding: '9px 12px', color: '#334155' }}>{item.baseline ?? 0}</td>
                                      <td style={{ padding: '9px 12px', color: '#334155' }}>{item.actual ?? 0}</td>
                                      <td style={{ padding: '9px 12px', color: '#b91c1c', fontWeight: 700 }}>{item.late ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Predecessor/Successor tab content — preserved from original */}
                  {selectedScenario === 'predecessor_successor' && (
                    <div className="pa-deck-shell">
                      {predSuccLoading && (
                        <div className="ih-loading-overlay">
                          <Loader2 size={32} className="ih-spinner" />
                          <p>Loading predecessor/successor data...</p>
                        </div>
                      )}

                      {predSuccError && (
                        <div style={{ padding: '12px', margin: '12px 0', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                          <strong>Error:</strong> {predSuccError}
                        </div>
                      )}

                      {!predSuccLoading && (
                        <>
                          <div className="pa-slide-card pa-slide-card-wide" style={{ marginBottom: '12px' }}>
                            <div className="pa-slide-header">
                              <span className="pa-slide-no">Overview</span>
                              <h3>Dependency Flow Summary</h3>
                              <p>Word-knowledge driven predecessor and successor chain overview.</p>
                            </div>
                            <div className="pa-visual-block">
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                {predecessorSuccessorFlow.map((item) => (
                                  <div key={item.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 700 }}>{item.label}</div>
                                    <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>{item.value}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>{item.detail}</div>
                                  </div>
                                ))}
                              </div>
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

                          {!predSuccLoading && !hasPredecessorDependencies && !hasPredecessorClaudeAnalysis && !predSuccError && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                              <p>No predecessor/successor analysis returned from the Word document.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

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