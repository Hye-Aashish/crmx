import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Eye,
  ArrowLeft,
  Save,
  Palette,
  Settings,
  Sparkles,
  Smartphone,
  Monitor,
  MoveUp,
  MoveDown,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  AlignLeft,
  ChevronDown,
  Layers,
  HelpCircle,
  Share2,
  CheckCircle2,
  X,
  AlertCircle,
  Send,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { WebForm, FormField, User as UserType, FunnelStage } from '../types';

export const FormBuilder: React.FC = () => {
  const [forms, setForms] = useState<WebForm[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'list' | 'editor'
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  // Editor form state
  const [formData, setFormData] = useState<Partial<WebForm>>({
    title: 'New Lead Generation Form',
    slug: '',
    description: 'Please provide your details below and our sales team will contact you.',
    source_name: 'Website Form',
    assigned_agent_id: '',
    stage_id: 'stg-1',
    fields: [],
    theme_color: '#10b981',
    button_text: 'Submit Inquiry',
    success_message: 'Thank you! Your information has been received. Our team will contact you shortly.',
    redirect_url: ''
  });

  // Editor preview mode: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Share & Embed Modal state
  const [embedModalForm, setEmbedModalForm] = useState<WebForm | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  // Color options palette
  const colorPalette = [
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Teal', hex: '#0d9488' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Slate', hex: '#475569' }
  ];

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [formsRes, usersRes, stagesRes] = await Promise.all([
        api.getForms(),
        api.getUsers(),
        api.getFunnelStages()
      ]);
      setForms(formsRes || []);
      setUsers(usersRes || []);
      setStages(stagesRes || []);
    } catch (err) {
      console.error('Failed to load forms data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenCreate = () => {
    const defaultFields: FormField[] = [
      { id: 'field_name', label: 'Full Name', type: 'text', placeholder: 'e.g. Jane Doe', required: true, mapToLeadField: 'customer_name' },
      { id: 'field_phone', label: 'Phone Number', type: 'phone', placeholder: '+1 (555) 234-5678', required: true, mapToLeadField: 'phone' },
      { id: 'field_email', label: 'Work Email', type: 'email', placeholder: 'jane@company.com', required: true, mapToLeadField: 'email' },
      { id: 'field_company', label: 'Company Name', type: 'text', placeholder: 'Acme Corporation', required: false, mapToLeadField: 'company_name' },
      { id: 'field_budget', label: 'Estimated Budget (₹)', type: 'number', placeholder: '50000', required: false, mapToLeadField: 'estimated_deal_value' },
      { id: 'field_notes', label: 'Inquiry Notes', type: 'textarea', placeholder: 'Briefly describe your requirements...', required: false, mapToLeadField: 'notes' }
    ];

    setEditingFormId(null);
    setFormData({
      title: 'Lead Capture Form',
      slug: `lead-form-${Math.floor(1000 + Math.random() * 9000)}`,
      description: 'Fill in your contact information below to get a custom quotation.',
      source_name: 'Website Form',
      assigned_agent_id: users.find(u => u.role === 'agent')?.id || '',
      stage_id: stages[0]?.id || 'stg-1',
      fields: defaultFields,
      theme_color: '#10b981',
      button_text: 'Submit Inquiry',
      success_message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
      redirect_url: ''
    });
    setCurrentView('editor');
  };

  const handleOpenEdit = (form: WebForm) => {
    setEditingFormId(form.id);
    setFormData({
      title: form.title,
      slug: form.slug,
      description: form.description || '',
      source_name: form.source_name || 'Website Form',
      assigned_agent_id: form.assigned_agent_id || '',
      stage_id: form.stage_id || 'stg-1',
      fields: form.fields || [],
      theme_color: form.theme_color || '#10b981',
      button_text: form.button_text || 'Submit Inquiry',
      success_message: form.success_message || '',
      redirect_url: form.redirect_url || ''
    });
    setCurrentView('editor');
  };

  const handleSaveForm = async () => {
    if (!formData.title?.trim()) {
      alert('Form title is required.');
      return;
    }
    if (!formData.fields || formData.fields.length === 0) {
      alert('Please add at least one form field.');
      return;
    }

    setSaving(true);
    try {
      if (editingFormId) {
        await api.updateForm(editingFormId, formData);
      } else {
        await api.createForm(formData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await loadInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteForm = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete form "${title}"?`)) return;
    try {
      await api.deleteForm(id);
      setForms(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete form.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.toggleFormStatus(id);
      setForms(prev => prev.map(f => (f.id === id ? { ...f, is_active: res.is_active } : f)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  // Field manipulation helpers
  const handleAddField = (type: FormField['type'], mapField?: FormField['mapToLeadField']) => {
    const newId = `field_${Date.now()}`;
    let label = 'New Field';
    let placeholder = '';

    if (mapField === 'customer_name') { label = 'Full Name'; placeholder = 'e.g. Jane Doe'; }
    else if (mapField === 'phone') { label = 'Phone Number'; placeholder = '+1 (555) 234-5678'; }
    else if (mapField === 'email') { label = 'Work Email'; placeholder = 'jane@company.com'; }
    else if (mapField === 'company_name') { label = 'Company Name'; placeholder = 'Acme Corporation'; }
    else if (mapField === 'city') { label = 'City / Region'; placeholder = 'New York, NY'; }
    else if (mapField === 'estimated_deal_value') { label = 'Estimated Deal / Budget (₹)'; placeholder = '50000'; }
    else if (mapField === 'notes') { label = 'Message / Requirements'; placeholder = 'Tell us about your project...'; }
    else if (type === 'select') { label = 'Select Option'; placeholder = 'Choose an option'; }
    else if (type === 'checkbox') { label = 'I agree to be contacted by sales team'; }

    const newField: FormField = {
      id: newId,
      label,
      type,
      placeholder,
      required: false,
      mapToLeadField: mapField,
      options: type === 'select' ? ['Enterprise Option 1', 'Professional Option 2', 'Custom Plan'] : undefined
    };

    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
  };

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    setFormData(prev => {
      const updated = [...(prev.fields || [])];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, fields: updated };
    });
  };

  const handleRemoveField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: (prev.fields || []).filter((_, i) => i !== index)
    }));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...(formData.fields || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;
    setFormData(prev => ({ ...prev, fields }));
  };

  // URL Helpers
  const getPublicFormUrl = (slugOrId: string) => {
    const origin = window.location.origin;
    return `${origin}/?form=${slugOrId}`;
  };

  const getIframeCode = (slugOrId: string) => {
    const url = getPublicFormUrl(slugOrId);
    return `<iframe src="${url}" width="100%" height="680" frameborder="0" style="border:none; border-radius:16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow:hidden;" title="CRMX Lead Capture Form"></iframe>`;
  };

  const handleCopy = (text: string, type: 'link' | 'iframe') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

  // Compute aggregate metrics
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submission_count || 0), 0);
  const activeFormsCount = forms.filter(f => f.is_active === 1).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Lead Capture Form Builder
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Embed & Share
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Build embeddable public forms, share direct URLs, and automatically capture new leads in your CRM.
              </p>
            </div>
          </div>
        </div>

        {currentView === 'list' ? (
          <button
            onClick={handleOpenCreate}
            className="btn-primary shrink-0 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Form
          </button>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setCurrentView('list')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Forms
            </button>
            <button
              onClick={handleSaveForm}
              disabled={saving}
              className="btn-primary flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Changes Saved!' : 'Save & Publish Form'}
            </button>
          </div>
        )}
      </div>

      {/* ===================== VIEW A: FORMS LIST ===================== */}
      {currentView === 'list' && (
        <div className="space-y-6">
          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Forms</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{forms.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads Captured</span>
                <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">{totalSubmissions}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Forms</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {activeFormsCount} <span className="text-xs font-medium text-slate-400">/ {forms.length}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Forms Grid */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              Loading web forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl mx-auto flex items-center justify-center text-emerald-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Web Forms Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create your first lead capture form to share directly or embed on your website.
                </p>
              </div>
              <button onClick={handleOpenCreate} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" />
                Build First Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {forms.map((f) => (
                <div
                  key={f.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Card Header with Theme Strip */}
                  <div>
                    <div
                      className="h-2 w-full"
                      style={{ backgroundColor: f.theme_color || '#10b981' }}
                    ></div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h2 className="font-extrabold text-slate-900 text-base leading-snug truncate" title={f.title}>
                            {f.title}
                          </h2>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <span>/{f.slug}</span>
                          </div>
                        </div>

                        {/* Active status pill */}
                        <button
                          onClick={() => handleToggleStatus(f.id)}
                          className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                          title={f.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {f.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[36px]">
                        {f.description || 'No description provided.'}
                      </p>

                      {/* Pill Stats */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {f.submission_count || 0} Leads Captured
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium">
                          {f.fields?.length || 0} Fields
                        </span>
                        {f.source_name && (
                          <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60 text-[10px]">
                            {f.source_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      {/* Share Link Button */}
                      <button
                        onClick={() => setEmbedModalForm(f)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Share or Embed this Form"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Embed & Share</span>
                      </button>

                      {/* Direct Test Public Page */}
                      <a
                        href={getPublicFormUrl(f.slug || f.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                        title="Open Live Public Form"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-white transition-colors"
                        title="Edit Form in Builder"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteForm(f.id, f.title)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white transition-colors"
                        title="Delete Form"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW B: VISUAL FORM BUILDER ===================== */}
      {currentView === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Configuration & Fields Designer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. General Form Settings Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                Form Information & Branding
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Form Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Form Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Website Demo Request"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">URL Slug *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-mono text-[11px]">/</span>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="e.g. demo-inquiry"
                      className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Lead Source */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Lead Source Attribution</label>
                  <input
                    type="text"
                    value={formData.source_name || ''}
                    onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                    placeholder="e.g. Website Contact Form"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Subheading / Description</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Instructions displayed below the title..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Auto Assign Agent */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Auto-Assign to Agent</label>
                  <select
                    value={formData.assigned_agent_id || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">No automatic agent assignment</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                {/* Initial Stage */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Initial Pipeline Stage</label>
                  <select
                    value={formData.stage_id || 'stg-1'}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                  >
                    {stages.map(stg => (
                      <option key={stg.id} value={stg.id}>{stg.name}</option>
                    ))}
                  </select>
                </div>

                {/* Button Text */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Submit Button Text</label>
                  <input
                    type="text"
                    value={formData.button_text || ''}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    placeholder="e.g. Request Free Consultation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Theme Color Picker */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Brand Accent Color</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {colorPalette.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, theme_color: c.hex })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          formData.theme_color === c.hex ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Success Message */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Thank You / Success Message</label>
                  <input
                    type="text"
                    value={formData.success_message || ''}
                    onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                    placeholder="e.g. Thank you! We will reach out within 24 hours."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Optional Redirect URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Optional Redirect URL (After Submit)</label>
                  <input
                    type="url"
                    value={formData.redirect_url || ''}
                    onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    placeholder="e.g. https://yourcompany.com/thank-you"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 2. Fields Configuration Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Form Fields Builder ({formData.fields?.length || 0})
                </h2>
                <span className="text-[11px] text-slate-400">Click to add field presets</span>
              </div>

              {/* Field Preset Quick Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddField('text', 'customer_name')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Full Name
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('phone', 'phone')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('email', 'email')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('text', 'company_name')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Company
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('text', 'city')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> City
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('number', 'estimated_deal_value')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Budget (₹)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('textarea', 'notes')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Message
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('select')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Dropdown
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('checkbox')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Checkbox
                </button>
              </div>

              {/* List of Configured Fields */}
              <div className="space-y-3">
                {formData.fields?.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{field.label}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                          {field.type}
                        </span>
                        {field.mapToLeadField && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-600 bg-slate-200/60">
                            ➔ {field.mapToLeadField}
                          </span>
                        )}
                      </div>

                      {/* Reorder and Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                          title="Move field up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 'down')}
                          disabled={index === (formData.fields?.length || 0) - 1}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                          title="Move field down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Field Settings Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-4 sm:pt-3">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                            className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {/* Select Options Config */}
                    {field.type === 'select' && (
                      <div className="pt-2 text-xs">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Dropdown Options (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={(field.options || []).join(', ')}
                          onChange={(e) =>
                            handleUpdateField(index, {
                              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })
                          }
                          placeholder="e.g. Bronze, Silver, Gold"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Interactive Live Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-4 text-white shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
              </div>

              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile Phone Preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Container for mock frame */}
            <div className={`mx-auto transition-all duration-300 ${previewDevice === 'mobile' ? 'max-w-[360px]' : 'w-full'}`}>
              <div
                className={`bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden ${
                  previewDevice === 'mobile' ? 'ring-8 ring-slate-800 rounded-[36px]' : ''
                }`}
              >
                {/* Mobile camera notch if mobile preview */}
                {previewDevice === 'mobile' && (
                  <div className="h-5 bg-slate-800 flex justify-center items-center">
                    <div className="w-16 h-3 bg-slate-900 rounded-full"></div>
                  </div>
                )}

                {/* Accent Top Bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: formData.theme_color || '#10b981' }}
                ></div>

                {/* Simulated Public Form */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {formData.title || 'Untitled Form'}
                    </h3>
                    {formData.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {formData.description}
                      </p>
                    )}
                  </div>

                  {/* Rendered Mock Fields */}
                  <div className="space-y-3 text-xs">
                    {(formData.fields || []).map((field) => (
                      <div key={field.id} className="space-y-1">
                        {field.type !== 'checkbox' && (
                          <label className="block text-xs font-bold text-slate-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        )}

                        {['text', 'email', 'phone', 'number'].includes(field.type) && (
                          <input
                            type="text"
                            disabled
                            placeholder={field.placeholder || ''}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs cursor-not-allowed"
                          />
                        )}

                        {field.type === 'select' && (
                          <div className="relative">
                            <select
                              disabled
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs appearance-none cursor-not-allowed"
                            >
                              <option>{field.placeholder || 'Choose option...'}</option>
                              {(field.options || []).map((opt, i) => (
                                <option key={i}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                          </div>
                        )}

                        {field.type === 'textarea' && (
                          <textarea
                            rows={2}
                            disabled
                            placeholder={field.placeholder || ''}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs cursor-not-allowed"
                          />
                        )}

                        {field.type === 'checkbox' && (
                          <label className="flex items-center gap-2 cursor-not-allowed text-xs font-semibold text-slate-600">
                            <input type="checkbox" disabled className="w-3.5 h-3.5 rounded" />
                            {field.label}
                          </label>
                        )}
                      </div>
                    ))}

                    {/* Simulated Submit Button */}
                    <div className="pt-2">
                      <div
                        style={{ backgroundColor: formData.theme_color || '#10b981' }}
                        className="w-full py-2.5 px-4 text-white font-bold rounded-xl text-center text-xs shadow-md flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <span>{formData.button_text || 'Submit Inquiry'}</span>
                        <Send className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Simulated Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>🔒 SSL 256-Bit Encrypted</span>
                    <span>CRMX Lead Capture</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== EMBED & SHARE MODAL ===================== */}
      {embedModalForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                  Share & Embed "{embedModalForm.title}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribute via direct public link or embed inside your website / landing page.
                </p>
              </div>
              <button
                onClick={() => setEmbedModalForm(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Direct Public URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                1. Standalone Direct Public Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getPublicFormUrl(embedModalForm.slug || embedModalForm.id)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(getPublicFormUrl(embedModalForm.slug || embedModalForm.id), 'link')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={getPublicFormUrl(embedModalForm.slug || embedModalForm.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Share this link on WhatsApp, email campaigns, bio links, or social media.
              </span>
            </div>

            {/* 2. iFrame Embed Snippet */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-600" />
                2. Responsive iFrame Embed Code
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  rows={3}
                  value={getIframeCode(embedModalForm.slug || embedModalForm.id)}
                  className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 select-all focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Paste this snippet inside WordPress, Webflow, Shopify, or any HTML page.
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(getIframeCode(embedModalForm.slug || embedModalForm.id), 'iframe')}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedIframe ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIframe ? 'Code Copied!' : 'Copy iFrame Code'}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setEmbedModalForm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
