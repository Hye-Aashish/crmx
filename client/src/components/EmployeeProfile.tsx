import React from 'react';
import type { PerformanceEmployee } from '../types/employeePerformance.types';

export const EmployeeProfile: React.FC<{ employee: PerformanceEmployee }> = ({ employee }) => {
  const name = employee.name.replace(/\s*\([^)]*\)\s*$/, '');
  const role = employee.role === 'agent' ? (employee.name.includes('Senior') ? 'Senior Sales Agent' : 'Sales Agent') : employee.role === 'manager' ? 'Sales Manager' : employee.role;
  const fallback = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#e0f2fe"/><circle cx="48" cy="35" r="18" fill="#c98f69"/><path d="M29 35c0-18 10-26 21-26 13 0 22 11 20 27-5-5-9-11-11-17-7 8-17 13-30 16Z" fill="#263548"/><path d="M17 96c2-22 13-34 31-34s29 12 31 34" fill="#0f9f6e"/></svg>')}`;
  return <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 xl:w-[220px] xl:shrink-0"><img src={employee.avatar || fallback} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = fallback; }} alt="" className="h-[58px] w-[58px] shrink-0 rounded-full object-cover"/><div className="min-w-0"><h2 className="truncate text-[15px] font-extrabold text-slate-900">{name}</h2><p className="mt-0.5 truncate text-xs font-medium text-slate-700">{role}</p><span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">{(employee.status || 'Active').replace(/^./, ch => ch.toUpperCase())}</span></div></div>;
};
