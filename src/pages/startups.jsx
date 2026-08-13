import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Globe,
  Link2,
  Mail,
  Phone,
  User,
  Target,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAllStartups,
  getStartupById,
  createStartup,
  deleteStartup,
} from '../API/startup';
import { getAllContacts } from '../API/contact';
import { getAllInitiatives } from '../API/initiative';
import {
  FOCUS,
  INPUT_CLS,
  BTN_PRIMARY,
  Chip,
  IconChip,
  MetaDot,
  IconButton,
  GroupLabel,
  Field,
  Modal,
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

// ─── Helpers & Role Check ───────────────────────────────────────────────────

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

const SECTORS = [
  'EdTech',
  'FinTech',
  'HealthTech',
  'AI / ML',
  'Agritech',
  'SaaS',
  'DeepTech',
  'E-Commerce',
  'Cleantech',
  'Other',
];

const STAGES = ['Ideation', 'Validation', 'Early Traction', 'Scaling', 'Growth'];

const ENGAGEMENTS = ['Incubated', 'Accelerated', 'Mentored', 'Ecosystem Partner'];

// Stage is a maturity ladder, so it earns a tone: later stages read as accent,
// early stages stay neutral. (The old STAGE_BADGES map was declared and never
// used — every stage rendered as the same flat grey chip.)
const STAGE_TONE = {
  ideation: 'neutral',
  validation: 'neutral',
  'early traction': 'accent',
  early_traction: 'accent',
  scaling: 'accent',
  growth: 'accent',
};

function stageTone(stage) {
  return STAGE_TONE[(stage || '').toLowerCase()] || 'neutral';
}

const toOptions = (arr) => arr.map((v) => ({ value: v, label: v }));

// ─── Add Startup Modal ──────────────────────────────────────────────────────

function AddStartupModal({ contacts, initiatives, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [edcImpact, setEdcImpact] = useState('');
  const [sector, setSector] = useState('AI / ML');
  const [stage, setStage] = useState('Validation');
  const [engagement, setEngagement] = useState('Incubated');
  const [year, setYear] = useState(new Date().getFullYear());
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [founderId, setFounderId] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [supportType, setSupportType] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !edcImpact.trim()) return;

    setError('');
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      edc_impact: edcImpact.trim(),
      sector,
      stage,
      engagement,
      year: Number(year),
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      linkedin: linkedin.trim() || null,
      founder_id: founderId || null,
      initiative_id: initiativeId || null,
      support_type: supportType.trim() || null,
    };

    const res = await createStartup(payload);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess(res.data);
    }
  };

  const founderOptions = [
    { value: '', label: 'No founder linked' },
    ...contacts.map((c) => ({
      value: c.id,
      label: `${c.name}${c.email || c.number ? ` — ${c.email || c.number}` : ''}`,
    })),
  ];

  const initiativeOptions = [
    { value: '', label: 'No initiative linked' },
    ...initiatives.map((i) => ({ value: i.id, label: i.name })),
  ];

  return (
    <Modal
      title="Add startup"
      maxWidth="max-w-2xl"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Creating...' : 'Add startup'}
          </button>
        </>
      }
    >
      <GroupLabel>Profile</GroupLabel>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="Startup name *">
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nexus Dynamics"
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <Field label="Founded *">
          <input
            required
            type="number"
            min="2000"
            max="2099"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <Field label="Description *">
        <textarea
          required
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief overview of what the startup does..."
          className={INPUT_CLS}
        />
      </Field>

      <Field label="eDC impact *" hint="What the cell actually contributed">
        <input
          required
          type="text"
          value={edcImpact}
          onChange={(e) => setEdcImpact(e.target.value)}
          placeholder="e.g. Winner of Campus Pitch 2025, 20+ jobs created"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Sector *">
          <Select
            value={sector}
            onChange={setSector}
            options={toOptions(SECTORS)}
            ariaLabel="Sector"
            variant="field"
          />
        </Field>
        <Field label="Stage *">
          <Select
            value={stage}
            onChange={setStage}
            options={toOptions(STAGES)}
            ariaLabel="Stage"
            variant="field"
          />
        </Field>
        <Field label="Engagement *">
          <Select
            value={engagement}
            onChange={setEngagement}
            options={toOptions(ENGAGEMENTS)}
            ariaLabel="Engagement"
            variant="field"
          />
        </Field>
      </div>

      <GroupLabel>Contact</GroupLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@startup.com"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Phone">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://startup.com"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="LinkedIn">
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/company/..."
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <GroupLabel>Links</GroupLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Founder">
          <Select
            value={founderId}
            onChange={setFounderId}
            options={founderOptions}
            ariaLabel="Founder"
            variant="field"
          />
        </Field>
        <Field label="Initiative">
          <Select
            value={initiativeId}
            onChange={setInitiativeId}
            options={initiativeOptions}
            ariaLabel="Linked initiative"
            variant="field"
          />
        </Field>
      </div>

      <Field label="Support type">
        <input
          type="text"
          value={supportType}
          onChange={(e) => setSupportType(e.target.value)}
          placeholder="e.g. Grant funding, mentorship, pro-bono legal"
          className={INPUT_CLS}
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Startup Detail Modal ───────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-meta text-ink-faint">{label}</span>
      <span className="min-w-0 truncate text-body text-ink">{value}</span>
    </div>
  );
}

