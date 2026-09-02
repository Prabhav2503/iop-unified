import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Check,
  Edit2,
  UserPlus,
  Rocket,
  Layers,
  CheckSquare,
  Activity,
  Calendar,
  Target,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  filterInitiatives,
  partitionInitiatives,
  isMyInitiative,
  isMyCreator,
  isDeadlinePassed,
} from '../utility/initiativeFilters';
import {
  getAllInitiatives,
  createInitiative,
  updateInitiative,
  deleteInitiative,
} from '../API/initiative';
import {
  assignTeamsToInitiative,
  getInitiativeTeamIds,
  removeTeamsFromInitiative,
} from '../API/initiativeTeam';
import {
  createStageForInitiative,
  getStagesByInitiative,
  deleteStage,
} from '../API/stage';
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksByStage,
  getTaskAssigneeIds,
} from '../API/task';
import { getTeamDropdown } from '../API/team';
import {
  FOCUS,
  INPUT_CLS,
  BTN_PRIMARY,
  BTN_QUIET,
  IconChip,
  ProgressBar,
  StatCard,
  MetaDot,
  IconButton,
  GroupLabel,
  Field,
  Modal,
  Chip,
  Select,
  CancelButton,
  FormError,
  PageHeader,
  SearchInput,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from '../components/ui';
import { useFilterReplay } from '../hooks/useFilterReplay';
import { getRoleStr, editPrivilegedRole, addPrivilegedRole } from '../utility/permissions';

// ─── Helpers & Constants ───────────────────────────────────────────────────

const PRIORITY_RANK = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Sort tasks: First by Priority (Urgent > High > Medium > Low), then by Deadline (earliest first)
function sortTasks(tasksList) {
  return [...tasksList].sort((a, b) => {
    const rankA = PRIORITY_RANK[(a.priority || 'medium').toLowerCase()] || 2;
    const rankB = PRIORITY_RANK[(b.priority || 'medium').toLowerCase()] || 2;

    if (rankA !== rankB) {
      return rankB - rankA; // Higher priority first
    }

    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function WhatsAppIcon({ className = 'h-4 w-4', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Completion, derived purely from tasks already in state. No extra fetching.
function taskProgress(list) {
  if (list.length === 0) return null;
  const done = list.filter((t) => (t.status || '').toLowerCase() === 'completed').length;
  return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
}

// ─── Page-specific tokens ──────────────────────────────────────────────────

const PRIORITY_DOT = {
  low: 'bg-ink-faint/40',
  medium: 'bg-ink-faint',
  high: 'bg-warn',
  urgent: 'bg-danger',
};

const STATUS_CHIP = {
  planning: 'border-line bg-transparent text-ink-muted',
  active: 'border-accent-line bg-accent-soft text-accent-300',
  on_hold: 'border-warn-border bg-warn-soft text-warn-ink',
  completed: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-semibold',
  closed: 'border-transparent bg-muted text-ink-faint',
};

// An initiative's icon chip is tinted by its status, so the tint carries
// meaning rather than being decoration.
const STATUS_TONE = {
  planning: 'neutral',
  active: 'accent',
  on_hold: 'warn',
  completed: 'success',
  closed: 'neutral',
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

const INITIATIVE_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

function StatusChip({ status }) {
  const value = status || 'planning';
  return (
    <span
      className={`shrink-0 rounded-control border px-2 py-0.5 text-micro font-medium capitalize ${
        STATUS_CHIP[value] || STATUS_CHIP.planning
      }`}
    >
      {value.replace('_', ' ')}
    </span>
  );
}

// Team picker. Renders the option list IN NORMAL FLOW rather than absolutely
// positioned, so it can never be clipped by the modal's scroll container.
function TeamPicker({ options, selectedIds, onToggle, onRemove, open, setOpen, loading, placeholder }) {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = options.filter((tm) =>
    (tm.name || '').toLowerCase().includes(search.toLowerCase().trim())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading team list...
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className="flex min-h-[38px] cursor-pointer flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas px-3 py-2"
      >
        {selectedIds.length === 0 ? (
          <span className="text-meta text-ink-faint">{placeholder}</span>
        ) : (
          selectedIds.map((id) => {
            const member = options.find((m) => m.id === id);
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-control bg-accent-soft px-2 py-0.5 text-micro font-medium text-accent-300"
              >
                {member ? member.name : id}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(id);
                  }}
                  aria-label="Remove"
                  className="text-accent-300/60 transition-colors hover:text-accent-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>

      {open && (
        <div className="mt-1 max-h-56 overflow-hidden rounded-control border border-line bg-canvas flex flex-col">
          <div className="relative border-b border-line-subtle p-2 bg-surface">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className="w-full rounded-control border border-line bg-canvas py-1 pl-8 pr-7 text-meta text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="max-h-44 overflow-y-auto divide-y divide-line-subtle">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-center text-meta text-ink-faint">
                {search ? `No team members matching "${search}"` : 'No team members found.'}
              </p>
            ) : (
              filtered.map((tm) => {
                const selected = selectedIds.includes(tm.id);
                return (
                  <button
                    type="button"
                    key={tm.id}
                    onClick={() => onToggle(tm.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-body transition-colors duration-150 ${
                      selected
                        ? 'bg-accent-soft font-medium text-accent-300'
                        : 'text-ink-muted hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <span className="truncate">{tm.name}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal 1: Add Initiative ────────────────────────────────────────────────

function AddInitiativeModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('planning');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [teamOptions, setTeamOptions] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamDropdown().then((res) => {
      setTeamOptions(res.data || []);
      setTeamsLoading(false);
    });
  }, []);

  const toggleMember = (id) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeChip = (id) => {
    setSelectedTeamIds((prev) => prev.filter((item) => item !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const initRes = await createInitiative({
      name: name.trim(),
      description: description.trim() || null,
      impact: impact.trim() || null,
      deadline: deadline || null,
      status: status,
      whatsapp_link: whatsappLink.trim() || null,
      creator_id: user.profile_id,
    });

    if (initRes.error) {
      setError(initRes.error);
      setSubmitting(false);
      return;
    }

    const created = initRes.data;

    if (selectedTeamIds.length > 0 && created?.id) {
      await assignTeamsToInitiative(created.id, selectedTeamIds);
    }

    setSubmitting(false);
    onSuccess(created);
  };

  return (
    <Modal
      title="New initiative"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Creating...' : 'Create initiative'}
          </button>
        </>
      }
    >
      <Field label="Initiative name *">
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. AI Innovation Summit 2026"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Description">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief summary of initiative objectives..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Expected impact">
        <input
          type="text"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="e.g. Engage 50+ startups and 1000+ students"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status *">
          <Select
            value={status}
            onChange={setStatus}
            options={INITIATIVE_STATUS_OPTIONS}
            ariaLabel="Status"
            variant="field"
          />
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <Field label="WhatsApp group link">
        <input
          type="url"
          value={whatsappLink}
          onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="e.g. https://chat.whatsapp.com/..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Assignees">
        <TeamPicker
          options={teamOptions}
          selectedIds={selectedTeamIds}
          onToggle={toggleMember}
          onRemove={removeChip}
          open={dropdownOpen}
          setOpen={setDropdownOpen}
          loading={teamsLoading}
          placeholder="Select team members..."
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Modal 1b: Edit Initiative ──────────────────────────────────────────────

function EditInitiativeModal({ initiative, onClose, onSuccess }) {
  const [name, setName] = useState(initiative?.name || '');
  const [description, setDescription] = useState(initiative?.description || '');
  const [impact, setImpact] = useState(initiative?.impact || '');
  const [deadline, setDeadline] = useState(
    initiative?.deadline ? new Date(initiative.deadline).toISOString().split('T')[0] : ''
  );
  const [status, setStatus] = useState(initiative?.status || 'planning');
  const [whatsappLink, setWhatsappLink] = useState(initiative?.whatsapp_link || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSubmitting(true);

    const updates = {
      name: name.trim(),
      description: description.trim() || null,
      impact: impact.trim() || null,
      deadline: deadline || null,
      status,
      whatsapp_link: whatsappLink.trim() || null,
    };

    const res = await updateInitiative(initiative.id, updates);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess(res.data || { ...initiative, ...updates });
    }
  };

  return (
    <Modal
      title="Edit initiative"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
        </>
      }
    >
      <Field label="Initiative name *">
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Description">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief summary of initiative objectives..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Expected impact">
        <input
          type="text"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="e.g. Engage 50+ startups and 1000+ students"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status *">
          <Select
            value={status}
            onChange={setStatus}
            options={INITIATIVE_STATUS_OPTIONS}
            ariaLabel="Status"
            variant="field"
          />
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <Field label="WhatsApp group link">
        <input
          type="url"
          value={whatsappLink}
          onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="e.g. https://chat.whatsapp.com/..."
          className={INPUT_CLS}
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Modal 2: Edit Initiative Team ──────────────────────────────────────────

function EditInitiativeTeamModal({ initiativeId, currentTeamIds, onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState(currentTeamIds || []);
  const [allTeams, setAllTeams] = useState([]);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamDropdown().then((res) => {
      setAllTeams(res.data || []);
      setLoading(false);
    });
  }, []);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const added = selectedIds.filter((id) => !currentTeamIds.includes(id));
    const removed = currentTeamIds.filter((id) => !selectedIds.includes(id));

    try {
      if (added.length > 0) {
        await assignTeamsToInitiative(initiativeId, added);
      }
      if (removed.length > 0) {
        await removeTeamsFromInitiative(initiativeId, removed);
      }
      setSubmitting(false);
      onSuccess(selectedIds);
    } catch {
      setError('Failed to update initiative team');
      setSubmitting(false);
    }
  };

  const filteredTeams = allTeams.filter((tm) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (tm.name || '').toLowerCase().includes(term);
    const roleStr = Array.isArray(tm.role) ? tm.role.join(' ') : (tm.role || '');
    const roleMatch = roleStr.toLowerCase().includes(term);
    return nameMatch || roleMatch;
  });

  return (
    <Modal
      title="Assigned team"
      subtitle={`${selectedIds.length} selected`}
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSave}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save team
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-meta text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading team list...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className="w-full rounded-control border border-line bg-canvas py-1.5 pl-8 pr-7 text-meta text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-line-subtle rounded-control border border-line">
            {filteredTeams.length === 0 ? (
              <div className="px-3 py-4 text-center text-meta text-ink-faint">
                {search ? `No team members matching "${search}"` : 'No team members found.'}
              </div>
            ) : (
              filteredTeams.map((tm) => {
                const isSelected = selectedIds.includes(tm.id);
                return (
                  <label
                    key={tm.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-body transition-colors duration-150 ${
                      isSelected ? 'bg-accent-soft font-medium text-accent-300' : 'text-ink-muted hover:bg-muted'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{tm.name}</div>
                      {tm.role && (
                        <div className="truncate text-micro text-ink-faint">
                          {Array.isArray(tm.role) ? tm.role.join(', ') : tm.role}
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(tm.id)}
                      className="h-4 w-4 shrink-0 rounded border-line accent-accent-300"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Modal 3: Add Stage ─────────────────────────────────────────────────────

function AddStageModal({ initiativeId, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');

    const res = await createStageForInitiative(initiativeId, name.trim());
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess({ id: res.stage_id, name: name.trim() });
    }
  };

  return (
    <Modal
      title="Add stage"
      maxWidth="max-w-sm"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add stage
          </button>
        </>
      }
    >
      <Field label="Stage name *">
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Planning & Outreach"
          className={INPUT_CLS}
        />
      </Field>
      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Modal 4: Add Task ──────────────────────────────────────────────────────

// ─── Modal 4: Add Task ──────────────────────────────────────────────────────

function AddTaskModal({ initiativeId, stageId, stageName, onClose, onSuccess }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [deadline, setDeadline] = useState('');
  const [comment, setComment] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  const [teamOptions, setTeamOptions] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamDropdown().then((res) => {
      setTeamOptions(res.data || []);
      setTeamsLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    setSubmitting(true);

    const taskPayload = {
      title: title.trim(),
      initiative_id: initiativeId || null,
      stage_id: stageId || null,
      creator_id: user?.profile_id || user?.id || user?.user_id || user?.userid || null,
      priority,
      status,
      deadline: deadline || null,
      comment: comment.trim() || null,
      assignees: getTaskAssigneeIds(selectedAssignees),
    };

    const res = await createTask(taskPayload);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess({ id: res.task_id, ...taskPayload });
    }
  };

  const assigneeDropdownOptions = [
    { value: '', label: 'Unassigned (None)' },
    ...teamOptions
      .filter((t) => Boolean(t && (t.id || t.profile_id)))
      .map((t) => {
        const memberId = String(t.id || t.profile_id);
        const roleDisplay = Array.isArray(t.role) ? t.role.join(', ') : t.role || 'Member';
        return {
          value: memberId,
          label: `${t.name || 'Unnamed'} (${roleDisplay})`,
        };
      }),
  ];

  return (
    <Modal
      title="Add task"
      subtitle={`In stage: ${stageName}`}
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create task
          </button>
        </>
      }
    >
      <Field label="Task title *">
        <input
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finalize speaker list"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
            ariaLabel="Priority"
            variant="field"
          />
        </Field>

        <Field label="Status">
          <Select
            value={status}
            onChange={setStatus}
            options={TASK_STATUS_OPTIONS}
            ariaLabel="Status"
            variant="field"
          />
        </Field>
      </div>

      <Field label="Deadline *">
        <input
          type="date"
          required
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Comment / note">
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add initial notes or instructions..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Assign to">
        {teamsLoading ? (
          <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading team members...
          </div>
        ) : (
          <Select
            isMulti
            value={selectedAssignees}
            onChange={setSelectedAssignees}
            options={assigneeDropdownOptions}
            placeholder="Select assignees..."
            ariaLabel="Assign to"
            variant="field"
          />
        )}
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Modal 5: Edit Task ─────────────────────────────────────────────────────

function EditTaskModal({ task, onClose, onSuccess }) {
  const [title, setTitle] = useState(task.title || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [status, setStatus] = useState(task.status || 'todo');
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );
  const [comment, setComment] = useState(task.comment || '');
  const [selectedAssignees, setSelectedAssignees] = useState(getTaskAssigneeIds(task));

  const [teamOptions, setTeamOptions] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamDropdown().then((res) => {
      setTeamOptions(res.data || []);
      setTeamsLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    setSubmitting(true);

    const updates = {
      title: title.trim(),
      priority,
      status,
      deadline: deadline || null,
      comment: comment.trim() || null,
      assignees: getTaskAssigneeIds(selectedAssignees),
    };

    const res = await updateTask(task.id, updates);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      const assignees = getTaskAssigneeIds(res.data || updates);
      onSuccess({ ...task, ...updates, ...(res.data || {}), assignees });
    }
  };

  const assigneeDropdownOptions = [
    { value: '', label: 'Unassigned (None)' },
    ...teamOptions
      .filter((t) => Boolean(t && (t.id || t.profile_id)))
      .map((t) => {
        const memberId = String(t.id || t.profile_id);
        const roleDisplay = Array.isArray(t.role) ? t.role.join(', ') : t.role || 'Member';
        return {
          value: memberId,
          label: `${t.name || 'Unnamed'} (${roleDisplay})`,
        };
      }),
  ];

  return (
    <Modal
      title="Edit task"
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
        </>
      }
    >
      <Field label="Task title *">
        <input
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
            ariaLabel="Priority"
            variant="field"
          />
        </Field>

        <Field label="Status">
          <Select
            value={status}
            onChange={setStatus}
            options={TASK_STATUS_OPTIONS}
            ariaLabel="Status"
            variant="field"
          />
        </Field>
      </div>

      <Field label="Deadline *">
        <input
          type="date"
          required
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Comment / note">
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add or edit task comment..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Assign to">
        {teamsLoading ? (
          <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-meta text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading team members...
          </div>
        ) : (
          <Select
            isMulti
            value={selectedAssignees}
            onChange={setSelectedAssignees}
            options={assigneeDropdownOptions}
            placeholder="Select assignees..."
            ariaLabel="Assign to"
            variant="field"
          />
        )}
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Main Initiatives Page Component ───────────────────────────────────────

export default function InitiativesPage() {
  const { user } = useAuth();
  const canEdit = editPrivilegedRole(user);
  const canAdd = addPrivilegedRole(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const routeInitiativeId = searchParams.get('id');

  const [initiatives, setInitiatives] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Classification filter: 'all', 'my', 'others'
  const [classificationFilter, setClassificationFilter] = useState('all');

  // Replays the list's load-in on every scope / status click.
  const [listReplayKey, replayList] = useFilterReplay();

  const [selectedInitiativeId, setSelectedInitiativeId] = useState(null);
  const [expandedStages, setExpandedStages] = useState([]);
  const [expandedTeamIds, setExpandedTeamIds] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [showEditTeamModalFor, setShowEditTeamModalFor] = useState(null);
  const [showAddStageModalFor, setShowAddStageModalFor] = useState(null);
  const [addTaskStageTarget, setAddTaskStageTarget] = useState(null);

  // Editing Task target state
  const [editingTask, setEditingTask] = useState(null);

  // Editing Initiative target state
  const [editingInitiative, setEditingInitiative] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const fetchData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [initRes, tasksRes, teamsRes] = await Promise.all([
        getAllInitiatives(),
        getAllTasks(),
        getTeamDropdown(),
      ]);
      if (initRes.error) setError(initRes.error);
      setInitiatives(initRes.data || []);

      // Filter and normalize tasks to include stage_id and assignees from backend relation schemas
      const normalizedTasks = (tasksRes.data || [])
        .filter((t) => t.initiative_id != null)
        .map((t) => ({
          ...t,
          stage_id: t.stage_id || t.stage_tasks?.[0]?.stage_id || null,
          assignees: getTaskAssigneeIds(t),
        }));
      setTasks(normalizedTasks);

      setAllTeams(teamsRes.data || []);
    } catch {
      setError('Unexpected error loading initiatives data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openInitiativeDetails = useCallback(async (initId) => {
    setSelectedInitiativeId(initId);
    setDetailsLoading(true);

    try {
      const [stagesRes, teamRes] = await Promise.all([
        getStagesByInitiative(initId),
        getInitiativeTeamIds(initId),
      ]);

      const stgList = stagesRes.data || [];
      setExpandedStages(stgList);
      setExpandedTeamIds(teamRes.data || []);

      if (stgList.length > 0) {
        const stageTasksResults = await Promise.all(
          stgList.map((stg) => getTasksByStage(stg.id))
        );

        const fetchedTasks = stageTasksResults
          .flatMap((res) => res.data || [])
          .map((t) => ({
            ...t,
            stage_id: t.stage_id || t.stage_tasks?.[0]?.stage_id || null,
            assignees: getTaskAssigneeIds(t),
          }));

        setTasks((prev) => {
          const loadedStageIds = stgList.map((s) => s.id);
          const remaining = prev.filter(
            (t) => !loadedStageIds.includes(t.stage_id || t.stage_tasks?.[0]?.stage_id)
          );
          return [...remaining, ...fetchedTasks];
        });
      }
    } catch {
      setExpandedStages([]);
      setExpandedTeamIds([]);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const handleOpenInitiative = (initId) => {
    setSearchParams({ id: initId });
  };

  const handleCloseInitiative = () => {
    setSelectedInitiativeId(null);
    setSearchParams({});
  };

  useEffect(() => {
    if (!routeInitiativeId) {
      setSelectedInitiativeId(null);
      return;
    }
    if (loading) return;
    void openInitiativeDetails(routeInitiativeId);
  }, [routeInitiativeId, loading, openInitiativeDetails]);

  const handleDeleteInitiative = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this initiative? Linked stages and tasks will be cleaned up.')) return;

    setDeletingId(id);
    const res = await deleteInitiative(id);
    setDeletingId(null);

    if (res.error) {
      alert(`Delete failed: ${res.error}`);
    } else {
      setInitiatives((prev) => prev.filter((i) => i.id !== id));
      if (String(selectedInitiativeId) === String(id)) handleCloseInitiative();
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('Delete this stage? Tasks in this stage will also be cleaned up.')) return;
    const res = await deleteStage(stageId);
    if (res.error) {
      alert(res.error);
    } else {
      setExpandedStages((prev) => prev.filter((s) => s.id !== stageId));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    const res = await deleteTask(taskId);
    if (res.error) {
      alert(res.error);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  // Filter Initiatives by Status, Search, and Classification using utility
  const filteredInitiatives = filterInitiatives(initiatives, {
    statusFilter,
    search,
    classificationFilter,
    user,
  });

  // Group into My Initiatives vs Other Initiatives
  const { myInitiatives, otherInitiatives } = partitionInitiatives(filteredInitiatives, user);

  // Selected initiative
  const selectedInitiative = initiatives.find((i) => String(i.id) === String(selectedInitiativeId));

  // ── Summary figures. Every one of these is derived from `initiatives` and
  // ── `tasks` already in state — no additional requests, no new fields.
  const myTotal = initiatives.filter((i) => isMyInitiative(i, user)).length;
  const activeCount = initiatives.filter(
    (i) => (i.status || '').toLowerCase() === 'active'
  ).length;
  const activeShare = initiatives.length
    ? Math.round((activeCount / initiatives.length) * 100)
    : 0;
  const overallProgress = taskProgress(tasks);
  const overdueCount = tasks.filter((t) => {
    if (!t.deadline || (t.status || '').toLowerCase() === 'completed') return false;
    const due = new Date(t.deadline);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const renderInitiativeCard = (init) => {
    const isDeleting = deletingId === init.id;
    const initiativeTasks = tasks.filter((t) => t.initiative_id === init.id);
    const progress = taskProgress(initiativeTasks);
    const isPassed = isDeadlinePassed(init.deadline);
    const canDeleteInitiative = isMyCreator(init.created_by, user) || canEdit;
    const canEditInitiative = isMyCreator(init.created_by, user) || canEdit;

    return (
      <article
        key={init.id}
        onClick={() => handleOpenInitiative(init.id)}
        className="group relative cursor-pointer rounded-surface border border-line bg-surface p-5 shadow-card transition-all duration-150 hover:border-accent-400/50 hover:shadow-overlay"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-3.5">
            <IconChip icon={Rocket} tone={STATUS_TONE[init.status] || 'neutral'} />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-section font-semibold text-ink transition-colors group-hover:text-accent-300">
                  {init.name}
                </h3>
                <StatusChip status={init.status} />
                {isPassed && <Chip tone="warn">Deadline passed</Chip>}
              </div>

              {init.description && (
                <p className="line-clamp-2 max-w-3xl text-meta text-ink-muted">
                  {init.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-meta text-ink-faint">
                {init.deadline && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">Due {formatDate(init.deadline)}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <CheckSquare className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">{initiativeTasks.length} tasks</span>
                </span>

                {init.impact && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Target className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{init.impact}</span>
                  </span>
                )}

                {init.whatsapp_link && (
                  <a
                    href={formatUrl(init.whatsapp_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 font-medium text-emerald-500 transition-colors duration-150 hover:text-emerald-400 hover:underline"
                    title="Open WhatsApp group"
                  >
                    <WhatsAppIcon className="h-3 w-3 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {progress && (
                <div className="flex max-w-md items-center gap-3 pt-1">
                  <ProgressBar value={progress.pct} />
                  <span className="shrink-0 text-micro tabular-nums text-ink-faint">
                    {progress.done}/{progress.total} done
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {init.whatsapp_link && (
              <a
                href={formatUrl(init.whatsapp_link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open WhatsApp group"
                aria-label="Open WhatsApp group"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-emerald-500 transition duration-150 ease-exit hover:bg-emerald-500/10 hover:text-emerald-400 active:scale-90"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}

            {canEditInitiative && (
              <IconButton
                label="Edit initiative"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingInitiative(init);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </IconButton>
            )}

            {canDeleteInitiative && (
              <IconButton
                danger
                disabled={isDeleting}
                label="Delete initiative"
                onClick={(e) => handleDeleteInitiative(e, init.id)}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </IconButton>
            )}

            <div className="ml-1 text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent-300">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </article>
    );
  };

  // Dedicated Detail Section View for Selected Initiative
  const renderInitiativeDetail = (init) => {
    const isDeleting = deletingId === init.id;
    const initiativeTasks = tasks.filter((t) => t.initiative_id === init.id);
    const progress = taskProgress(initiativeTasks);
    const isPassed = isDeadlinePassed(init.deadline);
    const canDeleteInitiative = isMyCreator(init.created_by, user) || canEdit;
    const canEditInitiative = isMyCreator(init.created_by, user) || canEdit;

    return (
      <div className="space-y-6 animate-rise-in">
        {/* Back navigation bar with actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCloseInitiative}
            className="inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3.5 py-2 text-body font-semibold text-ink transition-colors hover:border-accent-400 hover:bg-muted active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 text-accent-300" />
            <span>Back to all initiatives</span>
          </button>

          <div className="flex items-center gap-2">
            {init.whatsapp_link && (
              <a
                href={formatUrl(init.whatsapp_link)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open WhatsApp group"
                className="inline-flex items-center gap-2 rounded-control border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-meta font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>WhatsApp group</span>
              </a>
            )}

            {canEditInitiative && (
              <button
                type="button"
                onClick={() => setEditingInitiative(init)}
                className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-meta font-semibold text-ink transition-colors hover:bg-muted"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit initiative</span>
              </button>
            )}

            {canDeleteInitiative && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => handleDeleteInitiative(e, init.id)}
                className="inline-flex items-center gap-1.5 rounded-control border border-danger-border bg-danger-soft px-3 py-1.5 text-meta font-semibold text-danger-ink transition-colors hover:bg-danger-soft/80"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Initiative Overview Card */}
        <article className="rounded-surface border border-line bg-surface p-6 shadow-card space-y-4">
          <div className="flex items-start gap-4">
            <IconChip icon={Rocket} tone={STATUS_TONE[init.status] || 'neutral'} size="lg" />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-title font-bold text-ink">{init.name}</h1>
                <StatusChip status={init.status} />
                {isPassed && <Chip tone="warn">Deadline passed</Chip>}
              </div>

              {init.description && (
                <p className="max-w-4xl text-body text-ink-muted leading-relaxed">
                  {init.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-meta text-ink-faint">
                {init.deadline && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink-muted">
                    <Calendar className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <span className="tabular-nums">Due {formatDate(init.deadline)}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <CheckSquare className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  <span className="tabular-nums font-medium">{initiativeTasks.length} total tasks</span>
                </span>

                {init.impact && (
                  <span className="inline-flex items-center gap-1.5 text-ink-muted">
                    <Target className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <span>{init.impact}</span>
                  </span>
                )}
              </div>

              {progress && (
                <div className="flex max-w-lg items-center gap-3 pt-2">
                  <ProgressBar value={progress.pct} />
                  <span className="shrink-0 text-meta font-medium tabular-nums text-ink-faint">
                    {progress.done}/{progress.total} tasks completed ({progress.pct}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Details: Assigned team + Stages & Tasks */}
        {detailsLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-surface border border-line bg-surface py-12 text-body text-ink-faint">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading stages and team details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Assigned team card */}
            <div className="rounded-surface border border-line bg-surface p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-section font-semibold text-ink">Assigned team</h3>
                  <span className="rounded-control bg-muted px-2 py-0.5 text-micro font-medium tabular-nums text-ink-faint">
                    {expandedTeamIds.length}
                  </span>
                </div>

                {!isPassed && (isMyCreator(init.created_by, user) || canEdit) && (
                  <button
                    type="button"
                    onClick={() => setShowEditTeamModalFor(init.id)}
                    className={BTN_QUIET}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Edit team
                  </button>
                )}
              </div>

              {expandedTeamIds.length === 0 ? (
                <p className="text-body text-ink-faint">
                  No team members linked to this initiative yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {expandedTeamIds.map((tid) => {
                    const teamMember = allTeams.find((tm) => tm.id === tid);
                    return (
                      <span
                        key={tid}
                        className="inline-flex items-center gap-1.5 rounded-control border border-line bg-canvas px-3 py-1.5 text-meta font-medium text-ink-muted"
                      >
                        <span className="font-semibold text-ink">
                          {teamMember ? teamMember.name : `Member ${tid.slice(0, 6)}...`}
                        </span>
                        {teamMember?.role && (
                          <span className="text-micro text-ink-faint">
                            ({Array.isArray(teamMember.role) ? teamMember.role.join(', ') : teamMember.role})
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stages & Tasks card */}
            <div className="rounded-surface border border-line bg-surface p-5 shadow-card space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-section font-semibold text-ink">Stages & tasks</h3>
                  <span className="rounded-control bg-muted px-2 py-0.5 text-micro font-medium tabular-nums text-ink-faint">
                    {expandedStages.length} stage{expandedStages.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {!isPassed && canAdd && (
                  <button
                    type="button"
                    onClick={() => setShowAddStageModalFor(init.id)}
                    className={BTN_QUIET}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add stage
                  </button>
                )}
              </div>

              {expandedStages.length === 0 ? (
                <p className="py-2 text-body text-ink-faint">
                  No stages yet. Tasks live inside a stage, so add one first.
                </p>
              ) : (
                <div className="divide-y divide-line-subtle">
                  {expandedStages.map((stg) => {
                    const rawStageTasks = initiativeTasks.filter(
                      (t) => (t.stage_id || t.stage_tasks?.[0]?.stage_id) === stg.id
                    );
                    const sortedStageTasks = sortTasks(rawStageTasks);

                    return (
                      <div key={stg.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <IconChip icon={Layers} size="sm" />
                            <h4 className="flex items-baseline gap-2 truncate text-body font-semibold text-ink">
                              {stg.name}
                              <span className="text-meta font-normal tabular-nums text-ink-faint">
                                ({sortedStageTasks.length} task{sortedStageTasks.length !== 1 ? 's' : ''})
                              </span>
                            </h4>
                          </div>

                          {!isPassed && (canAdd || canEdit) && (
                            <div className="flex shrink-0 items-center gap-1">
                              {canAdd && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddTaskStageTarget({ id: stg.id, name: stg.name })
                                  }
                                  className={BTN_QUIET}
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add task
                                </button>
                              )}
                              {canEdit && (
                                <IconButton
                                  danger
                                  label="Delete stage"
                                  onClick={() => handleDeleteStage(stg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconButton>
                              )}
                            </div>
                          )}
                        </div>

                        {sortedStageTasks.length === 0 ? (
                          <p className="ml-9 text-meta text-ink-faint">
                            No tasks in this stage yet.
                          </p>
                        ) : (
                          <ul className="ml-4 divide-y divide-line-subtle border-l-2 border-line pl-5">
                            {sortedStageTasks.map((tsk) => {
                              const isCompleted = (tsk.status || '').toLowerCase() === 'completed';
                              return (
                                <li
                                  key={tsk.id}
                                  className="flex items-start justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-body font-medium ${isCompleted ? 'text-emerald-400' : 'text-ink'}`}>
                                      {tsk.title}
                                    </p>

                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span
                                          aria-hidden="true"
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            isCompleted ? 'bg-emerald-400' : (PRIORITY_DOT[tsk.priority] || PRIORITY_DOT.medium)
                                          }`}
                                        />
                                        <span className="capitalize">
                                          {tsk.priority || 'medium'}
                                        </span>
                                      </span>
                                      <MetaDot />
                                      {isCompleted ? (
                                        <span className="inline-flex items-center gap-1 rounded-control border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-micro font-semibold capitalize text-emerald-400">
                                          <Check className="h-3 w-3 text-emerald-400" /> completed
                                        </span>
                                      ) : (
                                        <span className="capitalize">
                                          {(tsk.status || 'todo').replace('_', ' ')}
                                        </span>
                                      )}
                                      {tsk.deadline && (
                                        <>
                                          <MetaDot />
                                          <span className="tabular-nums">
                                            Due {formatDate(tsk.deadline)}
                                          </span>
                                        </>
                                      )}
                                    </p>
                                    {tsk.comment && (
                                      <p className="mt-1 border-l-2 border-line pl-2 text-meta text-ink-faint">
                                        {tsk.comment}
                                      </p>
                                    )}
                                  </div>

                                {!isPassed && (isMyCreator(tsk.creator_id, user) || canEdit) && (
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    {isMyCreator(tsk.creator_id, user) && (
                                      <IconButton
                                        label="Edit task"
                                        onClick={() => setEditingTask(tsk)}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </IconButton>
                                    )}
                                    {(isMyCreator(tsk.creator_id, user) || canEdit) && (
                                      <IconButton
                                        danger
                                        label="Delete task"
                                        onClick={() => handleDeleteTask(tsk.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </IconButton>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Both groups get identical treatment — heading, count, rule.
  const renderGroup = (heading, list, emptyText) => (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2 border-b border-line pb-2">
        <h2 className="font-display text-section font-semibold text-ink">{heading}</h2>
        <span className="text-meta tabular-nums text-ink-faint">{list.length}</span>
      </div>

      {list.length === 0 ? (
        <p className="py-1 text-body text-ink-faint">{emptyText}</p>
      ) : (
        <div className="stagger-in space-y-4">
          {list.map((init) => renderInitiativeCard(init))}
        </div>
      )}
    </section>
  );

  return (
    <>
      {showAddInitiativeModal && (
        <AddInitiativeModal
          onClose={() => setShowAddInitiativeModal(false)}
          onSuccess={(created) => {
            setShowAddInitiativeModal(false);
            if (created) setInitiatives((prev) => [created, ...prev]);
          }}
        />
      )}

      {editingInitiative && (
        <EditInitiativeModal
          initiative={editingInitiative}
          onClose={() => setEditingInitiative(null)}
          onSuccess={(updatedInit) => {
            setEditingInitiative(null);
            setInitiatives((prev) =>
              prev.map((i) => (i.id === updatedInit.id ? { ...i, ...updatedInit } : i))
            );
          }}
        />
      )}

      {showEditTeamModalFor && (
        <EditInitiativeTeamModal
          initiativeId={showEditTeamModalFor}
          currentTeamIds={expandedTeamIds}
          onClose={() => setShowEditTeamModalFor(null)}
          onSuccess={(updatedIds) => {
            setShowEditTeamModalFor(null);
            setExpandedTeamIds(updatedIds);
          }}
        />
      )}

      {showAddStageModalFor && (
        <AddStageModal
          initiativeId={showAddStageModalFor}
          onClose={() => setShowAddStageModalFor(null)}
          onSuccess={(newStage) => {
            setShowAddStageModalFor(null);
            if (newStage) setExpandedStages((prev) => [...prev, newStage]);
          }}
        />
      )}

      {addTaskStageTarget && (
        <AddTaskModal
          initiativeId={selectedInitiativeId}
          stageId={addTaskStageTarget.id}
          stageName={addTaskStageTarget.name}
          onClose={() => setAddTaskStageTarget(null)}
          onSuccess={(newTask) => {
            setAddTaskStageTarget(null);
            if (newTask) setTasks((prev) => [newTask, ...prev]);
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={(updatedTask) => {
            setEditingTask(null);
            const assignees = getTaskAssigneeIds(updatedTask);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updatedTask.id
                  ? { ...updatedTask, assignees, task_assignees: assignees.map((team_id) => ({ team_id })) }
                  : t
              )
            );
          }}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        {selectedInitiative ? (
          renderInitiativeDetail(selectedInitiative)
        ) : (
          <>
            <PageHeader
              title="Initiatives"
              description="Initiatives, their stages, and the tasks inside them."
              action={
                canAdd && (
                  <button onClick={() => setShowAddInitiativeModal(true)} className={BTN_PRIMARY}>
                    <Plus className="h-4 w-4" />
                    New initiative
                  </button>
                )
              }
            />

            {/* Summary — big figure, quiet label, small real indicator */}
            {!loading && !error && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Rocket}
                  tone="neutral"
                  value={initiatives.length}
                  label="Total initiatives"
                  indicator={
                    <span className="text-micro tabular-nums text-ink-faint">{myTotal} yours</span>
                  }
                />
                <StatCard
                  icon={Activity}
                  tone="accent"
                  value={activeCount}
                  label="Active now"
                />
              </div>
            )}

            {/* One control row: search, scope, status */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search initiatives..."
              />

              <div className="flex shrink-0 items-center gap-2">
                {/* Scope — recessed track, raised active cell: reads as a
                    physical switch rather than tabs */}
                <div className="flex rounded-control border border-line bg-canvas p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'my', label: 'Mine' },
                    { id: 'others', label: 'Others' },
                  ].map((tab) => {
                    const active = classificationFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setClassificationFilter(tab.id);
                          replayList();
                        }}
                        aria-pressed={active}
                        className={`rounded-[6px] px-3 py-1.5 text-meta font-semibold transition duration-150 ease-exit active:scale-[0.98] active:duration-100 ${FOCUS} ${
                          active
                            ? 'bg-accent-soft text-accent-300 shadow-card'
                            : 'text-ink-faint hover:text-ink'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <Select
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    replayList();
                  }}
                  options={STATUS_FILTER_OPTIONS}
                  ariaLabel="Filter by status"
                />
              </div>
            </div>

            {/* Keyed on the replay counter, not on the filter values: two filters
                that resolve to the same list still count as two clicks, and both
                get the same acknowledgement. Search is deliberately not wired in. */}
            <div key={listReplayKey}>
              {loading ? (
                <LoadingPanel>Loading initiatives...</LoadingPanel>
              ) : error ? (
                <ErrorPanel>{error}</ErrorPanel>
              ) : filteredInitiatives.length === 0 ? (
                <EmptyPanel>No initiatives match your search or filters.</EmptyPanel>
              ) : (
                <div className="space-y-6">
                  {(classificationFilter === 'all' || classificationFilter === 'my') &&
                    renderGroup(
                      'Your initiatives',
                      myInitiatives,
                      "You haven't created any initiatives yet."
                    )}

                  {(classificationFilter === 'all' || classificationFilter === 'others') &&
                    renderGroup('Other initiatives', otherInitiatives, 'No other initiatives found.')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
