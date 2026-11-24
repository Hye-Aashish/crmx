import React, { useState, useEffect } from 'react';
import {
  Search,
  Phone,
  UserCheck,
  Users2,
  PackageCheck,
  MapPin,
  Calendar,
  Building,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Flag,
  Navigation
} from 'lucide-react';
import { api } from '../services/api';
import { Customer, Lead, Order } from '../types';

interface GlobalSearchProps {
  initialQuery?: string;
  onNavigateToCustomer: (id: string) => void;
  onNavigateToOrder: (id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  initialQuery = '',
  onNavigateToCustomer,
  onNavigateToOrder
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Search Header Banner (Emerald Theme) */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Search className="w-3.5 h-3.5" />
            Universal Multi-Entity Index
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
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

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          Searching customers, order hubs, and lead pipelines...
        </div>
      )}

      {/* Results View */}
      {!loading && hasSearched && (
        <div className="space-y-6">
          {/* Summary & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span>Query:</span>
              <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                "{query}"
              </span>
              <span className="text-slate-400">• Total matches: {totalHits}</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs">
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
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No matching records found for "{query}". Try searching by a phone number, customer name, or order number (e.g. 5001).
            </div>
          )}

          {/* 1. ORDERS LIST (With 3 Locations Journey) */}
          {(activeFilter === 'all' || activeFilter === 'orders') && results.orders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Matching Orders & 3-Location Tracking ({results.orders.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ord.order_code}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {ord.customer_name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ord.order_status}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-700">
                      Product: <strong>{ord.product_name}</strong>
                    </div>

                    {/* 3-Location Route Display */}
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        Tracking Route
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] font-bold">🟢 START</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {ord.start_location || 'Origin Hub'}
                          </span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded border border-emerald-200">
                          <span className="text-emerald-700 block text-[9px] font-bold">📍 CURRENT</span>
                          <span className="font-bold text-emerald-800 truncate block">
                            {ord.current_location}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-bold">🏁 DELIVERY</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {ord.end_location || 'Customer Address'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="font-mono font-bold text-slate-900">
                        ₹{Number(ord.order_amount).toLocaleString()}
                      </span>
                      <button
                        onClick={() => onNavigateToOrder(ord.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        Track Shipment Timeline
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MATCHING CUSTOMERS */}
          {(activeFilter === 'all' || activeFilter === 'customers') && results.customers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Matching Customer Accounts ({results.customers.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{c.name}</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {c.customer_code}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {c.phone} {c.company ? `• ${c.company}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigateToCustomer(c.id)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all"
                      >
                        Open Profile
                      </button>
                    </div>

                    {c.address && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.address}, {c.city || ''}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>Total Orders: <strong className="text-slate-800">{c.total_orders || 0}</strong></span>
                      <span>Total Value: <strong className="text-emerald-700 font-mono">₹{Number(c.total_order_value || 0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MATCHING LEADS */}
          {(activeFilter === 'all' || activeFilter === 'leads') && results.leads.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-emerald-600" />
                Matching Leads ({results.leads.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.leads.map((ld) => (
                  <div
                    key={ld.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {ld.lead_code}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{ld.customer_name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ld.stage_name || 'Stage'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      {ld.phone} {ld.company_name ? `• ${ld.company_name}` : ''} {ld.city ? `(${ld.city})` : ''}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">Est. Deal Value:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{Number(ld.estimated_deal_value || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
