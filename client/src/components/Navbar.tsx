import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Phone,
  ChevronDown,
  UserCheck,
  PackageCheck,
  Users2,
  MapPin,
  ArrowRight,
  X,
  Loader2,
  Menu,
  LogOut
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
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  openCreateLeadModal,
  openCreateOrderModal,
  onSelectCustomer,
  onSelectOrder,
  onSelectLead,
  onMenuClick
}) => {
  const { user, logout, hasPermission } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const canCreateLead = hasPermission('create_leads');
  const canCreateOrder = hasPermission('create_orders');
  const showCreateMenu = canCreateLead || canCreateOrder;

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
    <header className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      {/* Left: Mobile menu button & Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden shrink-0 p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Universal Search Bar with Live Suggestions */}
        <div ref={searchContainerRef} className="w-full max-w-md lg:max-w-xl relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => {
                if (searchValue.trim().length >= 2) setShowDropdown(true);
              }}
              placeholder="Search name, phone, order ID..."
              className="w-full pl-10 pr-20 py-2 bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />

            <div className="absolute right-1.5 flex items-center gap-1">
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 mr-0.5" />
              )}
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    setShowDropdown(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Go
              </button>
            </div>
          </form>

          {/* Live Instant Results Dropdown */}
          {showDropdown && searchValue.trim().length >= 2 && (
            <div className="absolute left-0 right-0 sm:right-auto sm:w-[min(100vw-1.5rem,28rem)] top-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-900/10 border border-emerald-100 overflow-hidden z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
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
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {ord.order_code}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {ord.customer_name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{ord.current_location}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 block text-[11px]">
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
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 truncate">{c.name}</span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                {c.customer_code}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                              {c.phone} {c.company ? `• ${c.company}` : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="hidden sm:inline">View</span>
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
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {ld.lead_code}
                              </span>
                              <span className="font-semibold text-slate-900 truncate">{ld.customer_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
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
                  <div className="p-2 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-500 px-2">
                      Showing top quick matches
                    </span>
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
                    >
                      View all results
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Add Menu */}
        <div className="relative">
          {showCreateMenu && (
            <>
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {showQuickAdd && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-fade-in overflow-hidden"
                  onClick={() => setShowQuickAdd(false)}
                >
                  {canCreateLead && (
                    <button
                      onClick={openCreateLeadModal}
                      className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-emerald-600" />
                      New Lead
                    </button>
                  )}
                  {canCreateOrder && (
                    <button
                      onClick={openCreateOrderModal}
                      className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-emerald-600" />
                      New Customer Order
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Subtle Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile & Logout Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title={user?.name}
          >
            <div className="relative shrink-0">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-emerald-400 object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                {user?.name}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium capitalize leading-none mt-0.5">
                {user?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-fade-in"
              onClick={() => setShowProfileMenu(false)}
            >
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
