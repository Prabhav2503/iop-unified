import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, CheckSquare, Plus, Loader2, Calendar, Clock, Key, Trash2, Pencil, Edit2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../API/auth';
import { useInitiatives, useTasks, useTeamDropdown, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useQueries';
import { getTaskAssigneeIds } from '../API/task';
import EditProfileModal from '../components/EditProfileModal';
import {
  INPUT_CLS,
  BTN_PRIMARY,
  BTN_QUIET,
  StatCard,
  MetaDot,
  Field,
  Modal,
  Select,
  CancelButton,
  FormError,
  PageHeader,
  LoadingPanel,
  ErrorPanel,
  IconButton,
  FOCUS,
} from '../components/ui';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPossibleUserIds(user) {
  if (!user) return [];
  return [
    user.profile_id,
    user.id,
    user.user_id,
    user.team_id,
    user.member_id,
    user.uuid,
    user.email,
    user.username,
  ]
    .filter(Boolean)
    .map((id) => String(id).toLowerCase().trim());
}

function isMyCreator(creatorId, user) {
  if (!creatorId || !user) return false;
  const cStr = String(creatorId).toLowerCase().trim();
  return getPossibleUserIds(user).includes(cStr);
}

function isUserAssigned(task, user) {
  if (!task || !user) return false;
  const userIds = getPossibleUserIds(user);
  const assigneesList = getTaskAssigneeIds(task).map((id) => String(id).toLowerCase().trim());
  return assigneesList.some((aId) => userIds.includes(aId));
}

function isWithin7Days(deadlineStr) {
  if (!deadlineStr) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

// Days remaining, used only to decide whether a deadline deserves attention.
function daysUntil(value) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(value) - now) / (1000 * 60 * 60 * 24));
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

