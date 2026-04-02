export interface Trip {
  id: number;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  max_passengers: number;
  manager_id: number | null;
  manager_name?: string;
  status: 'planning' | 'open' | 'closed' | 'completed' | 'cancelled';
  notes: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // computed
  passenger_count?: number;
  bus_count?: number;
  revenue_usd?: number;
  cost_usd?: number;
}

export interface TripBus {
  id: number;
  trip_id: number;
  label: string;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
  plate_number: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  assigned_count?: number;
}

export interface TripPassenger {
  id: number;
  trip_id: number;
  transaction_id: number | null;
  party_id: number;
  party_type: 'customer' | 'office';
  party_name?: string;
  party_phone?: string;
  passenger_name: string;
  phone: string | null;
  passport_number: string | null;
  bus_id: number | null;
  bus_label?: string;
  seat_number: number | null;
  sell_amount: number;
  sell_currency_code: string;
  sell_rate_to_usd_snapshot: number;
  sell_usd: number;
  status: 'registered' | 'confirmed' | 'cancelled' | 'no_show';
  notes: string | null;
  registered_by: number;
  registered_by_name?: string;
  created_at: string;
  payment_summary?: {
    tx: any;
    paid_usd: number;
    refunded_usd: number;
    remaining_usd: number;
  } | null;
}

export interface TripCostItem {
  id: number;
  trip_id: number;
  category: string;
  label: string;
  vendor_party_id: number | null;
  vendor_name?: string;
  quantity: number;
  unit_amount: number;
  currency_code: string;
  rate_to_usd_snapshot: number;
  total_amount: number;
  total_usd: number;
  notes: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
}

export interface TripBudget {
  revenue_usd: number;
  cost_usd: number;
  profit_usd: number;
  total_revenue_usd?: number;
  total_cost_usd?: number;
  total_collected_usd: number;
  total_remaining_usd: number;
  passenger_count: number;
  costs_by_category: Record<string, { total_usd: number; item_count: number }>;
}

export interface TripAttachment {
  id: number;
  trip_id: number;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  label: string | null;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export const STATUS_LABELS: Record<string, string> = {
  planning: 'تخطيط',
  open: 'مفتوح',
  closed: 'مغلق',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  open: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const COST_CATEGORIES = [
  { value: 'visa', label: 'فيزا' },
  { value: 'bus', label: 'باص / نقل' },
  { value: 'hotel', label: 'فندق / إقامة' },
  { value: 'food', label: 'طعام' },
  { value: 'gift', label: 'هدايا' },
  { value: 'other', label: 'أخرى' },
];

export const COST_CATEGORY_LABELS: Record<string, string> = {
  visa: 'فيزا',
  bus: 'باص / نقل',
  hotel: 'فندق / إقامة',
  food: 'طعام',
  gift: 'هدايا',
  other: 'أخرى',
};
