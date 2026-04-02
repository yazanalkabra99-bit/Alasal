import React from 'react';
import cn from 'classnames';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={cn(
        'w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50',
        className
      )}
    >
      {children}
    </select>
  );
}
