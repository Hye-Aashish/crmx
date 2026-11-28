import React, { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { LeadTag } from '../types';
import { api } from '../services/api';

const TAG_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

interface TagPickerProps {
  tags: LeadTag[];
  selectedIds: string[];
  onChange: (ids: string[], allTags?: LeadTag[]) => void;
  onTagsChange?: (tags: LeadTag[]) => void;
  label?: string;
  compact?: boolean;
  allowCreate?: boolean;
  isSaving?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  tags,
  selectedIds,
  onChange,
  onTagsChange,
  label = 'Tags',
  compact = false,
  allowCreate = true,
  isSaving = false
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ef4444');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((t) => t !== id), tags);
    } else {
      onChange([...selectedIds, id], tags);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.createTag({ name, color: newColor });
      const created: LeadTag = {
        id: res.id,
        name,
        color: newColor,
        is_active: 1
      };
      const nextTags = [...tags.filter((t) => t.id !== created.id), created].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      onTagsChange?.(nextTags);
      onChange([...selectedIds.filter((id) => id !== created.id), created.id], nextTags);
      setNewName('');
      setNewColor('#ef4444');
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
        {allowCreate && !showCreate && (
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setError('');
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Tag
          </button>
        )}
      </div>

      {showCreate && allowCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900">New custom tag</span>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setError('');
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Hot Lead, VIP, Follow Tomorrow..."
            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {TAG_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setNewColor(hex)}
                className={`w-5 h-5 rounded-full ${
                  newColor === hex ? 'ring-2 ring-slate-900 scale-110' : ''
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
              title="Custom color"
            />
          </div>
          {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Save Tag & Select
          </button>
        </form>
      )}

      {!tags.length && !showCreate ? (
        <div className="text-[11px] text-slate-400">
          No tags yet.{' '}
          {allowCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-emerald-700 font-bold hover:underline"
            >
              Create your first tag
            </button>
          )}
        </div>
      ) : (
        <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
          {tags.map((tag) => {
            const active = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                  active
                    ? 'text-white shadow-xs scale-[1.02] ring-2 ring-offset-1'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                }`}
                style={
                  active
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { borderColor: `${tag.color}66` }
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? '#fff' : tag.color }}
                />
                <span>{tag.name}</span>
                {active && <span className="text-[10px] ml-0.5 opacity-90">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-[10px] text-slate-400 mt-1.5">{selectedIds.length} tag(s) selected</p>
      )}
    </div>
  );
};

export const TagChips: React.FC<{ tags?: LeadTag[]; max?: number }> = ({ tags = [], max = 4 }) => {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  const extra = tags.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-max">
      {shown.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-xs tracking-tight"
          style={{ backgroundColor: tag.color }}
          title={tag.name}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
          {tag.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 whitespace-nowrap">
          +{extra}
        </span>
      )}
    </div>
  );
};
