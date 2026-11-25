import type { EmployeePerformanceData, PerformanceRange } from '../types/employeePerformance.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function getEmployeePerformance(employeeId: string, range: PerformanceRange, from?: string, to?: string): Promise<EmployeePerformanceData> {
  const token = localStorage.getItem('crmx_token');
  const params = new URLSearchParams({ employee_id: employeeId, range });
  if (from) params.set('from_date', from);
  if (to) params.set('to_date', to);
  const response = await fetch(`${API_URL}/employee-performance?${params}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const result = await response.json();
  if (response.status === 401) {
    localStorage.removeItem('crmx_token');
    localStorage.removeItem('crmx_user');
    window.location.href = '#/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) throw new Error(result.error || 'Could not load employee performance.');
  return result as EmployeePerformanceData;
}
