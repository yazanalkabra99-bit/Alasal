import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { CurrencyMeta } from './types';

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<CurrencyMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/meta/currencies');
      setCurrencies(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل العملات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { currencies, loading, error, reload: load };
}
