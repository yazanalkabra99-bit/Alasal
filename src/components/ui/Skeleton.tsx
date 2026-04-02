import React from 'react';
import cn from 'classnames';

type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
};

export function Skeleton({ 
  className, 
  variant = 'text', 
  width, 
  height,
  count = 1 
}: SkeletonProps) {
  const baseClass = 'skeleton';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? undefined : '100px'),
  };

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, variantStyles[variant], className)}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, variantStyles[variant], className)}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4">
      <Skeleton variant="text" width="60%" height={14} className="mb-2" />
      <Skeleton variant="text" width="40%" height={28} />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-t border-slate-800/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" width={i === 0 ? '80px' : '100%'} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Skeleton variant="text" width={150} height={24} className="mb-2" />
          <Skeleton variant="text" width={250} height={14} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={120} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-4">
          <Skeleton variant="text" width={150} height={18} className="mb-4" />
          <Skeleton variant="rectangular" height={250} />
        </div>
        <div className="glass rounded-2xl p-4">
          <Skeleton variant="text" width={120} height={18} className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
