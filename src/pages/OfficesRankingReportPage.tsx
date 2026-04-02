import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, CalendarCheck, CalendarDays, FileBarChart } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { fmtMoney } from '../utils/format';

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstDayOfMonthYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type Row = {
  rank: number;
  office_id: number;
  office_name: string;
  office_type: 'office';
  total_usd: number;
  tx_count: number;
  visa_usd: number;
  passport_usd: number;
  ticket_usd: number;
  external_ticket_count: number;
  external_ticket_usd: number;
};

export function OfficesRankingReportPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function loadData(fromOverride?: string, toOverride?: string) {
    setLoading(true);
    try {
      const res = await api.get('/reports/offices-ranking', {
        params: { from: fromOverride || from, to: toOverride || to },
      });
      setRows(res.data?.data?.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const t = { total: 0, visa: 0, passport: 0, ticket: 0, ext: 0 };
    for (const r of rows) {
      t.total += Number(r.total_usd || 0);
      t.visa += Number(r.visa_usd || 0);
      t.passport += Number(r.passport_usd || 0);
      t.ticket += Number(r.ticket_usd || 0);
      t.ext += Number(r.external_ticket_usd || 0);
    }
    return t;
  }, [rows]);

  const top3 = rows.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight size={18} />
          </Button>
          <div>
            <div className="text-xl font-black flex items-center gap-2">
              <FileBarChart className="text-emerald-400" />
              تقرير عمل المكاتب
            </div>
            <div className="text-sm text-slate-400">ترتيب المكاتب من الأكثر إلى الأقل حسب إجمالي العمل (USD)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="text-xs text-slate-400 mb-1">من تاريخ</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى تاريخ</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => loadData()} loading={loading}>
              بحث
            </Button>
          </div>
          <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                const d = todayYmd();
                setFrom(d);
                setTo(d);
                loadData(d, d);
              }}
            >
              <CalendarDays size={14} className="ml-1" />
              اليوم
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const f = firstDayOfMonthYmd();
                const t = todayYmd();
                setFrom(f);
                setTo(t);
                loadData(f, t);
              }}
            >
              <CalendarCheck size={14} className="ml-1" />
              هذا الشهر
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80">
          <div className="text-xs text-slate-400">إجمالي العمل</div>
          <div className="text-xl font-bold mt-1">{fmtMoney(totals.total, 'USD')}</div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900/20 to-slate-900/80">
          <div className="text-xs text-slate-400">فيزا</div>
          <div className="text-xl font-bold mt-1">{fmtMoney(totals.visa, 'USD')}</div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-slate-900/80">
          <div className="text-xs text-slate-400">جوازات</div>
          <div className="text-xl font-bold mt-1">{fmtMoney(totals.passport, 'USD')}</div>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-900/20 to-slate-900/80">
          <div className="text-xs text-slate-400">تذاكر</div>
          <div className="text-xl font-bold mt-1">{fmtMoney(totals.ticket, 'USD')}</div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-900/20 to-slate-900/80">
          <div className="text-xs text-slate-400">تذاكر خارجية</div>
          <div className="text-xl font-bold mt-1">{fmtMoney(totals.ext, 'USD')}</div>
        </Card>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <Card>
          <div className="text-base font-black mb-3 flex items-center gap-2">
            <Building2 className="text-blue-400" size={18} />
            أفضل 3 مكاتب
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {top3.map((r) => (
              <div
                key={r.office_id}
                className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 hover:bg-slate-900/50 transition cursor-pointer"
                onClick={() => navigate(`/reports/office/${r.office_id}`)}
                title="فتح كشف حساب المكتب"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold truncate">{r.office_name}</div>
                  <Badge variant={'default'}>
                    مكتب
                  </Badge>
                </div>
                <div className="mt-2 text-lg font-black text-emerald-400">{fmtMoney(r.total_usd, 'USD')}</div>
                <div className="mt-1 text-xs text-slate-400">عدد العمليات: {r.tx_count + r.external_ticket_count}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="text-base font-black mb-4">الترتيب التفصيلي ({rows.length})</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">المكتب</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">إجمالي العمل</th>
                <th className="p-3 text-right">فيزا</th>
                <th className="p-3 text-right">جوازات</th>
                <th className="p-3 text-right">تذاكر</th>
                <th className="p-3 text-right">خارجية</th>
                <th className="p-3 text-right">عدد العمليات</th>
                <th className="p-3 text-right">فتح</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.office_id} className="border-t border-slate-700/40 hover:bg-slate-800/20">
                  <td className="p-3 font-bold">{r.rank}</td>
                  <td className="p-3">
                    <button className="font-semibold hover:underline" onClick={() => navigate(`/offices/${r.office_id}`)}>
                      {r.office_name}
                    </button>
                  </td>
                  <td className="p-3">
                    <Badge variant={'default'}>
                      مكتب
                    </Badge>
                  </td>
                  <td className="p-3 font-bold text-emerald-400">{fmtMoney(r.total_usd, 'USD')}</td>
                  <td className="p-3">{fmtMoney(r.visa_usd, 'USD')}</td>
                  <td className="p-3">{fmtMoney(r.passport_usd, 'USD')}</td>
                  <td className="p-3">{fmtMoney(r.ticket_usd, 'USD')}</td>
                  <td className="p-3">{fmtMoney(r.external_ticket_usd, 'USD')}</td>
                  <td className="p-3">{(r.tx_count || 0) + (r.external_ticket_count || 0)}</td>
                  <td className="p-3">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/reports/office/${r.office_id}`)}
                      className="!px-3"
                      title="فتح كشف حساب المكتب"
                    >
                      فتح
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={10}>
                    لا توجد بيانات ضمن الفترة المحددة
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
