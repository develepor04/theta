import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock3, GitCompareArrows, Menu, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { activityService, deviationService, historyService } from '../services/api';
import './Dashboard.css';

const ITInconsistency = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState([]);
  const [baseVersions, setBaseVersions] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [expandedSessionMap, setExpandedSessionMap] = useState({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const [historyResp, versionResp, deviationResp] = await Promise.allSettled([
          historyService.getAll(200),
          activityService.getBaseFileVersions(300),
          deviationService.getAll(),
        ]);

        if (!active) return;

        if (historyResp.status === 'fulfilled') {
          setHistoryItems(Array.isArray(historyResp.value) ? historyResp.value : []);
        } else {
          setHistoryItems([]);
          toast.error('Could not load processing timeline');
        }

        if (versionResp.status === 'fulfilled') {
          setBaseVersions(Array.isArray(versionResp.value?.versions) ? versionResp.value.versions : []);
        } else {
          setBaseVersions([]);
          toast.error('Could not load comparison inconsistencies');
        }

        if (deviationResp.status === 'fulfilled') {
          setDeviations(Array.isArray(deviationResp.value) ? deviationResp.value : []);
        } else {
          setDeviations([]);
          toast.error('Could not load activity-level delays');
        }
      } catch (err) {
        if (!active) return;
        setHistoryItems([]);
        setBaseVersions([]);
        setDeviations([]);
        toast.error('Could not load inconsistency data');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const timelineRows = useMemo(() => {
    const delayRegex = /(delay|delayed|late|overdue|slip|behind|critical)/i;
    const rows = (Array.isArray(deviations) ? deviations : [])
      .filter((d) => {
        const flag = String(d?.flag || '');
        const desc = String(d?.description || '');
        return delayRegex.test(flag) || delayRegex.test(desc);
      })
      .map((d) => {
        const rowData = d?.row_data || {};
        const activityName = rowData?.activity_name || rowData?.activity || rowData?.['Activity'] || 'Unknown activity';
        const activityCode = rowData?.activity_code || rowData?.['Activity code'] || rowData?.activity_id || '';
        const delayDays = rowData?.deviation || rowData?.['last planned date - Actual start date'] || '';
        return {
          id: d?.id,
          activityName,
          activityCode,
          sheet: d?.sheet || '—',
          severity: d?.severity || '—',
          reviewStatus: d?.review_status || 'Pending',
          description: d?.description || '',
          delayDays,
          detectedAt: d?.detected_at,
        };
      });

    rows.sort((a, b) => new Date(b?.detectedAt || 0).getTime() - new Date(a?.detectedAt || 0).getTime());
    return rows;
  }, [deviations]);

  const formatIssueLabel = (key) => {
    const map = {
      missing_activity_id_count: 'Missing Activity ID',
      duplicate_activity_id_count: 'Duplicate Activity ID',
      activity_not_found_in_base_count: 'Activity ID not found in base',
      ep_gt_lp_count: 'EP greater than LP',
      na_value_count: 'NA / empty-like value found',
      missing_ep_column: 'EP column missing',
      missing_lp_column: 'LP column missing',
    };
    return map[key] || key;
  };

  const sessionInconsistencyGroups = useMemo(() => {
    const historyList = Array.isArray(historyItems) ? historyItems : [];
    const versionList = Array.isArray(baseVersions) ? baseVersions : [];

    const groups = historyList.map((item) => {
      const reasons = [];
      const details = [];

      const derivedErrorCount = Number(item?.error_count || 0)
        || (Array.isArray(item?.results) ? item.results.filter((r) => r?.status === 'error').length : 0);
      const failedSheetCount = Array.isArray(item?.failed_sheets) ? item.failed_sheets.length : 0;
      const baseMerge = item?.base_merge || {};
      const mergeStatus = String(baseMerge?.status || '').toLowerCase();
      const mergeReason = String(baseMerge?.reason || '').trim();
      const summary = baseMerge?.inconsistency_summary || {};
      const mergeInconsistencyCount = Number(summary?.total_issues || 0);

      if (derivedErrorCount > 0) reasons.push(`${derivedErrorCount} tracker processing error(s)`);
      if (failedSheetCount > 0) reasons.push(`${failedSheetCount} sheet parsing/format failure(s)`);
      if (mergeStatus === 'error') reasons.push('Base merge failed');
      if (mergeStatus === 'skipped') reasons.push('Base merge skipped');
      if (mergeInconsistencyCount > 0) reasons.push(`${mergeInconsistencyCount} data-format inconsistency issue(s)`);
      if (mergeReason) reasons.push(mergeReason);

      const summaryEntries = [
        ['missing_activity_id_count', Number(summary?.missing_activity_id_count || 0)],
        ['duplicate_activity_id_count', Number(summary?.duplicate_activity_id_count || 0)],
        ['activity_not_found_in_base_count', Number(summary?.activity_not_found_in_base_count || 0)],
        ['ep_gt_lp_count', Number(summary?.ep_gt_lp_count || 0)],
        ['na_value_count', Number(summary?.na_value_count || 0)],
      ];

      summaryEntries.forEach(([key, value]) => {
        if (value > 0) reasons.push(`${formatIssueLabel(key)}: ${value}`);
      });
      if (summary?.missing_ep_column) reasons.push(formatIssueLabel('missing_ep_column'));
      if (summary?.missing_lp_column) reasons.push(formatIssueLabel('missing_lp_column'));

      const sampleGroups = summary?.samples || {};
      const mergedSamples = Object.values(sampleGroups)
        .flatMap((arr) => (Array.isArray(arr) ? arr : []))
        .slice(0, 5);
      if (mergedSamples.length > 0) {
        details.push({
          source: 'session-samples',
          title: 'Sample rows / values',
          timestamp: item?.processed_at,
          reasons: mergedSamples,
        });
      }

      const linkedVersions = versionList.filter((version) => {
        const jobId = String(version?.context?.job_id || '');
        return jobId && jobId === String(item?.id || '');
      });

      linkedVersions.forEach((version) => {
        const merge = version?.merge_summary || {};
        const summary = merge?.inconsistency_summary || {};
        const issueCount = Number(summary?.total_issues || 0);
        const highlights = Array.isArray(summary?.highlights) ? summary.highlights : [];
        if (issueCount <= 0 && highlights.length === 0) return;

        details.push({
          source: 'version-comparison',
          title: version?.version_id || 'Unknown version',
          timestamp: version?.created_at,
          reasons: highlights.length > 0 ? highlights : [`Inconsistency ${issueCount}`],
        });
      });

      if (reasons.length > 0) {
        details.unshift({
          source: 'upload-session',
          title: item?.filename || item?.id || 'Unknown session',
          timestamp: item?.processed_at,
          reasons,
        });
      }

      return {
        sessionId: item?.id,
        sessionTitle: item?.filename || item?.id || 'Unknown session',
        processedAt: item?.processed_at,
        issuesCount: details.reduce((acc, d) => acc + (Array.isArray(d?.reasons) ? d.reasons.length : 0), 0),
        details,
      };
    }).filter((group) => group.details.length > 0);

    return groups.sort((a, b) => new Date(b?.processedAt || 0).getTime() - new Date(a?.processedAt || 0).getTime());
  }, [historyItems, baseVersions]);

  const processingInconsistencies = useMemo(() => {
    // Backward-compatible summary count for empty-state logic
    return sessionInconsistencyGroups.reduce((acc, group) => acc + group.details.length, 0);
  }, [sessionInconsistencyGroups]);

  const toggleSessionExpanded = (sessionId) => {
    if (!sessionId) return;
    setExpandedSessionMap((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const formatDateTime = (isoText) => {
    if (!isoText) return '—';
    const dt = new Date(isoText);
    if (Number.isNaN(dt.getTime())) return isoText;
    return dt.toLocaleString();
  };

  return (
    <div className="dashboard-page">
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

      <div className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Timeline & Data Processing Inconsistency</h1>
            <p>
              Timeline shows delayed activities (individual level). Data Processing shows format and missing-data issues by session.
            </p>
          </div>
        </header>

        <div className="tracker-outputs-panel">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#2563eb" />
              <h3>Timeline & Data Processing Inconsistency</h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12 }}>
            <button
              className="base-versions-filter-btn"
              style={activeTab === 'timeline' ? { background: '#dbeafe', borderColor: '#93c5fd' } : undefined}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock3 size={13} /> Timeline
            </button>
            <button
              className="base-versions-filter-btn"
              style={activeTab === 'inconsistency' ? { background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' } : undefined}
              onClick={() => setActiveTab('inconsistency')}
            >
              <AlertTriangle size={13} /> Data Processing Inconsistency
            </button>
          </div>

          {loading ? (
            <div className="base-versions-empty">Loading inconsistency data...</div>
          ) : activeTab === 'timeline' ? (
            timelineRows.length === 0 ? (
              <div className="base-versions-empty">No delayed activity found.</div>
            ) : (
              <div className="base-versions-list">
                {timelineRows.map((item) => {
                  return (
                    <div className="base-version-item" key={item?.id || item?.detectedAt}>
                      <div className="base-version-main">
                        <div className="base-version-id">
                          {item?.activityName}
                          {item?.activityCode && (
                            <span className="base-version-badge base-version-badge-history">{item.activityCode}</span>
                          )}
                          <span className="base-version-merge-badge inconsistency">
                            Delayed Activity
                          </span>
                        </div>
                        <div className="base-version-meta">
                          <span>Detected: {formatDateTime(item?.detectedAt)}</span>
                          <span>Sheet: {item?.sheet || '—'}</span>
                          <span>Severity: {item?.severity || '—'}</span>
                          <span>Status: {item?.reviewStatus || 'Pending'}</span>
                          {item?.delayDays !== '' && item?.delayDays !== undefined && item?.delayDays !== null && (
                            <span>Delay: {item.delayDays} day(s)</span>
                          )}
                        </div>
                        {item?.description && (
                          <div className="base-version-note base-version-note-inconsistency">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : processingInconsistencies === 0 ? (
            <div className="base-versions-empty">No inconsistency detected in current sessions.</div>
          ) : (
            <div className="base-versions-list">
              {sessionInconsistencyGroups.map((group) => {
                const expanded = Boolean(expandedSessionMap[group.sessionId]);
                return (
                  <div className="base-version-item" key={group.sessionId || group.sessionTitle} style={{ display: 'block' }}>
                    <div className="base-version-main">
                      <div className="base-version-id" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span>
                          {group.sessionTitle}
                          <span className="base-version-merge-badge inconsistency" style={{ marginLeft: 8 }}>
                            {group.issuesCount} issue(s)
                          </span>
                        </span>
                        <button
                          className="base-version-view-btn"
                          onClick={() => toggleSessionExpanded(group.sessionId)}
                          style={{ padding: '4px 9px', fontSize: 11 }}
                        >
                          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {expanded ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <div className="base-version-meta">
                        <span>Session Time: {formatDateTime(group.processedAt)}</span>
                      </div>

                      {expanded && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {group.details.map((entry, idx) => (
                            <div key={`${group.sessionId}-detail-${idx}`} style={{ background: '#fff', border: '1px solid #eef2ff', borderRadius: 10, padding: '8px 10px' }}>
                              <div className="base-version-id" style={{ fontSize: 11 }}>
                                {entry.title}
                                <span className="base-version-badge base-version-badge-history">
                                  {entry.source === 'version-comparison' ? (
                                    <>
                                      <GitCompareArrows size={11} style={{ marginRight: 4, verticalAlign: 'text-top' }} />
                                      Comparison
                                    </>
                                  ) : 'Upload Session'}
                                </span>
                              </div>
                              <div className="base-version-meta">
                                <span>Time: {formatDateTime(entry.timestamp)}</span>
                              </div>
                              <div className="base-version-note base-version-note-inconsistency">
                                {(entry.reasons || []).slice(0, 6).join(' • ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ITInconsistency;
