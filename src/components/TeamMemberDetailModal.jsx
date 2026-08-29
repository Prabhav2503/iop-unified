import { useState } from 'react';
import {
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Layers,
  Rocket,
  CheckSquare,
  Sparkles,
  IdCard,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTeamMemberById, useTeamMemberActivity } from '../hooks/useQueries';
import { Modal, Chip, IconChip, ErrorPanel, CancelButton } from './ui';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getRoleStr(role) {
  return (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
}

function getRoleDisplay(role) {
  const s = getRoleStr(role);
  if (s.includes('co_overall_coordinator') || s.includes('co overall')) return 'Co-Overall Coordinator';
  if (s.includes('overall_coordinator')) return 'Overall Coordinator';
  if (s.includes('coordinator')) return 'Coordinator';
  if (s.includes('executive')) return 'Executive';
  if (s.includes('admin')) return 'Admin';
  return (Array.isArray(role) ? role[0] : role) || 'Team Member';
}

function isLeadership(role) {
  const r = getRoleStr(role);
  return r.includes('coordinator') || r.includes('admin');
}

function roleTone(role) {
  return isLeadership(role) ? 'accent' : 'outline';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [String(value)];
}

// Maps initiative/task status → chip tone
const STATUS_TONE = {
  active: 'accent',
  ongoing: 'accent',
  completed: 'success',
  done: 'success',
  pending: 'neutral',
  paused: 'neutral',
  cancelled: 'neutral',
};

const PRIORITY_TONE = {
  high: 'danger',
  medium: 'neutral',
  low: 'outline',
};

function statusTone(s) {
  return STATUS_TONE[(s || '').toLowerCase()] ?? 'outline';
}

function priorityTone(p) {
  return PRIORITY_TONE[(p || '').toLowerCase()] ?? 'outline';
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback — silently ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`${label}: ${text}`}
      className="inline-flex items-center gap-1 rounded-control p-1 text-ink-faint transition-colors hover:bg-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent-300" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function DetailRow({ icon, label, value, href, copyValue }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <IconChip icon={icon} size="sm" />
        <div className="min-w-0">
          <p className="text-micro text-ink-faint">{label}</p>
          {href && value && value !== '—' ? (
            <a
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-1 truncate text-body font-medium text-accent-300 transition-colors hover:text-accent-400 hover:underline"
            >
              <span className="truncate">{value}</span>
              {href.startsWith('http') && <ExternalLink className="h-3 w-3 shrink-0" />}
            </a>
          ) : (
            <p className="truncate text-body text-ink">{value || '—'}</p>
          )}
        </div>
      </div>
      {copyValue && (
        <div className="shrink-0">
          <CopyBtn text={copyValue} label={`Copy ${label}`} />
        </div>
      )}
    </div>
  );
}

