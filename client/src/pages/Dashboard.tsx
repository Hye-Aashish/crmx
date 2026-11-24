import React, { useEffect, useRef, useState } from 'react';
import {
  Users2,
  UserCheck,
  PackageCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  PhoneCall,
  DollarSign,
  Activity,
  Layers,
  MapPin,
  Truck,
  ChevronDown,
  FileText,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';

interface DashboardProps {
  onNavigate: (tab: string, filter?: string) => void;
}

type AnalyticsDateBounds = { from_date?: string; to_date?: string };

function getPresetBounds(preset: string): AnalyticsDateBounds {
  if (preset === 'all') return {};
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (preset === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (preset === '7d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  else if (preset === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
  } else start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from_date: start.toISOString(), to_date: end.toISOString() };
}

function getCustomBounds(from: string, to: string): AnalyticsDateBounds {
  if (!from || !to || to < from) throw new Error('A valid custom date range is required.');
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return {
    from_date: new Date(fy, fm - 1, fd).toISOString(),
    to_date: new Date(ty, tm - 1, td + 1).toISOString()
  };
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [range, setRange] = useState<string>('this_month');
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [dateError, setDateError] = useState('');
  const [requestError, setRequestError] = useState('');
  const customPanelRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      setRequestError('');
      const bounds = range === 'custom' && appliedCustomRange
        ? getCustomBounds(appliedCustomRange.from, appliedCustomRange.to)
        : getPresetBounds(range);
      const res = await api.getAnalytics(bounds);
      setData(res);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setRequestError('Dashboard data could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, appliedCustomRange]);

  useEffect(() => {
    if (!customOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!customPanelRef.current?.contains(event.target as Node)) setCustomOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCustomOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [customOpen]);

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      setDateError('Choose both a start and end date.');
      return;
    }
    if (customTo < customFrom) {
      setDateError('End date must be on or after the start date.');
      return;
    }
    setDateError('');
    setAppliedCustomRange({ from: customFrom, to: customTo });
    setRange('custom');
    setCustomOpen(false);
  };

  const clearCustomRange = () => {
    setCustomFrom('');
    setCustomTo('');
    setAppliedCustomRange(null);
    setDateError('');
    setRange('all');
    setCustomOpen(false);
  };

  const metrics: DashboardMetrics = data?.metrics || {
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    totalOrders: 0,
    totalRevenue: 0,
    conversionRate: '0.0'
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            CRM & Order Fulfillment Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time pipeline metrics, conversion performance & 3-location order tracking.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs self-start xl:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === item.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="relative ml-1" ref={customPanelRef}>
            <button
              type="button"
              onClick={() => setCustomOpen((open) => !open)}
              aria-expanded={customOpen}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${range === 'custom' || customOpen ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-800'}`}
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              {range === 'custom' && appliedCustomRange ? `${formatShortDate(appliedCustomRange.from)} Ã¢â‚¬â€œ ${formatShortDate(appliedCustomRange.to)}` : 'Custom'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {customOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Custom Date Range</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-700">From Date
                    <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => { setCustomFrom(event.target.value); setDateError(''); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">To Date
                    <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => { setCustomTo(event.target.value); setDateError(''); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </label>
                </div>
                {dateError && <p role="alert" className="mt-2 text-xs text-red-600">{dateError}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={applyCustomRange} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Apply</button>
                  <button type="button" onClick={clearCustomRange} className="rounded-lg border border-emerald-500 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {requestError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{requestError}</span><button onClick={fetchAnalytics} className="font-bold underline">Retry</button></div>}

      {/* 4 Primary Analytics Cards (Green Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Leads */}
        <div
          onClick={() => onNavigate('leads')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.totalLeads}
            </span>
            <span className="text-xs text-emerald-700 font-semibold flex items-center">
              Active Pipeline
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>View all leads</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        </div>

        {/* 2. Active Leads */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.activeLeads}
            </span>
            <span className="text-xs text-emerald-800 font-semibold">
              In Stages
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>View Kanban Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-700"></div>
        </div>

        {/* 3. Converted Leads */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Converted Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.convertedLeads}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {metrics.conversionRate}% Conversion
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>View customers</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* 4. Total Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.totalOrders}
            </span>
            <span className="text-lg text-emerald-700 font-bold font-mono">
              ₹{(metrics.totalRevenue || 0).toLocaleString()} Rev
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>Track shipments</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-800"></div>
        </div>
      </div>

      {/* Follow-ups and funnel sections, stacked at full dashboard width */}
      <div className="space-y-3">
        <section className="w-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Follow-ups & Reminders
            </h2>
            <button onClick={() => onNavigate('followups')} className="shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-800">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Calls', metric: 'totalCalls', value: data?.followUpStats?.totalCalls, detail: 'Calls logged in this date range', icon: PhoneCall, tone: 'emerald', action: 'followups' },
              { label: 'New Leads', metric: 'newLeads', value: data?.followUpStats?.newLeads, detail: 'Leads created in this date range', icon: UserCheck, tone: 'sky', action: 'leads' },
              { label: 'Paid Orders', metric: 'paidOrders', value: data?.followUpStats?.paidOrders, detail: 'Orders marked paid in this date range', icon: FileText, tone: 'violet', action: 'orders' },
              { label: 'Hot Leads', metric: 'hotLeads', value: data?.followUpStats?.hotLeads, detail: 'Open leads with high or urgent priority', icon: Flame, tone: 'rose', action: 'leads' }
            ].map((stat) => {
              const Icon = stat.icon;
              const currentValue = Number(stat.value ?? 0);
              const previousValue = data?.followUpStats?.previous?.[stat.metric];
              const change = previousValue === undefined || previousValue === null
                ? null
                : previousValue === 0
                  ? currentValue === 0 ? 0 : 100
                  : Math.round(((currentValue - previousValue) / previousValue) * 100);
              const trendLabel = change === null ? '' : `${change > 0 ? '+' : ''}${change}%`;
              const palette = {
                emerald: { card: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white', icon: 'bg-emerald-100 text-emerald-700' },
                sky: { card: 'border-sky-100 bg-gradient-to-br from-sky-50 to-white', icon: 'bg-sky-100 text-sky-700' },
                violet: { card: 'border-violet-100 bg-gradient-to-br from-violet-50 to-white', icon: 'bg-violet-100 text-violet-700' },
                rose: { card: 'border-rose-100 bg-gradient-to-br from-rose-50 to-white', icon: 'bg-rose-100 text-rose-700' }
              }[stat.tone]!;
              return (
                <button key={stat.label} type="button" onClick={() => onNavigate(stat.action)} className={`group flex min-h-[104px] min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${palette.card}`}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">{stat.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[28px] font-extrabold leading-8 text-slate-950">{loading ? '...' : stat.value ?? 0}</span>
                      {!loading && data?.followUpStats?.hasComparison && change !== null && (
                        <span title="Compared with the previous period of equal length" className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${change > 0 ? 'bg-emerald-100 text-emerald-700' : change < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {change > 0 ? '↑' : change < 0 ? '↓' : '↔'} {trendLabel}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] font-medium text-slate-600">{stat.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {data?.overdueFollowUps?.length > 0 && (
            <div className="p-2.5 sm:px-3.5 mb-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-red-800">{data.overdueFollowUps.length} Overdue Follow-up(s)</h4>
                <p className="text-[11px] text-red-600">Needs immediate attention.</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {[...(data?.overdueFollowUps || []), ...(data?.upcomingFollowUps || [])].slice(0, 4).map((fup: any) => {
              const isOverdue = new Date(fup.scheduled_at) < new Date();
              return (
                <div key={fup.id} onClick={() => onNavigate('followups')} className="px-3 py-2 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/60 hover:bg-white transition-all cursor-pointer">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(155px,0.8fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{fup.lead_name || fup.customer_name || 'Follow-up'}</h3>
                      <p className="text-[11px] text-slate-600 truncate">{fup.purpose || 'Follow-up reminder'}</p>
                    </div>
                    <span className="text-[11px] text-slate-500">{new Date(fup.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[11px] text-slate-500 truncate">Agent: {fup.agent_name || 'Assigned'}</span>
                    <span className={`justify-self-start md:justify-self-end shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isOverdue ? 'Overdue' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              );
            })}
            {!loading && [...(data?.overdueFollowUps || []), ...(data?.upcomingFollowUps || [])].length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No follow-ups or reminders for this date range.</div>
            )}
          </div>

          <button onClick={() => onNavigate('followups')} className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
            Manage All Scheduled Tasks
          </button>
        </section>

        <section className="w-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Sales Funnel & Stage Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Current active leads and pipeline distribution.</p>
            </div>
            <button onClick={() => onNavigate('pipeline')} className="self-start text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
              Open Kanban <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {data?.funnelOverview?.map((stage: any) => {
              const count = stage.lead_count || 0;
              const maxLeads = Math.max(...(data.funnelOverview.map((s: any) => s.lead_count || 1)), 1);
              const percentage = Math.round((count / maxLeads) * 100);
              return (
                <div key={stage.id} className="grid grid-cols-1 sm:grid-cols-[minmax(170px,0.8fr)_minmax(120px,2fr)_auto_auto] items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                      <span className="truncate">{stage.name}</span>
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500 bg-emerald-600" style={{ width: `${Math.max(percentage, 4)}%` }}></div>
                    </div>
                    <span className="text-slate-500 font-medium font-mono sm:text-right">â‚¹{(stage.deal_value || 0).toLocaleString()}</span>
                    <span className="justify-self-start sm:justify-self-end bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono text-[11px] whitespace-nowrap">{count} leads</span>
                </div>
              );
            })}
            {!loading && data?.funnelOverview?.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No funnel stages available.</div>
            )}
          </div>
        </section>
      </div>
      {/* Lead Sources & Agent Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Lead Source Channels
          </h2>
          <p className="text-xs text-slate-500 mb-4">Total inquiries and conversions by channel.</p>

          <div className="divide-y divide-slate-100">
            {data?.sourcePerformance?.map((src: any) => (
              <div key={src.lead_source} className="py-2.5 flex items-center justify-between text-xs">
                <div className="font-semibold text-slate-800">{src.lead_source}</div>
                <div className="flex items-center gap-4 text-slate-600">
                  <span>{src.total} leads</span>
                  <span className="text-emerald-700 font-bold">{src.converted_count} converted</span>
                  <span className="font-mono text-slate-700">â‚¹{(src.total_deal_value || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Performance Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-emerald-600" />
            Agent Performance
          </h2>
          <p className="text-xs text-slate-500 mb-4">Total lead assignments and successful conversions.</p>

          <div className="space-y-3">
            {data?.agentPerformance?.map((agt: any) => (
              <div
                key={agt.agent_name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={agt.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agt.agent_name}`}
                    alt="Agent"
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{agt.agent_name}</div>
                    <div className="text-[11px] text-slate-500">{agt.total_leads} leads assigned</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700">{agt.converted_leads} converted</div>
                  <div className="text-[11px] font-mono text-slate-500">â‚¹{(agt.total_deal_value || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & 3-Location Tracking Preview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Recent Orders & 3-Location Checkpoint Tracking
            </h2>
            <p className="text-xs text-slate-500">Track shipments across Start, Current Checkpoint, and End locations.</p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            View All Orders <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-2.5 px-3">Order Code</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Product / Service</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Route Journey (Start Ã¢Å¾â€ Current Ã¢Å¾â€ End)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {data?.recentOrders?.map((ord: any) => (
                <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-emerald-800 bg-emerald-50/70 rounded">{ord.order_code}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{ord.customer_phone}</div>
                  </td>
                  <td className="py-3 px-3 truncate max-w-[180px]">{ord.product_name}</td>
                  <td className="py-3 px-3 font-bold font-mono">â‚¹{Number(ord.order_amount).toLocaleString()}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ord.order_status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-[11px] max-w-[260px] truncate text-slate-600">
                      <span className="truncate">{ord.start_location || 'Origin'}</span>
                      <span className="text-emerald-700 font-bold">Ã¢Å¾â€ [{ord.current_location}] Ã¢Å¾â€</span>
                      <span className="truncate">{ord.end_location || 'Destination'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onNavigate('orders', ord.id)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
