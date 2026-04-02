import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { useCurrencies } from '../../utils/useCurrencies';
import type { Party, PassportType, PassportTypeField } from '../../utils/types';

type CustomerOpt = { id: number; name: string; phone?: string | null; status?: string };

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function CreatePassportModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (passportRequestId: number) => void;
}) {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [offices, setOffices] = useState<Party[]>([]);
  const [passportTypes, setPassportTypes] = useState<PassportType[]>([]);

  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [forWhom, setForWhom] = useState<'our_client' | 'other_office'>('our_client');
  // Financial customer (who owes us) — like "بيع خدمة"
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPartyId, setCustomerPartyId] = useState<number | null>(null);
  const [customerResults, setCustomerResults] = useState<CustomerOpt[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchTimerRef = useRef<number | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const [officePartyId, setOfficePartyId] = useState<number | ''>('');
  const [passportTypeId, setPassportTypeId] = useState<number | ''>('');
  const [typeFields, setTypeFields] = useState<PassportTypeField[]>([]);
  const [extraValues, setExtraValues] = useState<Record<string, any>>({});


  const [sellingAmount, setSellingAmount] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [submissionDate, setSubmissionDate] = useState<string>(todayYmd());
  const [processingDays, setProcessingDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);

  const { currencies } = useCurrencies();

  const selectedType = useMemo(() => {
    if (!passportTypeId) return null;
    return passportTypes.find((t) => t.id === passportTypeId) || null;
  }, [passportTypeId, passportTypes]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingMeta(true);
    (async () => {
      try {
        const [oRes, tRes] = await Promise.all([api.get('/meta/offices'), api.get('/passport-types')]);
        setOffices(oRes.data.data || []);
        setPassportTypes((tRes.data.data || []).filter((x: PassportType) => x.is_active));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل البيانات');
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open]);

  // Customer search (autocomplete) — only when forWhom=our_client
  useEffect(() => {
    if (!open) return;
    if (forWhom !== 'our_client') return;

    const q = customerName.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      setCustomerSearching(false);
      return;
    }
    if (customerSearchTimerRef.current) {
      window.clearTimeout(customerSearchTimerRef.current);
      customerSearchTimerRef.current = null;
    }
    customerSearchTimerRef.current = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await api.get('/meta/parties', { params: { type: 'customer', q, limit: 10 } });
        setCustomerResults((res.data.data || []).filter((c: any) => c?.status !== 'inactive'));
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 250);

    return () => {
      if (customerSearchTimerRef.current) {
        window.clearTimeout(customerSearchTimerRef.current);
        customerSearchTimerRef.current = null;
      }
    };
  }, [open, forWhom, customerName]);

  // Smart default: start billing customer with applicant values
  useEffect(() => {
    if (!open) return;
    if (forWhom !== 'our_client') return;
    if (customerPartyId) return;
    if (!customerName.trim() && applicantName.trim()) setCustomerName(applicantName);
    if (!customerPhone.trim() && applicantPhone.trim()) setCustomerPhone(applicantPhone);
  }, [open, forWhom, applicantName, applicantPhone, customerPartyId]);



  // Auto-fill from selected type
  useEffect(() => {
    if (!selectedType) return;
    setCurrencyCode(selectedType.default_currency_code || 'USD');
    setProcessingDays(Number(selectedType.default_days || 7));
    if (selectedType.default_price != null) {
      setSellingAmount(String(selectedType.default_price));
    }
  }, [selectedType]);

  function resetForm() {
    setApplicantName('');
    setApplicantPhone('');
    setForWhom('our_client');
    setOfficePartyId('');
    setPassportTypeId('');
    setSellingAmount('');
    setCurrencyCode('USD');
    setSubmissionDate(todayYmd());
    setProcessingDays(7);
    setNotes('');
    setFiles([]);
    setError(null);
  }

  

  // Load dynamic fields for selected passport type (same behavior as visa)
  useEffect(() => {
    if (!open) return;
    if (!passportTypeId) {
      setTypeFields([]);
      setExtraValues({});
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/passport-types/${passportTypeId}/fields`);
        const rows: PassportTypeField[] = res.data.data || [];
        setTypeFields(rows);
        // keep existing values but drop keys not in defs
        setExtraValues((prev) => {
          const next: Record<string, any> = { ...prev };
          const allowed = new Set(rows.map((r) => r.field_key));
          for (const k of Object.keys(next)) {
            if (!allowed.has(k)) delete next[k];
          }
          return next;
        });
      } catch {
        setTypeFields([]);
      }
    })();
  }, [passportTypeId, open]);
async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        applicant_name: applicantName.trim(),
        applicant_phone: String(applicantPhone || '').replace(/[^0-9]/g,'').trim(),
        for_whom: forWhom,
        office_party_id: forWhom === 'other_office' ? Number(officePartyId) : null,
        customer_party_id: forWhom === 'our_client' ? customerPartyId : null,
        customer_name: forWhom === 'our_client' ? (customerName.trim() || applicantName.trim()) : null,
        customer_phone: forWhom === 'our_client' ? ((customerPhone.trim() || applicantPhone.trim()) || null) : null,
        customer_phone2: forWhom === 'our_client' ? (customerPhone2.trim() || null) : null,
        passport_type_id: Number(passportTypeId),
        selling_amount: Number(sellingAmount),
        currency_code: currencyCode,
        submission_date: submissionDate,
        processing_days: Number(processingDays),
        notes: notes.trim() || null,
        extra_fields: extraValues,

      };

      if (!payload.applicant_name) throw new Error('اسم صاحب الطلب مطلوب');
      if (!payload.applicant_phone) throw new Error('موبايل صاحب الطلب مطلوب');
      if (!payload.passport_type_id) throw new Error('نوع الجواز مطلوب');
      if (forWhom === 'other_office' && !payload.office_party_id) throw new Error('اختر المكتب');
      if (!Number.isFinite(payload.selling_amount) || payload.selling_amount <= 0) throw new Error('سعر المبيع غير صحيح');
      if (!payload.submission_date) throw new Error('تاريخ التقديم مطلوب');
      if (!Number.isFinite(payload.processing_days) || payload.processing_days <= 0) throw new Error('مدة الإنجاز غير صحيحة');
      // Validate required dynamic fields
      for (const f of typeFields) {
        if (f.is_required) {
          const v = payload.extra_fields?.[f.field_key];
          if (v === undefined || v === null || String(v).trim() === '') {
            throw new Error(`الحقل مطلوب: ${f.label}`);
          }
        }
      }


      const res = await api.post('/passport-requests', payload);
      const passportRequestId = Number(res.data?.data?.passport_request_id);
      if (!passportRequestId) throw new Error('تعذر إنشاء الطلب');

      // Upload attachments (optional)
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', '');
        await api.post(`/passport-requests/${passportRequestId}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onCreated(passportRequestId);
      onClose();
      resetForm();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'فشل إنشاء الطلب');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); }} title="طلب جواز جديد" width="max-w-2xl">
      {error && (
        <div className="mb-3 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">اسم صاحب الطلب</div>
          <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="الاسم الكامل" />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">موبايل صاحب الطلب</div>
          <Input type="tel" inputMode="numeric" value={applicantPhone} onChange={(e) => setApplicantPhone(String(e.target.value || '').replace(/[^0-9]/g,''))} placeholder="09xxxxxxxx" />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">لصالح</div>
          <Select value={forWhom} onChange={(e) => setForWhom(e.target.value as any)}>
            <option value="our_client">عميل مكتبنا</option>
            <option value="other_office">مكتب آخر</option>
          </Select>
        </div>

        {/* Office Selection (only when other_office is selected) */}
        {forWhom === 'other_office' && (
          <div>
            <div className="text-xs text-slate-400 mb-1">اختيار المكتب</div>
            <Select
              value={String(officePartyId)}
              onChange={(e) => setOfficePartyId(Number(e.target.value) || '')}
            >
              <option value="">اختر مكتب…</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {forWhom === 'our_client' && (
          <div className="md:col-span-2 p-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-3">
            <div className="text-xs font-bold text-amber-400">العميل (الذمة المالية)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <div className="text-xs text-slate-400 mb-1">اسم العميل</div>
                <Input
                  ref={customerInputRef as any}
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerPartyId(null);
                  }}
                  onFocus={() => setCustomerSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setCustomerSearchOpen(false), 150)}
                  placeholder="اكتب أول حرفين ليقترح أسماء العملاء"
                />

                {customerSearchOpen && customerName.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                    {customerSearching ? (
                      <div className="p-3 text-xs text-slate-400">جاري البحث…</div>
                    ) : customerResults.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">لا توجد نتائج</div>
                    ) : (
                      <div className="max-h-56 overflow-auto">
                        {customerResults.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCustomerPartyId(Number(c.id));
                              setCustomerName(String(c.name || ''));
                              setCustomerPhone(String(c.phone || ''));
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <div className="text-sm font-bold text-slate-100 truncate">{c.name}</div>
                            <div className="text-[11px] text-slate-500" dir="ltr">{c.phone || '—'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-1 text-[11px] text-slate-500">
                  {customerPartyId ? 'تم اختيار عميل مسجّل' : 'يمكنك إدخال اسم جديد (سيتم حفظه تلقائيًا)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">رقم الموبايل 1</div>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(String(e.target.value || '').replace(/[^0-9]/g,''))}
                    dir="ltr"
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">رقم الموبايل 2</div>
                  <Input
                    value={customerPhone2}
                    onChange={(e) => setCustomerPhone2(String(e.target.value || '').replace(/[^0-9]/g,''))}
                    dir="ltr"
                    placeholder="09xxxxxxxx"
                  />
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">إذا اخترت عميلًا من الاقتراحات سيتم تعبئة الرقم تلقائيًا.</div>
            </div>
          </div>
        )}

        {/* Passport Type */}
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">نوع الجواز</div>
          <Select value={String(passportTypeId)} onChange={(e) => setPassportTypeId(Number(e.target.value) || '')}>
            <option value="">اختر نوع…</option>
            {passportTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_active ? '' : '(موقوف)'}
              </option>
            ))}
          </Select>
        </div>

        {typeFields.length > 0 && (
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">بيانات إضافية حسب نوع الجواز</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
              {typeFields.map((f) => (
                <div key={f.id}>
                  <div className="text-xs text-slate-400 mb-1">
                    {f.label} {f.is_required ? <span className="text-amber-400">*</span> : null}
                  </div>
                  {f.field_type === 'select' ? (
                    <Select
                      value={String(extraValues[f.field_key] ?? '')}
                      onChange={(e) => setExtraValues((p) => ({ ...p, [f.field_key]: e.target.value }))}
                    >
                      <option value="">اختر…</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                      value={extraValues[f.field_key] ?? ''}
                      onChange={(e) => setExtraValues((p) => ({ ...p, [f.field_key]: e.target.value }))}
                      placeholder={f.field_type === 'date' ? '' : '...'}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        <div>
          <div className="text-xs text-slate-400 mb-1">سعر المبيع</div>
          <Input type="number" value={sellingAmount} onChange={(e) => setSellingAmount(e.target.value)} />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">العملة</div>
          <Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
            {(currencies && currencies.length ? currencies : [
              { code: 'USD', name: 'USD' },
              { code: 'SYP', name: 'SYP' },
              { code: 'AED', name: 'AED' },
            ]).map((c: any) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">تاريخ التقديم</div>
          <Input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">مدة الإنجاز (بالأيام)</div>
          <Input type="number" value={processingDays} onChange={(e) => setProcessingDays(Number(e.target.value))} />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" />
        </div>

        <div className="md:col-span-2 border-t border-slate-800/60 pt-3 mt-2">
          <div className="text-sm font-bold text-slate-300 mb-2">المرفقات (اختياري)</div>
          
          <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 px-4 py-6 text-sm text-slate-400 hover:border-brand-600/50 hover:bg-slate-900/40 cursor-pointer transition">
            <Upload size={18} />
            <span>اختر الملفات أو اسحبها هنا</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) { setFiles(prev => [...prev, ...f]); e.target.value = ''; } }}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-2">الملفات المحددة:</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-slate-400">
                        {file.type.startsWith('image/') ? '🖼️' : 
                         file.type === 'application/pdf' ? '📄' : 
                         file.type.includes('word') ? '📝' : '📎'}
                      </div>
                      <div className="text-sm text-slate-200 truncate">{file.name}</div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{(file.size / 1024 / 1024).toFixed(1)}MB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => { onClose(); resetForm(); }}>
          إلغاء
        </Button>
        <Button
          loading={saving}
          disabled={loadingMeta || saving}
          onClick={submit}
        >
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
