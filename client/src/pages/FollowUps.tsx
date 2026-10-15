import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  ArrowRight,
  User,
  Plus,
  RefreshCw,
  X,
  CalendarPlus,
  Loader2,
  Users2
} from 'lucide-react';
import { api } from '../services/api';
import { FollowUp } from '../types';

export const FollowUps: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ today: number; overdue: number; upcoming: number; completed: number }>({
    today: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0
  });

  // Completion modal state
  const [completingFup, setCompletingFup] = useState<FollowUp | null>(null);
  const [completionOutcome, setCompletionOutcome] = useState('Discussion successful');
  const [completionNotes, setCompletionNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextScheduledAt, setNextScheduledAt] = useState('');
  const [nextPurpose, setNextPurpose] = useState('Follow-up call');

  // Reschedule modal state
  const [reschedulingFup, setReschedulingFup] = useState<FollowUp | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Create Follow-up modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createContactType, setCreateContactType] = useState<'lead' | 'customer'>('lead');
  const [createLeadId, setCreateLeadId] = useState('');
  const [createCustomerId, setCreateCustomerId] = useState('');
  const [createPurpose, setCreatePurpose] = useState('');
  const [createScheduledAt, setCreateScheduledAt] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Available leads & customers for selection
  const [leadsList, setLeadsList] = useState<{ id: string; customer_name: string; lead_code: string; phone: string }[]>([]);
  const [customersList, setCustomersList] = useState<{ id: string; name: string; customer_code: string; phone: string }[]>([]);

  const loadCounts = async () => {
    try {
      const [t, o, u, c] = await Promise.all([
        api.getFollowUps({ filter: 'today' }),
        api.getFollowUps({ filter: 'overdue' }),
        api.getFollowUps({ filter: 'upcoming' }),
        api.getFollowUps({ filter: 'completed' })
      ]);
      setCounts({
        today: t?.length || 0,
        overdue: o?.length || 0,
        upcoming: u?.length || 0,
        completed: c?.length || 0
      });
    } catch (err) {
      console.error('Failed to load follow-up counts:', err);
    }
  };

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const res = await api.getFollowUps({ filter: activeTab });
      setFollowups(res || []);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
    loadCounts();
  }, [activeTab]);

  const handleOpenCreateModal = async () => {
    // Preload leads and customers if not loaded
    if (leadsList.length === 0) {
      try {
        const [leadsRes, custsRes] = await Promise.all([
          api.getLeads({ limit: 100 }),
          api.getCustomers({ limit: 100 })
        ]);
        setLeadsList(leadsRes.leads || []);
        setCustomersList(custsRes.customers || []);
      } catch (err) {
        console.error('Failed to load contacts for modal:', err);
      }
    }

    // Default to today + 2 hours formatted for datetime-local
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCreateScheduledAt(localIso);
    setCreatePurpose('Call to discuss requirements & pricing');
    setCreateNotes('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createScheduledAt || !createPurpose.trim()) {
      alert('Please fill out date/time and purpose');
      return;
    }

    setCreating(true);
    try {
      await api.createFollowUp({
        lead_id: createContactType === 'lead' ? createLeadId : undefined,
        customer_id: createContactType === 'customer' ? createCustomerId : undefined,
        scheduled_at: createScheduledAt,
        purpose: createPurpose.trim(),
        notes: createNotes.trim() || undefined
      });
      setShowCreateModal(false);
      loadFollowUps();
      loadCounts();
    } catch (err: any) {
      alert(err.message || 'Failed to create follow-up');
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFup) return;

    try {
      await api.completeFollowUp(completingFup.id, {
        outcome: completionOutcome,
        notes: completionNotes,
        schedule_next: scheduleNext,
        next_scheduled_at: nextScheduledAt,
        next_purpose: nextPurpose
      });
      setCompletingFup(null);
      setCompletionNotes('');
      setScheduleNext(false);
      setNextScheduledAt('');
      loadFollowUps();
      loadCounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingFup || !newScheduleDate) return;

    try {
      await api.rescheduleFollowUp(reschedulingFup.id, {
        scheduled_at: newScheduleDate,
        notes: rescheduleNotes
      });
      setReschedulingFup(null);
      setNewScheduleDate('');
      setRescheduleNotes('');
      loadFollowUps();
      loadCounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Follow-up & Reminder Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Never miss a customer touchpoint. Manage daily call queues and complete scheduled tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              loadFollowUps();
              loadCounts();
            }}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            Schedule Follow-up
          </button>
        </div>
      </div>

      {/* Tab Navigation with Dynamic Counter Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: "Today's", count: counts.today, icon: Calendar, alert: false },
            { id: 'overdue', label: 'Overdue', count: counts.overdue, icon: AlertCircle, alert: true },
            { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, icon: Clock, alert: false },
            { id: 'completed', label: 'Completed', count: counts.completed, icon: CheckCircle, alert: false }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? tab.alert
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : tab.alert
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-slate-400 font-medium px-3 hidden md:block">
          📅 Real-time Scheduled Reminders
        </span>
      </div>

      {/* Follow-ups List Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading follow-up queue...</span>
          </div>
        ) : followups.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No follow-ups in this tab</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {activeTab === 'today'
                  ? "You have completed or haven't scheduled any follow-ups for today."
                  : "You're all caught up with your scheduled reminders!"}
              </p>
            </div>
            {activeTab === 'today' && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Follow-up for Today
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followups.map((fup) => {
              const isOverdue = new Date(fup.scheduled_at) < new Date() && fup.status === 'pending';

              return (
                <div
                  key={fup.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {fup.lead_name || fup.customer_name || 'Contact / Opportunity'}
                      </span>
                      {fup.lead_code && (
                        <span className="font-mono text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                          {fup.lead_code}
                        </span>
                      )}
                      {fup.customer_code && (
                        <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {fup.customer_code}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          fup.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOverdue
                            ? 'bg-red-100 text-red-700 font-bold'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {fup.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : 'Scheduled'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {fup.purpose}
                    </div>

                    {fup.notes && (
                      <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {fup.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {fup.lead_phone || fup.customer_phone || 'No phone'}
                      </span>
                      <span>👤 Assigned: {fup.assigned_user_name || 'Alex Turner'}</span>
                      <span className="font-semibold text-slate-700">
                        🕒 {new Date(fup.scheduled_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {fup.status !== 'completed' && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setReschedulingFup(fup)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setCompletingFup(fup)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark Complete
                      </button>
                    </div>
                  )}

                  {fup.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0 self-end sm:self-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================== SCHEDULE NEW FOLLOW-UP MODAL ===================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Schedule New Follow-up</h3>
                  <p className="text-xs text-slate-500">Add a reminder or callback to your sales queue.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {/* Target Type Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Link Follow-up To</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateContactType('lead')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      createContactType === 'lead'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Active Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateContactType('customer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      createContactType === 'customer'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Existing Customer
                  </button>
                </div>
              </div>

              {/* Lead or Customer Select */}
              {createContactType === 'lead' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Lead</label>
                  <select
                    value={createLeadId}
                    onChange={(e) => setCreateLeadId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Choose Lead (or General Reminder) --</option>
                    {leadsList.map((ld) => (
                      <option key={ld.id} value={ld.id}>
                        {ld.lead_code} - {ld.customer_name} ({ld.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Customer</label>
                  <select
                    value={createCustomerId}
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_code} - {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scheduled Date & Time */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={createScheduledAt}
                  onChange={(e) => setCreateScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose / Touchpoint Title *</label>
                <input
                  type="text"
                  required
                  value={createPurpose}
                  onChange={(e) => setCreatePurpose(e.target.value)}
                  placeholder="e.g. Discovery Call, Quote Review, Technical Q&A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discussion Agenda / Notes</label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Details on what to discuss..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== COMPLETE FOLLOW-UP MODAL ===================== */}
      {completingFup && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Complete: {completingFup.lead_name || completingFup.customer_name}
              </h3>
              <button onClick={() => setCompletingFup(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Outcome *</label>
                <input
                  type="text"
                  required
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  placeholder="e.g. Discussed pricing; agreed to meet tomorrow"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Notes</label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Additional conversation notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              {/* Seamless Schedule Next Follow-up Option */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={scheduleNext}
                    onChange={(e) => setScheduleNext(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Schedule next follow-up immediately
                </label>

                {scheduleNext && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Next Date & Time</label>
                      <input
                        type="datetime-local"
                        required={scheduleNext}
                        value={nextScheduledAt}
                        onChange={(e) => setNextScheduledAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Next Purpose</label>
                      <input
                        type="text"
                        value={nextPurpose}
                        onChange={(e) => setNextPurpose(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingFup(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== RESCHEDULE MODAL ===================== */}
      {reschedulingFup && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Reschedule Follow-up</h3>
            <p className="text-xs text-slate-500 mt-1">Select a new date and time for this reminder.</p>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Reason for rescheduling..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingFup(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
