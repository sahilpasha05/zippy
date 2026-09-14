import { createBrowserClient } from '@supabase/ssr'

// A true singleton, not a factory — every caller gets the SAME client
// instance. Supabase's auto-refresh runs one timer per GoTrueClient; with
// many independent instances (one per component that used to call
// createBrowserClient itself) all refreshing the same rotating refresh
// token concurrently, the loser of that race gets an "Already Used" error
// and the session dies — surfacing as a random logout on page refresh.
// Created eagerly (matching how every call site used to instantiate its
// own client at module scope) so its type is inferred directly from this
// call, same as before — ReturnType<typeof createBrowserClient> resolves
// against the wrong overload and widens every consumer's types to `any`.
const client = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function createClient() {
  return client
}
