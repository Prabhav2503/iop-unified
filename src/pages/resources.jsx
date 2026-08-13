import { FolderOpen } from 'lucide-react';
import { PageHeader, IconChip } from '../components/ui';

export default function ResourcesPage() {
  return (
    <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
      <PageHeader
        title="Resources"
        description="Templates, documents and reference material."
      />

      {/* Honest placeholder. Note this route is reachable by URL but is
          deliberately not in the sidebar — see the flagged items. */}
      <div className="flex flex-col items-start gap-3 rounded-surface border border-dashed border-line bg-surface px-6 py-10">
        <IconChip icon={FolderOpen} tone="neutral" />
        <div>
          <h2 className="font-display text-section font-semibold text-ink">Not built yet</h2>
          <p className="mt-1 max-w-md text-body text-ink-muted">
            This page will hold shared templates and reference documents. Shared drive folders
            currently live under Drive links.
          </p>
        </div>
      </div>
    </div>
  );
}
