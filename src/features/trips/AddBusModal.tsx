import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { TripBus } from './types';

interface AddBusModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  tripId: number;
  bus?: TripBus | null;
}

export function AddBusModal({ open, onClose, onSaved, tripId, bus }: AddBusModalProps) {
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState<number>(44);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!bus;

  useEffect(() => {
    if (open && bus) {
      setLabel(bus.label || '');
      setCapacity(bus.capacity || 44);
      setDriverName(bus.driver_name || '');
      setDriverPhone(bus.driver_phone || '');
      setPlateNumber(bus.plate_number || '');
      setNotes(bus.notes || '');
      setError('');
    } else if (open && !bus) {
      setLabel(''); setCapacity(44); setDriverName(''); setDriverPhone('');
      setPlateNumber(''); setNotes(''); setError('');
    }
  }, [open, bus]);

  const handleSubmit = async () => {
    if (!label.trim()) { setError('اسم الباص مطلوب'); return; }
    if (capacity < 1) { setError('السعة يجب أن تكون 1 على الأقل'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        label: label.trim(),
        capacity,
        driver_name: driverName.trim() || null,
        driver_phone: driverPhone.trim() || null,
        plate_number: plateNumber.trim() || null,
        notes: notes.trim() || null,
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/buses/${bus!.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/buses`, payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'حدث خطأ');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل الباص' : 'إضافة باص'}>
      <div className="space-y-4 p-4">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

        <div>
          <div className="text-xs text-slate-400 mb-1">اسم الباص *</div>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="مثال: باص 1" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">السعة (عدد المقاعد)</div>
          <Input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} min={1} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">اسم السائق</div>
            <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="اختياري" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">هاتف السائق</div>
            <Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="اختياري" />
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">رقم اللوحة</div>
          <Input value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="اختياري" />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
          <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm resize-none h-20"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الباص')}</Button>
        </div>
      </div>
    </Modal>
  );
}
