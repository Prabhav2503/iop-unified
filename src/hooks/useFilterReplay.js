import { useState, useCallback } from 'react';

// ─── Filter feedback ────────────────────────────────────────────────────────
//
// A discrete filter click — a tab, a pill, a segment, a status dropdown — is a
// deliberate action, and it should be acknowledged whether or not the result
// happens to differ. Left to React alone it would not be: if the visible set is
// unchanged the DOM nodes are reused, no element mounts, and nothing animates,
// so the same click reads as responsive in one state and dead in another.
//
// Bumping this counter and using it as the `key` on the results region forces a
// remount, which replays the load-in.
//
//   const [listReplayKey, replayList] = useFilterReplay();
//   ...
//   <PillFilter onChange={(v) => { setFilter(v); replayList(); }} ... />
//   <div key={listReplayKey}>{ loading ? ... : <div className="stagger-in">…}</div>
//
// Wire it to discrete controls ONLY — never to search-as-you-type, where
// re-animating the list on every keystroke is noise rather than feedback.
//
// It lives in its own module rather than in components/ui.jsx because that file
// may only export components: a bare hook there breaks React Fast Refresh.
export function useFilterReplay() {
  const [replayKey, setReplayKey] = useState(0);
  const replay = useCallback(() => setReplayKey((n) => n + 1), []);
  return [replayKey, replay];
}
