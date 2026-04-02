import React from 'react';
import cn from 'classnames';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Column Definition
export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

// Table Props
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onRowClick?: (item: T) => void;
  selectedRow?: T | null;
  rowClassName?: (item: T) => string;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  selectedRow,
  rowClassName,
  stickyHeader = false,
}: DataTableProps<T>) {
  
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    if (sortField === column.key) {
      return sortDirection === 'asc' 
        ? <ChevronUp size={14} className="text-blue-400" />
        : <ChevronDown size={14} className="text-blue-400" />;
    }
    return <ChevronsUpDown size={14} className="text-slate-600" />;
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/30">
      <table className="data-table">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  alignClasses[column.align || 'right'],
                  column.sortable && 'cursor-pointer hover:bg-slate-800/50 transition'
                )}
                onClick={() => handleSort(column)}
              >
                <div className={cn(
                  'flex items-center gap-1',
                  column.align === 'left' ? 'justify-start flex-row-reverse' : 
                  column.align === 'center' ? 'justify-center' : 'justify-start'
                )}>
                  <span>{column.header}</span>
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div className="skeleton h-5 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty state
            <tr>
              <td colSpan={columns.length} className="!py-12">
                <div className="empty-state">
                  {emptyIcon}
                  <h3>{emptyMessage}</h3>
                </div>
              </td>
            </tr>
          ) : (
            // Data rows
            data.map((item, index) => {
              const isSelected = selectedRow && selectedRow[keyField] === item[keyField];
              return (
                <tr
                  key={String(item[keyField])}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'table-row-hover',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-blue-500/10 !border-blue-500/20',
                    rowClassName?.(item)
                  )}
                >
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className={alignClasses[column.align || 'right']}
                    >
                      {column.render 
                        ? column.render(item, index)
                        : item[column.key]
                      }
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// Simple Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/30">
      <div className="text-xs text-slate-500">
        {totalItems !== undefined && (
          <>
            عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} من {totalItems}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          السابق
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-8 h-8 text-sm rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 transition"
            >
              1
            </button>
            {startPage > 2 && <span className="text-slate-600">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 text-sm rounded-lg transition',
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            )}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-slate-600">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8 text-sm rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 transition"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          التالي
        </button>
      </div>
    </div>
  );
}

// Filter Pills
interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  options: FilterOption[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, selected, onChange }: FilterPillsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition',
            selected === option.value
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-transparent'
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 text-xs rounded-md',
              selected === option.value ? 'bg-blue-500/30' : 'bg-slate-700/50'
            )}>
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
