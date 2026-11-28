import React, { useEffect, useState } from 'react';
import {
  Users2,
  PackageCheck,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronRight,
  Layers,
  FileText,
  Wallet,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';

interface DashboardProps {
  onNavigate: (tab: string, filter?: string) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [range, setRange] = useState<string>('30d');
  const [customFrom, setCustomFrom] = useState<string>(daysAgoISO(30));
  const [customTo, setCustomTo] = useState<string>(todayISO());
  const [appliedFrom, setAppliedFrom] = useState<string>('');
  const [appliedTo, setAppliedTo] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    if (range === 'custom' && (!appliedFrom || !appliedTo)) return;
    setLoading(true);
    try {
      const res = await api.getAnalytics(
        range,
        range === 'custom' ? appliedFrom : undefined,
        range === 'custom' ? appliedTo : undefined
      );
      setData(res);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, appliedFrom, appliedTo]);

  const handleSelectRange = (id: string) => {
    setRange(id);
    if (id !== 'custom') {
      setAppliedFrom('');
      setAppliedTo('');
    }
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    setCustomFrom(from);
    setCustomTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setRange('custom');
  };

  const metrics: DashboardMetrics = data?.metrics || {
    totalLeads: 0,
    pendingFollowUps: 0,
    overdueFollowUpsCount: 0,
    invoicesSent: 0,
    invoicesPending: 0,
    duePayments: 0,
    duePaymentAmount: 0,
    totalOrders: 0,
    totalRevenue: 0
  };

  return (
    <div className="page-wrap space-y-5 sm:space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-5 sm:h-5" />
            </span>
            <span className="leading-tight">CRM & Order Fulfillment Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:ml-[3.25rem]">
            Real-time pipeline metrics, conversion performance & 3-location order tracking.
          </p>
        </div>

        {/* Date Filter Pills + Custom Range */}
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/90 backdrop-blur-sm border border-emerald-900/5 rounded-2xl shadow-[0_8px_24px_rgba(16,185,129,0.05)]">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectRange(item.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
                  range === item.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.id === 'custom' ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </button>
            ))}
          </div>

          {range === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 bg-white border border-emerald-200 rounded-xl shadow-xs">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || todayISO()}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayISO()}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customFrom || !customTo}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
              >
                Apply Range
              </button>
              {appliedFrom && appliedTo && (
                <p className="text-[11px] text-emerald-700 font-semibold sm:pb-2 sm:whitespace-nowrap">
                  {appliedFrom} → {appliedTo}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5">
        {/* 1. Total Leads */}
        <div
          onClick={() => onNavigate('leads')}
          className="crm-card p-3.5 sm:p-5 hover:border-emerald-300 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Users2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.totalLeads}
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-700 font-semibold">All time range</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>View all leads</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        </div>

        {/* 2. Follow-ups Pending */}
        <div
          onClick={() => onNavigate('followups', metrics.overdueFollowUpsCount > 0 ? 'overdue' : 'today')}
          className="crm-card p-3.5 sm:p-5 hover:border-amber-300 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Follow-ups</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.pendingFollowUps}
            </span>
            {metrics.overdueFollowUpsCount > 0 ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {metrics.overdueFollowUpsCount} overdue
              </span>
            ) : (
              <span className="text-xs text-amber-700 font-semibold">Pending</span>
            )}
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>People to follow up</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* 3. Invoice Sent */}
        <div
          onClick={() => onNavigate('orders', 'invoice_pending')}
          className="crm-card p-3.5 sm:p-5 hover:border-teal-300 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Send</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.invoicesSent}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Sent
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {loading ? '...' : metrics.invoicesPending} not sent
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>View pending invoices</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500"></div>
        </div>

        {/* 4. Due Payment */}
        <div
          onClick={() => onNavigate('orders', 'due_payment')}
          className="crm-card p-3.5 sm:p-5 hover:border-rose-300 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Due Payment</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.duePayments}
            </span>
            <span className="text-xs text-rose-700 font-bold font-mono">
              ₹{(metrics.duePaymentAmount || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>Pending / partial dues</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>

        {/* 5. Total Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="crm-card p-3.5 sm:p-5 hover:border-emerald-300 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '...' : metrics.totalOrders}
            </span>
            <span className="text-xs text-emerald-700 font-bold font-mono">
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

      {/* Sales Funnel Overview & Overdue Reminders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Funnel Pipeline Stage Summary (2 cols) */}
        <div className="lg:col-span-2 crm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Sales Funnel & Stage Breakdown
              </h2>
              <p className="text-xs text-slate-500">Current active leads and pipeline distribution.</p>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Open Kanban <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {data?.funnelOverview?.map((stage: any) => {
              const count = stage.lead_count || 0;
              const maxLeads = Math.max(...(data.funnelOverview.map((s: any) => s.lead_count || 1)), 1);
              const percentage = Math.round((count / maxLeads) * 100);

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      {stage.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium font-mono">₹{(stage.deal_value || 0).toLocaleString()}</span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono text-[11px]">
                        {count} leads
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500 bg-emerald-600"
                      style={{
                        width: `${Math.max(percentage, 4)}%`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming & Overdue Reminders (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Follow-ups & Reminders
              </h2>
              <button
                onClick={() => onNavigate('followups')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View All
              </button>
            </div>

            {/* Overdue Alert banner */}
            {data?.overdueFollowUps?.length > 0 ? (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-800">
                    {data.overdueFollowUps.length} Overdue Follow-up(s)
                  </h4>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Needs immediate attention.
                  </p>
                </div>
              </div>
            ) : null}

            {/* List */}
            <div className="space-y-3">
              {[...(data?.overdueFollowUps || []), ...(data?.upcomingFollowUps || [])].slice(0, 4).map((fup: any) => {
                const isOverdue = new Date(fup.scheduled_at) < new Date();
                return (
                  <div
                    key={fup.id}
                    onClick={() => onNavigate('followups')}
                    className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/60 hover:bg-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {fup.lead_name || fup.customer_name || 'Follow-up'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : 'Upcoming'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate">
                      {fup.purpose}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{new Date(fup.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Agent: {fup.agent_name || 'Assigned'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('followups')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            Manage All Scheduled Tasks
          </button>
        </div>
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
                  <span className="font-mono text-slate-700">₹{(src.total_deal_value || 0).toLocaleString()}</span>
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
                  <div className="text-[11px] font-mono text-slate-500">₹{(agt.total_deal_value || 0).toLocaleString()}</div>
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
                <th className="py-2.5 px-3">Route Journey (Start ➔ Current ➔ End)</th>
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
                  <td className="py-3 px-3 font-bold font-mono">₹{Number(ord.order_amount).toLocaleString()}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ord.order_status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-[11px] max-w-[260px] truncate text-slate-600">
                      <span className="truncate">{ord.start_location || 'Origin'}</span>
                      <span className="text-emerald-700 font-bold">➔ [{ord.current_location}] ➔</span>
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
