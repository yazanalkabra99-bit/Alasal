import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Ticket, Building2, Landmark, TrendingUp, LogOut,
  ListChecks, Users, IdCard, Plane, Coins, Menu, X, Search,
  Bell, ChevronLeft, FileBarChart, Wallet, ClipboardList, ArrowLeftRight, Receipt, Briefcase, Sun, Moon,
  CalendarDays, CalendarRange, Hotel, Bus, Shield, HardDrive
} from 'lucide-react';
import { useAuth, hasAnyRole, Role, roleLabels } from '../state/auth';
import { NotificationBell } from '../components/NotificationBell';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';

const nav: { to: string; label: string; icon: any; roles: Role[]; color: string }[] = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, roles: ['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin'], color: 'blue' },
  { to: '/visa', label: 'الفيزا', icon: Ticket, roles: ['employee','visa_admin','visa_admin_2','accounting','admin'], color: 'purple' },
  { to: '/visa-types', label: 'إدارة أنواع الفيز', icon: ListChecks, roles: ['visa_admin','visa_admin_2','admin'], color: 'purple' },
  { to: '/passport', label: 'الجوازات', icon: IdCard, roles: ['employee','passport_admin','accounting','admin'], color: 'cyan' },
  { to: '/passport-types', label: 'إدارة أنواع الجوازات', icon: ListChecks, roles: ['passport_admin','admin'], color: 'cyan' },
  { to: '/flight-tickets', label: 'تذاكر الطيران', icon: Plane, roles: ['employee','airline_admin','accounting','admin'], color: 'orange' },
  { to: '/external-tickets', label: 'تذاكر خارجية', icon: ArrowLeftRight, roles: ['employee','airline_admin','accounting','admin'], color: 'amber' },
  { to: '/service-sales', label: 'بيع خدمة', icon: Briefcase, roles: ['employee','accounting','admin'], color: 'emerald' },
  { to: '/hotel-bookings', label: 'حجوزات فندقية', icon: Hotel, roles: ['employee','accounting','admin'], color: 'pink' },
  { to: '/trips', label: 'رحلات وحملات', icon: Bus, roles: ['employee','accounting','admin'], color: 'violet' },
  // Customers Hub (Directory + Follow-up). Single entry replaces old "متابعة العملاء" + "العملاء".
  { to: '/customers', label: 'العملاء', icon: Users, roles: ['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin'], color: 'cyan' },
  { to: '/airlines', label: 'شركات الطيران', icon: Plane, roles: ['airline_admin','accounting','admin'], color: 'orange' },
  { to: '/airline-topups', label: 'طلبات تغذية شركات الطيران', icon: Wallet, roles: ['airline_admin','accounting','admin'], color: 'orange' },
  { to: '/offices', label: 'المكاتب', icon: Building2, roles: ['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin'], color: 'pink' },
  { to: '/profits', label: 'الأرباح', icon: TrendingUp, roles: ['admin'], color: 'green' },
  { to: '/expenses', label: 'المصاريف', icon: Receipt, roles: ['accounting','admin'], color: 'amber' },
  { to: '/reports/visa-daily', label: 'تقرير الفيزا', icon: FileBarChart, roles: ['visa_admin','admin'], color: 'purple' },
  { to: '/reports/debts', label: 'تقرير الديون', icon: FileBarChart, roles: ['accounting','admin'], color: 'amber' },
  { to: '/reports/cash', label: 'تقرير الصناديق', icon: Wallet, roles: ['accounting','admin'], color: 'emerald' },
  { to: '/reports/offices-ranking', label: 'تقرير عمل المكاتب', icon: FileBarChart, roles: ['accounting','admin'], color: 'emerald' },
  { to: '/reports/employees', label: 'تقرير الموظفين', icon: ClipboardList, roles: ['admin'], color: 'indigo' },
  { to: '/accounts', label: 'المحاسبة', icon: Landmark, roles: ['accounting','admin'], color: 'emerald' },
  { to: '/currencies', label: 'العملات', icon: Coins, roles: ['accounting','admin'], color: 'yellow' },
  { to: '/employees', label: 'إدارة الموظفين', icon: Users, roles: ['accounting','admin'], color: 'indigo' },
  { to: '/archive', label: 'الأرشيف', icon: Shield, roles: ['admin'], color: 'indigo' },
  { to: '/legacy-tickets', label: 'تعديلات تذاكر قديمة', icon: Plane, roles: ['airline_admin','accounting','admin'], color: 'amber' },
  { to: '/legacy-external-tickets', label: 'تعديلات خارجية قديمة', icon: ArrowLeftRight, roles: ['airline_admin','accounting','admin'], color: 'cyan' },
  { to: '/leaves', label: 'الإجازات', icon: CalendarDays, roles: ['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin'], color: 'green' },
  { to: '/leaves/calendar', label: 'جدول الدوام', icon: CalendarRange, roles: ['admin', 'airline_admin'], color: 'green' },
  { to: '/backup', label: 'النسخ الاحتياطي', icon: HardDrive, roles: ['accounting','admin'], color: 'emerald' },
];

