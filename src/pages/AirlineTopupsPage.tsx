import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCcw, CheckCircle2, XCircle, Ban, Wallet } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { fmtDate, fmtMoney } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';

type TopupReq = {
  id: number;
  airline_company_id: number;
  airline_name: string;
  amount: number;
  currency_code: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  requested_by: number;
  requested_by_name: string;
  requested_at: string;
  processed_by: number | null;
  processed_by_name: string | null;
  processed_at: string | null;
  processed_note: string | null;
  approved_account_id: number | null;
  approved_wallet_tx_id: number | null;
  approved_fee_amount: number;
};

function statusLabel(s: string) {
  switch (String(s)) {
    case 'pending':
      return 'معلّق';
    case 'approved':
      return 'موافق عليه';
    case 'rejected':
      return 'مرفوض';
    case 'cancelled':
      return 'ملغي';
    default:
      return s;
  }
}

function statusTone(s: string): any {
  switch (String(s)) {
    case 'pending':
      return 'amber';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}

export function AirlineTopupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();

  const canDoAccounting = hasAnyRole(user, 'admin', 'accounting');

  const status = sp.get('status') || '';
  const mine = sp.get('mine') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TopupReq[]>([]);

  // Approve modal
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveSaving, setApproveSaving] = useState(false);
  const [approveFor, setApproveFor] = useState<TopupReq | null>(null);
  const [approveAccountId, setApproveAccountId] = useState<number | ''>('');
  const [approveNote, setApproveNote] = useState('');
  const [approveFeeEnabled, setApproveFeeEnabled] = useState(false);
  const [approveFeeAmount, setApproveFeeAmount] = useState(0);
  const [approveFeeNote, setApproveFeeNote] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectFor, setRejectFor] = useState<TopupReq | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const tabs = useMemo(
    () => [
      { key: '', label: 'الكل' },
      { key: 'pending', label: 'معلّق' },
      { key: 'approved', label: 'موافق عليه' },
      { key: 'rejected', label: 'مرفوض' },
      { key: 'cancelled', label: 'ملغي' },
    ],
    []
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/airlines/deposit-requests', {
        params: {
          status: status || undefined,
          mine: mine || undefined,
          limit: 200,
        },
      });
      setItems(res.data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل الطلبات');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mine]);

  async function loadAccounts() {
    try {
      const res = await api.get('/meta/accounts');
      setAccounts(res.data.data || []);
    } catch {
      setAccounts([]);
    }
  }

  function openApprove(row: TopupReq) {
    setApproveFor(row);
    setApproveAccountId('');
    setApproveNote('');
    setApproveFeeEnabled(false);
    setApproveFeeAmount(0);
    setApproveFeeNote('');
    setApproveOpen(true);
    loadAccounts();
  }

  async function submitApprove() {
    if (!approveFor) return;
    if (!approveAccountId) {
      alert('الرجاء اختيار الصندوق');
      return;
    }
    if (approveFeeEnabled && !(Number(approveFeeAmount || 0) > 0)) {
      alert('الرجاء إدخال قيمة العمولة أو إلغاء تفعيلها');
      return;
    }

    setApproveSaving(true);
    try {
      await api.post(`/airlines/deposit-requests/${approveFor.id}/approve`, {
        account_id: Number(approveAccountId),
        note: approveNote,
        fee_enabled: approveFeeEnabled,
        fee_amount: Number(approveFeeAmount || 0),
        fee_note: approveFeeNote,
      });
      setApproveOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل الموافقة');
    } finally {
      setApproveSaving(false);
    }
  }

  function openReject(row: TopupReq) {
    setRejectFor(row);
    setRejectReason('');
    setRejectOpen(true);
  }

  async function submitReject() {
    if (!rejectFor) return;
    setRejectSaving(true);
    try {
      await api.post(`/airlines/deposit-requests/${rejectFor.id}/reject`, { reason: rejectReason });
      setRejectOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل الرفض');
    } finally {
      setRejectSaving(false);
    }
  }

  async function cancelRequest(row: TopupReq) {
    if (!confirm('تأكيد إلغاء الطلب؟')) return;
    try {
      await api.post(`/airlines/deposit-requests/${row.id}/cancel`, {});
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل الإلغاء');
    }
  }

  const tabBtn = (active: boolean) =>
    [
      'rounded-full px-3 py-1 text-xs font-bold border',
      active ? 'bg-brand-600/20 border-brand-600/30 text-white' : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:bg-slate-800/40',
    ].join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black">طلبات تغذية رصيد شركات الطيران</div>
          <div className="text-xs text-slate-400">إنشاء الطلب من مدير التذاكر، وتنفيذه من المحاسبة/المدير.</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            رجوع
          </Button>
          <Button variant="secondary" onClick={load}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{error}</div>}

      <Card>
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={tabBtn((status || '') === t.key)}
              onClick={() => {
                const next = new URLSearchParams(sp);
                if (t.key) next.set('status', t.key);
                else next.delete('status');
                setSp(next);
              }}
            >
              {t.label}
            </button>
          ))}

          <div className="flex-1" />

          {canDoAccounting ? (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={mine === '1'}
                onChange={(e) => {
                  const next = new URLSearchParams(sp);
                  if (e.target.checked) next.set('mine', '1');
                  else next.delete('mine');
                  setSp(next);
                }}
                className="rounded bg-slate-700 border-slate-600"
              />
              طلباتي فقط
            </label>
          ) : null}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">#</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">الشركة</th>
                <th className="text-right px-4 py-3">المبلغ</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">الطالب</th>
                <th className="text-right px-4 py-3">ملاحظة</th>
                <th className="text-right px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={8}>
                    جاري التحميل…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={8}>
                    لا توجد طلبات
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/60 hover:bg-slate-900/20">
                    <td className="px-4 py-3 text-slate-400">{r.id}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(r.requested_at)}</td>
                    <td className="px-4 py-3">
                      <button className="font-bold text-slate-200 hover:underline" onClick={() => navigate(`/airlines/${r.airline_company_id}`)}>
                        {r.airline_name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black">{fmtMoney(r.amount, r.currency_code)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.requested_by_name}</td>
                    <td className="px-4 py-3 text-slate-300">{r.note || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canDoAccounting && r.status === 'pending' ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => openApprove(r)} title="موافقة وتنفيذ الإيداع">
                              <CheckCircle2 size={14} />
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openReject(r)} title="رفض">
                              <XCircle size={14} />
                            </Button>
                          </>
                        ) : null}

                        {!canDoAccounting && r.status === 'pending' ? (
                          <Button size="sm" variant="secondary" onClick={() => cancelRequest(r)} title="إلغاء الطلب">
                            <Ban size={14} />
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/airlines/${r.airline_company_id}`)}
                          title="فتح ملف الشركة"
                        >
                          <Wallet size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approve */}
      <Modal open={approveOpen} title={approveFor ? `موافقة: ${approveFor.airline_name}` : 'موافقة'} onClose={() => setApproveOpen(false)}>
        <div className="space-y-3">
          <div className="text-sm text-slate-300">
            مبلغ الطلب: <b className="text-white">{approveFor ? fmtMoney(approveFor.amount, approveFor.currency_code) : ''}</b>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">الصندوق (سيتم الخصم منه)</div>
            <Select value={approveAccountId as any} onChange={(e) => setApproveAccountId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">اختر…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency_code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">ملاحظة (اختياري)</div>
            <Input value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="مثال: تم التحويل" />
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/20 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={approveFeeEnabled}
                onChange={(e) => setApproveFeeEnabled(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              عمولة تحويل
            </label>
            {approveFeeEnabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">قيمة العمولة (عملة الصندوق)</div>
                  <Input type="number" value={approveFeeAmount} onChange={(e) => setApproveFeeAmount(Number(e.target.value))} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">ملاحظة عمولة (اختياري)</div>
                  <Input value={approveFeeNote} onChange={(e) => setApproveFeeNote(e.target.value)} placeholder="مثال: رسوم بنك" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitApprove} disabled={approveSaving}>
              {approveSaving ? 'جارٍ الحفظ…' : 'موافقة وتنفيذ'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject */}
      <Modal open={rejectOpen} title={rejectFor ? `رفض: ${rejectFor.airline_name}` : 'رفض'} onClose={() => setRejectOpen(false)}>
        <div className="space-y-3">
          <div className="text-sm text-slate-300">
            مبلغ الطلب: <b className="text-white">{rejectFor ? fmtMoney(rejectFor.amount, rejectFor.currency_code) : ''}</b>
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">سبب الرفض (اختياري)</div>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="مثال: لا يوجد رصيد كافي في الصندوق" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitReject} disabled={rejectSaving}>
              {rejectSaving ? '...' : 'رفض'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
