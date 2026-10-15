const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getHeaders() {
  const token = localStorage.getItem('crmx_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('crmx_token');
    localStorage.removeItem('crmx_user');
    window.location.href = '#/login';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: async (creds: { email: string; password: string }) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    return handleResponse(res);
  },
  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createUser: async (payload: any) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateUserRole: async (id: string, role: string) => {
    const res = await fetch(`${API_URL}/users/${id}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role })
    });
    return handleResponse(res);
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Roles & Permissions
  getRoles: async () => {
    const res = await fetch(`${API_URL}/roles`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getPermissions: async () => {
    const res = await fetch(`${API_URL}/permissions`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createRole: async (payload: { name: string; slug?: string; description?: string; color?: string; permissions?: string[] }) => {
    const res = await fetch(`${API_URL}/roles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateRole: async (id: string, payload: { name?: string; description?: string; color?: string }) => {
    const res = await fetch(`${API_URL}/roles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateRolePermissions: async (id: string, permissions: string[]) => {
    const res = await fetch(`${API_URL}/roles/${id}/permissions`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ permissions })
    });
    return handleResponse(res);
  },
  deleteRole: async (id: string) => {
    const res = await fetch(`${API_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Sources & Stages
  getSources: async () => {
    const res = await fetch(`${API_URL}/sources`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getFunnelStages: async () => {
    const res = await fetch(`${API_URL}/funnel/stages`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createFunnelStage: async (payload: { name: string; color?: string }) => {
    const res = await fetch(`${API_URL}/funnel/stages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateFunnelStage: async (id: string, payload: { name: string; color?: string; order_index?: number }) => {
    const res = await fetch(`${API_URL}/funnel/stages/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  deleteFunnelStage: async (id: string, fallback_stage_id?: string) => {
    const res = await fetch(`${API_URL}/funnel/stages/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ fallback_stage_id })
    });
    return handleResponse(res);
  },
  updateFunnelStages: async (stages: any[]) => {
    const res = await fetch(`${API_URL}/funnel/stages/reorder`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ stages })
    });
    return handleResponse(res);
  },

  // Leads
  getLeads: async (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/leads?${qs}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getLeadById: async (id: string) => {
    const res = await fetch(`${API_URL}/leads/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createLead: async (payload: any) => {
    const res = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateLead: async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/leads/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateLeadStage: async (id: string, stage_id: string, lost_reason?: string) => {
    const res = await fetch(`${API_URL}/leads/${id}/stage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ stage_id, lost_reason })
    });
    return handleResponse(res);
  },
  addLeadActivity: async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/leads/${id}/activity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  bulkAssignLeads: async (lead_ids: string[], agent_id: string) => {
    const res = await fetch(`${API_URL}/leads/bulk-assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lead_ids, agent_id })
    });
    return handleResponse(res);
  },
  bulkStatusUpdate: async (lead_ids: string[], stage_id: string) => {
    const res = await fetch(`${API_URL}/leads/bulk-status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lead_ids, stage_id })
    });
    return handleResponse(res);
  },
  convertLeadToCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/leads/${id}/convert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({})
    });
    return handleResponse(res);
  },

  // Customers
  getCustomers: async (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/customers?${qs}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getCustomerById: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createCustomer: async (payload: any) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateCustomer: async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Orders & Tracking
  getOrders: async (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/orders?${qs}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getOrderById: async (id: string) => {
    const res = await fetch(`${API_URL}/orders/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createOrder: async (payload: any) => {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateOrderLocation: async (id: string, payload: {
    current_location?: string;
    start_location?: string;
    end_location?: string;
    order_status?: string;
    remarks?: string;
    payment_status?: string;
  }) => {
    const res = await fetch(`${API_URL}/orders/${id}/location`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Follow-ups
  getFollowUps: async (params: Record<string, any> = {}) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const queryParams: Record<string, string> = { client_date: todayStr, ...params };
    const qs = new URLSearchParams(queryParams).toString();
    const res = await fetch(`${API_URL}/follow-ups?${qs}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createFollowUp: async (payload: { lead_id?: string; customer_id?: string; assigned_user_id?: string; scheduled_at: string; purpose: string; notes?: string }) => {
    const res = await fetch(`${API_URL}/follow-ups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  completeFollowUp: async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/follow-ups/${id}/complete`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  rescheduleFollowUp: async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/follow-ups/${id}/reschedule`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Global Search
  search: async (q: string) => {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Analytics
  getAnalytics: async (range: string = '30d') => {
    const res = await fetch(`${API_URL}/analytics/overview?range=${range}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Public Lead Forms
  getPublicForm: async (idOrSlug: string) => {
    const res = await fetch(`${API_URL}/public/forms/${encodeURIComponent(idOrSlug)}`);
    return handleResponse(res);
  },
  submitPublicForm: async (idOrSlug: string, answers: Record<string, any>) => {
    const res = await fetch(`${API_URL}/public/forms/${encodeURIComponent(idOrSlug)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    return handleResponse(res);
  },

  // Web Forms Management (Admin & Manager)
  getForms: async () => {
    const res = await fetch(`${API_URL}/forms`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getFormById: async (id: string) => {
    const res = await fetch(`${API_URL}/forms/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createForm: async (data: any) => {
    const res = await fetch(`${API_URL}/forms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  updateForm: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/forms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  deleteForm: async (id: string) => {
    const res = await fetch(`${API_URL}/forms/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  toggleFormStatus: async (id: string) => {
    const res = await fetch(`${API_URL}/forms/${id}/toggle`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
