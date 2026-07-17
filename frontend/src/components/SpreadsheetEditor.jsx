import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/preset-sheets-core/lib/index.css';
import { sheetService } from '../services/api';
import { toUniverWorkbookData, fromUniverWorkbookData, blankGrid } from '../utils/sheetDataUtils';
import { validateSheetGrid } from '../utils/thetaValidation';

const SAVE_DEBOUNCE_MS = 500;

/**
 * Self-contained live spreadsheet editor (Univer). Saves to the API whenever
 * `sheetId` is set. Does not depend on any dashboard-specific code.
 *
 * Mount contract: render with `key={sheetId}` at the call site so switching
 * sheets forces a full unmount/remount instead of reusing one Univer instance.
 *
 * Omitting `sheetId` puts the editor in local-only mode: `doSave` no-ops (no
 * network call), so it's editable in place with no backing sheet yet — used
 * by the "Browse Theta Sheets" picker to let the user edit a sheet before it
 * has been saved. Callers in that mode read edits via the `getGrid()` ref
 * handle instead of `onSaved`.
 */
const SpreadsheetEditor = forwardRef(function SpreadsheetEditor({
  sheetId,
  version,
  initialData,
  onChange,
  onSaved,
  onValidation,
  onDirty,
  hideToolbar = false,
  height = '600px',
}, ref) {
  const containerRef = useRef(null);
  const univerRef = useRef(null);
  const univerAPIRef = useRef(null);
  const changeDisposableRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestVersionRef = useRef(version);
  const savingRef = useRef(false);
  const fileInputRef = useRef(null);
  const [remountKey, setRemountKey] = useState(0);
  const [localData, setLocalData] = useState(() => initialData || blankGrid());

  // Read the live grid directly from Univer's current state, rather than
  // whatever was last captured by the debounced auto-save's onChange — the
  // debounce can lag up to SAVE_DEBOUNCE_MS behind the user's last keystroke,
  // so callers that need the freshest data "right now" (e.g. Transform Data)
  // must pull it synchronously instead of relying on that callback.
  useImperativeHandle(ref, () => ({
    getGrid: () => {
      const workbook = univerAPIRef.current?.getActiveWorkbook();
      if (!workbook) return null;
      return fromUniverWorkbookData(workbook.save());
    },
    // Switches the editor's visible tab to the named sheet (a no-op if the
    // workbook has no sheet by that name, e.g. mid-mount).
    setActiveSheetByName: (name) => {
      const workbook = univerAPIRef.current?.getActiveWorkbook();
      const sheet = workbook?.getSheetByName(name);
      if (sheet) workbook.setActiveSheet(sheet);
    },
  }), []);

  useEffect(() => {
    latestVersionRef.current = version;
  }, [version]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    // Give this mount its own isolated child node rather than handing Univer
    // the stable containerRef.current directly. React 18 StrictMode
    // double-invokes this effect in dev (mount -> cleanup -> mount); since
    // containerRef.current is the same DOM node across both invocations, a
    // shared container would let the first instance's deferred dispose wipe
    // out the second instance's rendering. A fresh element per mount keeps
    // each Univer instance's DOM writes and disposal fully isolated.
    const mountEl = document.createElement('div');
    mountEl.style.height = '100%';
    mountEl.style.width = '100%';
    containerRef.current.appendChild(mountEl);

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({ container: mountEl }),
      ],
    });
    univerRef.current = univer;
    univerAPIRef.current = univerAPI;

    const workbookData = toUniverWorkbookData(localData);
    univerAPI.createWorkbook(workbookData);

    changeDisposableRef.current = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, () => {
      // Fires immediately regardless of sheetId, unlike onChange (which only
      // fires from within doSave, itself a no-op in local/no-sheetId mode) —
      // callers that need to know "the user just edited something" right
      // now, even with no backing sheet yet, use this instead.
      onDirty?.();
      scheduleDebouncedSave();
    });

    return () => {
      changeDisposableRef.current?.dispose?.();
      changeDisposableRef.current = null;
      clearTimeout(debounceTimerRef.current);
      const univerInstance = univerRef.current;
      univerRef.current = null;
      univerAPIRef.current = null;
      // Deferred dispose: let Univer's own queued internal DOM writes flush
      // before the container is detached, avoiding a removeChild conflict
      // with React's reconciler.
      setTimeout(() => {
        univerInstance?.dispose();
        mountEl.remove();
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId, remountKey]);

  function scheduleDebouncedSave() {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(doSave, SAVE_DEBOUNCE_MS);
  }

  async function doSave() {
    if (!sheetId || !univerAPIRef.current || savingRef.current) return;
    const workbook = univerAPIRef.current.getActiveWorkbook();
    if (!workbook) return;
    const snapshot = workbook.save();
    const grid = fromUniverWorkbookData(snapshot);
    onChange?.(grid);
    // Validation here is informational only — it never blocks or delays the
    // save itself, so a mid-edit invalid cell can never cost the user their
    // in-progress work. The parent surfaces this as a dismissible warning.
    onValidation?.(validateSheetGrid(grid));

    savingRef.current = true;
    try {
      const saved = await sheetService.saveSheet(sheetId, grid, latestVersionRef.current);
      latestVersionRef.current = saved.version;
      onSaved?.(saved);
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error('Sheet was updated in another session. Please reload to see the latest version.');
      } else {
        try {
          const retried = await sheetService.saveSheet(sheetId, grid, latestVersionRef.current);
          latestVersionRef.current = retried.version;
          onSaved?.(retried);
        } catch {
          toast.error('Could not save changes. Please check your connection.');
        }
      }
    } finally {
      savingRef.current = false;
    }
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const sheets = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          // Exported workbooks often prefix the real header row with a title
          // row and a description row (one populated cell each) -- find
          // whichever of the first few rows has the most non-empty cells.
          let headerIdx = 0, bestCount = -1;
          for (let i = 0; i < Math.min(10, raw.length); i++) {
            const count = (raw[i] || []).filter(c => String(c ?? '').trim() !== '').length;
            if (count > bestCount) { bestCount = count; headerIdx = i; }
          }
          const headers = (raw[headerIdx] || []).map(h => String(h ?? '').trim());
          const rows = raw.slice(headerIdx + 1).filter(row => row.some(c => String(c ?? '').trim() !== ''));
          return { name, headers, rows };
        });
        setLocalData({ name: 'Theta Sheets', sheets });
        setRemountKey(k => k + 1);
        // Save immediately once the remount picks up the imported data.
        setTimeout(() => doSave(), 150);
      } catch (err) {
        toast.error('Could not read that file. Please check the format and try again.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  return (
    <div style={{ height, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {!hideToolbar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 8px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={triggerImport}
            style={{
              padding: '6px 14px', background: '#f1f5f9', color: '#334155',
              border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12.5,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Import file
          </button>
        </div>
      )}
      <div ref={containerRef} style={{ flex: 1, width: '100%', minHeight: 0 }} />
    </div>
  );
});

export default SpreadsheetEditor;
