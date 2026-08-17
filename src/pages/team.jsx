import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllTeamMembers, deleteTeamMember } from '../API/team';
import AddMemberModal from '../components/AddMemberModal';
import TeamMemberDetailModal from '../components/TeamMemberDetailModal';
import {
  getActiveVerticals,
  getVerticalOptions,
  filterTeamMembers,
  isAllVertical,
  partitionTopMembers,
  sortMembersByHierarchy,
} from '../utility/teamFilters';
import {
  FOCUS,
  BTN_PRIMARY,
  Avatar,
  Chip,
  IconButton,
  PillFilter,
  PageHeader,
  SearchInput,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from '../components/ui';
import { useFilterReplay } from '../hooks/useFilterReplay';

// ─── Role helpers ──────────────────────────────────────────────────────────

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

function isLeadership(role) {
  const r = getRoleStr(role);
  return r.includes('coordinator') || r.includes('admin');
}

function roleTone(role) {
  return isLeadership(role) ? 'accent' : 'outline';
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Team() {
  const { user } = useAuth();
  const privileged = isPrivilegedRole(user);

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('all');

  // Replays the roster's load-in on every vertical pill click.
  const [listReplayKey, replayList] = useFilterReplay();

  const fetchTeam = useCallback(async () => {
    setError('');
    try {
      const result = await getAllTeamMembers();
      if (result.error) {
        setError(result.error);
        setTeamMembers([]);
      } else {
        setTeamMembers(result.data || []);
      }
    } catch {
      setError('Unexpected error loading team');
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  const handleMemberAdded = (newMember) => {
    setShowAddModal(false);
    if (newMember) {
      setTeamMembers((prev) => [newMember, ...prev]);
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Remove this team member? This cannot be undone.')) return;
    setDeletingId(memberId);
    const result = await deleteTeamMember(memberId);
    setDeletingId(null);
    if (result.error) {
      alert(`Delete failed: ${result.error}`);
    } else {
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  // Derive unique verticals from actual API data (sorted for stable ordering, excluding 'All')
  const activeVerticals = getActiveVerticals(teamMembers);
  const verticalOptions = getVerticalOptions(teamMembers);

  // Search + vertical filter, applied client-side to the loaded roster.
  const visibleMembers = filterTeamMembers(teamMembers, { search, verticalFilter, getRoleDisplay });

  const isTopMember = (m) => {
    const r = getRoleStr(m.role);
    return isAllVertical(m.vertical) || r.includes('overall_coordinator') || r.includes('co_overall_coordinator');
  };

  const { topMembers, verticalMembers } = partitionTopMembers(visibleMembers, isTopMember);

  const renderMemberRow = (member) => {
    const isDeleting = deletingId === member.id;
    return (
      <li key={member.id || member.email} className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setSelectedMember(member)}
          className={`group flex min-w-0 flex-1 items-center gap-3 rounded-control text-left transition-colors duration-150 hover:opacity-95 ${FOCUS}`}
        >
          <Avatar name={member.name} />

          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium text-ink group-hover:text-accent-300 transition-colors">
              {member.name || 'Unnamed member'}
            </span>
            <span className="mt-0.5 block truncate text-meta text-ink-faint">
              {member.email || 'No email on file'}
            </span>
          </span>

          <Chip tone={roleTone(member.role)}>{getRoleDisplay(member.role)}</Chip>

          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-ink transition-colors" aria-hidden="true" />
        </button>

        {privileged && (
          <IconButton
            danger
            disabled={isDeleting}
            label="Remove member"
            onClick={() => handleDelete(member.id)}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </IconButton>
        )}
      </li>
    );
  };

  const renderGroup = (heading, members, subtitle) => {
    if (members.length === 0) return null;
    return (
      <section key={heading} className="rounded-surface border border-line bg-surface shadow-card">
        <div className="flex items-baseline justify-between gap-3 border-b border-line-subtle px-4 py-3">
          <h2 className="font-display text-section font-semibold text-ink">
            {heading}
            <span className="ml-2 font-sans text-meta font-normal tabular-nums text-ink-faint">
              {members.length}
            </span>
          </h2>
          {subtitle && <span className="text-micro text-ink-faint">{subtitle}</span>}
        </div>
        <ul className="divide-y divide-line-subtle">{members.map(renderMemberRow)}</ul>
      </section>
    );
  };

  return (
    <>
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMemberAdded}
        />
      )}

      {selectedMember && (
        <TeamMemberDetailModal
          memberId={selectedMember.id}
          initialMember={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        {/* Header stays put through loading and error states */}
        <PageHeader
          title="Team"
          description="Everyone in the cell, grouped by vertical."
          action={
            privileged && (
              <button onClick={() => setShowAddModal(true)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                Add member
              </button>
            )
          }
        />

        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, role or vertical..."
          />

          {/* Pills keep every vertical visible without a click. See the note in
              the summary: this stays readable up to roughly 6–7 verticals. */}
          {activeVerticals.length > 0 && (
            <PillFilter
              value={verticalFilter}
              onChange={(v) => {
                setVerticalFilter(v);
                replayList();
              }}
              options={verticalOptions}
              ariaLabel="Filter by vertical"
            />
          )}
        </div>

        {/* Keyed on the replay counter so every pill click replays the load-in,
            including one that lands on the same set. Search is not wired in. */}
        <div key={listReplayKey}>
          {loading ? (
            <LoadingPanel>Loading team...</LoadingPanel>
          ) : error ? (
            <ErrorPanel>{error}</ErrorPanel>
          ) : visibleMembers.length === 0 ? (
            <EmptyPanel>No team members match your search or filters.</EmptyPanel>
          ) : (
            /* Groups stagger in, not individual rows — a divided list flickering
               row by row reads as a loading glitch rather than as polish. */
            <div className="stagger-in space-y-4">
              {/* Leadership / Vertical 'All' members on top sorted strictly by Admin -> Coordinators -> Executives */}
              {renderGroup('Overall coordinators', sortMembersByHierarchy(topMembers), 'Leads the cell')}

              {activeVerticals.map((vertical) => {
                const inVertical = verticalMembers.filter(
                  (m) => (m.vertical || '').toLowerCase() === vertical.toLowerCase()
                );

                const sortedInVertical = sortMembersByHierarchy(inVertical);
                return renderGroup(vertical, sortedInVertical);
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
