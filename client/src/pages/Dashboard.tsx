import React, { useEffect, useState } from 'react';
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
  Truck
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';

interface DashboardProps {
  onNavigate: (tab: string, filter?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [range, setRange] = useState<string>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics(range);
      setData(res);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs self-start sm:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'This Month' },
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
        </div>
      </div>

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
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
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
