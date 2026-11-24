import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, ChevronDown, FileText, House, Package, Phone, UserCheck, UsersRound } from 'lucide-react';
import { EmployeeSearch } from '../components/EmployeeSearch';
import { EmployeeProfile } from '../components/EmployeeProfile';
import { EmployeeStats } from '../components/EmployeeStats';
import { EmployeeCharts } from '../components/EmployeeCharts';
import { EmployeeLeadTable } from '../components/EmployeeLeadTable';
import { getEmployeePerformance } from '../services/employeePerformanceApi';
import type { EmployeePerformanceData, PerformanceRange } from '../types/employeePerformance.types';

const ranges: Array<{ id: PerformanceRange; label: string }> = [
  { id: 'today', label: 'Today' }, { id: '7d', label: 'Last 7 Days' }, { id: '30d', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' }, { id: 'all', label: 'All Time' }
];
const tabs = [
  { id: 'overview', label: 'Overview', icon: House }, { id: 'leads', label: 'Leads', icon: UsersRound },
  { id: 'calls', label: 'Calls', icon: Phone }, { id: 'followups', label: 'Follow-ups', icon: CalendarCheck },
  { id: 'invoices', label: 'Invoices', icon: FileText }, { id: 'orders', label: 'Orders', icon: Package }
] as const;
type TabId = typeof tabs[number]['id'];

const RecordPanel: React.FC<{ title: string; description: string; headers: string[]; rows: string[][] }> = ({ title, description, headers, rows }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{headers.map(header => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className={`px-4 py-3 ${cellIndex === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{cell || '—'}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-slate-400">No records for this employee in the selected date range.</td></tr>}</tbody></table></div>
  </section>
);

export const EmployeePerformance: React.FC = () => {
  const [data, setData] = useState<EmployeePerformanceData | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [range, setRange] = useState<PerformanceRange>('30d');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getEmployeePerformance(employeeId, range, range === 'custom' ? customFrom : undefined, range === 'custom' ? customTo : undefined)
      .then(result => { if (alive) setData(result); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load employee performance.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [employeeId, range, customFrom, customTo, refresh]);

  const employees = useMemo(() => (data?.employees || []).filter(employee =>
    (role === 'all' || employee.role === role) &&
    (status === 'all' || (status === 'active' ? employee.status?.toLowerCase() !== 'inactive' : employee.status?.toLowerCase() === 'inactive'))
  ), [data, role, status]);
  const selected = employeeId && data?.employee?.id === employeeId && employees.some(employee => employee.id === employeeId) ? data.employee : null;
  const money = (amount: number) => `₹${Number(amount || 0).toLocaleString()}`;
  const callRows = (data?.activities || []).map(item => [item.lead_code || '—', item.lead_name || '—', item.title, item.outcome || '—', new Date(item.created_at).toLocaleString()]);
  const followUpRows = (data?.followUpItems || []).map(item => [item.lead_name || item.customer_name || '—', item.purpose, item.status, item.notes || '—', new Date(item.scheduled_at).toLocaleString()]);
  const invoiceRows = (data?.orders || []).map(item => [item.order_code, item.customer_name, item.payment_status, money(item.order_amount), new Date(item.order_date).toLocaleDateString()]);
  const orderRows = (data?.orders || []).map(item => [item.order_code, item.customer_name, item.product_name, money(item.order_amount), item.order_status, new Date(item.order_date).toLocaleDateString()]);

  const resetFilters = () => { setRole('all'); setStatus('all'); setRange('30d'); setCustomFrom(''); setCustomTo(''); setEmployeeId(''); setRefresh(value => value + 1); };
  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const employee = data?.employees.find(item => item.id === id);
    if (employee) {
      setRole(employee.role);
      setStatus(employee.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active');
    }
  };
  const renderTabContent = () => {
    if (!data || !selected) return null;
    switch (activeTab) {
      case 'overview': return <><EmployeeCharts trend={data.trend} stages={data.stages}/><EmployeeLeadTable leads={data.leads} employeeName={selected.name}/></>;
      case 'leads': return <EmployeeLeadTable leads={data.leads} employeeName={selected.name}/>;
      case 'calls': return <RecordPanel title={`Calls · ${selected.name}`} description="Call activity recorded in the CRM for this employee." headers={['Lead ID', 'Customer', 'Activity', 'Outcome', 'Date']} rows={callRows}/>;
      case 'followups': return <RecordPanel title={`Follow-ups · ${selected.name}`} description="Follow-up tasks assigned to this employee." headers={['Customer', 'Purpose', 'Status', 'Notes', 'Scheduled date']} rows={followUpRows}/>;
      case 'invoices': return <RecordPanel title={`Invoice and payment status · ${selected.name}`} description="Payment status recorded on this employee’s customer orders." headers={['Order ID', 'Customer', 'Payment status', 'Amount', 'Order date']} rows={invoiceRows}/>;
      case 'orders': return <RecordPanel title={`Orders · ${selected.name}`} description="Orders belonging to customers assigned to this employee." headers={['Order ID', 'Customer', 'Product', 'Amount', 'Status', 'Order date']} rows={orderRows}/>;
    }
  };

  return <div className="min-h-full bg-slate-50 p-4"><div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"><UserCheck className="h-6 w-6 text-emerald-600"/>Employee Performance</h1><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Track employee-wise performance, calls, leads, follow-ups, invoices and revenue.</p></div>
      <div className="relative flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">{ranges.map(item => <button key={item.id} onClick={() => { setRange(item.id); setCustomOpen(false); }} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${range === item.id ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{item.label}</button>)}<button type="button" aria-expanded={customOpen} onClick={() => setCustomOpen(open => !open)} className={`ml-1 flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${range === 'custom' || customOpen ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-800'}`}><CalendarDays size={16} className="text-emerald-700"/>Custom<ChevronDown size={14} className={`transition-transform ${customOpen ? 'rotate-180' : ''}`}/></button>{customOpen && <div className="absolute right-0 top-full z-20 mt-2 flex min-w-[320px] flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><label className="flex-1 text-xs font-semibold text-slate-700">From Date<input aria-label="Custom date range start" type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setRange('custom'); }} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-700"/></label><label className="flex-1 text-xs font-semibold text-slate-700">To Date<input aria-label="Custom date range end" type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setRange('custom'); }} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-700"/></label></div>}</div>
    </header>
    <EmployeeSearch employees={employees} employeeId={employeeId} onEmployeeChange={handleEmployeeChange} role={role} onRoleChange={value => { setRole(value); const current = data?.employees.find(employee => employee.id === employeeId); if (current && !((value === 'all' || current.role === value) && (status === 'all' || (status === 'active' ? current.status?.toLowerCase() !== 'inactive' : current.status?.toLowerCase() === 'inactive')))) setEmployeeId(''); }} status={status} onStatusChange={value => { setStatus(value); const current = data?.employees.find(employee => employee.id === employeeId); if (current && !((role === 'all' || current.role === role) && (value === 'all' || (value === 'active' ? current.status?.toLowerCase() !== 'inactive' : current.status?.toLowerCase() === 'inactive')))) setEmployeeId(''); }} onApply={() => setRefresh(value => value + 1)} onReset={resetFilters}/>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
    {loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading employee data…</div>}
    {!loading && !error && !selected && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{!data?.employees.length ? 'No employees available for performance reporting.' : employeeId ? 'No employees match the selected role and status.' : 'Select an employee to view performance data.'}</div>}
    {!loading && !error && data && selected && <><section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm xl:flex-nowrap"><EmployeeProfile employee={selected}/><EmployeeStats stats={data.stats} leads={data.leads}/></section><nav aria-label="Employee performance sections" className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 shadow-sm">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${activeTab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}><Icon size={15}/>{label}{id === 'leads' ? ` (${data.stats.totalLeads})` : ''}</button>)}</nav>{renderTabContent()}</>}
  </div></div>;
};
