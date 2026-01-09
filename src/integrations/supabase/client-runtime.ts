import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// CRITICAL: Hardcoded correct Supabase project - prevents "snap back" to old project
const CORRECT_PROJECT_ID = "hsubtuxyizwusoizffdv";
const SUPABASE_URL = `https://${CORRECT_PROJECT_ID}.supabase.co`;
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdWJ0dXh5aXp3dXNvaXpmZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDg4MzksImV4cCI6MjA4MTg4NDgzOX0.MQgzWmanNY_w8-jmMHEeldIJdqmsgsjOr66eZ-8FTuI";

// OLD project ID to detect and clear stale sessions
const OLD_PROJECT_ID = "vdliauwtxklhlkltqqua";

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
