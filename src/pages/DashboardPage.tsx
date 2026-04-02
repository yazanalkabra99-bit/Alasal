import React, { useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, Clock, AlertTriangle, CheckCircle2, Plane, IdCard, 
  Ticket, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  FileText, Calendar, RefreshCw, Send, Phone, Briefcase, Moon
} from 'lucide-react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth, hasAnyRole } from '../state/auth';
import { CreateVisaModal } from '../features/visa/CreateVisaModal';
import { CreatePassportModal } from '../features/passport/CreatePassportModal';
import { fmtMoney } from '../utils/format';

function AnimatedCounter({ value, duration = 1000, prefix = '', suffix = '' }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  return <span>{prefix}{count.toLocaleString('en-US')}{suffix}</span>;
}

function StatCard({ title, value, icon: Icon, color, delay = 0, prefix = '', suffix = '', onClick }: {
  title: string; value: number; icon: any;
  color: 'blue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red' | 'emerald' | 'yellow';
  delay?: number; prefix?: string; suffix?: string; onClick?: () => void;
}) {
  const colorStyles: Record<string, { bg: string; icon: string; glow: string }> = {
    blue: { bg: 'gradient-card-blue', icon: 'text-blue-400 bg-blue-500/20', glow: 'icon-glow-blue' },
    purple: { bg: 'gradient-card-purple', icon: 'text-purple-400 bg-purple-500/20', glow: 'icon-glow-purple' },
    cyan: { bg: 'gradient-card-cyan', icon: 'text-cyan-400 bg-cyan-500/20', glow: 'icon-glow-cyan' },
    green: { bg: 'gradient-card-green', icon: 'text-green-400 bg-green-500/20', glow: 'icon-glow-green' },
    orange: { bg: 'gradient-card-orange', icon: 'text-orange-400 bg-orange-500/20', glow: 'icon-glow-orange' },
    red: { bg: 'gradient-card-red', icon: 'text-red-400 bg-red-500/20', glow: 'icon-glow-red' },
    emerald: { bg: 'gradient-card-green', icon: 'text-emerald-400 bg-emerald-500/20', glow: 'icon-glow-green' },
    yellow: { bg: 'gradient-card-blue', icon: 'text-blue-400 bg-blue-500/20', glow: 'icon-glow-blue' },
  };
  const styles = colorStyles[color];
  return (
    <div className={`${styles.bg} rounded-2xl p-4 glass-hover animate-fade-in opacity-0 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}s` }} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-black mt-1 text-white">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </p>
        </div>
        <div className={`p-3 rounded-xl ${styles.icon}`}>
          <Icon size={24} className={styles.glow} />
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, delay }: { account: any; delay: number }) {
  const typeColors: Record<string, string> = {
    cash: 'from-green-500/20 to-emerald-500/10 border-green-500/30',
    bank: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    wallet: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
  };
  return (
    <div className={`rounded-xl p-3 border bg-gradient-to-br ${typeColors[account.type] || typeColors.cash} animate-fade-in opacity-0`}
      style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{account.name}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-400">{account.currency_code}</span>
      </div>
      <p className="text-lg font-black text-white">{fmtMoney(account.balance, account.currency_code)}</p>
    </div>
  );
}

