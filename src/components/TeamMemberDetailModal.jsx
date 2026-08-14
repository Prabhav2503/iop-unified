import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getTeamMemberById } from '../API/team';
import { getAllInitiatives } from '../API/initiative';
import { Modal, Chip, IconChip, ErrorPanel, CancelButton } from './ui';

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

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
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
          <CopyButton text={copyValue} label={`Copy ${label}`} />
        </div>
      )}
    </div>
  );
}

export default function TeamMemberDetailModal({ memberId, initialMember = null, onClose }) {
  const [member, setMember] = useState(initialMember);
  const [initiativesMap, setInitiativesMap] = useState({});
  const [loading, setLoading] = useState(!initialMember);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchMemberDetails() {
      if (!memberId) return;
      setLoading(true);
      setError('');

      try {
        // Fetch member by ID and initiatives map in parallel
        const [memberRes, initiativesRes] = await Promise.allSettled([
          getTeamMemberById(memberId),
          getAllInitiatives(),
        ]);

        if (!isMounted) return;

        // Process initiatives for ID -> Title mapping
        if (initiativesRes.status === 'fulfilled' && initiativesRes.value?.data) {
          const map = {};
          for (const init of initiativesRes.value.data) {
            if (init.id) {
              map[init.id] = init.name;
            }
          }
          setInitiativesMap(map);
        }

        // Process member response
        if (memberRes.status === 'fulfilled') {
          const res = memberRes.value;
          if (res.error) {
            setError(res.error);
          } else if (res.data) {
            setMember(res.data);
          } else {
            setError('Member details not found');
          }
        } else {
          setError('Failed to fetch team member details');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'An unexpected error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMemberDetails();

    return () => {
      isMounted = false;
    };
  }, [memberId]);

  const initiatives = toList(member?.initiative).map((item) => initiativesMap[item] || item);
  const tasks = toList(member?.tasks);
  const contributions = toList(member?.contribution);
  const hasActivity = initiatives.length > 0 || tasks.length > 0 || contributions.length > 0;

  return (
    <Modal
      title="Team Member Details"
      subtitle={member?.name ? `Information and activity for ${member.name}` : undefined}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={<CancelButton onClose={onClose} />}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-faint">
          <Loader2 className="h-6 w-6 animate-spin text-accent-300" />
          <p className="text-body font-medium">Loading member information...</p>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <ErrorPanel>{error}</ErrorPanel>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError('');
                getTeamMemberById(memberId).then((res) => {
                  setLoading(false);
                  if (res.error) setError(res.error);
                  else setMember(res.data);
                });
              }}
              className="rounded-control border border-line bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-muted"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : member ? (
        <div className="space-y-5">
          {/* Identity Header Card */}
          <div className="rounded-surface border border-line bg-surface p-4 sm:p-5 shadow-card">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-chip font-display text-title font-semibold ${
                  isLeadership(member.role)
                    ? 'bg-accent-soft text-accent-300'
                    : 'bg-muted text-ink-faint'
                }`}
                aria-hidden="true"
              >
                {(member.name || '?').trim().charAt(0).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-title font-semibold text-ink truncate">
                  {member.name || 'Unnamed Member'}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip tone={roleTone(member.role)}>{getRoleDisplay(member.role)}</Chip>
                  {member.vertical && <Chip tone="outline">{member.vertical}</Chip>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact and General Information */}
          <section className="rounded-surface border border-line bg-surface shadow-card overflow-hidden">
            <div className="border-b border-line-subtle px-4 py-3 sm:px-5">
              <h4 className="font-display text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Contact & Details
              </h4>
            </div>
            <div className="divide-y divide-line-subtle">
              <DetailRow
                icon={Mail}
                label="Email Address"
                value={member.email}
                href={member.email ? `mailto:${member.email}` : undefined}
                copyValue={member.email}
              />
              <DetailRow
                icon={Phone}
                label="Phone Number"
                value={member.number}
                href={member.number ? `tel:${member.number}` : undefined}
                copyValue={member.number}
              />
              <DetailRow
                icon={Layers}
                label="Vertical"
                value={member.vertical || 'All / General'}
              />
              <DetailRow
                icon={Briefcase}
                label="Role Designation"
                value={getRoleDisplay(member.role)}
              />
              <DetailRow
                icon={Calendar}
                label="Member Since"
                value={formatDate(member.created_at)}
              />
              {member.id && (
                <DetailRow
                  icon={IdCard}
                  label="System ID"
                  value={member.id}
                  copyValue={member.id}
                />
              )}
            </div>
          </section>

          {/* Activity Section: Initiatives, Tasks, Contributions */}
          <section className="rounded-surface border border-line bg-surface shadow-card overflow-hidden">
            <div className="border-b border-line-subtle px-4 py-3 sm:px-5">
              <h4 className="font-display text-meta font-semibold uppercase tracking-wider text-ink-muted">
                Activity & Assignments
              </h4>
            </div>

            {hasActivity ? (
              <div className="space-y-4 p-4 sm:p-5">
                {initiatives.length > 0 && (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                      Initiatives ({initiatives.length})
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {initiatives.map((item, i) => (
                        <Chip key={`init-${i}`} tone="accent" icon={Rocket}>
                          {item}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {tasks.length > 0 && (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                      Tasks ({tasks.length})
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tasks.map((item, i) => (
                        <Chip key={`task-${i}`} tone="neutral" icon={CheckSquare}>
                          {item}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {contributions.length > 0 && (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                      Contributions ({contributions.length})
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {contributions.map((item, i) => (
                        <Chip key={`contrib-${i}`} tone="neutral" icon={Sparkles}>
                          {item}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-ink-faint text-body">
                No initiatives, tasks, or contributions recorded yet for this member.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
