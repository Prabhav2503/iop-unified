import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabaseRecords, useCreateDatabaseRecord, useUpdateDatabaseRecord, useDeleteDatabaseRecord } from '../hooks/useQueries';
import {
  FOCUS,
  INPUT_CLS,
  BTN_PRIMARY,
  BTN_QUIET,
  IconChip,
  MetaDot,
  IconButton,
  Field,
  Modal,
  CancelButton,
  FormError,
  PageHeader,
  SearchInput,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from '../components/ui';
import { getRoleStr, editPrivilegedRole, addPrivilegedRole } from '../utility/permissions';

// ─── Helpers & Formatting ───────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// A drive URL is a destination, not content. Show where it goes, not the
// 120-character query string.
function describeLink(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host.includes('drive.google')) {
      if (u.pathname.includes('/folders/')) return 'Google Drive · folder';
      if (u.pathname.includes('/file/')) return 'Google Drive · file';
      return 'Google Drive';
    }
    if (host.includes('docs.google')) return 'Google Docs';
    if (host.includes('sheets.google')) return 'Google Sheets';
    return host;
  } catch {
    return 'External link';
  }
}

// ─── Add/Edit Modal ─────────────────────────────────────────────────────────

function DriveRecordModal({ initialRecord, onClose, onSuccess }) {
  const { user } = useAuth();
  const [driveUrl, setDriveUrl] = useState(initialRecord?.drive_url || '');
  const [name, setname] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const isEditing = Boolean(initialRecord);
  const createMutation = useCreateDatabaseRecord();
  const updateMutation = useUpdateDatabaseRecord();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driveUrl.trim()) return;

    setError('');

    const creatorUuid = user?.profile_id || user?.id || user?.user_id || user?.team_id || null;

    if (isEditing) {
      updateMutation.mutate(
        { id: initialRecord.id, updates: { drive_url: driveUrl.trim(), created_by: creatorUuid, name, description } },
        { onSuccess: (res) => onSuccess(res?.data), onError: (err) => setError(err.message) }
      );
    } else {
      createMutation.mutate(
        { drive_url: driveUrl.trim(), name, description, created_by: creatorUuid },
        { onSuccess: (res) => onSuccess(res?.data), onError: (err) => setError(err.message) }
      );
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit drive link' : 'Add drive link'}
      maxWidth="max-w-md"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save changes' : 'Add link'}
          </button>
        </>
      }
    >
      {/* Each field is its own group — previously all three shared one wrapper,
          so the URL's helper text read as if it belonged to the Name label. */}
      <Field label="Name *">
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setname(e.target.value)}
          placeholder="e.g. Sponsorship decks 2026"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Description *">
        <input
          required
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What lives in this folder"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Drive URL *" hint="A shared Google Drive folder or file link">
        <input
          required
          type="url"
          value={driveUrl}
          onChange={(e) => setDriveUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className={`${INPUT_CLS} font-mono text-meta`}
        />
      </Field>

      <FormError>{error}</FormError>
    </Modal>
  );
}

// ─── Main Database Page Component ──────────────────────────────────────────

export default function DatabasePage() {
  const { user } = useAuth();
  const canEdit = editPrivilegedRole(user);
  const canAdd = addPrivilegedRole(user);

  const { data: records = [], isLoading: loading, error: queryError } = useDatabaseRecords();
  const deleteRecordMutation = useDeleteDatabaseRecord();

  const error = queryError?.message || '';

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this drive record?')) return;
    setDeletingId(id);
    deleteRecordMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
      onError: (err) => alert(`Delete failed: ${err.message}`),
    });
  };

  const handleCopyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.drive_url?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {(showAddModal || editingRecord) && (
        <DriveRecordModal
          initialRecord={editingRecord}
          onClose={() => {
            setShowAddModal(false);
            setEditingRecord(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingRecord(null);
          }}
        />
      )}

      <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
        <PageHeader
          title="Drive links"
          description="Shared folders and documents the cell works out of."
          action={
            canAdd && (
              <button onClick={() => setShowAddModal(true)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                Add drive link
              </button>
            )
          }
        />

        {/* No filter control here — a flat list of links has nothing stable to
            filter on, so search alone carries the page. */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, description or link..."
        />

        {loading ? (
          <LoadingPanel>Loading drive links...</LoadingPanel>
        ) : error ? (
          <ErrorPanel>{error}</ErrorPanel>
        ) : filteredRecords.length === 0 ? (
          <EmptyPanel>No drive links match your search.</EmptyPanel>
        ) : (
          <div className="stagger-in grid gap-4 sm:grid-cols-2">
            {filteredRecords.map((rec) => {
              const isDeleting = deletingId === rec.id;
              const isCopied = copiedId === rec.id;
              const created = formatDate(rec.created_at);

              return (
                <article
                  key={rec.id}
                  className="flex flex-col rounded-surface border border-line bg-surface shadow-card"
                >
                  <div className="flex items-start gap-3 p-5">
                    <IconChip icon={HardDrive} tone="accent" />

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-body font-semibold text-ink">
                        {rec.name || 'Drive resource'}
                      </h3>
                      {rec.description && (
                        <p className="mt-1 line-clamp-2 text-meta text-ink-muted">
                          {rec.description}
                        </p>
                      )}

                      {/* The destination, described — not the raw URL */}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
                        <span className="truncate">{describeLink(rec.drive_url)}</span>
                        {created && (
                          <>
                            <MetaDot />
                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {created}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton label="Edit" onClick={() => setEditingRecord(rec)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          danger
                          disabled={isDeleting}
                          label="Delete"
                          onClick={() => handleDelete(rec.id)}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </IconButton>
                      </div>
                    )}
                  </div>

                  {/* Open is the primary action and looks like it */}
                  <div className="mt-auto flex items-center gap-2 border-t border-line-subtle px-5 py-3">
                    <a
                      href={rec.drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-control bg-accent-soft px-2.5 py-1.5 text-meta font-semibold text-accent-300 transition-colors duration-150 hover:bg-accent-line ${FOCUS}`}
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(rec.id, rec.drive_url)}
                      className={BTN_QUIET}
                      title={rec.drive_url}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
