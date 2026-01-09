import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// CRITICAL: Hardcoded NEW Supabase project credentials - prevents "snap back"
const CORRECT_PROJECT_ID = "vdliauwtxklhlkltqqua";
const SUPABASE_URL = "https://vdliauwtxklhlkltqqua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzI3NTgsImV4cCI6MjA4Mjk0ODc1OH0.OQVOHYxBwOx55jC5wC-8uLYanbs-4cf0IJCBsZ3picQ";

// OLD project ID to detect and clear stale sessions
const OLD_PROJECT_ID = "hsubtuxyizwusoizffdv";

// Clear any localStorage keys from old Supabase project to prevent session conflicts
function clearOldProjectSessions() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(OLD_PROJECT_ID)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log(`[NAIJALIFT] Clearing stale session key: ${key}`);
      localStorage.removeItem(key);
    });
    if (keysToRemove.length > 0) {
      console.log(`[NAIJALIFT] Cleared ${keysToRemove.length} old session keys`);
    }
  } catch (e) {
    console.warn("[NAIJALIFT] Could not clear old sessions:", e);
  }
}

// Run cleanup on module load
clearOldProjectSessions();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
