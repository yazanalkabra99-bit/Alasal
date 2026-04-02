import React, { useMemo } from 'react';

// Simple Bar Chart
type BarChartProps = {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
};

export function BarChart({ data, height = 200, showLabels = true, showValues = true }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between gap-2 h-full">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div key={index} className="flex flex-col items-center flex-1 h-full">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out relative group"
                  style={{
                    height: `${barHeight}%`,
                    minHeight: item.value > 0 ? '4px' : '0',
                    backgroundColor: item.color || '#1f6eff',
                  }}
                >
                  {showValues && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}
                    </div>
                  )}
                </div>
              </div>
              {showLabels && (
                <div className="text-[10px] text-slate-400 mt-2 text-center truncate w-full">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple Line Chart (using SVG)
type LineChartProps = {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
};

export function LineChart({ 
  data, 
  height = 200, 
  color = '#1f6eff',
  showDots = true,
  showArea = true 
}: LineChartProps) {
  const { path, areaPath, points, minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [], minValue: 0, maxValue: 0 };

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 100;
    const padding = 5;
    const chartHeight = height - 40;

    const pts = data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
      y: chartHeight - ((d.value - min) / range) * (chartHeight - 20) - 10,
      label: d.label,
      value: d.value,
    }));

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const area = `${linePath} L ${pts[pts.length - 1].x} ${chartHeight} L ${pts[0].x} ${chartHeight} Z`;

    return { path: linePath, areaPath: area, points: pts, minValue: min, maxValue: max };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        لا توجد بيانات
      </div>
    );
  }

  return (
    <div className="w-full relative" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="5"
            y1={(y / 100) * (height - 40) + 10}
            x2="95"
            y2={(y / 100) * (height - 40) + 10}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Area fill */}
        {showArea && (
          <path
            d={areaPath}
            fill={`url(#gradient-${color.replace('#', '')})`}
            opacity="0.3"
          />
        )}
        
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />
        
        {/* Dots */}
        {showDots && points.map((p, i) => (
          <g key={i} className="group">
            <circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill={color}
              className="drop-shadow-lg"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill={color}
              opacity="0"
              className="cursor-pointer hover:opacity-30 transition-opacity"
            />
          </g>
        ))}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => (
          <div key={i} className="text-[10px] text-slate-500">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

// Donut Chart
type DonutChartProps = {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
};

export function DonutChart({ 
  data, 
  size = 150, 
  thickness = 20,
  centerLabel,
  centerValue 
}: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={thickness}
        />
        
        {/* Data segments */}
        {data.map((item, index) => {
          const percentage = total > 0 ? item.value / total : 0;
          const dashLength = percentage * circumference;
          const offset = currentOffset;
          currentOffset += dashLength;

          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      
      {/* Center content */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <div className="text-xl font-black text-white">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="text-xs text-slate-400">{centerLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Chart Legend
type ChartLegendProps = {
  items: { label: string; value: number | string; color: string }[];
  direction?: 'horizontal' | 'vertical';
};

export function ChartLegend({ items, direction = 'vertical' }: ChartLegendProps) {
  return (
    <div className={`flex ${direction === 'vertical' ? 'flex-col gap-2' : 'flex-wrap gap-4'}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-slate-300">{item.label}</span>
          <span className="text-xs font-bold text-white">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Quick Stats Row
type QuickStatsProps = {
  stats: { label: string; value: string | number; change?: number }[];
};

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-2">
      {stats.map((stat, index) => (
        <div key={index} className="flex-shrink-0">
          <div className="text-xs text-slate-400">{stat.label}</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{stat.value}</span>
            {stat.change !== undefined && (
              <span className={`text-xs ${stat.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change >= 0 ? '+' : ''}{stat.change}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
