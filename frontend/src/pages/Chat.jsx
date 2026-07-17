import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Send,
  Plus,
  Sparkles,
  Trash2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  BrainCircuit,
  Calendar,
  Activity,
  GitBranch,
  GitMerge,
  BarChart2,
  Zap,
  ChevronRight,
  Clock,
  History,
  Terminal,
  FlaskConical,
  Menu,
  X,
  FileText,
  Copy,
  Check,
  Mail,
  TrendingDown,
} from 'lucide-react';
import useStore from '../store/useStore';
import { engageService } from '../services/api';
import { renderMarkdown } from '../utils/renderMarkdown';
import Sidebar from '../components/Sidebar';
import './Chat.css';

const isSystemWelcomeMessage = (content = '') => {
  const txt = String(content).toLowerCase();
  return txt.includes('ai project advisor is ready') && txt.includes('analysis module');
};

const buildConversationHistory = (messages = []) => (
  messages
    .filter(msg => !(msg.type === 'bot' && isSystemWelcomeMessage(msg.content)))
    .map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }))
);

const Chat = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({});
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [sharedMsgId, setSharedMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Per-user localStorage key — null when user is not yet loaded (skip read/write)
  const chatStorageKey = user?.id ? `chatHistory_${user.id}` : null;

  // Load chat history and preserve active session across tab/page switches
  useEffect(() => {
    const savedChatHistory = chatStorageKey ? localStorage.getItem(chatStorageKey) : null;
    let existingHistory = [];
    if (savedChatHistory) {
      try {
        existingHistory = JSON.parse(savedChatHistory);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    if (existingHistory.length > 0) {
      // Reuse most recent session instead of creating a new one every mount
      setChatHistory(existingHistory);
      setCurrentChatId(existingHistory[0].id);
      setMessages(existingHistory[0].messages || []);
      return;
    }

    // First-time user (or cleared storage): create initial session once
    const freshChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: 1,
          type: 'bot',
          content: 'Theta Project Advisor is ready. Select an analysis module from the left panel to run an instant analysis, or type a custom query below.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setChatHistory([freshChat]);
    setCurrentChatId(freshChat.id);
    setMessages(freshChat.messages);
  }, [chatStorageKey]);

  // Save chat history to localStorage (per-user key, skipped when key is null)
  useEffect(() => {
    if (chatStorageKey && chatHistory.length > 0) {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatHistory));
    }
  }, [chatHistory, chatStorageKey]);

  // Save current messages to chat history
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages, updatedAt: new Date().toISOString() }
            : chat
        )
      );
    }
  }, [messages, currentChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showChatHistory && !event.target.closest('.chat-history-dropdown')) {
        setShowChatHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatHistory]);

  const handleCopyMessage = (msgId, content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMsgId(msgId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMsgId(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: 1,
          type: 'bot',
          content: 'Theta Project Advisor is ready. Select an analysis module from the left panel to run an instant analysis, or type a custom query below.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages(newChat.messages);
    setInputMessage('');
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setInputMessage('');
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();

    if (chatHistory.length === 1) {
      toast.error('Cannot delete the last chat');
      return;
    }

    setChatHistory(prev => {
      const newHistory = prev.filter(c => c.id !== chatId);

      // If deleting current chat, switch to first available chat
      if (currentChatId === chatId && newHistory.length > 0) {
        setCurrentChatId(newHistory[0].id);
        setMessages(newHistory[0].messages || []);
      }

      return newHistory;
    });

    toast.success('Chat deleted');
  };

  const handleSendMessage = async (overrideMessage = null) => {
    if (isTyping) return;
    const rawMessage =
      typeof overrideMessage === 'string'
        ? overrideMessage
        : overrideMessage == null
          ? inputMessage
          : inputMessage;
    const messageToSend = String(rawMessage).trim();
    if (!messageToSend) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Update chat title based on first user message
    if (messages.length === 1) {
      const title = messageToSend.slice(0, 50) + (messageToSend.length > 50 ? '...' : '');
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === currentChatId ? { ...chat, title } : chat
        )
      );
    }

    const currentMessage = messageToSend;
    setInputMessage('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const conversationHistory = buildConversationHistory(messages);

      const response = await axios.post(
        '/api/chat',
        {
          message: currentMessage,
          date_range: dateRange,
          history: conversationHistory
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const botResponse = {
        id: Date.now(),
        type: 'bot',
        content: response.data.message,
        suggestions: response.data.suggestions || [],
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage = {
        id: Date.now(),
        type: 'bot',
        content: error.response?.data?.message ||
          'I apologize, but I encountered an error. Please make sure the backend server is running and try again.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleShareToOutlook = (botContent, botMsgId) => {
    const idx = messages.findIndex((m) => m.id === botMsgId);
    let question = "";
    if (idx > 0) {
      for (let j = idx - 1; j >= 0; j--) {
        if (messages[j].type === "user") {
          question = messages[j].content;
          break;
        }
      }
    }

    const lines = botContent.split("\n");
    const fillerStart = /^(based on|here is|here's|sure|certainly|i'd be|let me|of course|absolutely)/i;
    const fillerEnd = /^(please let me know|let me know|feel free|if you|would you like|i hope|is there anything)/i;
    let start = 0;
    while (start < lines.length && (fillerStart.test(lines[start].trim()) || !lines[start].trim())) start++;
    let end = lines.length - 1;
    while (end > start && (fillerEnd.test(lines[end].trim()) || !lines[end].trim())) end--;
    const cleanedBody = lines.slice(start, end + 1).join("\n").trim() || botContent;

    const emailSubject = encodeURIComponent("Theta Project Advisor Insight");
    const emailBody = encodeURIComponent(
      (question ? `Question: ${question}\n\n` : "") + cleanedBody
    );

    window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`, "_blank");
  };

  const handleShareToEngage = async (botContent, botMsgId, customQuestion = '') => {
    // Find the user question that preceded this bot response
    const idx = messages.findIndex(m => m.id === botMsgId);
    let question = customQuestion;
    if (!question && idx > 0) {
      for (let j = idx - 1; j >= 0; j--) {
        if (messages[j].type === 'user') { question = messages[j].content; break; }
      }
    }

    // Strip AI filler lines from start and end
    const lines = botContent.split('\n');
    const fillerStart = /^(based on|here is|here's|sure|certainly|i'd be|let me|of course|absolutely)/i;
    const fillerEnd = /^(please let me know|let me know|feel free|if you|would you like|i hope|is there anything)/i;
    let start = 0;
    while (start < lines.length && (fillerStart.test(lines[start].trim()) || !lines[start].trim())) start++;
    let end = lines.length - 1;
    while (end > start && (fillerEnd.test(lines[end].trim()) || !lines[end].trim())) end--;
    const cleanedBody = lines.slice(start, end + 1).join('\n').trim() || botContent;

    const postContent = question
      ? `**Q:** ${question}\n\n${cleanedBody}`
      : cleanedBody;

    try {
      await engageService.createPost(postContent, 'ai_chat');
      toast.success('Shared to Theta Engage!');
      setSharedMsgId(botMsgId);
      setTimeout(() => setSharedMsgId(null), 2000);
    } catch (err) {
      toast.error('Failed to share to Theta Engage');
    }
  };

  // Summary module – lives in the header, auto-emails the result
  const summaryModule = {
    label: 'Summary',
    desc: 'Complete project data snapshot',
    icon: FileText,
    color: 'blue',
    prompt: (dr) => {
      let start = dr.start;
      let end = dr.end;
      if (!start || !end) {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        start = lastMonth.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
      }
      return `Give me the complete project output summary and chat in detail summary between ${start} and ${end}`;
    },
  };

  const handleSummaryAction = async () => {
    if (isTyping) return;
    const message = summaryModule.prompt(dateRange);
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', content: message, timestamp: new Date().toISOString() },
    ]);
    setIsTyping(true);
    
    try {
      const token = localStorage.getItem('token');
      const conversationHistory = buildConversationHistory(messages);
      const response = await axios.post(
        '/api/chat',
        { message, date_range: dateRange, history: conversationHistory },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const botContent = response.data.message;
      const botMsgId = Date.now();
      setMessages(prev => [...prev, {
        id: botMsgId,
        type: 'bot',
        content: botContent,
        module: 'Summary',
        timestamp: new Date().toISOString(),
      }]);
      
      // Automatically share to Theta Engage
      await handleShareToEngage(botContent, botMsgId, message);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: err.response?.data?.message || 'Analysis failed. Please ensure the backend is running.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const analysisModules = [
    {
      label: 'Critical Activities',
      desc: 'Identify schedule-critical tasks',
      icon: Zap,
      color: 'red',
      prompt: (dr) => dr.start && dr.end ? `Show all critical activities between ${dr.start} and ${dr.end}` : 'Show all critical activities',
    },
    {
      label: 'Predecessor Activities',
      desc: 'Upstream dependency mapping',
      icon: GitBranch,
      color: 'purple',
      prompt: (dr) => dr.start && dr.end ? `List all predecessor activities and dependencies between ${dr.start} and ${dr.end}` : 'List all predecessor activities and dependencies',
    },
    {
      label: 'Successor Activities',
      desc: 'Downstream impact analysis',
      icon: GitMerge,
      color: 'teal',
      prompt: (dr) => dr.start && dr.end ? `List all successor activities and dependencies between ${dr.start} and ${dr.end}` : 'List all successor activities and dependencies',
    },
    {
      label: 'Delay Detection',
      desc: 'Overdue & at-risk activities',
      icon: AlertCircle,
      color: 'orange',
      prompt: (dr) => dr.start && dr.end ? `Show all delayed activities between ${dr.start} and ${dr.end}` : 'Show all delayed activities',
    },
    {
      label: 'Critical Path',
      desc: 'End-to-end schedule chain',
      icon: Activity,
      color: 'green',
      prompt: (dr) => dr.start && dr.end ? `Analyze the critical path between ${dr.start} and ${dr.end}` : 'Analyze the critical path',
    },
    {
      label: 'Project Summary',
      desc: 'KPI overview & progress metrics',
      icon: CheckCircle,
      color: 'emerald',
      prompt: (dr) => dr.start && dr.end ? `Provide a full project summary for the period ${dr.start} to ${dr.end}` : 'Provide a full project summary',
    },
  //   {
  //     label: 'Risk Analysis',
  //     desc: 'Risk scoring & mitigation flags',
  //     icon: BarChart2,
  //     color: 'yellow',
  //     prompt: (dr) => dr.start && dr.end ? `Identify and analyze project risks between ${dr.start} and ${dr.end}` : 'Identify and analyze project risks',
  //   },
  // ];
  {
      label: 'Risk Analysis',
      desc: 'Risk scoring & mitigation flags',
      icon: BarChart2,
      color: 'yellow',
      prompt: (dr) => dr.start && dr.end ? `Identify and analyze project risks between ${dr.start} and ${dr.end}` : 'Identify and analyze project risks',
    },
    {
      label: 'What-If Analysis',
      desc: 'CP delays, threats & recovery',
      icon: TrendingDown,
      color: 'red',
      prompt: (dr) => dr.start && dr.end
        ? `Summarize the What-If analysis between ${dr.start} and ${dr.end}: list the top delayed critical path activities, their delay in days, CP issue types, recovery notes, and any KPIs such as total activities, average delay, and max delay.`
        : 'Summarize the What-If analysis: list the top delayed critical path activities, their delay in days, CP issue types, recovery notes, and KPIs such as total activities, average delay, and max delay.',
    },
  ];

  const handleQuickAction = (action) => {
    if (isTyping) return;
    const message = action.prompt(dateRange);
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', content: message, timestamp: new Date().toISOString() },
    ]);
    setIsTyping(true);
    // send immediately
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const conversationHistory = buildConversationHistory(messages);
        const response = await axios.post(
          '/api/chat',
          { message, date_range: dateRange, history: conversationHistory, suggestion: action.label },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: response.data.message,
          module: action.label,
          timestamp: new Date().toISOString(),
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: err.response?.data?.message || 'Analysis failed. Please ensure the backend is running.',
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatChatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      />

      {/* Main Sidebar */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* Main AI Workspace */}
      <div className="chat-main">
        <div className="ai-workspace">

          {/* ── Top Bar ── */}
          <div className="ai-topbar">
            <div className="ai-topbar-left">
              <div className="ai-topbar-icon">
                <BrainCircuit size={20} />
              </div>
              <div>
                <div className="ai-topbar-title">Theta Project Advisor</div>
                <div className="ai-topbar-sub">
                  <span className="ai-status-dot" />
                  Engine active · Azure AI Foundry
                </div>
              </div>
            </div>
            <div className="ai-topbar-right">
              {/* Session History */}
              <div className="chat-history-dropdown">
                <button
                  className="ai-session-btn"
                  onClick={() => setShowChatHistory(!showChatHistory)}
                >
                  <History size={15} />
                  <span>Sessions ({chatHistory.length})</span>
                  <ChevronDown size={13} className={showChatHistory ? 'rotated' : ''} />
                </button>
                {showChatHistory && (
                  <div className="history-dropdown-menu">
                    <div className="history-dropdown-header"><span>Recent Sessions</span></div>
                    <div className="chat-list">
                      {chatHistory.map(chat => (
                        <div
                          key={chat.id}
                          className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                          onClick={() => { loadChat(chat.id); setShowChatHistory(false); }}
                        >
                          <div className="chat-item-content">
                            <div className="chat-item-title">{chat.title}</div>
                            <div className="chat-item-date">{formatChatDate(chat.updatedAt)}</div>
                          </div>
                          <button className="delete-chat-btn" onClick={(e) => deleteChat(chat.id, e)}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Summary Button - Viva Engage Only */}
              <button
                className="ai-summary-btn"
                onClick={handleSummaryAction}
                disabled={isTyping}
                title="Generate project summary"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isTyping ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: isTyping ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <FileText size={15} />
                <span>Summary</span>
              </button>
              
              <button className="ai-new-session-btn" onClick={createNewChat}>
                <Plus size={15} />
                New Session
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="ai-body">

            {/* LEFT: Controls panel */}
            <div className="ai-left-panel">

              {/* Date Range */}
              <div className="ai-section">
                <div className="ai-section-label">
                  <Calendar size={13} />
                  Analysis Period
                </div>
                <div className="ai-date-block">
                  <div className="ai-date-row">
                    <div className="ai-date-field">
                      <label>From</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="ai-date-input"
                      />
                    </div>
                    <div className="ai-date-sep">→</div>
                    <div className="ai-date-field">
                      <label>To</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="ai-date-input"
                      />
                    </div>
                  </div>
                  <div className="ai-presets">
                    {[['7D', 7], ['30D', 30], ['90D', 90]].map(([l, d]) => (
                      <button key={l} className="ai-preset" onClick={() => setDateRange({ start: new Date(Date.now() - d * 86400000).toISOString().split('T')[0], end: today })}>{l}</button>
                    ))}
                    <button className="ai-preset" onClick={() => setDateRange({ start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], end: today })}>YTD</button>
                  </div>
                </div>
              </div>

              {/* Analysis Modules */}
              <div className="ai-section ai-modules-section">
                <div className="ai-section-label">
                  <FlaskConical size={13} />
                  Analysis Modules
                </div>
                <div className="ai-modules-grid">
                  {analysisModules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                      <button
                        key={idx}
                        className={`ai-module-card color-${mod.color}`}
                        onClick={() => handleQuickAction(mod)}
                      >
                        <div className={`ai-module-icon color-${mod.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="ai-module-text">
                          <span className="ai-module-title">{mod.label}</span>
                          <span className="ai-module-desc">{mod.desc}</span>
                        </div>
                        <ChevronRight size={14} className="ai-module-arrow" />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT: Analysis Console */}
            <div className="ai-right-panel">
              <div className="ai-console-header">
                <Terminal size={14} />
                <span>Analysis Console</span>
                <span className="ai-console-period">{dateRange.start} → {dateRange.end}</span>
              </div>

              <div className="ai-console-messages">
                {messages.length === 0 ? (
                  <div className="ai-empty-state">
                    <BrainCircuit size={40} className="ai-empty-icon" />
                    <p className="ai-empty-title">Ready for Analysis</p>
                    <p className="ai-empty-sub">Select an analysis module on the left, or type a custom query below.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`ai-message ${message.type}`}>
                      {message.type === 'bot' ? (
                        <div className="ai-msg-avatar bot">
                          <Sparkles size={13} />
                        </div>
                      ) : (
                        <div className="ai-msg-avatar user">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ai-msg-body">
                        {message.module && (
                          <div className="ai-msg-module-tag">{message.module}</div>
                        )}
                        <div className={`ai-msg-bubble ${message.type}`}>
                          {message.type === 'bot'
                            ? renderMarkdown(message.content)
                            : message.content}
                        </div>
                        {message.type === 'bot' && Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                          <div className="ai-msg-suggestions">
                            {message.suggestions.slice(0, 3).map((suggestion, idx) => (
                              <button
                                key={`${message.id}-sg-${idx}`}
                                className="ai-suggestion-chip"
                                onClick={() => handleSendMessage(suggestion)}
                                disabled={isTyping}
                                title={suggestion}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="ai-msg-footer">
                          <span className="ai-msg-time">
                            <Clock size={10} />
                            {formatTimestamp(message.timestamp)}
                          </span>
                          {message.type === 'bot' && (
                            <>
                              <button
                                className={`ai-copy-btn ${copiedMsgId === message.id ? 'copied' : ''}`}
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                title="Copy message"
                              >
                                {copiedMsgId === message.id ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedMsgId === message.id ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button
                                className="ai-copy-btn"
                                onClick={() => handleShareToOutlook(message.content, message.id)}
                                title="Share to Outlook"
                              >
                                <Mail size={12} />
                                <span>Email</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="ai-message bot">
                    <div className="ai-msg-avatar bot"><Sparkles size={13} /></div>
                    <div className="ai-msg-body">
                      <div className="ai-msg-bubble bot typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="ai-console-input">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a custom query or follow-up question..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
                />
                <button className="ai-send-btn" onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isTyping}>
                  <Send size={16} />
                </button>
              </div>
            </div>

          </div>{/* end ai-body */}
        </div>{/* end ai-workspace */}
      </div>
    </div>
  );
};

export default Chat;