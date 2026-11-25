import React from 'react';
import type { EmployeePerformanceData } from '../types/employeePerformance.types';

type Trend = EmployeePerformanceData['trend'];

const TrendGraph: React.FC<{ trend: Trend; label: string }> = ({ trend, label }) => {
  const max = Math.max(1, ...trend.flatMap(item => [item.calls, item.leads]));
  const ceiling = Math.ceil(max / 4) * 4 || 4;
  const x = (index: number) => trend.length <= 1 ? 160 : 36 + index * (248 / (trend.length - 1));
  const y = (value: number) => 112 - value / ceiling * 88;
  const line = (key: 'calls' | 'leads') => trend.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');
  const ticks = trend.length > 1 ? [...new Set([0, Math.floor((trend.length - 1) / 2), trend.length - 1])] : trend.length ? [0] : [];
  return <div><svg viewBox="0 0 300 140" className="h-44 w-full" role="img" aria-label={label}>
    {[0, 1, 2, 3, 4].map(tick => { const value = Math.round(ceiling * tick / 4); const yy = y(value); return <g key={tick}><line x1="36" y1={yy} x2="286" y2={yy} stroke={tick === 0 ? '#cbd5e1' : '#e2e8f0'} strokeDasharray={tick === 0 ? undefined : '3 4'}/><text x="28" y={yy + 3} textAnchor="end" className="fill-slate-400 text-[8px]">{value}</text></g>; })}
    {trend.length > 1 && <><polyline points={line('calls')} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/><polyline points={line('leads')} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></>}
    {trend.map((item, index) => <g key={item.date}><circle cx={x(index)} cy={y(item.calls)} r="3" fill="white" stroke="#059669" strokeWidth="1.8"><title>{`${item.date}: ${item.calls} calls`}</title></circle><circle cx={x(index)} cy={y(item.leads)} r="3" fill="white" stroke="#14b8a6" strokeWidth="1.8"><title>{`${item.date}: ${item.leads} new leads`}</title></circle></g>)}
    {ticks.map(index => <text key={trend[index].date} x={x(index)} y="132" textAnchor={index === 0 ? 'start' : index === trend.length - 1 ? 'end' : 'middle'} className="fill-slate-400 text-[8px]">{trend[index].date.slice(5)}</text>)}
  </svg>{!trend.length && <p className="-mt-4 text-center text-xs text-slate-400">No call or lead activity in this period.</p>}</div>;
};

export const EmployeeCharts: React.FC<{ trend: Trend; stages: EmployeePerformanceData['stages'] }> = ({ trend, stages }) => {
  const total = stages.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  const colors = ['#059669', '#2dd4bf', '#38bdf8', '#c084fc', '#fb7185', '#f59e0b'];
  return <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">Selected employee trend</h3><p className="mt-1 text-xs text-slate-500">Daily calls and newly assigned leads</p></div><div className="flex gap-3 text-xs font-semibold"><span className="text-emerald-700">● Calls</span><span className="text-teal-600">● New leads</span></div></div><TrendGraph trend={trend} label="Selected employee daily calls and leads"/></article>
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold text-slate-900">Lead stage breakdown</h3><div className="mt-3 flex items-center justify-center gap-4"><svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={`${total} leads distributed across stages`}><circle cx="60" cy="60" r="43" fill="none" stroke="#f1f5f9" strokeWidth="18"/>{stages.map((stage, i) => { const length = total ? stage.count / total * 270 : 0; const circle = <circle key={stage.stage} cx="60" cy="60" r="43" fill="none" stroke={stage.color || colors[i % colors.length]} strokeWidth="18" strokeDasharray={`${length} ${270 - length}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)"/>; offset += length; return circle; })}<text x="60" y="57" textAnchor="middle" className="fill-slate-900 text-xl font-bold">{total}</text><text x="60" y="73" textAnchor="middle" className="fill-slate-500 text-[8px]">Total Leads</text></svg><div className="min-w-0 flex-1 space-y-2">{stages.map((stage, i) => <div key={stage.stage} className="flex justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 truncate text-slate-700"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color || colors[i % colors.length] }}/><span className="truncate">{stage.stage}</span></span><b className="shrink-0 text-slate-800">{stage.count}</b></div>)}{!stages.length && <p className="text-xs text-slate-400">No leads in this period.</p>}</div></div></article>
  </section>;
};
