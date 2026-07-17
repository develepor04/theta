/**
 * AI Knowledge Base — Learning Material & Model Data
 * ===================================================
 * This file stores all functions, activities, model behavior rules,
 * and structured knowledge that the AI chatbot uses as its learning context.
 * 
 * The AI's output depends on this data — it shapes how the AI understands
 * project management concepts, interprets data, and generates responses.
 */

// ─── 1. ALGORITHM DEFINITIONS ──────────────────────────────────────────────
// All 13 processors that the system uses to analyze Excel project data

export const ALGORITHMS = [
  {
    id: 'eddr_timeline',
    name: 'EDDR Timeline Analysis',
    module: 'main1.py',
    description: 'Analyzes EDDR (Engineering Design Data Requirements) timeline with stage gates and milestone tracking. Identifies overdue deliverables and calculates schedule variance.',
    inputSheet: 'EDDR',
    outputCols: ['Activity ID', 'Activity Name', 'BL Start', 'BL Finish', 'Actual Start', 'Actual Finish', 'Duration Deviation (Days)', 'Status Flag'],
    statusFlags: { '✅': 'On Track', '⚠': 'At Risk', '❌': 'Delayed', '🔴': 'Critical' },
    keyMetrics: ['Schedule Variance', 'Milestone Completion %', 'Overdue Count'],
  },
  {
    id: 'project_management',
    name: 'Project Management Tracker',
    module: 'project_management.py',
    description: 'Tracks overall project management metrics including earned value, cost performance index, and schedule performance index.',
    inputSheet: 'Project Management',
    outputCols: ['WBS', 'Activity', 'Planned %', 'Actual %', 'Variance', 'CPI', 'SPI'],
    keyMetrics: ['CPI', 'SPI', 'EAC', 'ETC', 'Planned vs Actual %'],
  },
  {
    id: 'weekly_eddr',
    name: 'Weekly EDDR Continuation',
    module: 'weekly_eddr_cont.py',
    description: 'Processes weekly EDDR status updates and compares week-over-week progress for contractor document tracking.',
    inputSheet: 'Weekly EDDR',
    outputCols: ['Contractor', 'Document Type', 'Status This Week', 'Status Last Week', 'Change', 'Remarks'],
    keyMetrics: ['Weekly Progress Delta', 'Pending Documents Count'],
  },
  {
    id: 'ho_subcontract',
    name: 'HO-Subcontract Tracker',
    module: 'ho_subcontract.py',
    description: 'Tracks Head Office subcontract progress including procurement milestones, delivery dates, and completion percentages.',
    inputSheet: 'HO-Subcontract',
    outputCols: ['Package', 'Contractor', 'PO Date', 'Delivery Date', 'Progress %', 'Status'],
    keyMetrics: ['Completion %', 'On-Time Delivery Rate', 'Pending Packages'],
  },
  {
    id: 'ho_procurements',
    name: 'HO-Procurements Tracker',
    module: 'ho_procurements.py',
    description: 'Monitors Head Office procurement activities including RFQ, PO, and delivery tracking with stage gate analysis.',
    inputSheet: 'HO-Procurements',
    outputCols: ['Item', 'RFQ Date', 'PO Date', 'Expected Delivery', 'Actual Delivery', 'Variance Days', 'Gate Status'],
    keyMetrics: ['Procurement Lead Time', 'Delivery Variance', 'Stage Gate Compliance'],
  },
  {
    id: 'manufacture',
    name: 'Manufacturing Progress',
    module: 'manufacture.py',
    description: 'Tracks 9 manufacturing milestones per item including fabrication, testing, and shipping with stage gate analysis.',
    inputSheet: 'Manufacture',
    outputCols: ['Item', 'Milestone 1-9', 'BL Date', 'Actual Date', 'Status', 'Deviation Days'],
    keyMetrics: ['Stage Completion Rate', 'Manufacturing Delays', 'Quality Hold Count'],
  },
  {
    id: 'commissioning_rfsu',
    name: 'Commissioning RFSU Analysis',
    module: 'commissioning_rfsu.py',
    description: 'Analyzes commissioning readiness and RFSU (Ready For Start Up) status with system-by-system tracking.',
    inputSheet: 'Commissioning RFSU',
    outputCols: ['System', 'Sub-System', 'MC Date', 'RFSU Target', 'RFSU Actual', 'Status', 'Punch Items'],
    keyMetrics: ['RFSU Completion %', 'Open Punch Items', 'Systems Ready Count'],
  },
  {
    id: 'const_precomm',
    name: 'Construction & Pre-Commissioning',
    module: 'const_precomm.py',
    description: 'Tracks construction and pre-commissioning activities with discipline-wise progress and lookahead scheduling.',
    inputSheet: 'Const & Pre-Comm',
    outputCols: ['Discipline', 'Activity', 'Planned %', 'Actual %', 'Deviation', 'Lookahead Status'],
    keyMetrics: ['Construction Progress %', 'Pre-Comm Readiness', 'Discipline Variance'],
  },
  {
    id: 'eddr_cntr',
    name: 'EDDR Contractor Analytics',
    module: 'eddr_cntr.py',
    description: 'Detailed EDDR tracking per contractor with document submission, review, and approval cycle analysis.',
    inputSheet: 'EDDR CNTR',
    outputCols: ['Contractor', 'Document ID', 'Submitted', 'Review Status', 'Approval Date', 'Cycle Time'],
    keyMetrics: ['Review Cycle Time', 'Approval Rate', 'Pending Reviews Count'],
  },
  {
    id: 'overall_s_curve',
    name: 'Overall S-Curve Analysis',
    module: 'overall_s_curve.py',
    description: 'Generates project-wide S-Curve with monthly planned vs actual progress data, cumulative tracking, and trend analysis.',
    inputSheet: 'Overall S-Curve',
    outputCols: ['Month', 'Planned Cumulative %', 'Actual Cumulative %', 'Variance %', 'Trend'],
    keyMetrics: ['Overall Progress %', 'Schedule Variance', 'Completion Forecast'],
  },
  {
    id: 'pm_s_curve',
    name: 'PM S-Curve Generation',
    module: 'pm_s_curve.py',
    description: 'Project Management specific S-Curve tracking with weighted progress and milestone overlays.',
    inputSheet: 'PM S-Curve',
    outputCols: ['Month', 'Weight', 'Planned %', 'Actual %', 'Earned Value', 'Forecast'],
    keyMetrics: ['Weighted Progress', 'Earned Value', 'PM Forecast Accuracy'],
  },
  {
    id: 'bl_overall_progress_lv2',
    name: 'BL Overall Progress (Level 2)',
    module: 'bl_overall_progress_lv2.py',
    description: 'Baseline overall progress at discipline level (Level 2) comparing planned vs actual percentages across all disciplines.',
    inputSheet: 'BL Overall Progress Lv2',
    outputCols: ['Discipline', 'Planned %', 'Actual %', 'Variance %', 'Status', 'Trend'],
    keyMetrics: ['Discipline Variance', 'Overall BL Compliance', 'Lagging Disciplines'],
  },
  {
    id: 'revised_bl_overall_progress',
    name: 'Revised BL Overall Progress',
    module: 'revised_bl_overall_progress.py',
    description: 'Tracks revised baseline progress against original baseline and actual progress, highlighting re-baseline impacts.',
    inputSheet: 'Revised BL Progress',
    outputCols: ['Item', 'Original BL %', 'Revised BL %', 'Actual %', 'BL Delta', 'Status'],
    keyMetrics: ['Re-Baseline Impact', 'Revised vs Actual Gap', 'Improvement Trend'],
  },
];

