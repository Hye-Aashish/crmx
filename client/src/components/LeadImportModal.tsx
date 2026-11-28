import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users2,
  Filter,
  Check,
  Eye,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { LeadSource, User } from '../types';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sources: LeadSource[];
  agents: User[];
}

interface ParsedLeadRow {
  customer_name: string;
  phone: string;
  digits: string;
  stage_name: string;
  requirements: string;
  calling_date: string;
  comments: string;
  followup: string;
  date: string;
  notes: string;
}

// Normalize header string for resilient fuzzy matching
function normHeader(h: any): string {
  if (!h) return '';
  return String(h).toLowerCase().replace(/[\r\n\t_]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Clean hidden unicode marks (like \u202a, \u202c, \u00a0, etc.) from phone numbers
function cleanPhone(raw: any): string {
  if (!raw) return '';
  return String(raw).replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u00A0]/g, ' ').trim();
}

// Convert Excel serial date or messy date string to clean YYYY-MM-DD
function formatExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  // Handle DD--MM-YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/]+(\d{1,2})[-/]+(\d{4})/);
  if (dmyMatch) {
    const pad = (n: string) => n.padStart(2, '0');
    return `${dmyMatch[3]}-${pad(dmyMatch[2])}-${pad(dmyMatch[1])}`;
  }
  return str;
}

