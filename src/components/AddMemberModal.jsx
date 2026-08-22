import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Search, ChevronDown } from 'lucide-react';
import { registerTeamMember } from '../API/team';
import { useInitiatives, KEYS } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import {
  INPUT_CLS,
  BTN_PRIMARY,
  Field,
  Modal,
  Select,
  CancelButton,
  FormError,
} from './ui';

const ROLES = [
  'executive',
  'coordinator',
  'overall_coordinator',
  'co_overall_coordinator',
  'admin',
];

const VERTICALS = [
  'All',
  'Overall Coordinators',
  'Admin & Finance',
  'OC-Office',
  'Corporate Relations',
  'Events',
  'Marketing & Strategic Partnerships',
  'Publicity',
  'Startup Support',
  'Media',
  'Design',
  'Content',
  'Technical',
];

function getRoleDisplay(role) {
  const roleStr = (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
  if (roleStr.includes('co_overall_coordinator') || roleStr.includes('co overall')) return 'Co-Overall Coordinator';
  if (roleStr.includes('overall_coordinator')) return 'Overall Coordinator';
  if (roleStr.includes('coordinator')) return 'Coordinator';
  if (roleStr.includes('executive')) return 'Executive';
  if (roleStr.includes('admin')) return 'Admin';
  return (Array.isArray(role) ? role[0] : role) || 'Team Member';
}

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: getRoleDisplay([r]) }));
const VERTICAL_OPTIONS = VERTICALS.map((v) => ({ value: v, label: v }));

const EMPTY_FORM = {
  name: '',
  email: '',
  number: '',
  role: 'executive',
  vertical: 'All',
  initiative: [],   // text[]
  tasks: [],        // text[]
  contribution: [], // text[]
};

