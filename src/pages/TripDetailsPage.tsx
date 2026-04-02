import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Bus, RefreshCw, Pencil, Users, DollarSign, TrendingUp,
  MapPin, Calendar, Paperclip, Plus, Trash2, FileText, UserPlus, Armchair
} from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fmtMoney, fmtDate } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { PaymentModal } from '../features/visa/PaymentModal';
import { EditTripModal } from '../features/trips/EditTripModal';
import { AddBusModal } from '../features/trips/AddBusModal';
import { RegisterPassengerModal } from '../features/trips/RegisterPassengerModal';
import { AddCostItemModal } from '../features/trips/AddCostItemModal';
import BusSeatMap from '../features/trips/BusSeatMap';
import TripBudgetSummary from '../features/trips/TripBudgetSummary';
import {
  Trip, TripBus, TripPassenger, TripCostItem, TripBudget,
  STATUS_LABELS, STATUS_COLORS, COST_CATEGORY_LABELS
} from '../features/trips/types';

type Tab = 'overview' | 'buses' | 'passengers' | 'budget' | 'attachments';

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageMoney = hasAnyRole(user, 'accounting', 'admin');
  const isAdmin = hasAnyRole(user, 'admin');

  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [buses, setBuses] = useState<TripBus[]>([]);
  const [passengers, setPassengers] = useState<TripPassenger[]>([]);
  const [costItems, setCostItems] = useState<TripCostItem[]>([]);
  const [budget, setBudget] = useState<TripBudget | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [addBusOpen, setAddBusOpen] = useState(false);
  const [editBus, setEditBus] = useState<TripBus | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [editCost, setEditCost] = useState<TripCostItem | null>(null);
  const [payPassenger, setPayPassenger] = useState<TripPassenger | null>(null);

  // Attachments
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Seat assignment
  const [seatAssigning, setSeatAssigning] = useState(false);

  const isTripManager = trip && (isAdmin || Number(user?.id) === Number(trip.manager_id));

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      // GET /trips/:id returns { data: { trip, buses, passengers, cost_items, budget } }
      const [mainRes, attRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/attachments`).catch(() => ({ data: [] })),
      ]);
      const data = mainRes.data?.data;
      setTrip(data?.trip || null);
      setBuses(Array.isArray(data?.buses) ? data.buses : []);
      setPassengers(Array.isArray(data?.passengers) ? data.passengers : []);
      setCostItems(Array.isArray(data?.cost_items) ? data.cost_items : []);
      setBudget(data?.budget || null);
      const att = attRes.data?.data ?? attRes.data;
      setAttachments(Array.isArray(att) ? att : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تحميل الرحلة');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSeatAssign(passengerId: number, busId: number, seatNumber: number) {
    if (!id || !isTripManager) return;
    setSeatAssigning(true);
    try {
      await api.patch(`/trips/${id}/passengers/${passengerId}/seat`, { bus_id: busId, seat_number: seatNumber });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تعيين المقعد');
    } finally { setSeatAssigning(false); }
  }

  async function handleCancelPassenger(pid: number) {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من إلغاء تسجيل هذا الراكب؟')) return;
    try {
      await api.patch(`/trips/${id}/passengers/${pid}`, { status: 'cancelled' });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الإلغاء');
    }
  }

  async function handleDeleteBus(busId: number) {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الباص؟')) return;
    try {
      await api.delete(`/trips/${id}/buses/${busId}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الحذف');
    }
  }

  async function handleDeleteCost(cid: number) {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا البند؟')) return;
    try {
      await api.delete(`/trips/${id}/costs/${cid}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الحذف');
    }
  }

  async function uploadAttachments() {
    if (!id || !uploadFiles.length) return;
    setUploading(true);
    try {
      for (const f of uploadFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', 'مرفق');
        await api.post(`/trips/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setUploadFiles([]);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفع المرفقات');
    } finally { setUploading(false); }
  }

  async function downloadAttachment(att: any) {
    if (!id) return;
    const res = await api.get(`/trips/${id}/attachments/${att.id}/download`, { responseType: 'blob' } as any);
    const blob = new Blob([res.data], { type: att.mime_type || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.original_name || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Active non-cancelled passengers
  const activePassengers = useMemo(() => passengers.filter(p => p.status !== 'cancelled'), [passengers]);

  // Unassigned passengers (no bus/seat)
  const unassignedPassengers = useMemo(() => activePassengers.filter(p => !p.bus_id), [activePassengers]);

  if (!id) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate(-1)}><ArrowRight size={16} /> رجوع</Button>
        <Card className="p-4"><div className="text-red-200">معرّف الرحلة غير صحيح.</div></Card>
      </div>
    );
  }

  if (!trip && loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (!trip && !loading) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate(-1)}><ArrowRight size={16} /> رجوع</Button>
        <Card className="p-4">
          <div className="text-slate-300">{error || 'لم يتم تحميل تفاصيل الرحلة.'}</div>
          <div className="mt-3"><Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> إعادة المحاولة</Button></div>
        </Card>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: Bus },
    { key: 'buses', label: `الباصات (${buses.length})`, icon: Bus },
    { key: 'passengers', label: `الركاب (${activePassengers.length})`, icon: Users },
    { key: 'budget', label: 'الميزانية', icon: DollarSign },
    { key: 'attachments', label: `المرفقات (${attachments.length})`, icon: Paperclip },
  ];

  const statusColor = STATUS_COLORS[trip!.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/trips')}><ArrowRight size={16} /> رجوع</Button>
          <div className="flex items-center gap-2">
            <Bus className="text-violet-400" size={20} />
            <div>
              <div className="text-sm font-black text-white">{trip!.name}</div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                {trip!.destination && <span className="flex items-center gap-1"><MapPin size={10} />{trip!.destination}</span>}
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>
                  {STATUS_LABELS[trip!.status] || trip!.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isTripManager && (
            <Button size="sm" onClick={() => setEditOpen(true)}><Pencil size={15} /> تعديل</Button>
          )}
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: Overview ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Trip info */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400">الوجهة</p>
                <p className="text-sm font-bold text-white">{trip!.destination || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">التواريخ</p>
                <p className="text-sm font-bold text-white flex items-center gap-1">
                  <Calendar size={12} />
                  {trip!.start_date || '—'} ← {trip!.end_date || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">مدير الحملة</p>
                <p className="text-sm font-bold text-white">{trip!.manager_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">أنشأ بواسطة</p>
                <p className="text-sm font-bold text-white">{trip!.created_by_name || '—'}</p>
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="glass-card rounded-xl p-3 text-center">
              <Users size={18} className="text-violet-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">الركاب</p>
              <p className="text-lg font-black text-white">{activePassengers.length} / {trip!.max_passengers}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <Bus size={18} className="text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">الباصات</p>
              <p className="text-lg font-black text-white">{buses.length}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <DollarSign size={18} className="text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">الإيرادات</p>
              <p className="text-lg font-black text-emerald-400">${Math.round(Number(budget?.revenue_usd || 0)).toLocaleString('en-US')}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <DollarSign size={18} className="text-red-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">التكاليف</p>
              <p className="text-lg font-black text-red-400">${Math.round(Number(budget?.cost_usd || 0)).toLocaleString('en-US')}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <TrendingUp size={18} className="text-green-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">الربح</p>
              <p className={`text-lg font-black ${Number(budget?.profit_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.abs(Math.round(Number(budget?.profit_usd || 0))).toLocaleString('en-US')}
              </p>
            </div>
          </div>

          {/* Notes */}
          {trip!.notes && (
            <Card className="p-4">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><FileText size={16} className="text-slate-400" /> ملاحظات</h3>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{trip!.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* ─── Tab: Buses ─── */}
      {activeTab === 'buses' && (
        <div className="space-y-4 animate-fade-in">
          {isTripManager && (
            <div className="flex justify-end">
              <Button variant="gradient" size="sm" onClick={() => { setEditBus(null); setAddBusOpen(true); }}>
                <Plus size={16} /> إضافة باص
              </Button>
            </div>
          )}

          {buses.length === 0 ? (
            <Card className="p-8 text-center">
              <Bus size={32} className="text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400">لا يوجد باصات بعد</p>
            </Card>
          ) : (
            buses.map(bus => {
              const busPassengers = activePassengers.filter(p => Number(p.bus_id) === bus.id);
              return (
                <Card key={bus.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Bus size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{bus.label}</h3>
                        <p className="text-xs text-slate-400">
                          {busPassengers.length}/{bus.capacity} راكب
                          {bus.driver_name && <span> — سائق: {bus.driver_name}</span>}
                          {bus.plate_number && <span> — لوحة: {bus.plate_number}</span>}
                        </p>
                      </div>
                    </div>
                    {isTripManager && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditBus(bus); setAddBusOpen(true); }}>
                          <Pencil size={14} />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteBus(bus.id)}>
                            <Trash2 size={14} className="text-red-400" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <BusSeatMap
                    busId={bus.id}
                    busLabel={bus.label}
                    capacity={bus.capacity}
                    passengers={busPassengers}
                    readonly={!isTripManager}
                    onSeatClick={isTripManager ? (seatNum) => {
                      // Open a dialog to assign an unassigned passenger
                      const occupied = busPassengers.find(p => p.seat_number === seatNum);
                      if (occupied) {
                        alert(`المقعد ${seatNum} مشغول بواسطة: ${occupied.passenger_name}`);
                        return;
                      }
                      if (unassignedPassengers.length === 0) {
                        alert('لا يوجد ركاب غير معيّنين لتعيينهم على المقعد');
                        return;
                      }
                      const options = unassignedPassengers.map(p => `${p.id}: ${p.passenger_name}`).join('\n');
                      const choice = prompt(`اختر رقم الراكب لتعيينه على المقعد ${seatNum}:\n${options}`);
                      if (!choice) return;
                      const passengerId = parseInt(choice.split(':')[0]);
                      if (!passengerId) return;
                      handleSeatAssign(passengerId, bus.id, seatNum);
                    } : undefined}
                  />
                </Card>
              );
            })
          )}

          {/* Unassigned passengers note */}
          {unassignedPassengers.length > 0 && (
            <Card className="p-4 border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-2">
                <Armchair size={16} />
                ركاب بدون مقعد ({unassignedPassengers.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {unassignedPassengers.map(p => (
                  <span key={p.id} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    {p.passenger_name}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── Tab: Passengers ─── */}
      {activeTab === 'passengers' && (
        <div className="space-y-4 animate-fade-in">
          {trip!.status === 'open' && (
            <div className="flex justify-end">
              <Button variant="gradient" size="sm" onClick={() => setRegisterOpen(true)}>
                <UserPlus size={16} /> تسجيل راكب
              </Button>
            </div>
          )}

          {passengers.length === 0 ? (
            <Card className="p-8 text-center">
              <Users size={32} className="text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400">لا يوجد ركاب مسجلين بعد</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3 font-bold">#</th>
                      <th className="text-right px-4 py-3 font-bold">الراكب</th>
                      <th className="text-right px-4 py-3 font-bold">الطرف</th>
                      <th className="text-right px-4 py-3 font-bold">الباص</th>
                      <th className="text-right px-4 py-3 font-bold">المقعد</th>
                      <th className="text-right px-4 py-3 font-bold">سعر البيع</th>
                      <th className="text-right px-4 py-3 font-bold">الحالة</th>
                      <th className="text-right px-4 py-3 font-bold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {passengers.map((p, idx) => {
                      const bus = buses.find(b => b.id === Number(p.bus_id));
                      const isCancelled = p.status === 'cancelled';
                      return (
                        <tr key={p.id} className={`hover:bg-slate-800/30 ${isCancelled ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{p.passenger_name}</div>
                            {p.phone && <div className="text-xs text-slate-500">{p.phone}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {p.party_name || '—'}
                            {p.party_type === 'office' && <span className="text-[10px] text-slate-500 mr-1">(مكتب)</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{bus?.label || '—'}</td>
                          <td className="px-4 py-3 text-slate-400">{p.seat_number || '—'}</td>
                          <td className="px-4 py-3 text-white font-bold">{fmtMoney(p.sell_amount, p.sell_currency_code)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                              p.status === 'registered' ? 'bg-blue-500/10 text-blue-400' :
                              p.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                              p.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                              {p.status === 'registered' ? 'مسجّل' :
                               p.status === 'confirmed' ? 'مؤكّد' :
                               p.status === 'cancelled' ? 'ملغي' :
                               p.status === 'no_show' ? 'لم يحضر' : p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {canManageMoney && p.transaction_id && !isCancelled && (
                                <Button variant="ghost" size="sm" onClick={() => setPayPassenger(p)}>
                                  <DollarSign size={14} className="text-green-400" />
                                </Button>
                              )}
                              {isTripManager && !isCancelled && (
                                <Button variant="ghost" size="sm" onClick={() => handleCancelPassenger(p.id)}>
                                  <Trash2 size={14} className="text-red-400" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── Tab: Budget ─── */}
      {activeTab === 'budget' && (
        <div className="space-y-4 animate-fade-in">
          {budget && <TripBudgetSummary budget={budget} costItems={costItems} />}

          {/* Cost items list */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <DollarSign size={16} className="text-slate-400" />
                بنود التكاليف ({costItems.length})
              </h3>
              {isTripManager && (
                <Button variant="gradient" size="sm" onClick={() => { setEditCost(null); setAddCostOpen(true); }}>
                  <Plus size={16} /> إضافة بند
                </Button>
              )}
            </div>

            {costItems.length === 0 ? (
              <p className="text-slate-400 text-sm">لا يوجد بنود تكاليف بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3 font-bold">الفئة</th>
                      <th className="text-right px-4 py-3 font-bold">الوصف</th>
                      <th className="text-right px-4 py-3 font-bold">المورّد</th>
                      <th className="text-right px-4 py-3 font-bold">الكمية</th>
                      <th className="text-right px-4 py-3 font-bold">سعر الوحدة</th>
                      <th className="text-right px-4 py-3 font-bold">الإجمالي</th>
                      <th className="text-right px-4 py-3 font-bold">الإجمالي (USD)</th>
                      {isTripManager && <th className="text-right px-4 py-3 font-bold">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {costItems.map(ci => (
                      <tr key={ci.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            {COST_CATEGORY_LABELS[ci.category] || ci.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{ci.label}</td>
                        <td className="px-4 py-3 text-slate-400">{ci.vendor_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{ci.quantity}</td>
                        <td className="px-4 py-3 text-slate-300">{fmtMoney(ci.unit_amount, ci.currency_code)}</td>
                        <td className="px-4 py-3 text-white font-bold">{fmtMoney(ci.total_amount, ci.currency_code)}</td>
                        <td className="px-4 py-3 text-slate-400">${Math.round(Number(ci.total_usd || 0)).toLocaleString('en-US')}</td>
                        {isTripManager && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditCost(ci); setAddCostOpen(true); }}>
                                <Pencil size={14} />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCost(ci.id)}>
                                  <Trash2 size={14} className="text-red-400" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── Tab: Attachments ─── */}
      {activeTab === 'attachments' && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black flex items-center gap-2">
                  <Paperclip size={18} className="text-slate-400" />
                  المرفقات
                </div>
                <div className="text-xs text-slate-400">PDF / صور / مستندات</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1">رفع مرفقات جديدة</div>
              <input
                className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
                type="file"
                multiple
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">{uploadFiles.length ? `${uploadFiles.length} ملف جاهز للرفع` : ''}</div>
                <Button variant="secondary" onClick={uploadAttachments} disabled={!uploadFiles.length || uploading}>
                  {uploading ? 'جاري الرفع...' : 'رفع'}
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/60 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
                <div className="text-xs text-slate-400">قائمة المرفقات</div>
                <div className="text-xs text-slate-500">{attachments.length} ملف</div>
              </div>
              {attachments.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">لا يوجد مرفقات بعد.</div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {attachments.map((a: any) => (
                    <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 text-sm truncate">{a.original_name}</div>
                        <div className="text-xs text-slate-500">رفع بواسطة {a.uploaded_by_name} — {fmtDate(a.uploaded_at)}</div>
                      </div>
                      <Button variant="secondary" onClick={() => downloadAttachment(a)}>تنزيل</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Modals ─── */}
      <EditTripModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => load()} trip={trip} />

      <AddBusModal
        open={addBusOpen}
        onClose={() => { setAddBusOpen(false); setEditBus(null); }}
        onSaved={() => load()}
        tripId={Number(id)}
        bus={editBus}
      />

      <RegisterPassengerModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSaved={() => load()}
        tripId={Number(id)}
      />

      <AddCostItemModal
        open={addCostOpen}
        onClose={() => { setAddCostOpen(false); setEditCost(null); }}
        onSaved={() => load()}
        tripId={Number(id)}
        costItem={editCost}
      />

      {payPassenger && payPassenger.transaction_id && (
        <PaymentModal
          open={!!payPassenger}
          onClose={() => setPayPassenger(null)}
          transactionId={Number(payPassenger.transaction_id)}
          defaultCurrencyCode={payPassenger.sell_currency_code}
          onSaved={() => { setPayPassenger(null); load(); }}
        />
      )}
    </div>
  );
}