export function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [createPassportOpen, setCreatePassportOpen] = useState(false);

  const isAccounting = hasAnyRole(user, 'accounting', 'admin');
  const isVisaAdmin = hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin');
  const isPassportAdmin = hasAnyRole(user, 'passport_admin', 'admin');
  const isAirlineAdmin = hasAnyRole(user, 'airline_admin', 'admin');
  const hasEmployee = hasAnyRole(user, 'employee');
  const onlyEmployee = hasEmployee && !isAccounting && !isVisaAdmin && !isPassportAdmin && !isAirlineAdmin;

  async function load() {
    setLoading(true);
    try { setDashboardData((await api.get('/reports/dashboard')).data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const counts = dashboardData?.counts || {};
  const visaStats = dashboardData?.visaStats;
  const passportStats = dashboardData?.passportStats;
  const ticketStats = dashboardData?.ticketStats;
  const myStats = dashboardData?.myStats;
  const leadsStats = dashboardData?.leadsStats || { open: 0, mine: 0 };

  const accountingData = useMemo(() => {
    if (!dashboardData || !isAccounting) return null;
    return {
      accounts: dashboardData.accounts || [],
      todayMovements: dashboardData.todayMovements || { count: 0, in_usd: 0, out_usd: 0 },
      monthlyProfits: dashboardData.monthlyProfits || { visa_profit: 0, passport_profit: 0, ticket_profit: 0, total: 0 },
    };
  }, [dashboardData, isAccounting]);

  const getStatusColor = (s: string) => {
    if (['submitted', 'active'].includes(s)) return 'status-pill-info';
    if (['processing', 'pending'].includes(s)) return 'status-pill-warning';
    if (['issued', 'delivered', 'sold', 'ready'].includes(s)) return 'status-pill-success';
    if (['overdue', 'rejected'].includes(s)) return 'status-pill-danger';
    return 'status-pill-neutral';
  };
  const getTypeIcon = (t: string) => t === 'visa' ? Ticket : t === 'passport' ? IdCard : t === 'external_ticket' ? ArrowLeftRight : Plane;
  const getTypeColor = (t: string) => t === 'visa' ? 'text-purple-400 bg-purple-500/20' : t === 'passport' ? 'text-cyan-400 bg-cyan-500/20' : t === 'external_ticket' ? 'text-blue-400 bg-blue-500/20' : 'text-orange-400 bg-orange-500/20';
  const statusLabel = (s: string) => ({ submitted: 'جديد', processing: 'قيد المعالجة', issued: 'صدر', delivered: 'تم التسليم', pending: 'بالانتظار', sold: 'مباع', ready: 'جاهز', rejected: 'مرفوض', cancelled: 'ملغى', active: 'نشط' }[s] || s);

  const quickActions: { label: string; icon: any; colorCls: string; onClick: () => void }[] = [];
  if (isVisaAdmin || hasEmployee || isAccounting) quickActions.push({ label: 'فيزا جديدة', icon: Ticket, colorCls: 'purple', onClick: () => setCreateOpen(true) });
  if (isPassportAdmin || hasEmployee || isAccounting) quickActions.push({ label: 'جواز جديد', icon: IdCard, colorCls: 'cyan', onClick: () => setCreatePassportOpen(true) });
  if (isAirlineAdmin || hasEmployee || isAccounting) quickActions.push({ label: 'تذكرة طيران', icon: Plane, colorCls: 'orange', onClick: () => navigate('/flight-tickets?new=1') });
  if (isAirlineAdmin || hasEmployee || isAccounting) quickActions.push({ label: 'تذكرة خارجية', icon: ArrowLeftRight, colorCls: 'yellow', onClick: () => navigate('/external-tickets?new=1') });
  if (hasEmployee || isAccounting) quickActions.push({ label: 'بيع خدمة', icon: Briefcase, colorCls: 'green', onClick: () => navigate('/service-sales?new=1') });
  // Customers Hub (Follow-up)
  quickActions.push({ label: 'تسجيل زيارة', icon: Phone, colorCls: 'green', onClick: () => navigate('/customers?tab=followup&new=1') });
  if (isAccounting) quickActions.push({ label: 'الأرباح', icon: TrendingUp, colorCls: 'green', onClick: () => navigate('/profits') });

  return (
    <div className="space-y-6">
      {/* Ramadan Greeting Banner */}
      <div className="glass rounded-2xl p-4 border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <Moon className="text-amber-400" size={24} />
          <div className="text-center">
            <span className="text-amber-300 font-bold text-lg">رمضان كريم</span>
            <p className="text-sm text-slate-300">كل عام وأنتم بخير 🌙 تقبل الله صيامكم وقيامكم</p>
          </div>
          <Moon className="text-amber-400" size={24} />
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-black text-white">لوحة التحكم</h1>
          <p className="text-sm text-slate-400 mt-1">مرحباً {user?.name}، إليك ملخص نشاطك اليوم</p>
        </div>
        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <button onClick={load} className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition">
            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-400' : 'text-slate-400'} />
          </button>
          <span className="text-xs text-slate-500"><Calendar size={14} className="inline ml-1" />{new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* ═══ Accounting Dashboard ═══ */}
      {isAccounting && accountingData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="وارد اليوم" value={Math.round(accountingData.todayMovements.in_usd)} icon={ArrowUpRight} color="green" prefix="$" delay={0.2} />
            <StatCard title="صادر اليوم" value={Math.round(accountingData.todayMovements.out_usd)} icon={ArrowDownRight} color="red" prefix="$" delay={0.25} />
            <StatCard title="أرباح الشهر" value={Math.round(accountingData.monthlyProfits.total)} icon={TrendingUp} color="emerald" prefix="$" delay={0.3} onClick={() => navigate('/profits')} />
            <StatCard title="حركات اليوم" value={accountingData.todayMovements.count} icon={RefreshCw} color="blue" delay={0.35} />
          </div>
          <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-base font-bold">الصناديق والحسابات</h2><p className="text-xs text-slate-500">أرصدة الصناديق الحالية</p></div>
              <button onClick={() => navigate('/accounts')} className="text-xs text-blue-400 hover:text-blue-300 transition">إدارة الحسابات ←</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {accountingData.accounts.map((acc: any, i: number) => <AccountCard key={acc.id} account={acc} delay={0.45 + i * 0.05} />)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'أرباح الفيزا', val: accountingData.monthlyProfits.visa_profit, icon: Ticket, cls: 'purple', d: '0.5s' },
              { label: 'أرباح الجوازات', val: accountingData.monthlyProfits.passport_profit, icon: IdCard, cls: 'cyan', d: '0.55s' },
              { label: 'أرباح التذاكر', val: accountingData.monthlyProfits.ticket_profit, icon: Plane, cls: 'orange', d: '0.6s' },
              { label: 'تذاكر خارجية', val: accountingData.monthlyProfits.ext_ticket_profit || 0, icon: ArrowLeftRight, cls: 'yellow', d: '0.65s' },
            ].map((p) => (
              <div key={p.label} className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: p.d }}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${p.cls}-500/20`}><p.icon size={18} className={`text-${p.cls}-400`} /></div>
                  <div><p className="text-xs text-slate-400">{p.label}</p><p className="text-lg font-bold text-white">${Math.round(p.val).toLocaleString('en-US')}</p></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ Visa Admin Stats ═══ */}
      {!isAccounting && isVisaAdmin && visaStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="طلبات جديدة" value={visaStats.submitted} icon={Send} color="purple" delay={0.2} onClick={() => navigate('/visa?status=submitted')} />
          <StatCard title="قيد المعالجة" value={visaStats.processing} icon={Clock} color="blue" delay={0.25} onClick={() => navigate('/visa?status=processing')} />
          <StatCard title="صدرت هذا الشهر" value={visaStats.issued_month} icon={CheckCircle2} color="green" delay={0.3} />
          <StatCard title="متأخرة" value={visaStats.overdue} icon={AlertTriangle} color="red" delay={0.35} />
        </div>
      )}

      {/* ═══ Passport Admin Stats ═══ */}
      {!isAccounting && isPassportAdmin && passportStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="طلبات جديدة" value={passportStats.submitted} icon={Send} color="cyan" delay={0.2} onClick={() => navigate('/passport?status=submitted')} />
          <StatCard title="قيد المعالجة" value={passportStats.processing} icon={Clock} color="blue" delay={0.25} onClick={() => navigate('/passport?status=processing')} />
          <StatCard title="جاهزة هذا الشهر" value={passportStats.ready_month} icon={CheckCircle2} color="green" delay={0.3} />
          <StatCard title="متأخرة" value={passportStats.overdue} icon={AlertTriangle} color="red" delay={0.35} />
        </div>
      )}

      {/* ═══ Airline Admin Stats ═══ */}
      {!isAccounting && isAirlineAdmin && ticketStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="بانتظار الموافقة" value={ticketStats.pending} icon={Clock} color="orange" delay={0.2} onClick={() => navigate('/flight-tickets?status=pending')} />
          <StatCard title="مبيعات الشهر" value={ticketStats.sold_month} icon={Ticket} color="blue" delay={0.25} />
          <StatCard title="مصدّرة هذا الشهر" value={ticketStats.issued_month} icon={CheckCircle2} color="green" delay={0.3} />
          <StatCard title="شركات الطيران" value={ticketStats.total_airlines} icon={Plane} color="purple" delay={0.35} onClick={() => navigate('/airlines')} />
        </div>
      )}

      {/* ═══ Employee Own Stats ═══ */}
      {hasEmployee && myStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="طلبات الفيزا" value={myStats.my_visa} icon={Ticket} color="purple" delay={0.2} onClick={() => navigate('/visa')} />
          <StatCard title="طلبات الجوازات" value={myStats.my_passport} icon={IdCard} color="cyan" delay={0.25} onClick={() => navigate('/passport')} />
          <StatCard title="تذاكر الطيران" value={myStats.my_tickets} icon={Plane} color="orange" delay={0.3} onClick={() => navigate('/flight-tickets')} />
          <StatCard title="طلباتي هذا الشهر" value={myStats.my_month} icon={Calendar} color="green" delay={0.35} />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.65s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold">آخر الطلبات</h2>
              <p className="text-xs text-slate-500">
                {onlyEmployee ? 'طلباتك الأخيرة' :
                 hasEmployee && (isVisaAdmin || isPassportAdmin || isAirlineAdmin) ? 'آخر الطلبات (طلباتك + صلاحياتك)' :
                 isVisaAdmin && !isPassportAdmin && !isAirlineAdmin && !isAccounting ? 'طلبات الفيزا' :
                 isPassportAdmin && !isVisaAdmin && !isAirlineAdmin && !isAccounting ? 'طلبات الجوازات' :
                 isAirlineAdmin && !isVisaAdmin && !isPassportAdmin && !isAccounting ? 'تذاكر الطيران' :
                 'فيزا، جوازات، وتذاكر طيران'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 w-full" />) :
             !dashboardData?.recentRequests?.length ? (
              <div className="empty-state py-8"><FileText size={48} /><h3>لا يوجد طلبات</h3><p>ابدأ بإنشاء طلب جديد</p></div>
            ) : dashboardData.recentRequests.map((r: any, i: number) => {
              const Icon = getTypeIcon(r.type);
              const typeLabel = r.type === 'visa' ? 'فيزا' : r.type === 'passport' ? 'جواز' : r.type === 'external_ticket' ? 'تذكرة خارجية' : 'تذكرة';
              const link = r.type === 'visa' ? `/visa/${r.id}` : r.type === 'passport' ? `/passport/${r.id}` : r.type === 'external_ticket' ? `/external-tickets/${r.id}` : `/flight-tickets/${r.id}`;
              return (
                <button key={`${r.type}-${r.id}`} onClick={() => navigate(link)}
                  className="w-full text-right rounded-xl border border-slate-700/30 bg-slate-900/30 p-3 hover:bg-slate-800/50 hover:border-blue-500/20 transition-all duration-200 group animate-fade-in opacity-0"
                  style={{ animationDelay: `${0.7 + i * 0.05}s` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(r.type)}`}><Icon size={18} /></div>
                      <div>
                        <div className="font-bold text-sm group-hover:text-blue-400 transition">{r.applicant_name}</div>
                        <div className="text-xs text-slate-500">{typeLabel} • ${Math.round(r.total_usd || 0)}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`status-pill ${getStatusColor(r.status)}`}>{statusLabel(r.status)}</div>
                      <div className="text-xs text-slate-500 mt-1">#{r.id}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '1s' }}>
            <h2 className="text-base font-bold mb-3">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a, i) => {
                const AI = a.icon;
                const bgMap: Record<string, string> = {
                  purple: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20',
                  cyan: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20',
                  orange: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20',
                  green: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20',
                  yellow: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
                };
                const txtMap: Record<string, string> = { purple: 'text-purple-400', cyan: 'text-cyan-400', orange: 'text-orange-400', green: 'text-green-400', yellow: 'text-blue-400' };
                return (
                  <button key={i} onClick={a.onClick}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${bgMap[a.colorCls] || bgMap.purple} transition`}>
                    <AI size={20} className={txtMap[a.colorCls] || txtMap.purple} />
                    <span className="text-xs">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {(counts.visa_pending > 0 || counts.passport_pending > 0 || counts.ticket_pending > 0 || leadsStats.open > 0 || leadsStats.mine > 0) && (
            <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '1.1s' }}>
              <h2 className="text-base font-bold mb-3">يحتاج متابعة</h2>
              <div className="space-y-2">
                {leadsStats.open > 0 && (
                  <button onClick={() => navigate('/customers?tab=followup&leadTab=open')} className="w-full flex items-center justify-between gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition">
                    <div className="flex items-center gap-2"><Phone size={16} className="text-green-400" /><span className="text-sm">عملاء بانتظار المتابعة</span></div>
                    <span className="text-sm font-bold text-green-400">{leadsStats.open}</span>
                  </button>
                )}
                {leadsStats.mine > 0 && (
                  <button onClick={() => navigate('/customers?tab=followup&leadTab=mine')} className="w-full flex items-center justify-between gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition">
                    <div className="flex items-center gap-2"><Phone size={16} className="text-blue-400" /><span className="text-sm">عملائي المستلمين</span></div>
                    <span className="text-sm font-bold text-blue-400">{leadsStats.mine}</span>
                  </button>
                )}
                {counts.visa_pending > 0 && (
                  <button onClick={() => navigate('/visa?status=submitted')} className="w-full flex items-center justify-between gap-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition">
                    <div className="flex items-center gap-2"><Ticket size={16} className="text-purple-400" /><span className="text-sm">طلبات فيزا</span></div>
                    <span className="text-sm font-bold text-purple-400">{counts.visa_pending}</span>
                  </button>
                )}
                {counts.passport_pending > 0 && (
                  <button onClick={() => navigate('/passport?status=submitted')} className="w-full flex items-center justify-between gap-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition">
                    <div className="flex items-center gap-2"><IdCard size={16} className="text-cyan-400" /><span className="text-sm">طلبات جوازات</span></div>
                    <span className="text-sm font-bold text-cyan-400">{counts.passport_pending}</span>
                  </button>
                )}
                {counts.ticket_pending > 0 && (
                  <button onClick={() => navigate('/flight-tickets?status=pending')} className="w-full flex items-center justify-between gap-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition">
                    <div className="flex items-center gap-2"><Plane size={16} className="text-orange-400" /><span className="text-sm">تذاكر بانتظار الموافقة</span></div>
                    <span className="text-sm font-bold text-orange-400">{counts.ticket_pending}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateVisaModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => navigate(`/visa/${id}`)} />
      <CreatePassportModal open={createPassportOpen} onClose={() => setCreatePassportOpen(false)} onCreated={(id) => navigate(`/passport/${id}`)} />
    </div>
  );
}
