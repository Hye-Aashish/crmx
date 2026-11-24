import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Search,
  Filter,
  DollarSign,
  Clock,
  Phone,
  Building,
  AlertCircle,
  CheckCircle2,
  X,
  MoreVertical,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  PhoneCall,
  Calendar,
  Send,
  UserCheck,
  Check,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Settings2,
  SlidersHorizontal,
  MoveHorizontal
} from 'lucide-react';
import { api } from '../services/api';
import { Lead, FunnelStage, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface PipelineProps {
  onOpenCustomer: (customerId: string) => void;
}

export const Pipeline: React.FC<PipelineProps> = ({ onOpenCustomer }) => {
  const { user } = useAuth();
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Dragging state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Lost reason dialog state
  const [lostDialogLead, setLostDialogLead] = useState<{ id: string; stageId: string } | null>(null);
  const [lostReason, setLostReason] = useState('Competitor offered lower pricing');

  // Stage Management Modals
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');

  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#6366f1');

  const [deletingStage, setDeletingStage] = useState<FunnelStage | null>(null);
  const [fallbackStageId, setFallbackStageId] = useState('');

  // Stage Reordering Modal State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [orderedStagesList, setOrderedStagesList] = useState<FunnelStage[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Lead Details & Follow-up Drawer/Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false);

  // Quick Action / Conversation Log in Details Modal
  const [activityType, setActivityType] = useState<'call' | 'whatsapp' | 'email' | 'meeting' | 'note'>('call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('Discussion in progress');
  const [activityNotes, setActivityNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupPurpose, setFollowupPurpose] = useState('Callback scheduled');

  const colorPresets = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#10b981', '#14b8a6', '#06b6d4'
  ];

  const loadPipeline = async () => {
    try {
      const [stagesRes, leadsRes, usersRes] = await Promise.all([
        api.getFunnelStages(),
        api.getLeads({
          search,
          agent_id: agentFilter,
          priority: priorityFilter,
          status: 'all',
          limit: 200
        }),
        api.getUsers()
      ]);

      setStages(stagesRes || []);
      setLeads(leadsRes.data || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [search, agentFilter, priorityFilter]);

  // Lead Details Fetcher
  const handleOpenLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setLoadingLeadDetails(true);
    try {
      const res = await api.getLeadById(lead.id);
      setLeadDetails(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingLeadDetails(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === targetStageId) {
      setDraggedLeadId(null);
      return;
    }

    const targetStage = stages.find((s) => s.id === targetStageId);

    if (targetStage?.name === 'Lost') {
      setLostDialogLead({ id: leadId, stageId: targetStageId });
      setDraggedLeadId(null);
      return;
    }

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage_id: targetStageId, stage_name: targetStage?.name } : l))
    );
    setDraggedLeadId(null);

    try {
      await api.updateLeadStage(leadId, targetStageId);
      loadPipeline();
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
      loadPipeline();
    }
  };

  const handleConfirmLostReason = async () => {
    if (!lostDialogLead) return;
    try {
      await api.updateLeadStage(lostDialogLead.id, lostDialogLead.stageId, lostReason);
      setLostDialogLead(null);
      loadPipeline();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Stage
  const handleAddStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    try {
      await api.createFunnelStage({
        name: newStageName.trim(),
        color: newStageColor
      });
      setShowAddStageModal(false);
      setNewStageName('');
      loadPipeline();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Edit Stage
  const handleEditStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !editStageName.trim()) return;

    try {
      await api.updateFunnelStage(editingStage.id, {
        name: editStageName.trim(),
        color: editStageColor
      });
      setEditingStage(null);
      loadPipeline();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Stage
  const handleDeleteStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingStage) return;

    try {
      await api.deleteFunnelStage(deletingStage.id, fallbackStageId || undefined);
      setDeletingStage(null);
      setFallbackStageId('');
      loadPipeline();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Quick move stage left or right
  const handleMoveStage = async (stageId: string, direction: 'left' | 'right') => {
    const currentIndex = stages.findIndex((s) => s.id === stageId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const [movedStage] = newStages.splice(currentIndex, 1);
    newStages.splice(targetIndex, 0, movedStage);

    // Optimistic UI update
    setStages(newStages);

    try {
      const payload = newStages.map((s, idx) => ({ id: s.id, order_index: idx + 1 }));
      await api.updateFunnelStages(payload);
      loadPipeline();
    } catch (err: any) {
      alert('Failed to reorder stage: ' + err.message);
      loadPipeline();
    }
  };

  // Open Reorder Modal
  const handleOpenReorderModal = () => {
    setOrderedStagesList([...stages]);
    setShowReorderModal(true);
  };

  // Move stage inside modal list
  const handleModalMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedStagesList.length) return;

    const updated = [...orderedStagesList];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    setOrderedStagesList(updated);
  };

  // Save full reordered sequence
  const handleSaveReorderedStages = async () => {
    setIsSavingOrder(true);
    try {
      const payload = orderedStagesList.map((s, idx) => ({ id: s.id, order_index: idx + 1 }));
      await api.updateFunnelStages(payload);
      setShowReorderModal(false);
      loadPipeline();
    } catch (err: any) {
      alert('Failed to save stage order: ' + err.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Add Activity / Follow-up inside Lead Details
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      await api.addLeadActivity(selectedLead.id, {
        activity_type: activityType,
        title: activityTitle || `${activityType.toUpperCase()}: ${activityOutcome}`,
        notes: activityNotes,
        outcome: activityOutcome,
        next_followup_at: nextFollowupDate || undefined,
        follow_up_purpose: followupPurpose || 'Follow-up discussion'
      });

      // Reset activity inputs
      setActivityTitle('');
      setActivityNotes('');
      setNextFollowupDate('');

      // Refresh both pipeline and current lead details
      loadPipeline();
      const updatedDetails = await api.getLeadById(selectedLead.id);
      setLeadDetails(updatedDetails);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Convert Lead To Customer
  const handleConvertLead = async (leadId: string) => {
    if (!window.confirm('Convert this lead into an official customer profile?')) return;
    try {
      const res = await api.convertLeadToCustomer(leadId);
      alert(res.message);
      setSelectedLead(null);
      loadPipeline();
      if (res.customer_id) {
        onOpenCustomer(res.customer_id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-emerald-600" />
            Visual Sales Funnel & Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Click any lead card for complete details, follow-ups & timeline. Add, edit, or delete stages anytime.
          </p>
        </div>

        {/* Right Controls: Filters & Add Stage Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads in pipeline..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Agents</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Reorder Stages Button */}
          <button
            onClick={handleOpenReorderModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Reorder stage sequence (which stage comes before/after)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Reorder Stages
          </button>

          {/* Add Stage Button */}
          <button
            onClick={() => setShowAddStageModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4 pt-1">
        <div className="flex gap-4 h-full min-w-max">
          {stages.map((stage, stageIndex) => {
            const stageLeads = leads.filter((l) => l.stage_id === stage.id);
            const totalDealValue = stageLeads.reduce(
              (sum, l) => sum + (Number(l.estimated_deal_value) || 0),
              0
            );

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-80 flex flex-col bg-slate-100/70 border border-slate-200/90 rounded-2xl p-3 shrink-0 shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Stage Header */}
                <div className="pb-3 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate max-w-[150px]">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: stage.color || '#3b82f6' }}
                      ></span>
                      <h3 className="text-xs font-bold text-slate-900 truncate" title={stage.name}>
                        {stage.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move Left Button */}
                      <button
                        onClick={() => handleMoveStage(stage.id, 'left')}
                        disabled={stageIndex === 0}
                        title="Move stage left (earlier)"
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>

                      {/* Move Right Button */}
                      <button
                        onClick={() => handleMoveStage(stage.id, 'right')}
                        disabled={stageIndex === stages.length - 1}
                        title="Move stage right (later)"
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 shadow-xs">
                        {stageLeads.length}
                      </span>

                      {/* Edit Stage Button */}
                      <button
                        onClick={() => {
                          setEditingStage(stage);
                          setEditStageName(stage.name);
                          setEditStageColor(stage.color || '#3b82f6');
                        }}
                        title="Edit Stage"
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {/* Delete Stage Button */}
                      <button
                        onClick={() => {
                          setDeletingStage(stage);
                          const alt = stages.find((s) => s.id !== stage.id);
                          setFallbackStageId(alt?.id || '');
                        }}
                        title="Delete Stage"
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Total Value:</span>
                    <span className="font-bold text-slate-800">
                      ₹{totalDealValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cards List in this Stage */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400 font-medium">
                      Drop leads here
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const isOverdue =
                        lead.next_followup_at && new Date(lead.next_followup_at) < new Date();

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => handleOpenLeadDetails(lead)}
                          className={`p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-2 select-none group relative ${
                            draggedLeadId === lead.id ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          {/* Top Row: Code & Priority */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {lead.lead_code}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                lead.priority === 'Urgent'
                                  ? 'bg-red-100 text-red-700'
                                  : lead.priority === 'High'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {lead.priority}
                            </span>
                          </div>

                          {/* Customer Name & Company */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {lead.customer_name}
                            </h4>
                            {lead.company_name && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                <Building className="w-3 h-3 shrink-0" />
                                {lead.company_name}
                              </p>
                            )}
                          </div>

                          {/* Contact & Deal Value */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.phone}
                            </span>
                            <span className="font-bold text-emerald-600 font-mono">
                              ₹{(lead.estimated_deal_value || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Footer: Follow-up & Agent */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span className="truncate max-w-[110px]">
                              {lead.assigned_agent_name ? `👤 ${lead.assigned_agent_name}` : 'Unassigned'}
                            </span>
                            {lead.next_followup_at && (
                              <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                  isOverdue
                                    ? 'bg-red-50 text-red-600 font-bold'
                                    : 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(lead.next_followup_at).toLocaleDateString([], {
                                  month: 'numeric',
                                  day: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: ADD STAGE */}
      {showAddStageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add New Funnel Stage
              </h3>
              <button onClick={() => setShowAddStageModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStageSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stage Name *</label>
                <input
                  type="text"
                  required
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. Demonstration Completed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Stage Accent Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStageColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newStageColor === c ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20"
                >
                  Create Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAGE */}
      {editingStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Edit Stage: {editingStage.name}
              </h3>
              <button onClick={() => setEditingStage(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStageSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stage Name *</label>
                <input
                  type="text"
                  required
                  value={editStageName}
                  onChange={(e) => setEditStageName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Stage Accent Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditStageColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editStageColor === c ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={editStageColor}
                  onChange={(e) => setEditStageColor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STAGE */}
      {deletingStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Stage: {deletingStage.name}
              </h3>
              <button onClick={() => setDeletingStage(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteStageSubmit} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to delete this stage? If there are any leads in this stage, select where to migrate them:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reassign existing leads to:
                </label>
                <select
                  value={fallbackStageId}
                  onChange={(e) => setFallbackStageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {stages
                    .filter((s) => s.id !== deletingStage.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingStage(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/20"
                >
                  Delete Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REORDER STAGES (DRAG / UP / DOWN STAGE SEQUENCE) */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  Stage Sequence & Order Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set which stage comes first, second, or last using the Up and Down controls.
                </p>
              </div>
              <button
                onClick={() => setShowReorderModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 py-1 max-h-96 overflow-y-auto pr-1">
              {orderedStagesList.map((stg, idx) => (
                <div
                  key={stg.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: stg.color || '#3b82f6' }}
                    ></span>
                    <span className="font-bold text-slate-900">{stg.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleModalMoveItem(idx, 'up')}
                      title="Move stage earlier (left)"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 transition-all"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedStagesList.length - 1}
                      onClick={() => handleModalMoveItem(idx, 'down')}
                      title="Move stage later (right)"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 transition-all"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px]">
                {orderedStagesList.length} total stages in pipeline
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReorderModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingOrder}
                  onClick={handleSaveReorderedStages}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20"
                >
                  {isSavingOrder ? 'Saving...' : 'Apply Stage Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE LEAD DETAILS & CONVERSATION / FOLLOW-UP MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl p-6 overflow-y-auto animate-fade-in flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
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
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1.5">
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

              {/* Lead Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Phone Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLead.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Email</span>
                  <span className="text-slate-800 truncate block">{selectedLead.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Company</span>
                  <span className="text-slate-800 font-medium truncate block">{selectedLead.company_name || 'Individual'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Source</span>
                  <span className="text-slate-800 font-semibold">{selectedLead.lead_source}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Assigned Agent</span>
                  <span className="text-emerald-600 font-bold">{selectedLead.assigned_agent_name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Deal Value</span>
                  <span className="text-emerald-600 font-bold font-mono">
                    ₹{Number(selectedLead.estimated_deal_value || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Log New Conversation & Schedule Follow-up Box */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/80 space-y-3">
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  Log Conversation & Next Follow-up
                </h3>

                <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Interaction Type</label>
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl"
                      >
                        <option value="call">📞 Phone Call</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="meeting">🤝 Meeting</option>
                        <option value="email">✉️ Email</option>
                        <option value="note">📝 Note</option>
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
                      placeholder="Enter conversation highlights, customer requirements, pricing remarks..."
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
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

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Save Interaction
                    </button>
                  </div>
                </form>
              </div>

              {/* Scheduled Follow-ups Queue for this Lead */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Scheduled Follow-ups & Reminders ({leadDetails?.followups?.length || 0})
                </h3>

                <div className="space-y-2">
                  {leadDetails?.followups?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-xs border border-dashed border-slate-200 text-center">
                      No pending follow-ups scheduled for this lead.
                    </div>
                  ) : (
                    leadDetails?.followups?.map((fup: any) => {
                      const isOverdue = new Date(fup.scheduled_at) < new Date() && fup.status === 'pending';
                      return (
                        <div
                          key={fup.id}
                          className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{fup.purpose}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  fup.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isOverdue
                                    ? 'bg-red-100 text-red-700 animate-pulse'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {fup.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : 'Scheduled'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              📅 {new Date(fup.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Assigned: {fup.assigned_user_name || 'Agent'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Complete Communication Timeline */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Conversation & Activity Timeline ({leadDetails?.activities?.length || 0})
                </h3>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {leadDetails?.activities?.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-7">No conversations logged yet.</p>
                  ) : (
                    leadDetails?.activities?.map((act: any) => (
                      <div key={act.id} className="relative pl-7 text-xs">
                        <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600"></div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
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
                          {act.outcome && (
                            <div className="text-[11px] font-semibold text-emerald-600">
                              Outcome: {act.outcome}
                            </div>
                          )}
                          {act.notes && <p className="text-slate-600 text-[11px]">{act.notes}</p>}
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            Logged by: {act.user_name || 'System'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Lead Drawer */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close Drawer
              </button>
              {!selectedLead.is_converted ? (
                <button
                  onClick={() => handleConvertLead(selectedLead.id)}
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
                  View Converted Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD LOST REASON DIALOG */}
      {lostDialogLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900">Record Lost Reason</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please specify why this deal was marked as Lost for audit analytics:
            </p>

            <div className="mt-4 space-y-2">
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="Competitor offered lower pricing">Competitor offered lower pricing</option>
                <option value="Customer postponed project/budget cut">Customer postponed project/budget cut</option>
                <option value="Unresponsive after multiple follow-ups">Unresponsive after multiple follow-ups</option>
                <option value="Feature mismatch / requirement not met">Feature mismatch / requirement not met</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setLostDialogLead(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLostReason}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save as Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
