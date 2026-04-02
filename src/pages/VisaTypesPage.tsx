import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Power, RefreshCcw } from 'lucide-react';
import { api } from '../utils/api';
import { useCurrencies } from '../utils/useCurrencies';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { VisaType, VisaTypeField } from '../utils/types';

type FormState = {
  name: string;
  category: string;
  country: string;
  default_days: number;
  alert_days: number;
  default_price: string;
  default_currency_code: string;
  is_active: 0 | 1;
};

export function VisaTypesPage() {
  const [rows, setRows] = useState<VisaType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VisaType | null>(null);
  const [saving, setSaving] = useState(false);

  const { currencies } = useCurrencies();
  const currencyOptions = useMemo(() => {
    const list = (currencies || []) as any[];
    if (list.length) return list.map((c) => ({ code: c.code, label: c.code }));
    return [
      { code: 'USD', label: 'USD' },
      { code: 'SYP', label: 'SYP' },
      { code: 'AED', label: 'AED' },
    ];
  }, [currencies]);

  // Phase 2: dynamic fields manager
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldsType, setFieldsType] = useState<VisaType | null>(null);
  const [fieldsRows, setFieldsRows] = useState<VisaTypeField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [fieldEditing, setFieldEditing] = useState<VisaTypeField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    field_key: '',
    field_type: 'text' as VisaTypeField['field_type'],
    options_text: '',
    is_required: false,
    visible_to_employee: true,
    is_active: true,
    sort_order: 0,
  });

  const [form, setForm] = useState<FormState>({
    name: '',
    category: '',
    country: '',
    default_days: 7,
    alert_days: 5,
    default_price: '',
    default_currency_code: 'USD',
    is_active: 1,
  });

  function resetForm() {
    setEditing(null);
    setForm({
      name: '',
      category: '',
      country: '',
      default_days: 7,
      alert_days: 5,
      default_price: '',
      default_currency_code: 'USD',
      is_active: 1,
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/visa-types');
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل أنواع الفيز');
    } finally {
      setLoading(false);
    }
  }

  // -------- Phase 2: Dynamic fields logic
  function resetFieldForm() {
    setFieldEditing(null);
    setFieldForm({
      label: '',
      field_key: '',
      field_type: 'text',
      options_text: '',
      is_required: false,
      visible_to_employee: true,
      is_active: true,
      sort_order: 0,
    });
  }

  async function loadFields(typeId: number) {
    setFieldsLoading(true);
    setFieldsError(null);
    try {
      const res = await api.get(`/visa-types/${typeId}/fields`);
      setFieldsRows(res.data.data || []);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر تحميل الحقول');
    } finally {
      setFieldsLoading(false);
    }
  }

  async function openFields(v: VisaType) {
    setFieldsType(v);
    resetFieldForm();
    setFieldsOpen(true);
    await loadFields(v.id);
  }

  function editField(f: VisaTypeField) {
    setFieldEditing(f);
    setFieldForm({
      label: f.label || '',
      field_key: f.field_key || '',
      field_type: f.field_type,
      options_text: (f.options || []).join('\n'),
      is_required: f.is_required === 1,
      visible_to_employee: f.visible_to_employee === 1,
      is_active: f.is_active === 1,
      sort_order: Number(f.sort_order || 0),
    });
  }

  function parseOptions(text: string) {
    const lines = String(text || '')
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(lines));
  }

  function normalizeFieldKey(input: string) {
    let k = String(input || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    // ensure it starts with a letter for consistency
    if (k && !/^[a-z]/.test(k)) k = `f_${k}`;
    return k;
  }

  async function saveField() {
    if (!fieldsType) return;
    setFieldsError(null);
    const normalizedKey = normalizeFieldKey(fieldForm.field_key);
    const payload: any = {
      label: fieldForm.label.trim(),
      field_key: normalizedKey,
      field_type: fieldForm.field_type,
      is_required: fieldForm.is_required,
      visible_to_employee: !!fieldForm.visible_to_employee,
      is_active: !!fieldForm.is_active,
      sort_order: Number(fieldForm.sort_order || 0),
    };
    if (!payload.label) {
      setFieldsError('اسم الحقل مطلوب');
      return;
    }
    if (!payload.field_key) {
      setFieldsError('رمز الحقل (field_key) مطلوب');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(payload.field_key)) {
      setFieldsError('رمز الحقل يجب أن يكون بحروف إنجليزية صغيرة ويبدأ بحرف (a-z) ويسمح بالأرقام و underscore فقط');
      return;
    }
    if (payload.field_type === 'select') {
      const opts = parseOptions(fieldForm.options_text);
      if (!opts.length) {
        setFieldsError('خيارات القائمة مطلوبة');
        return;
      }
      payload.options = opts;
    }

    try {
      if (fieldEditing) {
        await api.put(`/visa-types/${fieldsType.id}/fields/${fieldEditing.id}`, payload);
      } else {
        await api.post(`/visa-types/${fieldsType.id}/fields`, payload);
      }
      resetFieldForm();
      await loadFields(fieldsType.id);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر حفظ الحقل');
    }
  }

  async function toggleField(f: VisaTypeField) {
    if (!fieldsType) return;
    setFieldsError(null);
    try {
      await api.patch(`/visa-types/${fieldsType.id}/fields/${f.id}/toggle`);
      await loadFields(fieldsType.id);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر تعديل الحالة');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active === 1).length;
    const inactive = rows.length - active;
    return { active, inactive, total: rows.length };
  }, [rows]);

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(v: VisaType) {
    setEditing(v);
    setForm({
      name: v.name || '',
      category: v.category || '',
      country: v.country || '',
      default_days: Number(v.default_days ?? 7),
      alert_days: Number(v.alert_days ?? 5),
      default_price: v.default_price == null ? '' : String(v.default_price),
      default_currency_code: (v.default_currency_code || 'USD'),
      is_active: v.is_active,
    });
    setOpen(true);
  }

  async function save() {
    const payload: any = {
      name: form.name.trim(),
      category: form.category?.trim() || null,
      country: form.country?.trim() || null,
      default_days: Number(form.default_days || 7),
      alert_days: Number(form.alert_days || 5),
      default_currency_code: form.default_currency_code,
      is_active: form.is_active,
    };

    if (form.default_price !== '') {
      payload.default_price = Number(form.default_price);
    } else {
      payload.default_price = null;
    }

    if (!payload.name) {
      setError('اسم الفيزا مطلوب');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/visa-types/${editing.id}`, payload);
      } else {
        await api.post('/visa-types', payload);
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر حفظ نوع الفيزا');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(v: VisaType) {
    setError(null);
    try {
      await api.patch(`/visa-types/${v.id}/toggle`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تعديل الحالة');
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-lg font-black">إدارة أنواع الفيزا</div>
          <div className="text-xs text-slate-400">إضافة / تعديل / تعطيل أنواع الفيز — (المرحلة 1)</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            إضافة نوع
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="green">نشط: {stats.active}</Badge>
        <Badge tone="gray">متوقف: {stats.inactive}</Badge>
        <Badge tone="blue">الإجمالي: {stats.total}</Badge>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <Card className="mt-4 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">الاسم</th>
                <th className="text-right px-4 py-3">التصنيف</th>
                <th className="text-right px-4 py-3">الدولة</th>
                <th className="text-right px-4 py-3">مدة افتراضية</th>
                <th className="text-right px-4 py-3">تنبيه قبل</th>
                <th className="text-right px-4 py-3">سعر افتراضي</th>
                <th className="text-right px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>تحميل…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={8}>لا توجد بيانات</td></tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="border-t border-slate-800/60 hover:bg-slate-900/20">
                    <td className="px-4 py-3">
                      {v.is_active ? (
                        <Badge tone="green">نشط</Badge>
                      ) : (
                        <Badge tone="gray">متوقف</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-white">{v.name}</div>
                      <div className="text-xs text-slate-500">ID: {v.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{v.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{v.country || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{v.default_days}</span>
                      <span className="text-xs text-slate-500"> يوم</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{v.alert_days}</span>
                      <span className="text-xs text-slate-500"> يوم</span>
                    </td>
                    <td className="px-4 py-3">
                      {v.default_price == null ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span className="font-black">{Number(v.default_price).toLocaleString('en-US')} {v.default_currency_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => openEdit(v)}>
                          <Pencil size={16} />
                          تعديل
                        </Button>
                        <Button variant="secondary" onClick={() => openFields(v)}>
                          حقول
                        </Button>
                        <Button variant="ghost" onClick={() => toggle(v)}>
                          <Power size={16} />
                          {v.is_active ? 'تعطيل' : 'تفعيل'}
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

      <Modal
        open={open}
        title={editing ? 'تعديل نوع فيزا' : 'إضافة نوع فيزا'}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">اسم الفيزا *</div>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: عمرة 25 يوم" />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">التصنيف</div>
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Umrah / Approval / Visa ..." />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">الدولة</div>
            <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="Saudi / Lebanon / Jordan ..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-slate-400 mb-1">مدة الإنجاز الافتراضية (يوم)</div>
              <Input type="number" min={1} value={form.default_days} onChange={(e) => setForm((f) => ({ ...f, default_days: Number(e.target.value) }))} />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">تنبيه قبل (يوم)</div>
              <Input type="number" min={0} value={form.alert_days} onChange={(e) => setForm((f) => ({ ...f, alert_days: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-slate-400 mb-1">سعر بيع افتراضي</div>
              <Input type="number" min={0} value={form.default_price} onChange={(e) => setForm((f) => ({ ...f, default_price: e.target.value }))} placeholder="اختياري" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">العملة</div>
              <select
                className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50"
                value={form.default_currency_code}
                onChange={(e) => setForm((f) => ({ ...f, default_currency_code: e.target.value }))}
              >
                {currencyOptions.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <select
              className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50"
              value={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) as 0 | 1 }))}
            >
              <option value={1}>نشط</option>
              <option value={0}>متوقف</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => { setOpen(false); resetForm(); }}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'جاري الحفظ…' : editing ? 'حفظ التعديل' : 'إضافة'}
          </Button>
        </div>
      </Modal>

      {/* Phase 2: Dynamic fields manager */}
      <Modal
        open={fieldsOpen}
        title={fieldsType ? `حقول نوع الفيزا: ${fieldsType.name}` : 'حقول نوع الفيزا'}
        onClose={() => {
          setFieldsOpen(false);
          setFieldsType(null);
          resetFieldForm();
        }}
        width="max-w-3xl"
      >
        <div className="text-xs text-slate-400">هذه الحقول تظهر تلقائياً داخل فورم تقديم الطلب حسب نوع الفيزا.</div>

        {fieldsError && (
          <div className="mt-3 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
            {fieldsError}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800/60 bg-slate-900/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-black">{fieldEditing ? 'تعديل حقل' : 'إضافة حقل جديد'}</div>
            {fieldEditing && (
              <Button variant="ghost" onClick={resetFieldForm}>
                إلغاء التعديل
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">اسم الحقل *</div>
              <Input value={fieldForm.label} onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value }))} placeholder="مثال: رقم الكفيل" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">رمز الحقل (field_key) *</div>
              <Input
                value={fieldForm.field_key}
                onChange={(e) => setFieldForm((p) => ({ ...p, field_key: e.target.value }))}
                onBlur={() =>
                  setFieldForm((p) => ({
                    ...p,
                    field_key: normalizeFieldKey(p.field_key),
                  }))
                }
                placeholder="مثال: sponsor_id"
              />
              <div className="mt-1 text-[10px] text-slate-500">حروف إنجليزية صغيرة تبدأ بحرف + أرقام + underscore فقط</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1">نوع الحقل</div>
              <select
                className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50"
                value={fieldForm.field_type}
                onChange={(e) => setFieldForm((p) => ({ ...p, field_type: e.target.value }))}
              >
                <option value="text">نص</option>
                <option value="number">رقم</option>
                <option value="date">تاريخ</option>
                <option value="select">قائمة</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">ترتيب الظهور</div>
              <Input type="number" value={fieldForm.sort_order} onChange={(e) => setFieldForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>

            {fieldForm.field_type === 'select' && (
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">خيارات القائمة (سطر لكل خيار)</div>
                <textarea
                  className="w-full min-h-[90px] rounded-2xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50"
                  value={fieldForm.options_text}
                  onChange={(e) => setFieldForm((p) => ({ ...p, options_text: e.target.value }))}
                />
              </div>
            )}

            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={fieldForm.is_required} onChange={(e) => setFieldForm((p) => ({ ...p, is_required: e.target.checked }))} />
                مطلوب
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={fieldForm.visible_to_employee} onChange={(e) => setFieldForm((p) => ({ ...p, visible_to_employee: e.target.checked }))} />
                يظهر للموظف
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={fieldForm.is_active} onChange={(e) => setFieldForm((p) => ({ ...p, is_active: e.target.checked }))} />
                نشط
              </label>

              <div className="flex-1" />
              <Button onClick={saveField}>
                {fieldEditing ? 'حفظ الحقل' : 'إضافة الحقل'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800/60 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-black">الحقول الحالية</div>
              <div className="text-xs text-slate-400">تفعيل/تعطيل أو تعديل حسب الحاجة</div>
            </div>
            <div className="text-xs text-slate-500">{fieldsLoading ? 'تحميل…' : `${fieldsRows.length} حقل`}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/40 text-slate-300">
                <tr>
                  <th className="text-right px-4 py-3">الاسم</th>
                  <th className="text-right px-4 py-3">الرمز</th>
                  <th className="text-right px-4 py-3">النوع</th>
                  <th className="text-right px-4 py-3">مطلوب</th>
                  <th className="text-right px-4 py-3">يظهر للموظف</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">ترتيب</th>
                  <th className="text-right px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {fieldsRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-slate-400">لا توجد حقول مضافة بعد.</td>
                  </tr>
                ) : (
                  fieldsRows.map((f) => (
                    <tr key={f.id} className="border-t border-slate-800/60">
                      <td className="px-4 py-3 font-bold text-slate-200">{f.label}</td>
                      <td className="px-4 py-3 text-slate-300">{f.field_key}</td>
                      <td className="px-4 py-3 text-slate-300">{f.field_type}</td>
                      <td className="px-4 py-3">{f.is_required ? '✅' : '—'}</td>
                      <td className="px-4 py-3">{f.visible_to_employee ? '✅' : '—'}</td>
                      <td className="px-4 py-3">{f.is_active ? 'نشط' : 'متوقف'}</td>
                      <td className="px-4 py-3">{f.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" onClick={() => editField(f)}>تعديل</Button>
                          <Button variant="ghost" onClick={() => toggleField(f)}>{f.is_active ? 'تعطيل' : 'تفعيل'}</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
