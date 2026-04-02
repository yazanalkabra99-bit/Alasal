import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Copy, Upload, Download, FileText,
  Key, ScrollText, Shield, Check, AlertTriangle, Clock, Paperclip
} from 'lucide-react';
import { api } from '../utils/api';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button, IconButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/* ─── Types ──────────────────────────────────────────────────── */
interface Account {
  id: number; title: string; platform: string | null; username: string | null;
  password: string | null; email: string | null; phone: string | null;
  url: string | null; notes: string | null; created_by_name: string | null;
  created_at: string;
}

interface Attachment {
  id: number; original_name: string; mime_type: string; size: number;
  label: string | null; uploaded_by: number; uploaded_at: string;
  uploaded_by_name: string;
}

interface DocRecord {
  id: number; title: string; category: string | null; description: string | null;
  notes: string | null; created_by_name: string | null; created_at: string;
  attachment_count: number; attachments: Attachment[];
}

interface License {
  id: number; title: string; license_number: string | null;
  issuing_authority: string | null; issue_date: string | null;
  expiry_date: string | null; status: string; notes: string | null;
  created_by_name: string | null; created_at: string;
  attachment_count: number; attachments: Attachment[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/** Authenticated file download helper – fetches as blob and triggers browser download */
async function downloadFile(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data]);
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(objUrl);
    document.body.removeChild(a);
  } catch {
    alert('فشل تحميل الملف');
  }
}

const tabList = [
  { id: 'accounts' as const, label: 'الحسابات وكلمات السر', icon: Key },
  { id: 'documents' as const, label: 'أوراق هامة', icon: ScrollText },
  { id: 'licenses' as const, label: 'تراخيص وعقود', icon: Shield },
];

type TabId = typeof tabList[number]['id'];

