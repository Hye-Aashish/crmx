import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  Plus,
  MapPin,
  Clock,
  Phone,
  User,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Navigation,
  X,
  History,
  Building,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Send,
  Flag
} from 'lucide-react';
import { api } from '../services/api';
import { Order, OrderTracking, Customer } from '../types';

interface OrdersProps {
  initialOrderId?: string;
  preselectedCustomerId?: string;
}

export const Orders: React.FC<OrdersProps> = ({
  initialOrderId,
  preselectedCustomerId
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Selected Order for Tracking Timeline View
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<OrderTracking[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Update Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [updateLocForm, setUpdateLocForm] = useState({
    start_location: '',
    current_location: '',
    end_location: '',
    order_status: 'In Transit',
    remarks: '',
    payment_status: 'Paid'
  });

  // Create Order Modal
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedCustomerId);
  const [newOrder, setNewOrder] = useState({
    customer_id: preselectedCustomerId || '',
    product_name: '',
    quantity: 1,
    order_amount: 0,
    payment_status: 'Pending',
    order_status: 'Order Placed',
    start_location: 'New York Logistics Center',
    current_location: 'New York Logistics Center',
    end_location: '',
    delivery_notes: '',
    expected_delivery_date: ''
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes] = await Promise.all([
        api.getOrders({
          search,
          order_status: statusFilter,
          payment_status: paymentFilter
        }),
        api.getCustomers()
      ]);

      setOrders(ordersRes.data || []);
      setCustomers(custRes.data || []);

      if (initialOrderId) {
        handleViewOrder(initialOrderId);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter, paymentFilter]);

  // When preselected customer changes, auto-fill destination
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const c = customers.find((cust) => cust.id === preselectedCustomerId);
      if (c) {
        setNewOrder((prev) => ({
          ...prev,
          customer_id: c.id,
          end_location: c.address ? `${c.address}, ${c.city || ''}`.trim() : `${c.city || ''} Delivery Address`
        }));
      }
    }
  }, [preselectedCustomerId, customers]);

  const handleCustomerSelect = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    setNewOrder((prev) => ({
      ...prev,
      customer_id: customerId,
      end_location: cust?.address
        ? `${cust.address}, ${cust.city || ''}`.trim()
        : cust?.city
        ? `${cust.city} Delivery Address`
        : prev.end_location
    }));
  };

  const handleViewOrder = async (orderId: string) => {
    setLoadingTracking(true);
    try {
      const res = await api.getOrderById(orderId);
      setSelectedOrder(res.order);
      setTrackingHistory(res.trackingHistory || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleOpenLocationModal = (ord: Order) => {
    setSelectedOrder(ord);
    setUpdateLocForm({
      start_location: ord.start_location || 'Central Origin Hub',
      current_location: ord.current_location || ord.start_location || 'In Transit Hub',
      end_location: ord.end_location || 'Customer Delivery Address',
      order_status: ord.order_status,
      remarks: '',
      payment_status: ord.payment_status
    });
    setShowLocationModal(true);
  };

  const handleSaveLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.updateOrderLocation(selectedOrder.id, updateLocForm);
      setShowLocationModal(false);
      loadOrders();
      handleViewOrder(selectedOrder.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createOrder(newOrder);
      setShowCreateModal(false);
      setNewOrder({
        customer_id: '',
        product_name: '',
        quantity: 1,
        order_amount: 0,
        payment_status: 'Pending',
        order_status: 'Order Placed',
        start_location: 'New York Logistics Center',
        current_location: 'New York Logistics Center',
        end_location: '',
        delivery_notes: '',
        expected_delivery_date: ''
      });
      loadOrders();
      handleViewOrder(res.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Quick checkpoint helper for admin
  const applyQuickCheckpoint = (locName: string, status?: string) => {
    setUpdateLocForm((prev) => ({
      ...prev,
      current_location: locName,
      order_status: status || prev.order_status,
      remarks: prev.remarks || `Checkpoint reached: ${locName}`
    }));
  };

  const orderStatuses = [
    'Order Placed',
    'Processing',
    'Confirmed',
    'Dispatched',
    'In Transit',
    'Reached Local Hub',
    'Out for Delivery',
    'Delivered',
    'On Hold',
    'Cancelled'
  ];

  // Aggregate stats
  const totalOrdersCount = orders.length;
  const inTransitCount = orders.filter((o) =>
    ['Dispatched', 'In Transit', 'Reached Local Hub', 'Out for Delivery'].includes(o.order_status)
  ).length;
  const deliveredCount = orders.filter((o) => o.order_status === 'Delivered').length;
  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.order_amount) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-600" />
            Order Management & 3-Location Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track shipments across <strong>Start (Origin)</strong>, <strong>Current Checkpoint</strong>, and <strong>End (Delivery)</strong> locations with audit history.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* KPI Cards (Clean Green Theme) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Orders</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">All customer orders</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            In Transit / Active
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{inTransitCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Moving between hubs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Delivered Orders
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{deliveredCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Successfully fulfilled</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Order Volume</div>
          <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Cumulative billing</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID (5001), Customer, Phone, or Location..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Fulfillment Statuses</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Payment Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Partial">Partial</option>
          <option value="Refunded">Refunded</option>
        </select>
      </div>

      {/* Orders Table with 3 Locations */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Order Code</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3">Product / Service</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">3-Point Route Journey</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No orders found matching filters.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order Code */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleViewOrder(ord.id)}
                        className="font-mono font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                      >
                        {ord.order_code}
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{ord.customer_phone}</div>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 truncate max-w-[170px]">
                        {ord.product_name}
                      </div>
                      <div className="text-[11px] text-slate-400">Qty: {ord.quantity}</div>
                    </td>

                    {/* Amount & Payment */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">
                        ₹{Number(ord.order_amount).toLocaleString()}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          ord.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.payment_status}
                      </span>
                    </td>

                    {/* Order Status */}
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

                    {/* 3 Locations Route */}
                    <td className="py-3 px-3">
                      <div className="space-y-1 text-[11px] max-w-[280px]">
                        {/* Start to End line */}
                        <div className="flex items-center gap-1 text-slate-500 truncate">
                          <span className="font-semibold text-slate-700">Start:</span>
                          <span className="truncate">{ord.start_location || 'Origin Hub'}</span>
                        </div>
                        {/* Current Checkpoint */}
                        <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200 truncate">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">Current: {ord.current_location}</span>
                        </div>
                        {/* Delivery End */}
                        <div className="flex items-center gap-1 text-slate-500 truncate">
                          <span className="font-semibold text-slate-700">End:</span>
                          <span className="truncate">{ord.end_location || 'Delivery Address'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tracking Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenLocationModal(ord)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          title="Update current checkpoint or location"
                        >
                          <Navigation className="w-3 h-3 text-emerald-600" />
                          Update Hub
                        </button>
                        <button
                          onClick={() => handleViewOrder(ord.id)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                          title="View Full Tracking Timeline"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE NEW ORDER (With Start, Current, End Locations) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Create New Order & Initiate Tracking
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              {/* Customer selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Customer *</label>
                <select
                  required
                  value={newOrder.customer_id}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Choose Customer Account --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_code}) • {c.phone} {c.city ? `• ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Product / Service Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.product_name}
                    onChange={(e) => setNewOrder({ ...newOrder, product_name: e.target.value })}
                    placeholder="e.g. Enterprise CRM Package"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newOrder.order_amount}
                    onChange={(e) => setNewOrder({ ...newOrder, order_amount: Number(e.target.value) })}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={newOrder.payment_status}
                    onChange={(e) => setNewOrder({ ...newOrder, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              {/* 3 LOCATIONS SECTION */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  Define 3-Point Tracking Locations
                </div>

                {/* 1. Start Location */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    🟢 1. Start Location (Initiate / Origin Hub) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrder.start_location}
                    onChange={(e) => setNewOrder({ ...newOrder, start_location: e.target.value })}
                    placeholder="e.g. New York Logistics Center (Warehouse A)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* 2. End Location */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    🏁 2. End Location (Delivery Destination / Customer Address) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrder.end_location}
                    onChange={(e) => setNewOrder({ ...newOrder, end_location: e.target.value })}
                    placeholder="e.g. 742 Evergreen Terrace, New York, NY (Customer Doorstep)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* 3. Current Location */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    📍 3. Current Checkpoint Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrder.current_location}
                    onChange={(e) => setNewOrder({ ...newOrder, current_location: e.target.value })}
                    placeholder="e.g. New York Logistics Center"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Initial order placement default matches Start location.
                  </span>
                </div>
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fulfillment Status</label>
                  <select
                    value={newOrder.order_status}
                    onChange={(e) => setNewOrder({ ...newOrder, order_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    {orderStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newOrder.expected_delivery_date}
                    onChange={(e) => setNewOrder({ ...newOrder, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch / Delivery Remarks</label>
                <textarea
                  rows={2}
                  value={newOrder.delivery_notes}
                  onChange={(e) => setNewOrder({ ...newOrder, delivery_notes: e.target.value })}
                  placeholder="Optional notes or instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Order & Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE CHECKPOINT / LOCATION MODAL (Admin Workflow) */}
      {showLocationModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedOrder.order_code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedOrder.customer_name}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-600" />
                  Update Order Location & Checkpoint
                </h2>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocationUpdate} className="space-y-4 text-xs">
              {/* Route Summary (Start ➔ End) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Configured Journey Route
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-500 block font-semibold">🟢 Start Location</label>
                    <input
                      type="text"
                      value={updateLocForm.start_location}
                      onChange={(e) => setUpdateLocForm({ ...updateLocForm, start_location: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block font-semibold">🏁 End Location (Delivery)</label>
                    <input
                      type="text"
                      value={updateLocForm.end_location}
                      onChange={(e) => setUpdateLocForm({ ...updateLocForm, end_location: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* NEW CURRENT LOCATION / CHECKPOINT */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <label className="block font-bold text-emerald-950">
                  📍 Current Checkpoint Location *
                </label>
                <input
                  type="text"
                  required
                  value={updateLocForm.current_location}
                  onChange={(e) => setUpdateLocForm({ ...updateLocForm, current_location: e.target.value })}
                  placeholder="e.g. Chicago Distribution Center"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                {/* Quick Checkpoint Buttons */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-emerald-800 block mb-1">
                    Quick Checkpoint Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyQuickCheckpoint('Highway Cargo Checkpoint 1', 'In Transit')}
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-[10px] font-semibold hover:bg-emerald-100"
                    >
                      🚚 Highway Transit Hub
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickCheckpoint('Local City Sorting Terminal', 'Reached Local Hub')}
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-[10px] font-semibold hover:bg-emerald-100"
                    >
                      🏢 Local City Hub
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickCheckpoint('Local Delivery Partner Van (Out for Delivery)', 'Out for Delivery')}
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-[10px] font-semibold hover:bg-emerald-100"
                    >
                      🛵 Out for Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickCheckpoint(
                          updateLocForm.end_location || 'Customer Delivery Address',
                          'Delivered'
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800"
                    >
                      ✅ Delivered at End Location
                    </button>
                  </div>
                </div>
              </div>

              {/* Status and Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fulfillment Status</label>
                  <select
                    value={updateLocForm.order_status}
                    onChange={(e) => setUpdateLocForm({ ...updateLocForm, order_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    {orderStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={updateLocForm.payment_status}
                    onChange={(e) => setUpdateLocForm({ ...updateLocForm, payment_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Checkpoint Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Checkpoint Remarks / Audit Note</label>
                <textarea
                  rows={2}
                  value={updateLocForm.remarks}
                  onChange={(e) => setUpdateLocForm({ ...updateLocForm, remarks: e.target.value })}
                  placeholder="e.g. Consignment scanned at terminal. Dispatched to local delivery unit."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                ></textarea>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  This checkpoint will be permanently recorded in the order tracking history timeline.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Checkpoint to History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ORDER DETAILS & COMPLETE 3-LOCATION TRACKING TIMELINE */}
      {selectedOrder && !showLocationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-fade-in space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedOrder.order_code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {selectedOrder.order_status}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedOrder.product_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* VISUAL 3-STAGE PROGRESS ROUTE STEPPER */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  3-Location Journey Route
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {selectedOrder.order_status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative text-xs">
                {/* 1. Start */}
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    1. Start Location (Origin)
                  </div>
                  <div className="font-bold text-slate-800 mt-1 truncate">
                    {selectedOrder.start_location || 'Central Warehouse'}
                  </div>
                  <div className="text-[10px] text-slate-400">Order Initiated</div>
                </div>

                {/* 2. Current Checkpoint */}
                <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs ring-2 ring-emerald-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-white" />
                    2. Current Checkpoint
                  </div>
                  <div className="font-bold text-white mt-1 truncate">
                    {selectedOrder.current_location}
                  </div>
                  <div className="text-[10px] text-emerald-100">
                    Updated: {new Date(selectedOrder.last_location_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* 3. End */}
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Flag className="w-2.5 h-2.5 text-slate-600" />
                    3. End Location (Delivery)
                  </div>
                  <div className="font-bold text-slate-800 mt-1 truncate">
                    {selectedOrder.end_location || 'Customer Delivery Address'}
                  </div>
                  <div className="text-[10px] text-slate-400">Destination</div>
                </div>
              </div>
            </div>

            {/* Quick Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Customer</span>
                <span className="font-bold text-slate-900">{selectedOrder.customer_name}</span>
                <div className="font-mono text-slate-500 text-[10px]">{selectedOrder.customer_phone}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Total Amount</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{Number(selectedOrder.order_amount).toLocaleString()}
                </span>
                <div className="text-slate-500 text-[10px]">{selectedOrder.payment_status}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Order Date</span>
                <span className="font-medium text-slate-700">
                  {new Date(selectedOrder.order_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Staff / Assigned</span>
                <span className="font-medium text-slate-700">
                  {selectedOrder.assigned_staff_name || 'Rajesh Sharma (Admin)'}
                </span>
              </div>
            </div>

            {/* Manual Location Tracking Timeline (Audit-Proof History) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  Checkpoint History Timeline (Audit Log)
                </h3>
                <button
                  onClick={() => handleOpenLocationModal(selectedOrder)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  + Update Checkpoint
                </button>
              </div>

              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                {loadingTracking ? (
                  <p className="text-xs text-slate-400 pl-8">Loading checkpoint history...</p>
                ) : trackingHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 pl-8">No checkpoints recorded yet.</p>
                ) : (
                  trackingHistory.map((trk, idx) => (
                    <div key={trk.id} className="relative pl-8 text-xs">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                          idx === 0
                            ? 'bg-emerald-600 border-white ring-4 ring-emerald-100'
                            : 'bg-white border-emerald-500'
                        }`}
                      ></div>
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {trk.location}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {new Date(trk.recorded_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                        Status: {trk.order_status}
                      </div>
                      {trk.remarks && (
                        <p className="text-slate-600 text-[11px] mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {trk.remarks}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Recorded by: {trk.updated_by_name || 'Admin'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
