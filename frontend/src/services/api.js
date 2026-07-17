import axios from 'axios';

// ---------------------------------------------------------------------------
// API base URL
//   Dev  : relative '/api'  → Vite proxy routes to localhost:8000
//   Prod : set VITE_API_URL=http://137.184.8.31:8000/api  in frontend/.env.production
//          then rebuild: cd frontend && npm run build
// ---------------------------------------------------------------------------
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Login page lives on a separate domain in production.
const LOGIN_URL = window.location.hostname === 'pulse.thetadynamics.io'
  ? 'https://account.thetapulse.ai/login'
  : '/login';

// ---------------------------------------------------------------------------
// Detect whether we are running as a native mobile (Capacitor) build,
// OR as a web-app served from a non-localhost origin (e.g. the deployed
// 137.184.8.31:9000 server accessed from a phone).
// ---------------------------------------------------------------------------
function _detectAppSource() {
  // Capacitor native binary
  if (typeof window !== 'undefined' && window?.Capacitor?.isNative) return 'mobile';
  // Served from the production IP – treat as mobile
  if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' &&
      window.location?.hostname !== '127.0.0.1') return 'mobile';
  return 'web';
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token + X-App-Source to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Always tell the backend which platform is calling
    config.headers['X-App-Source'] = _detectAppSource();
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      // Full cleanup — same as useStore logout so no previous-user data leaks
      localStorage.removeItem('token');
      Object.keys(localStorage)
        .filter(k =>
          k.startsWith('chatHistory_') ||
          k.startsWith('whatIfHistory_') ||
          k.startsWith('whatif_critical_dashboard_cache_v1_')
        )
        .forEach(k => localStorage.removeItem(k));
      window.location.href = LOGIN_URL;
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH SERVICES ====================

export { LOGIN_URL };

