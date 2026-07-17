import { create } from 'zustand';
import { fileService, authService } from '../services/api';

const useStore = create((set, get) => ({
      // User State
      user: null,
  mustChangePassword: false,
  isAuthenticated: !!localStorage.getItem('token'),
  authReady: !localStorage.getItem('token'),
  
  // Subscription State
  subscription: null,
  
  // Uploaded Files (temporary state before upload)
  uploadedFiles: [],
  
  // Processing State
  isProcessing: false,
  uploadProgress: {},
  
  // Job Processing State (persists across tab switches)
  currentJobId: null,
  liveJob: null,
  allOutputResults: [],
  activeTrackerName: null,
  outputPreview: null,
  processingResult: null,
  isLoadingPreview: false,
  _pollTimer: null,
  
  // History
  history: [],
  
  // Output Columns
  selectedColumns: [
    'Activity code',
    'Activity',
    'Stage gate',
    'EP dates',
    'LP dates',
    'Actual start date as A',
    'deviation',
    'last planned date - Actual start date',
    'flag',
  ],
  
  customColumns: [],
  
  // Actions
  setUser: (userData) => {
    const mustChangePassword = !!userData?.must_change_password;
    set({ user: userData, mustChangePassword, isAuthenticated: true, authReady: true });
  },

  updateUserProfile: async (fields) => {
    const updated = await authService.updateProfile(fields);
    set((state) => ({ user: { ...state.user, ...updated } }));
  },
  
  login: (userData, token) => {
    localStorage.setItem('token', token);
    const mustChangePassword = !!userData?.must_change_password;
    set({ user: userData, mustChangePassword, isAuthenticated: true, authReady: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    // Clear all per-user / per-company cached data so the next login
    // cannot read a previous user's data from localStorage.
    Object.keys(localStorage)
      .filter(k =>
        k.startsWith('chatHistory_') ||
        k.startsWith('whatIfHistory_') ||
        k.startsWith('whatif_critical_dashboard_cache_v1_')
      )
      .forEach(k => localStorage.removeItem(k));
    set({
      user: null,
      mustChangePassword: false,
      isAuthenticated: false,
      authReady: true,
      uploadedFiles: [],
      subscription: null,
      history: [],
    });
  },

  setAuthReady: (ready) => set({ authReady: ready }),
  
  setSubscription: (subscription) => set({ subscription }),
  
  addUploadedFile: (file) =>
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file],
    })),
  
  removeUploadedFile: (fileId) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
    })),
  
  clearUploadedFiles: () => set({ uploadedFiles: [] }),
  
  setProcessing: (status) => set({ isProcessing: status }),
  
  setUploadProgress: (fileId, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [fileId]: progress },
    })),
  
  setHistory: (history) => set({ history }),
  
  addToHistory: (item) =>
    set((state) => ({
      history: [item, ...state.history],
    })),
  
  updateSelectedColumns: (columns) => set({ selectedColumns: columns }),
  
  addCustomColumn: (column) =>
    set((state) => ({
      customColumns: [...state.customColumns, column],
    })),
  
  removeCustomColumn: (columnName) =>
    set((state) => ({
      customColumns: state.customColumns.filter((c) => c !== columnName),
    })),

  // ── Job Processing Actions (persist across tab switches) ──
  setCurrentJobId: (id) => set({ currentJobId: id }),
  setLiveJob: (job) => set({ liveJob: job }),
  setAllOutputResults: (results) => set({ allOutputResults: results }),
  setActiveTrackerName: (name) => set({ activeTrackerName: name }),
  setOutputPreview: (preview) => set({ outputPreview: preview }),
  setProcessingResult: (result) => set({ processingResult: result }),
  setIsLoadingPreview: (loading) => set({ isLoadingPreview: loading }),

  loadOutputPreview: async (jobId, sheetName) => {
    set({ isLoadingPreview: true });
    try {
      const data = await fileService.preview(jobId, sheetName);
      set({ outputPreview: { ...data, jobId } });
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      set({ isLoadingPreview: false });
    }
  },

  clearJobState: () => set({
    currentJobId: null,
    liveJob: null,
    allOutputResults: [],
    activeTrackerName: null,
    outputPreview: null,
    processingResult: null,
    isLoadingPreview: false,
  }),

  /**
   * Start polling for a job. Runs in the store so it survives tab switches.
   * Returns a Promise that resolves with the final status.
   */
  startJobPolling: (jobId, onComplete) => {
    // Clear any existing poll
    const prev = get()._pollTimer;
    if (prev) clearInterval(prev);

    set({
      currentJobId: jobId,
      liveJob: { percent: 0, current_tracker: 'Starting…', current_idx: 0, total: 13, completed_trackers: [] },
    });

    const timer = setInterval(async () => {
      try {
        const response = await fileService.getStatus(jobId);
        const status = response;

        set({
          liveJob: {
            percent: status.percent || 0,
            current_tracker: status.current_tracker || '…',
            current_idx: status.current_idx || 0,
            total: status.total || 13,
            completed_trackers: status.completed_trackers || [],
          },
        });

        if (status.status === 'completed' || status.status === 'error') {
          clearInterval(timer);
          set({ _pollTimer: null, liveJob: null });
          if (onComplete) onComplete(status);
        }
      } catch (err) {
        console.error('Poll error:', err);
        clearInterval(timer);
        set({ _pollTimer: null, liveJob: null });
      }
    }, 2000);

    set({ _pollTimer: timer });
  },

  fetchMe: async () => {
    try {
      const userData = await authService.getMe(); // or whatever your profile endpoint is
      const mustChangePassword = !!userData?.must_change_password;
      set({ user: userData, mustChangePassword, isAuthenticated: true, authReady: true });
    } catch (err) {
      // Token invalid/expired — force logout
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, authReady: true });
    }
  },

}));

export default useStore;