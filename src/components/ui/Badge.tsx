import cn from 'classnames';

// NOTE: we keep "emerald" as an alias for "green" because some pages use it directly.
export type BadgeTone = 'gray' | 'blue' | 'purple' | 'green' | 'emerald' | 'red' | 'amber' | 'cyan' | 'pink';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'solid' | 'outline' | 'subtle';

type BadgeProps = {
  tone?: BadgeTone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

const toneColors: Record<BadgeTone, { bg: string; border: string; text: string; dot: string }> = {
  gray: { bg: 'bg-slate-900/70', border: 'border-slate-700', text: 'text-slate-200', dot: 'bg-slate-400' },
  blue: { bg: 'bg-blue-950/70', border: 'border-blue-800', text: 'text-blue-200', dot: 'bg-blue-400' },
  purple: { bg: 'bg-purple-950/70', border: 'border-purple-800', text: 'text-purple-200', dot: 'bg-purple-400' },
  green: { bg: 'bg-emerald-950/70', border: 'border-emerald-800', text: 'text-emerald-200', dot: 'bg-emerald-400' },
  emerald: { bg: 'bg-emerald-950/70', border: 'border-emerald-800', text: 'text-emerald-200', dot: 'bg-emerald-400' },
  red: { bg: 'bg-red-950/70', border: 'border-red-800', text: 'text-red-200', dot: 'bg-red-400' },
  amber: { bg: 'bg-amber-950/70', border: 'border-amber-800', text: 'text-amber-200', dot: 'bg-amber-400' },
  cyan: { bg: 'bg-cyan-950/70', border: 'border-cyan-800', text: 'text-cyan-200', dot: 'bg-cyan-400' },
  pink: { bg: 'bg-pink-950/70', border: 'border-pink-800', text: 'text-pink-200', dot: 'bg-pink-400' },
};

export function Badge({ 
  tone = 'gray', 
  size = 'md',
  variant = 'solid',
  icon,
  dot,
  className,
  children 
}: BadgeProps) {
  // Hard safety: never crash the whole page if a wrong tone is passed.
  const colors = (toneColors as any)[tone] || toneColors.gray;
  
  const variantClasses = {
    solid: `${colors.bg} ${colors.border} ${colors.text}`,
    outline: `bg-transparent ${colors.border} ${colors.text}`,
    subtle: `${colors.bg} border-transparent ${colors.text}`,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors',
      sizeClasses[size],
      variantClasses[variant],
      className
    )}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Status Badge with predefined styles
type StatusBadgeProps = {
  status: string;
  size?: BadgeSize;
  className?: string;
};

const statusConfig: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'amber', label: 'معلق' },
  submitted: { tone: 'blue', label: 'مقدم' },
  processing: { tone: 'purple', label: 'قيد المعالجة' },
  issued: { tone: 'green', label: 'صادر' },
  delivered: { tone: 'green', label: 'مسلّم' },
  cancelled: { tone: 'gray', label: 'ملغي' },
  rejected: { tone: 'red', label: 'مرفوض' },
  overdue: { tone: 'red', label: 'متأخر' },
  ready: { tone: 'cyan', label: 'جاهز' },
  sold: { tone: 'green', label: 'مباع' },
  refunded: { tone: 'amber', label: 'مسترجع' },
  void: { tone: 'gray', label: 'ملغي' },
  active: { tone: 'green', label: 'نشط' },
  inactive: { tone: 'gray', label: 'غير نشط' },
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status] || { tone: 'gray' as BadgeTone, label: status };
  
  return (
    <Badge tone={config.tone} size={size} dot className={className}>
      {config.label}
    </Badge>
  );
}
