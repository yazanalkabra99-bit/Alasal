import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, Plane, Shield, FileBarChart, Users, Moon, Sun } from 'lucide-react';

import logo from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../state/auth';
import { useTheme } from '../context/ThemeContext';

const features = [
  { icon: Plane, title: 'إدارة التذاكر', desc: 'إدخال ومتابعة تذاكر الطيران والتذاكر الخارجية.' },
  { icon: Shield, title: 'الفيزا والجوازات', desc: 'متابعة طلبات الفيزا والجوازات وحالاتها.' },
  { icon: Users, title: 'العملاء والمتابعة', desc: 'إدارة بيانات العملاء وسجل المتابعات.' },
  { icon: FileBarChart, title: 'التقارير', desc: 'تقارير مالية وتشغيلية وفق الصلاحيات.' },
];

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from?.pathname || '/dashboard';

  const year = useMemo(() => new Date().getFullYear(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Left Side (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-12 xl:p-20">
        <div className="max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <img src={logo} alt="Logo" className="h-16 w-16 rounded-2xl bg-white p-2 shadow-2xl" />
            <div>
              <h1 className="text-3xl font-black text-white">مكتب العسل للسياحة والسفر</h1>
              <p className="text-slate-400 text-sm">نظام إدارة المكتب</p>
            </div>
          </div>

          <p className="text-lg text-slate-300 mb-10 leading-relaxed">
            منصة لإدارة عمليات المكتب اليومية: التذاكر، الفيزا، الجوازات، العملاء، والمحاسبة — وفق صلاحيات المستخدمين.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-hover glass rounded-2xl p-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center mb-3">
                  <feature.icon className="text-brand-400" size={20} />
                </div>
                <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Theme Toggle - Top Right */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all duration-200"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-400" />
              ) : (
                <Moon size={20} className="text-slate-400" />
              )}
            </button>
          </div>

          {/* Mobile Brand */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-fade-in">
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-3xl bg-white p-2 shadow-2xl" />
            <h1 className="mt-4 text-2xl font-black text-white">مكتب العسل للسياحة والسفر</h1>
            <p className="text-slate-400 text-sm">نظام إدارة المكتب</p>
          </div>

          <div className="glass rounded-3xl p-6 lg:p-8 shadow-2xl animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white">تسجيل الدخول</h2>
              <p className="text-sm text-slate-400 mt-1">يرجى إدخال بيانات الدخول المخصصة لكم</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <Mail size={14} />
                  البريد الإلكتروني
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="text-left"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <Lock size={14} />
                  كلمة المرور
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-left pr-10"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300 animate-fade-in">
                  {error}
                </div>
              )}

              <Button className="w-full h-11" loading={loading} type="submit">
                <span>دخول</span>
                <ArrowLeft size={18} />
              </Button>

              <p className="text-[11px] text-slate-500 text-center pt-2">
                في حال نسيان كلمة المرور، يرجى مراجعة مدير النظام.
              </p>
            </form>
          </div>

          {/* Ramadan Greeting */}
          <div className="mt-4 mb-4">
            <div className="glass rounded-2xl p-4 text-center border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Moon className="text-amber-400" size={20} />
                <span className="text-amber-300 font-bold">رمضان كريم</span>
                <Moon className="text-amber-400" size={20} />
              </div>
              <p className="text-sm text-slate-300">
                كل عام وأنتم بخير 🌙<br />
                <span className="text-xs text-slate-400">تقبل الله صيامكم وقيامكم</span>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-600">© {year} مكتب العسل للسياحة والسفر. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
