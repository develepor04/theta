import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Eye,
  TrendingUp,
  Loader2,
  Menu,
  Trash2,
  BarChart2,
  RefreshCw,
  ShieldAlert,
  Image,
  ChevronDown,
  Layers,
  EyeOff,
  Link2,
  KeyRound,
  FolderOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useStore from '../store/useStore';
import { fileService, historyService, sheetService } from '../services/api';
import SCurveAnalytics from '../components/SCurveAnalytics';
import ProcessingResultModal from '../components/ProcessingResultModal';
import ExcelViewer from '../components/ExcelViewer';
import Sidebar from '../components/Sidebar';
import SpreadsheetEditor from '../components/SpreadsheetEditor';
import ThetaReportView from '../components/ThetaReportView';
import { blankGrid } from '../utils/sheetDataUtils';
import { validateSheetGrid } from '../utils/thetaValidation';
import useIsMobile from '../hooks/useIsMobile';
import { getMsalInstance, isMsalConfigured } from '../services/msalConfig';
import './Dashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Required columns every uploaded file must contain
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_COLUMNS = [
  'Activity ID',
  'Activity Name',
  'Start',
  'Finish',
  'Early Start',
  'Early Finish',
  'Late Start',
  'Late Finish',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, '0');
  const mm    = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}, ${hh}:${mm}`;
};

const toTitleCase = (str) => {
  if (!str) return str;
  const dotIdx = str.lastIndexOf('.');
  const hasExt = dotIdx > 0;
  const ext  = hasExt ? str.slice(dotIdx) : '';
  const name = hasExt ? str.slice(0, dotIdx) : str;
  return name.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) + ext;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const SAMPLE_ROWS = [
  { 'Activity ID': 'A1000', 'Activity Name': 'Site Mobilization',   'Start': '2024-01-15', 'Finish': '2024-02-10', 'Early Start': '2024-01-15', 'Early Finish': '2024-02-10', 'Late Start': '2024-01-10', 'Late Finish': '2024-02-15', 'Total Float': 5,   'Duration': 26,  'Baseline Start': '2024-01-10', 'Baseline Finish': '2024-02-08', '% Complete': 100 },
  { 'Activity ID': 'A1010', 'Activity Name': 'Foundation Works',     'Start': '2024-02-11', 'Finish': '2024-04-20', 'Early Start': '2024-02-11', 'Early Finish': '2024-04-20', 'Late Start': '2024-02-05', 'Late Finish': '2024-04-25', 'Total Float': 5,   'Duration': 69,  'Baseline Start': '2024-02-05', 'Baseline Finish': '2024-04-15', '% Complete': 80  },
  { 'Activity ID': 'A1020', 'Activity Name': 'Structural Steel',     'Start': '2024-04-21', 'Finish': '2024-07-15', 'Early Start': '2024-04-21', 'Early Finish': '2024-07-15', 'Late Start': '2024-04-18', 'Late Finish': '2024-07-20', 'Total Float': 5,   'Duration': 85,  'Baseline Start': '2024-04-18', 'Baseline Finish': '2024-07-10', '% Complete': 40  },
  { 'Activity ID': 'A1030', 'Activity Name': 'MEP Rough-In',         'Start': '2024-06-01', 'Finish': '2024-09-30', 'Early Start': '2024-06-01', 'Early Finish': '2024-09-30', 'Late Start': '2024-06-01', 'Late Finish': '2024-09-30', 'Total Float': 0,   'Duration': 122, 'Baseline Start': '2024-05-25', 'Baseline Finish': '2024-09-20', '% Complete': 15  },
  { 'Activity ID': 'A1040', 'Activity Name': 'Facade Installation',  'Start': '2024-08-01', 'Finish': '2024-11-15', 'Early Start': '2024-08-01', 'Early Finish': '2024-11-15', 'Late Start': '2024-07-28', 'Late Finish': '2024-11-20', 'Total Float': 5,   'Duration': 107, 'Baseline Start': '2024-07-28', 'Baseline Finish': '2024-11-10', '% Complete': 0   },
  { 'Activity ID': 'A1050', 'Activity Name': 'Interior Fitout',      'Start': '2024-10-01', 'Finish': '2025-02-28', 'Early Start': '2024-10-01', 'Early Finish': '2025-02-28', 'Late Start': '2024-10-01', 'Late Finish': '2025-02-28', 'Total Float': 0,   'Duration': 150, 'Baseline Start': '2024-09-25', 'Baseline Finish': '2025-02-20', '% Complete': 0   },
  { 'Activity ID': 'A1060', 'Activity Name': 'Commissioning & Test', 'Start': '2025-02-01', 'Finish': '2025-03-31', 'Early Start': '2025-02-01', 'Early Finish': '2025-03-31', 'Late Start': '2025-02-01', 'Late Finish': '2025-03-31', 'Total Float': 0,   'Duration': 58,  'Baseline Start': '2025-01-25', 'Baseline Finish': '2025-03-25', '% Complete': 0   },
];

const generateAndDownloadSample = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS);
  ws['!cols'] = Object.keys(SAMPLE_ROWS[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Project Schedule');
  XLSX.writeFile(wb, 'sample_project_file.xlsx');
};

// Convert a Theta Sheets grid ({ sheets: [{ name, headers, rows }] }) into a
// real .xlsx File so it can go through the same upload/transform pipeline as
// a normal file upload.
const gridToXlsxFile = (gridData, fileName = 'Theta Sheets.xlsx') => {
  const sheets = gridData?.sheets || [];
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const aoa = [s.headers || [], ...(s.rows || [])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, (s.name || 'Sheet1').slice(0, 31));
  });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([wbout], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

// Locate the real header row within a raw sheet_to_json({header:1}) array.
// Exported schedule workbooks routinely prefix the header row with a title
// row and a description row (each with only one populated cell), so the
// header row can't be assumed to be row 0 -- it's whichever of the first
// N rows has the most non-empty cells.
const findHeaderRowIndex = (raw, scanRows = 10) => {
  let bestIdx = 0;
  let bestCount = -1;
  for (let i = 0; i < Math.min(scanRows, raw.length); i++) {
    const count = (raw[i] || []).filter(c => String(c ?? '').trim() !== '').length;
    if (count > bestCount) {
      bestCount = count;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const parseSheetWithHeaderDetection = (ws, name) => {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = findHeaderRowIndex(raw);
  const headers = (raw[headerIdx] || []).map(h => String(h).trim());
  const rows = raw.slice(headerIdx + 1).filter(row => row.some(c => String(c ?? '').trim() !== ''));
  return { name, headers, rows };
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    uploadedFiles,
    addUploadedFile,
    removeUploadedFile,
    clearUploadedFiles,
    setProcessing,
    isProcessing,
    history,
    setHistory,
    currentJobId,
    liveJob,
    allOutputResults,
    activeTrackerName,
    processingResult,
    setCurrentJobId,
    setLiveJob,
    setAllOutputResults,
    setActiveTrackerName,
    setProcessingResult,
    loadOutputPreview,
    startJobPolling,
  } = useStore();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isMobileMenuOpen, setIsMobileMenuOpen]   = useState(false);
  const [showUploadModal, setShowUploadModal]       = useState(false);
  const [isDragging, setIsDragging]                 = useState(false);
  const [uploadProgress, setUploadProgress]         = useState({});
  const [structureWarning, setStructureWarning]     = useState(null);
  const [showSampleModal, setShowSampleModal]       = useState(false);
  const [sampleModalTab, setSampleModalTab]         = useState('excel');

  // ── Theta Sheets live editor ──────────────────────────────────────────────
  const [showThetaEditor, setShowThetaEditor]       = useState(false);
  const [thetaEditorLoading, setThetaEditorLoading] = useState(false);
  const [activeSheetId, setActiveSheetId]           = useState(null);
  const [activeSheetVersion, setActiveSheetVersion] = useState(null);
  const [activeSheetData, setActiveSheetData]       = useState(null);
  const [thetaEditorValidation, setThetaEditorValidation] = useState(null);
  const liveSheetGridRef = useRef(null);
  const spreadsheetEditorRef = useRef(null);

  // ── Validation report modal (shared between the browser's Save step and
  // the live editor's non-blocking warning banner) ─────────────────────────
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [validationReportErrors, setValidationReportErrors] = useState([]);

  // ── Theta Sheets web browser (Browse Theta Sheets: pick a workbook already
  // uploaded to the server from the job/upload history list, choose which
  // sheet(s) inside it to load, edit in place) ──────────────────────────────
  const [showThetaBrowser, setShowThetaBrowser]       = useState(false);
  const [thetaBrowserStep, setThetaBrowserStep]       = useState('pickFile'); // 'pickFile' | 'pickSheets'
  const [thetaSourcePicking, setThetaSourcePicking]   = useState(false);
  const [thetaBrowserFileName, setThetaBrowserFileName] = useState('');
  const [thetaBrowserSheets, setThetaBrowserSheets]   = useState([]); // [{name, headers, rows}]
  const [thetaBrowserSelected, setThetaBrowserSelected] = useState([]); // sheet names
  const [thetaBrowserPreviewIdx, setThetaBrowserPreviewIdx] = useState(0);
  const thetaBrowserEditorRef = useRef(null);
  // Save -> View Reports: once saved with no edits since, the footer button
  // becomes "View Reports" instead of "Save"; any further edit flips it back.
  const [thetaJustSaved, setThetaJustSaved]           = useState(false);
  const [showThetaReports, setShowThetaReports]       = useState(false);
  const thetaLocalFileInputRef = useRef(null);

  // ── OEM dropdown ──────────────────────────────────────────────────────────
  const [showOemMenu, setShowOemMenu]               = useState(false);
  const [selectedOem, setSelectedOem]               = useState(null);
  const oemMenuRef = useRef(null);

  // ── Get Data wizard ──────────────────────────────────────────────────────
  const [getDataStep, setGetDataStep]       = useState('catalog'); // 'catalog' | 'link' | 'configure'
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingDone, setProcessingDone] = useState(false);
  const [linkMode, setLinkMode]             = useState('link');    // 'link' | 'upload'
  const [linkUrl, setLinkUrl]               = useState('');

  // ── OEM catalog modal (step 1 — "Select a tool") ─────────────────────────
  const [showOemCatalog, setShowOemCatalog]         = useState(false);
  const [catalogTab, setCatalogTab]                 = useState('custom');
  const [catalogSearch, setCatalogSearch]           = useState('');
  const [catalogSelected, setCatalogSelected]       = useState(null); // card selected in catalog tab

  const OEM_OPTIONS = ['Primavera', 'MS Project', 'SAP'];

  // ── OEM "Connect the tool" simulation (frontend only) ─────────────────────
  const [connectedOems, setConnectedOems]           = useState([]);   // names already "connected"
  const [oemConnectTarget, setOemConnectTarget]     = useState(null); // name of OEM currently in the connect modal
  const [isConnectingOem, setIsConnectingOem]       = useState(false);
  const [showBearerToken, setShowBearerToken]       = useState(false);
  const [oemForm, setOemForm] = useState({
    name: '', endpoint: '', param1: '', param2: '', authType: 'Key-based', bearer: '',
  });

  // ── OneDrive file picker ──────────────────────────────────────────────────
  const [showOneDrivePicker, setShowOneDrivePicker] = useState(false);
  const [oneDriveLoading, setOneDriveLoading]       = useState(false);
  const [oneDriveItems, setOneDriveItems]           = useState([]);
  const [oneDrivePath, setOneDrivePath]             = useState([]); // [{id, name}]
  const [oneDriveToken, setOneDriveToken]           = useState(null);
  const [oneDriveSelectedItem, setOneDriveSelectedItem] = useState(null); // {id, name} of picked file
  const [isConnectingTheta, setIsConnectingTheta]   = useState(false);
  const [oneDrivePickerSource, setOneDrivePickerSource] = useState('theta'); // 'theta' | 'configured'

  const OEM_ENDPOINT_PLACEHOLDERS = {
    'Primavera':              'https://{instance}.oraclecloud.com/p6ws/restapi/project/{PROJECT_ID}/actions/invoke',
    'Primavera P6':           'https://{instance}.oraclecloud.com/p6ws/restapi/project/{PROJECT_ID}/actions/invoke',
    'MS Project':             'https://graph.microsoft.com/v1.0/projectonline/{TENANT_ID}/actions/invoke',
    'MS Project Online':      'https://graph.microsoft.com/v1.0/projectonline/{TENANT_ID}/actions/invoke',
    'SAP':                    'https://api.sap.com/projectsystems/{SYSTEM_ID}/v1/actions/invoke',
    'SAP PS':                 'https://api.sap.com/projectsystems/{SYSTEM_ID}/v1/actions/invoke',
    'Oracle Database':        'https://{host}:{port}/ords/{schema}/mcp/invoke',
    'Azure SQL MCP':          'https://{server}.database.windows.net/{database}/mcp/invoke',
    'Azure Databricks Genie': 'https://{workspace}.azuredatabricks.net/api/2.0/genie/mcp/invoke',
  };
  const OEM_PARAM_LABELS = {
    'Primavera':              ['DATABASE-INSTANCE', 'PROJECT-ID'],
    'Primavera P6':           ['DATABASE-INSTANCE', 'PROJECT-ID'],
    'MS Project':             ['TENANT-ID', 'SITE-ID'],
    'MS Project Online':      ['TENANT-ID', 'SITE-ID'],
    'SAP':                    ['CLIENT-ID', 'SYSTEM-ID'],
    'SAP PS':                 ['CLIENT-ID', 'SYSTEM-ID'],
    'Oracle Database':        ['HOST', 'SCHEMA'],
    'Azure SQL MCP':          ['SERVER', 'DATABASE'],
    'Azure Databricks Genie': ['WORKSPACE-URL', 'CLUSTER-ID'],
  };

  const openOemConnectModal = (oem) => {
    setOemForm({ name: oem, endpoint: '', param1: '', param2: '', authType: 'Key-based', bearer: '' });
    setShowBearerToken(false);
    setOemConnectTarget(oem);
    setShowOemMenu(false);
    setShowOemCatalog(false);
    setCatalogSearch('');
    setCatalogSelected(null);
  };

  const isOemFormValid = oemForm.name.trim() && oemForm.endpoint.trim() && oemForm.param1.trim() && oemForm.param2.trim() && oemForm.bearer.trim();

  const handleOemConnect = () => {
    if (!isOemFormValid || isConnectingOem) return;
    setIsConnectingOem(true);
    // Simulated connection — frontend only, no real request is made.
    setTimeout(() => {
      setIsConnectingOem(false);
      setConnectedOems(prev => (prev.includes(oemConnectTarget) ? prev : [...prev, oemConnectTarget]));
      setSelectedOem(oemConnectTarget);
      toast.success(`${oemConnectTarget} connected successfully`);
      setOemConnectTarget(null);
    }, 1200);
  };

  // ── OneDrive picker functions ─────────────────────────────────────────────
  const fetchOneDriveFolder = useCallback(async (folderId, token) => {
    setOneDriveLoading(true);
    try {
      const base = 'https://graph.microsoft.com/v1.0/me/drive';
      const url = folderId === 'root'
        ? `${base}/root/children?$orderby=name&$select=id,name,file,folder,size,webUrl`
        : `${base}/items/${folderId}/children?$orderby=name&$select=id,name,file,folder,size,webUrl`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOneDriveItems(data.value || []);
    } catch {
      toast.error('Could not load OneDrive files');
    } finally {
      setOneDriveLoading(false);
    }
  }, []);

  const openOneDrivePicker = useCallback(async () => {
    if (!isMsalConfigured()) {
      toast('Microsoft integration not configured — paste the file URL directly.', { icon: 'ℹ️' });
      return;
    }
    const msal = getMsalInstance();
    const scopes = ['Files.Read'];
    // Use a plain HTML redirect page so the full React app never loads inside the popup.
    // ⚠️  Add https://<your-domain>/auth-redirect.html to your Azure app registration's redirect URIs.
    const popupRedirectUri = window.location.origin + '/auth-redirect.html';
    try {
      let token;
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        msal.setActiveAccount(accounts[0]);
        try {
          const result = await msal.acquireTokenSilent({ scopes, account: accounts[0] });
          token = result.accessToken;
        } catch {
          const result = await msal.acquireTokenPopup({ scopes, redirectUri: popupRedirectUri });
          token = result.accessToken;
        }
      } else {
        const result = await msal.loginPopup({ scopes, redirectUri: popupRedirectUri });
        token = result.accessToken;
      }
      setOneDriveToken(token);
      setOneDrivePath([]);
      await fetchOneDriveFolder('root', token);
      setShowOneDrivePicker(true);
    } catch (err) {
      if (err?.errorCode !== 'user_cancelled') {
        toast.error('Could not connect to OneDrive');
      }
    }
  }, [fetchOneDriveFolder]);

  const handleThetaConnect = async (forceOneDriveItem = null, forceFile = null) => {
    let file;

    const driveItem = forceOneDriveItem || oneDriveSelectedItem;
    if (forceFile) {
      file = forceFile;
    } else if (driveItem) {
      const fetchToast = toast.loading('Downloading from OneDrive…');
      try {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${driveItem.id}/content`,
          { headers: { Authorization: `Bearer ${oneDriveToken}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        file = new File([blob], driveItem.name, { type: blob.type });
        toast.dismiss(fetchToast);
      } catch (err) {
        toast.error('Could not download file from OneDrive', { id: fetchToast });
        return;
      }
    } else {
      toast.error('Please select a file first');
      return;
    }

    setIsConnectingTheta(true);
    setShowOemCatalog(false);
    setProcessing(true);
    const toastId = toast.loading('Uploading file…');
    try {
      let uploadResult;
      try {
        uploadResult = await fileService.upload(file, () => {});
      } catch (err) {
        toast.error(`Upload failed: ${err.response?.data?.error || err.message}`, { id: toastId });
        setProcessing(false);
        setIsConnectingTheta(false);
        return;
      }

      const jobId    = uploadResult.job_id;
      const fileName = file.name;
      setCurrentJobId(jobId);
      toast.loading('File uploaded — running all 13 trackers…', { id: toastId });

      startJobPolling(jobId, (finalStatus) => {
        const pr             = finalStatus.processing_result || {};
        const trackerResults = pr.results || [];
        setAllOutputResults(trackerResults);

        const successSheets = trackerResults.filter(r => r.status === 'success');
        const failedSheets  = pr.failed_sheets ||
          trackerResults.filter(r => r.status === 'error').map(r => ({ sheet_name: r.sheet_name, error: r.error }));
        const trackerErrors = trackerResults.filter(r => r.status === 'error')
          .map(r => ({ sheet_name: r.sheet_name, error: r.error || 'Unknown processing error' }));
        const baseMerge            = finalStatus.base_merge || {};
        const inconsistencySummary = baseMerge.inconsistency_summary || {};
        const inconsistencyEmail   = finalStatus.inconsistency_email || null;

        toast.dismiss(toastId);

        if (finalStatus.status === 'error' && successSheets.length === 0) {
          toast.error(`Processing failed: ${finalStatus.error || 'All trackers failed'}`);
        } else if (baseMerge.status === 'pending_approval') {
          toast.success(`${successSheets.length}/13 trackers completed!`);
          toast(`📋 ${baseMerge.change_count} change(s) detected — awaiting admin approval`, {
            icon: '⏳', duration: 6000,
            style: { background: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b' },
          });
        } else {
          toast.success(`${successSheets.length}/13 trackers completed!`);
        }

        setProcessingResult({
          filename: fileName, jobId,
          successCount: successSheets.length,
          errorCount: trackerResults.length - successSheets.length,
          failedSheets, successSheets, trackerErrors,
          baseMerge, inconsistencySummary, inconsistencyEmail,
          pendingApproval: baseMerge.status === 'pending_approval'
            ? { approvalId: baseMerge.approval_id, changeCount: baseMerge.change_count }
            : null,
          message: finalStatus.message || `${successSheets.length} of 13 trackers processed`,
        });

        const firstSuccess = successSheets[0];
        if (firstSuccess) {
          setActiveTrackerName(firstSuccess.sheet_name);
          loadOutputPreview(jobId, firstSuccess.sheet_name);
        }

        setProcessing(false);
        setIsConnectingTheta(false);
        setOneDriveSelectedItem(null);
        loadHistory();
      });
    } catch (error) {
      console.error('Theta connect processing error:', error);
      toast.error('Error during processing', { id: toastId });
      setLiveJob(null);
      setProcessing(false);
      setIsConnectingTheta(false);
    }
  };

  // ── History loading ───────────────────────────────────────────────────────
  const [isLoadingHistory, setIsLoadingHistory]     = useState(false);

  // ── Output preview modal ──────────────────────────────────────────────────
  const [previewRecord, setPreviewRecord]           = useState(null);
  const [previewSheet, setPreviewSheet]             = useState(null);
  const [previewData, setPreviewData]               = useState(null);
  const [isLoadingPreview, setIsLoadingPreview]     = useState(false);

  // ── S-curve modal ─────────────────────────────────────────────────────────
  const [showSCurve, setShowSCurve]                 = useState(false);
  const [sCurveJob, setSCurveJob]                   = useState(null);

  // ── Input preview modal (sample file viewer) ──────────────────────────────
  const [showInputPreview, setShowInputPreview]     = useState(false);
  const [inputPreviewRecord, setInputPreviewRecord] = useState(null);

  const fileInputRef = useRef(null);
  const dashboardRef = useRef(null);

  const isAdmin = ['admin', 'company_admin', 'super_admin'].includes(user?.role);
  const isDescon = user?.company_name?.toLowerCase() === 'descon';
  const isMobile = useIsMobile();

  // ─────────────────────────────────────────────────────────────────────────
  // Load history on mount
  // ─────────────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await historyService.getAll(120);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
      toast.error('Failed to load processing history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [setHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Close OEM dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (oemMenuRef.current && !oemMenuRef.current.contains(e.target)) {
        setShowOemMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived stats from history
  // ─────────────────────────────────────────────────────────────────────────
  const totalProcessed = history.length;
  const successCount   = history.filter(h => h.status === 'completed').length;
  const failCount      = history.filter(h => h.status === 'error' || h.status === 'failed').length;

  // ─────────────────────────────────────────────────────────────────────────
  // File structure validation (client-side, before upload)
  // ─────────────────────────────────────────────────────────────────────────
  const validateFileStructure = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const headerRow = rows.slice(0, 5).find(r =>
            r.some(c => typeof c === 'string' && c.trim().length > 0)
          ) || [];
          const normalised = headerRow.map(h => String(h || '').trim().toLowerCase());
          const missing = REQUIRED_COLUMNS.filter(col => !normalised.includes(col.toLowerCase()));
          resolve(missing);
        } catch {
          resolve([]);
        }
      };
      reader.onerror = () => resolve([]);
      reader.readAsArrayBuffer(file);
    });

  // ─────────────────────────────────────────────────────────────────────────
  // File handling (drag-drop / browse)
  // ─────────────────────────────────────────────────────────────────────────
  const handleFiles = async (files) => {
    if (!isAdmin) {
      toast.error('Only administrators can upload files.');
      return;
    }
    const excelFiles = files.filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') ||
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      f.type === 'application/vnd.ms-excel'
    );
    if (excelFiles.length === 0) {
      toast.error('Please upload Excel files (.xlsx or .xls) only');
      return;
    }
    for (const file of excelFiles) {
      const missing = await validateFileStructure(file);
      if (missing.length > 0) {
        setStructureWarning({ fileName: file.name, missingColumns: missing });
        return;
      }
    }
    excelFiles.forEach(file => {
      addUploadedFile({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        file,
      });
    });
    toast.success(`${excelFiles.length} file(s) added`);
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => {
    e.preventDefault(); setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };
  const handleFileInput = (e) => handleFiles(Array.from(e.target.files));

  // ─────────────────────────────────────────────────────────────────────────
  // Process uploaded files  →  POST /api/upload  →  poll /api/status/<id>
  // ─────────────────────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file first');
      return;
    }
    setProcessing(true);
    const toastId = toast.loading('Uploading file…');
    try {
      const fileData = uploadedFiles[0];   // one at a time (backend design)
      let uploadResult;
      try {
        uploadResult = await fileService.upload(fileData.file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileData.id]: progress }));
        });
      } catch (err) {
        toast.error(`Upload failed: ${err.response?.data?.error || err.message}`, { id: toastId });
        setProcessing(false);
        return;
      }

      const jobId    = uploadResult.job_id;
      const fileName = fileData.name;
      setCurrentJobId(jobId);
      clearUploadedFiles();
      setUploadProgress({});
      setShowUploadModal(false);
      toast.loading('File uploaded — running all 13 trackers…', { id: toastId });

      // Poll via store so it survives tab switches
      startJobPolling(jobId, (finalStatus) => {
        const pr             = finalStatus.processing_result || {};
        const trackerResults = pr.results || [];
        setAllOutputResults(trackerResults);

        const successSheets = trackerResults.filter(r => r.status === 'success');
        const failedSheets  = pr.failed_sheets ||
          trackerResults.filter(r => r.status === 'error')
                        .map(r => ({ sheet_name: r.sheet_name, error: r.error }));
        const trackerErrors = trackerResults
          .filter(r => r.status === 'error')
          .map(r => ({ sheet_name: r.sheet_name, error: r.error || 'Unknown processing error' }));
        const baseMerge            = finalStatus.base_merge || {};
        const inconsistencySummary = baseMerge.inconsistency_summary || {};
        const inconsistencyEmail   = finalStatus.inconsistency_email || null;

        toast.dismiss(toastId);

        if (finalStatus.status === 'error' && successSheets.length === 0) {
          toast.error(`Processing failed: ${finalStatus.error || 'All trackers failed'}`);
        } else if (baseMerge.status === 'pending_approval') {
          toast.success(`${successSheets.length}/13 trackers completed!`);
          toast(`📋 ${baseMerge.change_count} change(s) detected — awaiting admin approval`, {
            icon: '⏳', duration: 6000,
            style: { background: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b' },
          });
        } else {
          toast.success(`${successSheets.length}/13 trackers completed!`);
        }

        setProcessingResult({
          filename: fileName, jobId,
          successCount: successSheets.length,
          errorCount: trackerResults.length - successSheets.length,
          failedSheets, successSheets, trackerErrors,
          baseMerge, inconsistencySummary, inconsistencyEmail,
          pendingApproval: baseMerge.status === 'pending_approval'
            ? { approvalId: baseMerge.approval_id, changeCount: baseMerge.change_count }
            : null,
          message: finalStatus.message || `${successSheets.length} of 13 trackers processed`,
        });

        const firstSuccess = successSheets[0];
        if (firstSuccess) {
          setActiveTrackerName(firstSuccess.sheet_name);
          loadOutputPreview(jobId, firstSuccess.sheet_name);
        }

        setProcessing(false);
        loadHistory();   // refresh table so new record appears immediately
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Error during processing', { id: toastId });
      setLiveJob(null);
      setProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Preview output  →  GET /api/preview/<job_id>?sheet=<name>&max_rows=600
  // ─────────────────────────────────────────────────────────────────────────
  const openPreview = async (record, sheet) => {
    setPreviewRecord(record);
    setPreviewSheet(sheet);
    setPreviewData(null);
    setIsLoadingPreview(true);
    try {
      const data = await fileService.preview(record.id, sheet.sheet_name, 600);
      setPreviewData({ ...data, jobId: record.id });
    } catch {
      toast.error('Failed to load preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setPreviewRecord(null);
    setPreviewSheet(null);
    setPreviewData(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Download  →  GET /api/download/<job_id>[?sheet=<name>]
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownload = async (jobId, sheetName = null) => {
    try {
      await fileService.download(jobId, sheetName);
      toast.success(sheetName ? `${sheetName} downloaded` : 'All outputs downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete record  →  DELETE /api/history/<job_id>
  // ─────────────────────────────────────────────────────────────────────────
  const handleDelete = async (jobId) => {
    try {
      await historyService.delete(jobId);
      setHistory(history.filter(h => h.id !== jobId));
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete record');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // S-curve  →  opens SCurveAnalytics modal with job id
  // ─────────────────────────────────────────────────────────────────────────
  const openSCurve = (record) => {
    setSCurveJob({ id: record.id, filename: record.filename });
    setShowSCurve(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    clearUploadedFiles();
    setUploadProgress({});
  };

  const openThetaEditor = async () => {
    setThetaEditorLoading(true);
    try {
      let sheet;
      try {
        sheet = await sheetService.getActiveSheet();
      } catch (err) {
        if (err?.response?.status === 404) {
          sheet = await sheetService.createActiveSheet('Theta Sheets', blankGrid());
        } else {
          throw err;
        }
      }
      setActiveSheetId(sheet.id);
      setActiveSheetVersion(sheet.version);
      setActiveSheetData(sheet.data);
      liveSheetGridRef.current = sheet.data;
      setThetaEditorValidation(null);
      setShowThetaEditor(true);
    } catch (err) {
      toast.error('Could not open Theta Sheets. Please try again.');
    } finally {
      setThetaEditorLoading(false);
    }
  };

  const handleTransformThetaSheet = () => {
    // Pull the live grid straight from Univer's current state rather than
    // liveSheetGridRef, which only updates on the debounced auto-save and
    // can lag behind whatever the user just typed.
    const grid = spreadsheetEditorRef.current?.getGrid() ?? liveSheetGridRef.current;
    const validation = validateSheetGrid(grid);
    if (!validation.isValid) {
      setValidationReportErrors(validation.errors);
      setShowValidationReport(true);
      return;
    }
    const file = gridToXlsxFile(grid, 'Theta Sheets.xlsx');
    setShowThetaEditor(false);
    handleThetaConnect(null, file);
  };

  // ── "Browse local files" — the quick path: native OS file picker straight
  // into the standard upload/process pipeline. No Theta schema, no live
  // editor, no sheet selection — matches what the old plain Upload button did.
  const handleThetaLocalFileSelected = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setShowOemCatalog(false);
    handleThetaConnect(null, f);
  };

  // ── "Browse Theta Sheets" — pick a workbook already uploaded to the server
  // (the existing job/upload history — same files shown in the Dashboard
  // table below), choose which sheet(s) hold the schedule data, and edit
  // inline before saving. No local-device file dialog involved.
  const openThetaBrowser = () => {
    setThetaBrowserStep('pickFile');
    setThetaBrowserSheets([]);
    setThetaBrowserSelected([]);
    setThetaBrowserFileName('');
    setThetaJustSaved(false);
    setShowThetaReports(false);
    setShowOemCatalog(false);
    setShowThetaBrowser(true);
    // Refetch rather than trust whatever was last loaded into the store —
    // `history` may be stale from an earlier page load and miss fields
    // (e.g. raw_available) the server has since started returning.
    loadHistory();
  };

  const handleThetaBrowserPickFile = async (job) => {
    setThetaSourcePicking(true);
    try {
      const blob = await fileService.downloadRawBlob(job.id);
      const buf = await blob.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheets = wb.SheetNames.map(name => parseSheetWithHeaderDetection(wb.Sheets[name], name));
      setThetaBrowserSheets(sheets);
      setThetaBrowserFileName(job.filename);
      // Auto-suggest sheets that already look like schedule data.
      const suggested = sheets.filter(s => s.headers.includes('Activity ID') && s.headers.includes('Activity Name')).map(s => s.name);
      setThetaBrowserSelected(suggested);
      setThetaBrowserPreviewIdx(0);
      setThetaBrowserStep('pickSheets');
      setThetaJustSaved(false);
    } catch (err) {
      toast.error('Could not read that file from the server. Please try again.');
    } finally {
      setThetaSourcePicking(false);
    }
  };

  const toggleThetaBrowserSheet = (name) => {
    setThetaBrowserSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setThetaJustSaved(false);
  };

  const closeThetaBrowser = () => {
    setShowThetaBrowser(false);
    setThetaBrowserStep('pickFile');
    setThetaBrowserSheets([]);
    setThetaBrowserSelected([]);
    setThetaBrowserFileName('');
    setThetaJustSaved(false);
  };

  // Merge the selected (possibly edited) sheets into one grid, aligning
  // columns by header name against whichever selected sheet looks most like
  // schedule data, validate the result, and save it as the company's active
  // Theta Sheet directly — editing already happened inline above, so there's
  // no separate full-screen editor hop for this initial import. Stays on
  // this same screen after saving (footer flips to "View Reports") rather
  // than closing, so the user can immediately review what they just saved.
  const handleThetaBrowserTransform = async () => {
    if (thetaBrowserSelected.length === 0) {
      toast.error('Select at least one sheet to continue.');
      return;
    }
    // All sheets live in one continuous Univer workbook now (native sheet
    // tabs), so the live grid already reflects edits to every sheet
    // regardless of which tab is currently showing -- no per-sheet edit
    // cache needed.
    const liveGrid = thetaBrowserEditorRef.current?.getGrid();
    const liveSheets = liveGrid?.sheets?.length ? liveGrid.sheets : thetaBrowserSheets;
    const selectedSheets = liveSheets.filter(s => thetaBrowserSelected.includes(s.name));
    const withActivityCols = selectedSheets.find(s => s.headers.includes('Activity ID') && s.headers.includes('Activity Name'));
    const baseHeaders = (withActivityCols || selectedSheets[0]).headers;
    const mergedRows = [];
    selectedSheets.forEach(s => {
      const idxMap = baseHeaders.map(h => s.headers.indexOf(h));
      s.rows.forEach(row => {
        mergedRows.push(idxMap.map(i => (i >= 0 && i < row.length ? row[i] : '')));
      });
    });
    const grid = { name: 'Theta Sheets', sheets: [{ name: 'Schedule', headers: baseHeaders, rows: mergedRows }] };

    const validation = validateSheetGrid(grid);
    if (!validation.isValid) {
      setValidationReportErrors(validation.errors);
      setShowValidationReport(true);
      return;
    }

    setThetaEditorLoading(true);
    try {
      const saved = await sheetService.createActiveSheet('Theta Sheets', grid);
      setActiveSheetId(saved.id);
      setActiveSheetVersion(saved.version);
      setActiveSheetData(saved.data);
      liveSheetGridRef.current = saved.data;
      setThetaJustSaved(true);
      toast.success('Theta Sheet saved.');
    } catch (err) {
      toast.error('Could not save the selected sheet(s). Please try again.');
    } finally {
      setThetaEditorLoading(false);
    }
  };

  // "View Reports" shows the existing Project Intelligence Dashboard's own
  // content (embedded, sidebar-less) rather than a separate bespoke report
  // view or a full page navigation — it already polls this same active
  // sheet's metrics live, so it shows exactly what was just saved.
  const handleViewThetaReports = () => {
    setShowThetaReports(true);
  };

  const closeThetaEditor = () => {
    setShowThetaEditor(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-page" ref={dashboardRef}>

      {/* Mobile menu button */}
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

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="main-content">

        {/* Header */}
        <header
          className="dashboard-header"
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, overflow: 'visible', position: 'relative' }}
        >
          <div>
            <h1 style={{ margin: 0 }}>PMO Command Center</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Upload, process, and track project management Excel files
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowSampleModal(true); setSampleModalTab('excel'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', background: '#eff6ff', color: '#1d4ed8',
                  border: '1px solid #bfdbfe', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Eye size={13} /> View Sample Excel
              </button>
              <button
                onClick={() => { setShowSampleModal(true); setSampleModalTab('screenshots'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', background: '#f0fdf4', color: '#15803d',
                  border: '1px solid #bbf7d0', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Image size={13} /> View Screenshots
              </button>
            </div>
          </div>

          {/* Right side: Get Data (non-Descon admins), Upload (Descon admins — no Get Data/Theta Sheets for this company) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-end' }}>
            {isAdmin && !isDescon && (
              <button
                type="button"
                onClick={() => { setShowOemCatalog(true); setCatalogTab('custom'); setCatalogSearch(''); setCatalogSelected(null); setGetDataStep('catalog'); setLinkMode('link'); setLinkUrl(''); setOneDriveSelectedItem(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(21,128,61,0.4)', whiteSpace: 'nowrap' }}
              >
                <Layers size={15} color="#fff" /> Get Data
              </button>
            )}
            {isAdmin && isDescon && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(21,128,61,0.4)', whiteSpace: 'nowrap' }}
              >
                <Upload size={15} color="#fff" /> Upload
              </button>
            )}
          </div>
        </header>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, margin: '20px 0' }}>
          {[
            { label: 'Total files processed', value: totalProcessed, sub: 'all time',        color: '#1e293b' },
            { label: 'Successfully processed', value: successCount,   sub: 'outputs ready',   color: '#0f6e56' },
            { label: 'Unable to process',      value: failCount,      sub: 'review required', color: '#993c1d' },
          ].map(({ label, value, sub, color }) => (
            <div
              key={label}
              style={{
                background: '#f8fafc', borderRadius: 10,
                padding: '14px 18px', border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color }}>{value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Live processing progress (while a job is running) ── */}
        {liveJob && (
          <div className="live-progress-panel" style={{ marginBottom: 18 }}>
            <div className="live-progress-header">
              <Loader2 size={20} className="spinning" />
              <span>Running algorithms… {liveJob.current_idx}/{liveJob.total}</span>
              <span className="live-pct">{liveJob.percent}%</span>
            </div>
            <div className="live-progress-bar-track">
              <div className="live-progress-bar-fill" style={{ width: `${liveJob.percent}%` }} />
            </div>
            <div className="live-current-tracker">
              Currently running: <strong>{liveJob.current_tracker}</strong>
            </div>
            {liveJob.completed_trackers?.length > 0 && (
              <div className="live-completed-list">
                {liveJob.completed_trackers.map((t, i) => (
                  <span
                    key={i}
                    className={`live-tracker-badge ${t.status === 'success' ? 'badge-ok' : 'badge-fail'}`}
                  >
                    {t.status === 'success' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                    {t.sheet_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Records table ── */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={15} color="#0073ea" />
            File records
          </span>
          <button
            onClick={loadHistory}
            disabled={isLoadingHistory}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
            }}
          >
            <RefreshCw size={13} className={isLoadingHistory ? 'spinning' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {[
                  { label: '#',                  width: 48  },
                  { label: 'Date & time',        width: 145 },
                  { label: 'Base file (input)',  width: null },
                  { label: 'Input',              width: 88  },
                  { label: 'Output',             width: 88  },
                  { label: 'S-curve',            width: 90  },
                  { label: 'Status',             width: 105 },
                  { label: '',                   width: 40  },
                ].map(({ label, width }, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: 'left', padding: '9px 10px',
                      fontSize: 12, fontWeight: 600, color: '#475569',
                      borderBottom: '1px solid #e2e8f0',
                      width: width || undefined,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <Loader2 size={22} className="spinning" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                    <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>Loading records…</span>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                    No records yet. Upload a file to get started.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  const successSheets = (item.results || []).filter(r => r.status === 'success');
                  const totalTrackers = item.results?.length || 0;
                  const isCompleted   = item.status === 'completed';
                  const isFailed      = item.status === 'error' || item.status === 'failed';
                  const isProc        = item.status === 'processing';

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Serial */}
                      <td style={{ padding: '10px 10px', color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                        {history.length - idx}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '10px 10px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(item.processed_at)}
                      </td>

                      {/* Filename */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <FileSpreadsheet size={15} color="#0073ea" style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 500, color: '#1e293b', fontFamily: 'inherit',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                            title={item.filename}
                          >
                            {toTitleCase(item.filename)}
                          </span>
                        </div>
                      </td>

                      {/* Input (opens sample/input file viewer) */}
                      <td style={{ padding: '10px 10px' }}>
                        <button
                          onClick={() => { setInputPreviewRecord(item); setShowInputPreview(true); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px',
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                            fontSize: 12, color: '#1d4ed8', cursor: 'pointer',
                          }}
                        >
                          <FileSpreadsheet size={13} /> Input
                        </button>
                      </td>

                      {/* Output (opens preview modal with real Excel data) */}
                      <td style={{ padding: '10px 10px' }}>
                        {isCompleted && successSheets.length > 0 ? (
                          <button
                            onClick={() => openPreview(item, successSheets[0])}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px',
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                              fontSize: 12, color: '#1d4ed8', cursor: 'pointer',
                            }}
                          >
                            <Eye size={13} /> View
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
                        )}
                      </td>

                      {/* S-curve */}
                      <td style={{ padding: '10px 10px' }}>
                        {/* {isCompleted ? (
                          <button
                            onClick={() => openSCurve(item)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px',
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                              fontSize: 12, color: '#15803d', cursor: 'pointer',
                            }}
                          >
                            <BarChart2 size={13} /> S-curve
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
                        )} */}
                        N/A
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '10px 10px' }}>
                        {isProc ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 6,
                            background: '#fef9c3', color: '#92400e', fontSize: 11, fontWeight: 600,
                          }}>
                            <Loader2 size={11} className="spinning" /> Processing
                          </span>
                        ) : isFailed ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 6,
                            background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 600,
                          }}>
                            <AlertCircle size={11} /> Failed
                          </span>
                        ) : isCompleted ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 6,
                            background: '#dcfce7', color: '#14532d', fontSize: 11, fontWeight: 600,
                          }}>
                            <CheckCircle size={11} /> {successSheets.length}/{totalTrackers}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.status}</span>
                        )}
                      </td>

                      {/* Delete (admin only) */}
                      <td style={{ padding: '10px 8px' }}>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete record for "${item.filename}"?`)) {
                                handleDelete(item.id);
                              }
                            }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#cbd5e1', padding: 4, borderRadius: 5,
                              display: 'flex', alignItems: 'center',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>{/* end .main-content */}

      {/* ══════════════════════════════════════════════════════════════════════
          UPLOAD MODAL  (replaces the always-visible drop zone)
      ══════════════════════════════════════════════════════════════════════ */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={closeUploadModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, width: 520, maxWidth: '93vw',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '16px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={18} color="#38bdf8" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>Upload project files</span>
              </div>
              <button onClick={closeUploadModal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Drop zone */}
            <div style={{ padding: 20 }}>
              <div
                className={`upload-area${isDragging ? ' dragging' : ''}`}
                style={{ cursor: 'pointer', margin: 0 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
                <Upload size={36} />
                <h3>Drop Excel files here or click to browse</h3>
                <p>Supports .xlsx and .xls · Max 50 MB per file</p>
              </div>

              {/* Queued files list */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {uploadedFiles.map(file => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                      }}
                    >
                      <FileSpreadsheet size={16} color="#0073ea" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatSize(file.size)}
                      </span>
                      {uploadProgress[file.id] > 0 && uploadProgress[file.id] < 100 && (
                        <Loader2 size={14} className="spinning" color="#0073ea" />
                      )}
                      {uploadProgress[file.id] === 100 && <CheckCircle size={14} color="#10b981" />}
                      <button
                        onClick={() => removeUploadedFile(file.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <button
                onClick={closeUploadModal}
                style={{
                  padding: '8px 18px', background: 'none',
                  border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 13, color: '#64748b', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={uploadedFiles.length === 0 || isProcessing}
                style={{
                  padding: '8px 20px',
                  background: uploadedFiles.length === 0 ? '#e2e8f0' : '#0073ea',
                  color: uploadedFiles.length === 0 ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  cursor: (uploadedFiles.length === 0 || isProcessing) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {isProcessing
                  ? <><Loader2 size={15} className="spinning" /> Processing…</>
                  : <><TrendingUp size={15} /> Process {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s)` : 'files'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          THETA SHEETS — full-screen live spreadsheet editor
      ══════════════════════════════════════════════════════════════════════ */}
      {showThetaEditor && (
        <div
          style={{
            position: 'fixed', inset: 0, background: '#fff',
            zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff', width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '16px 22px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={18} color="#c084fc" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>Theta Sheets</span>
              </div>
              <button onClick={closeThetaEditor} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            {thetaEditorValidation && !thetaEditorValidation.isValid && (
              <div
                onClick={() => { setValidationReportErrors(thetaEditorValidation.errors); setShowValidationReport(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px',
                  background: '#fffbeb', borderBottom: '1px solid #fde68a', color: '#92400e',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}
              >
                <AlertCircle size={14} />
                {thetaEditorValidation.errorCount} validation issue{thetaEditorValidation.errorCount === 1 ? '' : 's'} in this sheet — click to review
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, padding: 16 }}>
              <SpreadsheetEditor
                ref={spreadsheetEditorRef}
                key={activeSheetId}
                sheetId={activeSheetId}
                version={activeSheetVersion}
                initialData={activeSheetData}
                onChange={(grid) => { liveSheetGridRef.current = grid; }}
                onSaved={(saved) => { setActiveSheetVersion(saved.version); liveSheetGridRef.current = saved.data; }}
                onValidation={setThetaEditorValidation}
                height="100%"
              />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
              padding: '13px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0,
            }}>
              <button
                onClick={closeThetaEditor}
                style={{ padding: '8px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={handleTransformThetaSheet}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                <TrendingUp size={14} /> Transform Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VALIDATION REPORT — every failing row/field at once (Theta Sheets)
      ══════════════════════════════════════════════════════════════════════ */}
      {showValidationReport && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1750, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowValidationReport(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, width: 680, maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#dc2626" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  {validationReportErrors.length} issue{validationReportErrors.length === 1 ? '' : 's'} found
                </span>
              </div>
              <button onClick={() => setShowValidationReport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>Row</th>
                    <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>Field</th>
                    <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>Value</th>
                    <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {validationReportErrors.map((err, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 14px', color: '#334155', whiteSpace: 'nowrap' }}>{err.row ?? '—'}</td>
                      <td style={{ padding: '7px 14px', color: '#334155', whiteSpace: 'nowrap' }}>{err.field ?? '—'}</td>
                      <td style={{ padding: '7px 14px', color: '#334155', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.value != null ? String(err.value) : '—'}</td>
                      <td style={{ padding: '7px 14px', color: '#b91c1c' }}>{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={() => setShowValidationReport(false)}
                style={{ padding: '8px 18px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Fix and retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          OUTPUT PREVIEW MODAL
          Calls GET /api/preview/<job_id>?sheet=<name>&max_rows=600
          and renders actual Excel table content via ExcelViewer
      ══════════════════════════════════════════════════════════════════════ */}
      {previewRecord && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={closePreview}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14,
              width: 860, maxWidth: '95vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '14px 22px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={17} color="#38bdf8" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
                  {previewRecord.filename}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => handleDownload(previewRecord.id, previewSheet?.sheet_name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', background: '#0073ea',
                    color: '#fff', border: 'none', borderRadius: 7,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Download size={13} /> Download
                </button>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Sheet tabs (shown when job has multiple successful sheets) */}
            {(() => {
              const sheets = (previewRecord.results || []).filter(r => r.status === 'success');
              if (sheets.length <= 1) return null;
              return (
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                  {sheets.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => openPreview(previewRecord, s)}
                      style={{
                        padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: previewSheet?.sheet_name === s.sheet_name ? 700 : 400,
                        color: previewSheet?.sheet_name === s.sheet_name ? '#0073ea' : '#64748b',
                        borderBottom: previewSheet?.sheet_name === s.sheet_name
                          ? '2px solid #0073ea' : '2px solid transparent',
                      }}
                    >
                      {s.sheet_name}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {isLoadingPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#64748b' }}>
                  <Loader2 size={22} className="spinning" />
                  Loading preview…
                </div>
              ) : previewData ? (
                <ExcelViewer
                  headers={previewData.headers}
                  rows={previewData.rows}
                  sheetName={previewData.sheet_name}
                  isPreview={previewData.is_preview}
                  totalRows={previewData.total_rows}
                  maxHeight="calc(90vh - 180px)"
                  onDownload={() => {
                    handleDownload(previewData.jobId, previewData.sheet_name);
                    closePreview();
                  }}
                />
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No preview available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          S-CURVE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showSCurve && sCurveJob && (
        <SCurveAnalytics
          jobId={sCurveJob.id}
          filename={sCurveJob.filename}
          baselineOnly={false}
          onClose={() => { setShowSCurve(false); setSCurveJob(null); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PROCESSING RESULT MODAL  (from store, shown after job completes)
      ══════════════════════════════════════════════════════════════════════ */}
      {processingResult && (
        <ProcessingResultModal
          result={processingResult}
          onClose={() => setProcessingResult(null)}
          onViewReports={() => navigate('/reports')}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          S-CURVE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showSCurve && sCurveJob && (
        <SCurveAnalytics
          jobId={sCurveJob.id}
          filename={sCurveJob.filename}
          baselineOnly={false}
          onClose={() => { setShowSCurve(false); setSCurveJob(null); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INPUT PREVIEW MODAL
          Shows the sample/base Excel rows + download button
      ══════════════════════════════════════════════════════════════════════ */}
      {showInputPreview && inputPreviewRecord && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowInputPreview(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14,
              width: 860, maxWidth: '95vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '14px 22px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={17} color="#38bdf8" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
                  {inputPreviewRecord.filename} — Input
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={generateAndDownloadSample}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', background: '#0073ea',
                    color: '#fff', border: 'none', borderRadius: 7,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Download size={13} /> Download
                </button>
                <button onClick={() => setShowInputPreview(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Showing <strong>{SAMPLE_ROWS.length} rows</strong> — sample structure
                </span>
                <span style={{ fontSize: 11, background: '#fef9c3', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  Preview
                </span>
              </div>
              <div style={{ overflowX: 'auto', padding: '8px 16px 16px' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap', minWidth: '100%', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                      {Object.keys(SAMPLE_ROWS[0]).map(h => (
                        <th key={h} style={{ padding: '7px 12px', textAlign: 'left', color: '#374151', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k} style={{ padding: '6px 12px', color: k === 'Activity ID' ? '#1e40af' : '#374151', fontFamily: k === 'Activity ID' ? 'monospace' : 'inherit', borderBottom: '1px solid #f1f5f9' }}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SAMPLE FILE / SCREENSHOTS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showSampleModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowSampleModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, width: 960, maxWidth: '96vw',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              padding: '16px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={18} color="#10b981" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>File Format Guide</span>
              </div>
              <button onClick={() => setShowSampleModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {[
                ['excel',       <Eye size={14} />,   'Sample Excel'],
                ['screenshots', <Image size={14} />, 'Screenshots' ],
              ].map(([tab, icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setSampleModalTab(tab)}
                  style={{
                    flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
                    fontWeight: sampleModalTab === tab ? 700 : 500,
                    color: sampleModalTab === tab ? '#0073ea' : '#64748b',
                    borderBottom: sampleModalTab === tab ? '2px solid #0073ea' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13,
                  }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            <div style={{ padding: 24, maxHeight: 520, overflowY: 'auto' }}>
              {sampleModalTab === 'excel' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#475569' }}>
                        Showing <strong>{SAMPLE_ROWS.length} rows</strong> — sample project schedule
                      </span>
                      <span style={{ fontSize: 11, background: '#fef9c3', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        Preview
                      </span>
                    </div>
                    <button
                      onClick={generateAndDownloadSample}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', background: '#0073ea', color: '#fff',
                        border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Download size={13} /> Download .xlsx
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap', minWidth: '100%', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <thead>
                        <tr style={{ background: '#1e293b' }}>
                          {Object.keys(SAMPLE_ROWS[0]).map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#e2e8f0', fontWeight: 600, borderBottom: '2px solid #334155', borderRight: '1px solid #334155', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_ROWS.map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            {Object.entries(row).map(([k, v]) => (
                              <td key={k} style={{
                                padding: '6px 12px',
                                color: k === 'Activity ID' ? '#1e40af' : k === 'Activity Name' ? '#111827' : '#475569',
                                fontFamily: k === 'Activity ID' ? 'monospace' : 'inherit',
                                fontWeight: k === 'Activity Name' ? 500 : 400,
                                borderBottom: '1px solid #f1f5f9',
                                borderRight: '1px solid #f1f5f9',
                              }}>
                                {k === '% Complete' ? `${v}%` : v}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                    Reference screenshots of a correctly structured project file.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[['/assets/image.png', 'Header row with required columns']].map(([src, caption], i) => (
                      <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                        <img
                          src={src} alt={caption}
                          style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                        <div style={{
                          display: 'none', alignItems: 'center', justifyContent: 'center',
                          height: 120, background: '#f1f5f9', color: '#94a3b8', fontSize: 13,
                        }}>
                          Screenshot not found — add to /public/assets/
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
                          {caption}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INVALID FILE STRUCTURE WARNING MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {structureWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 480, maxWidth: '93vw',
            overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              padding: '16px 22px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <ShieldAlert size={20} color="#fca5a5" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Invalid File Structure</span>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                <strong>{structureWarning.fileName}</strong> is missing required columns:
              </p>
              <ul style={{ margin: '12px 0 16px 0', paddingLeft: 20 }}>
                {structureWarning.missingColumns.map((col, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#b91c1c', fontFamily: 'monospace', marginBottom: 4 }}>{col}</li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
                Please fix the file to match the required structure. Click "View Format Guide" to see the expected columns.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStructureWarning(null); setShowSampleModal(true); setSampleModalTab('excel'); }}
                  style={{ flex: 1, padding: '9px 0', background: '#0073ea', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  View Format Guide
                </button>
                <button
                  onClick={() => setStructureWarning(null)}
                  style={{ flex: 1, padding: '9px 0', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GET DATA WIZARD  — 3-step: Select source → Link to file → Configure
      ══════════════════════════════════════════════════════════════════════ */}
      {showOemCatalog && (() => {
        const configuredTools = [
          { name: 'OneDrive', description: 'Microsoft OneDrive is connected. Browse and link project files directly.', tag: 'Cloud Storage', connected: true, icon: '☁️' },
        ];

        const catalogTools = [
          { name: 'Primavera P6',           description: 'Securely access Oracle Primavera P6 to sync EPC schedule data.', tag: 'Remote MCP', icon: '🔶' },
          { name: 'MS Project Online',       description: 'Connect to Microsoft Project Online via Graph API.', tag: 'Remote MCP', icon: '📊' },
          { name: 'SAP PS',                  description: 'Integrate SAP Project System for WBS elements, milestones, and actuals in real time.', tag: 'Remote MCP', icon: '🔷' },
          { name: 'Oracle Database',         description: 'Oracle Database RDBMS for enterprise workloads.', tag: 'Custom', icon: '🔴' },
          { name: 'Azure SQL MCP',           description: 'Secure MCP server for SQL Server, Azure SQL, and SQL MI.', tag: 'Local MCP', icon: '🟦' },
          { name: 'Azure Databricks Genie',  description: 'Databricks Genie MCP — analyse data using natural language.', tag: 'Remote MCP', icon: '🔥' },
        ];

        const filteredCatalog = catalogTools.filter(t =>
          t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          t.description.toLowerCase().includes(catalogSearch.toLowerCase())
        );

        const STEP_LABELS = { catalog: 'Select source', link: 'Link to file', configure: 'Configure' };
        const steps = ['catalog', 'link', 'configure'];
        const stepIdx = steps.indexOf(getDataStep);

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setShowOemCatalog(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, width: 780, maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.25)' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 26px 0 26px', flexShrink: 0 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                    {{ catalog: 'Get Data', link: 'Link to file', configure: 'Configure' }[getDataStep]}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    {steps.map((s, i) => (
                      <React.Fragment key={s}>
                        {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 12 }}>›</span>}
                        <span
                          onClick={() => { if (i < stepIdx) setGetDataStep(s); }}
                          style={{ fontSize: 12, fontWeight: i === stepIdx ? 600 : 400, color: i < stepIdx ? '#7e22ce' : i === stepIdx ? '#0f172a' : '#94a3b8', cursor: i < stepIdx ? 'pointer' : 'default' }}
                        >
                          {STEP_LABELS[s]}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowOemCatalog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Tabs — only visible on catalog step */}
              {getDataStep === 'catalog' && (
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', margin: '16px 0 0', flexShrink: 0 }}>
                  {[
                    { key: 'custom',     label: 'Theta Sheets' },
                    { key: 'configured', label: 'Configured' },
                    { key: 'catalog',    label: 'Catalog' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setCatalogTab(key); setCatalogSearch(''); setCatalogSelected(null); }}
                      style={{ padding: '10px 22px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: catalogTab === key ? 700 : 500, color: catalogTab === key ? '#7e22ce' : '#64748b', borderBottom: catalogTab === key ? '2px solid #7e22ce' : '2px solid transparent' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px 26px' }}>

                {/* ── STEP catalog / Configured tab ── */}
                {getDataStep === 'catalog' && catalogTab === 'configured' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 18px' }}>
                      These sources are ready to use with your existing authentication and configuration.
                    </p>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                      <input type="text" placeholder="Search" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                      {configuredTools
                        .filter(t => t.name.toLowerCase().includes(catalogSearch.toLowerCase()) || t.description.toLowerCase().includes(catalogSearch.toLowerCase()))
                        .map(tool => (
                          <div key={tool.name} onClick={() => setCatalogSelected(tool.name)}
                            style={{ border: `1.5px solid ${catalogSelected === tool.name ? '#7e22ce' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: catalogSelected === tool.name ? '#faf5ff' : '#fff', transition: 'border-color .15s, background .15s' }}
                            onMouseEnter={e => { if (catalogSelected !== tool.name) e.currentTarget.style.borderColor = '#c4b5fd'; }}
                            onMouseLeave={e => { if (catalogSelected !== tool.name) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          >
                            <div style={{ fontSize: 22, marginBottom: 8 }}>{tool.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 5 }}>{tool.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 8 }}>{tool.description}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10.5, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>{tool.tag}</span>
                              {tool.connected && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: '#16a34a', fontWeight: 600 }}>
                                  <CheckCircle size={11} /> Connected
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Open OneDrive — shown when OneDrive card is selected */}
                    {catalogSelected === 'OneDrive' && (
                      <div style={{ marginTop: 20, padding: '16px 18px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}>☁️ OneDrive is connected</div>
                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>Browse your OneDrive for Business storage and select a project schedule file to ingest.</div>
                        <button
                          onClick={() => { setOneDrivePickerSource('configured'); openOneDrivePicker(); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ☁️ Open OneDrive
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP catalog / Catalog tab ── */}
                {getDataStep === 'catalog' && catalogTab === 'catalog' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 18px' }}>
                      Browse tools from the catalog. Some tools may require setup before use.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        <input type="text" placeholder="Search" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
                        {catalogSearch && <button onClick={() => setCatalogSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                      {filteredCatalog.map(tool => (
                        <div key={tool.name} onClick={() => setCatalogSelected(tool.name)}
                          style={{ border: `1.5px solid ${catalogSelected === tool.name ? '#7e22ce' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: catalogSelected === tool.name ? '#faf5ff' : '#fff', transition: 'border-color .15s, background .15s' }}
                          onMouseEnter={e => { if (catalogSelected !== tool.name) e.currentTarget.style.borderColor = '#c4b5fd'; }}
                          onMouseLeave={e => { if (catalogSelected !== tool.name) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <div style={{ fontSize: 22, marginBottom: 8 }}>{tool.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 5 }}>{tool.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 8 }}>{tool.description}</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>{tool.tag}</span>
                            <span style={{ fontSize: 10.5, background: '#eff6ff', color: '#1d4ed8', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>Preview</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredCatalog.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>No tools found matching "{catalogSearch}"</div>}
                  </div>
                )}

                {/* ── STEP catalog / Theta Sheets tab ── */}
                {getDataStep === 'catalog' && catalogTab === 'custom' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px' }}>
                      Connect a custom data source for lightweight cloud-native ingestion directly into your project.
                    </p>

                    <input
                      ref={thetaLocalFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleThetaLocalFileSelected}
                      style={{ display: 'none' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                      {/* Browse local files — native OS picker, straight to standard processing */}
                      <div
                        onClick={() => thetaLocalFileInputRef.current?.click()}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10, border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 16px', cursor: 'pointer', background: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FolderOpen size={18} color="#1d4ed8" />
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Browse local files</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                          Pick a file from your computer's file explorer. It's uploaded and processed immediately — no preview step.
                        </div>
                      </div>

                      {/* Browse Theta Sheets — pick from files already uploaded to the server */}
                      <div
                        onClick={openThetaBrowser}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10, border: '1.5px solid #86efac', borderRadius: 12, padding: '18px 16px', cursor: 'pointer', background: '#f0fdf4' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileSpreadsheet size={18} color="#16a34a" />
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Browse Theta Sheets</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
                          Pick a workbook already uploaded to the server, choose which sheet(s) to load, then edit right there — changes feed the Project Intelligence Dashboard in real time.
                        </div>
                      </div>
                    </div>

                    {/* Resume editing the current live sheet, if one already exists */}
                    <div
                      onClick={() => { setShowOemCatalog(false); openThetaEditor(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 14px', borderRadius: 9, cursor: thetaEditorLoading ? 'default' : 'pointer', color: '#475569', fontSize: 12.5, fontWeight: 600 }}
                    >
                      {thetaEditorLoading
                        ? <Loader2 size={15} className="spinning" />
                        : <FileSpreadsheet size={15} />}
                      Continue editing current Theta Sheet
                    </div>
                  </div>
                )}

                {/* ── STEP: link to file — Power BI style ── */}
                {getDataStep === 'link' && (
                  <div style={{ display: 'flex', gap: 0, minHeight: 380 }}>
                    {/* Left sidebar — source type */}
                    <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid #e2e8f0', paddingRight: 20, marginRight: 28 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 12px', border: '1.5px solid #7e22ce', borderRadius: 8, background: '#faf5ff', cursor: 'default' }}>
                        <div style={{ width: 38, height: 38, background: '#ecfdf5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                          {catalogSelected === 'Primavera P6' ? '🔶' : catalogSelected === 'SAP PS' ? '🔷' : '📊'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'center' }}>{catalogSelected || 'Excel workbook'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>File</div>
                        <span style={{ fontSize: 10, color: '#7e22ce', cursor: 'pointer', fontWeight: 500 }}>Learn more</span>
                      </div>
                    </div>

                    {/* Right — connection form */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Connection settings */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Connection settings</div>
                        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                          {[
                            { val: 'link',   label: 'Link to file' },
                            { val: 'upload', label: 'Upload file' },
                          ].map(opt => (
                            <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#0f172a' }}>
                              <input type="radio" name="linkMode" value={opt.val} checked={linkMode === opt.val} onChange={() => setLinkMode(opt.val)} style={{ accentColor: '#7e22ce', cursor: 'pointer' }} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                        {linkMode === 'link' && (
                          <div>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                              URL <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <input
                                type="text"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                placeholder="Example: https://contoso-my.sharepoint.com/personal/..."
                                style={{ flex: 1, padding: '8px 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, color: '#0f172a', boxSizing: 'border-box' }}
                              />
                              <button
                                onClick={openOneDrivePicker}
                                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, color: '#0f172a', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
                              >
                                Browse OneDrive…
                              </button>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 5 }}>
                              Browse and select files from your OneDrive for Business storage.
                            </div>
                          </div>
                        )}
                        {linkMode === 'upload' && (
                          <div>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>File</label>
                            <div style={{ marginTop: 6, border: '1.5px dashed #d1d5db', borderRadius: 8, padding: '20px 16px', textAlign: 'center', background: '#f9fafb', cursor: 'pointer' }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={e => { if (e.target.files[0]) setLinkUrl(e.target.files[0].name); }} style={{ display: 'none' }} />
                              <Upload size={22} style={{ color: '#9ca3af', margin: '0 auto 6px' }} />
                              <div style={{ fontSize: 12.5, color: '#374151' }}>{linkUrl || 'Click to browse or drag a file here'}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>.xlsx or .xls</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Connection credentials */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Connection credentials</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {[
                            { label: 'Connection',        type: 'select', options: ['Create new connection'] },
                            { label: 'Connection name',   type: 'text',   value: 'Connection' },
                            { label: 'Data gateway',      type: 'select', options: ['(none)'] },
                            { label: 'Authentication kind', type: 'select', options: ['Anonymous', 'OAuth2', 'Key'] },
                            { label: 'Privacy Level',     type: 'select', options: ['None', 'Public', 'Organizational', 'Private'] },
                          ].map(field => (
                            <div key={field.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <label style={{ fontSize: 12.5, color: '#374151', width: 155, flexShrink: 0 }}>{field.label}</label>
                              {field.type === 'select' ? (
                                <select style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, color: '#0f172a', background: '#fff' }}>
                                  {field.options.map(o => <option key={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input type="text" defaultValue={field.value || ''} style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, color: '#0f172a' }} />
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                            <input type="checkbox" id="gateway-cb" style={{ marginTop: 2, accentColor: '#7e22ce', cursor: 'pointer' }} />
                            <label htmlFor="gateway-cb" style={{ fontSize: 12, color: '#374151', cursor: 'pointer', lineHeight: 1.5 }}>
                              This connection can be used with on-premises data gateways and VNet data gateways.
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP: configure ── */}
                {getDataStep === 'configure' && (
                  <div style={{ maxWidth: 520 }}>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px' }}>
                      Configure how data from <strong>{catalogSelected}</strong> will be ingested.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 22 }}>
                      <span style={{ fontSize: 18 }}>📊</span>
                      <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                        {linkUrl || 'sample_project_file.xlsx'}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Ready</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Project label</label>
                        <input type="text" defaultValue="Project Schedule — June 2026"
                          style={{ marginTop: 6, width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Data format</label>
                        <select style={{ marginTop: 6, width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}>
                          <option>Standard schedule (Excel / MCP)</option>
                          <option>Primavera XER export</option>
                          <option>MS Project MPP export</option>
                        </select>
                      </div>
                      <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#15803d' }}>
                        All 13 trackers will run against this file on Transform.
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '14px 26px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {getDataStep === 'catalog' && (
                    <button onClick={() => setShowOemCatalog(false)}
                      style={{ padding: '9px 18px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                  {getDataStep !== 'catalog' && (
                    <button
                      onClick={() => { if (getDataStep === 'link') setGetDataStep('catalog'); else if (getDataStep === 'configure') setGetDataStep('link'); }}
                      style={{ padding: '9px 18px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      ← Back
                    </button>
                  )}
                </div>
                <div>
                  {getDataStep === 'catalog' && catalogTab === 'catalog' && (
                    <button disabled={!catalogSelected}
                      onClick={() => {
                        if (!catalogSelected) return;
                        if (catalogSelected === 'OneDrive') {
                          setOneDrivePickerSource('configured');
                          openOneDrivePicker();
                        } else {
                          openOemConnectModal(catalogSelected);
                        }
                      }}
                      style={{ padding: '9px 22px', background: !catalogSelected ? '#d8b4fe' : '#7e22ce', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: !catalogSelected ? 'not-allowed' : 'pointer' }}>
                      {catalogSelected === 'OneDrive' ? 'Connect →' : 'Next →'}
                    </button>
                  )}
                  {getDataStep === 'link' && (
                    <button
                      disabled={linkMode === 'link' && !linkUrl.trim()}
                      onClick={() => { setGetDataStep('configure'); }}
                      style={{ padding: '9px 22px', background: (linkMode === 'link' && !linkUrl.trim()) ? '#d8b4fe' : '#7e22ce', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: (linkMode === 'link' && !linkUrl.trim()) ? 'not-allowed' : 'pointer' }}>
                      Next →
                    </button>
                  )}
                  {getDataStep === 'configure' && (
                    <button
                      onClick={() => { setShowOemCatalog(false); setShowProcessing(true); setProcessingDone(false); setTimeout(() => setProcessingDone(true), 3800); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      <TrendingUp size={15} /> Transform
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          BROWSE THETA SHEETS — pick a server file, then pick+edit sheet(s)
          (Power Query "Choose data" style)
      ══════════════════════════════════════════════════════════════════════ */}
      {showThetaBrowser && (() => {
        // Same list as the "File records" table on the Dashboard itself —
        // no separate filtering/curation, so what you see here always
        // matches what you see there.
        const serverFiles = (history || []).filter(h => /\.(xlsx|xls|csv)$/i.test(h.filename || ''));
        const isSheetsStep = thetaBrowserStep === 'pickSheets';
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1650, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                background: '#fff', width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <FileSpreadsheet size={17} color="#16a34a" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {isSheetsStep ? (thetaBrowserFileName || 'Choose data') : 'Browse Theta Sheets'}
                  </span>
                </div>
                <button onClick={closeThetaBrowser} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {thetaBrowserStep === 'pickFile' ? (
                /* ── Step 1: pick a workbook already uploaded to the server ── */
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {serverFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '52px 0', color: '#94a3b8', fontSize: 13 }}>
                      No Excel files have been uploaded to this workspace yet. Use "Browse local files" to upload one first.
                    </div>
                  ) : (
                    serverFiles.map(job => (
                      <div
                        key={job.id}
                        onClick={() => !thetaSourcePicking && handleThetaBrowserPickFile(job)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                          cursor: thetaSourcePicking ? 'default' : 'pointer',
                          opacity: thetaSourcePicking ? 0.6 : 1,
                          borderBottom: '1px solid #f8fafc',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>📊</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.filename}
                          </div>
                        </div>
                        <span style={{ fontSize: 11.5, color: '#94a3b8', flexShrink: 0 }}>{formatDate(job.processed_at)}</span>
                        {thetaSourcePicking && <Loader2 size={14} className="spinning" color="#94a3b8" />}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* ── Step 2: check sheet(s) to load; clicking a sheet edits it inline ── */
                <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', padding: isMobile ? '12px 14px 0' : '16px 24px 0' }}>
                  <div style={{
                    width: isMobile ? '100%' : 240, flexShrink: 0,
                    borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
                    borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
                    paddingRight: isMobile ? 0 : 16, paddingBottom: isMobile ? 10 : 0,
                    maxHeight: isMobile ? 130 : 'none', overflowY: 'auto',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                      Sheets [{thetaBrowserSheets.length}]
                    </div>
                    {thetaBrowserSheets.map((s, idx) => (
                      // Plain div, not <label> -- a <label> wrapping a checkbox
                      // natively toggles it on ANY click inside, including on
                      // the sheet name text, regardless of stopPropagation.
                      // Selection must only change via the checkbox itself;
                      // clicking the row/name jumps the editor to that
                      // sheet's tab (all sheets already live in the one
                      // workbook below, so this is just a tab switch, not
                      // a remount/reload).
                      <div
                        key={s.name}
                        onClick={() => { setThetaBrowserPreviewIdx(idx); thetaBrowserEditorRef.current?.setActiveSheetByName(s.name); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 6,
                          cursor: 'pointer', fontSize: 13, color: '#0f172a',
                          background: idx === thetaBrowserPreviewIdx ? '#f0fdf4' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={thetaBrowserSelected.includes(s.name)}
                          onChange={() => toggleThetaBrowserSheet(s.name)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        {s.headers.includes('Activity ID') && s.headers.includes('Activity Name') && (
                          <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0, marginLeft: 'auto' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Inline editable preview — editing happens here, in this same step.
                      All parsed sheets load into one workbook at once, so
                      Univer's own native sheet tabs (bottom of the grid) let
                      the user click through every sheet directly, same as a
                      normal spreadsheet — not just whichever one is checked. */}
                  <div style={{ flex: 1, minWidth: 0, minHeight: 0, paddingLeft: isMobile ? 0 : 20, paddingTop: isMobile ? 12 : 0, paddingBottom: 16, display: 'flex', flexDirection: 'column' }}>
                    {thetaBrowserSheets.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                        Select a sheet to preview and edit it
                      </div>
                    ) : (
                      <div style={{ flex: 1, minHeight: 0, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                        <SpreadsheetEditor
                          ref={thetaBrowserEditorRef}
                          key={thetaBrowserFileName}
                          initialData={{ name: thetaBrowserFileName || 'Theta Sheets', sheets: thetaBrowserSheets }}
                          hideToolbar
                          onDirty={() => setThetaJustSaved(false)}
                          height="100%"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0, background: '#fafbfc' }}>
                <button
                  onClick={thetaBrowserStep === 'pickSheets' ? () => setThetaBrowserStep('pickFile') : closeThetaBrowser}
                  style={{ padding: '7px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: '#334155', cursor: 'pointer' }}
                >
                  {thetaBrowserStep === 'pickSheets' ? 'Back' : 'Cancel'}
                </button>
                {thetaBrowserStep === 'pickSheets' && (
                  thetaJustSaved ? (
                    <button
                      onClick={handleViewThetaReports}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px',
                        background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 8,
                        fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                      }}
                    >
                      <BarChart2 size={13} /> View Reports
                    </button>
                  ) : (
                    <button
                      disabled={thetaBrowserSelected.length === 0 || thetaEditorLoading}
                      onClick={handleThetaBrowserTransform}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px',
                        background: thetaBrowserSelected.length === 0 || thetaEditorLoading ? '#93c5fd' : '#0f766e',
                        color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12.5,
                        cursor: thetaBrowserSelected.length === 0 || thetaEditorLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {thetaEditorLoading ? <><Loader2 size={13} className="spinning" /> Saving…</> : <><TrendingUp size={13} /> Save</>}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          THETA SHEETS REPORT — a dedicated light-themed executive report for
          the active sheet (not the Overview page or /reports tab, both of
          which are untouched). Every figure is either from
          compute_metrics_from_sheet or derived client-side from the same
          sheet's raw rows -- see ThetaReportView's own header comment.
      ══════════════════════════════════════════════════════════════════════ */}
      {showThetaReports && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1700, background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <BarChart2 size={17} color="#7e22ce" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Theta Sheets Report</span>
            </div>
            <button onClick={() => setShowThetaReports(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ThetaReportView />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          OEM "CONNECT THE TOOL" MODAL (frontend simulation only)
      ══════════════════════════════════════════════════════════════════════ */}
      {oemConnectTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 560, maxWidth: '95vw',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 70px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '22px 26px 0 26px',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  Connect the {oemConnectTarget} tool
                </h2>
              </div>
              <button
                onClick={() => !isConnectingOem && setOemConnectTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '14px 26px 0 26px' }}>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                A connection will be created for you in this project based on the values you provide below.
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>
                Third-party tools are non-native integrations. Use third-party connectors at your own risk and subject to third-party license terms and privacy policies. <span style={{ color: '#7e22ce', cursor: 'pointer', fontWeight: 600 }}>Learn more</span>
              </p>
            </div>

            <div style={{ padding: '20px 26px 26px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={oemForm.name}
                  onChange={(e) => setOemForm(f => ({ ...f, name: e.target.value }))}
                  disabled={isConnectingOem}
                  style={{
                    marginTop: 6, width: '100%', padding: '9px 12px',
                    border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
                    background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Endpoint */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={13} /> Remote MCP Server endpoint <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={OEM_ENDPOINT_PLACEHOLDERS[oemConnectTarget]}
                  value={oemForm.endpoint}
                  onChange={(e) => setOemForm(f => ({ ...f, endpoint: e.target.value }))}
                  disabled={isConnectingOem}
                  style={{
                    marginTop: 6, width: '100%', padding: '9px 12px',
                    border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12.5,
                    color: '#0f172a', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Parameters */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Parameters <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {[0, 1].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: '0 0 38%', padding: '9px 12px', background: '#f1f5f9',
                        border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12,
                        color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {OEM_PARAM_LABELS[oemConnectTarget][i]}
                      </div>
                      <span style={{ color: '#94a3b8' }}>:</span>
                      <input
                        type="text"
                        placeholder="Enter value"
                        value={i === 0 ? oemForm.param1 : oemForm.param2}
                        onChange={(e) => setOemForm(f => i === 0 ? { ...f, param1: e.target.value } : { ...f, param2: e.target.value })}
                        disabled={isConnectingOem}
                        style={{
                          flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0',
                          borderRadius: 8, fontSize: 12.5, color: '#0f172a', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Authentication */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  Authentication <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={oemForm.authType}
                  onChange={(e) => setOemForm(f => ({ ...f, authType: e.target.value }))}
                  disabled={isConnectingOem}
                  style={{
                    marginTop: 6, width: '100%', padding: '9px 12px',
                    border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
                    color: '#0f172a', background: '#fff', boxSizing: 'border-box',
                  }}
                >
                  <option>Key-based</option>
                  <option>OAuth 2.0</option>
                  <option>Basic auth</option>
                </select>
              </div>

              {/* Authorization */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={13} /> Authorization <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{
                    flex: '0 0 38%', padding: '9px 12px', background: '#f1f5f9',
                    border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12,
                    color: '#64748b', fontWeight: 600,
                  }}>
                    Bearer
                  </div>
                  <span style={{ color: '#94a3b8' }}>:</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type={showBearerToken ? 'text' : 'password'}
                      placeholder="JWT"
                      value={oemForm.bearer}
                      onChange={(e) => setOemForm(f => ({ ...f, bearer: e.target.value }))}
                      disabled={isConnectingOem}
                      style={{
                        width: '100%', padding: '9px 36px 9px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 12.5, color: '#0f172a', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowBearerToken(v => !v)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2,
                      }}
                    >
                      {showBearerToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '16px 26px', borderTop: '1px solid #f1f5f9',
            }}>
              <button
                onClick={() => setOemConnectTarget(null)}
                disabled={isConnectingOem}
                style={{
                  padding: '9px 18px', background: '#fff', color: '#334155',
                  border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13,
                  cursor: isConnectingOem ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleOemConnect}
                disabled={!isOemFormValid || isConnectingOem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px',
                  background: (!isOemFormValid || isConnectingOem) ? '#d8b4fe' : '#7e22ce',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
                  cursor: (!isOemFormValid || isConnectingOem) ? 'not-allowed' : 'pointer',
                }}
              >
                {isConnectingOem ? <><Loader2 size={15} className="spinning" /> Connecting…</> : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GET DATA PROCESSING SCREEN  — shown after clicking Transform
      ══════════════════════════════════════════════════════════════════════ */}
      {showProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, width: 420, maxWidth: '92vw', padding: '44px 36px', textAlign: 'center', boxShadow: '0 28px 80px rgba(0,0,0,0.35)' }}>
            {!processingDone ? (
              <>
                <Loader2 size={48} className="spinning" style={{ color: '#7e22ce', margin: '0 auto 20px', display: 'block' }} />
                <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Connecting and processing…</h2>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  Pulling data from your source and running all 13 trackers. This usually takes a few seconds.
                </p>
                <div style={{ background: '#f1f5f9', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg, #7e22ce, #0f766e)', borderRadius: 100 }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={34} color="#16a34a" />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Processing complete</h2>
                <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  Your data has been ingested and all trackers have run successfully. Head to Reports &amp; Analytics to review your results.
                </p>
                <button
                  onClick={() => { setShowProcessing(false); setProcessingDone(false); navigate('/reports'); }}
                  style={{ width: '100%', padding: '13px 0', background: '#0073ea', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}
                >
                  View Reports →
                </button>
                <button
                  onClick={() => { setShowProcessing(false); setProcessingDone(false); }}
                  style={{ width: '100%', padding: '11px 0', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Stay on Data Ingestion
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── OneDrive file picker modal ─────────────────────────────────────── */}
      {showOneDrivePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 660, maxHeight: '78vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 72px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '15px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>☁️</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Browse OneDrive</span>
              </div>
              <button onClick={() => setShowOneDrivePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            {/* Breadcrumb */}
            <div style={{ padding: '9px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', background: '#fff', minHeight: 38 }}>
              <button
                onClick={() => { setOneDrivePath([]); fetchOneDriveFolder('root', oneDriveToken); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: oneDrivePath.length === 0 ? '#0f172a' : '#7e22ce', fontWeight: oneDrivePath.length === 0 ? 700 : 500, fontSize: 12.5, padding: '2px 5px', borderRadius: 4 }}
              >My files</button>
              {oneDrivePath.map((crumb, i) => (
                <React.Fragment key={crumb.id}>
                  <span style={{ color: '#cbd5e1', fontSize: 13, userSelect: 'none' }}>›</span>
                  <button
                    onClick={() => {
                      const newPath = oneDrivePath.slice(0, i + 1);
                      setOneDrivePath(newPath);
                      fetchOneDriveFolder(crumb.id, oneDriveToken);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === oneDrivePath.length - 1 ? '#0f172a' : '#7e22ce', fontWeight: i === oneDrivePath.length - 1 ? 700 : 500, fontSize: 12.5, padding: '2px 5px', borderRadius: 4 }}
                  >{crumb.name}</button>
                </React.Fragment>
              ))}
            </div>

            {/* File list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {oneDriveLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '52px 0', gap: 10, color: '#64748b' }}>
                  <Loader2 size={20} className="spinning" />
                  <span style={{ fontSize: 13 }}>Loading…</span>
                </div>
              ) : oneDriveItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '52px 0', color: '#94a3b8', fontSize: 13 }}>This folder is empty</div>
              ) : (
                oneDriveItems.map(item => {
                  const isFolder = !!item.folder;
                  const isSpreadsheet = !isFolder && /\.(xlsx|xls|csv)$/i.test(item.name);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isFolder) {
                          setOneDrivePath(prev => [...prev, { id: item.id, name: item.name }]);
                          fetchOneDriveFolder(item.id, oneDriveToken);
                        } else {
                          setLinkUrl(item.webUrl);
                          setOneDriveSelectedItem({ id: item.id, name: item.name });
                          setShowOneDrivePicker(false);
                          if (oneDrivePickerSource === 'configured') {
                            setOneDrivePickerSource('theta');
                            setShowOemCatalog(false);
                            handleThetaConnect({ id: item.id, name: item.name });
                          } else {
                            toast.success(`Selected: ${item.name}`);
                          }
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>
                        {isFolder ? '📁' : isSpreadsheet ? '📊' : '📄'}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      {!isFolder && item.size && (
                        <span style={{ fontSize: 11.5, color: '#94a3b8', flexShrink: 0 }}>{formatSize(item.size)}</span>
                      )}
                      {isFolder && <span style={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }}>›</span>}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '11px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Click a file to select it · Folders open on click</span>
              <button
                onClick={() => setShowOneDrivePicker(false)}
                style={{ padding: '7px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', cursor: 'pointer', fontWeight: 500 }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;