export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  phone?: string;
  avatar?: string;
  status: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  is_system: number;
  permissions: string[];
  user_count?: number;
  created_at?: string;
}

export interface PermissionDef {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface FunnelStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_active: number;
  lead_count?: number;
  total_deal_value?: number;
}

export interface LeadSource {
  id: string;
  name: string;
  icon?: string;
  is_active: number;
}

export interface Lead {
  id: string;
  lead_code: string;
  customer_name: string;
  phone: string;
  phone_normalized: string;
  alternate_phone?: string;
  email?: string;
  company_name?: string;
  city?: string;
  lead_source: string;
  campaign_name?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  stage_id: string;
  stage_name?: string;
  stage_color?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  conversion_likelihood: 'Low' | 'Medium' | 'High';
  estimated_deal_value: number;
  is_converted: number;
  converted_customer_id?: string;
  converted_at?: string;
  converted_by?: string;
  lost_reason?: string;
  next_followup_at?: string;
  last_contacted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'status_change' | 'agent_assignment' | 'stage_change' | 'system';
  title: string;
  notes?: string;
  outcome?: string;
  user_id?: string;
  user_name?: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id?: string;
  customer_id?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_code?: string;
  assigned_user_id: string;
  assigned_user_name?: string;
  scheduled_at: string;
  purpose: string;
  notes?: string;
  status: 'pending' | 'completed' | 'rescheduled' | 'cancelled';
  completed_at?: string;
  outcome?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  phone_normalized: string;
  alternate_phone?: string;
  email?: string;
  company?: string;
  city?: string;
  address?: string;
  linked_lead_id?: string;
  original_lead_code?: string;
  original_lead_source?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  total_orders: number;
  total_order_value: number;
  latest_order_date?: string;
  latest_order_status?: string;
  notes?: string;
  created_at: string;
  linked_orders?: Order[];
}

export interface Order {
  id: string;
  order_code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_normalized: string;
  customer_code?: string;
  customer_email?: string;
  customer_address?: string;
  order_date: string;
  product_name: string;
  quantity: number;
  order_amount: number;
  payment_status: 'Pending' | 'Partial' | 'Paid' | 'Refunded';
  order_status: string;
  start_location: string;
  current_location: string;
  end_location: string;
  last_location_update: string;
  expected_delivery_date?: string;
  delivery_notes?: string;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  created_at: string;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  order_status: string;
  location: string;
  remarks?: string;
  is_manual: number;
  courier_reference?: string;
  updated_by_id?: string;
  updated_by_name?: string;
  recorded_at: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
  options?: string[];
  mapToLeadField?: 'customer_name' | 'phone' | 'email' | 'company_name' | 'city' | 'estimated_deal_value' | 'notes';
  helpText?: string;
}

export interface WebForm {
  id: string;
  title: string;
  slug: string;
  description?: string;
  source_name: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  stage_id?: string;
  stage_name?: string;
  fields: FormField[];
  theme_color: string;
  button_text: string;
  success_message: string;
  redirect_url?: string;
  submission_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

