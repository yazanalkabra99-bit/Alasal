import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type UserOpt = { id: number; name: string; role: string };

export function CreateTripModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxPassengers, setMaxPassengers] = useState<number>(50);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [managerResults, setManagerResults] = useState<UserOpt[]>([]);
  const [managerSearchOpen, setManagerSearchOpen] = useState(false);
  const managerTimerRef = useRef<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setName(''); setDestination(''); setStartDate(''); setEndDate('');
      setMaxPassengers(50); setManagerId(null); setManagerName('');
      setNotes(''); setError('');
    }
  }, [open]);

  const searchManagers = (q: string) => {
    setManagerName(q);
    setManagerId(null);
    if (managerTimerRef.current) clearTimeout(managerTimerRef.current);
    if (q.trim().length < 1) { setManagerResults([]); setManagerSearchOpen(false); return; }
    managerTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await api.get('/users?q=' + encodeURIComponent(q.trim()));
        const users = (res.data?.data || res.data || []).filter((u: UserOpt) => u.id);
        setManagerResults(users);
        setManagerSearchOpen(users.length > 0);
      } catch { setManagerResults([]); }
    }, 300);
  };

  const selectManager = (u: UserOpt) => {
    setManagerId(u.id);
    setManagerName(u.name);
    setManagerSearchOpen(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('اسم الرحلة مطلوب'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post('/trips', {
        name: name.trim(),
        destination: destination.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        max_passengers: maxPassengers,
        manager_id: managerId,
        notes: notes.trim() || null,
      });
      onCreated(res.data.data.id);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'حدث خطأ');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="رحلة جديدة">
      <div className="space-y-4 p-4">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

        <div>
          <div className="text-xs text-slate-400 mb-1">اسم الرحلة *</div>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: حملة العمرة - رجب" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">الوجهة</div>
          <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="مثال: مكة المكرمة" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">تاريخ البدء</div>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">تاريخ الانتهاء</div>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">أقصى عدد ركاب</div>
          <Input type="number" value={maxPassengers} onChange={e => setMaxPassengers(Number(e.target.value))} min={1} />
        </div>

        {/* Manager autocomplete */}
        <div className="relative">
          <div className="text-xs text-slate-400 mb-1">مدير الحملة (اختياري)</div>
          <Input value={managerName} onChange={e => searchManagers(e.target.value)} placeholder="ابحث عن موظف..." />
          {managerSearchOpen && managerResults.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-auto">
              {managerResults.map(u => (
                <button key={u.id} className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm text-white" onClick={() => selectManager(u)}>
                  {u.name} <span className="text-slate-400 text-xs">({u.role})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
          <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm resize-none h-20"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'جاري الحفظ...' : 'إنشاء الرحلة'}</Button>
        </div>
      </div>
    </Modal>
  );
}
