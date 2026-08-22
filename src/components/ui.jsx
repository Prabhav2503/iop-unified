// ─── eDC IOP shared UI primitives ──────────────────────────────────────────
// The design system's building blocks, extracted so every page uses the same
// ones rather than re-declaring them. Tokens live in tailwind.config.js.
//
// Rules encoded here:
//   • One chip shape. Tone carries meaning, never shape or size.
//   • Colour is action, state or focus — never decoration.
//   • Elevation is lightness: canvas → surface → raised.
//   • Glow marks the single primary action on a page and nothing else.
//   • Dropdowns are never native <select> — the OS renders the open option
//     list with chrome CSS cannot reach, which breaks the dark theme.

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Loader2, Search } from 'lucide-react';

export const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40';

// Discrete filter/tab clicks replay the list load-in via the `useFilterReplay`
// hook in src/hooks — it lives outside this file because a module that exports
// components may not also export a bare hook without breaking Fast Refresh.

// Inputs sit recessed (canvas) inside raised surfaces.
export const INPUT_CLS =
  'w-full rounded-control border border-line bg-canvas px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/25';

// Button labels sit a step above body weight (600 vs 500) so they read as
// deliberate, pressable objects rather than sentences.
//
// Press feedback is a 2% scale-down held for 100ms. It is deliberately at the
// edge of perception — you feel the button give rather than watch it move —
// and it reads as acknowledgement on a slow connection, before the request has
// come back with anything.
const PRESS = 'transition duration-150 ease-exit active:scale-[0.98] active:duration-100';

export const BTN_PRIMARY = `inline-flex items-center gap-1.5 rounded-control bg-accent-500 px-3.5 py-2 text-body font-semibold text-white shadow-glow hover:bg-accent-400 disabled:opacity-60 disabled:active:scale-100 ${PRESS} ${FOCUS}`;

export const BTN_QUIET = `inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1.5 text-meta font-semibold text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-60 disabled:active:scale-100 ${PRESS} ${FOCUS}`;

// Tinted icon container (glyph colour)
const ICON_TONE = {
  accent: 'bg-accent-soft text-accent-300',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-ink-faint',
};

// Text chip (label colour). ONE shape for every chip in the app.
const CHIP_TONE = {
  accent: 'bg-accent-soft text-accent-300',
  warn: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
  neutral: 'bg-muted text-ink-muted',
  outline: 'border border-line text-ink-muted',
};

