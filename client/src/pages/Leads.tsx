import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Search,
  Building,
  UserCheck,
  Clock,
  CheckCircle,
  MessageSquare,
  PhoneCall,
  X,
  Send,
  Pencil,
  Loader2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { Lead, FunnelStage, LeadSource, User, LeadTag } from '../types';
import { useAuth } from '../context/AuthContext';
import { TagPicker, TagChips } from '../components/TagPicker';
import { LeadImportModal } from '../components/LeadImportModal';

interface LeadsProps {
  onOpenCustomer: (customerId: string) => void;
  openCreateModalTrigger?: number;
  initialLeadId?: string;
}

export const Leads: React.FC<LeadsProps> = ({ onOpenCustomer, openCreateModalTrigger, initialLeadId }) => {
  const { user, hasPermission } = useAuth();
  const canBulk = hasPermission('bulk_actions');
  const canDeleteLead = hasPermission('delete_leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [createError, setCreateError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, converted, lost

  // Selection for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkStageId, setBulkStageId] = useState('');

  // Modals / Detail drawer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);

  // Inline activity form (inside detail drawer)
  const [activityType, setActivityType] = useState<'call' | 'whatsapp' | 'email' | 'meeting' | 'note'>('call');
  const [activityOutcome, setActivityOutcome] = useState('Interested - Callback requested');
  const [activityNotes, setActivityNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupPurpose, setFollowupPurpose] = useState('Callback scheduled');

  // Editable lead fields inside drawer
  const [editForm, setEditForm] = useState({
    customer_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    company_name: '',
    city: '',
    lead_source: '',
    assigned_agent_id: '',
    stage_id: '',
    priority: 'Medium',
    conversion_likelihood: 'Medium',
    estimated_deal_value: 0,
    notes: '',
    tag_ids: [] as string[]
  });

  // Quick Action Form State (compact modal)
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
    next_followup_at: '',
    tag_ids: [] as string[]
  });

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [leadsRes, stagesRes, sourcesRes, usersRes, tagsRes] = await Promise.all([
        api.getLeads({
          search: search || undefined,
          stage_id: stageFilter || undefined,
          source: sourceFilter || undefined,
          agent_id: agentFilter || undefined,
          priority: priorityFilter || undefined,
          tag_id: tagFilter || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 200
        }),
        api.getFunnelStages(),
        api.getSources(),
        api.getUsers(),
        api.getTags()
      ]);

      setLeads(leadsRes.data || []);
      setStages(stagesRes || []);
      setSources(sourcesRes || []);
      setUsers(usersRes || []);
      setAllTags(tagsRes || []);
    } catch (err: any) {
      console.error('Failed to load leads data:', err);
      setLoadError(err.message || 'Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, stageFilter, sourceFilter, agentFilter, priorityFilter, tagFilter, statusFilter]);

  useEffect(() => {
    if (openCreateModalTrigger && openCreateModalTrigger > 0) {
      setShowCreateModal(true);
      setCreateError('');
    }
  }, [openCreateModalTrigger]);

  useEffect(() => {
    if (initialLeadId) {
      api.getLeadById(initialLeadId).then((res) => {
        const targetLead = res?.lead || res;
        if (targetLead?.id) {
          handleOpenLeadDetails(targetLead);
        }
      }).catch(console.error);
    }
  }, [initialLeadId]);

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

  const syncEditForm = (lead: Lead) => {
    setEditForm({
      customer_name: lead.customer_name || '',
      phone: lead.phone || '',
      alternate_phone: lead.alternate_phone || '',
      email: lead.email || '',
      company_name: lead.company_name || '',
      city: lead.city || '',
      lead_source: lead.lead_source || '',
      assigned_agent_id: lead.assigned_agent_id || '',
      stage_id: lead.stage_id || '',
      priority: lead.priority || 'Medium',
      conversion_likelihood: lead.conversion_likelihood || 'Medium',
      estimated_deal_value: Number(lead.estimated_deal_value) || 0,
      notes: lead.notes || '',
      tag_ids: (lead.tags || []).map((t) => t.id)
    });
  };

  const [deletingLead, setDeletingLead] = useState(false);

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
      return;
    }
    setDeletingLead(true);
    try {
      await api.deleteLead(leadId);
      setShowDetailDrawer(false);
      setSelectedLead(null);
      setLeadDetails(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead');
    } finally {
      setDeletingLead(false);
    }
  };

  const handleConvertToCustomer = async (lead: Lead) => {
    if (!window.confirm(`Convert "${lead.customer_name}" to an official customer profile?`)) {
      return;
    }
    try {
      const res = await api.convertLeadToCustomer(lead.id);
      alert(res.message);
      setShowDetailDrawer(false);
      setSelectedLead(null);
      setLeadDetails(null);
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
    syncEditForm(lead);
    setShowDetailDrawer(true);
    setLoadingLeadDetails(true);
    try {
      const details = await api.getLeadById(lead.id);
      setLeadDetails(details);
      const fresh = details?.lead || details;
      if (fresh?.id) {
        setSelectedLead(fresh);
        syncEditForm(fresh);
      }
    } catch (err: any) {
      alert(err.message);
      setShowDetailDrawer(false);
      setSelectedLead(null);
    } finally {
      setLoadingLeadDetails(false);
    }
  };

  const refreshSelectedLead = async (leadId: string) => {
    const details = await api.getLeadById(leadId);
    setLeadDetails(details);
    const fresh = details?.lead || details;
    if (fresh?.id) {
      setSelectedLead(fresh);
      syncEditForm(fresh);
    }
    loadData();
  };

  const [tagSaving, setTagSaving] = useState(false);
  const [tagSavedFeedback, setTagSavedFeedback] = useState(false);

  const handleTagToggleRealtime = async (newTagIds: string[], updatedAllTags?: LeadTag[]) => {
    // 1. Immediately update editForm local state so the pill toggles without any UI lag
    setEditForm((prev) => ({ ...prev, tag_ids: newTagIds }));

    if (!selectedLead) return;

    // 2. Optimistically update selectedLead.tags and leads list in real-time
    const sourceTags = updatedAllTags || allTags;
    const updatedTagObjects = sourceTags.filter((t) => newTagIds.includes(t.id));
    setSelectedLead((prev) => (prev ? { ...prev, tags: updatedTagObjects } : null));
    setLeads((prev) =>
      prev.map((l) => (l.id === selectedLead.id ? { ...l, tags: updatedTagObjects } : l))
    );

    // 3. Persist to server in real-time
    setTagSaving(true);
    try {
      await api.updateLeadTags(selectedLead.id, newTagIds);
      setTagSavedFeedback(true);
      setTimeout(() => setTagSavedFeedback(false), 2200);
    } catch (err: any) {
      console.error('Failed to update lead tags in real-time:', err);
      // Revert if API failed
      refreshSelectedLead(selectedLead.id);
    } finally {
      setTagSaving(false);
    }
  };

  const handleSaveLeadUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSavingLead(true);
    try {
      await api.updateLead(selectedLead.id, {
        ...editForm,
        estimated_deal_value: Number(editForm.estimated_deal_value) || 0,
        assigned_agent_id: editForm.assigned_agent_id || null,
        tag_ids: editForm.tag_ids
      });
      await refreshSelectedLead(selectedLead.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLead(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSavingActivity(true);
    try {
      await api.addLeadActivity(selectedLead.id, {
        activity_type: activityType,
        title: `${activityType.toUpperCase()}: ${activityOutcome}`,
        notes: activityNotes,
        outcome: activityOutcome,
        next_followup_at: nextFollowupDate || undefined,
        follow_up_purpose: followupPurpose || 'Follow-up discussion'
      });
      setActivityNotes('');
      setNextFollowupDate('');
      await refreshSelectedLead(selectedLead.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleCloseDetails = () => {
    setShowDetailDrawer(false);
    setSelectedLead(null);
    setLeadDetails(null);
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
      await refreshSelectedLead(selectedLead.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      const payload = {
        ...newLead,
        assigned_agent_id: newLead.assigned_agent_id || undefined,
        stage_id: newLead.stage_id || undefined,
        next_followup_at: newLead.next_followup_at || undefined,
        tag_ids: newLead.tag_ids || []
      };
      await api.createLead(payload);
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
        next_followup_at: '',
        tag_ids: []
      });
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create lead');
    }
  };

  return (
    <div className="page-wrap">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="title-icon">
              <Users2 className="w-5 h-5" />
            </span>
            <span className="leading-tight">Lead Management System</span>
          </h1>
          <p className="page-subtitle sm:ml-[3.25rem]">
            Track inquiries, manage agents, and convert leads to customers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200/90 rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer flex-1 sm:flex-none active:scale-95"
            title="Import leads from Excel spreadsheet (.xls / .xlsx / .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import .XLS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button type="button" onClick={() => loadData()} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="filter-bar space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
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

          {/* Tag Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Action Toolbar if items selected */}
        {canBulk && selectedLeadIds.length > 0 && (
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
      <div className="panel-flush">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Lead Code</th>
                <th className="py-3 px-3 min-w-[150px] whitespace-nowrap">Customer / Company</th>
                <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">Tags</th>
                <th className="py-3 px-3 whitespace-nowrap">Contact</th>
                <th className="py-3 px-3 whitespace-nowrap">Source</th>
                <th className="py-3 px-3 whitespace-nowrap">Funnel Stage</th>
                <th className="py-3 px-3 whitespace-nowrap">Assigned Agent</th>
                <th className="py-3 px-3 whitespace-nowrap">Priority</th>
                <th className="py-3 px-3 whitespace-nowrap">Deal Value</th>
                <th className="py-3 px-3 whitespace-nowrap">Next Follow-up</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    Loading database records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
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
                      onClick={() => handleOpenLeadDetails(lead)}
                      className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectLead(lead.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {lead.lead_code}
                        </span>
                      </td>
                      <td className="py-3 px-3 min-w-[150px]">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">{lead.customer_name}</div>
                        {lead.company_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                            <Building className="w-3 h-3 shrink-0" />
                            {lead.company_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {lead.tags?.length ? (
                          <TagChips tags={lead.tags} max={3} />
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-800">{lead.phone}</div>
                        {lead.email && <div className="text-[11px] text-slate-400">{lead.email}</div>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-medium">
                          {lead.lead_source}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-xs inline-block"
                          style={{ backgroundColor: lead.stage_color || '#3b82f6' }}
                        >
                          {lead.stage_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-800 font-medium">
                          {lead.assigned_agent_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
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
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{(lead.estimated_deal_value || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
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
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              syncEditForm(lead);
                              setShowQuickActionModal(true);
                            }}
                            title="Quick Call / Activity Log"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

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
              {createError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                  {createError}
                </div>
              )}
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

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <TagPicker
                  tags={allTags}
                  selectedIds={newLead.tag_ids}
                  onChange={(ids) => setNewLead({ ...newLead, tag_ids: ids })}
                  onTagsChange={setAllTags}
                  label="Lead Tags (multi-select)"
                  allowCreate
                />
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

      {/* LEAD DETAILS DRAWER — same manage flow as Sales Funnel */}
      {showDetailDrawer && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end" onClick={handleCloseDetails}>
          <div
            className="bg-white w-full max-w-2xl h-full shadow-2xl p-4 sm:p-6 overflow-y-auto animate-fade-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingLeadDetails && !leadDetails ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                Loading lead details...
              </div>
            ) : (
              <>
                <div className="space-y-5 flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          {selectedLead.lead_code}
                        </span>
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: selectedLead.stage_color || '#3b82f6' }}
                        >
                          {selectedLead.stage_name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            selectedLead.priority === 'Urgent'
                              ? 'bg-red-100 text-red-700'
                              : selectedLead.priority === 'High'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {selectedLead.priority}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-1.5 truncate">
                        {selectedLead.customer_name}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Agent: {selectedLead.assigned_agent_name || 'Unassigned'} • Deal ₹
                        {Number(selectedLead.estimated_deal_value || 0).toLocaleString()}
                      </p>
                      {(selectedLead.tags?.length || 0) > 0 && (
                        <div className="mt-2">
                          <TagChips tags={selectedLead.tags} max={6} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleCloseDetails}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-lg shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Update Lead Details */}
                  <form onSubmit={handleSaveLeadUpdates} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                      Update Lead Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Customer Name</label>
                        <input
                          type="text"
                          required
                          value={editForm.customer_name}
                          onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Phone</label>
                        <input
                          type="text"
                          required
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Company</label>
                        <input
                          type="text"
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Lead Source</label>
                        <select
                          value={editForm.lead_source}
                          onChange={(e) => setEditForm({ ...editForm, lead_source: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        >
                          {sources.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Funnel Stage</label>
                        <select
                          value={editForm.stage_id}
                          onChange={(e) => setEditForm({ ...editForm, stage_id: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                          disabled={!!selectedLead.is_converted}
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Assigned Agent</label>
                        <select
                          value={editForm.assigned_agent_id}
                          onChange={(e) => setEditForm({ ...editForm, assigned_agent_id: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
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
                        <label className="block font-semibold text-slate-600 mb-1">Priority</label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Deal Value (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.estimated_deal_value}
                          onChange={(e) =>
                            setEditForm({ ...editForm, estimated_deal_value: Number(e.target.value) })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1 text-xs">Internal Notes</label>
                      <textarea
                        rows={2}
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        placeholder="Any remarks about this lead..."
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          Lead Tags
                          {tagSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                          {tagSavedFeedback && (
                            <span className="text-[11px] font-bold text-emerald-600 animate-fade-in flex items-center gap-1">
                              ✓ Saved in real-time
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Click tag to toggle instantly
                        </span>
                      </div>
                      <TagPicker
                        tags={allTags}
                        selectedIds={editForm.tag_ids}
                        onChange={handleTagToggleRealtime}
                        onTagsChange={(newTags) => {
                          setAllTags(newTags);
                        }}
                        label=""
                        allowCreate
                        isSaving={tagSaving}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingLead || !!selectedLead.is_converted}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        {savingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        Save Updates
                      </button>
                    </div>
                  </form>

                  {/* Log Conversation */}
                  {!selectedLead.is_converted && (
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/80 space-y-3">
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        Log Conversation & Next Follow-up
                      </h3>

                      <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Interaction Type</label>
                            <select
                              value={activityType}
                              onChange={(e) => setActivityType(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl"
                            >
                              <option value="call">Phone Call</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="meeting">Meeting</option>
                              <option value="email">Email</option>
                              <option value="note">Note</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Discussion Outcome</label>
                            <select
                              value={activityOutcome}
                              onChange={(e) => setActivityOutcome(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl"
                            >
                              <option value="Interested - Callback requested">Interested - Callback requested</option>
                              <option value="Quotation / Proposal Sent">Quotation / Proposal Sent</option>
                              <option value="Connected - Discussion in progress">Connected - Discussion in progress</option>
                              <option value="Pricing Negotiation">Pricing Negotiation</option>
                              <option value="Deal Confirmed">Deal Confirmed</option>
                              <option value="No Answer / Busy">No Answer / Busy</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Conversation Notes</label>
                          <textarea
                            rows={2}
                            value={activityNotes}
                            onChange={(e) => setActivityNotes(e.target.value)}
                            placeholder="Conversation highlights, requirements, pricing remarks..."
                            className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Schedule Next Follow-up</label>
                            <input
                              type="datetime-local"
                              value={nextFollowupDate}
                              onChange={(e) => setNextFollowupDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Follow-up Purpose</label>
                            <input
                              type="text"
                              value={followupPurpose}
                              onChange={(e) => setFollowupPurpose(e.target.value)}
                              placeholder="Purpose of next touchpoint"
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingActivity}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
                          >
                            {savingActivity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Save Interaction
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Follow-ups */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Scheduled Follow-ups ({leadDetails?.followups?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {!leadDetails?.followups?.length ? (
                        <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-xs border border-dashed border-slate-200 text-center">
                          No follow-ups scheduled for this lead.
                        </div>
                      ) : (
                        leadDetails.followups.map((fup: any) => {
                          const isOverdue =
                            new Date(fup.scheduled_at) < new Date() && fup.status === 'pending';
                          return (
                            <div
                              key={fup.id}
                              className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between text-xs gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 truncate">{fup.purpose}</span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      fup.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : isOverdue
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {fup.status === 'completed'
                                      ? 'Completed'
                                      : isOverdue
                                      ? 'Overdue'
                                      : 'Scheduled'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {new Date(fup.scheduled_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}{' '}
                                  • {fup.assigned_user_name || 'Agent'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Conversation & Activity Timeline ({leadDetails?.activities?.length || 0})
                    </h3>
                    <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {!leadDetails?.activities?.length ? (
                        <p className="text-xs text-slate-400 pl-7">No conversations logged yet.</p>
                      ) : (
                        leadDetails.activities.map((act: any) => (
                          <div key={act.id} className="relative pl-7 text-xs">
                            <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600"></div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between gap-2 font-bold text-slate-900">
                                <span className="truncate">{act.title}</span>
                                <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                  {new Date(act.created_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {act.outcome && (
                                <div className="text-[11px] font-semibold text-emerald-600">
                                  Outcome: {act.outcome}
                                </div>
                              )}
                              {act.notes && <p className="text-slate-600 text-[11px]">{act.notes}</p>}
                              <div className="text-[10px] text-slate-400">
                                Logged by: {act.user_name || 'System'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sticky bottom-0 bg-white">
                  <button
                    onClick={handleCloseDetails}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                  {canDeleteLead && !selectedLead.is_converted && (
                    <button
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      disabled={deletingLead}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      title="Permanently remove lead from CRM"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      {deletingLead ? 'Deleting...' : 'Delete Lead'}
                    </button>
                  )}
                  {!selectedLead.is_converted ? (
                    <button
                      onClick={() => handleConvertToCustomer(selectedLead)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Convert to Customer
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (selectedLead.converted_customer_id) {
                          onOpenCustomer(selectedLead.converted_customer_id);
                        }
                      }}
                      className="flex-1 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold"
                    >
                      View Customer Profile
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ================= BULK XLS IMPORT MODAL ================= */}
      <LeadImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadData();
        }}
        sources={sources}
        agents={users}
      />
    </div>
  );
};
