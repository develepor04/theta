import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';
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
  Loader2,
  ArrowRightLeft,
  UserPlus,
  BarChart3,
  TrendingUp,
  Terminal,
  BrainCircuit,
  HardHat,
  Wrench,
  ShoppingCart,
  Briefcase,
  Send,
  MessageSquare,
  Bot,
  ChevronDown,
  Building2,
  Package,
  Settings,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './Chat.css';
import './PredictiveAnalysis.css';

const PredictiveAnalysis = () => {
  const { user } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scenario & Category state
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analysisRequest, setAnalysisRequest] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const outputRef = useRef(null);
  const previousCategoryRef = useRef('');

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
      id: 'vendor_change',
      title: 'Change Vendor',
      subtitle: 'What if I change the vendor for an activity?',
      description: 'Analyze the impact on predecessors, successors, schedule, and critical path when a vendor is changed.',
      icon: ArrowRightLeft,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      buildPrompt: (category) => {
        return `WHAT-IF SCENARIO ANALYSIS — VENDOR CHANGE\n\nCategory: "${category}"\n\nAnalyze ALL activities under the "${category}" category and provide the following:\n1. List all key activities under "${category}".\n2. For each activity, what are the predecessor and successor relationships?\n3. If the vendor is changed for activities in this category, what is the likely impact on schedule duration?\n4. What is the typical lead time for vendor re-mobilization in EPC projects for "${category}" activities?\n5. Which downstream activities (successors) will be affected and by how much?\n6. What are the risks and mitigation strategies for a vendor change in "${category}"?\n7. Provide a recommended action plan with timeline.\n\nUse the Knowledgebase predecessor-successor data, benchmarks, and the latest P6-to-Excel schedule data as your primary reference. Generate comprehensive data for ALL activities under this category based on the values, relationships, dates, and status present in that data.`;
      },
    },
    {
      id: 'resource_increase',
      title: 'Increase Resources',
      subtitle: 'What if I increase resources on activities?',
      description: 'Evaluate how adding more resources affects activity duration, predecessor/successor chain, and overall project timeline.',
      icon: UserPlus,
      color: '#0d9488',
      gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      buildPrompt: (category) => {
        return `Act as an AI Project Advisor. WHAT-IF SCENARIO ANALYSIS — RESOURCE INCREASE\n\nCategory: "${category}"\n\nPlease analyze ALL activities under the "${category}" category from the provided project data.\nFor each activity in this category:\n1. Identify which activities are complete versus incomplete.\n2. Evaluate what would happen if we increase resources on the incomplete activities.\n3. Detail the expected duration reductions for each activity.\n4. Provide cost implications and ROI analysis for the resource increase.\n5. Identify any risks or bottlenecks that could limit the benefit of added resources.\n6. Provide overall schedule compression estimate for the "${category}" discipline.\n\nUse the latest P6-to-Excel data, actual activity status, logic links, dates, and available schedule values as the basis for the output. Generate comprehensive analysis for ALL "${category}" activities.`;
      },
    },
    {
      id: 'scope_change',
      title: 'Scope Change',
      subtitle: 'What if scope changes for activities?',
      description: 'Evaluate the impact of a scope change on activity duration, resource requirements, and dependent activities.',
      icon: BarChart3,
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      buildPrompt: (category) => {
        return `WHAT-IF SCENARIO ANALYSIS — SCOPE CHANGE\n\nCategory: "${category}"\n\nAnalyze ALL activities under the "${category}" category and evaluate the impact of a potential scope change:\n1. List all activities under "${category}" and their current status.\n2. What is the expected duration and cost impact if scope changes occur in this category?\n3. What predecessor activities need to be re-evaluated?\n4. What downstream successor activities are affected?\n5. What are the resource implications and re-planning requirements?\n6. Provide a scope change impact assessment with recommendations.\n7. Suggest contingency plans and risk mitigation strategies.\n\nUse the Knowledgebase predecessor-successor data, benchmarks, and the latest P6-to-Excel activity data to form your answer. Generate data for ALL activities under this category using the values present in the source data.`;
      },
    },
  ];

  // Scroll output into view when generated
  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [output]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (!selectedCategory || previousCategoryRef.current === selectedCategory) {
      return;
    }

    const categoryObj = categories.find(c => c.id === selectedCategory);
    const categoryLabel = categoryObj?.label || selectedCategory;
    const scenarioObj = whatIfScenarios.find(s => s.id === selectedScenario);
    const scenarioLabel = scenarioObj?.title || 'selected scenario';

    setChatMessages((prev) => ([
      ...prev,
      {
        role: 'assistant',
        content: `Got it — you selected **${categoryLabel}**${scenarioLabel ? ` for **${scenarioLabel}**` : ''}. Tell me what data or insight you want, and I’ll generate the output for this category using the latest P6-to-Excel reference data.`
      }
    ]));
    previousCategoryRef.current = selectedCategory;
  }, [selectedCategory, selectedScenario]);

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

    const prompt = `${scenario.buildPrompt(categoryLabel)}

Additional user request for this analysis:
${analysisRequest.trim()}

  Make sure the response is aligned to this request while still covering all activities under the selected category.

  Use the latest P6-to-Excel data as reference for activity logic, dates, relationships, status, and forecasts. Base the generated output on the data present in that source instead of generic assumptions wherever possible.`;

    setIsGenerating(true);
    setOutput('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chat',
        {
          message: prompt,
          selected_sheets: [],
          history: [],
          suggestion: `${scenario.title} — ${categoryLabel}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setOutput(response.data.message || 'No response generated.');
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

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopiedOutput(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedOutput(false), 2000);
    });
  };

  // Chatbot: send message for specific activity search
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

    const contextPrompt = `You are an AI Project Advisor specialized in EPC project scheduling and predictive analysis. The user is currently analyzing the "${categoryLabel}" category${scenarioLabel ? ` under the "${scenarioLabel}" scenario` : ''}.

  The user wants to search for or get insights about a specific activity or category view. Answer their question using the project schedule data, knowledgebase, and the latest P6-to-Excel reference data. Be specific with activity IDs, dates, durations, and relationships where possible.

User's question: "${userMsg}"

If the user mentions a specific activity by name or ID, provide:
1. Activity details (ID, name, dates, status)
2. Predecessor and successor relationships
3. Any relevant delay or forecast information
4. Recommendations based on the current scenario analysis

When enough P6-to-Excel data is available, ground the response in the values present in that data and explicitly use it as the reference for generation.

Use markdown formatting for clarity.`;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chat',
        {
          message: contextPrompt,
          selected_sheets: [],
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
          suggestion: 'Activity Search',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.message || 'No response.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const activeScenario = whatIfScenarios.find(s => s.id === selectedScenario);
  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

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
                <div className="ai-topbar-title">Predictive Analysis</div>
                <div className="ai-topbar-sub">
                  <span className="ai-status-dot" style={{ background: '#10b981' }} />
                  Select a scenario and category — AI generates data for every activity in that group
                </div>
              </div>
            </div>
            <div className="ai-topbar-right">
              <div className="pa-session-note">
                Chat stays on across categories
              </div>
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

              {/* Category + Config section (shown after scenario is selected) */}
              {selectedScenario && (
                <div className="ai-section" style={{ marginTop: '10px' }}>
                  <div className="ai-section-label">
                    <FolderKanban size={13} style={{ color: '#10b981' }} /> Configuration
                  </div>
                  
                  <div className="ih-config-block">
                    {/* Category Dropdown */}
                    <div className="ih-config-field">
                      <label>
                        <Briefcase size={12} />
                        Activity Category <span className="ih-required">*</span>
                      </label>
                      <div className="pa-category-select-wrapper">
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setOutput('');
                          }}
                          className="ih-select pa-category-select"
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pa-select-chevron" />
                      </div>
                    </div>

                    {/* Selected Category Visual Badge */}
                    {selectedCategory && (
                      <div className="pa-category-badge" style={{ background: activeCategoryObj?.gradient }}>
                        {activeCategoryObj && <activeCategoryObj.icon size={16} />}
                        <span>{activeCategoryObj?.label}</span>
                      </div>
                    )}

                    <div className="ai-inline-tip">
                      AI will generate analysis for <strong>all activities</strong> under the selected category.
                      It now uses your P6-to-Excel reference data for generation. Want to check one activity or switch categories in the same session? Just continue in the chatbox on the right.
                    </div>

                    <div className="ih-config-field">
                      <label>
                        <MessageSquare size={12} />
                        What data do you want? <span className="ih-required">*</span>
                      </label>
                      <textarea
                        value={analysisRequest}
                        onChange={(e) => setAnalysisRequest(e.target.value)}
                        className="ih-input pa-request-input"
                        rows={4}
                        placeholder="Example: Use the P6 Excel data to show delay impact, key risks, affected successors, and recommendations for this category."
                      />
                      <span className="ih-field-hint">
                        Add the exact output you want. The AI will combine this with the selected scenario and category.
                      </span>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    className="ih-btn-generate"
                    onClick={handleGenerate}
                    disabled={!selectedCategory || !analysisRequest.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="ih-spinner" />
                        Generating for all {activeCategoryObj?.label} activities...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Run Analysis — All {activeCategoryObj?.label || 'Category'} Activities
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: Unified Analysis & Chat Panel */}
            <div className="ai-right-panel">
              <div className="pa-unified-panel">
                <div className="ai-console-header pa-unified-header">
                  <BrainCircuit size={14} />
                  <span>Analysis Console</span>
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
                  {/* Empty state — only when nothing is selected and no messages */}
                  {!selectedScenario && !output && !isGenerating && chatMessages.length === 0 && (
                    <div className="ai-empty-state">
                      <BrainCircuit size={40} className="ai-empty-icon" />
                      <p className="ai-empty-title">Select a Scenario to Begin</p>
                      <p className="ai-empty-sub">Choose a scenario and category on the left, then run analysis. All outputs and follow-up conversations appear here in one thread.</p>
                    </div>
                  )}

                  {selectedScenario && !selectedCategory && !output && !isGenerating && chatMessages.length === 0 && (
                    <div className="ai-empty-state">
                      <FolderKanban size={40} className="ai-empty-icon" />
                      <p className="ai-empty-title">Select a Category</p>
                      <p className="ai-empty-sub">Choose a category from the left panel, then describe what you need and run the analysis. You can also ask follow-up questions directly below.</p>
                    </div>
                  )}

                  {/* Analysis output (appears inline as a message) */}
                  {isGenerating && (
                    <div className="ih-loading-overlay">
                      <Loader2 size={36} className="ih-spinner" />
                      <p>Running {activeScenario?.title} analysis...</p>
                      <span>Generating data for all {activeCategoryObj?.label} activities</span>
                    </div>
                  )}

                  {output && !isGenerating && (
                    <div className="ai-message bot" ref={outputRef}>
                      <div className="ai-msg-avatar bot"><Sparkles size={13} /></div>
                      <div className="ai-msg-body">
                        {activeScenario && activeCategoryObj && (
                          <div className="ai-msg-module-tag">{activeScenario.title} — {activeCategoryObj.label}</div>
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
                  )}

                  {/* Chat messages (same thread, below analysis) */}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role === 'user' ? 'user' : 'bot'}`}>
                      <div className={`ai-msg-avatar ${msg.role === 'user' ? 'user' : 'bot'}`}>
                        {msg.role === 'user' ? (user?.name?.charAt(0).toUpperCase() || 'U') : <Bot size={13} />}
                      </div>
                      <div className="ai-msg-body">
                        <div className={`ai-msg-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                          {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="ai-message bot">
                      <div className="ai-msg-avatar bot"><Bot size={13} /></div>
                      <div className="ai-msg-body">
                        <div className="ai-msg-bubble bot typing">
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Single unified input */}
                <div className="ai-console-input pa-unified-input">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up, search for an activity, or switch categories..."
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    disabled={isChatLoading}
                  />
                  <button
                    className="ai-send-btn"
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