export const authService = {
  signup: async (name, email, password, company_id) => {
    const response = await api.post('/auth/signup', { name, email, password, company_id });
    // No token is issued on signup anymore — user must wait for approval
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  forgotPassword: async (email) => {
    const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await api.post('/auth/forgot-password', {
      email,
      frontend_origin: frontendOrigin,
    });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    Object.keys(localStorage)
      .filter(k =>
        k.startsWith('chatHistory_') ||
        k.startsWith('whatIfHistory_') ||
        k.startsWith('whatif_critical_dashboard_cache_v1_')
      )
      .forEach(k => localStorage.removeItem(k));
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (fields) => {
    const response = await api.put('/auth/me', fields);
    return response.data;
  },

  microsoftLogin: async (accessToken) => {
    const response = await api.post('/auth/microsoft', { access_token: accessToken });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  googleLogin: async (accessToken) => {
    const response = await api.post('/auth/google', { access_token: accessToken });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
};

// ==================== SUBSCRIPTION SERVICES ====================

export const subscriptionService = {
  getSubscription: async () => {
    const response = await api.get('/subscription');
    return response.data;
  },

  upgrade: async (plan) => {
    const response = await api.post('/subscription/upgrade', { plan });
    return response.data;
  },
};

// ==================== FILE SERVICES ====================

export const fileService = {
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  download: async (jobId, sheetName = null) => {
    const url = sheetName 
      ? `/download/${jobId}?sheet=${encodeURIComponent(sheetName)}`
      : `/download/${jobId}`;
      
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = sheetName 
      ? `${sheetName}_Output.xlsx`
      : `Pulse_Outputs_${jobId.substring(0, 8)}.zip`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    return filename;
  },

  downloadSheet: async (jobId, sheetName, filename) => {
    const url = `/download/${jobId}?sheet=${encodeURIComponent(sheetName)}`;
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    return filename;
  },

  // Raw (pre-processing) uploaded file for a history entry, as a Blob — used
  // by the Theta Sheets "Browse Theta Sheets" picker so it can source an
  // already-uploaded workbook from server storage and parse it client-side
  // exactly like a freshly picked local File (XLSX.read on the blob's bytes).
  downloadRawBlob: async (jobId) => {
    const response = await api.get(`/history/${jobId}/raw`, {
      responseType: 'blob',
    });
    return response.data;
  },

  preview: async (jobId, sheetName = null, maxRows = 600) => {
    const params = new URLSearchParams();
    if (sheetName) params.set('sheet', sheetName);
    if (maxRows) params.set('max_rows', String(maxRows));
    const qs = params.toString();
    const url = qs ? `/preview/${jobId}?${qs}` : `/preview/${jobId}`;
    const response = await api.get(url);
    return response.data;
  },

  analytics: async (jobId) => {
    const response = await api.get(`/analytics/${jobId}`);
    return response.data;
  },

  getStatus: async (jobId) => {
    const response = await api.get(`/status/${jobId}`);
    return response.data;
  },

  /**
   * Poll /api/status/<jobId> every `intervalMs` milliseconds until status is
   * 'completed' or 'error'.  Calls onProgress(statusObj) on every poll tick.
   * Returns the final status object.
   */
  pollStatus: (jobId, onProgress, intervalMs = 2000) => {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const response = await api.get(`/status/${jobId}`);
          const status = response.data;
          if (onProgress) onProgress(status);
          if (status.status === 'completed' || status.status === 'error') {
            clearInterval(timer);
            resolve(status);
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, intervalMs);
    });
  },
};

// ==================== HISTORY SERVICES ====================

export const historyService = {
  getAll: async (limit = 120) => {
    const response = await api.get(`/history?limit=${limit}`);
    return response.data;
  },

  getById: async (jobId) => {
    const response = await api.get(`/history/${jobId}`);
    return response.data;
  },

  delete: async (jobId) => {
    const response = await api.delete(`/history/${jobId}`);
    return response.data;
  },
};

// ==================== STATS SERVICES ====================

export const statsService = {
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

// ==================== NOTIFICATION SERVICES ====================

export const notificationService = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  delete: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};

// ==================== DEVIATION SERVICES ====================
// X-App-Source is injected automatically by the axios interceptor above.

export const deviationService = {
  /** Fetch all deviations (admin/manager see all, user sees own) */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    const response = await api.get(`/deviations?${params.toString()}`);
    return response.data;
  },

  /** Fetch only reviewed deviations (history) */
  getHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.limit) params.append('limit', filters.limit);
    const response = await api.get(`/deviations/history?${params.toString()}`);
    return response.data;
  },

  /** Create a deviation */
  create: async (data) => {
    const response = await api.post('/deviations', data);
    return response.data;
  },

  /** Update review status / reason */
  update: async (deviationId, data) => {
    const response = await api.post(`/deviations/update/${deviationId}`, data);
    return response.data;
  },

  /** Admin approve */
  approve: async (deviationId, reason = '') => {
    const response = await api.post(`/deviations/admin/approve/${deviationId}`, { reason });
    return response.data;
  },

  /** Admin reject */
  reject: async (deviationId, reason) => {
    const response = await api.post(`/deviations/admin/reject/${deviationId}`, { reason });
    return response.data;
  },

  /** Delete a single deviation */
  delete: async (deviationId) => {
    const response = await api.delete(`/deviations/${deviationId}`);
    return response.data;
  },

  /** Admin: delete ALL deviations (optionally scoped to company) */
  clearAll: async (companyId = null) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    const response = await api.delete(`/deviations/clear-all${params}`);
    return response.data;
  },
};

// ==================== ACTIVITY LOG SERVICES ====================

