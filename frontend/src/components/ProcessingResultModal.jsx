import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import './ProcessingResultModal.css';

const ProcessingResultModal = ({ result, onClose, onViewReports }) => {
  if (!result) return null;

  const { 
    jobId,
    filename, 
    successCount = 0, 
    errorCount = 0, 
    failedSheets = [],
    successSheets = [],
    trackerErrors = [],
    baseMerge = {},
    inconsistencySummary = {},
    inconsistencyEmail = null,
    message 
  } = result;

  const hasErrors = errorCount > 0 || failedSheets.length > 0 || trackerErrors.length > 0;
  const summaryHighlights = Array.isArray(inconsistencySummary?.highlights) ? inconsistencySummary.highlights : [];
  const sampleGroups = inconsistencySummary?.samples && typeof inconsistencySummary.samples === 'object'
    ? inconsistencySummary.samples
    : {};
  const flattenedSamples = Object.values(sampleGroups)
    .flatMap((arr) => (Array.isArray(arr) ? arr : []))
    .slice(0, 8);
  const inconsistencyTotal = Number(inconsistencySummary?.total_issues || 0);
  const mergeStatus = String(baseMerge?.status || '').toLowerCase();
  const mergeUpdated = Number(baseMerge?.updated_count || 0);
  const mergeAppended = Number(baseMerge?.appended_count || 0);
  const mergeColumns = Number(baseMerge?.new_columns_added || 0);
  const mergeHasData = !!baseMerge && Object.keys(baseMerge).length > 0;

  return (
    <div className="processing-modal-overlay" onClick={onClose}>
      <div className="processing-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`processing-modal-header ${hasErrors ? 'warning' : 'success'}`}>
          <div className="modal-header-content">
            {hasErrors ? (
              <AlertTriangle size={28} />
            ) : (
              <CheckCircle size={28} />
            )}
            <div>
              <h2>Processing Complete</h2>
              <p>{filename}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="processing-stats">
          <div className="stat-item success">
            <CheckCircle size={20} />
            <div>
              <span className="stat-value">{successCount}</span>
              <span className="stat-label">Processed</span>
            </div>
          </div>
          <div className="stat-item error">
            <AlertCircle size={20} />
            <div>
              <span className="stat-value">{errorCount}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
          {failedSheets.length > 0 && (
            <div className="stat-item warning">
              <AlertTriangle size={20} />
              <div>
                <span className="stat-value">{failedSheets.length}</span>
                <span className="stat-label">Template Mismatch</span>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="processing-message">
          <p>{message}</p>
          {jobId && <p className="processing-job-id">Job: {jobId}</p>}
          {inconsistencyEmail && (
            <p className={`processing-email-status ${inconsistencyEmail?.sent ? 'ok' : 'warn'}`}>
              Email status: {inconsistencyEmail?.sent ? 'Sent' : `Not sent (${inconsistencyEmail?.status || 'unknown'})`}
            </p>
          )}
        </div>

        {/* Base Merge Summary */}
        {mergeHasData && (
          <div className="sheets-section">
            <h3 className={`section-title ${mergeStatus === 'success' ? 'success' : 'warning'}`}>
              {mergeStatus === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              Base Merge Result
            </h3>
            <div className="processing-highlight-list">
              <div className="processing-highlight-item">Status: {baseMerge.status || 'unknown'}</div>
              <div className="processing-highlight-item">Updated Activities: {mergeUpdated}</div>
              <div className="processing-highlight-item">Appended Activities: {mergeAppended}</div>
              <div className="processing-highlight-item">New Columns Added: {mergeColumns}</div>
              {baseMerge?.comparison_base_file && (
                <div className="processing-highlight-item">Compared Against: {baseMerge.comparison_base_file}</div>
              )}
              {baseMerge?.reason && (
                <div className="processing-highlight-item">Reason: {baseMerge.reason}</div>
              )}
            </div>
          </div>
        )}

        {/* Successful Sheets */}
        {successSheets.length > 0 && (
          <div className="sheets-section">
            <h3 className="section-title success">
              <CheckCircle size={18} />
              Successfully Processed ({successSheets.length})
            </h3>
            <div className="sheets-list">
              {successSheets.map((sheet, idx) => (
                <div key={idx} className="sheet-item success">
                  <FileSpreadsheet size={16} />
                  <span className="sheet-name">{sheet.sheet_name || sheet}</span>
                  {sheet.description && (
                    <span className="sheet-description">{sheet.description}</span>
                  )}
                  <CheckCircle size={16} className="sheet-icon" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Sheets - Template Mismatch */}
        {failedSheets.length > 0 && (
          <div className="sheets-section">
            <h3 className="section-title warning">
              <AlertTriangle size={18} />
              Cannot Process - Template Mismatch ({failedSheets.length})
            </h3>
            <div className="sheets-list">
              {failedSheets.map((sheet, idx) => (
                <div key={idx} className="sheet-item warning">
                  <FileSpreadsheet size={16} />
                  <div className="sheet-details">
                    <span className="sheet-name">{sheet.sheet_name}</span>
                    <span className="sheet-error">{sheet.error || sheet.reason || 'Template format not recognized'}</span>
                  </div>
                  <AlertTriangle size={16} className="sheet-icon" />
                </div>
              ))}
            </div>
            <div className="warning-box">
              <AlertTriangle size={18} />
              <div>
                <strong>These sheets don't follow our standard templates</strong>
                <p>Please ensure your Excel file matches one of the supported formats: EDDR, Project Management, Weekly EDDR Cont, or HO Subcontract.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tracker Processing Errors */}
        {trackerErrors.length > 0 && (
          <div className="sheets-section">
            <h3 className="section-title error">
              <AlertCircle size={18} />
              Detailed Processing Errors ({trackerErrors.length})
            </h3>
            <div className="sheets-list">
              {trackerErrors.map((err, idx) => (
                <div key={idx} className="sheet-item error">
                  <FileSpreadsheet size={16} />
                  <div className="sheet-details">
                    <span className="sheet-name">{err.sheet_name || 'Unknown sheet'}</span>
                    <span className="sheet-error">{err.error || 'Unknown processing error'}</span>
                  </div>
                  <AlertCircle size={16} className="sheet-icon" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Inconsistency Summary */}
        {(inconsistencyTotal > 0 || summaryHighlights.length > 0 || flattenedSamples.length > 0) && (
          <div className="sheets-section">
            <h3 className="section-title warning">
              <AlertTriangle size={18} />
              Data Inconsistency Details {inconsistencyTotal > 0 ? `(${inconsistencyTotal})` : ''}
            </h3>

            {summaryHighlights.length > 0 && (
              <div className="processing-highlight-list">
                {summaryHighlights.map((line, idx) => (
                  <div className="processing-highlight-item" key={`highlight-${idx}`}>{line}</div>
                ))}
              </div>
            )}

            {flattenedSamples.length > 0 && (
              <div className="sheets-list" style={{ marginTop: 12 }}>
                {flattenedSamples.map((sample, idx) => (
                  <div key={`sample-${idx}`} className="sheet-item warning">
                    <AlertTriangle size={14} />
                    <span className="sheet-name">{sample}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="processing-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-secondary" onClick={() => { onClose(); onViewReports?.(); }}>
            View Reports &amp; Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingResultModal;
