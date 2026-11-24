import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { WebForm, FormField } from '../types';

interface PublicFormProps {
  formIdOrSlug: string;
}

export const PublicForm: React.FC<PublicFormProps> = ({ formIdOrSlug }) => {
  const [form, setForm] = useState<WebForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ leadCode?: string; message?: string; redirectUrl?: string } | null>(null);

  // Form answer state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getPublicForm(formIdOrSlug);
        setForm(data);
        // Pre-fill initial defaults
        const initialAnswers: Record<string, any> = {};
        if (Array.isArray(data.fields)) {
          data.fields.forEach((f: FormField) => {
            if (f.type === 'checkbox') {
              initialAnswers[f.id] = false;
            } else {
              initialAnswers[f.id] = '';
            }
          });
        }
        setAnswers(initialAnswers);
      } catch (err: any) {
        setError(err.message || 'Unable to load the requested form. It might be inactive or removed.');
      } finally {
        setLoading(false);
      }
    };

    if (formIdOrSlug) {
      fetchForm();
    }
  }, [formIdOrSlug]);

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    // Clear validation error on change
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate fields
    const errors: Record<string, string> = {};
    form.fields.forEach((f: FormField) => {
      if (f.required) {
        const val = answers[f.id];
        if (f.type === 'checkbox') {
          if (!val) errors[f.id] = `${f.label} must be confirmed.`;
        } else if (val === undefined || val === null || String(val).trim() === '') {
          errors[f.id] = `${f.label} is required.`;
        }
      }
      // Basic email syntax check
      if (f.type === 'email' && answers[f.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(answers[f.id]).trim())) {
          errors[f.id] = 'Please enter a valid email address.';
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.submitPublicForm(formIdOrSlug, answers);
      setSubmitSuccess(true);
      setSuccessInfo({
        leadCode: res.lead_code,
        message: res.message,
        redirectUrl: res.redirect_url
      });

      // Handle redirect if configured
      if (res.redirect_url) {
        setTimeout(() => {
          window.location.href = res.redirect_url;
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitSuccess(false);
    setSuccessInfo(null);
    const initialAnswers: Record<string, any> = {};
    if (form?.fields) {
      form.fields.forEach(f => {
        initialAnswers[f.id] = f.type === 'checkbox' ? false : '';
      });
    }
    setAnswers(initialAnswers);
    setFieldErrors({});
  };

  const getFieldIcon = (field: FormField) => {
    if (field.mapToLeadField === 'customer_name' || field.type === 'text') return <User className="w-4 h-4 text-slate-400" />;
    if (field.mapToLeadField === 'phone' || field.type === 'phone') return <Phone className="w-4 h-4 text-slate-400" />;
    if (field.mapToLeadField === 'email' || field.type === 'email') return <Mail className="w-4 h-4 text-slate-400" />;
    if (field.mapToLeadField === 'company_name') return <Building className="w-4 h-4 text-slate-400" />;
    if (field.mapToLeadField === 'city') return <MapPin className="w-4 h-4 text-slate-400" />;
    if (field.mapToLeadField === 'estimated_deal_value' || field.type === 'number') return <span className="text-sm font-bold text-slate-400 select-none">₹</span>;
    if (field.type === 'textarea') return <FileText className="w-4 h-4 text-slate-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Loading Form...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Form Unavailable</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <div className="pt-2 text-[11px] text-slate-400">
            Please verify the link with the organization that provided this form.
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const themeColor = form.theme_color || '#10b981';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-fade-in relative">
        {/* Top Accent Ribbon */}
        <div
          className="h-2.5 w-full"
          style={{ backgroundColor: themeColor }}
        ></div>

        {/* Form Container */}
        <div className="p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: themeColor }}
              ></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official Lead Inquiry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {/* Submission Success State */}
          {submitSuccess && successInfo ? (
            <div className="py-8 text-center space-y-5 animate-fade-in">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: themeColor }}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Request Submitted Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  {successInfo.message}
                </p>
              </div>

              {successInfo.leadCode && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700">
                  <span>Reference ID:</span>
                  <strong className="text-emerald-700 font-bold">{successInfo.leadCode}</strong>
                </div>
              )}

              {successInfo.redirectUrl ? (
                <div className="pt-2 text-xs text-slate-500">
                  Redirecting in a few seconds... or{' '}
                  <a href={successInfo.redirectUrl} className="font-bold underline text-emerald-600">
                    click here
                  </a>
                </div>
              ) : (
                <div className="pt-4">
                  <button
                    onClick={handleReset}
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Active Form Fields */
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {form.fields.map((field) => {
                  const isFullWidth = field.type === 'textarea' || field.type === 'checkbox' || field.id === 'field_notes';
                  const hasError = fieldErrors[field.id];

                  return (
                    <div
                      key={field.id}
                      className={isFullWidth ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}
                    >
                      {field.type !== 'checkbox' && (
                        <label className="block text-xs font-bold text-slate-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      )}

                      {/* Text, Email, Phone, Number */}
                      {['text', 'email', 'phone', 'number'].includes(field.type) && (
                        <div className="relative">
                          <div className="absolute left-3.5 top-3 pointer-events-none">
                            {getFieldIcon(field)}
                          </div>
                          <input
                            type={field.type === 'phone' ? 'tel' : field.type}
                            value={answers[field.id] ?? ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-medium ${
                              hasError
                                ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                                : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                            }`}
                          />
                        </div>
                      )}

                      {/* Select Dropdown */}
                      {field.type === 'select' && (
                        <div className="relative">
                          <select
                            value={answers[field.id] ?? ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none transition-all font-medium appearance-none pr-9 ${
                              hasError
                                ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                                : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                            }`}
                          >
                            <option value="">{field.placeholder || 'Select an option...'}</option>
                            {(field.options || []).map((opt, idx) => (
                              <option key={idx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      )}

                      {/* Textarea */}
                      {field.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={answers[field.id] ?? ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          placeholder={field.placeholder || 'Enter details...'}
                          className={`w-full p-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-medium ${
                            hasError
                              ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                              : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                          }`}
                        />
                      )}

                      {/* Checkbox */}
                      {field.type === 'checkbox' && (
                        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(answers[field.id])}
                            onChange={(e) => handleInputChange(field.id, e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </label>
                      )}

                      {/* Help Text / Validation Error */}
                      {hasError ? (
                        <p className="text-[11px] text-red-600 font-medium">{hasError}</p>
                      ) : field.helpText ? (
                        <p className="text-[11px] text-slate-400">{field.helpText}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: themeColor }}
                  className="w-full py-3.5 px-6 text-white font-bold rounded-2xl shadow-lg hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>{form.button_text || 'Submit Inquiry'}</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Trust & Privacy Badge */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SSL 256-Bit Encrypted & Privacy Protected</span>
            </div>
            <div className="font-semibold text-slate-500">
              CRMX Enterprise
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
