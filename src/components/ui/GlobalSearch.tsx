import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Ticket, IdCard, Plane, Building2, Users, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';

interface SearchResult {
  id: number;
  type: 'visa' | 'passport' | 'ticket' | 'office' | 'customer';
  title: string;
  subtitle: string;
  status?: string;
}

const typeIcons = {
  visa: Ticket,
  passport: IdCard,
  ticket: Plane,
  office: Building2,
  customer: Users,
};

const typeColors = {
  visa: 'text-purple-400 bg-purple-500/20',
  passport: 'text-cyan-400 bg-cyan-500/20',
  ticket: 'text-orange-400 bg-orange-500/20',
  office: 'text-pink-400 bg-pink-500/20',
  customer: 'text-blue-400 bg-blue-500/20',
};

const typeLabels = {
  visa: 'فيزا',
  passport: 'جواز',
  ticket: 'تذكرة',
  office: 'مكتب',
  customer: 'عميل',
};

const typeRoutes = {
  visa: '/visa',
  passport: '/passport',
  ticket: '/flight-tickets',
  office: '/offices',
  customer: '/offices', // customers are handled through offices
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Mock search - replace with real API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // TODO: Replace with real API call
    // const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
    // setResults(response.data.data || []);
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, onClose]);

  const handleSelect = (result: SearchResult) => {
    navigate(`${typeRoutes[result.type]}/${result.id}`);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Search Modal */}
      <div className="relative w-full max-w-xl mx-4 animate-slide-down">
        <div className="glass-card rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-700/30">
            <Search size={20} className="text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن طلب، عميل، أو تذكرة..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X size={16} className="text-slate-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-slate-800/50 rounded-lg border border-slate-700/50">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-400 mt-2">جاري البحث...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-right transition',
                        index === selectedIndex 
                          ? 'bg-blue-500/10 border border-blue-500/20' 
                          : 'hover:bg-slate-800/50'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', typeColors[result.type])}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{result.title}</p>
                        <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800/50 rounded-lg">
                        {typeLabels[result.type]}
                      </span>
                      <ArrowLeft size={14} className="text-slate-500" />
                    </button>
                  );
                })}
              </div>
            ) : query ? (
              <div className="p-8 text-center">
                <Search size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">لا توجد نتائج لـ "{query}"</p>
                <p className="text-xs text-slate-500 mt-1">جرب كلمات بحث مختلفة</p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-3">بحث سريع</p>
                <div className="flex flex-wrap gap-2">
                  {['فيزا', 'جواز', 'تذكرة', 'مكتب'].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700/30 bg-slate-900/30">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd>
                  للتنقل
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
                  للفتح
                </span>
              </div>
              <span>{results.length} نتيجة</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hook for keyboard shortcut
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}