const colorClasses: Record<string, string> = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  amber: 'text-amber-400',
  pink: 'text-pink-400',
  emerald: 'text-emerald-400',
  yellow: 'text-yellow-400',
  indigo: 'text-indigo-400',
  violet: 'text-violet-400',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Filter nav items based on user's roles (supports multi-role)
  const filteredNav = nav.filter((item) => hasAnyRole(user, item.roles));

  const currentPage = filteredNav.find(n => location.pathname.startsWith(n.to))?.label || 
                    nav.find(n => location.pathname.startsWith(n.to) && hasAnyRole(user, n.roles))?.label || 
                    'الرئيسية';

  return (
    <div className="min-h-screen gradient-bg">
      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-xl bg-white p-1" />
              <div>
                <div className="text-sm font-bold office-name">مكتب العسل للسياحة والسفر</div>
                <div className="text-xs text-slate-400">نظام إدارة المكتب</div>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-slate-800 rounded-xl transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/30 text-white'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    ].join(' ')
                  }
                >
                  <Icon size={18} className={colorClasses[item.color]} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="rounded-xl bg-slate-800/50 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{user?.name}</div>
                  <div className="text-xs text-slate-400">{roleLabels[user?.role as Role] || user?.role}</div>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <LogOut size={16} />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] p-3 lg:p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-2">
            <div className="glass rounded-2xl p-4 sticky top-4">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-12 w-12 rounded-2xl bg-white p-1.5 shadow-lg" />
                <div>
                  <div className="brand-title office-name text-base font-black leading-tight text-white">
                    مكتب العسل للسياحة والسفر
                  </div>
                  <div className="text-[11px] text-slate-500">نظام إدارة المكتب</div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="mt-6 space-y-1">
                {filteredNav.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 animate-fade-in opacity-0',
                          isActive
                            ? 'bg-gradient-to-l from-blue-500/20 to-purple-500/10 border border-blue-500/20 text-white shadow-lg shadow-blue-500/5'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        ].join(' ')
                      }
                    >
                      <Icon size={18} className={colorClasses[item.color]} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>

              {/* User Card */}
              <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500">{roleLabels[user?.role as Role] || user?.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <LogOut size={14} />
                  تسجيل خروج
                </button>
              </div>

              {/* Version Badge */}
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 bg-slate-800/50 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  الإصدار 1.0
                </span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9 xl:col-span-10">
            <div className="glass rounded-2xl overflow-hidden">
              {/* Top Bar */}
              <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-900/30">
                <div className="flex items-center justify-between gap-4">
                  {/* Mobile Menu Button + Logo */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setMobileMenuOpen(true)}
                      className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition"
                    >
                      <Menu size={20} />
                    </button>
                    
                    <div className="lg:hidden flex items-center gap-2">
                      <img src={logo} alt="Logo" className="h-8 w-8 rounded-lg bg-white p-0.5" />
                      <span className="text-sm font-bold">العسل</span>
                    </div>

                    {/* Breadcrumb - Desktop */}
                    <div className="hidden lg:flex items-center gap-2 text-sm">
                      <span className="text-slate-500">الرئيسية</span>
                      <ChevronLeft size={14} className="text-slate-600" />
                      <span className="text-white font-medium">{currentPage}</span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <button 
                      onClick={toggleTheme}
                      className="p-2.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white"
                      title={theme === 'dark' ? 'التبديل للوضع النهاري' : 'التبديل للوضع الداكن'}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Search Button */}
                    <button 
                      onClick={() => setSearchOpen(!searchOpen)}
                      className="p-2.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white"
                    >
                      <Search size={18} />
                    </button>

                    {/* Notifications Bell */}
                    <NotificationBell />

                    {/* User Avatar - Desktop */}
                    <div className="hidden sm:flex items-center gap-2 mr-2 pr-3 border-r border-slate-700/50">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">مرحباً</div>
                        <div className="text-sm font-bold">{user?.name}</div>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar - Expandable */}
                {searchOpen && (
                  <div className="mt-3 animate-fade-in">
                    <div className="search-bar">
                      <Search size={18} className="search-icon" />
                      <input 
                        type="text" 
                        placeholder="ابحث عن طلب، عميل، أو تذكرة..." 
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Page Content */}
              <div className="p-4">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
