import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Calendar,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Activity,
  GitBranch,
  GitMerge,
  BarChart2,
  List,
  Zap,
} from 'lucide-react';
import './ChatBot.css';

// ── Markdown renderer ────────────────────────────────────────────────────────
const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let kc = 0;
  const key = () => kc++;

  const parseInline = (str) => {
    const parts = [];
    const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let last = 0, m;
    while ((m = pattern.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[2]) parts.push(<strong key={key()}><em>{m[2]}</em></strong>);
      else if (m[3]) parts.push(<strong key={key()}>{m[3]}</strong>);
      else if (m[4]) parts.push(<em key={key()}>{m[4]}</em>);
      else if (m[5]) parts.push(<code key={key()} className="md-inline-code">{m[5]}</code>);
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
  };

  const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^---+$/.test(trimmed)) { elements.push(<hr key={key()} className="md-hr" />); i++; continue; }

    const hMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (hMatch) {
      const Tag = `h${Math.min(hMatch[1].length + 2, 6)}`;
      elements.push(<Tag key={key()} className={`md-h md-h${hMatch[1].length}`}>{parseInline(hMatch[2])}</Tag>);
      i++; continue;
    }

    if (trimmed.startsWith('> ')) { elements.push(<blockquote key={key()} className="md-blockquote">{parseInline(trimmed.slice(2))}</blockquote>); i++; continue; }

    if (isTableRow(trimmed)) {
      const tableRows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) { tableRows.push(lines[i]); i++; }
      const headerCells = tableRows[0].trim().slice(1,-1).split('|').map(c=>c.trim());
      const dataRows = tableRows.slice(2);
      elements.push(
        <div key={key()} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{headerCells.map((c,ci)=><th key={ci}>{parseInline(c)}</th>)}</tr></thead>
            <tbody>{dataRows.map((row,ri)=><tr key={ri}>{row.trim().slice(1,-1).split('|').map((c,ci)=><td key={ci}>{parseInline(c.trim())}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*+]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) { items.push(<li key={key()}>{parseInline(lines[i].trim().replace(/^[-*+]\s/,''))}</li>); i++; }
      elements.push(<ul key={key()} className="md-ul">{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(<li key={key()}>{parseInline(lines[i].trim().replace(/^\d+\.\s/,''))}</li>); i++; }
      elements.push(<ol key={key()} className="md-ol">{items}</ol>);
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
      elements.push(<pre key={key()} className="md-pre"><code>{codeLines.join('\n')}</code></pre>);
      i++; continue;
    }

    if (!trimmed) { elements.push(<div key={key()} className="md-spacer" />); i++; continue; }

    elements.push(<p key={key()} className="md-p">{parseInline(trimmed)}</p>);
    i++;
  }
  return elements;
};
// ────────────────────────────────────────────────────────────────────────────

const ChatBot = ({ onClose = null, isEmbedded = false }) => {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your Pulse Planning Assistant. Select a date range and use Quick Actions to analyze your project data instantly.',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ start: oneMonthAgo, end: today });
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    if (!isEmbedded) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setIsMinimized(false);
      }
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendMessage = async () => {
    if (isTyping) return;
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Call backend AI endpoint
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
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now(),
        type: 'bot',
        content: error.response?.data?.message || 
          'I apologize, but I encountered an error. Please make sure the backend server is running and try again.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: 'Critical Activity', icon: Zap, color: 'red', prompt: (dr) => `Show all critical activities between ${dr.start} and ${dr.end}` },
    { label: 'Whole Output', icon: List, color: 'blue', prompt: (dr) => `Give me the complete project output summary between ${dr.start} and ${dr.end}` },
    { label: 'Predecessor Activities', icon: GitBranch, color: 'purple', prompt: (dr) => `List all predecessor activities between ${dr.start} and ${dr.end}` },
    { label: 'Successor Activities', icon: GitMerge, color: 'teal', prompt: (dr) => `List all successor activities between ${dr.start} and ${dr.end}` },
    { label: 'Show Delays', icon: AlertCircle, color: 'orange', prompt: (dr) => `Show all delayed activities between ${dr.start} and ${dr.end}` },
    { label: 'Critical Path', icon: Activity, color: 'green', prompt: (dr) => `Analyze the critical path between ${dr.start} and ${dr.end}` },
    { label: 'Project Summary', icon: CheckCircle, color: 'green', prompt: (dr) => `Provide a full project summary for the period ${dr.start} to ${dr.end}` },
    { label: 'Risk Analysis', icon: BarChart2, color: 'yellow', prompt: (dr) => `Identify and analyze project risks between ${dr.start} and ${dr.end}` },
  ];

  const handleQuickAction = (action) => {
    setInputMessage(action.prompt(dateRange));
    inputRef.current?.focus();
  };

  const formatTimestamp = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen && !isEmbedded) {
    return (
      <button className="chat-fab" onClick={toggleChat}>
        <MessageCircle size={24} />
        <span className="chat-badge">AI</span>
      </button>
    );
  }

  return (
    <div className={`chatbot-container ${isEmbedded ? 'embedded' : 'floating'} ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="header-info">
          <div className="bot-avatar">
            <Sparkles size={18} />
          </div>
          <div>
            <h3>Pulse Assistant</h3>
            <span className="status-indicator">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <div className="header-actions">
          {!isEmbedded && (
            <>
              <button onClick={toggleMinimize} className="header-btn" title={isMinimized ? 'Maximize' : 'Minimize'}>
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <button onClick={onClose || toggleChat} className="header-btn" title="Close">
                <X size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Date Range Selector */}
          <div className="cb-date-range">
            <div className="cb-date-range-header">
              <Calendar size={13} />
              <span>Analysis Period</span>
            </div>
            <div className="cb-date-range-inputs">
              <div className="cb-date-group">
                <label>From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="cb-date-input"
                />
              </div>
              <span className="cb-date-sep">→</span>
              <div className="cb-date-group">
                <label>To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="cb-date-input"
                />
              </div>
            </div>
            <div className="cb-presets">
              {[['7D', 7], ['30D', 30], ['90D', 90]].map(([label, days]) => (
                <button
                  key={label}
                  className="cb-preset-btn"
                  onClick={() => setDateRange({ start: new Date(Date.now() - days*24*60*60*1000).toISOString().split('T')[0], end: today })}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                {message.type === 'bot' && (
                  <div className="message-avatar">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    {message.type === 'bot'
                      ? renderMarkdown(message.content)
                      : message.content}
                  </div>
                  <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="message-content">
                  <div className="message-bubble typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="cb-quick-panel">
            <div className="cb-quick-label"><Sparkles size={11} /> Quick Actions</div>
            <div className="quick-actions">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    className={`quick-action-btn color-${action.color}`}
                    onClick={() => handleQuickAction(action)}
                    title={action.prompt(dateRange)}
                  >
                    <Icon size={12} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="chatbot-input">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask me anything about your project data..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
            />
            <button 
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;