// ─── 2. PROJECT ACTIVITY TYPES ─────────────────────────────────────────────
// All tracked activity types in the system with AI behavior instructions

export const ACTIVITY_TYPES = {
  login:              { label: 'User Login',         category: 'auth',      aiRelevance: 'low',  description: 'User authenticated into the system' },
  logout:             { label: 'User Logout',        category: 'auth',      aiRelevance: 'low',  description: 'User logged out of the system' },
  file_upload:        { label: 'File Upload',        category: 'data',      aiRelevance: 'medium', description: 'Excel project data uploaded for processing' },
  file_processed:     { label: 'File Processed',     category: 'data',      aiRelevance: 'high', description: 'File successfully run through algorithm pipeline, producing output sheets and deviations' },
  deviation_view:     { label: 'Deviation Viewed',   category: 'deviation', aiRelevance: 'medium', description: 'User viewed a deviation detail' },
  deviation_approve:  { label: 'Deviation Approved', category: 'deviation', aiRelevance: 'high', description: 'Admin/Manager approved a schedule deviation — AI should learn approved patterns' },
  deviation_reject:   { label: 'Deviation Rejected', category: 'deviation', aiRelevance: 'high', description: 'Admin/Manager rejected a deviation — AI should learn rejection reasons' },
  deviation_comment:  { label: 'Deviation Comment',  category: 'deviation', aiRelevance: 'high', description: 'Manager/Admin commented on deviation with reasoning — key learning input' },
  ai_chat:            { label: 'AI Chat',            category: 'ai',        aiRelevance: 'high', description: 'User interacted with AI chatbot — stores prompt and response for learning' },
  notification_view:  { label: 'Notification View',  category: 'system',    aiRelevance: 'low',  description: 'User viewed notification panel' },
  notification_read:  { label: 'Notification Read',  category: 'system',    aiRelevance: 'low',  description: 'User marked notification as read' },
  history_view:       { label: 'History View',       category: 'system',    aiRelevance: 'low',  description: 'User browsed processing history' },
  history_delete:     { label: 'History Delete',     category: 'system',    aiRelevance: 'low',  description: 'User deleted a job from history' },
  knowledge_base_view:{ label: 'KB View',            category: 'system',    aiRelevance: 'low',  description: 'User accessed knowledge base' },
};