function fmtDate(d: string | null) {
  if (!d) return '-';
  return d.slice(0, 10);
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Main Page ──────────────────────────────────────────────── */
export function ArchivePage() {
  const [activeTab, setActiveTab] = useState<TabId>('accounts');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10">
          <Shield size={24} className="text-indigo-400" />
        </div>
        <div>
          <div className="text-lg font-black text-white">الأرشيف</div>
          <div className="text-xs text-slate-400">حفظ الحسابات والأوراق والتراخيص</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700/40">
        {tabList.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all
              ${activeTab === t.id
                ? 'bg-slate-700/80 text-white shadow-sm border border-slate-600/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
          >
            <t.icon size={18} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'accounts' && <AccountsTab />}
      {activeTab === 'documents' && <DocumentsTab />}
      {activeTab === 'licenses' && <LicensesTab />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1: ACCOUNTS & PASSWORDS
   ════════════════════════════════════════════════════════════════ */
function AccountsTab() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [visiblePw, setVisiblePw] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/archives/accounts');
      setItems(res.data.data || []);
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function togglePw(id: number) {
    setVisiblePw((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function copyPw(pw: string, id: number) {
    await navigator.clipboard.writeText(pw);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/archives/accounts/${deleteTarget.id}`); load(); }
    catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold text-slate-300">الحسابات وكلمات السر</div>
        <Button icon={<Plus size={18} />} onClick={() => { setEditing(null); setShowModal(true); }}>
          إضافة حساب
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-500">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <Key size={40} className="mx-auto text-slate-600 mb-3" />
          <div className="text-slate-400 text-sm">لا توجد حسابات محفوظة</div>
          <div className="text-slate-500 text-xs mt-1">اضغط "إضافة حساب" لحفظ أول حساب</div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white">{a.title}</h3>
                  {a.platform && (
                    <span className="inline-block mt-1 text-xs bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
                      {a.platform}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <IconButton variant="ghost" size="sm" onClick={() => { setEditing(a); setShowModal(true); }}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton variant="danger" size="sm" onClick={() => setDeleteTarget(a)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {a.username && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">المستخدم</span>
                    <span className="font-medium text-slate-200 font-mono text-xs bg-slate-800/60 px-2 py-0.5 rounded-lg">{a.username}</span>
                  </div>
                )}
                {a.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">البريد</span>
                    <span className="font-medium text-slate-200 text-xs">{a.email}</span>
                  </div>
                )}
                {a.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">الهاتف</span>
                    <span className="font-medium text-slate-200 text-xs">{a.phone}</span>
                  </div>
                )}
                {a.password && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">كلمة السر</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-200 bg-slate-800/60 px-2 py-0.5 rounded-lg">
                        {visiblePw.has(a.id) ? a.password : '••••••••'}
                      </span>
                      <button onClick={() => togglePw(a.id)} className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition">
                        {visiblePw.has(a.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyPw(a.password!, a.id)} className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition">
                        {copied === a.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
                {a.url && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">الرابط</span>
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-xs truncate max-w-[200px]">{a.url}</a>
                  </div>
                )}
              </div>

              {a.notes && (
                <div className="pt-2 border-t border-slate-700/40">
                  <p className="text-xs text-slate-500">{a.notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AccountModal open={showModal} account={editing} onClose={() => setShowModal(false)} onSaved={load} />
      <ConfirmDialog open={!!deleteTarget} title="حذف حساب" message={`هل أنت متأكد من حذف "${deleteTarget?.title}"؟`}
        variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

/* Account Modal */
function AccountModal({ open, account, onClose, onSaved }: { open: boolean; account: Account | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', platform: '', username: '', password: '', email: '', phone: '', url: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: account?.title || '', platform: account?.platform || '', username: account?.username || '',
        password: account?.password || '', email: account?.email || '', phone: account?.phone || '',
        url: account?.url || '', notes: account?.notes || '',
      });
      setError('');
      setShowPw(false);
    }
  }, [open, account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('اسم الحساب مطلوب'); return; }
    setSaving(true); setError('');
    try {
      if (account) await api.patch(`/archives/accounts/${account.id}`, form);
      else await api.post('/archives/accounts', form);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? 'تعديل حساب' : 'إضافة حساب جديد'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section: معلومات الحساب */}
          <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1">
            <div className="text-sm font-bold text-slate-300">معلومات الحساب</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">اسم الحساب <span className="text-red-400">*</span></div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: حساب انستغرام المكتب" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">المنصة</div>
            <Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Instagram, Gmail, Facebook..." />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">اسم المستخدم</div>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">كلمة السر</div>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Section: بيانات التواصل */}
          <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1 mt-2">
            <div className="text-sm font-bold text-slate-300">بيانات التواصل</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">البريد الإلكتروني</div>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">رقم الهاتف</div>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+963..." />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">الرابط (URL)</div>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/30">
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">إلغاء</Button>
          <Button type="submit" loading={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2: DOCUMENTS
   ════════════════════════════════════════════════════════════════ */
function DocumentsTab() {
  const [items, setItems] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocRecord | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/archives/documents');
      setItems(res.data.data || []);
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/archives/documents/${deleteTarget.id}`); load(); }
    catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  async function uploadFile(docId: number, file: File) {
    setUploading(docId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/archives/documents/${docId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setUploading(null); }
  }

  async function deleteAtt(docId: number, attId: number) {
    if (!confirm('حذف المرفق؟')) return;
    try { await api.delete(`/archives/documents/${docId}/attachments/${attId}`); load(); }
    catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold text-slate-300">أوراق هامة</div>
        <Button icon={<Plus size={18} />} onClick={() => { setEditing(null); setShowModal(true); }}>
          إضافة ورقة
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-500">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <ScrollText size={40} className="mx-auto text-slate-600 mb-3" />
          <div className="text-slate-400 text-sm">لا توجد أوراق محفوظة</div>
          <div className="text-slate-500 text-xs mt-1">اضغط "إضافة ورقة" لحفظ أول ورقة</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <Card key={d.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FileText size={18} className="text-indigo-400" /> {d.title}
                  </h3>
                  {d.category && (
                    <span className="inline-block mt-1 text-xs bg-slate-700/60 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-600/30">
                      {d.category}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <IconButton variant="ghost" size="sm" onClick={() => { setEditing(d); setShowModal(true); }}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton variant="danger" size="sm" onClick={() => setDeleteTarget(d)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>

              {d.description && <p className="text-sm text-slate-400">{d.description}</p>}
              {d.notes && <p className="text-xs text-slate-500 border-t border-slate-700/40 pt-2">{d.notes}</p>}

              {/* Attachments */}
              <div className="border-t border-slate-700/40 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Paperclip size={14} /> المرفقات ({d.attachments?.length || 0})
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-semibold transition">
                    <Upload size={14} /> رفع ملف
                    <input type="file" className="hidden" accept="application/pdf,image/*,.doc,.docx"
                      onChange={(e) => { if (e.target.files?.[0]) uploadFile(d.id, e.target.files[0]); e.target.value = ''; }} />
                  </label>
                </div>
                {uploading === d.id && <div className="text-xs text-blue-400">جاري الرفع...</div>}
                {d.attachments?.map((att) => (
                  <div key={att.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-3 py-2 text-sm border border-slate-700/30">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-slate-500 shrink-0" />
                      <span className="truncate text-slate-300 text-xs">{att.original_name}</span>
                      <span className="text-[11px] text-slate-500 shrink-0">{fmtSize(att.size)}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => downloadFile(`/archives/documents/${d.id}/attachments/${att.id}/download`, att.original_name)}
                        className="p-1.5 rounded-lg hover:bg-slate-700/60 text-blue-400 transition"><Download size={14} /></button>
                      <button onClick={() => deleteAtt(d.id, att.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <DocumentModal open={showModal} document={editing} onClose={() => setShowModal(false)} onSaved={load} />
      <ConfirmDialog open={!!deleteTarget} title="حذف ورقة" message={`هل أنت متأكد من حذف "${deleteTarget?.title}" وجميع مرفقاتها؟`}
        variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

/* Document Modal */
function DocumentModal({ open, document, onClose, onSaved }: { open: boolean; document: DocRecord | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', category: '', description: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        title: document?.title || '', category: document?.category || '',
        description: document?.description || '', notes: document?.notes || '',
      });
      setAttachments(document?.attachments || []);
      setRecordId(document?.id || null);
      setError('');
    }
  }, [open, document]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('اسم الورقة مطلوب'); return; }
    setSaving(true); setError('');
    try {
      if (recordId) {
        await api.patch(`/archives/documents/${recordId}`, form);
      } else {
        const res = await api.post('/archives/documents', form);
        setRecordId(res.data.data?.id || null);
      }
      onSaved();
      if (recordId) onClose(); // close only on edit, stay open on create to allow file upload
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setSaving(false); }
  }

  async function uploadFile(file: File) {
    if (!recordId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/archives/documents/${recordId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const res = await api.get('/archives/documents');
      const updated = (res.data.data || []).find((d: DocRecord) => d.id === recordId);
      if (updated) setAttachments(updated.attachments || []);
      onSaved();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ في رفع الملف'); }
    finally { setUploading(false); }
  }

  async function deleteAtt(attId: number) {
    if (!recordId) return;
    try {
      await api.delete(`/archives/documents/${recordId}/attachments/${attId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
      onSaved();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
  }

  return (
    <Modal open={open} onClose={onClose} title={document ? 'تعديل ورقة' : 'إضافة ورقة جديدة'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1">
            <div className="text-sm font-bold text-slate-300">بيانات الورقة</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">اسم الورقة <span className="text-red-400">*</span></div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="اسم الورقة أو المستند" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">التصنيف</div>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="عقد، وثيقة، سجل..." />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">الوصف</div>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للورقة..." />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية..." />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1 mt-2">
          <div className="text-sm font-bold text-amber-400">المرفقات</div>
        </div>

        {!recordId ? (
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4 text-center">
            <Upload size={24} className="mx-auto text-slate-500 mb-2" />
            <div className="text-xs text-slate-400">احفظ الورقة أولاً ثم يمكنك رفع المرفقات</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Paperclip size={14} /> المرفقات ({attachments.length})
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg cursor-pointer font-semibold transition border border-blue-500/20">
                <Upload size={14} /> رفع ملف
                <input type="file" className="hidden" accept="application/pdf,image/*,.doc,.docx"
                  onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
            {uploading && <div className="text-xs text-blue-400 flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" /> جاري الرفع...</div>}
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-3 py-2.5 text-sm border border-slate-700/30">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-slate-500 shrink-0" />
                  <span className="truncate text-slate-300 text-xs">{att.original_name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0">{fmtSize(att.size)}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => downloadFile(`/archives/documents/${recordId}/attachments/${att.id}/download`, att.original_name)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/60 text-blue-400 transition"><Download size={14} /></button>
                  <button type="button" onClick={() => deleteAtt(att.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/30">
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {recordId && !document ? 'إغلاق' : 'إلغاء'}
          </Button>
          {!(recordId && !document) && (
            <Button type="submit" loading={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 3: LICENSES & CONTRACTS
   ════════════════════════════════════════════════════════════════ */
function LicensesTab() {
  const [items, setItems] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/archives/licenses');
      setItems(res.data.data || []);
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/archives/licenses/${deleteTarget.id}`); load(); }
    catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  async function uploadFile(licId: number, file: File) {
    setUploading(licId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/archives/licenses/${licId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setUploading(null); }
  }

  async function deleteAtt(licId: number, attId: number) {
    if (!confirm('حذف المرفق؟')) return;
    try { await api.delete(`/archives/licenses/${licId}/attachments/${attId}`); load(); }
    catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
  }

  function getStatusInfo(lic: License) {
    if (lic.status === 'expired') return { label: 'منتهية', cls: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle };
    if (lic.status === 'renewed') return { label: 'مجددة', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Check };
    if (lic.expiry_date) {
      const diff = (new Date(lic.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (diff < 0) return { label: 'منتهية', cls: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle };
      if (diff < 30) return { label: 'قريبة الانتهاء', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock };
    }
    return { label: 'سارية', cls: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Check };
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold text-slate-300">تراخيص وعقود</div>
        <Button icon={<Plus size={18} />} onClick={() => { setEditing(null); setShowModal(true); }}>
          إضافة ترخيص
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-500">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <Shield size={40} className="mx-auto text-slate-600 mb-3" />
          <div className="text-slate-400 text-sm">لا توجد تراخيص محفوظة</div>
          <div className="text-slate-500 text-xs mt-1">اضغط "إضافة ترخيص" لحفظ أول ترخيص</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((lic) => {
            const st = getStatusInfo(lic);
            const StIcon = st.icon;
            return (
              <Card key={lic.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Shield size={18} className="text-indigo-400" /> {lic.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 border ${st.cls}`}>
                      <StIcon size={12} /> {st.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <IconButton variant="ghost" size="sm" onClick={() => { setEditing(lic); setShowModal(true); }}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton variant="danger" size="sm" onClick={() => setDeleteTarget(lic)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {lic.license_number && (
                    <div><span className="text-slate-500 text-xs">رقم الرخصة: </span><span className="font-medium text-slate-200 text-xs">{lic.license_number}</span></div>
                  )}
                  {lic.issuing_authority && (
                    <div><span className="text-slate-500 text-xs">الجهة المصدرة: </span><span className="font-medium text-slate-200 text-xs">{lic.issuing_authority}</span></div>
                  )}
                  {lic.issue_date && (
                    <div><span className="text-slate-500 text-xs">تاريخ الإصدار: </span><span className="font-medium text-slate-200 text-xs">{fmtDate(lic.issue_date)}</span></div>
                  )}
                  {lic.expiry_date && (
                    <div><span className="text-slate-500 text-xs">تاريخ الانتهاء: </span><span className="font-medium text-slate-200 text-xs">{fmtDate(lic.expiry_date)}</span></div>
                  )}
                </div>

                {lic.notes && <p className="text-xs text-slate-500 border-t border-slate-700/40 pt-2">{lic.notes}</p>}

                {/* Attachments */}
                <div className="border-t border-slate-700/40 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Paperclip size={14} /> المرفقات ({lic.attachments?.length || 0})
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-semibold transition">
                      <Upload size={14} /> رفع ملف
                      <input type="file" className="hidden" accept="application/pdf,image/*,.doc,.docx"
                        onChange={(e) => { if (e.target.files?.[0]) uploadFile(lic.id, e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  </div>
                  {uploading === lic.id && <div className="text-xs text-blue-400">جاري الرفع...</div>}
                  {lic.attachments?.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-3 py-2 text-sm border border-slate-700/30">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate text-slate-300 text-xs">{att.original_name}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">{fmtSize(att.size)}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => downloadFile(`/archives/licenses/${lic.id}/attachments/${att.id}/download`, att.original_name)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-blue-400 transition"><Download size={14} /></button>
                        <button onClick={() => deleteAtt(lic.id, att.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LicenseModal open={showModal} license={editing} onClose={() => setShowModal(false)} onSaved={load} />
      <ConfirmDialog open={!!deleteTarget} title="حذف ترخيص" message={`هل أنت متأكد من حذف "${deleteTarget?.title}" وجميع مرفقاتها؟`}
        variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

/* License Modal */
function LicenseModal({ open, license, onClose, onSaved }: { open: boolean; license: License | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', license_number: '', issuing_authority: '', issue_date: '', expiry_date: '', status: 'active', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        title: license?.title || '', license_number: license?.license_number || '',
        issuing_authority: license?.issuing_authority || '', issue_date: license?.issue_date?.slice(0, 10) || '',
        expiry_date: license?.expiry_date?.slice(0, 10) || '', status: license?.status || 'active',
        notes: license?.notes || '',
      });
      setAttachments(license?.attachments || []);
      setRecordId(license?.id || null);
      setError('');
    }
  }, [open, license]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('اسم الرخصة مطلوب'); return; }
    setSaving(true); setError('');
    try {
      if (recordId) {
        await api.patch(`/archives/licenses/${recordId}`, form);
      } else {
        const res = await api.post('/archives/licenses', form);
        setRecordId(res.data.data?.id || null);
      }
      onSaved();
      if (recordId) onClose();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
    finally { setSaving(false); }
  }

  async function uploadFile(file: File) {
    if (!recordId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/archives/licenses/${recordId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const res = await api.get('/archives/licenses');
      const updated = (res.data.data || []).find((l: License) => l.id === recordId);
      if (updated) setAttachments(updated.attachments || []);
      onSaved();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ في رفع الملف'); }
    finally { setUploading(false); }
  }

  async function deleteAtt(attId: number) {
    if (!recordId) return;
    try {
      await api.delete(`/archives/licenses/${recordId}/attachments/${attId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
      onSaved();
    } catch (e: any) { setError(e?.response?.data?.error || 'خطأ'); }
  }

  return (
    <Modal open={open} onClose={onClose} title={license ? 'تعديل ترخيص' : 'إضافة ترخيص جديد'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section: معلومات الترخيص */}
          <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1">
            <div className="text-sm font-bold text-slate-300">معلومات الترخيص</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">اسم الرخصة / العقد <span className="text-red-400">*</span></div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="اسم الرخصة أو العقد" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">رقم الرخصة</div>
            <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} placeholder="رقم الرخصة أو السجل" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الجهة المصدرة</div>
            <Input value={form.issuing_authority} onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })} placeholder="الجهة التي أصدرت الرخصة" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">سارية</option>
              <option value="expired">منتهية</option>
              <option value="renewed">مجددة</option>
            </Select>
          </div>

          {/* Section: التواريخ */}
          <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1 mt-2">
            <div className="text-sm font-bold text-slate-300">التواريخ</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">تاريخ الإصدار</div>
            <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">تاريخ الانتهاء</div>
            <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية..." />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="md:col-span-2 border-b border-slate-800/60 pb-2 mb-1 mt-2">
          <div className="text-sm font-bold text-amber-400">المرفقات</div>
        </div>

        {!recordId ? (
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4 text-center">
            <Upload size={24} className="mx-auto text-slate-500 mb-2" />
            <div className="text-xs text-slate-400">احفظ الترخيص أولاً ثم يمكنك رفع المرفقات</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Paperclip size={14} /> المرفقات ({attachments.length})
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg cursor-pointer font-semibold transition border border-blue-500/20">
                <Upload size={14} /> رفع ملف
                <input type="file" className="hidden" accept="application/pdf,image/*,.doc,.docx"
                  onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
            {uploading && <div className="text-xs text-blue-400 flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" /> جاري الرفع...</div>}
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-3 py-2.5 text-sm border border-slate-700/30">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-slate-500 shrink-0" />
                  <span className="truncate text-slate-300 text-xs">{att.original_name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0">{fmtSize(att.size)}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => downloadFile(`/archives/licenses/${recordId}/attachments/${att.id}/download`, att.original_name)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/60 text-blue-400 transition"><Download size={14} /></button>
                  <button type="button" onClick={() => deleteAtt(att.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/30">
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            {recordId && !license ? 'إغلاق' : 'إلغاء'}
          </Button>
          {!(recordId && !license) && (
            <Button type="submit" loading={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
