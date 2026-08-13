import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAllContacts,
  getVisibleContacts,
  createContact,
  deleteContact,
  toggleContactVisibility,
} from '../API/contact';
import {
  INPUT_CLS,
  BTN_PRIMARY,
  Avatar,
  Chip,
  IconButton,
  Field,
  Modal,
  PillFilter,
  CancelButton,
  FormError,
  PageHeader,
  SearchInput,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from '../components/ui';
import { useFilterReplay } from '../hooks/useFilterReplay';

// ─── Role Helper ────────────────────────────────────────────────────────────

function getRoleStr(role) {
  return (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
}

// Privileged roles for Contact actions: admin, overall_coordinator, co_overall_coordinator, coordinator
function isPrivilegedContactRole(user) {
  if (!user) return false;
  const r = getRoleStr(user.role);
  return (
    r.includes('admin') ||
    r.includes('overall_coordinator') ||
    r.includes('co_overall_coordinator') ||
    r.includes('coordinator')
  );
}

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All contacts' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
];

// ─── Reusable TagInput for text[] fields ────────────────────────────────────

function TagInput({ label, values, onChange, placeholder, tone = 'neutral' }) {
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
            className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-micro font-medium ${
              tone === 'accent'
                ? 'bg-accent-soft text-accent-300'
                : 'bg-muted text-ink-muted'
            }`}
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

// ─── Add Contact Modal ──────────────────────────────────────────────────────

const EMPTY_CONTACT_FORM = {
  name: '',
  number: '',
  email: '',
  organization: [],
  roles: [],
  tags: [],
  dataset_id: '',
};

function AddContactModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_CONTACT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setArr = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (form.number && form.number.length < 10) {
      setFormError('Phone number must be at least 10 characters long');
      return;
    }

    setSubmitting(true);
    const result = await createContact({
      name: form.name.trim(),
      number: form.number.trim() || null,
      email: form.email.trim() || null,
      organization: form.organization.length > 0 ? form.organization : null,
      roles: form.roles.length > 0 ? form.roles : null,
      tags: form.tags.length > 0 ? form.tags : null,
      dataset_id: form.dataset_id.trim() || null,
    });
    setSubmitting(false);

    if (result.error) {
      setFormError(result.error);
    } else {
      onSuccess(result.data);
    }
  };

  return (
    <Modal
      title="Add contact"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Saving...' : 'Save contact'}
          </button>
        </>
      }
    >
      <Field label="Name *">
        <input
          required
          type="text"
          value={form.name}
          onChange={set('name')}
          placeholder="e.g. Rahul Verma"
          className={INPUT_CLS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="rahul@example.com"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Phone" hint="Min 10 digits if provided">
          <input
            type="tel"
            value={form.number}
            onChange={set('number')}
            placeholder="9876543210"
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <TagInput
        label="Organisation"
        values={form.organization}
        onChange={setArr('organization')}
        placeholder="e.g. IIT Delhi, EDC"
      />

      <TagInput
        label="Roles"
        values={form.roles}
        onChange={setArr('roles')}
        placeholder="e.g. Advisor, Founder"
        tone="accent"
      />

      <TagInput
        label="Tags"
        values={form.tags}
        onChange={setArr('tags')}
        placeholder="e.g. Investor, Mentor"
      />

      <Field label="Dataset ID" hint="Optional UUID — internal reference only">
        <input
          type="text"
          value={form.dataset_id}
          onChange={set('dataset_id')}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          className={`${INPUT_CLS} font-mono`}
        />
      </Field>

      <FormError>{formError}</FormError>
    </Modal>
  );
}

// ─── Contacts Page ──────────────────────────────────────────────────────────

export default function ContactsPage() {
  const { user } = useAuth();
  const privileged = isPrivilegedContactRole(user);

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Replays the list's load-in on every visibility pill click.
  const [listReplayKey, replayList] = useFilterReplay();
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchContacts = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      // Privileged role (admin, oc, co-oc, coordinator) fetches ALL contacts
      // Non-privileged (executives) fetches ONLY visible contacts via getVisibleContacts
      const result = privileged ? await getAllContacts() : await getVisibleContacts();

      if (result.error) {
        setError(result.error);
        setContacts([]);
      } else {
        setContacts(result.data || []);
      }
    } catch {
      setError('Unexpected error loading contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [privileged]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const handleContactAdded = (newContact) => {
    setShowAddModal(false);
    if (newContact) {
      setContacts((prev) => [newContact, ...prev]);
    }
  };

  const handleToggleVisibility = async (contactId) => {
    setTogglingId(contactId);

    // Optimistically update UI
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, visibility: !c.visibility } : c))
    );

    const result = await toggleContactVisibility(contactId);
    setTogglingId(null);

    if (result.error) {
      // Revert optimism if error
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, visibility: !c.visibility } : c))
      );
      alert(`Failed to toggle visibility: ${result.error}`);
    } else if (result.data) {
      // Ensure backend data state is synced
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, visibility: result.data.visibility } : c))
      );
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Delete this contact? This action cannot be undone.')) return;

    setDeletingId(contactId);
    const result = await deleteContact(contactId);
    setDeletingId(null);

    if (result.error) {
      alert(`Delete failed: ${result.error}`);
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    }
  };

  // Search filter
  const searchedContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const phoneMatch = c.number?.toLowerCase().includes(q);
    const orgMatch = Array.isArray(c.organization) && c.organization.some((o) => o.toLowerCase().includes(q));
    const roleMatch = Array.isArray(c.roles) && c.roles.some((r) => r.toLowerCase().includes(q));
    const tagMatch = Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q));
    return nameMatch || emailMatch || phoneMatch || orgMatch || roleMatch || tagMatch;
  });

  const filteredContacts = searchedContacts.filter((c) => {
    if (visibilityFilter === 'visible') return c.visibility !== false;
    if (visibilityFilter === 'hidden') return c.visibility === false;
    return true;
  });

  return (
    <>
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleContactAdded}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        <PageHeader
          title="Contacts"
          description="Directory of stakeholders, partners and mentors."
          action={
            privileged && (
              <button onClick={() => setShowAddModal(true)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                Add contact
              </button>
            )
          }
        />

        {/* Search on its own line, filter beneath it — the same shape as Team.
            Visibility has three fixed options, so they stay visible as pills
            rather than hiding the current state inside a dropdown. */}
        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, organisation, role or tag..."
          />

          {privileged && (
            <PillFilter
              value={visibilityFilter}
              onChange={(v) => {
                setVisibilityFilter(v);
                replayList();
              }}
              options={VISIBILITY_OPTIONS}
              ariaLabel="Filter by visibility"
            />
          )}
        </div>

        {/* Keyed on the replay counter so every pill click replays the load-in,
            including one that lands on the same set. Search is not wired in. */}
        <div key={listReplayKey}>
          {loading ? (
            <LoadingPanel>Loading contacts...</LoadingPanel>
          ) : error ? (
            <ErrorPanel>{error}</ErrorPanel>
          ) : filteredContacts.length === 0 ? (
            <EmptyPanel>No contacts match your search or filters.</EmptyPanel>
          ) : (
            <div className="stagger-in grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact) => {
              const isHidden = contact.visibility === false;
              const isToggling = togglingId === contact.id;
              const isDeleting = deletingId === contact.id;
              const orgs = Array.isArray(contact.organization) ? contact.organization : [];
              const roles = Array.isArray(contact.roles) ? contact.roles : [];
              const tags = Array.isArray(contact.tags) ? contact.tags : [];

              return (
                <article
                  key={contact.id}
                  className="flex flex-col rounded-surface border border-line bg-surface p-5 shadow-card"
                >
                  {/* Identity */}
                  <div className="flex items-start gap-3">
                    <Avatar name={contact.name} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="truncate text-body font-semibold text-ink">
                          {contact.name}
                        </h3>
                        {/* Hidden state: ONE signal, nothing else changes */}
                        {privileged && isHidden && (
                          <Chip icon={EyeOff} title="Not visible to executives">
                            Hidden
                          </Chip>
                        )}
                      </div>

                      {orgs.length > 0 && (
                        <p className="mt-0.5 truncate text-meta text-ink-faint">
                          {orgs.join(' · ')}
                        </p>
                      )}
                    </div>

                    {privileged && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton
                          disabled={isToggling}
                          label={isHidden ? 'Make visible to executives' : 'Hide from executives'}
                          onClick={() => handleToggleVisibility(contact.id)}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isHidden ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </IconButton>

                        <IconButton
                          danger
                          disabled={isDeleting}
                          label="Delete contact"
                          onClick={() => handleDelete(contact.id)}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </IconButton>
                      </div>
                    )}
                  </div>

                  {/* Reach — both rows styled identically */}
                  {(contact.email || contact.number) && (
                    <div className="mt-4 space-y-1.5">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 text-meta text-ink-muted transition-colors hover:text-accent-300"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}
                      {contact.number && (
                        <a
                          href={`tel:${contact.number}`}
                          className="flex items-center gap-2 text-meta text-ink-muted transition-colors hover:text-accent-300"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                          <span className="truncate">{contact.number}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* One chip shape for roles and tags — tone tells them apart:
                      accent = role (what they are), neutral = tag (a label) */}
                  {(roles.length > 0 || tags.length > 0) && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {roles.map((role) => (
                        <Chip key={`r-${role}`} tone="accent" title="Role">
                          {role}
                        </Chip>
                      ))}
                      {tags.map((tag) => (
                        <Chip key={`t-${tag}`} title="Tag">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  )}

                  {/* Internal reference — privileged only, out of the hierarchy */}
                  {privileged && contact.dataset_id && (
                    <p
                      title={contact.dataset_id}
                      className="mt-4 truncate border-t border-line-subtle pt-3 font-mono text-micro text-ink-faint/70"
                    >
                      {contact.dataset_id}
                    </p>
                  )}
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
