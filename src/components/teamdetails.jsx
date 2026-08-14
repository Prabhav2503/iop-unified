import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, Layers, Rocket, CheckSquare, Sparkles } from 'lucide-react';
import { getTeamMemberById } from '../API/team';
import { getAllInitiatives } from '../API/initiative';
import { FOCUS, Chip, IconChip, ErrorPanel, LoadingPanel } from './ui';

function getRoleDisplay(role) {
  const roleStr = Array.isArray(role) ? role[0] || '' : role || '';
  const normalized = roleStr.toLowerCase();

  if (normalized.includes('overall_coordinator') && !normalized.includes('co_')) {
    return 'Overall Coordinator';
  }
  if (normalized.includes('co_overall_coordinator') || normalized.includes('co overall')) {
    return 'Co-Overall Coordinator';
  }
  if (normalized.includes('coordinator')) return 'Coordinator';
  if (normalized.includes('executive')) return 'Executive';
  if (normalized.includes('admin')) return 'Admin';

  return roleStr || 'Team Member';
}

function isLeadership(role) {
  const r = (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
  return r.includes('coordinator') || r.includes('admin');
}

// Same rule as the roster: elevated roles fill accent, everyone else is
// outlined neutral. Applied to every role, no exceptions.
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

// text[] fields render as chips rather than a JSON dump.
function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [String(value)];
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <IconChip icon={icon} size="sm" />
      <div className="min-w-0">
        <p className="text-micro text-ink-faint">{label}</p>
        <p className="truncate text-body text-ink">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function TeamMemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [initiativesMap, setInitiativesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchMember = async () => {
      setLoading(true);
      setError('');
      try {
        const [memberRes, initRes] = await Promise.allSettled([
          getTeamMemberById(id),
          getAllInitiatives(),
        ]);

        if (!isMounted) return;

        if (initRes.status === 'fulfilled' && initRes.value?.data) {
          const map = {};
          for (const init of initRes.value.data) {
            if (init.id) map[init.id] = init.name;
          }
          setInitiativesMap(map);
        }

        if (memberRes.status === 'fulfilled') {
          const res = memberRes.value;
          if (res.error) {
            setError(res.error);
            setMember(null);
          } else if (res.data) {
            setMember(res.data);
          } else {
            setError('Member not found');
            setMember(null);
          }
        } else {
          setError('Failed to load member details');
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Failed to load member details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) fetchMember();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const backLink = (
    <button
      onClick={() => navigate('/team')}
      className={`inline-flex items-center gap-1.5 rounded-control text-meta font-medium text-ink-muted transition-colors duration-150 hover:text-ink ${FOCUS}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to team
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-3xl space-y-5 px-7 py-7">
        {backLink}
        <LoadingPanel>Loading member details...</LoadingPanel>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-3xl space-y-5 px-7 py-7">
        {backLink}
        <ErrorPanel>{error || 'Member not found'}</ErrorPanel>
      </div>
    );
  }

  const initiatives = toList(member.initiative).map((item) => initiativesMap[item] || item);
  const tasks = toList(member.tasks);
  const contributions = toList(member.contribution);
  const hasActivity = initiatives.length || tasks.length || contributions.length;

  return (
    <div className="max-w-3xl space-y-5 px-7 py-7">
      {backLink}

      {/* Identity */}
      <div className="rounded-surface border border-line bg-surface p-6 shadow-card">
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
            <h1 className="font-display text-title font-semibold text-ink">
              {member.name || 'Unnamed'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip tone={roleTone(member.role)}>{getRoleDisplay(member.role)}</Chip>
              {member.vertical && <Chip>{member.vertical}</Chip>}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <section className="rounded-surface border border-line bg-surface shadow-card">
        <div className="border-b border-line-subtle px-5 py-3.5">
          <h2 className="font-display text-section font-semibold text-ink">Contact and details</h2>
        </div>
        <div className="divide-y divide-line-subtle">
          <DetailRow icon={Mail} label="Email" value={member.email} />
          <DetailRow icon={Phone} label="Phone" value={member.number} />
          <DetailRow icon={Layers} label="Vertical" value={member.vertical} />
          <DetailRow icon={Briefcase} label="Role" value={getRoleDisplay(member.role)} />
          <DetailRow icon={Calendar} label="Joined" value={formatDate(member.created_at)} />
        </div>
      </section>

      {/* Activity — chips, not a JSON dump */}
      {hasActivity ? (
        <section className="rounded-surface border border-line bg-surface shadow-card">
          <div className="border-b border-line-subtle px-5 py-3.5">
            <h2 className="font-display text-section font-semibold text-ink">Activity</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            {[
              { label: 'Initiatives', items: initiatives, tone: 'accent', icon: Rocket },
              { label: 'Tasks', items: tasks, tone: 'neutral', icon: null },
              { label: 'Contributions', items: contributions, tone: 'neutral', icon: null },
            ]
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.label}>
                  <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                    {g.label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.items.map((item, i) => (
                      <Chip key={`${g.label}-${i}`} tone={g.tone} icon={g.icon || undefined}>
                        {item}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
