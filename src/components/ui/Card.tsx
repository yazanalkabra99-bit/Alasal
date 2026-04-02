import React from 'react';
import cn from 'classnames';

type CardProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ className, children, onClick, hover = false, padding = 'md' }: CardProps) {
  return (
    <div 
      className={cn(
        'glass rounded-2xl shadow-xl shadow-slate-950/20',
        paddingClasses[padding],
        hover && 'glass-hover cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className,
  action 
}: { 
  children: React.ReactNode; 
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-sm font-bold text-white', className)}>{children}</div>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-xs text-slate-400 mt-0.5', className)}>{children}</div>;
}

export function CardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-2xl font-black tracking-tight text-white', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-700/50', className)}>
      {children}
    </div>
  );
}

// Stat Card Variant
type StatCardSimpleProps = {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  className?: string;
};

export function StatCardSimple({ title, value, icon, trend, className }: StatCardSimpleProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-400 mb-1">{title}</div>
          <div className="text-2xl font-black text-white">{value}</div>
          {trend && (
            <div className={cn(
              'text-xs mt-1',
              trend.positive !== false ? 'text-green-400' : 'text-red-400'
            )}>
              {trend.positive !== false ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-800/50">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
