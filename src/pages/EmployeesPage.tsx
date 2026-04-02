import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { fmtDate, fmtMoney } from '../utils/format';
import type { EmployeeSummaryRow, Role, UserRow } from '../utils/types';
import { useAuth, roleLabels, roleDescriptions, userRoles, hasAnyRole } from '../state/auth';
import { Check, Phone, Shield, ShieldCheck } from 'lucide-react';



function roleLabel(r: Role) {
  return roleLabels[r] || r;
}

function statusTone(active: 0 | 1) {
  return active ? 'green' : 'red';
}

// Multi-role selector component
function RoleSelector({ 
  selectedRoles, 
  onChange 
}: { 
  selectedRoles: Role[]; 
  onChange: (roles: Role[]) => void;
}) {
  const toggleRole = (role: Role) => {
    if (selectedRoles.includes(role)) {
      // Can't remove last role
      if (selectedRoles.length === 1) return;
      onChange(selectedRoles.filter(r => r !== role));
    } else {
      // If selecting admin, clear other roles (admin has all permissions)
      if (role === 'admin') {
        onChange(['admin']);
      } else {
        // Remove admin if selecting other roles
        onChange([...selectedRoles.filter(r => r !== 'admin'), role]);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-2">الصلاحيات (يمكن اختيار أكثر من صلاحية)</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {userRoles.map((role) => {
          const isSelected = selectedRoles.includes(role);
          const isAdmin = role === 'admin';
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={`
                flex items-start gap-3 p-3 rounded-xl border text-right transition-all
                ${isSelected 
                  ? isAdmin 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 ring-1 ring-amber-500/30' 
                    : 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5
                ${isSelected 
                  ? isAdmin ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white' 
                  : 'bg-slate-700 text-slate-500'
                }
              `}>
                {isSelected && <Check size={14} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isAdmin ? <ShieldCheck size={14} className="text-amber-400" /> : <Shield size={14} className="text-slate-400" />}
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {roleLabels[role]}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{roleDescriptions[role]}</div>
              </div>
            </button>
          );
        })}
      </div>
      {selectedRoles.includes('admin') && (
        <div className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2 flex items-center gap-2">
          <ShieldCheck size={14} />
          مدير النظام لديه صلاحيات كاملة على جميع أقسام النظام
        </div>
      )}
    </div>
  );
}

// Visa Type Selector component for visa_admin / visa_admin_2
function VisaTypeSelector({ 
  selectedIds, 
  onChange 
}: { 
  selectedIds: number[]; 
  onChange: (ids: number[]) => void;
}) {
  const [visaTypes, setVisaTypes] = useState<{id: number, name: string}[]>([]);
  
  useEffect(() => {
    api.get('/visa-types').then(r => setVisaTypes(r.data.data || [])).catch(() => {});
  }, []);

  const toggleType = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-2">أنواع الفيزا المسندة (اختر واحد أو أكثر)</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {visaTypes.map((vt) => {
          const isSelected = selectedIds.includes(vt.id);
          return (
            <button
              key={vt.id}
              type="button"
              onClick={() => toggleType(vt.id)}
              className={`
                flex items-center gap-3 p-2 rounded-xl border text-right transition-all
                ${isSelected 
                  ? 'bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30' 
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-md flex items-center justify-center shrink-0
                ${isSelected ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-500'}
              `}>
                {isSelected && <Check size={14} />}
              </div>
              <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {vt.name}
              </span>
            </button>
          );
        })}
      </div>
      {selectedIds.length === 0 && (
        <div className="text-xs text-slate-500 bg-slate-800/30 rounded-lg p-2">
          لا توجد أنواع مسندة — يستطيع المدير إضافة أنواعه بنفسه، أو اختر من القائمة لمشاركة أنواع موجودة
        </div>
      )}
    </div>
  );
}