// ─── 3. AI BEHAVIOR RULES ──────────────────────────────────────────────────
// Instructions that shape how the AI responds — this is the "learning material"

export const AI_BEHAVIOR_RULES = {
  role: 'Pulse Planning Assistant',
  persona: 'Expert project management advisor for construction & engineering projects',

  coreCapabilities: [
    'Analyze P6 schedules and identify critical path activities',
    'Calculate schedule variance, CPI, SPI, and earned value metrics',
    'Detect delays and suggest mitigation strategies',
    'Process EDDR reports and track deliverable status',
    'Generate S-Curve analysis with forecasting',
    'Identify predecessor/successor dependency chains',
    'Provide risk assessment based on historical deviation patterns',
    'Learn from manager approval/rejection decisions to improve recommendations',
  ],

  responseGuidelines: [
    'Always reference specific Activity IDs, dates, and values from project data',
    'Use markdown formatting: **bold** values, bullet lists, tables for tabular data',
    'Prioritize critical path activities in recommendations',
    'When delays are detected, suggest actionable mitigation strategies',
    'Consider manager feedback from deviation workflow in future responses',
    'For date range queries, filter and display only relevant time-period data',
    'Never claim lack of data if processed project data is available',
    'Provide confidence indicators when making predictions or forecasts',
  ],

  learningInputs: [
    'Deviation approvals — patterns of accepted schedule changes',
    'Deviation rejections — reasons why deviations were not accepted',
    'Manager comments — domain expertise and decision rationale',
    'AI chat history — successful Q&A patterns and user satisfaction',
    'Processing results — algorithm outputs and detected anomalies',
  ],

  outputFormats: {
    summary:    'Use ## headers, bullet points, and bold key metrics',
    table:      'Use markdown tables with | col1 | col2 | format',
    timeline:   'Chronological list with dates and status indicators',
    comparison: 'Side-by-side planned vs actual with variance highlighting',
    risk:       'Severity-ranked list with probability and impact scores',
  },
};

