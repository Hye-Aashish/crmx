import React, { useState, useEffect, useRef } from 'react';
import {
  PackageCheck,
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
  ChevronDown,
  ChevronRight,
  Check,
  Send,
  Flag,
  Pencil
} from 'lucide-react';
import { api } from '../services/api';
import { Order, OrderTracking, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { displayDateKey, orderDateBounds, type OrderDatePreset } from '../utils/orderDateRange';

interface OrdersProps {
  initialOrderId?: string;
  preselectedCustomerId?: string;
}

export const Orders: React.FC<OrdersProps> = ({
  initialOrderId,
  preselectedCustomerId
}) => {
  const { user } = useAuth();
  const canEditOrders = user?.role === 'admin' || user?.permissions?.includes('edit_orders') === true;
  const canUpdateTracking = user?.role === 'admin' || user?.permissions?.includes('update_order_location') === true;
  const canCreateOrders = user?.role === 'admin' || user?.permissions?.includes('create_orders') === true;
  const formatCurrency = (value: number | null | undefined) => value == null || !Number.isFinite(Number(value))
    ? 'N/A'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));
  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const paymentStatusLabel = (status?: string) => status === 'Partial' ? 'Partially Paid' : status || 'Pending';
  const fullAddress = (order: Order) => [order.customer_address, order.customer_city].filter(Boolean).join(', ') || order.end_location || 'N/A';

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [datePreset, setDatePreset] = useState<OrderDatePreset>('thisMonth');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [customDateApplied, setCustomDateApplied] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [customDatePanelOpen, setCustomDatePanelOpen] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const mobileDateFilterRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');
  const [summary, setSummary] = useState({ total_orders: 0, in_transit_orders: 0, delivered_orders: 0, total_order_volume: 0, total_deposits: 0, total_due_balance: 0 });
  const activeDateRange = datePreset === 'custom' && !customDateApplied
    ? null
    : orderDateBounds(datePreset, customDateFrom, customDateTo);
  const invalidCustomDateRange = Boolean(customDateFrom && customDateTo && customDateTo < customDateFrom);
  const dateRangeLabel = datePreset === 'all'
    ? 'All dates'
    : datePreset === 'custom'
      ? (customDateApplied && activeDateRange ? `${displayDateKey(activeDateRange.fromKey)} – ${displayDateKey(activeDateRange.toKey)}` : 'Choose dates')
      : activeDateRange ? `${displayDateKey(activeDateRange.fromKey)} – ${displayDateKey(activeDateRange.toKey)}` : '';

  // Selected Order for Tracking Timeline View
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<OrderTracking[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ product_name: '', quantity: 1, order_amount: 0, payment_method: '', deposit: 0, shipping_date: '', end_location: '' });

  // Update Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [updateLocForm, setUpdateLocForm] = useState({
    start_location: '',
    current_location: '',
    end_location: '',
    order_status: 'In Transit',
    remarks: ''
  });

  // Create Order Modal
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedCustomerId);
  const [newOrder, setNewOrder] = useState({
    customer_id: preselectedCustomerId || '',
    product_name: '',
    quantity: 1,
    order_amount: 0,
    order_status: 'Order Placed',
    start_location: 'New York Logistics Center',
    current_location: 'New York Logistics Center',
    end_location: '',
    delivery_notes: '',
    expected_delivery_date: '',
    payment_method: '',
    deposit: 0,
    shipping_date: ''
  });

  const loadOrders = async () => {
    if (datePreset === 'custom' && !customDateApplied) return;
    setLoading(true);
    setLoadError('');
    try {
      const range = activeDateRange;
      const params: Record<string, string> = {
        order_status: statusFilter,
        payment_status: paymentFilter,
        payment_method: paymentMethodFilter,
        limit: '500'
      };
      if (debouncedSearch.trim()) params.customer_name = debouncedSearch.trim();
      if (range) {
        params.created_from = range.from;
        params.created_to_exclusive = range.toExclusive;
      }
      const ordersRes = await api.getOrders(params);

      setOrders(ordersRes.data || []);
      setSummary(ordersRes.summary || { total_orders: 0, in_transit_orders: 0, delivered_orders: 0, total_order_volume: 0, total_deposits: 0, total_due_balance: 0 });

      if (initialOrderId) {
        handleViewOrder(initialOrderId);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setLoadError('Could not load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    api.getCustomers().then((res) => setCustomers(res.data || [])).catch((err) => console.error('Failed to load customers:', err));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [debouncedSearch, statusFilter, paymentFilter, paymentMethodFilter, datePreset, customDateApplied]);

  useEffect(() => {
    if (!dateMenuOpen && !customDatePanelOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !dateFilterRef.current?.contains(event.target) && !mobileDateFilterRef.current?.contains(event.target)) {
        setDateMenuOpen(false);
        setCustomDatePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [dateMenuOpen, customDatePanelOpen]);

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
      remarks: ''
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
        order_status: 'Order Placed',
        start_location: 'New York Logistics Center',
        current_location: 'New York Logistics Center',
        end_location: '',
        delivery_notes: '',
        expected_delivery_date: '',
        payment_method: '',
        deposit: 0,
        shipping_date: ''
      });
      loadOrders();
      handleViewOrder(res.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      product_name: order.product_name || '',
      quantity: Number(order.quantity) || 1,
      order_amount: Number(order.order_amount) || 0,
      payment_method: order.payment_method || '',
      deposit: Number(order.deposit) || 0,
      shipping_date: order.shipping_date ? order.shipping_date.slice(0, 10) : '',
      end_location: order.end_location || ''
    });
  };

  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      await api.updateOrder(editingOrder.id, editForm);
      setEditingOrder(null);
      await loadOrders();
      if (selectedOrder?.id === editingOrder.id) await handleViewOrder(editingOrder.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
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
  const totalOrdersCount = Number(summary.total_orders) || 0;
  const inTransitCount = Number(summary.in_transit_orders) || 0;
  const deliveredCount = Number(summary.delivered_orders) || 0;
  const totalRevenue = Number(summary.total_order_volume) || 0;

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

        {canCreateOrders && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        )}
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
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-xs font-semibold text-emerald-800">Total Deposits</div>
          <div className="text-2xl font-black font-mono text-emerald-800 mt-1">{formatCurrency(Number(summary.total_deposits) || 0)}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Payments received</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs bg-gradient-to-br from-white to-amber-50/30">
          <div className="text-xs font-semibold text-amber-800">Total Outstanding Due</div>
          <div className="text-2xl font-black font-mono text-amber-800 mt-1">{formatCurrency(Number(summary.total_due_balance) || 0)}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Remaining order balances</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name..."
            aria-label="Search orders by customer name"
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700" aria-label="Clear customer name search"><X className="w-3.5 h-3.5" /></button>}
        </div>

        <div ref={dateFilterRef} className="relative hidden min-w-[270px] lg:block">
          <button
            type="button"
            aria-label="Choose order date range"
            aria-expanded={dateMenuOpen}
            onClick={() => setDateMenuOpen((open) => !open)}
            className="hidden w-full items-center gap-2 rounded-xl border border-emerald-500 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 lg:flex"
          >
            <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="whitespace-nowrap">Date Range:</span>
            <span className="flex-1 text-left font-semibold text-emerald-800">
              {datePreset === 'all' ? 'All Time' : datePreset === 'today' ? 'Today' : datePreset === 'last7' ? 'Last 7 Days' : datePreset === 'thisMonth' ? 'This Month' : datePreset === 'lastMonth' ? 'Last Month' : dateRangeLabel}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-emerald-700" />
          </button>

          {dateMenuOpen && (
            <div className="absolute left-0 top-full z-40 mt-2 hidden w-[205px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl lg:block">
              {([
                ['all', 'All Time'],
                ['today', 'Today'],
                ['last7', 'Last 7 Days'],
                ['thisMonth', 'This Month'],
                ['lastMonth', 'Last Month']
              ] as const).map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset);
                    setCustomDateApplied(false);
                    setCustomDatePanelOpen(false);
                    setDateMenuOpen(false);
                  }}
                  className={'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ' + (datePreset === preset ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700 hover:bg-slate-50')}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="flex-1">{label}</span>
                  {datePreset === preset && <Check className="h-3.5 w-3.5 text-emerald-700" />}
                </button>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset('custom');
                    setCustomDateApplied(false);
                    setCustomDatePanelOpen((open) => !open);
                    setDateMenuOpen(true);
                  }}
                  className={'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ' + (datePreset === 'custom' ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700 hover:bg-slate-50')}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="flex-1">Custom</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                </button>

                {customDatePanelOpen && (
                  <div className="absolute left-full top-0 z-50 ml-3 w-[310px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor="orders-date-from">From Date</label>
                        <input id="orders-date-from" type="date" value={customDateFrom} onChange={(e) => { setCustomDateFrom(e.target.value); setCustomDateApplied(false); }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor="orders-date-to">To Date</label>
                        <input id="orders-date-to" type="date" min={customDateFrom || undefined} value={customDateTo} onChange={(e) => { setCustomDateTo(e.target.value); setCustomDateApplied(false); }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none" />
                      </div>
                    </div>
                    {invalidCustomDateRange && <p className="mt-2 text-[11px] font-medium text-red-600">To Date cannot be earlier than From Date.</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={!customDateFrom || !customDateTo || invalidCustomDateRange} onClick={() => { setCustomDateApplied(true); setCustomDatePanelOpen(false); setDateMenuOpen(false); }} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
                      <button type="button" onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); setCustomDateApplied(false); setDatePreset('all'); setCustomDatePanelOpen(false); setDateMenuOpen(false); }} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={mobileDateFilterRef} className="relative grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto sm:flex-wrap md:flex-nowrap lg:hidden">
          {([
            ['today', 'Today'],
            ['last7', 'Last 7 Days'],
            ['thisMonth', 'This Month'],
            ['lastMonth', 'Last Month'],
            ['all', 'All Time']
          ] as const).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setDatePreset(preset);
                setCustomDateApplied(false);
                setCustomDatePanelOpen(false);
                setDateMenuOpen(false);
              }}
              className={`min-h-[34px] w-full min-w-0 whitespace-nowrap rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition-colors sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs ${datePreset === preset ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={customDatePanelOpen}
            onClick={() => {
              setDatePreset('custom');
              setCustomDateApplied(false);
              setDateMenuOpen(false);
              setCustomDatePanelOpen((open) => !open);
            }}
            className={`flex min-h-[34px] w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition-colors sm:min-h-0 sm:w-auto sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${datePreset === 'custom' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'}`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            <span>Custom</span>
            <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${customDatePanelOpen ? 'rotate-180' : ''}`} />
          </button>
          {customDatePanelOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor="orders-mobile-date-from">From Date</label>
                  <input id="orders-mobile-date-from" type="date" value={customDateFrom} onChange={(e) => { setCustomDateFrom(e.target.value); setCustomDateApplied(false); }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor="orders-mobile-date-to">To Date</label>
                  <input id="orders-mobile-date-to" type="date" min={customDateFrom || undefined} value={customDateTo} onChange={(e) => { setCustomDateTo(e.target.value); setCustomDateApplied(false); }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none" />
                </div>
              </div>
              {invalidCustomDateRange && <p className="mt-2 text-[11px] font-medium text-red-600">To Date cannot be earlier than From Date.</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={!customDateFrom || !customDateTo || invalidCustomDateRange} onClick={() => { setCustomDateApplied(true); setCustomDatePanelOpen(false); setDateMenuOpen(false); }} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
                <button type="button" onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); setCustomDateApplied(false); setDatePreset('all'); setCustomDatePanelOpen(false); setDateMenuOpen(false); }} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">Clear</button>
              </div>
            </div>
          )}
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
          <option value="Partial">Partially Paid</option>
          <option value="Refunded">Refunded</option>
        </select>
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Payment Methods</option>
          {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">{loadError}</div>}

      {/* Orders Table with preserved tracking actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1750px] text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">SR NO</th>
                <th className="py-3 px-3">ORDER CODE</th>
                <th className="py-3 px-3">CUSTOMER NAME</th>
                <th className="py-3 px-3">ORDER DATE</th>
                <th className="py-3 px-3">EMAIL</th>
                <th className="py-3 px-3">CONTACT</th>
                <th className="py-3 px-3">ADDRESS</th>
                <th className="py-3 px-3">PRODUCT DETAILS</th>
                <th className="py-3 px-3">TOTAL PAYMENT</th>
                <th className="py-3 px-3">PAYMENT METHOD</th>
                <th className="py-3 px-3">DEPOSIT</th>
                <th className="py-3 px-3">DUE BALANCE</th>
                <th className="py-3 px-3">SHIPPING DATE</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan={14} className="py-10 text-center text-slate-400">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={14} className="py-10 text-center text-slate-400">No orders found matching filters.</td></tr>
              ) : orders.map((ord, index) => {
                const due = ord.order_amount == null || ord.deposit == null ? null : Number(ord.order_amount) - Number(ord.deposit);
                return (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-600">{index + 1}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex w-fit items-center whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[12px] font-bold leading-none text-emerald-700">{ord.order_code || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-3"><div className="font-semibold text-slate-900">{ord.current_customer_name || ord.customer_name || 'N/A'}</div></td>
                    <td className="py-3 px-3 whitespace-nowrap">{formatDate(ord.order_date)}</td>
                    <td className="py-3 px-3">{ord.customer_email || 'N/A'}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{ord.current_customer_phone || ord.customer_phone || 'N/A'}</td>
                    <td className="py-3 px-3 max-w-[250px] whitespace-normal">{fullAddress(ord)}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{ord.product_name || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500">Qty: {ord.quantity ?? 'N/A'} | Unit price: {ord.quantity && ord.order_amount != null ? formatCurrency(Number(ord.order_amount) / Number(ord.quantity)) : 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{formatCurrency(ord.order_amount)}</div>
                      <span className={'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ' + (ord.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : ord.payment_status === 'Partial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')}>
                        {paymentStatusLabel(ord.payment_status)}
                      </span>
                    </td>
                    <td className="py-3 px-3">{ord.payment_method || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">{formatCurrency(ord.deposit)}</td>
                    <td className={'py-3 px-3 font-mono font-semibold whitespace-nowrap ' + (due == null ? 'text-slate-500' : due > 0 ? 'text-amber-800' : 'text-emerald-800')}>{formatCurrency(due)}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{formatDate(ord.shipping_date)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdateTracking && <button onClick={() => handleOpenLocationModal(ord)} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors duration-200 whitespace-nowrap" title="Update current checkpoint"><Navigation className="w-3 h-3" />Update Hub</button>}
                        <button onClick={() => handleViewOrder(ord.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg" title="Order details and tracking history" aria-label="Order details and tracking history"><History className="w-3.5 h-3.5" /></button>
                        {canEditOrders && <button onClick={() => openEditOrder(ord)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg" title="Edit order" aria-label="Edit order"><Pencil className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select value={newOrder.payment_method} onChange={(e) => setNewOrder({ ...newOrder, payment_method: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600">
                    <option value="">Select method</option>
                    {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit (INR)</label>
                  <input type="number" min="0" max={newOrder.order_amount} value={newOrder.deposit} onChange={(e) => setNewOrder({ ...newOrder, deposit: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shipping Date</label>
                  <input type="date" value={newOrder.shipping_date} onChange={(e) => setNewOrder({ ...newOrder, shipping_date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600" />
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
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {paymentStatusLabel(selectedOrder?.payment_status)}
                  </div>
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

      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Order</h2>
                <p className="text-xs text-slate-500">{editingOrder.order_code} · {editingOrder.current_customer_name || editingOrder.customer_name}</p>
              </div>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product / Service *</label>
                <input required value={editForm.product_name} onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold text-slate-700 mb-1">Quantity *</label><input required type="number" min="1" step="1" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" /></div>
                <div><label className="block font-bold text-slate-700 mb-1">Total Payment (INR) *</label><input required type="number" min="0" step="0.01" value={editForm.order_amount} onChange={(e) => setEditForm({ ...editForm, order_amount: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" /></div>
                <div><label className="block font-bold text-slate-700 mb-1">Payment Method</label><select value={editForm.payment_method} onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"><option value="">Not specified</option>{['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}</select></div>
                <div><label className="block font-bold text-slate-700 mb-1">Deposit (INR)</label><input type="number" min="0" max={editForm.order_amount} step="0.01" value={editForm.deposit} onChange={(e) => setEditForm({ ...editForm, deposit: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" /><span className="text-[10px] text-slate-500">Due: {formatCurrency(editForm.order_amount - editForm.deposit)}</span></div>
                <div><label className="block font-bold text-slate-700 mb-1">Shipping Date</label><input type="date" value={editForm.shipping_date} onChange={(e) => setEditForm({ ...editForm, shipping_date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" /></div>
                <div><label className="block font-bold text-slate-700 mb-1">Delivery Address</label><input value={editForm.end_location} onChange={(e) => setEditForm({ ...editForm, end_location: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingOrder(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={savingEdit} className="btn-primary">{savingEdit ? 'Saving...' : 'Save Changes'}</button>
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

            {/* Complete Order Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Customer</span>
                <span className="font-bold text-slate-900">{selectedOrder.current_customer_name || selectedOrder.customer_name || 'N/A'}</span>
                <div className="font-mono text-slate-500 text-[10px]">{selectedOrder.current_customer_phone || selectedOrder.customer_phone || 'N/A'}</div>
                <div className="text-slate-500 text-[10px]">{selectedOrder.customer_email || 'N/A'}</div>
                <div className="text-slate-500 text-[10px]">{fullAddress(selectedOrder)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Product / Quantity</span>
                <span className="font-bold text-slate-900">{selectedOrder.product_name || 'N/A'}</span>
                <div className="text-slate-500 text-[10px]">Quantity: {selectedOrder.quantity ?? 'N/A'}</div>
                <div className="text-slate-500 text-[10px]">Unit price: {selectedOrder.quantity ? formatCurrency(Number(selectedOrder.order_amount) / Number(selectedOrder.quantity)) : 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Payment</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(Number(selectedOrder.order_amount))}</span>
                <div className="text-slate-500 text-[10px]">Deposit: {formatCurrency(selectedOrder.deposit)}</div>
                <div className="text-slate-500 text-[10px]">Due: {selectedOrder.deposit == null ? 'N/A' : formatCurrency(Number(selectedOrder.order_amount) - Number(selectedOrder.deposit))}</div>
                <div className="text-slate-500 text-[10px]">{selectedOrder.payment_method || 'N/A'} | {paymentStatusLabel(selectedOrder.payment_status)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Dates / Assigned</span>
                <div className="font-medium text-slate-700">Ordered: {formatDate(selectedOrder.order_date)}</div>
                <div className="font-medium text-slate-700">Shipping: {formatDate(selectedOrder.shipping_date)}</div>
                <div className="font-medium text-slate-700">Staff: {selectedOrder.assigned_staff_name || 'N/A'}</div>
              </div>
            </div>

            {/* Manual Location Tracking Timeline (Audit-Proof History) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  Checkpoint History Timeline (Audit Log) <span className="font-mono text-emerald-700">· {selectedOrder.order_code}</span>
                </h3>
                {canUpdateTracking && <button
                  onClick={() => handleOpenLocationModal(selectedOrder)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  + Update Checkpoint
                </button>}
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