function Panel({ title, count, action, children }) {
  return (
    <section className="rounded-surface border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
        <h2 className="font-display text-section font-semibold text-ink">
          {title}
          {count !== undefined && (
            <span className="ml-2 font-sans text-meta font-normal tabular-nums text-ink-faint">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function EmptyNote({ children }) {
  return <p className="py-3 text-body text-ink-faint">{children}</p>;
}

// ─── Add Task Modal ─────────────────────────────────────────────────────────

function AddDashboardTaskModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [deadline, setDeadline] = useState('');
  const [comment, setComment] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [error, setError] = useState('');

  const { data: teamOptions = [], isLoading: teamsLoading } = useTeamDropdown();
  const createTaskMutation = useCreateTask();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');

    const taskPayload = {
      title: title.trim(),
      initiative_id: null,
      stage_id: null,
      creator_id: user?.profile_id || user?.id || user?.user_id || user?.userid || null,
      priority,
      status,
      deadline: deadline || null,
      comment: comment.trim() || null,
      assignees: getTaskAssigneeIds(selectedAssignees),
    };

    createTaskMutation.mutate(taskPayload, {
      onSuccess: (res) => onSuccess({ id: res?.task_id, ...taskPayload }),
      onError: (err) => setError(err.message || 'Failed to create task'),
    });
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
      title="Add standalone task"
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

      <Field label="Deadline">
        <input
          type="date"
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
          placeholder="Notes or details..."
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

// ─── Edit Task Modal ────────────────────────────────────────────────────────

function EditDashboardTaskModal({ task, onClose, onSuccess }) {
  const [title, setTitle] = useState(task?.title || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [deadline, setDeadline] = useState(
    task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );
  const [comment, setComment] = useState(task?.comment || '');
  const [selectedAssignees, setSelectedAssignees] = useState(getTaskAssigneeIds(task));
  const [error, setError] = useState('');

  const { data: teamOptions = [], isLoading: teamsLoading } = useTeamDropdown();
  const updateTaskMutation = useUpdateTask();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');

    const updates = {
      title: title.trim(),
      priority,
      status,
      deadline: deadline || null,
      comment: comment.trim() || null,
      assignees: getTaskAssigneeIds(selectedAssignees),
    };

    updateTaskMutation.mutate(
      { id: task.id, updates },
      {
        onSuccess: () => onSuccess({ ...task, ...updates }),
        onError: (err) => setError(err.message || 'Failed to update task'),
      }
    );
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
          <button type="submit" disabled={updateTaskMutation.isPending} className={BTN_PRIMARY}>
            {updateTaskMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
          placeholder="e.g. Review sponsorship deck"
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

      <Field label="Deadline">
        <input
          type="date"
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
          placeholder="Notes or details..."
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

// ─── Change Password Modal ───────────────────────────────────────────────

function ChangePasswordModal({ onClose }) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all required fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    const profileId = user?.profile_id || user?.id || user?.user_id;
    if (!profileId) {
      setError('User profile ID is missing.');
      return;
    }

    setSubmitting(true);
    const res = await changePassword(currentPassword, newPassword, profileId);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <Modal
      title="Change Password"
      subtitle="Update your account password"
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update Password
          </button>
        </>
      }
    >
      {success && (
        <div className="rounded-control border border-accent-line bg-accent-soft px-3 py-2 text-meta text-accent-300">
          {success}
        </div>
      )}

      <Field label="Current Password *">
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="New Password *">
        <input
          required
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Confirm New Password *">
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className={INPUT_CLS}
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();

  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: initiatives = [], isLoading: initLoading, error: initError } = useInitiatives();
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useTasks();
  const deleteTaskMutation = useDeleteTask();

  const loading = initLoading || tasksLoading;
  const error = initError?.message || tasksError?.message || '';

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    deleteTaskMutation.mutate(taskId, {
      onError: (err) => alert(err.message || 'Failed to delete task'),
    });
  };

  // 1. Total Initiative Count
  const initiativesCount = initiatives.length;

  // 2. Active Tasks Count: assigned to logged in user AND status is active/in_progress/todo
  const activeTasksCount = tasks.filter((t) => {
    const isAssigned = isUserAssigned(t, user);
    const st = (t.status || 'active').toLowerCase();
    const isActiveStatus = st === 'active' || st === 'in_progress' || st === 'todo';
    return isAssigned && isActiveStatus;
  }).length;

  // 3. Assigned Tasks: assigned to logged in user from task_assignees / assignees
  const assignedTasks = tasks.filter((t) => isUserAssigned(t, user));

  // 4. My Initiatives: creator_id matches logged in user ID
  const myInitiatives = initiatives.filter((i) => isMyCreator(i.created_by, user));

  // 5. Upcoming Tasks: standalone tasks where initiative_id is null AND creator_id matches logged in user
  const upcomingStandaloneTasks = tasks.filter(
    (t) => (t.initiative_id === null || t.initiative_id === undefined) && isMyCreator(t.creator_id, user)
  );

  // 6. Upcoming Initiatives: initiatives whose deadline is within the next 7 days
  const upcomingInitiatives = initiatives.filter((i) => isWithin7Days(i.deadline));

  return (
    <>
      {showAddTask && (
        <AddDashboardTaskModal
          onClose={() => setShowAddTask(false)}
          onSuccess={() => setShowAddTask(false)}
        />
      )}

      {editingTask && (
        <EditDashboardTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={() => setEditingTask(null)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          onSuccess={() => setShowEditProfile(false)}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        <PageHeader
          title="Dashboard"
          description="Your active tasks, upcoming deadlines, and initiatives."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowEditProfile(true)}
                className={BTN_QUIET}
              >
                <Pencil className="h-3.5 w-3.5 text-ink-faint" />
                Edit profile
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                className={BTN_QUIET}
              >
                <Key className="h-3.5 w-3.5 text-ink-faint" />
                Change password
              </button>
            </div>
          }
        />

        {loading ? (
          <LoadingPanel>Loading dashboard overview...</LoadingPanel>
        ) : error ? (
          <ErrorPanel>{error}</ErrorPanel>
        ) : (
          /* Stats, then the two panels, then the list — each block a beat
             behind the one above it, so the page resolves top-down once the
             data lands rather than appearing all at once. */
          <div className="stagger-in space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                icon={Rocket}
                tone="neutral"
                value={initiativesCount}
                label="Total initiatives"
                indicator={
                  <span className="text-micro tabular-nums text-ink-faint">
                    {myInitiatives.length} yours
                  </span>
                }
              />
              <StatCard
                icon={CheckSquare}
                tone="accent"
                value={activeTasksCount}
                label="Active tasks assigned to you"
              />
            </div>

            

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Panel title="Due in the next 7 days" count={upcomingInitiatives.length}>
                {upcomingInitiatives.length === 0 ? (
                  <EmptyNote>No initiative deadlines in the next 7 days.</EmptyNote>
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {upcomingInitiatives.map((init) => {
                      const left = daysUntil(init.deadline);
                      return (
                        <li key={init.id} className="first:pt-0 last:pb-0">
                          <Link
                            to={`/initiatives?id=${encodeURIComponent(init.id)}`}
                            className={`-mx-1 flex items-baseline justify-between gap-4 rounded-control px-1 py-2.5 transition-colors duration-150 hover:bg-muted ${FOCUS}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-body font-medium text-ink">{init.name}</p>
                              {init.impact && (
                                <p className="mt-0.5 truncate text-meta text-ink-faint">
                                  {init.impact}
                                </p>
                              )}
                            </div>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 text-meta tabular-nums ${
                                left <= 2 ? 'font-medium text-warn-ink' : 'text-ink-faint'
                              }`}
                            >
                              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {left === 0 ? 'Today' : left === 1 ? 'Tomorrow' : `${left} days`}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel
                title="Your standalone tasks"
                count={upcomingStandaloneTasks.length}
                action={
                  <button onClick={() => setShowAddTask(true)} className={BTN_QUIET}>
                    <Plus className="h-3.5 w-3.5 text-ink-faint" />
                    Add task
                  </button>
                }
              >
                {upcomingStandaloneTasks.length === 0 ? (
                  <EmptyNote>
                    No standalone tasks created by you yet. Use "Add task" to create one.
                  </EmptyNote>
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {upcomingStandaloneTasks.map((tsk) => {
                      const isCompleted = (tsk.status || '').toLowerCase() === 'completed';
                      return (
                        <li key={tsk.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1">
                            <p className={`text-body font-medium ${isCompleted ? 'text-emerald-400' : 'text-ink'}`}>{tsk.title}</p>

                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  aria-hidden="true"
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isCompleted ? 'bg-emerald-400' : (PRIORITY_DOT[tsk.priority] || PRIORITY_DOT.medium)
                                  }`}
                                />
                                <span className="capitalize">{tsk.priority || 'medium'}</span>
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
                                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                                    <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                                    Due {formatDate(tsk.deadline)}
                                  </span>
                                </>
                              )}
                            </p>

                            {tsk.comment && (
                              <p className="mt-1.5 border-l-2 border-line pl-2.5 text-meta text-ink-faint">
                                {tsk.comment}
                              </p>
                            )}
                          </div>

                          {isMyCreator(tsk.creator_id, user) && (
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
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Initiatives you created" count={myInitiatives.length}>
              {myInitiatives.length === 0 ? (
                <EmptyNote>You haven't created any initiatives yet.</EmptyNote>
              ) : (
                <ul className="divide-y divide-line-subtle">
                  {myInitiatives.map((init) => (
                    <li key={init.id} className="first:pt-0 last:pb-0">
                      <Link
                        to={`/initiatives?id=${encodeURIComponent(init.id)}`}
                        className={`-mx-1 block rounded-control px-1 py-3 transition-colors duration-150 hover:bg-muted ${FOCUS}`}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <p className="truncate text-body font-medium text-ink">{init.name}</p>
                            <StatusChip status={init.status} />
                          </div>
                          {init.deadline && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 text-meta tabular-nums text-ink-faint">
                              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {formatDate(init.deadline)}
                            </span>
                          )}
                        </div>

                        {init.description && (
                          <p className="mt-1 line-clamp-2 max-w-3xl text-meta text-ink-faint">
                            {init.description}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            {/* Assigned tasks section */}
            <Panel title="Assigned tasks" count={assignedTasks.length}>
              {assignedTasks.length === 0 ? (
                <EmptyNote>No tasks assigned to you yet.</EmptyNote>
              ) : (
                <ul className="divide-y divide-line-subtle">
                  {assignedTasks.map((tsk) => {
                    const isCompleted = (tsk.status || '').toLowerCase() === 'completed';
                    return (
                      <li key={tsk.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-body font-medium ${isCompleted ? 'text-emerald-400' : 'text-ink'}`}>{tsk.title}</p>
                            <span className={`rounded-control px-2 py-0.5 text-micro font-medium capitalize ${
                              isCompleted
                                ? 'inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold'
                                : 'bg-accent-soft text-accent-300'
                            }`}>
                              {isCompleted && <Check className="h-3 w-3 text-emerald-400" />}
                              {(tsk.status || 'todo').replace('_', ' ')}
                            </span>
                          </div>

                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isCompleted ? 'bg-emerald-400' : (PRIORITY_DOT[tsk.priority] || PRIORITY_DOT.medium)
                                }`}
                              />
                              <span className="capitalize">{tsk.priority || 'medium'}</span>
                            </span>
                            {tsk.deadline && (
                              <>
                                <MetaDot />
                                <span className="inline-flex items-center gap-1.5 tabular-nums">
                                  <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  Due {formatDate(tsk.deadline)}
                                </span>
                              </>
                            )}
                          </p>

                        {tsk.comment && (
                          <p className="mt-1.5 border-l-2 border-line pl-2.5 text-meta text-ink-faint">
                            {tsk.comment}
                          </p>
                        )}
                      </div>

                      {isMyCreator(tsk.creator_id, user) && (
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
                  ); })}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
