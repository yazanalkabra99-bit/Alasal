export type Role = 'employee' | 'visa_admin' | 'visa_admin_2' | 'sub_visa_admin' | 'passport_admin' | 'airline_admin' | 'accounting' | 'admin';

export type RoleInfo = {
  id: Role;
  name: string;
  description: string;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  roles: Role[];
  is_active: 0 | 1;
  phone_number: string | null;
  created_at: string;
};

export type EmployeeSummaryRow = {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  is_active: 0 | 1;
  visa_count: number;
  visa_sales_usd: number;
  visa_profit_usd: number;
  passport_count: number;
  passport_sales_usd: number;
  passport_profit_usd: number;
  ticket_count: number;
  ticket_sales_usd: number;
  ticket_profit_usd: number;
  ext_ticket_count: number;
  ext_ticket_sales_usd: number;
  ext_ticket_profit_usd: number;
  service_sales_count: number;
  service_sales_usd: number;
  service_sales_profit_usd: number;
  payments_count: number;
  payments_usd: number;
  movements_count: number;
  movements_in_usd: number;
  movements_out_usd: number;
  nettings_count: number;
};

export type EmployeeActivityEvent = {
  happened_at: string;
  event_type: string;
  ref_id: number;
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  currency_code?: string | null;
  amount_usd?: number | null;
  receipt_no?: string | null;
};

export type VisaStatus = 'submitted' | 'processing' | 'issued' | 'delivered' | 'cancelled' | 'rejected' | 'overdue';

export type VisaRequestRow = {
  visa_request_id: number;
  visa_status: VisaStatus;
  display_status?: VisaStatus;
  days_left?: number | null;
  is_due_soon?: 0 | 1;
  is_overdue?: 0 | 1;
  is_archived?: 0 | 1;
  alert_days?: number;
  archived_at?: string | null;
  applicant_name: string;
  applicant_phone: string;
  submission_date: string;
  processing_days: number;
  expected_delivery_date: string;
  visa_type_name: string;
  transaction_id: number;
  total_amount: number;
  currency_code: string;
  total_usd: number;
  billing_party_name: string;
  billing_party_type: 'customer' | 'office';
  for_whom?: string | null;
  created_by_name?: string | null;
};

export type VisaDetails = {
  visa: any;
  payments: any[];
  vendorPayments: any[];
  costItems?: any[];
  attachments?: any[];
  history?: any[];
  summary: {
    paid_usd: number;
    refunded_usd: number;
    remaining_usd: number;
  };
};

export type PassportStatus =
  | 'submitted'
  | 'processing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'overdue';

export type PassportRequestRow = {
  passport_request_id: number;
  passport_status: PassportStatus;
  display_status?: PassportStatus;
  days_left?: number | null;
  is_due_soon?: 0 | 1;
  is_overdue?: 0 | 1;
  is_archived?: 0 | 1;
  /** days before expected delivery to be considered "due soon" */
  alert_days?: number;
  archived_at?: string | null;
  applicant_name: string;
  applicant_phone: string;
  submission_date: string;
  processing_days: number;
  expected_delivery_date: string;
  passport_type_name: string;
  passport_scope: 'internal' | 'external';
  passport_speed: 'normal' | 'urgent' | 'instant';
  transaction_id: number;
  total_amount: number;
  currency_code: string;
  total_usd: number;
  billing_party_name: string;
  billing_party_type: 'customer' | 'office';
  for_whom?: string | null;
  created_by_name?: string | null;
};

export type PassportDetails = {
  passport: any;
  payments: any[];
  customerRefunds: any[];
  vendorPayments: any[];
  attachments?: any[];
  history?: any[];
  summary: {
    paid_usd: number;
    refunded_usd: number;
    remaining_usd: number;
  };
};

export type PassportAttachment = {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  label?: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
};

export type PassportType = {
  id: number;
  name: string;
  scope: 'internal' | 'external';
  speed: 'normal' | 'urgent' | 'instant';
  default_days: number;
  default_price: number | null;
  default_currency_code: string;
  is_active: 0 | 1;
  created_at: string;
};

export type VisaTypeField = {
  id: number;
  visa_type_id: number;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  options?: string[] | null;
  is_required: 0 | 1;
  visible_to_employee: 0 | 1;
  is_active: 0 | 1;
  sort_order: number;
};


export type PassportTypeField = {
  id: number;
  passport_type_id: number;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  options?: string[] | null;
  is_required: 0 | 1;
  visible_to_employee: 0 | 1;
  is_active: 0 | 1;
  sort_order: number;
};

export type VisaAttachment = {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  label?: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
};

export type VisaType = { id: number; name: string; category: string; country: string; default_days: number; default_currency_code: string; default_price: number; alert_days: number; is_active: 0 | 1 };

export type Account = { id: number; name: string; type: 'cash'|'bank'|'wallet'; currency_code: string; is_active: 0|1 };

export type Party = { id: number; type: 'office'|'customer'; name: string; phone?: string|null; status: 'active'|'inactive' };

