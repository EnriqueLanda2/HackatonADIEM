'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/types';

/**
 * Hook para obtener y actualizar datos del dashboard en tiempo real.
 * Hace polling cada `intervalMs` milisegundos (default: 3 segundos).
 */
export function useDashboard(intervalMs = 2000) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const dashboard = await api.getDashboard();
      setData(dashboard);
      setError(null);
      setIsLive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, intervalMs]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isLive, refresh };
}

/**
 * Hook para verificar el estado de conexión con el backend.
 */
export function useBackendStatus() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const available = await api.isBackendAvailable();
      setIsAvailable(available);
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return { isAvailable, checking };
}
