import { useState, useEffect, useRef, useCallback } from 'react';
import { sheetService } from '../services/api';

/**
 * Live Theta Sheets data hook. Polls the backend and exposes the latest
 * metrics/sheet plus loading/error state. This is intentionally the only
 * file that knows about the sync transport (polling today, SSE later) —
 * consumers should be able to keep using the same {metrics, loading,
 * lastUpdated, error, refetch} contract if that ever changes.
 */
export default function useSheetData({
  mode = 'metrics',
  useActive = true,
  sheetId = null,
  pollIntervalMs = 2500,
} = {}) {
  const [metrics, setMetrics] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      let data;
      if (mode === 'metrics') {
        data = useActive ? await sheetService.getActiveMetrics() : await sheetService.getMetrics(sheetId);
      } else {
        data = useActive ? await sheetService.getActiveSheet() : await sheetService.getSheet(sheetId);
      }
      if (!mountedRef.current) return;
      if (mode === 'metrics') {
        setMetrics(data.metrics ?? null);
      } else {
        setSheet(data);
      }
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.response?.status === 404) {
        // No active sheet yet — a normal state, not an error.
        setMetrics(null);
        setSheet(null);
        setError(null);
      } else {
        setError(err);
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [mode, useActive, sheetId]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchOnce();
    const interval = setInterval(fetchOnce, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchOnce, pollIntervalMs]);

  return { metrics, sheet, loading, error, lastUpdated, refetch: fetchOnce };
}
