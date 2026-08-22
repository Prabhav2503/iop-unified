import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
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
  role: '',
  vertical: '',
  initiative: [],   // text[]
  tasks: [],        // text[]
  contribution: [], // text[]
};

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
    setForm((f) => ({
      ...f,
      role: val,
      vertical: (val.includes('overall_coordinator') || val.includes('co_overall_coordinator')) ? 'All' : (f.vertical || 'All'),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const result = await registerTeamMember({
      name: form.name,
      email: form.email,
      number: form.number,
      role: form.role ? [form.role] : [],
      vertical: (form.role?.includes('overall_coordinator') || form.role?.includes('co_overall_coordinator')) ? 'All' : (form.vertical || 'All'),
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
        hint={form.initiative.length > 0 ? `${form.initiative.length} selected` : undefined}
      >
        {initiativesLoading ? (
          <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading initiatives...
          </div>
        ) : initiatives.length === 0 ? (
          <p className="rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
            No active initiatives found
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto rounded-control border border-line bg-canvas">
            {initiatives.map((ini) => {
              const selected = form.initiative.includes(ini.id);
              return (
                <label
                  key={ini.id}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-body transition-colors duration-150 ${
                    selected
                      ? 'bg-accent-soft font-medium text-accent-300'
                      : 'text-ink-muted hover:bg-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      setForm((f) => ({
                        ...f,
                        initiative: selected
                          ? f.initiative.filter((id) => id !== ini.id)
                          : [...f.initiative, ini.id],
                      }));
                    }}
                    className="h-3.5 w-3.5 shrink-0 rounded border-line accent-accent-300"
                  />
                  <span className="truncate">{ini.name}</span>
                </label>
              );
            })}
          </div>
        )}
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
