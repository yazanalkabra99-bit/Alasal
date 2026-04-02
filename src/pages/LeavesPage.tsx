import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Check, X, Trash2, Clock, Filter } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth, hasAnyRole } from '../state/auth';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import type { LeaveRequest, LeaveType, LeaveStatus } from '../utils/types';

const statusLabels: Record<LeaveStatus, string> = {
  pending: 'معلق',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const statusColors: Record<LeaveStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function LeavesPage() {
  const { user } = useAuth();
  const isAdmin = hasAnyRole(user, ['admin', 'airline_admin']);

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | ''>('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    hours_count: '',
    reason: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reject modal
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes] = await Promise.all([
        api.get('/leaves' + (filterStatus ? `?status=${filterStatus}` : '')),
        api.get('/leave-types'),
      ]);
      setLeaves(leavesRes.data.data || []);
      setLeaveTypes(typesRes.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [filterStatus]);

  const calcDays = () => {
    if (!createForm.start_date || !createForm.end_date) return 0;
    const start = new Date(createForm.start_date);
    const end = new Date(createForm.end_date);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.leave_type_id || !createForm.start_date || !createForm.end_date) {
      setCreateError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    
    const selectedType = leaveTypes.find(t => t.id === Number(createForm.leave_type_id));
    
    // Validate hours for hourly leave types
    if (selectedType?.is_hourly) {
      if (!createForm.hours_count || Number(createForm.hours_count) <= 0) {
        setCreateError('يرجى إدخال عدد الساعات المطلوب');
        return;
      }
      if (Number(createForm.hours_count) > 24) {
        setCreateError('لا يمكن طلب أكثر من 24 ساعة في اليوم الواحد');
        return;
      }
    }
    
    if (createForm.end_date < createForm.start_date) {
      setCreateError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }
    setCreating(true);
    try {
      await api.post('/leaves', {
        leave_type_id: Number(createForm.leave_type_id),
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        hours_count: createForm.hours_count ? Number(createForm.hours_count) : undefined,
        reason: createForm.reason || undefined,
      });
      setShowCreate(false);
      setCreateForm({ leave_type_id: '', start_date: '', end_date: '', hours_count: '', reason: '' });
      fetchAll();
    } catch (e: any) {
      setCreateError(e?.response?.data?.error || 'حدث خطأ');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/leaves/${id}/approve`);
      fetchAll();
    } catch {
      // ignore
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await api.patch(`/leaves/${rejectId}/reject`, { rejection_reason: rejectReason.trim() });
      setRejectId(null);
      setRejectReason('');
      fetchAll();
    } catch {
      // ignore
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/leaves/${deleteId}`);
      setDeleteId(null);
      fetchAll();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  
  // Get selected leave type
  const selectedLeaveType = leaveTypes.find(t => t.id === Number(createForm.leave_type_id));

  const tabs: { key: LeaveStatus | ''; label: string; count?: number }[] = [
    { key: '', label: 'الكل' },
    { key: 'pending', label: 'معلق', count: pendingCount },
    { key: 'approved', label: 'مقبول' },
    { key: 'rejected', label: 'مرفوض' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/20">
            <CalendarDays className="text-green-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإجازات</h1>
            <p className="text-sm text-slate-400">إدارة طلبات الإجازات</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-medium transition shadow-lg shadow-green-500/20"
        >
          <Plus size={16} />
          تقديم طلب إجازة
        </button>
      </div>

      {/* Stats Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{leaves.length}</div>
            <div className="text-xs text-slate-400 mt-1">إجمالي الطلبات</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400">{leaves.filter(l => l.status === 'pending').length}</div>
            <div className="text-xs text-slate-400 mt-1">معلقة</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">{leaves.filter(l => l.status === 'approved').length}</div>
            <div className="text-xs text-slate-400 mt-1">مقبولة</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400">{leaves.filter(l => l.status === 'rejected').length}</div>
            <div className="text-xs text-slate-400 mt-1">مرفوضة</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-slate-400" />
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === tab.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="mr-1 px-1.5 py-0.5 text-[10px] bg-yellow-500/30 text-yellow-400 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد طلبات إجازة</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/30">
                  {isAdmin && <th className="text-right px-4 py-3 text-slate-400 font-medium">الموظف</th>}
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">نوع الإجازة</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">من</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">إلى</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">الأيام/الساعات</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">السبب</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition">
                    {isAdmin && (
                      <td className="px-4 py-3 font-medium text-white">{leave.user_name}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: leave.leave_type_color }}
                        />
                        {leave.leave_type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{leave.start_date}</td>
                    <td className="px-4 py-3 text-slate-300">{leave.end_date}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {leave.hours_count ? `${leave.hours_count} ساعة` : `${leave.days_count} يوم`}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{leave.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${statusColors[leave.status]}`}>
                        {leave.status === 'pending' && <Clock size={12} />}
                        {leave.status === 'approved' && <Check size={12} />}
                        {leave.status === 'rejected' && <X size={12} />}
                        {statusLabels[leave.status]}
                      </span>
                      {leave.status === 'rejected' && leave.rejection_reason && (
                        <div className="text-xs text-red-400 mt-1">{leave.rejection_reason}</div>
                      )}
                      {leave.decider_name && leave.status !== 'pending' && (
                        <div className="text-xs text-slate-500 mt-1">بواسطة: {leave.decider_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Admin approve/reject buttons for pending requests */}
                        {isAdmin && leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(leave.id)}
                              className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                              title="قبول"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => { setRejectId(leave.id); setRejectReason(''); }}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                              title="رفض"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {/* Owner can cancel pending requests */}
                        {leave.status === 'pending' && leave.user_id === user?.id && (
                          <button
                            onClick={() => setDeleteId(leave.id)}
                            className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                            title="إلغاء"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {leave.status !== 'pending' && (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Leave Modal */}
      <Modal open={showCreate} title="تقديم طلب إجازة" onClose={() => setShowCreate(false)}>
        <div className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">نوع الإجازة *</label>
            <select
              value={createForm.leave_type_id}
              onChange={e => {
                const selectedType = leaveTypes.find(t => t.id === Number(e.target.value));
                setCreateForm(f => ({ 
                  ...f, 
                  leave_type_id: e.target.value,
                  hours_count: selectedType?.is_hourly ? f.hours_count : ''
                }));
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-green-500/50 focus:outline-none transition"
            >
              <option value="">اختر نوع الإجازة</option>
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_hourly 
                    ? t.max_hours_per_year ? ` (${t.max_hours_per_year} ساعة/سنة)` : ' (ساعة)' 
                    : t.max_days_per_year ? ` (${t.max_days_per_year} يوم/سنة)` : ''
                  }
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">من تاريخ *</label>
              <input
                type="date"
                value={createForm.start_date}
                onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-green-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">إلى تاريخ *</label>
              <input
                type="date"
                value={createForm.end_date}
                onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-green-500/50 focus:outline-none transition"
              />
            </div>
          </div>
          
          {/* Show hours info for hourly leave types */}
          {selectedLeaveType?.is_hourly && selectedLeaveType.max_hours_per_year && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
              الحد الأقصى: <strong>{selectedLeaveType.max_hours_per_year}</strong> ساعة/سنة
            </div>
          )}
          
          {/* Show days info for daily leave types */}
          {selectedLeaveType && !selectedLeaveType.is_hourly && selectedLeaveType.max_days_per_year && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
              الحد الأقصى: <strong>{selectedLeaveType.max_days_per_year}</strong> يوم/سنة
            </div>
          )}

          {calcDays() > 0 && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
              عدد الأيام: <strong>{calcDays()}</strong> يوم
            </div>
          )}
                
          {/* Hours input for hourly leave types */}
          {leaveTypes.find(t => t.id === Number(createForm.leave_type_id))?.is_hourly ? (
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">عدد الساعات *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={createForm.hours_count}
                onChange={e => setCreateForm(f => ({ ...f, hours_count: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-green-500/50 focus:outline-none transition"
                placeholder="مثال: 2 أو 4.5"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">السبب (اختياري)</label>
            <textarea
              value={createForm.reason}
              onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-green-500/50 focus:outline-none transition resize-none"
              placeholder="سبب الإجازة..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {creating ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'تقديم الطلب'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectId} title="رفض طلب الإجازة" onClose={() => setRejectId(null)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">سبب الرفض *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:border-red-500/50 focus:outline-none transition resize-none"
              placeholder="اكتب سبب رفض الطلب..."
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRejectId(null)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {rejecting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'رفض الطلب'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="إلغاء طلب الإجازة"
        message="هل أنت متأكد من إلغاء طلب الإجازة هذا؟"
        confirmText="إلغاء الطلب"
        cancelText="رجوع"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