// ─── 4. DEPENDENCY ANALYSIS DEFINITIONS ─────────────────────────────────────
// How the AI understands project dependencies

export const DEPENDENCY_DEFINITIONS = {
  successor: {
    label: 'Successor Activities',
    description: 'Activities that depend on the completion of a preceding task. Cannot start until predecessor finishes.',
    aiUsage: 'Identifies downstream impact — when a task is delayed, AI traces all successors to calculate cascade effect on project timeline.',
    keyFields: ['Activity ID', 'Successor ID', 'Relationship Type (FS/SS/FF/SF)', 'Lag Days'],
    relationshipTypes: {
      FS: 'Finish-to-Start — Successor starts after predecessor finishes (most common)',
      SS: 'Start-to-Start — Successor starts when predecessor starts',
      FF: 'Finish-to-Finish — Successor finishes when predecessor finishes',
      SF: 'Start-to-Finish — Successor finishes when predecessor starts (rare)',
    },
  },
  predecessor: {
    label: 'Predecessor Activities',
    description: 'Activities that must complete before dependent tasks can begin. These form the foundation of the schedule.',
    aiUsage: 'Identifies bottlenecks — AI checks if delayed predecessors are blocking downstream work and quantifies the hold-up.',
    keyFields: ['Activity ID', 'Predecessor ID', 'Relationship Type', 'Lag Days', 'Constraint Type'],
  },
  criticalPath: {
    label: 'Critical Path Activities',
    description: 'The longest sequence of dependent activities that determines the minimum project duration. Zero total float.',
    aiUsage: 'AI focuses deviation analysis, risk assessment, and mitigation recommendations on critical path activities since any delay here delays the full project.',
    characteristics: [
      'Total Float = 0 (no schedule slack)',
      'Any delay extends project completion date',
      'Typically 15-25% of all project activities',
      'Must be monitored with highest priority',
    ],
    detectionCriteria: [
      'Activities with Total Float ≤ 0',
      'Activities on the longest path through the network',
      'Activities flagged as 🔴 (Critical) in EDDR analysis',
    ],
  },
};

// ─── 5. DEVIATION WORKFLOW MODEL ────────────────────────────────────────────
// How deviations flow through the system — AI learning context

export const DEVIATION_WORKFLOW = {
  stages: [
    { stage: 'Detection',  actor: 'System',  description: 'Algorithm detects variance between baseline and actual dates/progress during file processing' },
    { stage: 'Flagging',   actor: 'System',  description: 'Deviation severity classified as High/Medium/Low based on variance magnitude and critical path impact' },
    { stage: 'Review',     actor: 'Manager', description: 'Manager reviews deviation, adds comment with domain context and recommended action' },
    { stage: 'Decision',   actor: 'Admin',   description: 'Admin approves (accept deviation) or rejects (require corrective action) with documented reasoning' },
    { stage: 'Recursive',  actor: 'Manager/Admin', description: 'If rejected, manager resubmits with new justification — cycle repeats until approved or escalated' },
    { stage: 'Learning',   actor: 'AI',      description: 'AI incorporates approval patterns, rejection reasons, and manager comments to improve future recommendations' },
  ],
  severityLevels: {
    High:   { threshold: '> 7 days or > 10% variance on critical path', color: 'red',    priority: 1 },
    Medium: { threshold: '3-7 days or 5-10% variance',                  color: 'orange', priority: 2 },
    Low:    { threshold: '< 3 days or < 5% variance',                   color: 'yellow', priority: 3 },
  },
};

// ─── 6. DATA MODEL SCHEMA ──────────────────────────────────────────────────
// Complete data structures the AI works with