// Roles display component
function RolesDisplay({ roles }: { roles: Role[] }) {
  if (!roles || roles.length === 0) return <Badge tone="gray">—</Badge>;
  
  if (roles.includes('admin')) {
    return <Badge tone="amber">مدير النظام</Badge>;
  }
  
  if (roles.length === 1) {
    return <Badge tone="blue">{roleLabels[roles[0]]}</Badge>;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {roles.slice(0, 2).map(role => (
        <Badge key={role} tone="blue">{roleLabels[role]}</Badge>
      ))}
      {roles.length > 2 && (
        <Badge tone="gray">+{roles.length - 2}</Badge>
      )}
    </div>
  );
}

export function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = hasAnyRole(user, 'admin');

  const [mode, setMode] = useState<'manage'>('manage');

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);

  // Manage modals
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  // Updated form state to use roles array
  const [form, setForm] = useState({ name: '', email: '', roles: ['employee'] as Role[], password: '', phone_number: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', roles: ['employee'] as Role[], password: '', phone_number: '' });

  // Visa type assignments for edit modal (admin can share types between visa admins)
  const [editVisaTypes, setEditVisaTypes] = useState<number[]>([]);
  // Track whether admin explicitly changed visa type assignments (to avoid overwriting auto-assignments)
  const [visaTypesChanged, setVisaTypesChanged] = useState(false);


  async function loadUsers() {
    const r = await api.get('/users');
    setUsers(r.data.data);
  }



  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function refresh() {
    await loadUsers();
  }

  async function createUser() {
    await api.post('/users', {
      name: form.name,
      email: form.email,
      roles: form.roles,
      password: form.password,
      phone_number: form.phone_number || undefined,
    });
    
    setOpenCreate(false);
    setForm({ name: '', email: '', roles: ['employee'], password: '', phone_number: '' });
    await refresh();
  }

  async function saveEdit() {
    if (!editing) return;
    await api.patch(`/users/${editing.id}`, {
      name: editForm.name,
      email: editForm.email,
      roles: editForm.roles,
      password: editForm.password || undefined,
      phone_number: editForm.phone_number || null,
    });

    // Update visa type assignments ONLY if admin explicitly changed them
    // This protects auto-assigned types from being wiped when admin saves unrelated changes
    const hasVisaAdminRole = editForm.roles.includes('visa_admin') || editForm.roles.includes('visa_admin_2');
    if (hasVisaAdminRole && visaTypesChanged) {
      await api.put(`/users/${editing.id}/visa-type-assignments`, { visa_type_ids: editVisaTypes });
    }

    setOpenEdit(false);
    setEditing(null);
    setEditForm({ name: '', email: '', roles: ['employee'], password: '', phone_number: '' });
    setEditVisaTypes([]);
    setVisaTypesChanged(false);
    await refresh();
  }

  async function toggleUser(id: number) {
    await api.patch(`/users/${id}/toggle`);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-black">إدارة الموظفين</div>
          <div className="text-sm text-slate-400">مين عمل شو؟ + مبيعات يومية / شهرية</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-bold text-white">إدارة الموظفين والصلاحيات</div>
        </div>
      </div>







      {mode === 'manage' && (
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-black">إدارة الموظفين والصلاحيات</div>
              <div className="text-sm text-slate-400">إضافة / تعديل / إيقاف المستخدمين وتحديد صلاحياتهم</div>
            </div>
            {isAdmin ? (
              <Button onClick={() => setOpenCreate(true)}>إضافة موظف جديد</Button>
            ) : (
              <div className="text-sm text-slate-400">التعديل متاح للمدير فقط</div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-2 text-right">الاسم</th>
                  <th className="p-2 text-right">البريد</th>
                  <th className="p-2 text-right">رقم الموبايل</th>
                  <th className="p-2 text-right">الصلاحيات</th>
                  <th className="p-2 text-right">الحالة</th>
                  <th className="p-2 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-700/40 hover:bg-slate-800/30">
                    <td className="p-2 font-semibold">{u.name}</td>
                    <td className="p-2 text-slate-400">{u.email}</td>
                    <td className="p-2">
                      {u.phone_number ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone size={13} className="text-green-400" />
                          <span dir="ltr">{u.phone_number}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">لم يُحدد</span>
                      )}
                    </td>
                    <td className="p-2">
                      <RolesDisplay roles={u.roles || [u.role]} />
                    </td>
                    <td className="p-2">
                      <Badge tone={statusTone(u.is_active)}>{u.is_active ? 'نشط' : 'موقوف'}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            setEditing(u);
                            // Use roles array, fall back to single role for backward compat
                            const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                            setEditForm({ name: u.name, email: u.email, roles: userRoles, password: '', phone_number: u.phone_number || '' });

                            // Load visa type assignments if user has a visa admin role
                            setVisaTypesChanged(false); // reset change flag on every modal open
                            if (userRoles.includes('visa_admin') || userRoles.includes('visa_admin_2')) {
                              try {
                                const r = await api.get(`/users/${u.id}/visa-type-assignments`);
                                setEditVisaTypes((r.data.data || []).map((a: any) => a.visa_type_id));
                              } catch {
                                setEditVisaTypes([]);
                              }
                            } else {
                              setEditVisaTypes([]);
                            }

                            setOpenEdit(true);
                          }}
                          disabled={!isAdmin}
                        >
                          تعديل
                        </Button>
                        <Button
                          variant={u.is_active ? 'danger' : 'primary'}
                          onClick={() => toggleUser(u.id)}
                          disabled={!isAdmin}
                        >
                          {u.is_active ? 'إيقاف' : 'تفعيل'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create modal */}
          <Modal open={openCreate} title="إضافة موظف جديد" onClose={() => setOpenCreate(false)}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">الاسم</div>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الموظف" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">البريد الإلكتروني</div>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">رقم الموبايل (واتساب)</div>
                <Input dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="96279XXXXXXX" />
                <div className="text-xs text-slate-500 mt-1">الصيغة الدولية بدون + (مثال: 96279XXXXXXX)</div>
              </div>
              <RoleSelector
                selectedRoles={form.roles}
                onChange={(roles) => setForm({ ...form, roles })}
              />
              <div>
                <div className="text-xs text-slate-400 mb-1">كلمة المرور</div>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
                <Button variant="ghost" onClick={() => setOpenCreate(false)}>إلغاء</Button>
                <Button onClick={() => createUser()} disabled={!form.name || !form.email || !form.password || form.roles.length === 0}>
                  إضافة الموظف
                </Button>
              </div>
            </div>
          </Modal>

          {/* Edit modal */}
          <Modal open={openEdit} title="تعديل بيانات الموظف" onClose={() => setOpenEdit(false)}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">الاسم</div>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">البريد الإلكتروني</div>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">رقم الموبايل (واتساب)</div>
                <Input dir="ltr" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} placeholder="96279XXXXXXX" />
                <div className="text-xs text-slate-500 mt-1">الصيغة الدولية بدون + (مثال: 96279XXXXXXX)</div>
              </div>
              <RoleSelector
                selectedRoles={editForm.roles}
                onChange={(roles) => setEditForm({ ...editForm, roles })}
              />
              {(editForm.roles.includes('visa_admin') || editForm.roles.includes('visa_admin_2')) && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">أنواع الفيزا المسندة (اختياري — لمشاركة أنواع بين مديرين)</div>
                  <VisaTypeSelector
                    selectedIds={editVisaTypes}
                    onChange={(ids) => { setEditVisaTypes(ids); setVisaTypesChanged(true); }}
                  />
                </div>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-1">كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)</div>
                <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
                <Button variant="ghost" onClick={() => setOpenEdit(false)}>إلغاء</Button>
                <Button onClick={() => saveEdit()} disabled={!editForm.name || !editForm.email || editForm.roles.length === 0}>
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          </Modal>
        </Card>
      )}
    </div>
  );
}
