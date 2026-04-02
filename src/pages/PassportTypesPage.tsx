import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Power, RefreshCcw } from 'lucide-react';
import { api } from '../utils/api';
import { useCurrencies } from '../utils/useCurrencies';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { PassportType, PassportTypeField } from '../utils/types';

type FormState = {
  name: string;
  scope: 'internal' | 'external';
  speed: 'normal' | 'urgent' | 'instant';
  default_days: number;
  default_price: string;
  default_currency_code: string;
  is_active: 0 | 1;
};

export function PassportTypesPage() {
  const [rows, setRows] = useState<PassportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PassportType | null>(null);

  const { currencies } = useCurrencies();
  const currencyCodes = useMemo(() => {
    const list = (currencies || []) as any[];
    if (list.length) return list.map((c) => c.code);
    return ['USD', 'SYP', 'AED'];
  }, [currencies]);

  // Phase 2: dynamic fields manager (مثل الفيزا)
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldsType, setFieldsType] = useState<PassportType | null>(null);
  const [fieldsRows, setFieldsRows] = useState<PassportTypeField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [fieldEditing, setFieldEditing] = useState<PassportTypeField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    field_key: '',
    field_type: 'text' as PassportTypeField['field_type'],
    options_text: '',
    is_required: false,
    visible_to_employee: true,
    is_active: true,
    sort_order: 0,
  });


  const [form, setForm] = useState<FormState>({
    name: '',
    scope: 'internal',
    speed: 'normal',
    default_days: 7,
    default_price: '',
    default_currency_code: 'USD',
    is_active: 1,
  });

  function resetForm() {
    setEditing(null);
    setForm({
      name: '',
      scope: 'internal',
      speed: 'normal',
      default_days: 7,
      default_price: '',
      default_currency_code: 'USD',
      is_active: 1,
    });
  }


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
      const res = await api.get(`/passport-types/${typeId}/fields`);
      setFieldsRows(res.data.data || []);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر تحميل الحقول');
    } finally {
      setFieldsLoading(false);
    }
  }

  async function openFields(t: PassportType) {
    setFieldsType(t);
    resetFieldForm();
    setFieldsOpen(true);
    await loadFields(t.id);
  }

  function editField(f: PassportTypeField) {
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
        await api.put(`/passport-types/${fieldsType.id}/fields/${fieldEditing.id}`, payload);
      } else {
        await api.post(`/passport-types/${fieldsType.id}/fields`, payload);
      }
      resetFieldForm();
      await loadFields(fieldsType.id);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر حفظ الحقل');
    }
  }

  async function toggleField(f: PassportTypeField) {
    if (!fieldsType) return;
    setFieldsError(null);
    try {
      await api.patch(`/passport-types/${fieldsType.id}/fields/${f.id}/toggle`);
      await loadFields(fieldsType.id);
    } catch (e: any) {
      setFieldsError(e?.response?.data?.error || 'تعذر تعديل الحالة');
    }
  }



  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/passport-types');
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل أنواع الجوازات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active === 1).length;
    return { active, inactive: rows.length - active, total: rows.length };
  }, [rows]);

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(t: PassportType) {
    setEditing(t);
    setForm({
      name: t.name || '',
      scope: t.scope,
      speed: t.speed,
      default_days: Number(t.default_days || 7),
      default_price: t.default_price == null ? '' : String(t.default_price),
      default_currency_code: (t.default_currency_code || 'USD'),
      is_active: t.is_active,
    });
    setOpen(true);
  }

  async function save() {
    const payload: any = {
      name: form.name.trim(),
      scope: form.scope,
      speed: form.speed,
      default_days: Number(form.default_days || 7),
      default_currency_code: form.default_currency_code,
      is_active: form.is_active,
      default_price: form.default_price === '' ? null : Number(form.default_price),
    };

    if (!payload.name) {
      setError('اسم النوع مطلوب');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/passport-types/${editing.id}`, payload);
      } else {
        await api.post('/passport-types', payload);
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر حفظ النوع');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: PassportType) {
    setError(null);
    try {
      await api.patch(`/passport-types/${t.id}/toggle`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تعديل الحالة');
    }
  }

  const labelScope = (s: string) => (s === 'internal' ? 'داخلي' : 'خارجي');
  const labelSpeed = (s: string) => (s === 'normal' ? 'عادي' : s === 'urgent' ? 'مستعجل' : 'فوري');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-black">أنواع الجوازات</div>
          <div className="text-sm text-slate-400">إدارة الأسعار والأنواع المتوفرة</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            إضافة نوع
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <span className="font-black text-slate-200">{stats.total}</span> نوع — فعال: {stats.active} — موقوف: {stats.inactive}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">الاسم</th>
                <th className="text-right px-4 py-3">التصنيف</th>
                <th className="text-right px-4 py-3">المدة</th>
                <th className="text-right px-4 py-3">السعر الافتراضي</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-400">جاري التحميل…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-400">لا توجد بيانات</td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3 font-semibold">{t.name}</td>
                    <td className="px-4 py-3 text-slate-300">{labelScope(t.scope)} — {labelSpeed(t.speed)}</td>
                    <td className="px-4 py-3 text-slate-300">{t.default_days} يوم</td>
                    <td className="px-4 py-3 font-black">
                      {t.default_price == null ? '—' : `${t.default_price} ${t.default_currency_code}`}
                    </td>
                    <td className="px-4 py-3">
                      {t.is_active ? <Badge tone="green">فعال</Badge> : <Badge tone="gray">موقوف</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => openEdit(t)}>
                          <Pencil size={16} />
                          تعديل
                        </Button>
                        <Button variant="secondary" onClick={() => openFields(t)}>
                          حقول
                        </Button>
                        <Button variant="ghost" onClick={() => toggle(t)}>
                          <Power size={16} />
                          {t.is_active ? 'تعطيل' : 'تفعيل'}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل نوع' : 'إضافة نوع'} width="max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">الاسم</div>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">داخلي / خارجي</div>
            <Select value={form.scope} onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}>
              <option value="internal">داخلي</option>
              <option value="external">خارجي</option>
            </Select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">عادي / مستعجل / فوري</div>
            <Select value={form.speed} onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}>
              <option value="normal">عادي</option>
              <option value="urgent">مستعجل</option>
              <option value="instant">فوري</option>
            </Select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">المدة الافتراضية (أيام)</div>
            <Input type="number" value={form.default_days} onChange={(e) => setForm((p) => ({ ...p, default_days: Number(e.target.value) }))} />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">عملة السعر</div>
            <Select value={form.default_currency_code} onChange={(e) => setForm((p) => ({ ...p, default_currency_code: e.target.value }))}>
              {currencyCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">السعر الافتراضي</div>
            <Input type="number" value={form.default_price} onChange={(e) => setForm((p) => ({ ...p, default_price: e.target.value }))} placeholder="اختياري" />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <Select value={String(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: Number(e.target.value) as any }))}>
              <option value="1">فعال</option>
              <option value="0">موقوف</option>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button loading={saving} onClick={save}>حفظ</Button>
        </div>
      </Modal>


      {/* Phase 2: Dynamic fields manager */}
      <Modal
        open={fieldsOpen}
        title={fieldsType ? `حقول نوع الجواز: ${fieldsType.name}` : 'حقول نوع الجواز'}
        onClose={() => {
          setFieldsOpen(false);
          setFieldsType(null);
          resetFieldForm();
        }}
        width="max-w-3xl"
      >
        <div className="text-xs text-slate-400">هذه الحقول تظهر تلقائياً داخل فورم تقديم طلب الجواز حسب نوع الجواز.</div>

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
              <Input value={fieldForm.label} onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value }))} placeholder="مثال: رقم الجواز القديم" />
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
                placeholder="مثال: old_passport_no"
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