// ─── Activity skeleton ─────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-3 p-4 sm:p-5 animate-pulse">
      {[1, 2].map((n) => (
        <div key={n} className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-40 rounded-surface bg-muted" />
            <div className="h-8 w-32 rounded-surface bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Activity section ─────────────────────────────────────────────────────────

function ActivitySection({ memberId }) {
  const {
    data: activity,
    isLoading,
    isError,
    error,
    refetch,
  } = useTeamMemberActivity(memberId);

  if (isLoading) return <ActivitySkeleton />;

  if (isError) {
    return (
      <div className="space-y-3 px-4 py-4 sm:px-5 text-center">
        <p className="text-body text-red-400">
          {error?.message || 'Failed to load activity'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const initiatives = activity?.initiatives ?? [];
  const tasks = activity?.tasks ?? [];
  const hasActivity = initiatives.length > 0 || tasks.length > 0;

  if (!hasActivity) {
    return (
      <div className="px-5 py-6 text-center text-ink-faint text-body">
        No initiatives or tasks assigned to this member yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {initiatives.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Initiatives ({initiatives.length})
          </p>
          <div className="flex flex-col gap-2">
            {initiatives.map((init) => (
              <div
                key={init.id}
                className="flex items-center justify-between gap-2 rounded-surface border border-line-subtle bg-muted/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Rocket className="h-3.5 w-3.5 shrink-0 text-accent-300" aria-hidden="true" />
                  <span className="truncate text-body font-medium text-ink">
                    {init.name || 'Unnamed Initiative'}
                  </span>
                </div>
                {init.status && (
                  <Chip tone={statusTone(init.status)}>
                    {init.status}
                  </Chip>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Tasks ({tasks.length})
          </p>
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-surface border border-line-subtle bg-muted/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckSquare className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                  <span className="truncate text-body font-medium text-ink">
                    {task.title || 'Untitled Task'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {task.priority && (
                    <Chip tone={priorityTone(task.priority)}>
                      {task.priority}
                    </Chip>
                  )}
                  {task.status && (
                    <Chip tone={statusTone(task.status)}>
                      {task.status}
                    </Chip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function TeamMemberDetailModal({ memberId, initialMember = null, onClose }) {
  const {
    data: member,
    isLoading,
    isError,
    error,
  } = useTeamMemberById(memberId);

  // Fall back to the passed-in snapshot while the full record loads
  const displayMember = member ?? initialMember;

  const contributions = toList(displayMember?.contribution);

  return (
    <Modal
      title="Team Member Details"
      subtitle={displayMember?.name ? `Information and activity for ${displayMember.name}` : undefined}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={<CancelButton onClose={onClose} />}
    >
      {isLoading && !displayMember ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-faint">
          <Loader2 className="h-6 w-6 animate-spin text-accent-300" />
          <p className="text-body font-medium">Loading member information...</p>
        </div>
      ) : isError && !displayMember ? (
        <div className="space-y-4">
          <ErrorPanel>{error?.message || 'Failed to load member'}</ErrorPanel>
        </div>
      ) : displayMember ? (
        <div className="space-y-5">
          {/* Identity Header Card */}
          <div className="rounded-surface border border-line bg-surface p-4 sm:p-5 shadow-card">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-chip font-display text-title font-semibold ${
                  isLeadership(displayMember.role)
                    ? 'bg-accent-soft text-accent-300'
                    : 'bg-muted text-ink-faint'
                }`}
                aria-hidden="true"
              >
                {(displayMember.name || '?').trim().charAt(0).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-title font-semibold text-ink truncate">
                  {displayMember.name || 'Unnamed Member'}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip tone={roleTone(displayMember.role)}>{getRoleDisplay(displayMember.role)}</Chip>
                  {displayMember.vertical && <Chip tone="outline">{displayMember.vertical}</Chip>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Details */}
          <section className="rounded-surface border border-line bg-surface shadow-card overflow-hidden">
            <div className="border-b border-line-subtle px-4 py-3 sm:px-5">
              <h4 className="font-display text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Contact &amp; Details
              </h4>
            </div>
            <div className="divide-y divide-line-subtle">
              <DetailRow
                icon={Mail}
                label="Email Address"
                value={displayMember.email}
                href={displayMember.email ? `mailto:${displayMember.email}` : undefined}
                copyValue={displayMember.email}
              />
              <DetailRow
                icon={Phone}
                label="Phone Number"
                value={displayMember.number}
                href={displayMember.number ? `tel:${displayMember.number}` : undefined}
                copyValue={displayMember.number}
              />
              <DetailRow
                icon={Layers}
                label="Vertical"
                value={displayMember.vertical || 'All / General'}
              />
              <DetailRow
                icon={Briefcase}
                label="Role Designation"
                value={getRoleDisplay(displayMember.role)}
              />
              <DetailRow
                icon={Calendar}
                label="Member Since"
                value={formatDate(displayMember.created_at)}
              />
              {displayMember.id && (
                <DetailRow
                  icon={IdCard}
                  label="System ID"
                  value={displayMember.id}
                  copyValue={displayMember.id}
                />
              )}
            </div>
          </section>

          {/* Contributions (still a column on Team) */}
          {contributions.length > 0 && (
            <section className="rounded-surface border border-line bg-surface shadow-card overflow-hidden">
              <div className="border-b border-line-subtle px-4 py-3 sm:px-5">
                <h4 className="font-display text-meta font-semibold uppercase tracking-wider text-ink-muted">
                  Contributions
                </h4>
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap gap-1.5">
                  {contributions.map((item, i) => (
                    <Chip key={`contrib-${i}`} tone="neutral" icon={Sparkles}>
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Activity — Initiatives & Tasks from junction tables */}
          <section className="rounded-surface border border-line bg-surface shadow-card overflow-hidden">
            <div className="border-b border-line-subtle px-4 py-3 sm:px-5">
              <h4 className="font-display text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Activity &amp; Assignments
              </h4>
            </div>
            <ActivitySection memberId={memberId} />
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
