import React, { useState, createContext, useContext } from 'react';
import cn from 'classnames';

// Context
type TabsContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Main Tabs Container
type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;
  
  const setActiveTab = (tab: string) => {
    if (!value) setInternalValue(tab);
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
type TabsListProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
};

export function TabsList({ children, className, variant = 'default' }: TabsListProps) {
  const variantClasses = {
    default: 'flex gap-1 p-1 bg-slate-900/50 rounded-xl',
    pills: 'flex gap-2',
    underline: 'flex gap-4 border-b border-slate-700/50',
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
}

// Tab Trigger
type TabsTriggerProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  count?: number;
};

export function TabsTrigger({ value, children, className, disabled, icon, count }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
        isActive
          ? 'bg-brand-600/20 text-white border border-brand-600/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn(
          'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
          isActive ? 'bg-brand-500/30 text-brand-200' : 'bg-slate-700/50 text-slate-400'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// Tab Content
type TabsContentProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabsContext();
  
  if (activeTab !== value) return null;

  return (
    <div className={cn('animate-fade-in', className)}>
      {children}
    </div>
  );
}

// Simple Inline Tabs (alternative)
type SimpleTabsProps = {
  tabs: { id: string; label: string; count?: number; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (tab: string) => void;
  variant?: 'pills' | 'buttons';
  className?: string;
};

export function SimpleTabs({ tabs, activeTab, onChange, variant = 'pills', className }: SimpleTabsProps) {
  if (variant === 'buttons') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold border transition-all',
              activeTab === tab.id
                ? 'bg-brand-600/20 border-brand-600/30 text-white'
                : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:bg-slate-800/40'
            )}
          >
            <span className="flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="opacity-60">({tab.count})</span>
              )}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1 p-1 bg-slate-900/50 rounded-xl', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
            activeTab === tab.id
              ? 'bg-brand-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
              activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700/50'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
