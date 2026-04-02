import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Database, Download, Shield, Clock, CheckCircle, FileArchive } from 'lucide-react';

export function BackupPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingAttachments, setDownloadingAttachments] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [attachmentsInfo, setAttachmentsInfo] = useState<{ count: number; total_size: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [infoRes, attRes] = await Promise.all([
          api.get('/reports/backup/info'),
          api.get('/reports/backup/attachments-info'),
        ]);
        setInfo(infoRes.data.data);
        setAttachmentsInfo(attRes.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    // Load last backup date from localStorage
    const saved = localStorage.getItem('last_backup_date');
    if (saved) setLastBackup(saved);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/reports/backup/download', {
        responseType: 'blob',
        timeout: 120000, // 2 minutes for large DBs
      });

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `alasal-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Save last backup date
      const now = new Date().toISOString();
      localStorage.setItem('last_backup_date', now);
      setLastBackup(now);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل تحميل النسخة الاحتياطية');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAttachments = async () => {
    setDownloadingAttachments(true);
    try {
      const response = await api.get('/reports/backup/attachments', {
        responseType: 'blob',
        timeout: 300000, // 5 minutes for large files
      });

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `alasal-attachments-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل تحميل المرفقات');
    } finally {
      setDownloadingAttachments(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10">
          <Shield size={28} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">النسخ الاحتياطي</h1>
          <p className="text-sm text-slate-400">حمّل نسخة احتياطية كاملة من قاعدة البيانات</p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* DB Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Database size={18} className="text-blue-400" />
              <span className="font-bold">معلومات قاعدة البيانات</span>
            </div>
            {loading ? (
              <div className="text-slate-500 text-sm">جاري التحميل...</div>
            ) : info ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-xs text-slate-400">عدد الجداول</div>
                  <div className="text-xl font-bold text-white">{info.total_tables}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-xs text-slate-400">إجمالي السجلات</div>
                  <div className="text-xl font-bold text-white">{Number(info.total_rows).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="text-red-400 text-sm">تعذر تحميل المعلومات</div>
            )}

            {/* Last Backup */}
            {lastBackup && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-slate-400">آخر نسخة احتياطية:</span>
                <span className="text-emerald-400 font-medium">
                  {new Date(lastBackup).toLocaleDateString('ar-SY')} — {new Date(lastBackup).toLocaleTimeString('ar-SY')}
                </span>
              </div>
            )}
          </div>

          {/* Download Button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleDownload}
              loading={downloading}
              disabled={downloading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg rounded-xl"
            >
              <Download size={22} />
              {downloading ? 'جاري التحميل...' : 'تحميل نسخة احتياطية'}
            </Button>
            <span className="text-xs text-slate-500">ملف JSON يحتوي كل البيانات</span>
          </div>
        </div>
      </Card>

      {/* Attachments Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-slate-300">
              <FileArchive size={18} className="text-purple-400" />
              <span className="font-bold">المرفقات (صور ومستندات)</span>
            </div>
            {loading ? (
              <div className="text-slate-500 text-sm">جاري التحميل...</div>
            ) : attachmentsInfo ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-xs text-slate-400">عدد الملفات</div>
                  <div className="text-xl font-bold text-white">{attachmentsInfo.count.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-xs text-slate-400">الحجم الكلي</div>
                  <div className="text-xl font-bold text-white">{formatSize(attachmentsInfo.total_size)}</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">لا توجد مرفقات</div>
            )}
          </div>

          {/* Download Attachments Button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleDownloadAttachments}
              loading={downloadingAttachments}
              disabled={downloadingAttachments || !attachmentsInfo?.count}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg rounded-xl"
            >
              <FileArchive size={22} />
              {downloadingAttachments ? 'جاري الضغط والتحميل...' : 'تحميل المرفقات (ZIP)'}
            </Button>
            <span className="text-xs text-slate-500">ملف مضغوط يحتوي كل الصور والمستندات</span>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          <Clock size={18} className="text-amber-400" />
          <span className="font-bold">تعليمات مهمة</span>
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">1.</span>
            <span>يُنصح بأخذ نسخة احتياطية <span className="text-white font-medium">في نهاية كل يوم عمل</span></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">2.</span>
            <span>احفظ الملف في مكان آمن (Google Drive أو قرص خارجي)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">3.</span>
            <span>النسخة تشمل جميع البيانات: العملاء، المكاتب، التذاكر، الفيزا، الجوازات، الحسابات، والمزيد</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">4.</span>
            <span>نسخة قاعدة البيانات لا تشمل الملفات المرفقة — استخدم زر <span className="text-purple-400 font-medium">تحميل المرفقات</span> لتحميلها بشكل منفصل</span>
          </div>
        </div>
      </Card>

      {/* Table Details (collapsible) */}
      {info?.tables && (
        <Card className="p-6">
          <details>
            <summary className="cursor-pointer text-slate-300 font-bold text-sm hover:text-white transition">
              تفاصيل الجداول ({info.total_tables} جدول)
            </summary>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(info.tables as Record<string, number>)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([table, count]) => (
                  <div key={table} className="flex justify-between px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/30">
                    <span className="text-slate-400 truncate" dir="ltr">{table}</span>
                    <span className="text-slate-300 font-mono mr-2">{Number(count).toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}
