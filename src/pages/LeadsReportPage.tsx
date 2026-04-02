import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Users, TrendingUp, MessageCircle, Download,
  Printer, Settings, CheckCircle2, UserPlus
} from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

function getCurrentMonth() {
  return String(new Date().getMonth() + 1);
}
function getCurrentYear() {
  return String(new Date().getFullYear());
}

export function LeadsReportPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get('/leads/reports/monthly', { params: { month, year } });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const res = await api.get('/leads/settings/all');
      setSettings(res.data.data || {});
    } catch { /* ignore */ }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await api.patch('/leads/settings', settings);
      setSettings(res.data.data || {});
      setSettingsOpen(false);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل');
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => { loadData(); loadSettings(); }, []);

  function handleSearch() { loadData(); }

  function exportCSV() {
    if (!data) return;
    const rows = [['الموظف', 'زيارات مسجلة', 'عملاء مستلمين', 'متابعات', 'تحويلات لبيع', 'مساعد بالتحويل']];
    for (const emp of data.employees) {
      rows.push([emp.name, String(emp.leads_created), String(emp.leads_claimed), String(emp.follow_ups), String(emp.conversions), String(emp.assisted_conversions || 0)]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-report-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/customers?tab=followup')}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="text-green-400" />
              تقرير متابعة العملاء
            </div>
            <div className="text-sm text-slate-400">أداء الموظفين في المتابعات والتحويلات</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            الإعدادات
          </Button>
          <Button variant="secondary" onClick={exportCSV}>
            <Download size={16} className="ml-1" />
            تصدير
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} className="ml-1" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">الشهر</div>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthNames.map((name, idx) => (
                <option key={idx} value={String(idx + 1)}>{name}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">السنة</div>
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} loading={loading}>بحث</Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-amber-900/30 to-slate-900/80">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="text-amber-400" size={18} />
                <span className="text-xs text-slate-400">إجمالي العملاء</span>
              </div>
              <div className="text-2xl font-black text-white">{data.summary?.total_leads || 0}</div>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/80">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="text-purple-400" size={18} />
                <span className="text-xs text-slate-400">إجمالي المتابعات</span>
              </div>
              <div className="text-2xl font-black text-white">{data.summary?.total_follow_ups || 0}</div>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="text-emerald-400" size={18} />
                <span className="text-xs text-slate-400">تم التحويل</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">{data.summary?.total_converted || 0}</div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-400" size={18} />
                <span className="text-xs text-slate-400">معدل التحويل</span>
              </div>
              <div className="text-2xl font-black text-blue-400">{data.summary?.conversion_rate || 0}%</div>
            </Card>
          </div>

          {/* Employees Table */}
          <Card>
            <div className="text-base font-black mb-4">أداء الموظفين ({data.employees?.length || 0})</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="p-3 text-right">الموظف</th>
                    <th className="p-3 text-center text-amber-400">زيارات مسجلة</th>
                    <th className="p-3 text-center text-blue-400">عملاء مستلمين</th>
                    <th className="p-3 text-center text-purple-400">متابعات</th>
                    <th className="p-3 text-center text-emerald-400">تحويلات لبيع</th>
                    <th className="p-3 text-center text-cyan-400">مساعد بالتحويل</th>
                    <th className="p-3 text-center">معدل التحويل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees?.map((emp: any) => (
                    <tr key={emp.user_id} className="border-t border-slate-700/40 hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">{emp.name}</td>
                      <td className="p-3 text-center">{emp.leads_created}</td>
                      <td className="p-3 text-center text-blue-400">{emp.leads_claimed}</td>
                      <td className="p-3 text-center text-purple-400 font-bold">{emp.follow_ups}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{emp.conversions}</td>
                      <td className="p-3 text-center text-cyan-400">{emp.assisted_conversions || 0}</td>
                      <td className="p-3 text-center">
                        {emp.leads_claimed > 0
                          ? `${Math.round((emp.conversions / emp.leads_claimed) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {(!data.employees || data.employees.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">لا توجد بيانات لهذا الشهر</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Auto-release info */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Settings size={14} />
              <span>مهلة الإعادة التلقائية: <strong className="text-white">{settings.auto_release_hours || '24'} ساعة</strong></span>
              <span className="mx-2">•</span>
              <span>العملاء اللي ما يتم متابعتهم خلال هالمدة يرجعوا تلقائياً لقائمة الانتظار</span>
            </div>
          </Card>
        </>
      )}

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="إعدادات المتابعة" width="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">مهلة الإعادة التلقائية (بالساعات)</label>
            <Input
              type="number"
              min={1}
              max={168}
              value={settings.auto_release_hours || '24'}
              onChange={(e) => setSettings({ ...settings, auto_release_hours: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">بعد هذه المدة بدون متابعة، يرجع العميل لقائمة الانتظار</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">تذكير المتابعة (بالساعات)</label>
            <Input
              type="number"
              min={1}
              max={48}
              value={settings.follow_up_reminder_hours || '4'}
              onChange={(e) => setSettings({ ...settings, follow_up_reminder_hours: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>إلغاء</Button>
            <Button onClick={saveSettings} loading={savingSettings}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