export const LeadImportModal: React.FC<LeadImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sources,
  agents
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import options
  const [selectedSource, setSelectedSource] = useState<string>('Excel / XLS Import');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Submitting state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    count: number;
    duplicates: number;
    skipped: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process chosen file using SheetJS
  const handleFileProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setImportResult(null);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('The uploaded spreadsheet has no sheets.');
      }

      const ws = wb.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The uploaded file contains no data.');
      }

      // Detect header row
      let headerIndex = -1;
      const colMap: Record<string, number> = {};

      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;
        const normalized = row.map(normHeader);
        const contactIdx = normalized.findIndex(
          (h) => h.includes('contact') || h.includes('phone') || h.includes('mobile')
        );
        if (contactIdx !== -1) {
          headerIndex = r;
          normalized.forEach((h, idx) => {
            if (h.includes('customer') || h.includes('name')) colMap.name = idx;
            else if (h.includes('contact') || h.includes('phone') || h.includes('mobile')) colMap.phone = idx;
            else if (h.includes('stage') || h.includes('status')) colMap.stage = idx;
            else if (h.includes('requir')) colMap.requirements = idx;
            else if (h.includes('calling') || (h.includes('date') && colMap.date !== undefined)) colMap.calling_date = idx;
            else if (h === 'date' && colMap.date === undefined) colMap.date = idx;
            else if (h.includes('comment') || h.includes('remark') || h.includes('note')) colMap.comments = idx;
            else if (h.includes('follow')) colMap.followup = idx;
          });
          break;
        }
      }

      if (headerIndex === -1 || colMap.phone === undefined) {
        throw new Error(
          'Could not find a CONTACT or PHONE column in the uploaded file. Please make sure the header contains CONTACT, CUSTOMER NAME, etc.'
        );
      }

      const leads: ParsedLeadRow[] = [];
      let skipped = 0;

      for (let r = headerIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row) || row.every((c) => !c || String(c).trim() === '')) {
          continue;
        }

        // Skip accidental repeated header rows
        const rowStr = row.map((c) => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('contact') && (rowStr.includes('customer') || rowStr.includes('stage'))) {
          continue;
        }

        const rawPhone = colMap.phone !== undefined ? row[colMap.phone] : '';
        const cleanedPhone = cleanPhone(rawPhone);
        const digits = cleanedPhone.replace(/\D/g, '');

        if (digits.length < 7) {
          skipped++;
          continue;
        }

        let rawName = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : '';
        rawName = rawName.replace(/^[~'\s]+|[~'\s]+$/g, '');
        const customerName = rawName || `Lead (${cleanedPhone})`;

        const rawStage = colMap.stage !== undefined ? String(row[colMap.stage] || '').trim() : '';
        const requirements = colMap.requirements !== undefined ? String(row[colMap.requirements] || '').trim() : '';
        const callingDate = colMap.calling_date !== undefined ? formatExcelDate(row[colMap.calling_date]) : '';
        const comments = colMap.comments !== undefined ? String(row[colMap.comments] || '').trim() : '';
        const followup = colMap.followup !== undefined ? String(row[colMap.followup] || '').trim() : '';
        const date = colMap.date !== undefined ? formatExcelDate(row[colMap.date]) : '';

        // Structured combined notes
        const notesParts: string[] = [];
        if (requirements) notesParts.push(`Requirements: ${requirements}`);
        if (comments) notesParts.push(`Comments: ${comments}`);
        if (callingDate && callingDate !== date) notesParts.push(`Calling Date: ${callingDate}`);
        if (followup) notesParts.push(`Follow-up: ${followup}`);

        leads.push({
          customer_name: customerName,
          phone: cleanedPhone,
          digits,
          stage_name: rawStage,
          requirements,
          calling_date: callingDate,
          comments,
          followup,
          date,
          notes: notesParts.join(' | ')
        });
      }

      setParsedRows(leads);
      setSkippedCount(skipped);
    } catch (err: any) {
      console.error('File parse error:', err);
      setParseError(err.message || 'Failed to parse file.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const sampleHeaders = [
      'date',
      'CUSTOMER NAME',
      'CONTACT',
      'LEAD STAGE',
      'REQUIRMENTS',
      'CALLING DATE',
      'COMMENTS',
      'FOLLOW UP'
    ];
    const sampleRows = [
      ['2026-01-01', 'larson', '+1 (205) 901-8894', 'NOT RECEIVED', 'pendent', '2026-01-02', 'Budget 500', ''],
      ['2026-01-02', '', '+1 (904) 654-4455', 'CALL BACK', '', '2026-01-02', 'Call back tomorrow', ''],
      ['2026-01-02', 'richard', '+1 (864) 309-4722', 'HOT - J', 'chain, pen, ring, watch', '2026-01-02', '3k price for 4 items', ''],
      ['2026-01-03', '~Lorenzo Davis', '+1 (203) 927-2464', 'RECEIVED', 'cartier', '2026-01-03', 'shared catalog on whatsapp', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'CRMX_Leads_Sample_Template.xlsx');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setParseError(null);

    try {
      const res = await api.importLeads({
        leads: parsedRows,
        lead_source: selectedSource,
        assigned_agent_id: selectedAgentId || undefined,
        skip_duplicates: skipDuplicates
      });

      setImportResult({
        count: res.count,
        duplicates: res.duplicates_skipped || 0,
        skipped: res.skipped_invalid || 0
      });

      // Notify parent to refresh leads
      onSuccess();
    } catch (err: any) {
      console.error('Import error:', err);
      setParseError(err.message || 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetSelection = () => {
    setFile(null);
    setParsedRows([]);
    setSkippedCount(0);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200/90 relative my-auto animate-rise flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-xs shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Import Leads from Excel / .XLS
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your .xls, .xlsx, or .csv file to automatically convert rows into CRM leads.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
          {/* Success Banner if completed */}
          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Import Completed Successfully!
              </div>
              <p className="text-xs text-emerald-700">
                Successfully created <strong>{importResult.count} leads</strong> in your CRM!
                {importResult.duplicates > 0 && ` (${importResult.duplicates} duplicate phone numbers were safely skipped).`}
              </p>
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
                >
                  View All Leads
                </button>
                <button
                  type="button"
                  onClick={resetSelection}
                  className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 rounded-xl font-semibold hover:bg-emerald-100/50 transition-all cursor-pointer"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{parseError}</div>
            </div>
          )}

          {/* Upload Area when no file or re-upload */}
          {!importResult && (
            <>
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Click to browse or drag & drop your Excel file here
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Supports <strong>.xls</strong>, <strong>.xlsx</strong>, and <strong>.csv</strong> spreadsheets
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSample();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 rounded-xl font-semibold shadow-2xs transition-all text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      Download Sample .xls Template
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected File Card */
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-800 truncate">{file.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} valid leads detected
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetSelection}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Parsing Loader */}
              {isParsing && (
                <div className="py-6 flex items-center justify-center gap-2 text-slate-500 font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  Analyzing spreadsheet columns & rows...
                </div>
              )}

              {/* Parsed Preview Table & Configuration */}
              {parsedRows.length > 0 && !isParsing && (
                <div className="space-y-4">
                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Ready to Import
                      </div>
                      <div className="text-xl font-black text-emerald-900 mt-0.5">
                        {parsedRows.length}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Skipped / Empty
                      </div>
                      <div className="text-xl font-black text-slate-700 mt-0.5">
                        {skippedCount}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Format Detected
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1 truncate">
                        Contact, Stage, Reqs, Calling
                      </div>
                    </div>
                  </div>

                  {/* Import Configuration Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-xs">
                        Default Lead Source
                      </label>
                      <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                      >
                        <option value="Excel / XLS Import">Excel / XLS Import (Auto)</option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-xs">
                        Assign Leads To (Optional)
                      </label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                      >
                        <option value="">-- Unassigned (Auto / Current User) --</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-1 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span>Skip duplicate phone numbers (recommended)</span>
                      </label>
                    </div>
                  </div>

                  {/* Live Sample Preview Table */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Preview (First {Math.min(parsedRows.length, 6)} of {parsedRows.length} Leads)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mapped to CRMX Lead fields
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                            <tr>
                              <th className="px-3 py-2">#</th>
                              <th className="px-3 py-2">Customer Name</th>
                              <th className="px-3 py-2">Phone Number</th>
                              <th className="px-3 py-2">Stage</th>
                              <th className="px-3 py-2">Requirements / Notes</th>
                              <th className="px-3 py-2">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {parsedRows.slice(0, 6).map((lead, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-900 truncate max-w-[140px]">
                                  {lead.customer_name}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                                  {lead.phone}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      lead.stage_name.toLowerCase().includes('hot')
                                        ? 'bg-red-100 text-red-800'
                                        : lead.stage_name.toLowerCase().includes('follow') ||
                                          lead.stage_name.toLowerCase().includes('call back')
                                        ? 'bg-amber-100 text-amber-800'
                                        : lead.stage_name.toLowerCase().includes('received')
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {lead.stage_name || 'New Lead'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]" title={lead.notes}>
                                  {lead.notes || '—'}
                                </td>
                                <td className="px-3 py-2 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                                  {lead.date || lead.calling_date || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample File
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isImporting}
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              {importResult ? 'Close' : 'Cancel'}
            </button>

            {!importResult && parsedRows.length > 0 && (
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing {parsedRows.length} Leads...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import {parsedRows.length} Leads</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

