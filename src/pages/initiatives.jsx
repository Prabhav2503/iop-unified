import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  Check,
  Edit2,
  UserPlus,
  Rocket,
  Layers,
  CheckSquare,
  Activity,
  Calendar,
  Target,
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

// ─── Helpers & Constants ───────────────────────────────────────────────────

function getRoleStr(role) {
  return (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
}

function isPrivilegedRole(user) {
  if (!user) return false;
  const r = getRoleStr(user.role);
  return (
    r.includes('admin') ||
    r.includes('overall_coordinator') ||
    r.includes('co_overall_coordinator') ||
    r.includes('coordinator')
  );
}

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
  completed: 'border-transparent bg-muted text-ink-faint',
  closed: 'border-transparent bg-muted text-ink-faint',
};

// An initiative's icon chip is tinted by its status, so the tint carries
// meaning rather than being decoration.
const STATUS_TONE = {
  planning: 'neutral',
  active: 'accent',
  on_hold: 'warn',
  completed: 'neutral',
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
        <div className="mt-1 max-h-48 overflow-y-auto rounded-control border border-line bg-canvas">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-meta text-ink-faint">No team members found.</p>
          ) : (
            options.map((tm) => {
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

// ─── Modal 2: Edit Initiative Team ──────────────────────────────────────────

function EditInitiativeTeamModal({ initiativeId, currentTeamIds, onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState(currentTeamIds || []);
  const [allTeams, setAllTeams] = useState([]);
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
        <div className="divide-y divide-line-subtle rounded-control border border-line">
          {allTeams.map((tm) => {
            const isSelected = selectedIds.includes(tm.id);
            return (
              <label
                key={tm.id}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-body transition-colors duration-150 ${
                  isSelected ? 'bg-accent-soft font-medium text-accent-300' : 'text-ink-muted hover:bg-muted'
                }`}
              >
                <span className="truncate">{tm.name}</span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(tm.id)}
                  className="h-4 w-4 shrink-0 rounded border-line accent-accent-300"
                />
              </label>
            );
          })}
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
      assignees: selectedAssignees,
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
  const initialAssignees =
    task.assignees ||
    (task.task_assignees?.map((a) => a.team_id || a.id || a).filter(Boolean)) ||
    [];
  const [selectedAssignees, setSelectedAssignees] = useState(initialAssignees);

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
      assignees: selectedAssignees,
    };

    const res = await updateTask(task.id, updates);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess({ ...task, ...updates });
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
  const privileged = isPrivilegedRole(user);

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

  const [expandedId, setExpandedId] = useState(null);
  const [expandedStages, setExpandedStages] = useState([]);
  const [expandedTeamIds, setExpandedTeamIds] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [showEditTeamModalFor, setShowEditTeamModalFor] = useState(null);
  const [showAddStageModalFor, setShowAddStageModalFor] = useState(null);
  const [addTaskStageTarget, setAddTaskStageTarget] = useState(null);

  // Editing Task target state
  const [editingTask, setEditingTask] = useState(null);

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
          assignees: t.assignees || t.task_assignees?.map((a) => a.team_id) || [],
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

  const handleToggleExpand = async (initId) => {
    if (expandedId === initId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(initId);
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
            assignees: t.assignees || t.task_assignees?.map((a) => a.team_id) || [],
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
  };

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
      if (expandedId === id) setExpandedId(null);
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
    const isExpanded = expandedId === init.id;
    const isDeleting = deletingId === init.id;
    const initiativeTasks = tasks.filter((t) => t.initiative_id === init.id);
    const progress = taskProgress(initiativeTasks);
    const isPassed = isDeadlinePassed(init.deadline);
    const canDeleteInitiative = isMyCreator(init.created_by, user) || privileged;

    return (
      <article
        key={init.id}
        className="rounded-surface border border-line bg-surface shadow-card"
      >
        {/* Header row — the toggle is a real button; delete sits beside it,
            not nested inside it. */}
        <div className="flex items-start gap-3 p-5">
          <button
            type="button"
            onClick={() => handleToggleExpand(init.id)}
            aria-expanded={isExpanded}
            className={`flex flex-1 items-start gap-3.5 rounded-control text-left ${FOCUS}`}
          >
            <IconChip icon={Rocket} tone={STATUS_TONE[init.status] || 'neutral'} />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-section font-semibold text-ink">{init.name}</h3>
                <StatusChip status={init.status} />
                {isPassed && (
                  <Chip tone="warn">Deadline passed</Chip>
                )}
              </div>

              {init.description && (
                <p className="line-clamp-2 max-w-3xl text-meta text-ink-muted">
                  {init.description}
                </p>
              )}

              {/* Meta line. Icons are 12px to match the meta text exactly and
                  inherit its faint colour, so they aid scanning without
                  competing. They also separate the items well enough that the
                  dot separators are no longer earning their place. */}
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

            <ChevronDown
              className={`mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

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
        </div>

        {/* Expanding rises in; collapsing cuts. Animating the collapse would
            mean keeping every card's stages and tasks mounted so their height
            could be transitioned, and paying that on a page that can hold
            dozens of initiatives — for a beat nobody watches, since the row
            you clicked is what you are looking at. The chevron rotates both
            ways, which is where the affordance actually lives. */}
        {isExpanded && (
          <div className="animate-rise-in space-y-6 border-t border-line-subtle px-5 py-5">
            {detailsLoading ? (
              <div className="flex items-center gap-2 py-1 text-meta text-ink-faint">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading stages and team...
              </div>
            ) : (
              <>
                {/* Assigned team — inline chips, no container */}
                <div className="space-y-2">
                  <GroupLabel
                    action={
                      !isPassed && privileged && (
                        <button
                          type="button"
                          onClick={() => setShowEditTeamModalFor(init.id)}
                          className={BTN_QUIET}
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Edit team
                        </button>
                      )
                    }
                  >
                    Assigned team ({expandedTeamIds.length})
                  </GroupLabel>

                  {expandedTeamIds.length === 0 ? (
                    <p className="text-meta text-ink-faint">
                      No team members linked to this initiative.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {expandedTeamIds.map((tid) => {
                        const teamMember = allTeams.find((tm) => tm.id === tid);
                        return (
                          <span
                            key={tid}
                            className="rounded-control bg-muted px-2 py-0.5 text-micro font-medium text-ink-muted"
                          >
                            {teamMember ? teamMember.name : `Member ${tid.slice(0, 6)}...`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stages and tasks */}
                <div className="space-y-2">
                  <GroupLabel
                    action={
                      !isPassed && privileged && (
                        <button
                          type="button"
                          onClick={() => setShowAddStageModalFor(init.id)}
                          className={BTN_QUIET}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add stage
                        </button>
                      )
                    }
                  >
                    Stages ({expandedStages.length})
                  </GroupLabel>

                  {expandedStages.length === 0 ? (
                    <p className="text-meta text-ink-faint">
                      No stages yet. Tasks live inside a stage, so add one first.
                    </p>
                  ) : (
                    <div className="divide-y divide-line-subtle border-t border-line-subtle">
                      {expandedStages.map((stg) => {
                        const rawStageTasks = initiativeTasks.filter(
                          (t) => (t.stage_id || t.stage_tasks?.[0]?.stage_id) === stg.id
                        );
                        const sortedStageTasks = sortTasks(rawStageTasks);

                        return (
                          <div key={stg.id} className="py-4">
                            {/* Stage header — a heading, not a nested card */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <IconChip icon={Layers} size="sm" />
                                <h5 className="flex items-baseline gap-2 truncate text-body font-semibold text-ink">
                                  {stg.name}
                                  <span className="text-meta font-normal tabular-nums text-ink-faint">
                                    {sortedStageTasks.length}
                                  </span>
                                </h5>
                              </div>

                              {!isPassed && privileged && (
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAddTaskStageTarget({ id: stg.id, name: stg.name })
                                    }
                                    className={BTN_QUIET}
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Add task
                                  </button>
                                  <IconButton
                                    danger
                                    label="Delete stage"
                                    onClick={() => handleDeleteStage(stg.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </IconButton>
                                </div>
                              )}
                            </div>

                            {/* Task rows — a hairline rule ties them to the
                                stage without adding another box */}
                            {sortedStageTasks.length === 0 ? (
                              <p className="ml-[38px] mt-2 text-meta text-ink-faint">
                                No tasks in this stage yet.
                              </p>
                            ) : (
                              <ul className="ml-[13px] mt-3 divide-y divide-line-subtle border-l border-line pl-5">
                                {sortedStageTasks.map((tsk) => (
                                  <li
                                    key={tsk.id}
                                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-body text-ink">{tsk.title}</p>

                                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
                                        <span className="inline-flex items-center gap-1.5">
                                          <span
                                            aria-hidden="true"
                                            className={`h-1.5 w-1.5 rounded-full ${
                                              PRIORITY_DOT[tsk.priority] || PRIORITY_DOT.medium
                                            }`}
                                          />
                                          <span className="capitalize">
                                            {tsk.priority || 'medium'}
                                          </span>
                                        </span>
                                        <MetaDot />
                                        <span className="capitalize">
                                          {(tsk.status || 'todo').replace('_', ' ')}
                                        </span>
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

                                    {!isPassed && (isMyCreator(tsk.creator_id, user) || privileged) && (
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <IconButton
                                          label="Edit task"
                                          onClick={() => setEditingTask(tsk)}
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </IconButton>
                                        <IconButton
                                          danger
                                          label="Delete task"
                                          onClick={() => handleDeleteTask(tsk.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </IconButton>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </article>
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
          initiativeId={expandedId}
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
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          }}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        <PageHeader
          title="Initiatives"
          description="Initiatives, their stages, and the tasks inside them."
          action={
            privileged && (
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
              // indicator={
              //   <span className="rounded-control bg-accent-soft px-2 py-0.5 text-micro font-medium tabular-nums text-accent-300">
              //     {activeShare}%
              //   </span>
              // }
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
      </div>
    </>
  );
}
