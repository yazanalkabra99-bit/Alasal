import React from 'react';
import cn from 'classnames';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
};

export function Button({ 
  variant = 'primary', 
  size = 'md',
  loading, 
  icon,
  iconPosition = 'right',
  className, 
  children, 
  disabled,
  ...props 
}: Props) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const sizeStyles: Record<Size, string> = {
    sm: 'rounded-lg px-3 py-1.5 text-xs',
    md: 'rounded-xl px-4 py-2.5 text-sm',
    lg: 'rounded-xl px-6 py-3 text-base',
  };

  const variantStyles: Record<Variant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30',
    secondary: 'bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-700/70 hover:border-slate-600',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25',
    success: 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/25',
    gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-600/25',
  };

  return (
    <button 
      className={cn(base, sizeStyles[size], variantStyles[variant], className)} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : icon && iconPosition === 'right' ? (
        icon
      ) : null}
      {children}
      {!loading && icon && iconPosition === 'left' && icon}
    </button>
  );
}

// Icon Button variant
type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function IconButton({ 
  variant = 'default', 
  size = 'md',
  className, 
  children, 
  ...props 
}: IconButtonProps) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variantStyles = {
    default: 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20',
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-200',
        sizeStyles[size],
        variantStyles[variant],
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
}
