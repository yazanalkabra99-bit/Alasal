import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import type { Party } from '../utils/types';
import { Card } from '../components/ui/Card';

export function VendorsPage() {
  const [vendors, setVendors] = useState<Party[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/meta/vendors');
        setVendors(res.data.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل المصادر');
      }
    })();
  }, []);

  return (
    <div>
      <div className="text-lg font-black">المصادر</div>
      <div className="text-xs text-slate-400">المصادر التي ننفذ عنها (demo)</div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <Card key={v.id}>
            <div className="font-black">{v.name}</div>
            <div className="text-xs text-slate-500">Vendor #{v.id}</div>
          </Card>
        ))}
        {vendors.length === 0 && !error && (
          <div className="text-sm text-slate-400">لا يوجد مصادر بعد.</div>
        )}
      </div>
    </div>
  );
}
