import React, { useEffect, useState, useMemo } from 'react';
import { CalendarRange, ChevronRight, ChevronLeft, Users, Clock, CalendarDays } from 'lucide-react';
import { api } from '../utils/api';
import type { LeaveCalendarData } from '../utils/types';

function getMonthStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];
  return `${months[m - 1]} ${y}`;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay(); // 0=Sunday, 5=Friday, 6=Saturday
  return dow === 5; // Only Friday is holiday
}

function getDayName(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const names = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  return names[d.getDay()];
}

export function LeaveCalendarPage() {
  const [month, setMonth] = useState(() => getMonthStr(new Date()));
  const [data, setData] = useState<LeaveCalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leaves/calendar?month=${month}`);
      setData(res.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [month]);

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(getMonthStr(d));
  };

  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(getMonthStr(d));
  };

  const [year, mon] = month.split('-').map(Number);

  // Build a map: userId -> set of dates -> leave info
  const leaveMap = useMemo(() => {
    if (!data) return new Map<number, Map<string, { color: string; status: string; typeName: string; hours_count: number | null; days_count: number }>>();
    const map = new Map<number, Map<string, { color: string; status: string; typeName: string; hours_count: number | null; days_count: number }>>();

    for (const leave of data.leaves) {
      if (!map.has(leave.user_id)) map.set(leave.user_id, new Map());
      const userMap = map.get(leave.user_id)!;

      // Iterate through each day of the leave
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayStr = d.toISOString().split('T')[0];
        // Only include days within the current month
        if (dayStr.startsWith(month)) {
          userMap.set(dayStr, {
            color: leave.leave_type_color,
            status: leave.status,
            typeName: leave.leave_type_name,
            hours_count: leave.hours_count,
            days_count: leave.days_count,
          });
        }
      }
    }
    return map;
  }, [data, month]);

  const daysArray = data ? Array.from({ length: data.days_in_month }, (_, i) => i + 1) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/20">
            <CalendarRange className="text-green-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">جدول الدوام الشهري</h1>
            <p className="text-sm text-slate-400">عرض حالة جميع الموظفين</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400 hover:text-white">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-bold min-w-[120px] text-center">{getMonthLabel(month)}</span>
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-800 transition text-slate-400 hover:text-white">
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <Users size={20} className="text-blue-400" />
            <div>
              <div className="text-lg font-bold text-white">{data.stats.total_employees}</div>
              <div className="text-xs text-slate-400">موظف</div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <CalendarDays size={20} className="text-green-400" />
            <div>
              <div className="text-lg font-bold text-green-400">{data.stats.approved_leave_days}</div>
              <div className="text-xs text-slate-400">يوم إجازة مقبولة</div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <Clock size={20} className="text-yellow-400" />
            <div>
              <div className="text-lg font-bold text-yellow-400">{data.stats.pending_requests}</div>
              <div className="text-xs text-slate-400">طلب معلق</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40" /> حاضر
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/40" /> إجازة معلقة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/40" /> إجازة مقبولة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700/50 border border-slate-600/40" /> عطلة (الجمعة فقط)
        </span>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
      ) : !data || data.employees.length === 0 ? (
        <div className="text-center py-12 text-slate-400">لا يوجد موظفون</div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="sticky right-0 z-10 bg-slate-900/95 text-right px-3 py-2 text-slate-400 font-medium min-w-[120px]">
                    الموظف
                  </th>
                  {daysArray.map(day => {
                    const weekend = isWeekend(year, mon, day);
                    return (
                      <th
                        key={day}
                        className={`px-1 py-2 text-center font-medium min-w-[32px] ${
                          weekend ? 'text-slate-600 bg-slate-800/30' : 'text-slate-400'
                        }`}
                      >
                        <div>{day}</div>
                        <div className="text-[9px]">{getDayName(year, mon, day)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp) => {
                  const userLeaves = leaveMap.get(emp.id);
                  return (
                    <tr key={emp.id} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition">
                      <td className="sticky right-0 z-10 bg-slate-900/95 px-3 py-2 font-medium text-white whitespace-nowrap">
                        {emp.name}
                      </td>
                      {daysArray.map(day => {
                        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                        const weekend = isWeekend(year, mon, day);
                        const leave = userLeaves?.get(dateStr);

                        let cellClass = '';
                        let title = '';

                        if (weekend) {
                          cellClass = 'bg-slate-700/30';
                          title = 'عطلة (الجمعة)';
                        } else if (leave) {
                          if (leave.status === 'approved') {
                            cellClass = 'opacity-90';
                            title = leave.hours_count 
                              ? `${leave.typeName} (مقبولة) - ${leave.hours_count} ساعة`
                              : `${leave.typeName} (مقبولة) - ${leave.days_count} يوم`;
                          } else {
                            cellClass = 'bg-yellow-500/25';
                            title = leave.hours_count 
                              ? `${leave.typeName} (معلقة) - ${leave.hours_count} ساعة`
                              : `${leave.typeName} (معلقة) - ${leave.days_count} يوم`;
                          }
                        } else if (!weekend) {
                          cellClass = 'bg-green-500/15';
                          title = 'حاضر';
                        }

                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-2 text-center ${cellClass}`}
                            style={leave?.status === 'approved' ? { backgroundColor: `${leave.color}33` } : undefined}
                            title={title}
                          >
                            {leave && (
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: leave.status === 'approved' ? leave.color : '#EAB308',
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
