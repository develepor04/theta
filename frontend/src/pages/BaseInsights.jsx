import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileSpreadsheet, History, Menu, RefreshCw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import SCurveAnalytics from '../components/SCurveAnalytics';
import { activityService } from '../services/api';
import './BaseInsights.css';

const BaseInsights = () => {
  const PREVIEW_FETCH_MAX_ROWS = 300;
  const PREVIEW_RENDER_STEP = 150;
  const navigate = useNavigate();
  const location = useLocation();
  const isDirectViewCurrentBase = Boolean(location?.state?.directViewCurrentBase);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [baseFileInfo, setBaseFileInfo] = useState(null);
  const [baseVersions, setBaseVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionsMeta, setVersionsMeta] = useState({ total: 0, total_all: 0, fallback_to_all: false });
  const [refreshingVersions, setRefreshingVersions] = useState(false);
  const [downloadingVersionId, setDownloadingVersionId] = useState('');
  const [deletingVersionId, setDeletingVersionId] = useState('');
  const [downloadingCurrentBase, setDownloadingCurrentBase] = useState(false);
  const [viewingCurrentBase, setViewingCurrentBase] = useState(false);
  const [viewingVersionId, setViewingVersionId] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);
  const [previewRenderCount, setPreviewRenderCount] = useState(PREVIEW_RENDER_STEP);
  const [showBeforeMergeSnapshots, setShowBeforeMergeSnapshots] = useState(false);
  const [hasAutoLoadedDirectView, setHasAutoLoadedDirectView] = useState(false);
  const [showAllKbSCurve, setShowAllKbSCurve] = useState(false);

  const visibleVersions = baseVersions.filter((version) => {
    const stage = String(version?.stage || 'snapshot').toLowerCase();
    return showBeforeMergeSnapshots || stage !== 'before_merge';
  });

  const latestChangedVersion = baseVersions.find((version) => {
    const merge = version?.merge_summary || {};
    return (
      Number(merge?.updated_count || 0) > 0 ||
      Number(merge?.appended_count || 0) > 0 ||
      Number(merge?.new_columns_added || 0) > 0
    );
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setVersionsLoading(true);
        const [baseFileRes, versionsRes] = await Promise.allSettled([
          activityService.getBaseFile(),
          activityService.getBaseFileVersions(200),
        ]);
        if (!active) return;
        if (baseFileRes.status === 'fulfilled') {
          const data = baseFileRes.value;
          setBaseFileInfo(data?.base_file || null);
        } else {
          setBaseFileInfo(null);
          toast.error('Could not load current base-file details');
        }

        if (versionsRes.status === 'fulfilled') {
          const versionsResp = versionsRes.value;
          setBaseVersions(Array.isArray(versionsResp?.versions) ? versionsResp.versions : []);
          setVersionsMeta({
            total: Number(versionsResp?.total || 0),
            total_all: Number(versionsResp?.total_all || 0),
            fallback_to_all: Boolean(versionsResp?.fallback_to_all),
          });
        } else {
          setBaseVersions([]);
          setVersionsMeta({ total: 0, total_all: 0, fallback_to_all: false });
          toast.error('Could not load base-file versions');
        }
      } catch (err) {
        if (!active) return;
        toast.error('Could not load base insights');
        setBaseVersions([]);
      } finally {
        if (active) {
          setLoading(false);
          setVersionsLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirectViewCurrentBase) return;
    if (hasAutoLoadedDirectView) return;
    if (loading || versionsLoading) return;

    setHasAutoLoadedDirectView(true);
    handleViewCurrentBase();
  }, [isDirectViewCurrentBase, hasAutoLoadedDirectView, loading, versionsLoading]);

  const reloadVersions = async (silent = false) => {
    try {
      if (!silent) setRefreshingVersions(true);
      const versionsResp = await activityService.getBaseFileVersions(400);
      setBaseVersions(Array.isArray(versionsResp?.versions) ? versionsResp.versions : []);
      setVersionsMeta({
        total: Number(versionsResp?.total || 0),
        total_all: Number(versionsResp?.total_all || 0),
        fallback_to_all: Boolean(versionsResp?.fallback_to_all),
      });
      if (!silent) toast.success('Version list refreshed');
    } catch (err) {
      if (!silent) toast.error('Could not refresh versions');
    } finally {
      if (!silent) setRefreshingVersions(false);
    }
  };

  const handleDownloadVersion = async (versionId) => {
    if (!versionId) return;
    try {
      setDownloadingVersionId(versionId);
      await activityService.downloadBaseFileVersion(versionId);
      toast.success('Base file version downloaded');
    } catch (err) {
      toast.error('Could not download selected version');
    } finally {
      setDownloadingVersionId('');
    }
  };

  const handleDownloadCurrentBase = async () => {
    try {
      setDownloadingCurrentBase(true);
      await activityService.downloadCurrentBaseFile();
      toast.success('Current base file downloaded');
    } catch (err) {
      toast.error('Could not download current base file');
    } finally {
      setDownloadingCurrentBase(false);
    }
  };

  const handleDeleteVersion = async (versionId) => {
    if (!versionId) return;
    const ok = window.confirm('Delete this base-file version snapshot permanently?');
    if (!ok) return;

    try {
      setDeletingVersionId(versionId);
      await activityService.deleteBaseFileVersion(versionId);

      if (previewSource?.type === 'version' && previewSource?.versionId === versionId) {
        setPreviewSource(null);
        setPreviewData(null);
      }

      await reloadVersions(true);
      toast.success('Version deleted');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not delete selected version';
      toast.error(msg);
    } finally {
      setDeletingVersionId('');
    }
  };

  const formatDateTime = (isoText) => {
    if (!isoText) return '—';
    const dt = new Date(isoText);
    if (Number.isNaN(dt.getTime())) return isoText;
    return dt.toLocaleString();
  };

  const handleViewCurrentBase = async (sheetName = '') => {
    try {
      setViewingCurrentBase(true);
      setPreviewLoading(true);
      const payload = await activityService.viewCurrentBaseFile(sheetName, PREVIEW_FETCH_MAX_ROWS);
      setPreviewData(payload);
      setPreviewSource({ type: 'current' });
      setPreviewRenderCount(PREVIEW_RENDER_STEP);
    } catch (err) {
      toast.error('Could not load current base file preview');
    } finally {
      setViewingCurrentBase(false);
      setPreviewLoading(false);
    }
  };

  const handleViewVersion = async (versionId, sheetName = '') => {
    if (!versionId) return;
    try {
      setViewingVersionId(versionId);
      setPreviewLoading(true);
      const payload = await activityService.viewBaseFileVersion(versionId, sheetName, PREVIEW_FETCH_MAX_ROWS);
      setPreviewData(payload);
      setPreviewSource({ type: 'version', versionId });
      setPreviewRenderCount(PREVIEW_RENDER_STEP);
    } catch (err) {
      toast.error('Could not load selected version preview');
    } finally {
      setViewingVersionId('');
      setPreviewLoading(false);
    }
  };

  const handlePreviewSheetChange = async (sheetName) => {
    if (!sheetName || !previewSource) return;
    if (previewSource.type === 'current') {
      await handleViewCurrentBase(sheetName);
    } else if (previewSource.type === 'version') {
      await handleViewVersion(previewSource.versionId, sheetName);
    }
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

      <div className={`mobile-sidebar-overlay ...`} onClick={() => setIsMobileMenuOpen(false)} />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* S-Curve overlay — rendered at page root so nothing clips it */}
      {showAllKbSCurve && (
        <SCurveAnalytics
          jobId="base-all-kb-files"
          filename="Knowledgebase Files"
          baselineOnly
          compareAllKnowledgebaseFiles
          onClose={() => setShowAllKbSCurve(false)}
        />
      )}

      <div className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Base File Insights</h1>

            <p>
              {isDirectViewCurrentBase
                ? 'Direct base-file data view (Version 1 / Current baseline).'
                : 'Dedicated view for base-file S-curve and full base-file data.'}
            </p>
          </div>
          <button className="base-data-toggle-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </header>

        <div className="tracker-outputs-panel" style={{ marginBottom: '18px' }}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#10b981" />
              <h3>Knowledgebase Compare</h3>
            </div>
            <button
              className="base-data-toggle-btn"
              onClick={() => setShowAllKbSCurve(true)}
            >
              Open All KB Files S-curve
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Compare every loaded Knowledgebase workbook and render all plottable S-curves together.
          </div>
        </div>

        <div className="tracker-outputs-panel">
          {!isDirectViewCurrentBase && (
            <>
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={20} color="#2563eb" />
                  <h3>Version List</h3>
                </div>
                <div className="base-versions-summary">
                  <span>Select a version and click View to load data</span>
                </div>
              </div>

              <div className="base-versions-card">
                <div className="base-versions-header">
                  <div className="base-versions-title">
                    <History size={18} color="#2563eb" />
                    <strong>Base File List (Current + Versions)</strong>
                  </div>
                  <div className="base-versions-summary">
                    <span>{1 + visibleVersions.length} item(s)</span>
                    <button
                      className={`base-versions-filter-btn ${showBeforeMergeSnapshots ? 'active' : ''}`}
                      onClick={() => setShowBeforeMergeSnapshots((prev) => !prev)}
                      disabled={versionsLoading}
                    >
                      {showBeforeMergeSnapshots ? 'Hide before-merge' : 'Show before-merge'}
                    </button>
                    <button
                      className="base-versions-refresh-btn"
                      onClick={() => reloadVersions(false)}
                      disabled={refreshingVersions || versionsLoading}
                    >
                      <RefreshCw size={13} className={refreshingVersions ? 'spin' : ''} />
                      {refreshingVersions ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {versionsMeta.fallback_to_all && (
                  <div className="base-versions-note">
                    Showing all version entries (base filename filter fallback applied).
                  </div>
                )}

                {latestChangedVersion && (
                  <div className="base-versions-note base-versions-note-strong">
                    Latest changed version: <strong>{latestChangedVersion.version_id}</strong>
                  </div>
                )}

                {!latestChangedVersion && !versionsLoading && (
                  <div className="base-versions-note base-versions-note-strong">
                    No merge with appended/updated rows found in current list.
                  </div>
                )}

                <div className={`base-version-item base-version-current ${previewSource?.type === 'current' ? 'base-version-item-active' : ''}`}>
                  <div className="base-version-main">
                    <div className="base-version-id">
                      {baseFileInfo?.filename || 'Current Base File'}
                      <span className="base-version-badge">Current</span>
                    </div>
                    <div className="base-version-meta">
                      <span>Used for Base S-Curve: Yes</span>
                      <span>Last Updated: {formatDateTime(baseFileInfo?.updated_at)}</span>
                    </div>
                  </div>
                  <div className="base-version-actions">
                    <button
                      className="base-version-view-btn"
                      onClick={() => handleViewCurrentBase()}
                      disabled={viewingCurrentBase || previewLoading}
                    >
                      <Eye size={14} />
                      {viewingCurrentBase ? 'Loading...' : 'View'}
                    </button>
                    <button
                      className="base-version-download-btn"
                      onClick={handleDownloadCurrentBase}
                      disabled={downloadingCurrentBase}
                    >
                      <Download size={14} />
                      {downloadingCurrentBase ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                </div>

                {loading || versionsLoading ? (
                  <div className="base-versions-empty">Loading versions...</div>
                ) : visibleVersions.length === 0 ? (
                  <div className="base-versions-empty">No historical versions yet. Upload + merge creates snapshots automatically.</div>
                ) : (
                  <div className="base-versions-list">
                    {visibleVersions.map((version) => {
                      const merge = version?.merge_summary || {};
                      const inconsistency = merge?.inconsistency_summary || {};
                      const isDownloading = downloadingVersionId === version.version_id;
                      const isDeleting = deletingVersionId === version.version_id;
                      const stage = version?.stage || 'snapshot';
                      const hasChanges =
                        Number(merge?.updated_count || 0) > 0 ||
                        Number(merge?.appended_count || 0) > 0 ||
                        Number(merge?.new_columns_added || 0) > 0;
                      const inconsistencyCount = Number(inconsistency?.total_issues || 0);
                      const hasInconsistency = inconsistencyCount > 0;
                      const inconsistencyHighlights = Array.isArray(inconsistency?.highlights)
                        ? inconsistency.highlights.slice(0, 3)
                        : [];
                      return (
                        <div
                          className={`base-version-item ${previewSource?.type === 'version' && previewSource?.versionId === version.version_id ? 'base-version-item-active' : ''}`}
                          key={version.version_id}
                        >
                          <div className="base-version-main">
                            <div className="base-version-id">
                              {version.version_id}
                              <span className="base-version-badge base-version-badge-history">History</span>
                              <span className={`base-version-merge-badge ${hasChanges ? 'changed' : 'unchanged'}`}>
                                {hasChanges ? 'Changed' : 'No Change'}
                              </span>
                              <span className={`base-version-merge-badge ${hasInconsistency ? 'inconsistency' : 'clear'}`}>
                                Inconsistency {inconsistencyCount}
                              </span>
                            </div>
                            <div className="base-version-meta">
                              <span>Stage: {stage}</span>
                              <span>Created: {formatDateTime(version.created_at)}</span>
                              <span>Updated: {merge.updated_count || 0}</span>
                              <span>Appended: {merge.appended_count || 0}</span>
                              <span>New Columns: {merge.new_columns_added || 0}</span>
                            </div>
                            {inconsistencyHighlights.length > 0 && (
                              <div className="base-version-note base-version-note-inconsistency">
                                {inconsistencyHighlights.join(' • ')}
                              </div>
                            )}
                          </div>
                          <div className="base-version-actions">
                            <button
                              className="base-version-view-btn"
                              onClick={() => handleViewVersion(version.version_id)}
                              disabled={viewingVersionId === version.version_id || previewLoading || isDeleting}
                            >
                              <Eye size={14} />
                              {viewingVersionId === version.version_id ? 'Loading...' : 'View'}
                            </button>
                            <button
                              className="base-version-download-btn"
                              onClick={() => handleDownloadVersion(version.version_id)}
                              disabled={isDownloading || isDeleting}
                            >
                              <Download size={14} />
                              {isDownloading ? 'Downloading...' : 'Download'}
                            </button>
                            <button
                              className="base-version-delete-btn"
                              onClick={() => handleDeleteVersion(version.version_id)}
                              disabled={isDeleting || isDownloading}
                            >
                              <Trash2 size={14} />
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!previewLoading && !previewData && (
            <div className="base-versions-empty base-preview-empty-state">
              {isDirectViewCurrentBase
                ? 'Loading base-file data...'
                : (
                  <>
                    Pick a row from the list above and click <strong>View</strong>.
                    Data table will appear here.
                  </>
                )}
            </div>
          )}

          {(previewLoading || previewData) && (
            <div className="base-table-card">
              <div className="base-table-head">
                <strong>
                  {previewSource?.type === 'version'
                    ? `Version Preview: ${previewData?.version?.version_id || ''}`
                    : 'Current Base File Preview'}
                </strong>
                <div className="base-preview-head-actions">
                  {Array.isArray(previewData?.available_sheets) && previewData.available_sheets.length > 1 && (
                    <select
                      className="base-sheet-select"
                      value={previewData?.sheet_name || ''}
                      onChange={(e) => handlePreviewSheetChange(e.target.value)}
                    >
                      {previewData.available_sheets.map((sheet) => (
                        <option key={sheet} value={sheet}>{sheet}</option>
                      ))}
                    </select>
                  )}
                  <span>
                    Rows: {Math.min(previewRenderCount, Number(previewData?.row_count || 0))}
                    {Number(previewData?.total_rows || 0) > Number(previewData?.row_count || 0)
                      ? ` / ${previewData.total_rows}`
                      : ''}
                  </span>
                </div>
              </div>
              {previewLoading ? (
                <div className="base-versions-empty">Loading preview...</div>
              ) : (
                <div className="base-table-wrap">
                  <table className="base-table">
                    <thead>
                      <tr>
                        {(previewData?.headers || []).map((h, idx) => (
                          <th key={`preview-h-${idx}`}>{String(h || '').trim() || `Column ${idx + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData?.rows || []).slice(0, previewRenderCount).map((row, rIdx) => (
                        <tr key={`preview-r-${rIdx}`}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={`preview-c-${rIdx}-${cIdx}`}
                              title={cell === null || cell === undefined ? '' : String(cell)}
                            >
                              {cell === null || cell === undefined || String(cell).trim() === '' ? '—' : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!previewLoading && Array.isArray(previewData?.rows) && previewData.rows.length > previewRenderCount && (
                <div className="base-versions-empty" style={{ borderTop: '1px solid #eef3fb' }}>
                  Showing {previewRenderCount} of {previewData.rows.length} loaded rows
                  <button
                    className="base-version-view-btn"
                    style={{ marginLeft: 10 }}
                    onClick={() => setPreviewRenderCount((prev) => Math.min(prev + PREVIEW_RENDER_STEP, previewData.rows.length))}
                  >
                    Show More
                  </button>
                </div>
              )}
              {!previewLoading && Boolean(previewData?.has_more_rows) && (
                <div className="base-versions-empty" style={{ borderTop: '1px dashed #dbe2f2' }}>
                  For speed, preview is capped to first {previewData?.row_count || PREVIEW_FETCH_MAX_ROWS} rows.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseInsights;
