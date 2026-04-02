import React from 'react';
import { FileText, Search, Inbox, AlertCircle, LucideIcon } from 'lucide-react';
import { Button } from './Button';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
        <Icon size={32} className="text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Predefined Empty States
export function NoDataState({ 
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على أي بيانات لعرضها',
  action
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      icon={FileText}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function NoSearchResultsState({ 
  query,
  onClear
}: { 
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="لا توجد نتائج"
      description={query ? `لم يتم العثور على نتائج لـ "${query}"` : 'حاول تغيير معايير البحث'}
      action={onClear ? { label: 'مسح البحث', onClick: onClear } : undefined}
    />
  );
}

export function ErrorState({ 
  title = 'حدث خطأ',
  description = 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.',
  onRetry
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'إعادة المحاولة', onClick: onRetry } : undefined}
    />
  );
}
