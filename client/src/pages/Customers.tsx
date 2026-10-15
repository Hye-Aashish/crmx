import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  MapPin,
  Package,
  Calendar,
  ChevronRight,
  TrendingUp,
  X,
  FileText,
  Navigation,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Customer } from '../types';

interface CustomersProps {
  initialCustomerId?: string;
  onSelectCustomer: (customerId: string) => void;
  openCreateOrderWithCustomerId?: (customerId: string) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  initialCustomerId,
  onSelectCustomer,
  openCreateOrderWithCustomerId,
  onNavigateToOrder
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Customer Details Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Customer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    city: '',
    address: '',
    notes: ''
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({ search });
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  useEffect(() => {
    if (initialCustomerId) {
      handleOpenCustomer(initialCustomerId);
    }
  }, [initialCustomerId]);

  const handleOpenCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetail(true);
    try {
      const res = await api.getCustomerById(id);
      setCustomerDetail(res);
      onSelectCustomer(id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCustomer(newCust);
      setShowCreateModal(false);
      setNewCust({
        name: '',
        phone: '',
        email: '',
        company: '',
        city: '',
        address: '',
        notes: ''
      });
      loadCustomers();
      handleOpenCustomer(res.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            Customer Management & Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Centralized customer profiles linked with original leads and order tracking journeys.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, Code (CUST-001), Phone, City, Company..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total: <span className="text-emerald-800 font-mono">{customers.length} Accounts</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Customer ID</th>
                <th className="py-3 px-3">Customer Name</th>
                <th className="py-3 px-3">Phone & Email</th>
                <th className="py-3 px-3">Company & City</th>
                <th className="py-3 px-3">Linked Lead</th>
                <th className="py-3 px-3">Total Orders</th>
                <th className="py-3 px-3">Order Value</th>
                <th className="py-3 px-3">Latest Status</th>
                <th className="py-3 px-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No customer profiles found. Convert leads or add a customer to see them here.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleOpenCustomer(cust.id)}
                        className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:text-emerald-950"
                      >
                        {cust.customer_code}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {cust.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800">
                      <div>{cust.phone}</div>
                      {cust.email && <div className="text-[11px] text-slate-400 font-sans">{cust.email}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{cust.company || '—'}</div>
                      {cust.city && <div className="text-[11px] text-slate-400">{cust.city}</div>}
                    </td>
                    <td className="py-3 px-3">
                      {cust.original_lead_code ? (
                        <span className="font-mono text-[11px] text-emerald-700 font-bold bg-emerald-50/50 px-1.5 py-0.5 rounded">
                          {cust.original_lead_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {cust.total_orders} Orders
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      ₹{Number(cust.total_order_value || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      {cust.latest_order_status ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {cust.latest_order_status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No orders</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenCustomer(cust.id)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                      >
                        View Account
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE SCREEN COMPREHENSIVE CUSTOMER PROFILE MODAL */}
      {selectedCustomerId && customerDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fade-in space-y-6">
            {/* Header & Quick Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
                  {customerDetail.customer?.name?.[0] || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {customerDetail.customer?.customer_code}
                    </span>
                    {customerDetail.customer?.original_lead_code && (
                      <span className="text-[11px] text-slate-500">
                        Linked Lead: <strong className="text-emerald-700">{customerDetail.customer?.original_lead_code}</strong>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {customerDetail.customer?.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {openCreateOrderWithCustomerId && (
                  <button
                    onClick={() => {
                      const cid = customerDetail.customer?.id;
                      setSelectedCustomerId(null);
                      openCreateOrderWithCustomerId(cid);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Order
                  </button>
                )}
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Phone Number</span>
                <span className="font-mono font-bold text-xs text-slate-800">
                  {customerDetail.customer?.phone}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Company / City</span>
                <span className="font-bold text-xs text-slate-800">
                  {customerDetail.customer?.company || 'Individual'} • {customerDetail.customer?.city || 'India'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total Orders</span>
                <span className="font-bold text-xs text-emerald-800">
                  {customerDetail.customer?.total_orders} Orders
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Lifetime Value</span>
                <span className="font-mono font-bold text-xs text-emerald-700">
                  ₹{Number(customerDetail.customer?.total_order_value || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Complete Order History with 3 Locations */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Complete Order History & Checkpoints ({customerDetail.orders?.length || 0})
              </h3>

              {customerDetail.orders?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No orders created for this customer yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerDetail.orders?.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {ord.order_code}
                          </span>
                          <span className="font-semibold text-slate-900">{ord.product_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {ord.order_status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Number(ord.order_amount).toLocaleString()}
                          </span>
                          {onNavigateToOrder && (
                            <button
                              onClick={() => {
                                setSelectedCustomerId(null);
                                onNavigateToOrder(ord.id);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              Track <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 3-Location Route Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] font-bold">🟢 ORIGIN HUB</span>
                          <span className="text-slate-700 truncate block font-medium">
                            {ord.start_location || 'Central Warehouse'}
                          </span>
                        </div>
                        <div className="bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200">
                          <span className="text-emerald-700 block text-[9px] font-bold">📍 CURRENT CHECKPOINT</span>
                          <span className="text-emerald-900 truncate block font-bold">
                            {ord.current_location}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-bold">🏁 DESTINATION</span>
                          <span className="text-slate-700 truncate block font-medium">
                            {ord.end_location || 'Customer Address'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Lead Activity Timeline */}
            {customerDetail.activities?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Origin Lead History & Inquiries
                </h3>
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                  {customerDetail.activities.map((act: any) => (
                    <div key={act.id} className="text-xs pb-2 border-b border-slate-200/60 last:border-0">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{act.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(act.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {act.notes && <p className="text-slate-500 text-[11px] mt-0.5">{act.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  placeholder="ramesh@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company & City</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCust.company}
                    onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
                    placeholder="Company name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    value={newCust.city}
                    onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="Street address for order deliveries..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
