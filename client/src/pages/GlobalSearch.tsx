import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  Users2,
  PackageCheck,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { Customer, Lead, Order } from '../types';

interface GlobalSearchProps {
  initialQuery?: string;
  onNavigateToCustomer: (id: string) => void;
  onNavigateToOrder: (id: string) => void;
  onNavigateToLead?: (id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  initialQuery = '',
  onNavigateToCustomer,
  onNavigateToOrder,
  onNavigateToLead
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<'all' | 'customers' | 'orders' | 'leads'>('all');
  const [results, setResults] = useState<{
    query?: string;
    phone_normalized?: string;
    customers: Customer[];
    leads: Lead[];
    orders: Order[];
  }>({
    customers: [],
    leads: [],
    orders: []
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.search(searchTerm);
      setResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const totalHits = results.customers.length + results.orders.length + results.leads.length;

  return (
    <div className="page-wrap">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900 rounded-[1.75rem] p-6 sm:p-8 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden ring-1 ring-emerald-400/15">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-300 text-xs font-semibold border border-emerald-400/25">
            <Search className="w-3.5 h-3.5" />
            Universal Multi-Entity Index
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Universal Global Search
          </h1>
          <p className="text-emerald-100/80 text-xs sm:text-sm">
            Search anything across the entire system: Customer name, phone number, order number (e.g. 5001), lead code, or location.
          </p>

          <form onSubmit={handleSubmit} className="pt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type customer name, phone (+1...), ORD-5001, LD-1001, or hub..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all shrink-0 active:scale-95"
            >
              Search
            </button>
          </form>
        </div>

        <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {loading && (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          Searching customers, order hubs, and lead pipelines...
        </div>
      )}

      {!loading && hasSearched && (
        <div className="space-y-6">
          {/* Summary & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 filter-bar !p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span>Query:</span>
              <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                "{query}"
              </span>
              <span className="text-slate-400">• Total matches: {totalHits}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({totalHits})
              </button>
              <button
                onClick={() => setActiveFilter('orders')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  activeFilter === 'orders'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Orders ({results.orders.length})
              </button>
              <button
                onClick={() => setActiveFilter('customers')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  activeFilter === 'customers'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Customers ({results.customers.length})
              </button>
              <button
                onClick={() => setActiveFilter('leads')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  activeFilter === 'leads'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Leads ({results.leads.length})
              </button>
            </div>
          </div>

          {totalHits === 0 && (
            <div className="p-12 text-center panel text-slate-400 text-xs">
              No matching records found for "{query}". Try searching by a phone number, customer name, or order number (e.g. 5001).
            </div>
          )}

          {/* ORDERS TABLE */}
          {(activeFilter === 'all' || activeFilter === 'orders') && results.orders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Matching Orders ({results.orders.length})
              </h2>

              <div className="panel-flush">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="py-3 px-3">Order Code</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Product</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Route</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {results.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onNavigateToOrder(ord.id)}
                              className="font-mono font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                            >
                              {ord.order_code}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{ord.customer_phone}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800 truncate max-w-[170px]">
                              {ord.product_name}
                            </div>
                            <div className="text-[11px] text-slate-400">Qty: {ord.quantity}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900">
                              ₹{Number(ord.order_amount).toLocaleString()}
                            </div>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ord.payment_status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                ord.order_status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {ord.order_status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                              {ord.order_status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1 text-[11px] max-w-[260px]">
                              <div className="flex items-center gap-1 text-slate-500 truncate">
                                <span className="font-semibold text-slate-700">Start:</span>
                                <span className="truncate">{ord.start_location || 'Origin Hub'}</span>
                              </div>
                              <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200 truncate">
                                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">Current: {ord.current_location}</span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500 truncate">
                                <span className="font-semibold text-slate-700">End:</span>
                                <span className="truncate">{ord.end_location || 'Delivery Address'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onNavigateToOrder(ord.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                            >
                              Track
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMERS TABLE */}
          {(activeFilter === 'all' || activeFilter === 'customers') && results.customers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Matching Customers ({results.customers.length})
              </h2>

              <div className="panel-flush">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="py-3 px-3">Customer ID</th>
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Phone & Email</th>
                        <th className="py-3 px-3">Company & City</th>
                        <th className="py-3 px-3">Orders</th>
                        <th className="py-3 px-3">Order Value</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {results.customers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onNavigateToCustomer(c.id)}
                              className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:text-emerald-950"
                            >
                              {c.customer_code}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-800">
                            <div>{c.phone}</div>
                            {c.email && <div className="text-[11px] text-slate-400 font-sans">{c.email}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{c.company || '—'}</div>
                            {c.city && <div className="text-[11px] text-slate-400">{c.city}</div>}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {c.total_orders || 0}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            ₹{Number(c.total_order_value || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onNavigateToCustomer(c.id)}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                            >
                              Open Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LEADS TABLE */}
          {(activeFilter === 'all' || activeFilter === 'leads') && results.leads.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-emerald-600" />
                Matching Leads ({results.leads.length})
              </h2>

              <div className="panel-flush">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="py-3 px-3">Lead Code</th>
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Company / City</th>
                        <th className="py-3 px-3">Stage</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3 text-right">Deal Value</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {results.leads.map((ld) => (
                        <tr key={ld.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            {onNavigateToLead ? (
                              <button
                                onClick={() => onNavigateToLead(ld.id)}
                                className="font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition-colors cursor-pointer"
                              >
                                {ld.lead_code}
                              </button>
                            ) : (
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {ld.lead_code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{ld.customer_name}</td>
                          <td className="py-3 px-3 font-mono text-slate-800">{ld.phone}</td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{ld.company_name || '—'}</div>
                            {ld.city && <div className="text-[11px] text-slate-400">{ld.city}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={{
                                backgroundColor: ld.stage_color ? `${ld.stage_color}22` : '#f1f5f9',
                                color: ld.stage_color || '#334155',
                                borderColor: ld.stage_color ? `${ld.stage_color}55` : '#e2e8f0'
                              }}
                            >
                              {ld.stage_name || 'Stage'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ld.priority === 'Urgent'
                                  ? 'bg-red-100 text-red-800'
                                  : ld.priority === 'High'
                                  ? 'bg-orange-100 text-orange-800'
                                  : ld.priority === 'Medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ld.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹{Number(ld.estimated_deal_value || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {onNavigateToLead && (
                              <button
                                onClick={() => onNavigateToLead(ld.id)}
                                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                              >
                                Open Lead
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