export function IconChip({ icon: Icon, tone = 'neutral', size = 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
  return (
    <span
      aria-hidden="true"
      className={`flex ${box} shrink-0 items-center justify-center rounded-chip ${ICON_TONE[tone]}`}
    >
      <Icon className={glyph} />
    </span>
  );
}

// Initials beat a generic person glyph — same weight, actual information.
// Accent-tinted by default, matching the signed-in user avatar in the sidebar.
// The tint is the avatar's identity treatment, NOT a status signal — anything
// meaningful (seniority, state) is carried by that row's chip instead.
export function Avatar({ name, tone = 'accent', size = 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className={`flex ${box} shrink-0 items-center justify-center rounded-chip font-display text-micro font-semibold ${ICON_TONE[tone]}`}
    >
      {initials || '?'}
    </span>
  );
}

export function Chip({ tone = 'neutral', icon: Icon, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-micro font-medium ${CHIP_TONE[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-accent-300 transition-[width] duration-300 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Big figure, quiet label beneath, small real indicator top-right.
export function StatCard({ icon, tone, value, label, indicator, progress }) {
  return (
    <div className="rounded-surface border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <IconChip icon={icon} tone={tone} />
        {indicator}
      </div>
      <p className="mt-4 font-display text-stat font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-meta text-ink-faint">{label}</p>
      {progress !== undefined && (
        <div className="mt-3">
          <ProgressBar value={progress} />
        </div>
      )}
    </div>
  );
}

export function MetaDot() {
  return (
    <span aria-hidden="true" className="text-ink-faint/50">
      ·
    </span>
  );
}

export function IconButton({ onClick, label, danger, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-faint transition duration-150 ease-exit active:scale-90 active:duration-100 disabled:opacity-60 disabled:active:scale-100 ${
        danger ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-muted hover:text-ink'
      } ${FOCUS}`}
    >
      {children}
    </button>
  );
}

export function GroupLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
        {children}
      </h4>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-meta font-medium text-ink-muted">{label}</label>
      {children}
      {hint && <p className="text-micro text-ink-faint">{hint}</p>}
    </div>
  );
}

// Accent rule + title. The rule is the one purely decorative mark we allow.
export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2.5 h-0.5 w-8 rounded-full bg-accent-300" aria-hidden="true" />
        <h1 className="font-display text-title font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-line bg-surface py-2 pl-9 pr-3 text-body text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/25"
      />
    </div>
  );
}

// A row of mutually-exclusive pills. Active fills accent; inactive is
// outlined. The active pill carries a transparent border so it doesn't shift
// size against its neighbours.
//
// SITE RULE for every filter / toggle control:
//   pills   — roughly 7 or fewer stable options AND the control sits on its
//             own line (Team's verticals, Contacts' visibility)
//   Select  — more than 7 options, or the control shares a row with other
//             controls (Startups' sector + stage, Initiatives' status)
// The point is that a short, fixed option set should stay readable without a
// click, while a crowded toolbar or a long list should collapse into one.
export function PillFilter({ value, onChange, options, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-control border px-3 py-1.5 text-meta font-semibold transition duration-150 ease-exit active:scale-[0.98] active:duration-100 ${FOCUS} ${
              active
                ? 'border-transparent bg-accent-500 text-white'
                : 'border-line bg-surface text-ink-muted hover:bg-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingPanel({ children }) {
  return (
    <div className="flex items-center gap-2 rounded-surface border border-line bg-surface px-5 py-10 text-body text-ink-faint">
      <Loader2 className="h-4 w-4 animate-spin" />
      {children}
    </div>
  );
}

export function ErrorPanel({ children }) {
  return (
    <div className="rounded-surface border border-danger-border bg-danger-soft px-4 py-3 text-body text-danger-ink">
      {children}
    </div>
  );
}

// Animates in like a populated list would: filtering down to nothing is a
// result, and it should arrive the same way any other result does.
export function EmptyPanel({ children }) {
  return (
    <div className="animate-rise-in rounded-surface border border-dashed border-line px-5 py-10 text-body text-ink-faint">
      {children}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p className="animate-rise-in rounded-control border border-danger-border bg-danger-soft px-3 py-2 text-meta text-danger-ink">
      {children}
    </p>
  );
}

export function CancelButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={`rounded-control border border-line px-3 py-1.5 text-body font-semibold text-ink-muted transition duration-150 ease-exit hover:bg-muted hover:text-ink active:scale-[0.98] active:duration-100 ${FOCUS}`}
    >
      Cancel
    </button>
  );
}

// One modal shell — header, scrolling body, pinned footer.
//
// The backdrop fades and the panel rises 8px as it settles, so the dialog
// reads as arriving over the page rather than replacing it. Entrance only:
// closing is instant, because every close path (the X, Cancel in the footer,
// and a successful submit) unmounts this component from the parent, and an
// exit animation would only cover some of them — a half-animated dismissal
// looks more broken than an honest cut. See the note in the summary.
export function Modal({
  title,
  subtitle,
  onClose,
  onSubmit,
  footer,
  maxWidth = 'max-w-lg',
  children,
}) {
  return (
    // PORTALLED TO document.body, for the same reason the Select's list is:
    // `position: fixed` resolves against the nearest ancestor with a transform,
    // filter or containment — not necessarily the viewport. Rendered in place,
    // a dialog inherits whatever the page happens to be doing, so an animated
    // page wrapper silently turns every modal into an absolutely-positioned
    // box inside the content column: pushed down the page on a long one,
    // clipped to the content height on a short one. document.body is the one
    // parent that cannot acquire a containing block by accident.
    //
    // The backdrop is also the scroll container, and the centring wrapper
    // carries min-h-full. That is what keeps the top of a tall form reachable:
    // with plain `items-center` on a fixed overlay, anything taller than the
    // viewport overflows equally in both directions and the overflow above the
    // centre line cannot be scrolled to — header and first field simply gone.
    // Centred *inside a scrollable* area, an over-tall dialog pushes the
    // wrapper instead and stays reachable end to end.
    createPortal(
      <div className="fixed inset-0 z-50 animate-fade-in overflow-y-auto overscroll-contain bg-black/60">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            className={`flex max-h-[85dvh] w-full ${maxWidth} animate-modal-in flex-col rounded-surface border border-line bg-raised shadow-overlay`}
          >
            {/* Header, body and footer share one padding scale: 20px inline
                everywhere, 16px block on the two bars, 20px on the body so the
                first label is never tight against the divider above it. */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line-subtle px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-display text-section font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-meta text-ink-faint">{subtitle}</p>}
              </div>
              <IconButton onClick={onClose} label="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            {/* flex-1 + min-h-0 stated rather than inferred: the form has to be
                the element that gives up height so the body below it is the one
                that scrolls, not the dialog that overflows. */}
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
                {children}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-line-subtle px-5 py-4">
                {footer}
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
    )
  );
}

// Themed dropdown, replacing native <select> everywhere. The open list is
// PORTALLED to document.body and fixed-positioned against the trigger, so it
// cannot be clipped by an ancestor's `overflow: auto` — which is what makes it
// safe inside modal bodies, not just page toolbars.
//
// variant: 'toolbar' (compact, sits on a page surface)
//          'field'   (matches INPUT_CLS, for use inside a form)
//
// The list grows down out of the trigger on open and shrinks back into it on
// close. Because this component owns its own open state, it can hold the list
// mounted for the length of the exit animation before dropping it — which is
// why the dropdown animates in both directions and the Modal only animates in.
const SELECT_EXIT_MS = 100; // must match the pop-out animation in the config

export function Select({
  value,
  onChange,
  options = [],
  ariaLabel,
  variant = 'toolbar',
  isMulti = false,
  placeholder = 'Select option...',
  searchable,
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rect, setRect] = useState(null);
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);
  const closeTimer = useRef(null);

  const isOpen = open && !closing;
  const isSearchable = searchable !== undefined ? searchable : options.length > 5 || isMulti;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
  }, []);

  const openList = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setClosing(false);
    setOpen(true);
  }, []);

  const closeList = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setClosing(false);
      setOpen(false);
    }, SELECT_EXIT_MS);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      if (isSearchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearch('');
    }
  }, [isOpen, isSearchable]);

  useEffect(() => {
    if (!isOpen) return;
    place();

    const onPointerDown = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (listRef.current && listRef.current.contains(e.target)) return;
      closeList();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeList();
    };
    // Fix: Ignore scroll events coming from inside the dropdown menu list itself
    const onScroll = (e) => {
      if (listRef.current && listRef.current.contains(e.target)) return;
      closeList();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, place, closeList]);

  // Compute label text to show on the trigger button
  let triggerLabel = '';
  if (isMulti) {
    const selectedArr = Array.isArray(value) ? value : [];
    if (selectedArr.length === 0) {
      triggerLabel = placeholder;
    } else if (selectedArr.length === 1) {
      const match = options.find((o) => String(o.value) === String(selectedArr[0]));
      triggerLabel = match ? match.label : `${selectedArr.length} selected`;
    } else {
      triggerLabel = `${selectedArr.length} selected`;
    }
  } else {
    const current =
      options.find((o) => String(o.value ?? '') === String(value ?? '')) || options[0];
    triggerLabel = current?.label || placeholder;
  }

  const filteredOptions = isSearchable && search.trim()
    ? options.filter((opt) =>
        (opt.label || '').toLowerCase().includes(search.toLowerCase().trim())
      )
    : options;

  const handleOptionClick = (optValue) => {
    if (isMulti) {
      const currentArr = Array.isArray(value) ? value : [];
      let newArr;
      if (!optValue) {
        // "Unassigned" option clicked -> reset to empty array
        newArr = [];
      } else {
        const valStr = String(optValue);
        const exists = currentArr.some((v) => String(v) === valStr);
        if (exists) {
          newArr = currentArr.filter((v) => String(v) !== valStr);
        } else {
          newArr = [...currentArr, optValue];
        }
      }
      onChange(newArr);
      // Keep menu open for multi-select so user can pick multiple options smoothly
    } else {
      onChange(optValue);
      closeList();
    }
  };

  const isOptionSelected = (optValue) => {
    if (isMulti) {
      const currentArr = Array.isArray(value) ? value : [];
      if (!optValue) return currentArr.length === 0;
      return currentArr.some((v) => String(v) === String(optValue));
    }
    return String(optValue ?? '') === String(value ?? '');
  };

  const triggerCls =
    variant === 'field'
      ? `flex w-full items-center justify-between gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-body transition-colors duration-150 ${
          isOpen ? 'border-accent-400 text-ink' : 'text-ink hover:border-line'
        } ${FOCUS}`
      : `flex w-full items-center justify-between gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-meta font-semibold transition-colors duration-150 ${
          isOpen ? 'text-ink' : 'text-ink-muted hover:text-ink'
        } ${FOCUS}`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? closeList() : openList())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={triggerCls}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-150 ease-exit ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: Math.max(rect.width, 220),
            }}
            className={`z-[60] flex max-h-72 flex-col origin-top overflow-hidden rounded-control border border-line bg-raised shadow-overlay ${
              closing ? 'pointer-events-none animate-pop-out' : 'animate-pop-in'
            }`}
          >
            {isSearchable && (
              <div className="relative border-b border-line-subtle p-2 bg-surface">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-control border border-line bg-canvas py-1 pl-8 pr-7 text-meta text-ink placeholder:text-ink-faint focus:border-accent-400 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            <ul
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-56 overflow-y-auto overscroll-contain py-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2.5 text-center text-meta text-ink-faint">
                  No options found
                </li>
              ) : (
                filteredOptions.map((opt) => {
                  const selected = isOptionSelected(opt.value);
                  return (
                    <li key={opt.value} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => handleOptionClick(opt.value)}
                        className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-meta transition-colors duration-150 ${
                          selected
                            ? 'bg-accent-soft font-medium text-accent-300'
                            : 'text-ink-muted hover:bg-muted hover:text-ink'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isMulti && (
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                selected
                                  ? 'border-accent-400 bg-accent-500 text-white'
                                  : 'border-line bg-canvas'
                              }`}
                            >
                              {selected && <Check className="h-3 w-3" />}
                            </span>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {!isMulti && selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
