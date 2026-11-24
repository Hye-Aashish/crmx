import React, { useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { LeadFilters } from './LeadFilters';
import { LeadDetailsModal } from './LeadDetailsModal';
import type { LeadFiltersState, PerformanceLead } from '../types/employeePerformance.types';

export const EmployeeLeadTable: React.FC<{ leads: PerformanceLead[]; employeeName: string }> = ({ leads, employeeName }) => {
  const [filters, setFilters] = useState<LeadFiltersState>({ search: '', stage: 'all', temperature: 'all', invoice: 'all', source: 'all' });
  const [selected, setSelected] = useState<PerformanceLead | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filtered = useMemo(() => leads.filter(lead => {
    const query = filters.search.trim().toLowerCase();
    return (!query || [lead.customer_name, lead.phone, lead.email, lead.lead_code].some(value => value?.toLowerCase().includes(query))) &&
      (filters.stage === 'all' || lead.stage_name === filters.stage) &&
      (filters.temperature === 'all' || lead.priority === filters.temperature) &&
      (filters.invoice === 'all' || (lead.invoice_status || 'Not issued') === filters.invoice) &&
      (filters.source === 'all' || lead.lead_source === filters.source);
  }), [leads, filters]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const exportCsv = () => {
    const rows = [['Lead ID', 'Customer', 'Phone', 'Email', 'Source', 'Stage', 'Priority', 'Value', 'Invoice'], ...filtered.map(lead => [lead.lead_code, lead.customer_name, lead.phone, lead.email || '', lead.lead_source, lead.stage_name, lead.priority, String(lead.estimated_deal_value || 0), lead.invoice_status || 'Not issued'])];
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `employee-leads-${employeeName.replaceAll(' ', '-').toLowerCase()}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 className="font-extrabold text-slate-900">Lead details · {employeeName}</h3><p className="mt-1 text-xs text-slate-500">Showing {filtered.length} leads assigned to this employee.</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><Download size={14}/>Export CSV</button></div><div className="p-4"><LeadFilters filters={filters} onChange={value => { setFilters(value); setPage(1); }} leads={leads}/></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{['#', 'Lead ID', 'Customer', 'Contact', 'Lead Source', 'Status / Stage', 'Priority', 'Lead value', 'Invoice status', 'Follow-up', ''].map(column => <th key={column} className="px-3 py-3">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((lead, index) => <tr key={lead.id} className="hover:bg-slate-50"><td className="px-3 py-3">{(page - 1) * pageSize + index + 1}</td><td className="px-3 py-3 font-mono font-bold text-emerald-800">{lead.lead_code}</td><td className="px-3 py-3 font-bold text-slate-900">{lead.customer_name}</td><td className="px-3 py-3">{lead.phone}</td><td className="px-3 py-3">{lead.lead_source}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">{lead.stage_name}</span></td><td className="px-3 py-3">{lead.priority}</td><td className="px-3 py-3 font-semibold">₹{Number(lead.estimated_deal_value || 0).toLocaleString()}</td><td className="px-3 py-3">{lead.invoice_status || 'Not issued'}</td><td className="px-3 py-3">{lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleString() : '—'}</td><td className="px-3 py-3"><button title="View lead" onClick={() => setSelected(lead)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><Eye size={15}/></button></td></tr>)}{!visible.length && <tr><td colSpan={11} className="px-3 py-10 text-center text-slate-400">No matching leads.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div><LeadDetailsModal lead={selected} onClose={() => setSelected(null)}/></section>;
};