export const activityService = {
  getKnowledgeBase: async (limit = 500) => {
    const response = await api.get(`/knowledge-base?limit=${limit}`);
    return response.data;
  },

  getScurveArchive: async () => {
    const response = await api.get('/knowledge-base/scurve-archive');
    return response.data;
  },

  getRecursiveDeviations: async () => {
    const response = await api.get('/knowledge-base/recursive-deviations');
    return response.data;
  },

  getBaseFile: async () => {
    const response = await api.get('/knowledge-base/base-file');
    return response.data;
  },

  getBaseAnalytics: async () => {
    const response = await api.get('/dashboard/base-analytics');
    return response.data;
  },

  setBaseFile: async (filename, sheetName = 'Sheet2') => {
    const response = await api.post('/knowledge-base/base-file', {
      filename,
      sheet_name: sheetName,
    });
    return response.data;
  },

  getBaseFileVersions: async (limit = 100) => {
    const response = await api.get(`/knowledge-base/base-file/versions?limit=${limit}`);
    return response.data;
  },

  downloadBaseFileVersion: async (versionId) => {
    const response = await api.get(`/knowledge-base/base-file/versions/${encodeURIComponent(versionId)}/download`, {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `${versionId}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return filename;
  },

  downloadCurrentBaseFile: async () => {
    const response = await api.get('/knowledge-base/base-file/download', {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = 'base-file.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return filename;
  },

  viewCurrentBaseFile: async (sheetName = '', maxRows = 600) => {
    const params = new URLSearchParams();
    if (sheetName) params.set('sheet_name', sheetName);
    if (maxRows) params.set('max_rows', String(maxRows));
    const qs = params.toString();
    const response = await api.get(`/knowledge-base/base-file/view${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  viewBaseFileVersion: async (versionId, sheetName = '', maxRows = 600) => {
    const params = new URLSearchParams();
    if (sheetName) params.set('sheet_name', sheetName);
    if (maxRows) params.set('max_rows', String(maxRows));
    const qs = params.toString();
    const response = await api.get(`/knowledge-base/base-file/versions/${encodeURIComponent(versionId)}/view${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  deleteBaseFileVersion: async (versionId) => {
    const response = await api.delete(`/knowledge-base/base-file/versions/${encodeURIComponent(versionId)}`);
    return response.data;
  },

  /** Fetch AI learning data — deviation patterns, chat history, processing context */
  getAILearningData: async (limit = 200) => {
    const response = await api.get(`/knowledge-base/ai-learning?limit=${limit}`);
    return response.data;
  },

  getActivities: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.limit)       params.append('limit',       filters.limit);
    if (filters.source)      params.append('source',      filters.source);
    if (filters.action_type) params.append('action_type', filters.action_type);
    if (filters.date_from)   params.append('date_from',   filters.date_from);
    if (filters.date_to)     params.append('date_to',     filters.date_to);
    const response = await api.get(`/activity-log?${params.toString()}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/activity-log/stats');
    return response.data;
  },

  getDashboardBaseAnalytics: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.includeAllKnowledgebaseFiles) params.set('include_all_kb_files', '1');
    if (options.usePremergeBase) params.set('use_premerge_base', '1');
    if (options.forceReprocess) params.set('force_reprocess', '1');
    const qs = params.toString();
    const endpoint = '/dashboard/base-analytics' + (qs ? '?' + qs : '');
    const response = await api.get(endpoint);
    return response.data;
  },

  getBaseAnalyticsHistory: async (limit = 50) => {
    const response = await api.get(`/knowledge-base/base-analytics/history?limit=${limit}`);
    return response.data;
  },

  getBaseAnalyticsHistoryItem: async (cacheToken) => {
    const response = await api.get(`/knowledge-base/base-analytics/history/${encodeURIComponent(cacheToken)}`);
    return response.data;
  },

  downloadBaseAnalyticsHistoryFile: async (cacheToken, filename) => {
    const response = await api.get(
      `/knowledge-base/base-analytics/history/${encodeURIComponent(cacheToken)}/download/${encodeURIComponent(filename)}`,
      { responseType: 'blob' }
    );

    const contentDisposition = response.headers['content-disposition'];
    let outName = filename || 'base-analytics-output.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        outName = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', outName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return outName;
  },
};

// ==================== HEALTH CHECK ====================

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// ==================== THETA ENGAGE SERVICES ====================

export const engageService = {
  getPosts: async (groupId = '', userId = '', companyId = '') => {
    const params = new URLSearchParams();
    if (groupId) params.set('group_id', groupId);
    if (userId) params.set('user_id', userId);
    if (companyId) params.set('company_id', companyId);
    const qs = params.toString();
    const response = await api.get(`/engage/posts${qs ? '?' + qs : ''}`);
    return response.data;
  },
  createPost: async (content, source = 'manual', image_url = '', group_id = '') => {
    const response = await api.post('/engage/posts', { content, source, image_url, group_id });
    return response.data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/engage/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  deletePost: async (postId) => {
    const response = await api.delete(`/engage/posts/${postId}`);
    return response.data;
  },
  toggleLike: async (postId) => {
    const response = await api.post(`/engage/posts/${postId}/like`);
    return response.data;
  },
  addComment: async (postId, content) => {
    const response = await api.post(`/engage/posts/${postId}/comments`, { content });
    return response.data;
  },
  deleteComment: async (postId, commentId) => {
    const response = await api.delete(`/engage/posts/${postId}/comments/${commentId}`);
    return response.data;
  },
  // Groups
  getGroups: async () => {
    const response = await api.get('/engage/groups');
    return response.data;
  },
  createGroup: async (name, memberIds) => {
    const response = await api.post('/engage/groups', { name, member_ids: memberIds });
    return response.data;
  },
  deleteGroup: async (groupId) => {
    const response = await api.delete(`/engage/groups/${groupId}`);
    return response.data;
  },
  // Users list for member picker
  getUsers: async () => {
    const response = await api.get('/engage/users');
    return response.data;
  },

  triggerMonthlySummary: async () => {
    const response = await api.post('/engage/trigger-monthly-summary');
    return response.data;
  },
};


// ==================== COMPANY SERVICES ====================

export const companyService = {
  listPublic: async () => {
    const response = await api.get('/public/companies');
    return response.data;
  },

  listAll: async () => {
    const response = await api.get('/super-admin/companies');
    return response.data;
  },

  create: async (name, slug, adminEmail = null, adminName = null) => {
    const body = { name, slug };
    if (adminEmail) { body.admin_email = adminEmail; body.admin_name = adminName || ''; }
    const response = await api.post('/super-admin/companies', body);
    return response.data;
  },

  updateCompany: async (id, data) => {
    const response = await api.put(`/super-admin/companies/${id}`, data);
    return response.data;
  },

  deleteCompany: async (id) => {
    const response = await api.delete(`/super-admin/companies/${id}`);
    return response.data;
  },

  setFeatures: async (id, features) => {
    const response = await api.put(`/super-admin/companies/${id}/features`, { features });
    return response.data;
  },

  getCompanyUsers: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/company/users', { params });
    return response.data;
  },

  approveUser: async (userId) => {
    const response = await api.post(`/company/users/${userId}/approve`);
    return response.data;
  },

  rejectUser: async (userId) => {
    const response = await api.post(`/company/users/${userId}/reject`);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/company/users/${userId}/role`, { role });
    return response.data;
  },
};

// ==================== SUPER ADMIN SERVICES ====================

export const superAdminService = {
  getAllUsers: async () => {
    const response = await api.get('/super-admin/users');
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post('/super/users', data);
    return response.data;
  },

  updateUser: async (userId, fields) => {
    const response = await api.put(`/super/users/${userId}`, fields);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/super/users/${userId}`);
    return response.data;
  },

  getPlatformStats: async () => {
    const response = await api.get('/super-admin/platform-stats');
    return response.data;
  },

  getAuditLog: async (filters = {}) => {
    const params = new URLSearchParams();
    const keys = ['company_id', 'action_type', 'source', 'level', 'date_from', 'date_to', 'limit'];
    keys.forEach(k => { if (filters[k]) params.append(k, filters[k]); });
    const response = await api.get(`/super-admin/audit-log?${params.toString()}`);
    return response.data;
  },

  suspendCompany: async (companyId, suspended) => {
    const response = await api.post(`/super-admin/companies/${companyId}/suspend`, { suspended });
    return response.data;
  },

  sendResetLink: async (userId) => {
    const response = await api.post(`/super-admin/users/${userId}/send-reset`);
    return response.data;
  },
};


export const kbService = {
  listFiles: async (companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const res = await api.get('/knowledge-base/files', { params });
    return res.data;
  },
  uploadFile: async (file, companyId) => {
    const form = new FormData();
    form.append('file', file);
    if (companyId) form.append('company_id', companyId);
    const res = await api.post('/knowledge-base/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteFile: async (filename, companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const res = await api.delete(`/knowledge-base/files/${encodeURIComponent(filename)}`, { params });
    return res.data;
  },
};

export const sheetService = {
  getActiveSheet: async () => {
    const res = await api.get('/sheets/active');
    return res.data;
  },
  createActiveSheet: async (name, data) => {
    const res = await api.post('/sheets/active', { name, data });
    return res.data;
  },
  getSheet: async (sheetId) => {
    const res = await api.get(`/sheets/${sheetId}`);
    return res.data;
  },
  saveSheet: async (sheetId, data, version) => {
    const res = await api.put(`/sheets/${sheetId}`, { data, version });
    return res.data;
  },
  getActiveMetrics: async () => {
    const res = await api.get('/sheets/active/metrics');
    return res.data;
  },
  getMetrics: async (sheetId) => {
    const res = await api.get(`/sheets/${sheetId}/metrics`);
    return res.data;
  },
};

export default api;

