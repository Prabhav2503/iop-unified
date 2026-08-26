import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Filter,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInitiatives, useTasks, useTeamDropdown, useDeleteTask, useCreateTask } from '../hooks/useQueries';
import { getTaskAssigneeIds } from '../API/task';
import {
  BTN_PRIMARY,
  BTN_QUIET,
  PageHeader,
  Modal,
  Field,
  Select as UISelect,
  CancelButton,
  FormError,
  LoadingPanel,
  ErrorPanel,
  FOCUS,
} from '../components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-7-days', label: 'Next 7 Days' },
  { value: 'overdue', label: 'Overdue' },
];

// Task statuses
const TASK_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Task Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

// Initiative statuses — matches what the backend stores
const INITIATIVE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Initiative Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateStr) {
  if (!dateStr) return '—';
  try {
    if (typeof dateStr === 'string') {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

function getPossibleUserIds(user) {
  if (!user) return [];
  return [user.profile_id, user.id, user.user_id, user.team_id]
    .filter(Boolean)
    .map((id) => String(id).toLowerCase().trim());
}

function isAssignedToMe(task, user) {
  if (!task || !user) return false;
  const myIds = getPossibleUserIds(user);
  const assignees = getTaskAssigneeIds(task).map((id) => String(id).toLowerCase().trim());
  return assignees.some((id) => myIds.includes(id));
}

function getAssigneeNames(task, teamMap) {
  if (!task) return [];
  const ids = getTaskAssigneeIds(task);
  return ids.map((id) => teamMap[id]?.name || `#${id}`);
}

// ─── Event colour coding ──────────────────────────────────────────────────────

function getEventStyle(event) {
  if (event.type === 'initiative') {
    return {
      bg: 'bg-accent-soft',
      border: 'border-accent-line',
      text: 'text-accent-300',
      dot: 'bg-accent-300',
    };
  }
  const s = (event.status || 'todo').toLowerCase();
  if (s === 'blocked') return { bg: 'bg-danger-soft', border: 'border-danger-border', text: 'text-danger-ink', dot: 'bg-danger' };
  if (s === 'completed') return { bg: 'bg-muted', border: 'border-line', text: 'text-ink-faint', dot: 'bg-ink-faint' };
  if (s === 'in_progress') return { bg: 'bg-warn-soft', border: 'border-warn-border', text: 'text-warn-ink', dot: 'bg-warn' };
  return { bg: 'bg-surface', border: 'border-line', text: 'text-ink-muted', dot: 'bg-ink-faint/50' };
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onSuccess, initiatives, teamOptions }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [deadline, setDeadline] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [error, setError] = useState('');

  const createTaskMutation = useCreateTask();

  const initiativeOptions = [
    { value: '', label: 'No Initiative (Standalone)' },
    ...initiatives.map((i) => ({ value: String(i.id), label: i.name })),
  ];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...teamOptions.map((t) => ({
      value: String(t.id || t.profile_id),
      label: t.name || 'Unnamed',
    })),
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Task title is required.'); return; }
    setError('');

    createTaskMutation.mutate({
      title: title.trim(),
      initiative_id: initiativeId || null,
      stage_id: null,
      creator_id: user?.profile_id || user?.id || user?.user_id || null,
      priority,
      status,
      deadline: deadline || null,
      assignees: getTaskAssigneeIds(selectedAssignees),
    }, {
      onSuccess: () => {
        onSuccess();
      },
      onError: (err) => {
        setError(err.message || 'Failed to create task');
      },
    });
  };

  return (
    <Modal
      title="Add task"
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={createTaskMutation.isPending} className={BTN_PRIMARY}>
            {createTaskMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
          placeholder="e.g. Review sponsorship deck"
          className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/25"
        />
      </Field>

      <Field label="Deadline">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-body text-ink focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/25"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <UISelect
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
            ariaLabel="Priority"
            variant="field"
          />
        </Field>
        <Field label="Status">
          <UISelect
            value={status}
            onChange={setStatus}
            options={TASK_STATUS_OPTIONS}
            ariaLabel="Status"
            variant="field"
          />
        </Field>
      </div>

      <Field label="Initiative">
        <UISelect
          value={initiativeId}
          onChange={setInitiativeId}
          options={initiativeOptions}
          ariaLabel="Initiative"
          variant="field"
        />
      </Field>

      <Field label="Assign to">
        <UISelect
          value={selectedAssignees}
          onChange={setSelectedAssignees}
          options={assigneeOptions}
          ariaLabel="Assign to"
          variant="field"
          isMulti
          placeholder="Select assignees..."
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({ event, teamMap, onClose, onDelete, canDelete }) {
  const style = getEventStyle(event);

  return (
    <Modal
      title={event.type === 'initiative' ? 'Initiative Deadline' : 'Task Details'}
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(event)}
                className="inline-flex items-center gap-1.5 rounded-control border border-danger-border bg-danger-soft px-3 py-1.5 text-meta font-semibold text-danger-ink transition duration-150 hover:bg-danger/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className={BTN_QUIET}>Close</button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Title + type badge */}
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
          <div className="min-w-0">
            {event.initiativeName && event.type === 'task' && (
              <p className="mb-0.5 text-micro font-semibold uppercase tracking-wide text-accent-300">
                {event.initiativeName}
              </p>
            )}
            <h3 className="font-display text-section font-semibold text-ink">{event.title}</h3>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 rounded-surface border border-line bg-canvas p-3 text-meta">
          <div>
            <p className="text-micro text-ink-faint">Type</p>
            <p className="font-medium text-ink capitalize">{event.type}</p>
          </div>
          {event.deadline && (
            <div>
              <p className="text-micro text-ink-faint">Deadline</p>
              <p className="font-medium text-ink">{formatDisplay(event.deadline)}</p>
            </div>
          )}
          {event.status && (
            <div>
              <p className="text-micro text-ink-faint">Status</p>
              <p className={`font-medium capitalize ${style.text}`}>{event.status.replace('_', ' ')}</p>
            </div>
          )}
          {event.priority && (
            <div>
              <p className="text-micro text-ink-faint">Priority</p>
              <p className="font-medium text-ink capitalize">{event.priority}</p>
            </div>
          )}
        </div>

        {/* Assignees */}
        {event.type === 'task' && (() => {
          const names = getAssigneeNames(event.raw, teamMap);
          return names.length > 0 ? (
            <div>
              <p className="mb-1 text-micro text-ink-faint">Assigned to</p>
              <div className="flex flex-wrap gap-1.5">
                {names.map((name) => (
                  <span
                    key={name}
                    className="rounded-control bg-muted px-2 py-0.5 text-micro font-medium text-ink-muted"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Description */}
        {event.description && (
          <div>
            <p className="mb-1 text-micro text-ink-faint">Description</p>
            <p className="rounded-surface border border-line bg-canvas px-3 py-2.5 text-meta text-ink-muted">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Day Events Modal ─────────────────────────────────────────────────────────

function DayEventsModal({ dateStr, events, onClose, onSelectEvent }) {
  const grouped = useMemo(() => {
    const byInit = {};
    const standalone = [];
    events.forEach((e) => {
      if (e.initiativeName) {
        if (!byInit[e.initiativeName]) byInit[e.initiativeName] = [];
        byInit[e.initiativeName].push(e);
      } else {
        standalone.push(e);
      }
    });
    return { byInit, standalone };
  }, [events]);

  return (
    <Modal
      title={`Events on ${formatDisplay(dateStr)}`}
      maxWidth="max-w-lg"
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      footer={<button type="button" onClick={onClose} className={BTN_QUIET}>Close</button>}
    >
      <div className="space-y-4">
        {Object.entries(grouped.byInit).map(([name, evts]) => (
          <div key={name}>
            <p className="mb-1.5 text-micro font-semibold uppercase tracking-wider text-accent-300">{name}</p>
            <div className="space-y-1.5">
              {evts.map((e) => {
                const st = getEventStyle(e);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onClose(); onSelectEvent(e); }}
                    className={`w-full rounded-control border px-3 py-2.5 text-left transition duration-150 hover:opacity-90 ${st.bg} ${st.border}`}
                  >
                    <p className={`text-meta font-semibold ${st.text}`}>{e.title}</p>
                    {e.status && (
                      <p className="mt-0.5 text-micro text-ink-faint capitalize">{e.status.replace('_', ' ')}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {grouped.standalone.length > 0 && (
          <div>
            {Object.keys(grouped.byInit).length > 0 && (
              <p className="mb-1.5 text-micro font-semibold uppercase tracking-wider text-ink-faint">Other</p>
            )}
            <div className="space-y-1.5">
              {grouped.standalone.map((e) => {
                const st = getEventStyle(e);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onClose(); onSelectEvent(e); }}
                    className={`w-full rounded-control border px-3 py-2.5 text-left transition duration-150 hover:opacity-90 ${st.bg} ${st.border}`}
                  >
                    <p className={`text-meta font-semibold ${st.text}`}>{e.title}</p>
                    {e.status && (
                      <p className="mt-0.5 text-micro text-ink-faint capitalize">{e.status.replace('_', ' ')}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <p className="text-body text-ink-faint">No events on this day.</p>
        )}
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ event, onClose, onConfirm, deleting }) {
  return (
    <Modal
      title="Delete task?"
      maxWidth="max-w-sm"
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-control bg-danger px-3.5 py-2 text-body font-semibold text-white transition duration-150 hover:opacity-90 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <p className="text-body text-ink-muted">
          "<span className="font-semibold text-ink">{event?.title}</span>" will be permanently
          removed from all views. This cannot be undone.
        </p>
      </div>
    </Modal>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange, initiatives, onClear, hasActive }) {
  const initiativeOptions = [
    { value: '', label: 'All Initiatives' },
    ...initiatives.map((i) => ({ value: String(i.id), label: i.name })),
  ];

  const showTaskStatus = filters.scope !== 'initiatives-only';
  const showInitiativeStatus = filters.scope !== 'tasks-only';

  return (
    <div className="rounded-surface border border-line bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-meta font-semibold text-ink">Filters</h3>
        {hasActive && (
          <button
            type="button"
            onClick={onClear}
            className={`inline-flex items-center gap-1 text-micro font-medium text-ink-faint hover:text-ink ${FOCUS}`}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="space-y-1">
          <label className="block text-micro font-medium text-ink-faint">Initiative</label>
          <UISelect
            value={filters.initiativeId}
            onChange={(v) => onChange({ ...filters, initiativeId: v })}
            options={initiativeOptions}
            ariaLabel="Filter by initiative"
            variant="toolbar"
          />
        </div>

        {showTaskStatus && (
          <div className="space-y-1">
            <label className="block text-micro font-medium text-ink-faint">Task status</label>
            <UISelect
              value={filters.status}
              onChange={(v) => onChange({ ...filters, status: v })}
              options={TASK_STATUS_FILTER_OPTIONS}
              ariaLabel="Filter by task status"
              variant="toolbar"
            />
          </div>
        )}

        {showInitiativeStatus && (
          <div className="space-y-1">
            <label className="block text-micro font-medium text-ink-faint">Initiative status</label>
            <UISelect
              value={filters.initiativeStatus}
              onChange={(v) => onChange({ ...filters, initiativeStatus: v })}
              options={INITIATIVE_STATUS_FILTER_OPTIONS}
              ariaLabel="Filter by initiative status"
              variant="toolbar"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-micro font-medium text-ink-faint">Time</label>
          <UISelect
            value={filters.time}
            onChange={(v) => onChange({ ...filters, time: v })}
            options={TIME_FILTER_OPTIONS}
            ariaLabel="Filter by time"
            variant="toolbar"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-micro font-medium text-ink-faint">Scope</label>
          <UISelect
            value={filters.scope}
            onChange={(v) => onChange({ ...filters, scope: v })}
            options={[
              { value: 'all', label: 'All Events' },
              { value: 'mine', label: 'Assigned to Me' },
              { value: 'tasks-only', label: 'Tasks Only' },
              { value: 'initiatives-only', label: 'Initiatives Only' },
            ]}
            ariaLabel="Filter by scope"
            variant="toolbar"
          />
        </div>
      </div>

      {/* Hide completed toggle */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={filters.hideCompleted}
          onClick={() => onChange({ ...filters, hideCompleted: !filters.hideCompleted })}
          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors duration-150 ${
            filters.hideCompleted
              ? 'border-accent-400 bg-accent-500 text-white'
              : 'border-line bg-canvas'
          } ${FOCUS}`}
        >
          {filters.hideCompleted && <Check className="h-3 w-3" />}
        </button>
        <span className="text-meta text-ink-muted">Hide completed tasks</span>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { label: 'Initiative', dot: 'bg-accent-300' },
    { label: 'To Do', dot: 'bg-ink-faint/50' },
    { label: 'In Progress', dot: 'bg-warn' },
    { label: 'Blocked', dot: 'bg-danger' },
    { label: 'Completed', dot: 'bg-ink-faint' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map(({ label, dot }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-micro text-ink-faint">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

function CalendarGrid({ year, month, todayStr, eventsForDay, onDayClick, onEventClick }) {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface shadow-card">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-line">
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-micro font-semibold uppercase tracking-wide text-ink-faint"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {/* Empty leading cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[100px] border-b border-r border-line bg-canvas/40 md:min-h-[120px]"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsForDay(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={day}
              onClick={() => dayEvents.length > MAX_VISIBLE && onDayClick(dateStr)}
              className={`min-h-[100px] border-b border-r border-line p-1.5 transition-colors duration-150 md:min-h-[120px] ${
                isToday ? 'bg-accent-soft/30' : 'hover:bg-muted/40'
              } ${dayEvents.length > MAX_VISIBLE ? 'cursor-pointer' : ''}`}
            >
              {/* Day number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-micro font-semibold ${
                    isToday ? 'bg-accent-500 text-white' : 'text-ink-muted'
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map((event) => {
                  const st = getEventStyle(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      title={event.title}
                      className={`w-full rounded border px-1.5 py-0.5 text-left transition duration-100 hover:opacity-80 ${st.bg} ${st.border}`}
                    >
                      {event.type === 'task' && event.initiativeName ? (
                        <div className="min-w-0">
                          <p className={`truncate text-[10px] font-semibold leading-tight ${st.text}`}>
                            {event.initiativeName}
                          </p>
                          <p className="truncate text-[9px] leading-tight text-ink-faint opacity-80">
                            {event.title}
                          </p>
                        </div>
                      ) : (
                        <p className={`truncate text-[10px] font-semibold leading-tight ${st.text}`}>
                          {event.title}
                        </p>
                      )}
                    </button>
                  );
                })}

                {dayEvents.length > MAX_VISIBLE && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr); }}
                    className={`text-[10px] font-semibold text-accent-300 hover:underline ${FOCUS}`}
                  >
                    +{dayEvents.length - MAX_VISIBLE} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useAuth();

  // Data via React Query
  const { data: initiatives = [], isLoading: initLoading, error: initError } = useInitiatives();
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: teamMembers = [] } = useTeamDropdown();
  const deleteTaskMutation = useDeleteTask();

  const loading = initLoading || tasksLoading;
  const error = initError?.message || tasksError?.message || '';

  // Navigation
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modals
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    initiativeId: '',
    status: 'all',
    initiativeStatus: 'all',
    time: 'all',
    scope: 'all',
    hideCompleted: false,
  });

  // ── Team lookup map ────────────────────────────────────────────────────────

  const teamMap = useMemo(() => {
    const m = {};
    teamMembers.forEach((t) => {
      const id = String(t.id || t.profile_id);
      m[id] = t;
    });
    return m;
  }, [teamMembers]);

  // ── Build calendar events from raw data ────────────────────────────────────

  const allEvents = useMemo(() => {
    const events = [];

    // Initiative deadlines
    initiatives.forEach((init) => {
      const dateStr = toDateStr(init.deadline);
      if (dateStr) {
        events.push({
          id: `init-${init.id}`,
          type: 'initiative',
          title: init.name,
          deadline: init.deadline,
          date: dateStr,
          description: init.description,
          initiativeId: String(init.id),
          raw: init,
        });
      }
    });

    // Tasks
    tasks.forEach((task) => {
      const dateStr = toDateStr(task.deadline);
      if (!dateStr) return;
      const initiative = initiatives.find((i) => String(i.id) === String(task.initiative_id));
      events.push({
        id: `task-${task.id}`,
        taskId: String(task.id),
        type: 'task',
        title: task.title,
        deadline: task.deadline,
        date: dateStr,
        status: task.status,
        priority: task.priority,
        description: task.description,
        initiativeId: task.initiative_id ? String(task.initiative_id) : null,
        initiativeName: initiative?.name || null,
        creatorId: String(task.creator_id || ''),
        raw: task,
      });
    });

    return events;
  }, [initiatives, tasks]);

  // ── Apply filters ──────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Scope
      if (filters.scope === 'mine' && event.type === 'task') {
        if (!isAssignedToMe(event.raw, user)) return false;
      }
      if (filters.scope === 'tasks-only' && event.type !== 'task') return false;
      if (filters.scope === 'initiatives-only' && event.type !== 'initiative') return false;

      // Initiative id filter
      if (filters.initiativeId) {
        if (event.initiativeId !== filters.initiativeId) return false;
      }

      // Task status filter — only applies to tasks
      if (filters.status !== 'all' && event.type === 'task') {
        if ((event.status || 'todo') !== filters.status) return false;
      }

      // Initiative status filter — only applies to initiative events
      if (filters.initiativeStatus !== 'all' && event.type === 'initiative') {
        const initStatus = (event.raw?.status || '').toLowerCase();
        if (initStatus !== filters.initiativeStatus) return false;
      }

      // Hide completed tasks
      if (filters.hideCompleted && event.type === 'task' && event.status === 'completed') return false;

      // Time
      if (filters.time !== 'all') {
        const eventDate = new Date(event.date + 'T00:00:00');
        const now = new Date(); now.setHours(0, 0, 0, 0);
        if (filters.time === 'today') {
          if (event.date !== todayStr) return false;
        } else if (filters.time === 'this-week') {
          const start = new Date(now); start.setDate(now.getDate() - now.getDay());
          const end = new Date(start); end.setDate(start.getDate() + 6);
          if (eventDate < start || eventDate > end) return false;
        } else if (filters.time === 'next-7-days') {
          const end = new Date(now); end.setDate(now.getDate() + 7);
          if (eventDate < now || eventDate > end) return false;
        } else if (filters.time === 'overdue') {
          if (event.date >= todayStr) return false;
          if (event.type === 'task' && event.status === 'completed') return false;
        }
      }

      return true;
    });
  }, [allEvents, filters, user, todayStr]);

  const hasActiveFilters =
    filters.initiativeId !== '' ||
    filters.status !== 'all' ||
    filters.initiativeStatus !== 'all' ||
    filters.time !== 'all' ||
    filters.scope !== 'all' ||
    filters.hideCompleted;

  const clearFilters = () =>
    setFilters({ initiativeId: '', status: 'all', initiativeStatus: 'all', time: 'all', scope: 'all', hideCompleted: false });

  // ── Events-per-day lookup ──────────────────────────────────────────────────

  const eventsForDay = useCallback(
    (dateStr) => filteredEvents.filter((e) => e.date === dateStr),
    [filteredEvents]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const prevMonth = () =>
    setCurrentDate(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const nextMonth = () =>
    setCurrentDate(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const goToday = () => {
    const now = new Date();
    setCurrentDate({ year: now.getFullYear(), month: now.getMonth() });
  };

  // ── Can delete check ───────────────────────────────────────────────────────

  const canDelete = (event) => {
    if (!event || event.type !== 'task') return false;
    if (!user) return false;
    const myIds = getPossibleUserIds(user);
    return myIds.includes(String(event.creatorId || '').toLowerCase().trim());
  };

  // ── Delete task ────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteTaskMutation.mutate(deleteTarget.taskId, {
      onSettled: () => setDeleting(false),
      onSuccess: () => {
        setDeleteTarget(null);
        setSelectedEvent(null);
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const { year, month } = currentDate;

  return (
    <div className="max-w-6xl space-y-5 px-4 py-4 sm:px-7 sm:py-7">
      {/* Page header */}
      <PageHeader
        title="Calendar"
        description="Deadlines and tasks across all initiatives."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`relative inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-meta font-semibold transition duration-150 ${
                showFilters
                  ? 'border-accent-line bg-accent-soft text-accent-300'
                  : 'border-line bg-surface text-ink-muted hover:bg-muted hover:text-ink'
              } ${FOCUS}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className={BTN_PRIMARY}
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          </div>
        }
      />

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          initiatives={initiatives}
          onClear={clearFilters}
          hasActive={hasActiveFilters}
        />
      )}

      {/* Month navigation + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className={`flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition duration-150 hover:bg-muted hover:text-ink ${FOCUS}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <h2 className="min-w-[160px] text-center font-display text-section font-semibold text-ink">
            {MONTHS[month]} {year}
          </h2>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className={`flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition duration-150 hover:bg-muted hover:text-ink ${FOCUS}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToday}
            className={`ml-1 rounded-control border border-line bg-surface px-3 py-1.5 text-meta font-semibold text-ink-muted transition duration-150 hover:bg-muted hover:text-ink ${FOCUS}`}
          >
            Today
          </button>
        </div>

        <Legend />
      </div>

      {/* Calendar body */}
      {loading ? (
        <LoadingPanel>Loading calendar…</LoadingPanel>
      ) : error ? (
        <ErrorPanel>{error}</ErrorPanel>
      ) : (
        <CalendarGrid
          year={year}
          month={month}
          todayStr={todayStr}
          eventsForDay={eventsForDay}
          onDayClick={(dateStr) => setDayModalDate(dateStr)}
          onEventClick={(event) => setSelectedEvent(event)}
        />
      )}

      {/* Stats bar */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-4 rounded-surface border border-line bg-surface px-5 py-3 shadow-card">
          <div className="text-meta">
            <span className="font-semibold tabular-nums text-ink">
              {filteredEvents.filter((e) => e.type === 'task').length}
            </span>
            <span className="ml-1 text-ink-faint">tasks</span>
          </div>
          <div className="text-meta">
            <span className="font-semibold tabular-nums text-ink">
              {filteredEvents.filter((e) => e.type === 'initiative').length}
            </span>
            <span className="ml-1 text-ink-faint">initiative deadlines</span>
          </div>
          <div className="text-meta">
            <span className="font-semibold tabular-nums text-danger">
              {filteredEvents.filter((e) => e.type === 'task' && e.date < todayStr && e.status !== 'completed').length}
            </span>
            <span className="ml-1 text-ink-faint">overdue</span>
          </div>
          <div className="text-meta">
            <span className="font-semibold tabular-nums text-ink">
              {filteredEvents.filter((e) => e.type === 'task' && e.status === 'completed').length}
            </span>
            <span className="ml-1 text-ink-faint">completed</span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {showAddTask && (
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onSuccess={() => setShowAddTask(false)}
          initiatives={initiatives}
          teamOptions={teamMembers}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          teamMap={teamMap}
          onClose={() => setSelectedEvent(null)}
          canDelete={canDelete(selectedEvent)}
          onDelete={(event) => { setSelectedEvent(null); setDeleteTarget(event); }}
        />
      )}

      {dayModalDate && (
        <DayEventsModal
          dateStr={dayModalDate}
          events={eventsForDay(dayModalDate)}
          onClose={() => setDayModalDate(null)}
          onSelectEvent={(event) => setSelectedEvent(event)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          event={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