export type VisaProfitRow = {
  visa_request_id: number;
  visa_status: VisaStatus;
  source_type: 'unassigned' | 'external' | 'internal' | string;
  applicant_name: string;
  applicant_phone: string;
  sold_at: string;
  submission_date: string;
  expected_delivery_date: string;
  visa_type_name: string;
  billing_party: { id: number; name: string; type: Party['type'] };
  employee: { id: number; name: string };
  transaction: { id: number; total_amount: number; currency_code: string; total_usd: number };
  cost: {
    vendor_party_id: number | null;
    vendor_name: string | null;
    cost_amount: number | null;
    cost_currency_code: string | null;
    cost_usd: number | null;
    items_cost_usd?: number | null;
    has_cost_items?: boolean;
  };
  fees: { fees_out_usd: number; fees_in_usd: number };
  profit: { gross_profit_usd: number | null; net_profit_usd: number | null };
};


export type AirlineCompany = {
  id: number;
  name: string;
  currency_code: string;

  // Fare discount configuration
  has_fare_discount: 0 | 1;
  fare_discount_type: 'percent' | 'fixed' | 'per_ticket_choice';
  fare_discount_value: number;

  // New modes:
  // - none: no fare
  // - next_deposit: fare accrual gets added automatically on next deposit
  // - manual: fare accrual gets added by clicking a button (accounting)
  // - per_ticket_choice: user chooses fixed amount OR percent per ticket (type 4)
  fare_discount_settlement: 'none' | 'next_deposit' | 'manual' | 'per_ticket_choice';

  // Kept for backward compatibility (backend forces it to 'deduct_buy')
  balance_mode?: 'deduct_buy';

  // Company FX (1 USD = buy_fx_rate_to_usd * company currency)
  buy_fx_rate_to_usd: number;

  // Optional extra info for accounting views
  balance_amount?: number;
  open_fare_accrual_total?: number;

  is_active: 0 | 1;
  created_at: string;
};

export type AirlineFxRateRow = {
  id: number;
  airline_company_id: number;
  rate_to_usd: number;
  effective_at: string;
  created_by?: number | null;
  note?: string | null;
};

export type FlightTicketStatus = 'pending' | 'sold' | 'issued' | 'cancelled' | 'refunded' | 'void';

export type FlightTicketRow = {
  id: number;
  status: FlightTicketStatus;
  passenger_name: string;
  passenger_phone?: string | null;
  pnr?: string | null;
  flight_at?: string | null;
  billing_party_type: 'customer' | 'office';
  billing_party_name: string;
  billing_party_id?: number | null;
  transaction_id?: number | null;
  tx_total_usd?: number;
  tx_total_amount?: number;
  tx_currency_code?: string;
  tx_status?: string;
  paid_usd?: number;
  remaining_usd?: number;
  airline_company_id: number;
  airline_company_name: string;

  buy_amount: number;
  buy_currency_code: string;
  buy_usd: number;

  sell_amount: number;
  sell_currency_code: string;
  sell_usd: number;

  fare_discount_usd: number;
  profit_usd: number;

  is_archived: 0 | 1;
  created_by: number;
  created_by_name?: string | null;
  created_at: string;

  approved_by?: number | null;
  approved_at?: string | null;
  rejected_by?: number | null;
  rejected_at?: string | null;
  approval_note?: string | null;
};

export type FlightTicketDetails = FlightTicketRow & {
  fare_base_amount?: number | null;
  fare_discount_amount?: number;
  payments?: any[];
  summary?: {
    paid_usd: number;
    refunded_usd: number;
    remaining_usd: number;
  } | null;
  ticket_refunds?: any[];
};

// Employee requests to perform Refund/Void (routed to Ticket Manager)
export type FlightTicketActionType = 'refund' | 'void';
export type FlightTicketActionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type FlightTicketActionRequest = {
  id: number;
  ticket_id: number;
  action_type: FlightTicketActionType;
  reason?: string | null;
  note?: string | null;
  status: FlightTicketActionRequestStatus;
  requested_by: number;
  requested_by_name?: string | null;
  requested_at: string;
  processed_by?: number | null;
  processed_by_name?: string | null;
  processed_at?: string | null;
  processed_note?: string | null;
};

// ---- Leave Management Types ----
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveType = {
  id: number;
  name: string;
  max_days_per_year: number | null;
  max_hours_per_year: number | null;
  is_hourly: number;
  color: string;
  is_active: number;
  created_at: string;
};

export type LeaveRequest = {
  id: number;
  user_id: number;
  user_name: string;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_color: string;
  start_date: string;
  end_date: string;
  days_count: number;
  hours_count: number | null;
  reason: string | null;
  status: LeaveStatus;
  decided_by: number | null;
  decider_name: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type LeaveCalendarData = {
  month: string;
  days_in_month: number;
  employees: { id: number; name: string }[];
  leaves: {
    user_id: number;
    start_date: string;
    end_date: string;
    status: LeaveStatus;
    days_count: number;
    hours_count: number | null;
    leave_type_name: string;
    leave_type_color: string;
  }[];
  stats: {
    total_employees: number;
    pending_requests: number;
    approved_leave_days: number;
  };
};

export type CurrencyMeta = { code: string; name: string; symbol?: string | null };

export type CurrencyWithRate = {
  code: string;
  name: string;
  symbol?: string | null;
  is_active: 0 | 1;
  rate_to_usd: number | null;
  usd_to_currency: number | null;
  rate_effective_at: string | null;
};
