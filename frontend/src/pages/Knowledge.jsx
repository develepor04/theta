import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import toast from "react-hot-toast";
import {
  BookOpen,
  Menu,
  X,
  RefreshCw,
  Activity,
  Users,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Eye,
  Upload,
  LogIn,
  LogOut,
  FileText,
  Settings,
  Bell,
  Trash2,
  BarChart2,
  Filter,
  Search,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Bot,
  User as UserIcon,
  BrainCircuit,
} from "lucide-react";
import useStore from "../store/useStore";
import { activityService } from "../services/api";
import SCurveAnalytics from "../components/SCurveAnalytics";
import Sidebar from "../components/Sidebar";
import {
  ALGORITHMS,
  AI_BEHAVIOR_RULES,
  DEPENDENCY_DEFINITIONS,
  DEVIATION_WORKFLOW,
  PULSE_CONCEPTS,
  buildAILearningContext,
  formatKBForDisplay,
} from "../services/aiKnowledgeBase";
import "./Knowledge.css";

// ─── helpers ───────────────────────────────────────────────────────────────

const ACTION_META = {
  login: { label: "Login", color: "green", Icon: LogIn },
  logout: { label: "Logout", color: "gray", Icon: LogOut },
  file_upload: { label: "File Upload", color: "blue", Icon: Upload },
  file_processed: { label: "File Processed", color: "teal", Icon: FileText },
  deviation_view: { label: "Deviation View", color: "yellow", Icon: Eye },
  deviation_approve: { label: "Approved", color: "green", Icon: CheckCircle2 },
  deviation_reject: { label: "Rejected", color: "red", Icon: XCircle },
  deviation_comment: { label: "Comment", color: "purple", Icon: MessageSquare },
  notification_view: { label: "Notif. View", color: "gray", Icon: Bell },
  notification_read: { label: "Notif. Read", color: "gray", Icon: Bell },
  settings_update: { label: "Settings", color: "orange", Icon: Settings },
  password_change: { label: "Pwd Change", color: "orange", Icon: Settings },
  user_created: { label: "User Created", color: "blue", Icon: Users },
  user_updated: { label: "User Updated", color: "blue", Icon: Users },
  ai_chat: { label: "AI Chat", color: "purple", Icon: BrainCircuit },
  history_view: { label: "History View", color: "gray", Icon: Eye },
  history_delete: { label: "History Delete", color: "red", Icon: Trash2 },
  knowledge_base_view: { label: "KB View", color: "teal", Icon: BookOpen },
  report_bug: { label: "Bug Report", color: "red", Icon: AlertTriangle },
};

const getActionMeta = (action_type) =>
  ACTION_META[action_type] || {
    label: action_type?.replace(/_/g, " ") || "—",
    color: "gray",
    Icon: Activity,
  };

