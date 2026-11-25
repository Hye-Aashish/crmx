export type PerformanceRange = 'today' | '7d' | '30d' | 'last_month' | 'all' | 'custom';

export interface PerformanceEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  status: string;
}

export interface PerformanceLead {
  id: string;
  lead_code: string;
  customer_name: string;
  phone: string;
  email?: string;
  lead_source: string;
  stage_name: string;
  stage_color?: string;
  priority: string;
  estimated_deal_value: number;
  is_converted: number;
  created_at: string;
  next_followup_at?: string;
  invoice_status?: string;
}

export interface EmployeePerformanceData {
  employee: PerformanceEmployee;
  employees: PerformanceEmployee[];
  stats: { totalCalls: number; totalLeads: number; convertedLeads: number; hotLeads: number; followUps: number; revenue: number; conversionRate: number };
  trend: Array<{ date: string; calls: number; leads: number }>;
  stages: Array<{ stage: string; count: number; color: string }>;
  leads: PerformanceLead[];
  comparison: Array<{ employee_id: string; total_leads: number; converted_leads: number }>;
  activities: Array<{ id: string; title: string; outcome?: string; lead_name?: string; lead_code?: string; created_at: string }>;
  followUpItems: Array<{ id: string; purpose: string; status: string; scheduled_at: string; lead_name?: string; customer_name?: string; notes?: string }>;
  orders: Array<{ id: string; order_code: string; customer_name: string; product_name: string; order_amount: number; payment_status: string; order_status: string; order_date: string }>;
}

export interface LeadFiltersState {
  search: string;
  stage: string;
  temperature: string;
  invoice: string;
  source: string;
}