export const DATA_MODELS = {
  processedJob: {
    id: 'UUID',
    user_id: 'User who uploaded',
    filename: 'Original Excel filename',
    status: 'completed | error | processing',
    processed_at: 'ISO timestamp',
    results: '[{ tracker_name, status, output_path, error_message }]',
    success_count: 'Number of successfully processed trackers',
    error_count: 'Number of failed trackers',
  },
  deviation: {
    id: 'Auto-increment integer',
    sheet: 'Source sheet name',
    filename: 'Source file',
    description: 'Human-readable deviation description',
    severity: 'High | Medium | Low',
    review_status: 'pending | manager_reviewed | admin_approved | admin_rejected',
    reviewed_by: 'Reviewer user ID',
    admin_reason: 'Admin approval/rejection reason',
    row_data: 'JSON with activity_name, planned_date, actual_date, variance, etc.',
    detected_at: 'ISO timestamp',
    company_id: 'Company scope',
  },
  activityLog: {
    id: 'Auto-increment integer',
    action_type: 'One of ACTIVITY_TYPES keys',
    user_id: 'Acting user',
    user_name: 'Display name',
    user_role: 'user | manager | admin',
    company_id: 'Company scope',
    description: 'Human-readable event description',
    source: 'web | mobile',
    level: 'system | user | admin',
    metadata: 'JSON with action-specific data (prompt, response, reason, etc.)',
    timestamp: 'ISO timestamp',
    ip_address: 'Client IP',
  },
};

// ─── 7. AI LEARNING CONTEXT BUILDER ─────────────────────────────────────────
// Functions to build context that shapes AI responses

/**
 * Build a comprehensive learning context string from knowledge base data.
 * This is sent to the AI as additional system context so it "learns" from
 * historical decisions, comments, and patterns.
 */
export function buildAILearningContext(kbData) {
  if (!kbData) return '';

  const activities = kbData.recent_activities || [];
  const sections = [];

  // ── Deviation Decision Patterns ──
  const approvals = activities.filter(a => a.action_type === 'deviation_approve');
  const rejections = activities.filter(a => a.action_type === 'deviation_reject');
  const comments = activities.filter(a => a.action_type === 'deviation_comment');

  if (approvals.length > 0) {
    sections.push('## Approved Deviation Patterns');
    sections.push('These deviations were accepted by management — similar patterns should be treated as tolerable:');
    approvals.slice(0, 15).forEach(a => {
      const reason = a.metadata?.reason || a.metadata?.comment || 'No reason specified';
      const name = a.metadata?.activity_name || 'Unknown activity';
      sections.push(`- **${name}**: ${reason} (by ${a.user_name}, ${a.timestamp?.slice(0, 10)})`);
    });
  }

  if (rejections.length > 0) {
    sections.push('\n## Rejected Deviation Patterns');
    sections.push('These deviations were NOT accepted — AI should flag similar patterns as requiring corrective action:');
    rejections.slice(0, 15).forEach(a => {
      const reason = a.metadata?.reason || a.metadata?.comment || 'No reason specified';
      const name = a.metadata?.activity_name || 'Unknown activity';
      sections.push(`- **${name}**: Rejected because: ${reason} (by ${a.user_name}, ${a.timestamp?.slice(0, 10)})`);
    });
  }

  if (comments.length > 0) {
    sections.push('\n## Manager Domain Expertise (Comments)');
    sections.push('Insights and reasoning from project managers — AI should incorporate this domain knowledge:');
    comments.slice(0, 10).forEach(a => {
      const comment = a.metadata?.reason || a.metadata?.comment || a.description || '';
      sections.push(`- ${a.user_name}: "${comment}" (${a.timestamp?.slice(0, 10)})`);
    });
  }

  // ── Recent AI Interactions (successful patterns) ──
  const aiChats = activities.filter(a => a.action_type === 'ai_chat');
  if (aiChats.length > 0) {
    sections.push('\n## Recent AI Conversation Patterns');
    sections.push('Previous interactions showing what users commonly ask and expect:');
    aiChats.slice(0, 10).forEach(a => {
      const prompt = a.metadata?.prompt || '';
      const qp = a.metadata?.quick_prompt || '';
      if (prompt) {
        sections.push(`- User asked: "${prompt.slice(0, 150)}${prompt.length > 150 ? '...' : ''}" ${qp ? `[Quick action: ${qp}]` : ''}`);
      }
    });
  }

  // ── Processing History ──
  const processed = activities.filter(a => a.action_type === 'file_processed');
  if (processed.length > 0) {
    sections.push('\n## Recent Processing History');
    processed.slice(0, 5).forEach(a => {
      const meta = a.metadata || {};
      sections.push(`- ${meta.filename || 'File'}: ${meta.success_count || 0} trackers processed, ${meta.error_count || 0} errors (${a.timestamp?.slice(0, 10)})`);
    });
  }

  return sections.join('\n');
}

