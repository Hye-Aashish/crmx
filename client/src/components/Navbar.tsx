import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Phone,
  Shield,
  ChevronDown,
  UserCheck,
  PackageCheck,
  Users2,
  MapPin,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Customer, Lead, Order } from '../types';

interface NavbarProps {
  onSearch: (query: string) => void;
  openCreateLeadModal: () => void;
  openCreateOrderModal: () => void;
  onSelectCustomer?: (customerId: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onSelectLead?: (leadId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  openCreateLeadModal,
  openCreateOrderModal,
  onSelectCustomer,
  onSelectOrder,
  onSelectLead
}) => {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Live search suggestions
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    customers: Customer[];
    leads: Lead[];
    orders: Order[];
  }>({ customers: [], leads: [], orders: [] });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced live search
  useEffect(() => {
    const q = searchValue.trim();
    if (q.length < 2) {
      setSuggestions({ customers: [], leads: [], orders: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(q);
        setSuggestions({
          customers: (res.customers || []).slice(0, 4),
          leads: (res.leads || []).slice(0, 4),
          orders: (res.orders || []).slice(0, 4)
        });
        setShowDropdown(true);
      } catch (err) {
        console.error('Live search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setShowDropdown(false);
      onSearch(searchValue.trim());
    }
  };

  const handlePickCustomer = (cId: string) => {
    setShowDropdown(false);
    if (onSelectCustomer) {
      onSelectCustomer(cId);
    } else {
      onSearch(searchValue);
    }
  };

  const handlePickOrder = (oId: string) => {
    setShowDropdown(false);
    if (onSelectOrder) {
      onSelectOrder(oId);
    } else {
      onSearch(searchValue);
    }
  };

  const handlePickLead = (lId: string) => {
    setShowDropdown(false);
    if (onSelectLead) {
      onSelectLead(lId);
    } else {
      onSearch(searchValue);
    }
  };

  const totalResults =
    suggestions.customers.length + suggestions.orders.length + suggestions.leads.length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Global Universal Search Bar with Live Suggestions */}
      <div ref={searchContainerRef} className="flex-1 max-w-xl relative">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline-block w-px h-3.5 bg-slate-300"></span>
            <Phone className="hidden sm:inline-block w-3.5 h-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => {
              if (searchValue.trim().length >= 2) setShowDropdown(true);
            }}
            placeholder="Search by Customer name, phone, order code, lead..."
            className="w-full pl-10 sm:pl-16 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
          />

          {isSearching && (
            <div className="absolute right-20 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            </div>
          )}

          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                setShowDropdown(false);
              }}
              className="absolute right-16 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            className="absolute right-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            Search
          </button>
        </form>

        {/* Live Instant Results Dropdown */}
        {showDropdown && searchValue.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in max-h-[460px] overflow-y-auto">
            {totalResults === 0 && !isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching customers, orders, or leads found for "{searchValue}"
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {/* Orders Group */}
                {suggestions.orders.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Orders ({suggestions.orders.length})
                    </div>
                    {suggestions.orders.map((ord) => (
                      <button
                        key={ord.id}
                        onClick={() => handlePickOrder(ord.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {ord.order_code}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {ord.customer_name}
                            </span>
                            <span className="text-slate-500 text-[11px] truncate">
                              • {ord.product_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {ord.start_location || 'Start'} ➔ <strong className="text-emerald-700">{ord.current_location}</strong> ➔ {ord.end_location || 'Delivery'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 block">
                            ₹{Number(ord.order_amount).toLocaleString()}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {ord.order_status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Customers Group */}
                {suggestions.customers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Customers ({suggestions.customers.length})
                    </div>
                    {suggestions.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handlePickCustomer(c.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              {c.customer_code}
                            </span>
                            {c.city && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {c.city}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {c.phone} {c.company ? `• ${c.company}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-[11px] text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          View Profile
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Leads Group */}
                {suggestions.leads.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5 text-emerald-600" />
                      Leads ({suggestions.leads.length})
                    </div>
                    {suggestions.leads.map((ld) => (
                      <button
                        key={ld.id}
                        onClick={() => handlePickLead(ld.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {ld.lead_code}
                            </span>
                            <span className="font-semibold text-slate-900">{ld.customer_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ld.phone} • {ld.company_name || ld.city || 'Lead'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            {ld.stage_name || 'Stage'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Full search link footer */}
                <div className="p-2 bg-slate-50/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 px-2">
                    Showing top quick matches
                  </span>
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors"
                  >
                    View all results in Global Search
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-4">
        {/* Quick Add Menu */}
        <div className="relative">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showQuickAdd && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in"
              onClick={() => setShowQuickAdd(false)}
            >
              <button
                onClick={openCreateLeadModal}
                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                New Lead
              </button>
              <button
                onClick={openCreateOrderModal}
                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                New Customer Order
              </button>
            </div>
          )}
        </div>

        {/* Current Active Role Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg text-emerald-800 text-xs font-semibold border border-emerald-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span className="capitalize">{user?.role} Mode</span>
        </div>
      </div>
    </header>
  );
};
