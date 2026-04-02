import { DollarSign, TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';
import { TripBudget, TripCostItem, COST_CATEGORY_LABELS } from './types';

interface TripBudgetSummaryProps {
  budget: TripBudget;
  costItems: TripCostItem[];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TripBudgetSummary({ budget, costItems }: TripBudgetSummaryProps) {
  const profitPercent = budget.revenue_usd > 0
    ? ((budget.profit_usd / budget.revenue_usd) * 100).toFixed(1)
    : '0.0';

  const collectionPercent = budget.revenue_usd > 0
    ? ((budget.total_collected_usd / budget.revenue_usd) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      {/* Top cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400">الركاب</span>
          </div>
          <div className="text-lg font-bold text-white">{budget.passenger_count}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400">الإيرادات</span>
          </div>
          <div className="text-lg font-bold text-green-400">${fmt(budget.revenue_usd)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">التكاليف</span>
          </div>
          <div className="text-lg font-bold text-red-400">${fmt(budget.cost_usd)}</div>
        </div>
        <div className={`bg-slate-800/60 rounded-xl p-3 border ${budget.profit_usd >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`w-4 h-4 ${budget.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-xs text-slate-400">صافي الربح ({profitPercent}%)</span>
          </div>
          <div className={`text-lg font-bold ${budget.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${fmt(budget.profit_usd)}
          </div>
        </div>
      </div>

      {/* Collection progress */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-300">التحصيل</span>
          </div>
          <span className="text-xs text-slate-400">{collectionPercent}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, Number(collectionPercent))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>محصّل: ${fmt(budget.total_collected_usd)}</span>
          <span>متبقي: ${fmt(budget.total_remaining_usd)}</span>
        </div>
      </div>

      {/* Costs by category */}
      {Object.keys(budget.costs_by_category).length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-3">التكاليف حسب الفئة</h4>
          <div className="space-y-2">
            {Object.entries(budget.costs_by_category).map(([cat, data]) => {
              const percent = budget.cost_usd > 0 ? ((data.total_usd / budget.cost_usd) * 100).toFixed(0) : '0';
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">{COST_CATEGORY_LABELS[cat] || cat}</span>
                    <span className="text-xs text-slate-500">({data.item_count} بند)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-700 rounded-full h-1.5">
                      <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-sm text-red-400 font-mono w-24 text-left">${fmt(data.total_usd)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