/**
 * Build dependency context from processed Excel data for AI consumption.
 * Extracts predecessor/successor relationships and critical path info.
 */
export function buildDependencyContext(analyticsData) {
  if (!analyticsData?.sheets) return '';

  const sections = [];
  
  for (const [sheetName, sheetData] of Object.entries(analyticsData.sheets)) {
    const rows = sheetData.rows || [];
    const headers = sheetData.headers || [];
    
    // Look for dependency-related columns
    const predCol = headers.findIndex(h => /predecessor/i.test(h));
    const succCol = headers.findIndex(h => /successor/i.test(h));
    const floatCol = headers.findIndex(h => /float|slack/i.test(h));
    const statusCol = headers.findIndex(h => /status|flag/i.test(h));
    const actIdCol = headers.findIndex(h => /activity.?id/i.test(h));
    const actNameCol = headers.findIndex(h => /activity.?name/i.test(h));

    if (predCol >= 0 || succCol >= 0 || floatCol >= 0) {
      sections.push(`\n### ${sheetName} Dependencies`);
      
      rows.slice(0, 50).forEach(row => {
        const parts = [];
        if (actIdCol >= 0 && row[actIdCol]) parts.push(`ID: ${row[actIdCol]}`);
        if (actNameCol >= 0 && row[actNameCol]) parts.push(`Name: ${row[actNameCol]}`);
        if (predCol >= 0 && row[predCol]) parts.push(`Predecessors: ${row[predCol]}`);
        if (succCol >= 0 && row[succCol]) parts.push(`Successors: ${row[succCol]}`);
        if (floatCol >= 0 && row[floatCol] !== undefined) parts.push(`Float: ${row[floatCol]}`);
        if (statusCol >= 0 && row[statusCol]) parts.push(`Status: ${row[statusCol]}`);
        if (parts.length > 0) sections.push(`- ${parts.join(' | ')}`);
      });
    }
  }

  return sections.join('\n');
}

/**
 * Get all algorithm names and descriptions as a flat summary for AI context.
 */
export function getAlgorithmSummary() {
  return ALGORITHMS.map(a => `• ${a.name}: ${a.description}`).join('\n');
}

/**
 * Format knowledge base data for display in the Activities Dependency > AI Module tab.
 * Groups data by category for structured viewing.
 */
