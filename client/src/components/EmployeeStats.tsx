import React from 'react';
import { FileText, Flame, Layers3, Phone, UserRoundPlus, UsersRound } from 'lucide-react';
import type { EmployeePerformanceData, PerformanceLead } from '../types/employeePerformance.types';

export const EmployeeStats: React.FC<{ stats: EmployeePerformanceData['stats']; leads: PerformanceLead[] }> = ({ stats, leads }) => {
  const newLeads = leads.filter(lead => /new/i.test(lead.stage_name)).length;
  const invoiceSent = leads.filter(lead => /invoice/i.test(lead.stage_name) || /sent/i.test(lead.invoice_status || '')).length;
  const cards = [
    { label: 'Total Calls', value: stats.totalCalls, icon: Phone, color: 'text-emerald-700 bg-emerald-100' },
    { label: 'Total Leads', value: stats.totalLeads, icon: UsersRound, color: 'text-sky-700 bg-sky-100' },
    { label: 'New Leads', value: newLeads, icon: UserRoundPlus, color: 'text-cyan-700 bg-cyan-100' },
    { label: 'Invoice Sent', value: invoiceSent, icon: FileText, color: 'text-violet-700 bg-violet-100' },
    { label: 'Hot Leads', value: stats.hotLeads, icon: Flame, color: 'text-rose-700 bg-rose-100' },
    { label: 'Total Revenue', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.revenue), icon: Layers3, color: 'text-emerald-700 bg-emerald-100' }
  ];
  return <section className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">{cards.map(({ label, value, icon: Icon, color }) => <article key={label} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/80 bg-gradient-to-br from-slate-50 to-emerald-50/70 px-2.5 py-2.5"><span className={`shrink-0 rounded-lg p-2 ${color}`}><Icon size={20}/></span><div className="min-w-0"><div className="truncate text-[17px] font-extrabold text-slate-900">{value}</div><div className="truncate text-[10px] font-semibold text-slate-700">{label}</div></div></article>)}</section>;
};
