import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  UserCheck,
  Clock,
  MoreVertical,
  CheckCircle,
  Calendar,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  Sparkles,
  PhoneCall,
  X,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { Lead, FunnelStage, LeadSource, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface LeadsProps {
  onOpenCustomer: (customerId: string) => void;
  openCreateModalTrigger?: boolean;
}

export const Leads: React.FC<LeadsProps> = ({ onOpenCustomer }) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, converted, lost

  // Selection for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkStageId, setBulkStageId] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);

  // Quick Action Form State
  const [quickActivityType, setQuickActivityType] = useState('call');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickOutcome, setQuickOutcome] = useState('Interested - Callback requested');
  const [quickNextFollowup, setQuickNextFollowup] = useState('');

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    customer_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    company_name: '',
    city: '',
    lead_source: 'Website',
    campaign_name: '',
    assigned_agent_id: '',
    stage_id: '',
    priority: 'Medium',
    conversion_likelihood: 'Medium',
    estimated_deal_value: 0,
    notes: '',
    next_followup_at: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsRes, stagesRes, sourcesRes, usersRes] = await Promise.all([
        api.getLeads({
          search,
          stage_id: stageFilter,
          source: sourceFilter,
          agent_id: agentFilter,
          priority: priorityFilter,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }),
        api.getFunnelStages(),
        api.getSources(),
        api.getUsers()
      ]);

      setLeads(leadsRes.data || []);
      setStages(stagesRes || []);
      setSources(sourcesRes || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error('Failed to load leads data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, stageFilter, sourceFilter, agentFilter, priorityFilter, statusFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(leads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAgentId || selectedLeadIds.length === 0) return;
    try {
      await api.bulkAssignLeads(selectedLeadIds, bulkAgentId);
      setSelectedLeadIds([]);
      setBulkAgentId('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkStatus = async () => {
    if (!bulkStageId || selectedLeadIds.length === 0) return;
    try {
      await api.bulkStatusUpdate(selectedLeadIds, bulkStageId);
      setSelectedLeadIds([]);
      setBulkStageId('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvertToCustomer = async (lead: Lead) => {
    if (!window.confirm(`Convert "${lead.customer_name}" to an official customer profile?`)) {
      return;
    }
    try {
      const res = await api.convertLeadToCustomer(lead.id);
      alert(res.message);
      loadData();
      if (res.customer_id) {
        onOpenCustomer(res.customer_id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    try {
      const details = await api.getLeadById(lead.id);
      setLeadDetails(details);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      await api.addLeadActivity(selectedLead.id, {
        activity_type: quickActivityType,
        title: `${quickActivityType.toUpperCase()}: ${quickOutcome}`,
        notes: quickNotes,
        outcome: quickOutcome,
        next_followup_at: quickNextFollowup || undefined
      });

      setShowQuickActionModal(false);
      setQuickNotes('');
      setQuickNextFollowup('');
      loadData();
      if (selectedLead) {
        handleOpenLeadDetails(selectedLead);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLead(newLead);
      setShowCreateModal(false);
      setNewLead({
        customer_name: '',
        phone: '',
        alternate_phone: '',
        email: '',
        company_name: '',
        city: '',
        lead_source: 'Website',
        campaign_name: '',
        assigned_agent_id: '',
        stage_id: '',
        priority: 'Medium',
        conversion_likelihood: 'Medium',
        estimated_deal_value: 0,
        notes: '',
        next_followup_at: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-emerald-600" />
            Lead Management System
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track inquiries, manage assigned agents, record call activities, and convert to customers.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Lead Code, Phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Pipeline Stages</option>
            {stages.map((stg) => (
              <option key={stg.id} value={stg.id}>
                {stg.name}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Lead Sources</option>
            {sources.map((src) => (
              <option key={src.id} value={src.name}>
                {src.name}
              </option>
            ))}
          </select>

          {/* Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Assigned Agents</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="converted">Converted Only</option>
            <option value="lost">Lost Only</option>
          </select>
        </div>

        {/* Bulk Action Toolbar if items selected */}
        {selectedLeadIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 bg-emerald-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
            <span className="text-xs font-bold text-emerald-900">
              {selectedLeadIds.length} lead(s) selected:
            </span>

            {/* Bulk Assign */}
            <div className="flex items-center gap-2">
              <select
                value={bulkAgentId}
                onChange={(e) => setBulkAgentId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="">Assign To Agent...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAgentId}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
              >
                Reassign
              </button>
            </div>

            {/* Bulk Stage */}
            <div className="flex items-center gap-2">
              <select
                value={bulkStageId}
                onChange={(e) => setBulkStageId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="">Move To Stage...</option>
                {stages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkStatus}
                disabled={!bulkStageId}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
              >
                Update Stage
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="py-3 px-3">Lead Code</th>
                <th className="py-3 px-3">Customer / Company</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Funnel Stage</th>
                <th className="py-3 px-3">Assigned Agent</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Deal Value</th>
                <th className="py-3 px-3">Next Follow-up</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    Loading database records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isOverdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectLead(lead.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleOpenLeadDetails(lead)}
                          className="font-mono font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          {lead.lead_code}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{lead.customer_name}</div>
                        {lead.company_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {lead.company_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-800">{lead.phone}</div>
                        {lead.email && <div className="text-[11px] text-slate-400">{lead.email}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
                          {lead.lead_source}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-xs"
                          style={{ backgroundColor: lead.stage_color || '#3b82f6' }}
                        >
                          {lead.stage_name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-800 font-medium">
                          {lead.assigned_agent_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            lead.priority === 'Urgent'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : lead.priority === 'High'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ₹{(lead.estimated_deal_value || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        {lead.next_followup_at ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 w-max ${
                              isOverdue
                                ? 'bg-red-100 text-red-700 font-bold animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {new Date(lead.next_followup_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Activity Button */}
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowQuickActionModal(true);
                            }}
                            title="Quick Call / Activity Log"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

                          {/* ONE-CLICK CONVERT TO CUSTOMER */}
                          {lead.is_converted ? (
                            <button
                              onClick={() => lead.converted_customer_id && onOpenCustomer(lead.converted_customer_id)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Customer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConvertToCustomer(lead)}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Convert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD NEW LEAD */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Create New Lead
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.customer_name}
                    onChange={(e) => setNewLead({ ...newLead, customer_name: e.target.value })}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 (555) 010-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="vikram@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    placeholder="Malhotra Logistics"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source *</label>
                  <select
                    value={newLead.lead_source}
                    onChange={(e) => setNewLead({ ...newLead, lead_source: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Agent</label>
                  <select
                    value={newLead.assigned_agent_id}
                    onChange={(e) => setNewLead({ ...newLead, assigned_agent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newLead.priority}
                    onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Deal Value (₹)</label>
                  <input
                    type="number"
                    value={newLead.estimated_deal_value}
                    onChange={(e) => setNewLead({ ...newLead, estimated_deal_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Schedule First Follow-up</label>
                  <input
                    type="datetime-local"
                    value={newLead.next_followup_at}
                    onChange={(e) => setNewLead({ ...newLead, next_followup_at: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lead Notes & Requirements</label>
                <textarea
                  rows={3}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Key customer requirements, timeline, budget notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL: Call Outcome / Log Activity */}
      {showQuickActionModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Quick Action: {selectedLead.customer_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedLead.lead_code} • {selectedLead.phone}</p>
              </div>
              <button
                onClick={() => setShowQuickActionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickActionSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={quickActivityType}
                  onChange={(e) => setQuickActivityType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp Message</option>
                  <option value="email">Email</option>
                  <option value="meeting">Online / In-person Meeting</option>
                  <option value="note">Internal Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Call / Interaction Outcome</label>
                <select
                  value={quickOutcome}
                  onChange={(e) => setQuickOutcome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Interested - Callback requested">Interested - Callback requested</option>
                  <option value="Quotation / Proposal Requested">Quotation / Proposal Requested</option>
                  <option value="Connected - Discussion in progress">Connected - Discussion in progress</option>
                  <option value="No Answer / Switched Off">No Answer / Switched Off</option>
                  <option value="Deal Confirmed">Deal Confirmed</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Details</label>
                <textarea
                  rows={2}
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="Summarize the client discussion..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Schedule Next Follow-up (Optional)</label>
                <input
                  type="datetime-local"
                  value={quickNextFollowup}
                  onChange={(e) => setQuickNextFollowup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickActionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAILS DRAWER / SLIDE-OVER */}
      {selectedLead && leadDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto animate-fade-in flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {selectedLead.lead_code}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: selectedLead.stage_color || '#3b82f6' }}
                    >
                      {selectedLead.stage_name}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                    {selectedLead.customer_name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedLead(null);
                    setLeadDetails(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact Info Card */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Primary Phone:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedLead.phone}</span>
                </div>
                {selectedLead.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <span className="text-slate-800">{selectedLead.email}</span>
                  </div>
                )}
                {selectedLead.company_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Company:</span>
                    <span className="text-slate-800 font-semibold">{selectedLead.company_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Assigned Agent:</span>
                  <span className="text-emerald-600 font-bold">{selectedLead.assigned_agent_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Estimated Deal:</span>
                  <span className="text-emerald-600 font-bold font-mono">
                    ₹{Number(selectedLead.estimated_deal_value).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Complete Activity Timeline */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Activity Timeline & Interactions
                </h3>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {leadDetails.activities?.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-7">No activity history yet.</p>
                  ) : (
                    leadDetails.activities?.map((act: any) => (
                      <div key={act.id} className="relative pl-7 text-xs">
                        <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600"></div>
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>{act.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(act.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {act.notes && <p className="text-slate-600 mt-0.5">{act.notes}</p>}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Logged by: {act.user_name || 'System'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => {
                  setShowQuickActionModal(true);
                }}
                className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
              >
                Log Call / Outcome
              </button>
              {!selectedLead.is_converted && (
                <button
                  onClick={() => handleConvertToCustomer(selectedLead)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  Convert to Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