// ── Searchable multi-select dropdown for initiatives ─────────────────────
function SearchableInitiativeSelect({
  initiatives = [],
  selectedIds = [],
  onChange,
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = initiatives.filter((ini) =>
    (ini.name || '').toLowerCase().includes(search.toLowerCase().trim())
  );

  const selectedInitiatives = initiatives.filter((ini) =>
    selectedIds.includes(ini.id)
  );

  const toggleInitiative = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemoveChip = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter((i) => i !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading initiatives...
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <p className="rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
        No active initiatives found
      </p>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-left text-body text-ink transition-colors hover:border-accent-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/25"
      >
        <span className="truncate text-body text-ink">
          {selectedIds.length === 0
            ? 'Select initiatives...'
            : `${selectedIds.length} initiative${selectedIds.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
            open ? 'rotate-180 text-ink' : ''
          }`}
        />
      </button>

      {/* Selected Initiative Chips */}
      {selectedInitiatives.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {selectedInitiatives.map((ini) => (
            <span
              key={ini.id}
              className="inline-flex items-center gap-1 rounded-control bg-accent-soft px-2 py-0.5 text-micro font-medium text-accent-300"
            >
              <span className="max-w-[200px] truncate">{ini.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(e, ini.id)}
                aria-label={`Remove ${ini.name}`}
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedInitiatives.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-micro font-medium text-ink-faint hover:text-danger"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Searchable Dropdown Overlay */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-hidden rounded-control border border-line bg-surface shadow-overlay animate-fade-in flex flex-col">
          {/* Search Box */}
          <div className="relative border-b border-line-subtle p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search initiatives..."
              className="w-full rounded-control border border-line bg-canvas py-1.5 pl-8 pr-7 text-meta text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List of Filtered Initiatives */}
          <div className="max-h-48 overflow-y-auto divide-y divide-line-subtle overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-meta text-ink-faint">
                No initiatives found matching "{search}"
              </p>
            ) : (
              filtered.map((ini) => {
                const selected = selectedIds.includes(ini.id);
                return (
                  <label
                    key={ini.id}
                    className={`flex cursor-pointer items-center justify-between gap-2.5 px-3 py-2 text-body transition-colors ${
                      selected
                        ? 'bg-accent-soft font-medium text-accent-300'
                        : 'text-ink-muted hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleInitiative(ini.id)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-line accent-accent-300"
                      />
                      <span className="truncate">{ini.name}</span>
                    </div>
                    {ini.status && (
                      <span className="shrink-0 text-micro capitalize text-ink-faint">
                        {ini.status.replace('_', ' ')}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable tag-input for text[] fields ──────────────────────────────────
function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft('');
  };

  const removeTag = (tag) => onChange(values.filter((v) => v !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      removeTag(values[values.length - 1]);
    }
  };

  return (
    <Field label={label} hint="Press Enter or comma to add">
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas px-2 py-1.5 focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-300/25">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-control bg-muted px-2 py-0.5 text-micro font-medium text-ink-muted"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-[110px] flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
    </Field>
  );
}

export default function AddMemberModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Active initiatives from cache — already populated when visiting Team page
  const { data: allInitiatives = [], isLoading: initiativesLoading } = useInitiatives();
  const initiatives = allInitiatives.filter((i) => {
    const s = (i.status || '').toLowerCase();
    return s === 'active' || s === 'planning' || s === '';
  });

  const qc = useQueryClient();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setVal = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));
  const handleRoleChange = (val) => {
    const r = val || 'executive';
    setForm((f) => ({
      ...f,
      role: r,
      vertical: (r.includes('overall_coordinator') || r.includes('co_overall_coordinator')) ? 'All' : (f.vertical || 'All'),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const chosenRole = Array.isArray(form.role)
      ? (form.role.length > 0 ? form.role : ['executive'])
      : [form.role || 'executive'];

    const chosenRoleStr = chosenRole[0] || 'executive';
    const isOverall = chosenRoleStr.includes('overall_coordinator') || chosenRoleStr.includes('co_overall_coordinator');
    const chosenVertical = isOverall ? 'All' : (form.vertical || 'All');

    const result = await registerTeamMember({
      name: form.name.trim(),
      email: form.email.trim(),
      number: form.number.trim(),
      role: chosenRole,
      vertical: chosenVertical,
      initiative: form.initiative || [],
      tasks: form.tasks || [],
      contribution: form.contribution || [],
    });
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
    } else {
      // Invalidate team cache so the roster refreshes
      qc.invalidateQueries({ queryKey: KEYS.team });
      qc.invalidateQueries({ queryKey: KEYS.teamDropdown });
      onSuccess(result.data);
    }
  };

  return (
    <Modal
      title="Add team member"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Adding...' : 'Add member'}
          </button>
        </>
      }
    >
      <Field label="Full name *">
        <input
          required
          type="text"
          value={form.name}
          onChange={set('name')}
          placeholder="e.g. Prabhav Sharma"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email *">
          <input
            required
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="member@iitd.ac.in"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Phone *">
          <input
            required
            type="tel"
            value={form.number}
            onChange={set('number')}
            placeholder="9876543210"
            pattern="[0-9]{10}"
            title="Enter a valid 10-digit phone number"
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role *">
          <Select
            value={form.role}
            required
            onChange={handleRoleChange}
            options={ROLE_OPTIONS}
            ariaLabel="Role"
            variant="field"
          />
        </Field>

        <Field label="Vertical *">
          <Select
            value={form.vertical}
            required
            onChange={setVal('vertical')}
            options={VERTICAL_OPTIONS}
            ariaLabel="Vertical"
            variant="field"
          />
        </Field>
      </div>

      <Field
        label="Initiatives"
        hint={form.initiative.length > 0 ? `${form.initiative.length} selected` : 'Select one or more initiatives'}
      >
        <SearchableInitiativeSelect
          initiatives={initiatives}
          selectedIds={form.initiative}
          onChange={setVal('initiative')}
          loading={initiativesLoading}
        />
      </Field>

      <TagInput
        label="Tasks"
        values={form.tasks}
        onChange={setVal('tasks')}
        placeholder="Type a task and press Enter"
      />

      <TagInput
        label="Contributions"
        values={form.contribution}
        onChange={setVal('contribution')}
        placeholder="Type a contribution and press Enter"
      />

      <FormError>{formError}</FormError>
    </Modal>
  );
}