export function formatKBForDisplay(kbData) {
  if (!kbData) return { algorithms: [], deviationPatterns: [], aiHistory: [], dependencies: [] };

  const activities = kbData.recent_activities || [];

  return {
    algorithms: ALGORITHMS,
    
    deviationPatterns: {
      approved: activities
        .filter(a => a.action_type === 'deviation_approve')
        .map(a => ({
          activityName: a.metadata?.activity_name || 'Unknown',
          reason: a.metadata?.reason || a.metadata?.comment || '—',
          approvedBy: a.user_name,
          date: a.timestamp?.slice(0, 10),
          severity: a.metadata?.severity || '—',
        })),
      rejected: activities
        .filter(a => a.action_type === 'deviation_reject')
        .map(a => ({
          activityName: a.metadata?.activity_name || 'Unknown',
          reason: a.metadata?.reason || a.metadata?.comment || '—',
          rejectedBy: a.user_name,
          date: a.timestamp?.slice(0, 10),
          severity: a.metadata?.severity || '—',
        })),
      comments: activities
        .filter(a => a.action_type === 'deviation_comment')
        .map(a => ({
          activityName: a.metadata?.activity_name || 'Unknown',
          comment: a.metadata?.reason || a.metadata?.comment || a.description || '—',
          by: a.user_name,
          date: a.timestamp?.slice(0, 10),
        })),
    },

    aiHistory: activities
      .filter(a => a.action_type === 'ai_chat')
      .map(a => ({
        user: a.user_name,
        prompt: a.metadata?.prompt || '',
        response: a.metadata?.response || '',
        quickAction: a.metadata?.quick_prompt || '',
        date: a.timestamp?.slice(0, 10),
      })),

    processingHistory: activities
      .filter(a => a.action_type === 'file_processed')
      .map(a => ({
        filename: a.metadata?.filename || 'Unknown',
        successCount: a.metadata?.success_count || 0,
        errorCount: a.metadata?.error_count || 0,
        processedBy: a.user_name,
        date: a.timestamp?.slice(0, 10),
      })),
  };
}

// ─── 8. QUICK REFERENCE — PULSE CONCEPTS ──────────────────────────────────────
// Domain knowledge for the AI to reference

export const PULSE_CONCEPTS = {
  earnedValue: {
    name: 'Earned Value Management (EVM)',
    formulas: {
      CPI: 'Cost Performance Index = EV / AC (> 1.0 is good)',
      SPI: 'Schedule Performance Index = EV / PV (> 1.0 is ahead)',
      CV:  'Cost Variance = EV - AC (positive is under budget)',
      SV:  'Schedule Variance = EV - PV (positive is ahead of schedule)',
      EAC: 'Estimate at Completion = BAC / CPI',
      ETC: 'Estimate to Complete = EAC - AC',
      VAC: 'Variance at Completion = BAC - EAC',
    },
  },
  criticalPathMethod: {
    name: 'Critical Path Method (CPM)',
    definition: 'Identifies the longest path of dependent activities determining minimum project duration.',
    terms: {
      ES: 'Early Start — earliest an activity can start',
      EF: 'Early Finish — earliest an activity can finish (ES + Duration)',
      LS: 'Late Start — latest an activity can start without delaying the project',
      LF: 'Late Finish — latest an activity can finish without delaying the project',
      TF: 'Total Float — LS - ES (0 = critical)',
      FF: 'Free Float — float without affecting successor early dates',
    },
  },
  sCurve: {
    name: 'S-Curve Analysis',
    description: 'Cumulative progress chart (planned vs actual) forming an S-shape. Used to track overall project health.',
    interpretation: {
      abovePlanned: 'Actual curve above planned = ahead of schedule',
      belowPlanned: 'Actual curve below planned = behind schedule',
      flatActual:   'Flat actual curve = stalled progress (investigation needed)',
      steepActual:  'Steep actual curve = accelerated recovery or front-loading',
    },
  },
  eddr: {
    name: 'Engineering Design Data Requirements (EDDR)',
    description: 'Structured list of all engineering deliverables required for a project, tracked from issue to approval.',
    stages: ['Issued for Review (IFR)', 'Issued for Approval (IFA)', 'Issued for Construction (IFC)', 'As-Built'],
  },
  rfsu: {
    name: 'Ready for Start Up (RFSU)',
    description: 'Milestone indicating a system has completed construction, pre-commissioning, and commissioning activities and is ready for startup.',
    prerequisites: ['Mechanical Completion', 'Pre-Commissioning Complete', 'Punch Items Cleared', 'Safety Checks Passed'],
  },
};

export default {
  ALGORITHMS,
  ACTIVITY_TYPES,
  AI_BEHAVIOR_RULES,
  DEPENDENCY_DEFINITIONS,
  DEVIATION_WORKFLOW,
  DATA_MODELS,
  PULSE_CONCEPTS,
  buildAILearningContext,
  buildDependencyContext,
  getAlgorithmSummary,
  formatKBForDisplay,
};
