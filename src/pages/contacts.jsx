import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Tag as TagIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useContactsForRole, useCreateContact, useDeleteContact, useToggleContactVisibility } from '../hooks/useQueries';
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

// ─── Creatable TagInput with existing suggestions for text[] fields ─────────

function TagInput({
  label,
  values = [],
  onChange,
  placeholder,
  tone = 'neutral',
  existingOptions = [],
  hint = 'Pick existing or type & press Enter to add',
}) {
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const addTag = (tagToAdd) => {
    const trimmed = (tagToAdd || draft).trim();
    if (!trimmed) return;
    const exists = values.some(
      (v) => v.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      onChange([...values, trimmed]);
    }
    setDraft('');
    setIsOpen(false);
  };

  const removeTag = (tag) => onChange(values.filter((v) => v !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      removeTag(values[values.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Filter existing options that are not yet selected
  const availableExisting = existingOptions.filter(
    (opt) => !values.some((v) => v.toLowerCase() === opt.toLowerCase())
  );

  const matchingSuggestions = availableExisting.filter((opt) =>
    !draft.trim() || opt.toLowerCase().includes(draft.trim().toLowerCase())
  );

  const isExactMatch = values.concat(availableExisting).some(
    (opt) => opt.toLowerCase() === draft.trim().toLowerCase()
  );

  const showCreateOption = draft.trim().length > 0 && !isExactMatch;

  return (
    <Field label={label} hint={hint}>
      <div ref={containerRef} className="relative space-y-2">
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas px-2.5 py-1.5 transition-colors focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-300/25"
        >
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
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                aria-label={`Remove ${tag}`}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setDraft(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={values.length === 0 ? placeholder : ''}
            className="min-w-[130px] flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && (matchingSuggestions.length > 0 || showCreateOption) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-control border border-line bg-surface py-1 shadow-overlay animate-fade-in">
            {showCreateOption && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(draft);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-body font-medium text-accent-300 hover:bg-accent-soft"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add new tag: <strong className="text-ink">"{draft.trim()}"</strong></span>
              </button>
            )}

            {matchingSuggestions.length > 0 && (
              <>
                {showCreateOption && <div className="my-1 border-t border-line-subtle" />}
                <div className="px-3 py-1 text-micro font-semibold uppercase tracking-wide text-ink-faint">
                  Existing tags
                </div>
                {matchingSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(tag);
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-body text-ink hover:bg-muted"
                  >
                    <span>{tag}</span>
                    <Plus className="h-3 w-3 text-ink-faint" />
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Quick select chips for existing unselected options */}
        {availableExisting.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-micro font-medium text-ink-faint">Suggestions:</span>
            {availableExisting.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2 py-0.5 text-micro font-medium text-ink-muted transition-colors hover:border-accent-400 hover:bg-accent-soft hover:text-accent-300"
              >
                <Plus className="h-2.5 w-2.5" />
                {tag}
              </button>
            ))}
            {availableExisting.length > 8 && (
              <span className="text-micro text-ink-faint">
                +{availableExisting.length - 8} more in dropdown
              </span>
            )}
          </div>
        )}
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

function AddContactModal({
  onClose,
  onSuccess,
  existingTags = [],
  existingOrganizations = [],
  existingRoles = [],
}) {
  const [form, setForm] = useState(EMPTY_CONTACT_FORM);
  const [formError, setFormError] = useState('');
  const createContactMutation = useCreateContact();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setArr = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (form.number && form.number.length < 10) {
      setFormError('Phone number must be at least 10 characters long');
      return;
    }

    createContactMutation.mutate({
      name: form.name.trim(),
      number: form.number.trim() || null,
      email: form.email.trim() || null,
      organization: form.organization.length > 0 ? form.organization : null,
      roles: form.roles.length > 0 ? form.roles : null,
      tags: form.tags.length > 0 ? form.tags : null,
      dataset_id: form.dataset_id.trim() || null,
    }, {
      onSuccess: (res) => onSuccess(res?.data),
      onError: (err) => setFormError(err.message || 'Failed to create contact'),
    });
  };

  return (
    <Modal
      title="Add contact"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={createContactMutation.isPending} className={BTN_PRIMARY}>
            {createContactMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {createContactMutation.isPending ? 'Saving...' : 'Save contact'}
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
        existingOptions={existingOrganizations}
        placeholder="e.g. IIT Delhi, EDC"
      />

      <TagInput
        label="Roles"
        values={form.roles}
        onChange={setArr('roles')}
        existingOptions={existingRoles}
        placeholder="e.g. Advisor, Founder"
        tone="accent"
      />

      <TagInput
        label="Tags"
        values={form.tags}
        onChange={setArr('tags')}
        existingOptions={existingTags}
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

  const { data: contacts = [], isLoading: loading, error: queryError } = useContactsForRole(privileged);
  const deleteContactMutation = useDeleteContact();
  const toggleVisibilityMutation = useToggleContactVisibility();

  const error = queryError?.message || '';

  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Replays the list's load-in on every visibility pill click.
  const [listReplayKey, replayList] = useFilterReplay();
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleContactAdded = () => {
    setShowAddModal(false);
  };

  const handleToggleVisibility = async (contactId) => {
    setTogglingId(contactId);
    toggleVisibilityMutation.mutate(
      { id: contactId },
      {
        onSettled: () => setTogglingId(null),
        onError: (err) => alert(`Failed to toggle visibility: ${err.message}`),
      }
    );
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Delete this contact? This action cannot be undone.')) return;
    setDeletingId(contactId);
    deleteContactMutation.mutate(contactId, {
      onSettled: () => setDeletingId(null),
      onError: (err) => alert(`Delete failed: ${err.message}`),
    });
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

  // Extract unique existing tags, organizations, and roles across contacts
  const existingTags = Array.from(
    new Set(
      contacts
        .flatMap((c) => (Array.isArray(c.tags) ? c.tags : []))
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const existingOrganizations = Array.from(
    new Set(
      contacts
        .flatMap((c) => (Array.isArray(c.organization) ? c.organization : []))
        .map((o) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const existingRoles = Array.from(
    new Set(
      contacts
        .flatMap((c) => (Array.isArray(c.roles) ? c.roles : []))
        .map((r) => (typeof r === 'string' ? r.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <>
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleContactAdded}
          existingTags={existingTags}
          existingOrganizations={existingOrganizations}
          existingRoles={existingRoles}
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
