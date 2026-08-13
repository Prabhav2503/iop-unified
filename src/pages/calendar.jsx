import { CalendarDays } from 'lucide-react';
import { PageHeader, IconChip } from '../components/ui';

export default function CalendarPage() {
  return (
    <div className="max-w-6xl space-y-6 px-4 py-4 sm:px-7 sm:py-7">
      <PageHeader
        title="Calendar"
        description="Deadlines and events across initiatives."
      />

      {/* Honest placeholder: says plainly that it isn't built, rather than
          dressing an empty card up as a feature. */}
      <div className="flex flex-col items-start gap-3 rounded-surface border border-dashed border-line bg-surface px-6 py-10">
        <IconChip icon={CalendarDays} tone="neutral" />
        <div>
          <h2 className="font-display text-section font-semibold text-ink">Not built yet</h2>
          <p className="mt-1 max-w-md text-body text-ink-muted">
            This page will show initiative deadlines and internal events on a calendar. Until
            then, upcoming deadlines are on the dashboard and on each initiative.
          </p>
        </div>
      </div>
    </div>
  );
}
