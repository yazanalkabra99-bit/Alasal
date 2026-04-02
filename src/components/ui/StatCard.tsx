import React from 'react';
import cn from 'classnames';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

const variantStyles = {
  default: {
    iconBg: 'bg-slate-700/50',
    iconColor: 'text-slate-300',
    accentGradient: 'from-brand-500/20 to-transparent',
  },
  success: {
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    accentGradient: 'from-green-500/20 to-transparent',
  },
  warning: {
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    accentGradient: 'from-amber-500/20 to-transparent',
  },
  danger: {
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    accentGradient: 'from-red-500/20 to-transparent',
  },
  info: {
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    accentGradient: 'from-blue-500/20 to-transparent',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
  subtitle,
  onClick,
  className,
  variant = 'default',
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-400'
      : trend.value < 0
      ? 'text-red-400'
      : 'text-slate-400'
    : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'card-stat glass rounded-2xl p-4 relative overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20',
        className
      )}
    >
      {/* Accent gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${styles.accentGradient} rounded-full transform translate-x-8 -translate-y-8 opacity-50`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">{title}</div>
            <div className="text-2xl font-black text-white tracking-tight">{value}</div>
            
            {(trend || subtitle) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && TrendIcon && (
                  <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                    <TrendIcon size={14} />
                    <span>{Math.abs(trend.value)}%</span>
                    {trend.label && <span className="text-slate-500">{trend.label}</span>}
                  </div>
                )}
                {subtitle && !trend && (
                  <div className="text-xs text-slate-500">{subtitle}</div>
                )}
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={cn('p-3 rounded-xl', styles.iconBg)}>
              <Icon size={22} className={iconColor || styles.iconColor} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Stat Card
type ProgressStatCardProps = {
  title: string;
  value: number;
  total: number;
  icon?: LucideIcon;
  color?: 'brand' | 'green' | 'amber' | 'red';
  className?: string;
};

const progressColors = {
  brand: 'bg-brand-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function ProgressStatCard({
  title,
  value,
  total,
  icon: Icon,
  color = 'brand',
  className,
}: ProgressStatCardProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-slate-400">{title}</div>
        {Icon && <Icon size={18} className="text-slate-500" />}
      </div>
      
      <div className="flex items-end justify-between mb-2">
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-sm text-slate-400">/ {total}</div>
      </div>
      
      <div className="progress-bar">
        <div 
          className={`progress-bar-fill ${progressColors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="text-xs text-slate-500 mt-2">{percentage}% مكتمل</div>
    </div>
  );
}

// Mini Stat for inline use
type MiniStatProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'default' | 'success' | 'warning' | 'danger';
};

const miniStatColors = {
  default: 'text-slate-300',
  success: 'text-green-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

export function MiniStat({ label, value, icon: Icon, color = 'default' }: MiniStatProps) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={16} className={miniStatColors[color]} />}
      <span className="text-xs text-slate-400">{label}:</span>
      <span className={`text-sm font-bold ${miniStatColors[color]}`}>{value}</span>
    </div>
  );
}