const fmtTs = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, "0");
  const mm    = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year}, ${hh}:${mm}`;
};

const toTitleCase = (str) => {
  if (!str) return str;
  const dotIdx = str.lastIndexOf(".");
  const hasExt = dotIdx > 0;
  const ext  = hasExt ? str.slice(dotIdx) : "";
  const name = hasExt ? str.slice(0, dotIdx) : str;
  return name.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) + ext;
};

// New KB structure with 7 main sections
const TABS = [
  "Output Process File",
  "Mobile Application",
  "AI Chat Response",
  "Activity Dependencies",
  // 'List of Deviations',
  "Analytics",
  "Activity Feed",
];

const DEVIATION_ACTIONS = [
  "deviation_approve",
  "deviation_reject",
  "deviation_comment",
  "deviation_view",
];

// Dependencies sub-tabs
const DEPENDENCY_TABS = [
  "Successor Activities",
  "Predecessor Activities",
  "Critical Path Activities",
  "AI Module",
];

// Deviations sub-tabs
const DEVIATION_SUB_TABS = [
  "Approved",
  "Rejected",
  "Approved After Recursive Process",
];

// Analytics sub-tabs
const ANALYTICS_SUB_TABS = ["S-Curve Output", "Existing Analytics"];

// Only the 5 meaningful labels — no login/logout/tab-view noise
const LABEL_ACTIONS = [
  "file_processed",
  "deviation_approve",
  "deviation_reject",
  "deviation_comment",
  "ai_chat",
];

// ─── component ─────────────────────────────────────────────────────────────

const Knowledge = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const knowledgeRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kbData, setKbData] = useState(null);
  const [activeTab, setActiveTab] = useState("Output Process File");

  const [searchQ, setSearchQ] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedLabel, setSelectedLabel] = useState("file_processed");

  // Sub-tab states
  const [activeDependencyTab, setActiveDependencyTab] = useState(
    "Successor Activities",
  );
  const [activeDeviationSubTab, setActiveDeviationSubTab] =
    useState("Approved");
  const [activeAnalyticsSubTab, setActiveAnalyticsSubTab] =
    useState("S-Curve Output");
  const [selectedUserId, setSelectedUserId] = useState(null); // For AI Chat filtering by user

  // AI Learning data
  const [aiLearningData, setAiLearningData] = useState(null);
  const [aiLearningLoading, setAiLearningLoading] = useState(false);
  const [aiExpandedSection, setAiExpandedSection] = useState("algorithms");

  // S-Curve archive & modal
  const [scurveArchive, setScurveArchive] = useState([]);
  const [scurveLoading, setScurveLoading] = useState(false);
  const [showSCurve, setShowSCurve] = useState(false);
  const [sCurveJob, setSCurveJob] = useState(null);
  const [recursiveDevs, setRecursiveDevs] = useState([]);
  const [recursiveLoading, setRecursiveLoading] = useState(false);
  const [recursiveExpanded, setRecursiveExpanded] = useState(new Set());

  // No access restriction — all logged-in users can view the Knowledge Base

  const loadData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const data = await activityService.getKnowledgeBase(500);
      setKbData(data);
      if (showToast) toast.success("Activity log refreshed");
    } catch (err) {
      toast.error("Failed to load activity data");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadScurveArchive = useCallback(async () => {
    if (scurveArchive.length > 0) return; // already loaded
    try {
      setScurveLoading(true);
      const data = await activityService.getScurveArchive();
      setScurveArchive(data.archive || []);
    } catch (err) {
      console.error("Failed to load S-Curve archive:", err);
    } finally {
      setScurveLoading(false);
    }
  }, [scurveArchive.length]);

  const loadRecursiveDeviations = useCallback(async () => {
    if (recursiveDevs.length > 0) return; // already loaded
    try {
      setRecursiveLoading(true);
      const data = await activityService.getRecursiveDeviations();
      setRecursiveDevs(data.recursive_deviations || []);
    } catch (err) {
      console.error("Failed to load recursive deviations:", err);
    } finally {
      setRecursiveLoading(false);
    }
  }, [recursiveDevs.length]);

  const loadAILearningData = useCallback(async () => {
    if (aiLearningData) return;
    try {
      setAiLearningLoading(true);
      const data = await activityService.getAILearningData();
      setAiLearningData(data);
    } catch (err) {
      console.error("Failed to load AI learning data:", err);
    } finally {
      setAiLearningLoading(false);
    }
  }, [aiLearningData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lazy-load AI learning data when AI Module tab is active
  useEffect(() => {
    if (
      activeTab === "Activity Dependencies" &&
      activeDependencyTab === "AI Module"
    ) {
      loadAILearningData();
    }
  }, [activeTab, activeDependencyTab, loadAILearningData]);

  // Lazy-load S-Curve archive when Analytics tab is active
  useEffect(() => {
    if (
      activeTab === "Analytics" &&
      activeAnalyticsSubTab === "S-Curve Output"
    ) {
      loadScurveArchive();
    }
  }, [activeTab, activeAnalyticsSubTab, loadScurveArchive]);

  // Lazy-load recursive deviations when that sub-tab is active
  useEffect(() => {
    if (
      activeTab === "List of Deviations" &&
      activeDeviationSubTab === "Approved After Recursive Process"
    ) {
      loadRecursiveDeviations();
    }
  }, [activeTab, activeDeviationSubTab, loadRecursiveDeviations]);

  useEffect(() => {
    if (!loading && kbData) {
      const ctx = gsap.context(() => {
        gsap.from(".kb-stat-card", {
          y: 16,
          opacity: 0,
          duration: 0.35,
          stagger: 0.07,
          ease: "power2.out",
        });
        gsap.from(".kb-tab-panel", {
          y: 10,
          opacity: 0,
          duration: 0.3,
          delay: 0.25,
          ease: "power2.out",
        });
      });
      return () => ctx.revert();
    }
  }, [loading, kbData]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSCurve = (jobId, filename) => {
    setSCurveJob({ id: jobId, filename });
    setShowSCurve(true);
  };

  const closeSCurve = () => {
    setShowSCurve(false);
    setSCurveJob(null);
  };

  const toggleRecursiveExpanded = (id) => {
    setRecursiveExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const activities = kbData?.recent_activities || [];
  const stats = kbData?.stats || {};
  const activeUsers = kbData?.active_users || [];

  const filteredActivities = activities.filter((a) => {
    if (filterSource !== "all" && a.source !== filterSource) return false;
    if (filterAction !== "all" && a.action_type !== filterAction) return false;
    if (filterDateFrom && a.timestamp < filterDateFrom) return false;
    if (filterDateTo && a.timestamp > filterDateTo + "T23:59:59") return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return (
        a.user_name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.action_type?.toLowerCase().includes(q) ||
        JSON.stringify(a.metadata || {})
          .toLowerCase()
          .includes(q)
      );
    }
    return true;
  });

  const deviationActivities = filteredActivities.filter((a) =>
    DEVIATION_ACTIONS.includes(a.action_type),
  );
  const allActionTypes = [
    ...new Set(activities.map((a) => a.action_type)),
  ].sort();
  const dailyData = stats.daily_last_7d || [];
  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="knowledge-page" ref={knowledgeRef}>
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* Main Content */}
      <div className="main-content">
        <div className="kb-container">
          {/* ── Page Header ── */}
          <div className="kb-page-header">
            <div className="kb-page-header-left">
              <BookOpen size={28} className="kb-header-icon" />
              <div>
                <h1>Knowledge Base</h1>
                <p>
                  Process documentation · Deviations · AI interactions ·
                  Activity tracking
                </p>
              </div>
            </div>
            <div className="kb-page-header-right">
              {kbData?.generated_at && (
                <span className="kb-last-updated">
                  <Clock size={13} /> {fmtTs(kbData.generated_at)}
                </span>
              )}
              <button
                className="kb-refresh-btn"
                onClick={() => loadData(true)}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? "spin" : ""} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="kb-loading">
              <RefreshCw size={36} className="spin" />
              <p>Loading activity data…</p>
            </div>
          ) : (
            <>
              {/* ── Tabs ── */}
              <div className="kb-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`kb-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "Output Process File" && <FileText size={15} />}
                    {tab === "Mobile Application" && <Smartphone size={15} />}
                    {tab === "AI Chat Response" && <BrainCircuit size={15} />}
                    {tab === "Activity Dependencies" && <Tag size={15} />}
                    {tab === "List of Deviations" && <CheckCircle2 size={15} />}
                    {tab === "Analytics" && <BarChart2 size={15} />}
                    {tab === "Activity Feed" && <Activity size={15} />}
                    {tab}
                    {tab === "AI Chat Response" && (
                      <span className="kb-tab-count">
                        {
                          activities.filter((a) => a.action_type === "ai_chat")
                            .length
                        }
                      </span>
                    )}
                    {tab === "List of Deviations" && (
                      <span className="kb-tab-count">
                        {deviationActivities.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Filter Bar ── */}
              {(activeTab === "Activity Feed" ||
                activeTab === "Mobile Application" ||
                activeTab === "List of Deviations") && (
                <div className="kb-filter-bar">
                  <div className="kb-filter-search">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search user, description, action…"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                    {searchQ && (
                      <button onClick={() => setSearchQ("")}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="kb-filter-group">
                    <Filter size={14} />
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value)}
                    >
                      <option value="all">All Sources</option>
                      <option value="web">Web App</option>
                      <option value="mobile">Mobile App</option>
                    </select>
                  </div>
                  {activeTab === "Activity Feed" && (
                    <div className="kb-filter-group">
                      <Activity size={14} />
                      <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                      >
                        <option value="all">All Actions</option>
                        {allActionTypes.map((a) => (
                          <option key={a} value={a}>
                            {getActionMeta(a).label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="kb-filter-group">
                    <Calendar size={14} />
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                    <span className="kb-date-sep">→</span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>
                  {(filterSource !== "all" ||
                    filterAction !== "all" ||
                    filterDateFrom ||
                    filterDateTo ||
                    searchQ) && (
                    <button
                      className="kb-clear-filters"
                      onClick={() => {
                        setFilterSource("all");
                        setFilterAction("all");
                        setFilterDateFrom("");
                        setFilterDateTo("");
                        setSearchQ("");
                      }}
                    >
                      <X size={13} /> Clear
                    </button>
                  )}
                </div>
              )}

              {/* ══ Tab Panels ══ */}
              <div className="kb-tab-panel">
                {/* ── 1. OUTPUT PROCESS FILE ── */}
                {activeTab === "Output Process File" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <FileText size={20} />
                      <h2>Output Process File Documentation</h2>
                      <p>
                        Understanding how Excel files are processed and output
                        files are generated
                      </p>
                    </div>
                    <div className="kb-info-card">
                      <h3>File Processing Workflow</h3>
                      <ol className="kb-process-steps">
                        <li>
                          <strong>Upload Excel File:</strong> Users upload
                          project data in Excel format through the dashboard
                        </li>
                        <li>
                          <strong>Validation:</strong> System validates file
                          structure, sheet names, and required columns
                        </li>
                        <li>
                          <strong>Algorithm Processing:</strong> 13 specialized
                          algorithms analyze the data:
                          <ul>
                            <li>EDDR Timeline Analysis</li>
                            <li>Project Management Tracker</li>
                            <li>Weekly EDDR Continuation</li>
                            <li>HO Subcontract Tracker</li>
                            <li>HO Procurements</li>
                            <li>Manufacturing Progress</li>
                            <li>Commissioning RFSU</li>
                            <li>Construction & Pre-commissioning</li>
                            <li>EDDR Contractor Analytics</li>
                            <li>Overall S-Curve Analysis</li>
                            <li>PM S-Curve Generation</li>
                            <li>BL Overall Progress (Level 2)</li>
                            <li>Revised BL Overall Progress</li>
                          </ul>
                        </li>
                        <li>
                          <strong>Output Generation:</strong> Processed data is
                          exported to a new Excel file with analysis results
                        </li>
                        <li>
                          <strong>Deviation Detection:</strong> System
                          identifies deviations from baseline and flags them for
                          review
                        </li>
                      </ol>
                    </div>

                    <div className="kb-info-card">
                      <h3>Recent Output Files</h3>
                      <div className="kb-file-list">
                        {activities
                          .filter((a) => a.action_type === "file_processed")
                          .slice(0, 10)
                          .map((a, i) => (
                            <div key={a.id || i} className="kb-file-item">
                              <FileText size={16} />
                              <div className="kb-file-info">
                                <div className="kb-file-name" style={{ fontFamily: 'inherit', fontSize: 13 }}>
                                  {toTitleCase(a.metadata?.filename) || "Unknown File"}
                                </div>
                                <div className="kb-file-meta">
                                  {a.metadata?.success_count > 0 && (
                                    <span className="success-badge">
                                      {a.metadata.success_count} trackers
                                      processed
                                    </span>
                                  )}
                                  {a.metadata?.error_count > 0 && (
                                    <span className="error-badge">
                                      {a.metadata.error_count} errors
                                    </span>
                                  )}
                                  <span>
                                    Processed by {a.user_name || "Unknown"}
                                  </span>
                                  <span>{fmtTs(a.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        {activities.filter(
                          (a) => a.action_type === "file_processed",
                        ).length === 0 && (
                          <div className="kb-empty">
                            <FileText size={36} />
                            <p>No files processed yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 2. MOBILE APPLICATION ── */}
                {activeTab === "Mobile Application" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <Smartphone size={20} />
                      <h2>Mobile Application Activity</h2>
                      <p>
                        Track deviation notifications, manager responses, and
                        admin actions from mobile app
                      </p>
                    </div>

                    {/* Mobile deviation activities */}
                    <div className="kb-subtabs">
                      {DEVIATION_SUB_TABS.map((tab) => (
                        <button
                          key={tab}
                          className={`kb-subtab ${activeDeviationSubTab === tab ? "active" : ""}`}
                          onClick={() => setActiveDeviationSubTab(tab)}
                        >
                          {tab}
                          <span className="kb-subtab-count">
                            {tab === "Approved" &&
                              activities.filter(
                                (a) => a.action_type === "deviation_approve",
                              ).length}
                            {tab === "Rejected" &&
                              activities.filter(
                                (a) => a.action_type === "deviation_reject",
                              ).length}
                            {tab === "Approved After Recursive Process" &&
                              (recursiveDevs.length || "…")}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="kb-table-wrap">
                      {activeDeviationSubTab === "Approved" &&
                        (() => {
                          const approvedDeviations = filteredActivities.filter(
                            (a) =>
                              a.action_type === "deviation_approve" &&
                              !a.metadata?.recursive,
                          );
                          return approvedDeviations.length === 0 ? (
                            <div className="kb-empty">
                              <CheckCircle2 size={40} />
                              <p>No approved deviations</p>
                            </div>
                          ) : (
                            <table className="kb-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Timestamp</th>
                                  <th>Approved By</th>
                                  <th>Role</th>
                                  <th>Source</th>
                                  <th>Activity ID</th>
                                  <th>Activity Name</th>
                                  <th>Reason</th>
                                  <th>Gate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {approvedDeviations.map((a, idx) => (
                                  <tr
                                    key={a.id || idx}
                                    className="approved-row"
                                  >
                                    <td className="kb-td-num">{idx + 1}</td>
                                    <td className="kb-td-ts">
                                      {fmtTs(a.timestamp)}
                                    </td>
                                    <td>
                                      <div className="kb-user-cell">
                                        <div className="kb-mini-avatar">
                                          {(a.user_name || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        {a.user_name || "—"}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-role-badge role-${a.user_role}`}
                                      >
                                        {a.user_role || "—"}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-source-badge source-${a.source}`}
                                      >
                                        {a.source === "mobile" ? (
                                          <Smartphone size={12} />
                                        ) : (
                                          <Monitor size={12} />
                                        )}
                                        {a.source || "web"}
                                      </span>
                                    </td>
                                    <td className="kb-td-activity-id">
                                      {a.metadata?.deviation_id ||
                                        a.entity_id ||
                                        "—"}
                                    </td>
                                    <td className="kb-td-activity-name">
                                      {a.metadata?.activity_name || "—"}
                                    </td>
                                    <td className="kb-td-reason">
                                      {a.metadata?.reason ||
                                        a.metadata?.comment ||
                                        "—"}
                                    </td>
                                    <td>
                                      {a.metadata?.gate ? (
                                        <span className="kb-gate-badge">
                                          {a.metadata.gate}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}

                      {activeDeviationSubTab === "Rejected" &&
                        (() => {
                          const rejectedDeviations = filteredActivities.filter(
                            (a) => a.action_type === "deviation_reject",
                          );
                          return rejectedDeviations.length === 0 ? (
                            <div className="kb-empty">
                              <XCircle size={40} />
                              <p>No rejected deviations</p>
                            </div>
                          ) : (
                            <table className="kb-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Timestamp</th>
                                  <th>Rejected By</th>
                                  <th>Role</th>
                                  <th>Source</th>
                                  <th>Activity ID</th>
                                  <th>Activity Name</th>
                                  <th>Reason</th>
                                  <th>Gate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rejectedDeviations.map((a, idx) => (
                                  <tr
                                    key={a.id || idx}
                                    className="rejected-row"
                                  >
                                    <td className="kb-td-num">{idx + 1}</td>
                                    <td className="kb-td-ts">
                                      {fmtTs(a.timestamp)}
                                    </td>
                                    <td>
                                      <div className="kb-user-cell">
                                        <div className="kb-mini-avatar">
                                          {(a.user_name || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        {a.user_name || "—"}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-role-badge role-${a.user_role}`}
                                      >
                                        {a.user_role || "—"}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-source-badge source-${a.source}`}
                                      >
                                        {a.source === "mobile" ? (
                                          <Smartphone size={12} />
                                        ) : (
                                          <Monitor size={12} />
                                        )}
                                        {a.source || "web"}
                                      </span>
                                    </td>
                                    <td className="kb-td-activity-id">
                                      {a.metadata?.deviation_id ||
                                        a.entity_id ||
                                        "—"}
                                    </td>
                                    <td className="kb-td-activity-name">
                                      {a.metadata?.activity_name || "—"}
                                    </td>
                                    <td className="kb-td-reason">
                                      {a.metadata?.reason ||
                                        a.metadata?.comment ||
                                        "—"}
                                    </td>
                                    <td>
                                      {a.metadata?.gate ? (
                                        <span className="kb-gate-badge">
                                          {a.metadata.gate}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}

                      {activeDeviationSubTab ===
                        "Approved After Recursive Process" && (
                        <div className="kb-recursive-section">
                          {recursiveLoading ? (
                            <div className="kb-loading-sm">
                              <RefreshCw size={24} className="spin" />
                              <span>Loading recursive deviations…</span>
                            </div>
                          ) : recursiveDevs.length === 0 ? (
                            <div className="kb-empty">
                              <RefreshCw size={40} />
                              <p>No recursive approvals yet</p>
                              <p className="kb-empty-sub">
                                When a deviation is rejected by admin, manager
                                resubmits with a new reason, and this
                                back-and-forth leads to a final approval — it
                                will appear here.
                              </p>
                            </div>
                          ) : (
                            recursiveDevs.map((rd, rdIdx) => {
                              const rdKey = `recursive-${rd.deviation_id}`;
                              const isExpanded = recursiveExpanded.has(rdKey);
                              const dev = rd.deviation || {};
                              const rowData = dev.row_data || {};
                              const trail = rd.activity_trail || [];
                              return (
                                <div key={rdKey} className="kb-recursive-card">
                                  <div
                                    className="kb-recursive-card-header"
                                    onClick={() =>
                                      toggleRecursiveExpanded(rdKey)
                                    }
                                  >
                                    <div className="kb-recursive-card-info">
                                      <div className="kb-recursive-card-title">
                                        <span className="kb-recursive-id">
                                          #{rd.deviation_id}
                                        </span>
                                        <span className="kb-recursive-name">
                                          {rowData.activity_name ||
                                            dev.description ||
                                            "Deviation"}
                                        </span>
                                      </div>
                                      <div className="kb-recursive-card-stats">
                                        <span className="kb-recursive-stat reject">
                                          <XCircle size={12} />{" "}
                                          {rd.reject_count} Rejection
                                          {rd.reject_count > 1 ? "s" : ""}
                                        </span>
                                        <span className="kb-recursive-stat approve">
                                          <CheckCircle2 size={12} />{" "}
                                          {rd.approve_count} Approval
                                          {rd.approve_count > 1 ? "s" : ""}
                                        </span>
                                        {rd.comment_count > 0 && (
                                          <span className="kb-recursive-stat comment">
                                            <MessageSquare size={12} />{" "}
                                            {rd.comment_count} Comment
                                            {rd.comment_count > 1 ? "s" : ""}
                                          </span>
                                        )}
                                        <span className="kb-recursive-badge">
                                          {rd.iterations} iterations
                                        </span>
                                      </div>
                                    </div>
                                    <div className="kb-recursive-card-meta">
                                      <span className="kb-recursive-severity">
                                        {dev.severity || "—"}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="kb-recursive-trail">
                                      <div className="kb-recursive-dev-info">
                                        <div className="kb-recursive-dev-row">
                                          <strong>Sheet:</strong>{" "}
                                          {dev.sheet || "—"}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>File:</strong>{" "}
                                          {dev.filename || "—"}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>Detected:</strong>{" "}
                                          {fmtTs(dev.detected_at)}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>Current Status:</strong>{" "}
                                          <span
                                            className={`kb-recursive-status status-${(dev.review_status || "").toLowerCase().replace(/\s/g, "-")}`}
                                          >
                                            {dev.review_status || "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="kb-timeline">
                                        <div className="kb-timeline-title">
                                          <Clock size={14} /> Activity Timeline
                                        </div>
                                        {trail.map((step, si) => {
                                          const stepMeta = getActionMeta(
                                            step.action_type,
                                          );
                                          const StepIcon = stepMeta.Icon;
                                          const isReject =
                                            step.action_type ===
                                            "deviation_reject";
                                          const isApprove =
                                            step.action_type ===
                                            "deviation_approve";
                                          const reason =
                                            step.metadata?.reason ||
                                            step.metadata?.comment ||
                                            step.description ||
                                            "";
                                          return (
                                            <div
                                              key={si}
                                              className={`kb-timeline-item ${isReject ? "reject" : isApprove ? "approve" : "comment"}`}
                                            >
                                              <div className="kb-timeline-dot">
                                                <StepIcon size={14} />
                                              </div>
                                              <div className="kb-timeline-content">
                                                <div className="kb-timeline-header">
                                                  <span
                                                    className={`kb-action-badge action-${stepMeta.color}`}
                                                  >
                                                    <StepIcon size={11} />{" "}
                                                    {stepMeta.label}
                                                  </span>
                                                  <span className="kb-timeline-ts">
                                                    {fmtTs(step.timestamp)}
                                                  </span>
                                                </div>
                                                <div className="kb-timeline-actor">
                                                  <div className="kb-mini-avatar">
                                                    {(step.user_name || "?")
                                                      .charAt(0)
                                                      .toUpperCase()}
                                                  </div>
                                                  <span>
                                                    {step.user_name || "—"}
                                                  </span>
                                                  <span
                                                    className={`kb-role-badge role-${step.user_role}`}
                                                  >
                                                    {step.user_role || "—"}
                                                  </span>
                                                  <span
                                                    className={`kb-source-badge source-${step.source}`}
                                                  >
                                                    {step.source ===
                                                    "mobile" ? (
                                                      <Smartphone size={11} />
                                                    ) : (
                                                      <Monitor size={11} />
                                                    )}
                                                    {step.source || "web"}
                                                  </span>
                                                </div>
                                                {reason && (
                                                  <div className="kb-timeline-reason">
                                                    {reason}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 3. AI CHAT RESPONSE ── */}
                {activeTab === "AI Chat Response" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <BrainCircuit size={20} />
                      <h2>AI Chat History</h2>
                      <p>
                        Complete conversation history for all users with AI
                        Project Advisor
                      </p>
                    </div>

                    {/* User filter */}
                    <div className="kb-user-filter">
                      <Users size={16} />
                      <select
                        value={selectedUserId || "all"}
                        onChange={(e) =>
                          setSelectedUserId(
                            e.target.value === "all" ? null : e.target.value,
                          )
                        }
                      >
                        <option value="all">All Users</option>
                        {activeUsers.map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.user_name || u.user_id} (
                            {
                              activities.filter(
                                (a) =>
                                  a.user_id === u.user_id &&
                                  a.action_type === "ai_chat",
                              ).length
                            }{" "}
                            chats)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* AI Chat entries grouped by user */}
                    <div className="kb-chat-container">
                      {(() => {
                        const chatActivities = activities.filter(
                          (a) =>
                            a.action_type === "ai_chat" &&
                            (!selectedUserId || a.user_id === selectedUserId),
                        );
                        if (chatActivities.length === 0) {
                          return (
                            <div className="kb-empty">
                              <BrainCircuit size={40} />
                              <p>No AI chat history found</p>
                            </div>
                          );
                        }

                        return chatActivities.map((a, i) => {
                          const aiPrompt =
                            a.metadata?.prompt || a.description || "";
                          const aiResp = a.metadata?.response || "";
                          const qp = a.metadata?.quick_prompt || "";
                          const entryKey = `ai-chat-${a.id || i}`;
                          const isExpanded = expandedRows.has(entryKey);

                          return (
                            <div
                              key={entryKey}
                              className="kb-chat-item-enhanced"
                            >
                              <div className="kb-chat-header-enhanced">
                                <div className="kb-chat-user-badge">
                                  <div className="kb-user-avatar-large">
                                    {(a.user_name || "?")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <div className="kb-user-details">
                                    <div className="kb-chat-user-name">
                                      {a.user_name || "Unknown User"}
                                    </div>
                                    <div className="kb-chat-timestamp">
                                      <Clock size={12} /> {fmtTs(a.timestamp)}
                                    </div>
                                  </div>
                                </div>
                                {qp && (
                                  <span className="kb-quick-prompt-badge">
                                    <Tag size={11} /> {qp}
                                  </span>
                                )}
                              </div>

                              <div className="kb-chat-messages">
                                <div className="kb-message-user">
                                  <div className="kb-message-header">
                                    <UserIcon size={14} />
                                    <span className="kb-message-label">
                                      User Question
                                    </span>
                                  </div>
                                  <div className="kb-message-content">
                                    {aiPrompt}
                                  </div>
                                </div>

                                {aiResp && (
                                  <div className="kb-message-ai">
                                    <div className="kb-message-header">
                                      <Bot size={14} />
                                      <span className="kb-message-label">
                                        AI Response
                                      </span>
                                    </div>
                                    <div
                                      className="kb-message-content"
                                      style={{
                                        display: isExpanded ? "block" : "none",
                                      }}
                                    >
                                      {aiResp}
                                    </div>
                                    <button
                                      className="kb-toggle-response-btn"
                                      onClick={() => toggleRow(entryKey)}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp size={14} /> Hide Response
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown size={14} /> Show
                                          Response
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* ── 4. ACTIVITY DEPENDENCIES ── */}
                {activeTab === "Activity Dependencies" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <Tag size={20} />
                      <h2>Activity Dependencies</h2>
                      <p>
                        Analyze successor, predecessor, and critical path
                        activities
                      </p>
                    </div>

                    {/* Sub-tabs for dependencies */}
                    <div className="kb-subtabs">
                      {DEPENDENCY_TABS.map((tab) => (
                        <button
                          key={tab}
                          className={`kb-subtab ${activeDependencyTab === tab ? "active" : ""}`}
                          onClick={() => setActiveDependencyTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="kb-dependency-content">
                      {activeDependencyTab === "Successor Activities" && (
                        <div className="kb-info-card">
                          <h3>Successor Activities</h3>
                          <p>
                            Activities that depend on the completion of other
                            activities. These activities cannot start until
                            their predecessor activities are completed.
                          </p>
                          <div className="kb-dependency-info">
                            <strong>Usage in Model:</strong> The AI uses
                            successor relationships to understand task
                            dependencies and provide accurate timeline
                            predictions.
                          </div>
                          
                          {/* Core Data Display */}
                          <div className="kb-core-data-section">
                            <h4 style={{ marginTop: '15px', color: '#334155' }}>Core Data Utilized:</h4>
                            <ul style={{ paddingLeft: '20px', color: '#475569', marginTop: '10px', marginBottom: '20px', lineHeight: '1.6' }}>
                              <li><b>Activity Identifiers:</b> Successor Task IDs and Detailed Descriptions</li>
                              <li><b>Relationship Types:</b> Finish-to-Start (FS), Start-to-Start (SS), etc.</li>
                              <li><b>Lag & Lead Metrics:</b> Scheduled time delays or allowed overlays</li>
                              <li><b>Constraints & Resource Requirements:</b> Dependencies that directly affect successor initiations</li>
                            </ul>
                          </div>

                          {/* AI Learning Window Showcase */}
                          <div className="kb-learning-window" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', marginBottom: '10px', fontSize: '1rem' }}>
                              <BrainCircuit size={18} /> Model Learning & User Influence
                            </h4>
                            <p style={{ margin: 0, color: '#15803d', fontSize: '0.95rem', lineHeight: '1.5' }}>
                              <strong>How the Model Learns:</strong> The AI continuously correlates predecessor completion rates with successor delays across your project data.<br/><br/>
                              <strong>Your Influence:</strong> By querying the AI Project Advisor regarding timeline impacts, and generating "What-If" scenarios on successor delays, you dynamically tune the model to identify pattern-based cascading schedule risks before they escalate.
                            </p>
                          </div>
                        </div>
                      )}

                      {activeDependencyTab === "Predecessor Activities" && (
                        <div className="kb-info-card">
                          <h3>Predecessor Activities</h3>
                          <p>
                            Activities that must be completed before other
                            activities can begin. These activities form the
                            foundation of the project timeline.
                          </p>
                          <div className="kb-dependency-info">
                            <strong>Usage in Model:</strong> Predecessor data
                            helps the AI identify bottlenecks and suggest
                            schedule optimizations.
                          </div>
                          
                          {/* Core Data Display */}
                          <div className="kb-core-data-section">
                            <h4 style={{ marginTop: '15px', color: '#334155' }}>Core Data Utilized:</h4>
                            <ul style={{ paddingLeft: '20px', color: '#475569', marginTop: '10px', marginBottom: '20px', lineHeight: '1.6' }}>
                              <li><b>Prerequisite Activity Indices:</b> Core predecessor tracking IDs linked to dependent nodes</li>
                              <li><b>Gating Constraints:</b> Mandatory tasks and deliverables required prior to progress</li>
                              <li><b>Actual vs. Baseline Dates:</b> Historical schedule integrity data for the precedent activity</li>
                              <li><b>Vendor & External Dependencies:</b> External blocking items like material deliveries tied to activity IDs</li>
                            </ul>
                          </div>

                          {/* AI Learning Window Showcase */}
                          <div className="kb-learning-window" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', marginBottom: '10px', fontSize: '1rem' }}>
                              <BrainCircuit size={18} /> Model Learning & User Influence
                            </h4>
                            <p style={{ margin: 0, color: '#1d4ed8', fontSize: '0.95rem', lineHeight: '1.5' }}>
                              <strong>How the Model Learns:</strong> The AI monitors the frequency at which delayed predecessors block downstream tasks, implicitly scoring the bottleneck severity of tasks.<br/><br/>
                              <strong>Your Influence:</strong> As you review deviations or drill down into delayed predecessors via the Dashboard, the AI interprets your navigational patterns, gradually weighting heavily-scrutinized predecessor categories as high-risk in future project templates.
                            </p>
                          </div>
                        </div>
                      )}

                      {activeDependencyTab === "Critical Path Activities" && (
                        <div className="kb-info-card">
                          <h3>Critical Path Activities</h3>
                          <p>
                            Activities on the longest path through the project
                            network. Any delay in critical path activities will
                            delay the entire project completion.
                          </p>
                          <div className="kb-dependency-info">
                            <strong>Usage in Model:</strong> The AI prioritizes
                            critical path activities in recommendations and
                            focuses deviation analysis on these high-impact
                            tasks.
                          </div>
                          
                          {/* Core Data Display */}
                          <div className="kb-core-data-section">
                            <h4 style={{ marginTop: '15px', color: '#334155' }}>Core Data Utilized:</h4>
                            <ul style={{ paddingLeft: '20px', color: '#475569', marginTop: '10px', marginBottom: '20px', lineHeight: '1.6' }}>
                              <li><b>Zero-Float Checkpoints:</b> Activities mapped with zero days of schedule flexibility</li>
                              <li><b>Path Duration Aggregates:</b> Rolling summation of timeline constraints across full delivery vectors</li>
                              <li><b>High-Impact Identifiers:</b> Nodes where previous completions showed massive baseline deviations</li>
                              <li><b>Resource Concentration:</b> Data revealing resource bottlenecks across parallel paths</li>
                            </ul>
                          </div>

                          {/* AI Learning Window Showcase */}
                          <div className="kb-learning-window" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9f1239', marginBottom: '10px', fontSize: '1rem' }}>
                              <BrainCircuit size={18} /> Model Learning & User Influence
                            </h4>
                            <p style={{ margin: 0, color: '#be123c', fontSize: '0.95rem', lineHeight: '1.5' }}>
                              <strong>How the Model Learns:</strong> By tracking shifts in critical paths over time, the system inherently learns which phases of development constitute systemic risk profiles.<br/><br/>
                              <strong>Your Influence:</strong> When you filter project health reports by "Critical Path" explicitly and request AI remediation strategies, the model attributes higher significance factors to those vectors, improving its automated proactive alerts.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── AI MODULE SUB-TAB ── */}
                      {activeDependencyTab === "AI Module" && (
                        <div className="kb-ai-module">
                          {aiLearningLoading ? (
                            <div className="kb-loading-sm">
                              <RefreshCw size={24} className="spin" />
                              <span>Loading AI learning data…</span>
                            </div>
                          ) : (
                            <>
                              {/* ── AI Module Header ── */}
                              <div className="kb-info-card kb-ai-header">
                                <div className="kb-ai-header-top">
                                  <BrainCircuit size={24} />
                                  <div>
                                    <h3>
                                      AI Knowledge Base — Learning Material
                                    </h3>
                                    <p>
                                      This module stores all functions,
                                      activities, model behavior rules, and
                                      structured data the AI uses to generate
                                      responses. The AI learns from deviation
                                      decisions, manager comments, and chat
                                      history.
                                    </p>
                                  </div>
                                </div>
                                {aiLearningData?.summary && (
                                  <div className="kb-ai-summary-stats">
                                    <div className="kb-ai-stat">
                                      <span className="kb-ai-stat-val">
                                        {aiLearningData.summary.total_approvals}
                                      </span>
                                      <span className="kb-ai-stat-lbl">
                                        Approved Patterns
                                      </span>
                                    </div>
                                    <div className="kb-ai-stat">
                                      <span className="kb-ai-stat-val">
                                        {
                                          aiLearningData.summary
                                            .total_rejections
                                        }
                                      </span>
                                      <span className="kb-ai-stat-lbl">
                                        Rejected Patterns
                                      </span>
                                    </div>
                                    <div className="kb-ai-stat">
                                      <span className="kb-ai-stat-val">
                                        {aiLearningData.summary.total_comments}
                                      </span>
                                      <span className="kb-ai-stat-lbl">
                                        Manager Comments
                                      </span>
                                    </div>
                                    <div className="kb-ai-stat">
                                      <span className="kb-ai-stat-val">
                                        {aiLearningData.summary.total_ai_chats}
                                      </span>
                                      <span className="kb-ai-stat-lbl">
                                        AI Conversations
                                      </span>
                                    </div>
                                    <div className="kb-ai-stat">
                                      <span className="kb-ai-stat-val">
                                        {aiLearningData.summary.total_processed}
                                      </span>
                                      <span className="kb-ai-stat-lbl">
                                        Files Processed
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── Section Navigation ── */}
                              <div className="kb-ai-sections">
                                {[
                                  {
                                    key: "algorithms",
                                    label: "Algorithms",
                                    icon: <Settings size={14} />,
                                  },
                                  {
                                    key: "behavior",
                                    label: "AI Behavior Rules",
                                    icon: <BrainCircuit size={14} />,
                                  },
                                  {
                                    key: "deviations",
                                    label: "Deviation Learning",
                                    icon: <CheckCircle2 size={14} />,
                                  },
                                  {
                                    key: "chatHistory",
                                    label: "Chat Learning",
                                    icon: <MessageSquare size={14} />,
                                  },
                                  {
                                    key: "dependencies",
                                    label: "Dependency Model",
                                    icon: <Tag size={14} />,
                                  },
                                  {
                                    key: "concepts",
                                    label: "Pulse Concepts",
                                    icon: <BookOpen size={14} />,
                                  },
                                  {
                                    key: "workflow",
                                    label: "Deviation Workflow",
                                    icon: <Activity size={14} />,
                                  },
                                ].map((s) => (
                                  <button
                                    key={s.key}
                                    className={`kb-ai-section-btn ${aiExpandedSection === s.key ? "active" : ""}`}
                                    onClick={() => setAiExpandedSection(s.key)}
                                  >
                                    {s.icon} {s.label}
                                  </button>
                                ))}
                              </div>

                              {/* ── Algorithms Section ── */}
                              {aiExpandedSection === "algorithms" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <Settings size={18} /> Processing Algorithms
                                    ({ALGORITHMS.length})
                                  </h3>
                                  <p>
                                    All algorithms the system runs to analyze
                                    project data. The AI references these when
                                    explaining outputs.
                                  </p>
                                  <div className="kb-ai-algo-grid">
                                    {ALGORITHMS.map((algo) => (
                                      <div
                                        key={algo.id}
                                        className="kb-ai-algo-card"
                                      >
                                        <div className="kb-ai-algo-name">
                                          {algo.name}
                                        </div>
                                        <div className="kb-ai-algo-module">
                                          {algo.module}
                                        </div>
                                        <div className="kb-ai-algo-desc">
                                          {algo.description}
                                        </div>
                                        <div className="kb-ai-algo-metrics">
                                          <strong>Key Metrics:</strong>
                                          <div className="kb-ai-algo-tags">
                                            {algo.keyMetrics.map((m, i) => (
                                              <span
                                                key={i}
                                                className="kb-ai-tag"
                                              >
                                                {m}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ── AI Behavior Rules Section ── */}
                              {aiExpandedSection === "behavior" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <BrainCircuit size={18} /> AI Behavior Rules
                                  </h3>
                                  <p>
                                    These rules define how the AI processes
                                    queries and formats responses.
                                  </p>

                                  <div className="kb-ai-rule-card">
                                    <h4>Role: {AI_BEHAVIOR_RULES.role}</h4>
                                    <p className="kb-ai-persona">
                                      {AI_BEHAVIOR_RULES.persona}
                                    </p>
                                  </div>

                                  <div className="kb-ai-rule-card">
                                    <h4>Core Capabilities</h4>
                                    <ul className="kb-ai-rule-list">
                                      {AI_BEHAVIOR_RULES.coreCapabilities.map(
                                        (c, i) => (
                                          <li key={i}>{c}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>

                                  <div className="kb-ai-rule-card">
                                    <h4>Response Guidelines</h4>
                                    <ul className="kb-ai-rule-list">
                                      {AI_BEHAVIOR_RULES.responseGuidelines.map(
                                        (g, i) => (
                                          <li key={i}>{g}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>

                                  <div className="kb-ai-rule-card">
                                    <h4>Learning Inputs</h4>
                                    <ul className="kb-ai-rule-list">
                                      {AI_BEHAVIOR_RULES.learningInputs.map(
                                        (l, i) => (
                                          <li key={i}>{l}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>

                                  <div className="kb-ai-rule-card">
                                    <h4>Output Format Rules</h4>
                                    <div className="kb-ai-format-grid">
                                      {Object.entries(
                                        AI_BEHAVIOR_RULES.outputFormats,
                                      ).map(([k, v]) => (
                                        <div
                                          key={k}
                                          className="kb-ai-format-item"
                                        >
                                          <span className="kb-ai-format-key">
                                            {k}
                                          </span>
                                          <span className="kb-ai-format-val">
                                            {v}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── Deviation Learning Section ── */}
                              {aiExpandedSection === "deviations" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <CheckCircle2 size={18} /> Deviation
                                    Learning Patterns
                                  </h3>
                                  <p>
                                    The AI learns from manager
                                    approval/rejection decisions to improve
                                    future recommendations.
                                  </p>

                                  {/* Approved patterns */}
                                  <div className="kb-ai-pattern-section">
                                    <h4 className="kb-ai-approved-title">
                                      <CheckCircle2 size={16} /> Approved
                                      Patterns (
                                      {aiLearningData?.deviation_patterns
                                        ?.approved?.length || 0}
                                      )
                                    </h4>
                                    <p>
                                      These deviations were accepted — AI treats
                                      similar patterns as tolerable.
                                    </p>
                                    {(
                                      aiLearningData?.deviation_patterns
                                        ?.approved || []
                                    ).length === 0 ? (
                                      <div className="kb-empty-sm">
                                        No approved deviation patterns yet
                                      </div>
                                    ) : (
                                      <table className="kb-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>Activity</th>
                                            <th>Reason</th>
                                            <th>Approved By</th>
                                            <th>Severity</th>
                                            <th>Date</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(
                                            aiLearningData?.deviation_patterns
                                              ?.approved || []
                                          )
                                            .slice(0, 20)
                                            .map((p, i) => (
                                              <tr
                                                key={i}
                                                className="approved-row"
                                              >
                                                <td className="kb-td-num">
                                                  {i + 1}
                                                </td>
                                                <td>{p.activity_name}</td>
                                                <td className="kb-td-reason">
                                                  {p.reason}
                                                </td>
                                                <td>{p.approved_by}</td>
                                                <td>{p.severity}</td>
                                                <td className="kb-td-ts">
                                                  {p.date}
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>

                                  {/* Rejected patterns */}
                                  <div className="kb-ai-pattern-section">
                                    <h4 className="kb-ai-rejected-title">
                                      <XCircle size={16} /> Rejected Patterns (
                                      {aiLearningData?.deviation_patterns
                                        ?.rejected?.length || 0}
                                      )
                                    </h4>
                                    <p>
                                      These deviations were NOT accepted — AI
                                      flags similar patterns for corrective
                                      action.
                                    </p>
                                    {(
                                      aiLearningData?.deviation_patterns
                                        ?.rejected || []
                                    ).length === 0 ? (
                                      <div className="kb-empty-sm">
                                        No rejected deviation patterns yet
                                      </div>
                                    ) : (
                                      <table className="kb-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>Activity</th>
                                            <th>Rejection Reason</th>
                                            <th>Rejected By</th>
                                            <th>Severity</th>
                                            <th>Date</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(
                                            aiLearningData?.deviation_patterns
                                              ?.rejected || []
                                          )
                                            .slice(0, 20)
                                            .map((p, i) => (
                                              <tr
                                                key={i}
                                                className="rejected-row"
                                              >
                                                <td className="kb-td-num">
                                                  {i + 1}
                                                </td>
                                                <td>{p.activity_name}</td>
                                                <td className="kb-td-reason">
                                                  {p.reason}
                                                </td>
                                                <td>{p.rejected_by}</td>
                                                <td>{p.severity}</td>
                                                <td className="kb-td-ts">
                                                  {p.date}
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>

                                  {/* Manager comments */}
                                  <div className="kb-ai-pattern-section">
                                    <h4>
                                      <MessageSquare size={16} /> Manager
                                      Expertise (
                                      {aiLearningData?.deviation_patterns
                                        ?.comments?.length || 0}
                                      )
                                    </h4>
                                    <p>
                                      Domain expertise from project managers —
                                      incorporated into AI reasoning.
                                    </p>
                                    {(
                                      aiLearningData?.deviation_patterns
                                        ?.comments || []
                                    ).length === 0 ? (
                                      <div className="kb-empty-sm">
                                        No manager comments yet
                                      </div>
                                    ) : (
                                      <div className="kb-ai-comments-list">
                                        {(
                                          aiLearningData?.deviation_patterns
                                            ?.comments || []
                                        )
                                          .slice(0, 15)
                                          .map((c, i) => (
                                            <div
                                              key={i}
                                              className="kb-ai-comment-card"
                                            >
                                              <div className="kb-ai-comment-header">
                                                <div className="kb-mini-avatar">
                                                  {(c.by || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                </div>
                                                <span className="kb-ai-comment-by">
                                                  {c.by}
                                                </span>
                                                <span
                                                  className={`kb-role-badge role-${c.role}`}
                                                >
                                                  {c.role}
                                                </span>
                                                <span className="kb-ai-comment-date">
                                                  {c.date}
                                                </span>
                                              </div>
                                              <div className="kb-ai-comment-activity">
                                                {c.activity_name}
                                              </div>
                                              <div className="kb-ai-comment-text">
                                                "{c.comment}"
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* ── Chat Learning Section ── */}
                              {aiExpandedSection === "chatHistory" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <MessageSquare size={18} /> AI Chat Learning
                                    History
                                  </h3>
                                  <p>
                                    Previous conversations that shape how the AI
                                    understands user needs and project context.
                                  </p>
                                  {(aiLearningData?.ai_chat_history || [])
                                    .length === 0 ? (
                                    <div className="kb-empty">
                                      <MessageSquare size={40} />
                                      <p>No AI chat history yet</p>
                                    </div>
                                  ) : (
                                    <div className="kb-ai-chat-list">
                                      {(aiLearningData?.ai_chat_history || [])
                                        .slice(0, 20)
                                        .map((chat, i) => (
                                          <div
                                            key={i}
                                            className="kb-ai-chat-entry"
                                          >
                                            <div className="kb-ai-chat-meta">
                                              <div className="kb-mini-avatar">
                                                {(chat.user || "?")
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </div>
                                              <span>{chat.user}</span>
                                              {chat.quick_action && (
                                                <span className="kb-quick-prompt-badge">
                                                  <Tag size={11} />{" "}
                                                  {chat.quick_action}
                                                </span>
                                              )}
                                              <span className="kb-ai-chat-date">
                                                {chat.date}
                                              </span>
                                            </div>
                                            <div className="kb-ai-chat-prompt">
                                              <UserIcon size={13} />{" "}
                                              {chat.prompt}
                                            </div>
                                            {chat.response && (
                                              <div className="kb-ai-chat-response">
                                                <Bot size={13} />{" "}
                                                {chat.response.slice(0, 300)}
                                                {chat.response.length > 300
                                                  ? "…"
                                                  : ""}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Dependency Model Section ── */}
                              {aiExpandedSection === "dependencies" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <Tag size={18} /> Dependency Analysis Model
                                  </h3>
                                  <p>
                                    How the AI understands and uses project
                                    dependency relationships.
                                  </p>
                                  {Object.entries(DEPENDENCY_DEFINITIONS).map(
                                    ([key, def]) => (
                                      <div key={key} className="kb-ai-dep-card">
                                        <h4>{def.label}</h4>
                                        <p>{def.description}</p>
                                        <div className="kb-dependency-info">
                                          <strong>AI Usage:</strong>{" "}
                                          {def.aiUsage}
                                        </div>
                                        {def.keyFields && (
                                          <div className="kb-ai-dep-fields">
                                            <strong>Key Fields:</strong>
                                            <div className="kb-ai-algo-tags">
                                              {def.keyFields.map((f, i) => (
                                                <span
                                                  key={i}
                                                  className="kb-ai-tag"
                                                >
                                                  {f}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {def.relationshipTypes && (
                                          <div className="kb-ai-dep-relations">
                                            <strong>Relationship Types:</strong>
                                            {Object.entries(
                                              def.relationshipTypes,
                                            ).map(([k, v]) => (
                                              <div
                                                key={k}
                                                className="kb-ai-dep-rel-item"
                                              >
                                                <span className="kb-ai-tag">
                                                  {k}
                                                </span>{" "}
                                                {v}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {def.characteristics && (
                                          <ul className="kb-ai-rule-list">
                                            {def.characteristics.map((c, i) => (
                                              <li key={i}>{c}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* ── Pulse Concepts Section ── */}
                              {aiExpandedSection === "concepts" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <BookOpen size={18} /> Pulse Domain Concepts
                                  </h3>
                                  <p>
                                    Reference material the AI uses to provide
                                    accurate project management guidance.
                                  </p>
                                  {Object.entries(PULSE_CONCEPTS).map(
                                    ([key, concept]) => (
                                      <div
                                        key={key}
                                        className="kb-ai-concept-card"
                                      >
                                        <h4>{concept.name}</h4>
                                        {concept.description && (
                                          <p>{concept.description}</p>
                                        )}
                                        {concept.formulas && (
                                          <div className="kb-ai-formula-grid">
                                            {Object.entries(
                                              concept.formulas,
                                            ).map(([k, v]) => (
                                              <div
                                                key={k}
                                                className="kb-ai-formula-item"
                                              >
                                                <span className="kb-ai-formula-key">
                                                  {k}
                                                </span>
                                                <span className="kb-ai-formula-val">
                                                  {v}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {concept.terms && (
                                          <div className="kb-ai-formula-grid">
                                            {Object.entries(concept.terms).map(
                                              ([k, v]) => (
                                                <div
                                                  key={k}
                                                  className="kb-ai-formula-item"
                                                >
                                                  <span className="kb-ai-formula-key">
                                                    {k}
                                                  </span>
                                                  <span className="kb-ai-formula-val">
                                                    {v}
                                                  </span>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                        {concept.interpretation && (
                                          <div className="kb-ai-formula-grid">
                                            {Object.entries(
                                              concept.interpretation,
                                            ).map(([k, v]) => (
                                              <div
                                                key={k}
                                                className="kb-ai-formula-item"
                                              >
                                                <span className="kb-ai-formula-key">
                                                  {k
                                                    .replace(/([A-Z])/g, " $1")
                                                    .trim()}
                                                </span>
                                                <span className="kb-ai-formula-val">
                                                  {v}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {concept.stages && (
                                          <div className="kb-ai-algo-tags">
                                            {concept.stages.map((s, i) => (
                                              <span
                                                key={i}
                                                className="kb-ai-tag"
                                              >
                                                {s}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {concept.prerequisites && (
                                          <ul className="kb-ai-rule-list">
                                            {concept.prerequisites.map(
                                              (p, i) => (
                                                <li key={i}>{p}</li>
                                              ),
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* ── Deviation Workflow Section ── */}
                              {aiExpandedSection === "workflow" && (
                                <div className="kb-ai-content">
                                  <h3>
                                    <Activity size={18} /> Deviation Workflow
                                    Model
                                  </h3>
                                  <p>
                                    The complete lifecycle of how deviations
                                    flow through the system — from detection to
                                    AI learning.
                                  </p>
                                  <div className="kb-ai-workflow-timeline">
                                    {DEVIATION_WORKFLOW.stages.map(
                                      (stage, i) => (
                                        <div
                                          key={i}
                                          className="kb-ai-workflow-step"
                                        >
                                          <div className="kb-ai-workflow-num">
                                            {i + 1}
                                          </div>
                                          <div className="kb-ai-workflow-content">
                                            <div className="kb-ai-workflow-title">
                                              {stage.stage}
                                            </div>
                                            <div className="kb-ai-workflow-actor">
                                              Actor: {stage.actor}
                                            </div>
                                            <div className="kb-ai-workflow-desc">
                                              {stage.description}
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <div className="kb-ai-severity-grid">
                                    <h4>Severity Classification</h4>
                                    {Object.entries(
                                      DEVIATION_WORKFLOW.severityLevels,
                                    ).map(([level, info]) => (
                                      <div
                                        key={level}
                                        className={`kb-ai-severity-item severity-${info.color}`}
                                      >
                                        <span className="kb-ai-severity-level">
                                          {level}
                                        </span>
                                        <span className="kb-ai-severity-threshold">
                                          {info.threshold}
                                        </span>
                                        <span className="kb-ai-severity-priority">
                                          Priority {info.priority}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 5. LIST OF DEVIATIONS ── */}
                {activeTab === "List of Deviations" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <CheckCircle2 size={20} />
                      <h2>Deviation Management</h2>
                      <p>
                        Track all deviation statuses: approved, rejected, and
                        recursive approvals
                      </p>
                    </div>

                    {/* Sub-tabs for deviations */}
                    <div className="kb-subtabs">
                      {DEVIATION_SUB_TABS.map((tab) => (
                        <button
                          key={tab}
                          className={`kb-subtab ${activeDeviationSubTab === tab ? "active" : ""}`}
                          onClick={() => setActiveDeviationSubTab(tab)}
                        >
                          {tab}
                          <span className="kb-subtab-count">
                            {tab === "Approved" &&
                              activities.filter(
                                (a) => a.action_type === "deviation_approve",
                              ).length}
                            {tab === "Rejected" &&
                              activities.filter(
                                (a) => a.action_type === "deviation_reject",
                              ).length}
                            {tab === "Approved After Recursive Process" &&
                              (recursiveDevs.length || "…")}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="kb-table-wrap">
                      {activeDeviationSubTab === "Approved" &&
                        (() => {
                          const approvedDeviations = filteredActivities.filter(
                            (a) =>
                              a.action_type === "deviation_approve" &&
                              !a.metadata?.recursive,
                          );
                          return approvedDeviations.length === 0 ? (
                            <div className="kb-empty">
                              <CheckCircle2 size={40} />
                              <p>No approved deviations</p>
                            </div>
                          ) : (
                            <table className="kb-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Timestamp</th>
                                  <th>Approved By</th>
                                  <th>Role</th>
                                  <th>Source</th>
                                  <th>Activity ID</th>
                                  <th>Activity Name</th>
                                  <th>Reason</th>
                                  <th>Gate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {approvedDeviations.map((a, idx) => (
                                  <tr
                                    key={a.id || idx}
                                    className="approved-row"
                                  >
                                    <td className="kb-td-num">{idx + 1}</td>
                                    <td className="kb-td-ts">
                                      {fmtTs(a.timestamp)}
                                    </td>
                                    <td>
                                      <div className="kb-user-cell">
                                        <div className="kb-mini-avatar">
                                          {(a.user_name || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        {a.user_name || "—"}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-role-badge role-${a.user_role}`}
                                      >
                                        {a.user_role || "—"}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-source-badge source-${a.source}`}
                                      >
                                        {a.source === "mobile" ? (
                                          <Smartphone size={12} />
                                        ) : (
                                          <Monitor size={12} />
                                        )}
                                        {a.source || "web"}
                                      </span>
                                    </td>
                                    <td className="kb-td-activity-id">
                                      {a.metadata?.deviation_id ||
                                        a.entity_id ||
                                        "—"}
                                    </td>
                                    <td className="kb-td-activity-name">
                                      {a.metadata?.activity_name || "—"}
                                    </td>
                                    <td className="kb-td-reason">
                                      {a.metadata?.reason ||
                                        a.metadata?.comment ||
                                        "—"}
                                    </td>
                                    <td>
                                      {a.metadata?.gate ? (
                                        <span className="kb-gate-badge">
                                          {a.metadata.gate}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}

                      {activeDeviationSubTab === "Rejected" &&
                        (() => {
                          const rejectedDeviations = filteredActivities.filter(
                            (a) => a.action_type === "deviation_reject",
                          );
                          return rejectedDeviations.length === 0 ? (
                            <div className="kb-empty">
                              <XCircle size={40} />
                              <p>No rejected deviations</p>
                            </div>
                          ) : (
                            <table className="kb-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Timestamp</th>
                                  <th>Rejected By</th>
                                  <th>Role</th>
                                  <th>Source</th>
                                  <th>Activity ID</th>
                                  <th>Activity Name</th>
                                  <th>Reason</th>
                                  <th>Gate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rejectedDeviations.map((a, idx) => (
                                  <tr
                                    key={a.id || idx}
                                    className="rejected-row"
                                  >
                                    <td className="kb-td-num">{idx + 1}</td>
                                    <td className="kb-td-ts">
                                      {fmtTs(a.timestamp)}
                                    </td>
                                    <td>
                                      <div className="kb-user-cell">
                                        <div className="kb-mini-avatar">
                                          {(a.user_name || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        {a.user_name || "—"}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-role-badge role-${a.user_role}`}
                                      >
                                        {a.user_role || "—"}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`kb-source-badge source-${a.source}`}
                                      >
                                        {a.source === "mobile" ? (
                                          <Smartphone size={12} />
                                        ) : (
                                          <Monitor size={12} />
                                        )}
                                        {a.source || "web"}
                                      </span>
                                    </td>
                                    <td className="kb-td-activity-id">
                                      {a.metadata?.deviation_id ||
                                        a.entity_id ||
                                        "—"}
                                    </td>
                                    <td className="kb-td-activity-name">
                                      {a.metadata?.activity_name || "—"}
                                    </td>
                                    <td className="kb-td-reason">
                                      {a.metadata?.reason ||
                                        a.metadata?.comment ||
                                        "—"}
                                    </td>
                                    <td>
                                      {a.metadata?.gate ? (
                                        <span className="kb-gate-badge">
                                          {a.metadata.gate}
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}

                      {activeDeviationSubTab ===
                        "Approved After Recursive Process" && (
                        <div className="kb-recursive-section">
                          {recursiveLoading ? (
                            <div className="kb-loading-sm">
                              <RefreshCw size={24} className="spin" />
                              <span>Loading recursive deviations…</span>
                            </div>
                          ) : recursiveDevs.length === 0 ? (
                            <div className="kb-empty">
                              <RefreshCw size={40} />
                              <p>No recursive approvals yet</p>
                              <p className="kb-empty-sub">
                                When a deviation is rejected by admin, manager
                                resubmits with a new reason, and this
                                back-and-forth leads to a final approval — it
                                will appear here.
                              </p>
                            </div>
                          ) : (
                            recursiveDevs.map((rd, rdIdx) => {
                              const rdKey = `recursive-${rd.deviation_id}`;
                              const isExpanded = recursiveExpanded.has(rdKey);
                              const dev = rd.deviation || {};
                              const rowData = dev.row_data || {};
                              const trail = rd.activity_trail || [];
                              return (
                                <div key={rdKey} className="kb-recursive-card">
                                  <div
                                    className="kb-recursive-card-header"
                                    onClick={() =>
                                      toggleRecursiveExpanded(rdKey)
                                    }
                                  >
                                    <div className="kb-recursive-card-info">
                                      <div className="kb-recursive-card-title">
                                        <span className="kb-recursive-id">
                                          #{rd.deviation_id}
                                        </span>
                                        <span className="kb-recursive-name">
                                          {rowData.activity_name ||
                                            dev.description ||
                                            "Deviation"}
                                        </span>
                                      </div>
                                      <div className="kb-recursive-card-stats">
                                        <span className="kb-recursive-stat reject">
                                          <XCircle size={12} />{" "}
                                          {rd.reject_count} Rejection
                                          {rd.reject_count > 1 ? "s" : ""}
                                        </span>
                                        <span className="kb-recursive-stat approve">
                                          <CheckCircle2 size={12} />{" "}
                                          {rd.approve_count} Approval
                                          {rd.approve_count > 1 ? "s" : ""}
                                        </span>
                                        {rd.comment_count > 0 && (
                                          <span className="kb-recursive-stat comment">
                                            <MessageSquare size={12} />{" "}
                                            {rd.comment_count} Comment
                                            {rd.comment_count > 1 ? "s" : ""}
                                          </span>
                                        )}
                                        <span className="kb-recursive-badge">
                                          {rd.iterations} iterations
                                        </span>
                                      </div>
                                    </div>
                                    <div className="kb-recursive-card-meta">
                                      <span className="kb-recursive-severity">
                                        {dev.severity || "—"}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="kb-recursive-trail">
                                      <div className="kb-recursive-dev-info">
                                        <div className="kb-recursive-dev-row">
                                          <strong>Sheet:</strong>{" "}
                                          {dev.sheet || "—"}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>File:</strong>{" "}
                                          {dev.filename || "—"}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>Detected:</strong>{" "}
                                          {fmtTs(dev.detected_at)}
                                        </div>
                                        <div className="kb-recursive-dev-row">
                                          <strong>Current Status:</strong>{" "}
                                          <span
                                            className={`kb-recursive-status status-${(dev.review_status || "").toLowerCase().replace(/\s/g, "-")}`}
                                          >
                                            {dev.review_status || "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="kb-timeline">
                                        <div className="kb-timeline-title">
                                          <Clock size={14} /> Activity Timeline
                                        </div>
                                        {trail.map((step, si) => {
                                          const stepMeta = getActionMeta(
                                            step.action_type,
                                          );
                                          const StepIcon = stepMeta.Icon;
                                          const isReject =
                                            step.action_type ===
                                            "deviation_reject";
                                          const isApprove =
                                            step.action_type ===
                                            "deviation_approve";
                                          const reason =
                                            step.metadata?.reason ||
                                            step.metadata?.comment ||
                                            step.description ||
                                            "";
                                          return (
                                            <div
                                              key={si}
                                              className={`kb-timeline-item ${isReject ? "reject" : isApprove ? "approve" : "comment"}`}
                                            >
                                              <div className="kb-timeline-dot">
                                                <StepIcon size={14} />
                                              </div>
                                              <div className="kb-timeline-content">
                                                <div className="kb-timeline-header">
                                                  <span
                                                    className={`kb-action-badge action-${stepMeta.color}`}
                                                  >
                                                    <StepIcon size={11} />{" "}
                                                    {stepMeta.label}
                                                  </span>
                                                  <span className="kb-timeline-ts">
                                                    {fmtTs(step.timestamp)}
                                                  </span>
                                                </div>
                                                <div className="kb-timeline-actor">
                                                  <div className="kb-mini-avatar">
                                                    {(step.user_name || "?")
                                                      .charAt(0)
                                                      .toUpperCase()}
                                                  </div>
                                                  <span>
                                                    {step.user_name || "—"}
                                                  </span>
                                                  <span
                                                    className={`kb-role-badge role-${step.user_role}`}
                                                  >
                                                    {step.user_role || "—"}
                                                  </span>
                                                  <span
                                                    className={`kb-source-badge source-${step.source}`}
                                                  >
                                                    {step.source ===
                                                    "mobile" ? (
                                                      <Smartphone size={11} />
                                                    ) : (
                                                      <Monitor size={11} />
                                                    )}
                                                    {step.source || "web"}
                                                  </span>
                                                </div>
                                                {reason && (
                                                  <div className="kb-timeline-reason">
                                                    {reason}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 6. ANALYTICS ── */}
                {activeTab === "Analytics" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <BarChart2 size={20} />
                      <h2>Analytics & Insights</h2>
                      <p>S-Curve analysis and performance metrics</p>
                    </div>

                    {/* Sub-tabs for analytics */}
                    <div className="kb-subtabs">
                      {ANALYTICS_SUB_TABS.map((tab) => (
                        <button
                          key={tab}
                          className={`kb-subtab ${activeAnalyticsSubTab === tab ? "active" : ""}`}
                          onClick={() => setActiveAnalyticsSubTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {activeAnalyticsSubTab === "S-Curve Output" && (
                      <div className="kb-scurve-archive">
                        <div className="kb-info-card">
                          <h3>S-Curve &amp; Chart Archive</h3>
                          <p>
                            Visual charts from all processed output files —
                            click any file to view its S-Curve analysis
                          </p>
                        </div>

                        {scurveLoading ? (
                          <div className="kb-loading-sm">
                            <RefreshCw size={24} className="spin" />
                            <span>Loading S-Curve archive…</span>
                          </div>
                        ) : scurveArchive.length === 0 ? (
                          <div className="kb-empty">
                            <BarChart2 size={40} />
                            <p>No processed files with chart data yet</p>
                          </div>
                        ) : (
                          <div className="kb-scurve-file-grid">
                            {scurveArchive.map((job) => (
                              <div
                                key={job.job_id}
                                className="kb-scurve-file-card"
                                onClick={() =>
                                  openSCurve(job.job_id, job.filename)
                                }
                              >
                                <div className="kb-scurve-file-icon">
                                  <BarChart2 size={28} />
                                </div>
                                <div className="kb-scurve-file-info">
                                  <div className="kb-scurve-file-name">
                                    {job.filename}
                                  </div>
                                  <div className="kb-scurve-file-meta">
                                    <span>
                                      <FileText size={12} /> {job.success_count}{" "}
                                      sheets
                                    </span>
                                    <span>
                                      <Clock size={12} />{" "}
                                      {fmtTs(job.processed_at)}
                                    </span>
                                  </div>
                                </div>
                                <div className="kb-scurve-file-arrow">
                                  <TrendingUp size={18} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeAnalyticsSubTab === "Existing Analytics" && (
                      <div className="kb-analytics">
                        <div className="kb-analytics-card">
                          <div className="kb-analytics-title">
                            <TrendingUp size={16} /> Daily Activity — Last 7
                            Days
                          </div>
                          {dailyData.length === 0 ? (
                            <div className="kb-empty-sm">No data yet</div>
                          ) : (
                            <div className="kb-bar-chart">
                              {dailyData.map((d, i) => (
                                <div key={i} className="kb-bar-col">
                                  <div className="kb-bar-label-top">
                                    {d.count}
                                  </div>
                                  <div
                                    className="kb-bar-fill"
                                    style={{
                                      height: `${Math.round((d.count / maxDaily) * 140)}px`,
                                    }}
                                  />
                                  <div className="kb-bar-label-date">
                                    {new Date(d.date).toLocaleDateString(
                                      "en-GB",
                                      { day: "2-digit", month: "short" },
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="kb-analytics-card">
                          <div className="kb-analytics-title">
                            <Activity size={16} /> Top Action Types
                          </div>
                          {(stats.top_actions || []).length === 0 ? (
                            <div className="kb-empty-sm">No data yet</div>
                          ) : (
                            <div className="kb-top-actions">
                              {(stats.top_actions || []).map((item, i) => {
                                const meta = getActionMeta(item.action);
                                const Icon = meta.Icon;
                                const maxCnt = stats.top_actions[0]?.count || 1;
                                const pct = Math.round(
                                  (item.count / maxCnt) * 100,
                                );
                                return (
                                  <div key={i} className="kb-top-action-row">
                                    <span
                                      className={`kb-action-badge action-${meta.color}`}
                                    >
                                      <Icon size={12} />
                                      {meta.label}
                                    </span>
                                    <div className="kb-top-action-bar">
                                      <div
                                        className="kb-top-action-fill"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="kb-top-action-count">
                                      {item.count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="kb-analytics-card">
                          <div className="kb-analytics-title">
                            <Monitor size={16} /> Web vs Mobile Split
                          </div>
                          <div className="kb-platform-split">
                            {(() => {
                              const web = stats.by_source?.web || 0;
                              const mobile = stats.by_source?.mobile || 0;
                              const total = web + mobile || 1;
                              const webPct = Math.round((web / total) * 100);
                              return (
                                <>
                                  <div className="kb-split-bar">
                                    <div
                                      className="kb-split-web"
                                      style={{ width: `${webPct}%` }}
                                    />
                                    <div
                                      className="kb-split-mobile"
                                      style={{ width: `${100 - webPct}%` }}
                                    />
                                  </div>
                                  <div className="kb-split-legend">
                                    <span className="kb-split-dot dot-web" />
                                    Web App — {web} ({webPct}%)
                                    <span
                                      className="kb-split-dot dot-mobile"
                                      style={{ marginLeft: 16 }}
                                    />
                                    Mobile App — {mobile} ({100 - webPct}%)
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 7. ACTIVITY FEED ── */}
                {activeTab === "Activity Feed" && (
                  <div className="kb-section">
                    <div className="kb-section-header">
                      <Activity size={20} />
                      <h2>Activity Feed</h2>
                      <p>
                        Complete audit trail of all user actions and system
                        events
                      </p>
                    </div>

                    {/* ── Stats Row (6 KPIs) ── */}
                    <div className="kb-stats-row">
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon green">
                          <Activity size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {(stats.total_activities || 0).toLocaleString()}
                          </div>
                          <div className="kb-stat-label">Total Activities</div>
                        </div>
                      </div>
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon blue">
                          <Users size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {stats.active_users_24h ?? 0}
                          </div>
                          <div className="kb-stat-label">
                            Active Users (24h)
                          </div>
                        </div>
                      </div>
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon teal">
                          <Monitor size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {(stats.by_source?.web || 0).toLocaleString()}
                          </div>
                          <div className="kb-stat-label">Web App Actions</div>
                        </div>
                      </div>
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon purple">
                          <Smartphone size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {(stats.by_source?.mobile || 0).toLocaleString()}
                          </div>
                          <div className="kb-stat-label">
                            Mobile App Actions
                          </div>
                        </div>
                      </div>
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon green">
                          <CheckCircle2 size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {
                              activities.filter(
                                (a) => a.action_type === "deviation_approve",
                              ).length
                            }
                          </div>
                          <div className="kb-stat-label">
                            Deviations Approved
                          </div>
                        </div>
                      </div>
                      <div className="kb-stat-card">
                        <div className="kb-stat-icon red">
                          <XCircle size={22} />
                        </div>
                        <div>
                          <div className="kb-stat-value">
                            {
                              activities.filter(
                                (a) => a.action_type === "deviation_reject",
                              ).length
                            }
                          </div>
                          <div className="kb-stat-label">
                            Deviations Rejected
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity table */}
                    <div className="kb-table-wrap">
                      {filteredActivities.length === 0 ? (
                        <div className="kb-empty">
                          <Activity size={40} />
                          <p>No activities match your filters</p>
                        </div>
                      ) : (
                        <table className="kb-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Timestamp</th>
                              <th>User</th>
                              <th>Role</th>
                              <th>Action</th>
                              <th>Source</th>
                              <th>Description</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredActivities.map((a, idx) => {
                              const meta = getActionMeta(a.action_type);
                              const Icon = meta.Icon;
                              const reason =
                                a.metadata?.reason ||
                                a.metadata?.comment ||
                                a.metadata?.note ||
                                "";
                              const extra = a.metadata
                                ? Object.entries(a.metadata)
                                    .filter(
                                      ([k]) =>
                                        ![
                                          "reason",
                                          "comment",
                                          "note",
                                          "prompt",
                                          "response",
                                        ].includes(k),
                                    )
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" · ")
                                : "";
                              return (
                                <tr key={a.id || idx}>
                                  <td className="kb-td-num">{idx + 1}</td>
                                  <td className="kb-td-ts">
                                    {fmtTs(a.timestamp)}
                                  </td>
                                  <td>
                                    <div className="kb-user-cell">
                                      <div className="kb-mini-avatar">
                                        {(a.user_name || "?")
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>
                                      {a.user_name || a.user_id || "—"}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`kb-role-badge role-${a.user_role}`}
                                    >
                                      {a.user_role || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className={`kb-action-badge action-${meta.color}`}
                                    >
                                      <Icon size={12} />
                                      {meta.label}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className={`kb-source-badge source-${a.source}`}
                                    >
                                      {a.source === "mobile" ? (
                                        <Smartphone size={12} />
                                      ) : (
                                        <Monitor size={12} />
                                      )}
                                      {a.source || "web"}
                                    </span>
                                  </td>
                                  <td className="kb-td-desc">
                                    {a.description || "—"}
                                  </td>
                                  <td className="kb-td-meta">
                                    {reason && (
                                      <span className="kb-reason">
                                        {reason}
                                      </span>
                                    )}
                                    {extra && (
                                      <span className="kb-meta-extra">
                                        {extra}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* end kb-tab-panel */}
            </>
          )}
        </div>
        {/* end kb-container */}
      </div>
      {/* end main-content */}

      {/* S-Curve Analytics Modal */}
      {showSCurve && sCurveJob && (
        <SCurveAnalytics
          jobId={sCurveJob.id}
          filename={sCurveJob.filename}
          baselineOnly={false}
          onClose={closeSCurve}
        />
      )}
    </div>
  );
};

export default Knowledge;
