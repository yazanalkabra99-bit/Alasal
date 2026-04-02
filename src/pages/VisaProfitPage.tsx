import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Filter, DollarSign } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { fmtMoney, fmtDate } from '../utils/format';
import type { VisaProfitRow } from '../utils/types';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartYmd() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function sourceLabel(s: string) {
  if (s === 'internal') return 'مكتبنا';
  if (s === 'external') return 'مكتب خارجي';
  return 'غير محدد';
}

function sourceTone(s: string) {
  if (s === 'internal') return 'green';
  if (s === 'external') return 'purple';
  return 'gray';
}

export function VisaProfitPage() {
  const [from, setFrom] = useState(monthStartYmd());
  const [to, setTo] = useState(todayYmd());
  const [rows, setRows] = useState<VisaProfitRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/visa-profit', { params: { from, to } });
      setRows(res.data.data?.rows || []);
      setTotals(res.data.data?.totals || null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تقرير أرباح الفيزا');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const t = totals || {};
    return {
      selling: Number(t.selling_usd || 0),
      cost: Number(t.cost_usd || 0),
      gross: Number(t.gross_profit_usd || 0),
      feesOut: Number(t.fees_out_usd || 0),
      feesIn: Number(t.fees_in_usd || 0),
      net: Number(t.net_profit_usd || 0),
      pending: Number(t.pending_cost_count || 0),
    };
  }, [totals]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-lg font-black">حاسبة أرباح الفيزا</div>
          <div className="text-xs text-slate-400">
            الربح = المبيع - التكلفة (بنود التكلفة أو المصدر) — الفيزات الصادرة والمسلّمة فقط
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400">من</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[155px]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400">إلى</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[155px]" />
          </div>

          <Button variant="secondary" onClick={load} disabled={loading}>
            <Filter size={16} />
            تطبيق
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="text-xs text-slate-400">إجمالي المبيع</div>
          <div className="mt-1 text-lg font-black">{fmtMoney(kpis.selling, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">إجمالي التكلفة</div>
          <div className="mt-1 text-lg font-black">{fmtMoney(kpis.cost, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">الربح الإجمالي</div>
          <div className="mt-1 text-lg font-black">{fmtMoney(kpis.gross, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">عمولات علينا</div>
          <div className="mt-1 text-lg font-black">{fmtMoney(kpis.feesOut, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">عمولات لنا</div>
          <div className="mt-1 text-lg font-black">{fmtMoney(kpis.feesIn, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">الربح الصافي</div>
          <div className="mt-1 text-lg font-black flex items-center gap-2">
            <DollarSign size={18} />
            {fmtMoney(kpis.net, 'USD')}
          </div>
          {kpis.pending > 0 && (
            <div className="mt-2 text-[11px] text-slate-400">بانتظار تكلفة: {kpis.pending}</div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-900/30">
          <div className="text-sm font-bold text-slate-200">تفاصيل أرباح الفيزا</div>
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw size={16} />
            تحديث
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">#</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">العميل</th>
                <th className="text-right px-4 py-3">نوع الفيزا</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">المصدر</th>
                <th className="text-right px-4 py-3">المبيع</th>
                <th className="text-right px-4 py-3">التكلفة</th>
                <th className="text-right px-4 py-3">عمولات علينا</th>
                <th className="text-right px-4 py-3">الربح الصافي</th>
                <th className="text-right px-4 py-3">الموظف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const profit = r.profit?.net_profit_usd;
                const profitTone = profit === null ? 'gray' : profit >= 0 ? 'green' : 'red';
                const costObj = r.cost as any;
                const hasItems = costObj?.has_cost_items;
                return (
                  <tr key={r.visa_request_id} className="border-t border-slate-800/40 hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-200 font-bold">{r.visa_request_id}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(r.sold_at || r.submission_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{r.applicant_name}</div>
                      <div className="text-xs text-slate-500">{r.applicant_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-semibold">{r.visa_type_name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={r.visa_status === 'delivered' ? 'green' : 'blue'}>
                        {r.visa_status === 'delivered' ? 'تم التسليم' : 'صادرة'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={sourceTone(r.source_type)}>{sourceLabel(r.source_type)}</Badge>
                      {r.source_type === 'external' && r.cost?.vendor_name && (
                        <div className="text-xs text-slate-500 mt-1">{r.cost.vendor_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-semibold">
                        {fmtMoney(r.transaction.total_amount, r.transaction.currency_code)}
                      </div>
                      {r.transaction.currency_code !== 'USD' && (
                        <div className="text-xs text-slate-500">≈ {fmtMoney(r.transaction.total_usd, 'USD')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.cost.cost_usd === null ? (
                        <Badge tone="gray">بانتظار التكلفة</Badge>
                      ) : (
                        <div className="text-slate-200 font-semibold">
                          {hasItems ? (
                            <>
                              <div>{fmtMoney(costObj.items_cost_usd || 0, 'USD')}</div>
                              <div className="text-xs text-purple-400">بنود تفصيلية</div>
                            </>
                          ) : (
                            <>
                              <div>{fmtMoney(r.cost.cost_amount || 0, r.cost.cost_currency_code || 'USD')}</div>
                              <div className="text-xs text-slate-500">{fmtMoney(r.cost.cost_usd || 0, 'USD')}</div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{fmtMoney(r.fees.fees_out_usd || 0, 'USD')}</td>
                    <td className="px-4 py-3">
                      {profit === null ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <Badge tone={profitTone}>{fmtMoney(profit, 'USD')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{r.employee?.name}</td>
                  </tr>
                );
              })}

              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    لا يوجد فيزات صادرة أو مسلّمة ضمن هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
