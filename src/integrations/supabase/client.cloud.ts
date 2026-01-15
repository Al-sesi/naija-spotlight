import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// NOTE:
// This file exists to force the app to use the env-configured Lovable Cloud backend.
// We intentionally keep the auto-generated `client.ts` untouched.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Throwing here makes the misconfiguration obvious during development.
  throw new Error(
    "Missing backend env vars: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY"
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Force cleanup of old sessions from different projects (prevents cross-project auth issues)
const cleanOldSessions = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("sb-") && SUPABASE_PROJECT_ID && !key.includes(SUPABASE_PROJECT_ID)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
};

cleanOldSessions();
