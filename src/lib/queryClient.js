import { QueryClient } from '@tanstack/react-query';

// ─── Singleton QueryClient ────────────────────────────────────────────────────
//
// staleTime  60 s  — data is considered fresh for one minute; navigating back
//                    to a page within that window skips the network entirely.
// gcTime     5 min — cache entry lives for 5 minutes after its last subscriber
//                    unmounts (this was called cacheTime in v4).
// refetchOnWindowFocus false — the app is used in-office on a single screen;
//                    the focus-refetch behaviour adds noise without benefit.
// retry      1     — one automatic retry on failure, then let the ErrorPanel show.
//
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
