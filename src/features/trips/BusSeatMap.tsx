import { useState } from 'react';
import { TripPassenger } from './types';

interface BusSeatMapProps {
  busId: number;
  busLabel: string;
  capacity: number;
  passengers: TripPassenger[];
  onSeatClick?: (seatNumber: number, passenger?: TripPassenger) => void;
  selectedSeat?: number | null;
  readonly?: boolean;
}

export default function BusSeatMap({ busId, busLabel, capacity, passengers, onSeatClick, selectedSeat, readonly }: BusSeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);

  const seatMap = new Map<number, TripPassenger>();
  passengers.forEach(p => {
    if (p.bus_id === busId && p.seat_number && p.status !== 'cancelled') {
      seatMap.set(p.seat_number, p);
    }
  });

  const seatsPerRow = 4;
  const rows = Math.ceil(capacity / seatsPerRow);

  const getSeatStatus = (seatNum: number) => {
    if (seatNum > capacity) return 'none';
    const passenger = seatMap.get(seatNum);
    if (passenger) {
      if (passenger.status === 'cancelled') return 'cancelled';
      return 'occupied';
    }
    if (selectedSeat === seatNum) return 'selected';
    return 'available';
  };

  const seatColors: Record<string, string> = {
    available: 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30 cursor-pointer',
    occupied: 'bg-blue-500/20 border-blue-500/40 text-blue-300 cursor-pointer',
    selected: 'bg-amber-500/30 border-amber-500/50 text-amber-300 ring-2 ring-amber-400',
    cancelled: 'bg-slate-800/50 border-slate-700/30 text-slate-600',
    none: 'invisible',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      {/* Bus header */}
      <div className="text-center mb-3">
        <div className="text-xs text-slate-500 mb-1">السائق ↑</div>
        <div className="w-full h-px bg-slate-700 mb-3" />
      </div>

      {/* Seat grid */}
      <div className="space-y-1.5">
        {Array.from({ length: rows }, (_, rowIdx) => {
          const seatStart = rowIdx * seatsPerRow + 1;
          const seatsInRow = Math.min(seatsPerRow, capacity - rowIdx * seatsPerRow);
          return (
            <div key={rowIdx} className="flex items-center justify-center gap-1">
              {/* Left pair */}
              {[0, 1].map(offset => {
                const seatNum = seatStart + offset;
                if (offset >= seatsInRow) return <div key={offset} className="w-10 h-10" />;
                const status = getSeatStatus(seatNum);
                const passenger = seatMap.get(seatNum);
                return (
                  <div key={offset} className="relative">
                    <button
                      className={`w-10 h-10 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${seatColors[status]} ${readonly && status === 'available' ? 'cursor-default' : ''}`}
                      onClick={() => !readonly && onSeatClick?.(seatNum, passenger)}
                      onMouseEnter={() => setHoveredSeat(seatNum)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      disabled={readonly && status === 'available'}
                    >
                      {seatNum}
                    </button>
                    {hoveredSeat === seatNum && passenger && (
                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white whitespace-nowrap shadow-lg">
                        {passenger.passenger_name}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Aisle */}
              <div className="w-5 flex items-center justify-center">
                <div className="w-px h-8 bg-slate-700/50" />
              </div>
              {/* Right pair */}
              {[2, 3].map(offset => {
                const seatNum = seatStart + offset;
                if (offset >= seatsInRow) return <div key={offset} className="w-10 h-10" />;
                const status = getSeatStatus(seatNum);
                const passenger = seatMap.get(seatNum);
                return (
                  <div key={offset} className="relative">
                    <button
                      className={`w-10 h-10 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${seatColors[status]} ${readonly && status === 'available' ? 'cursor-default' : ''}`}
                      onClick={() => !readonly && onSeatClick?.(seatNum, passenger)}
                      onMouseEnter={() => setHoveredSeat(seatNum)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      disabled={readonly && status === 'available'}
                    >
                      {seatNum}
                    </button>
                    {hoveredSeat === seatNum && passenger && (
                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white whitespace-nowrap shadow-lg">
                        {passenger.passenger_name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-4 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40" /> متاح</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/40" /> مشغول</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" /> محدد</span>
      </div>

      {/* Summary */}
      <div className="mt-3 text-center text-xs text-slate-500">
        {seatMap.size} / {capacity} مقعد مشغول
      </div>
    </div>
  );
}