function StartupDetailModal({ startupId, contacts, initiatives, onClose }) {
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStartupById(startupId).then((res) => {
      setStartup(res.data || null);
      setLoading(false);
    });
  }, [startupId]);

  const founder = contacts.find((c) => c.id === startup?.founder_id);
  const initiative = initiatives.find((i) => i.id === startup?.initiative_id);

  const links = startup
    ? [
        startup.website && { icon: Globe, label: 'Website', href: startup.website },
        startup.linkedin && { icon: Link2, label: 'LinkedIn', href: startup.linkedin },
        startup.email && { icon: Mail, label: startup.email, href: `mailto:${startup.email}` },
        startup.phone && { icon: Phone, label: startup.phone, href: `tel:${startup.phone}` },
      ].filter(Boolean)
    : [];

  return (
    <Modal
      title={loading ? 'Loading...' : startup?.name || 'Startup'}
      subtitle={
        startup ? `${startup.sector} · Founded ${startup.year}` : undefined
      }
      maxWidth="max-w-lg"
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      footer={<CancelButton onClose={onClose} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-meta text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading startup details...
        </div>
      ) : !startup ? (
        <p className="py-6 text-body text-ink-faint">Startup not found.</p>
      ) : (
        <>
          <p className="text-body text-ink-muted">{startup.description}</p>

          {startup.edc_impact && (
            <div>
              <GroupLabel>eDC impact</GroupLabel>
              <p className="mt-1.5 text-body text-ink">{startup.edc_impact}</p>
            </div>
          )}

          <div className="divide-y divide-line-subtle border-y border-line-subtle">
            <DetailRow label="Stage" value={startup.stage} />
            <DetailRow label="Engagement" value={startup.engagement} />
            <DetailRow label="Support provided" value={startup.support_type} />
            <DetailRow label="Founder" value={founder?.name} />
            <DetailRow label="Initiative" value={initiative?.name} />
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-control text-meta text-ink-muted transition-colors hover:text-accent-300 ${FOCUS}`}
                >
                  <l.icon className="h-3.5 w-3.5 shrink-0" />
                  {l.label}
                  {l.href.startsWith('http') && <ExternalLink className="h-3 w-3" />}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ─── Main Startups Page Component ──────────────────────────────────────────

export default function StartupsPage() {
  const { user } = useAuth();
  const privileged = isPrivilegedRole(user);

  const [startups, setStartups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  // Replays the grid's load-in on every sector / stage pick.
  const [listReplayKey, replayList] = useFilterReplay();

  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingStartupId, setViewingStartupId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [startupsRes, contactsRes, initRes] = await Promise.all([
        getAllStartups(),
        getAllContacts(),
        getAllInitiatives(),
      ]);

      if (startupsRes.error) setError(startupsRes.error);
      setStartups(startupsRes.data || []);
      setContacts(contactsRes.data || []);
      setInitiatives(initRes.data || []);
    } catch {
      setError('Failed to fetch startups portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this startup profile?')) return;

    setDeletingId(id);
    const res = await deleteStartup(id);
    setDeletingId(null);

    if (res.error) {
      alert(`Delete failed: ${res.error}`);
    } else {
      setStartups((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const filteredStartups = startups.filter((s) => {
    const matchesSector = sectorFilter === 'all' || (s.sector || '').toLowerCase() === sectorFilter.toLowerCase();
    const matchesStage = stageFilter === 'all' || (s.stage || '').toLowerCase() === stageFilter.toLowerCase();

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.edc_impact?.toLowerCase().includes(q) ||
      s.sector?.toLowerCase().includes(q);

    return matchesSector && matchesStage && matchesSearch;
  });

  // ── Summary, derived from what's already loaded.

  return (
    <>
      {showAddModal && (
        <AddStartupModal
          contacts={contacts}
          initiatives={initiatives}
          onClose={() => setShowAddModal(false)}
          onSuccess={(created) => {
            setShowAddModal(false);
            if (created) setStartups((prev) => [created, ...prev]);
          }}
        />
      )}

      {viewingStartupId && (
        <StartupDetailModal
          startupId={viewingStartupId}
          contacts={contacts}
          initiatives={initiatives}
          onClose={() => setViewingStartupId(null)}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        <PageHeader
          title="Startups"
          description="Ventures the cell has incubated, accelerated or mentored."
          action={
            privileged && (
              <button onClick={() => setShowAddModal(true)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                Add startup
              </button>
            )
          }
        />

        {/* One control row. Both filters stay dropdowns: sector runs to 11
            options, well past the pill threshold, and stage — though only six —
            shares this row with search and the sector filter, so pills here
            would crowd the toolbar and wrap on narrower viewports. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search startups by name, sector or impact..."
          />
          <div className="flex shrink-0 gap-2">
            <div className="w-40">
              <Select
                value={sectorFilter}
                onChange={(v) => {
                  setSectorFilter(v);
                  replayList();
                }}
                options={[{ value: 'all', label: 'All sectors' }, ...toOptions(SECTORS)]}
                ariaLabel="Filter by sector"
              />
            </div>
            <div className="w-40">
              <Select
                value={stageFilter}
                onChange={(v) => {
                  setStageFilter(v);
                  replayList();
                }}
                options={[{ value: 'all', label: 'All stages' }, ...toOptions(STAGES)]}
                ariaLabel="Filter by stage"
              />
            </div>
          </div>
        </div>

        {/* Keyed on the replay counter so either dropdown replays the load-in,
            including a pick that lands on the same set. Search is not wired in. */}
        <div key={listReplayKey}>
          {loading ? (
            <LoadingPanel>Loading startups portfolio...</LoadingPanel>
          ) : error ? (
            <ErrorPanel>{error}</ErrorPanel>
          ) : filteredStartups.length === 0 ? (
            <EmptyPanel>No startups match your search or filters.</EmptyPanel>
          ) : (
            <div className="stagger-in grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredStartups.map((stp) => {
              const isDeleting = deletingId === stp.id;
              const founderContact = contacts.find((c) => c.id === stp.founder_id);

              return (
                <article
                  key={stp.id}
                  className="flex flex-col rounded-surface border border-line bg-surface shadow-card"
                >
                  {/* Header — icon chip tinted by stage maturity */}
                  <div className="flex items-start gap-3 p-5">
                    <button
                      type="button"
                      onClick={() => setViewingStartupId(stp.id)}
                      className={`flex min-w-0 flex-1 items-start gap-3 rounded-control text-left ${FOCUS}`}
                    >
                      <IconChip icon={Building2} tone={stageTone(stp.stage)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-semibold text-ink">
                          {stp.name}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Chip tone={stageTone(stp.stage)}>{stp.stage}</Chip>
                          <Chip>{stp.sector}</Chip>
                        </span>
                      </span>
                    </button>

                    {privileged && (
                      <IconButton
                        danger
                        disabled={isDeleting}
                        label="Delete startup"
                        onClick={(e) => handleDelete(e, stp.id)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>
                    )}
                  </div>

                  {/* Body — impact is plain text, not a permanent green callout */}
                  <div className="flex-1 space-y-3 px-5">
                    <p className="line-clamp-2 text-meta text-ink-muted">{stp.description}</p>

                    {stp.edc_impact && (
                      <p className="flex items-start gap-1.5 text-meta text-ink-faint">
                        <Target className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="line-clamp-2">{stp.edc_impact}</span>
                      </p>
                    )}
                  </div>

                  {/* Meta line, matching the pattern used on Initiatives */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-subtle px-5 py-3 text-meta text-ink-faint">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">{stp.year}</span>
                    </span>
                    {founderContact && (
                      <>
                        <MetaDot />
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{founderContact.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </article>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
