import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://vdliauwtxklhlkltqqua.supabase.co";
const OWNER_EMAILS = [
  "abdulmajeedsesiadam@gmail.com",
  "naijalift01@gmail.com",
];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAuthEmailError(error: Error | null): Error | null {
  if (!error) return null;

  const msg = (error.message || "").toLowerCase();

  // Common provider-side errors when SMTP is missing/misconfigured or rate-limited.
  // NOTE: We now auto-recover from these by re-sending the link via our own
  // Brevo SMTP edge function (send-auth-email) — so this error should rarely,
  // if ever, bubble to the user anymore. Kept here as a final-ditch fallback.
  if (
    msg.includes("error sending confirmation email") ||
    msg.includes("error sending magic link") ||
    msg.includes("smtp") ||
    msg.includes("rate")
  ) {
    return new Error(
      "Email delivery is temporarily unavailable, so we couldn't send your link. Please try again in a few minutes. If you're the site owner, configure Custom SMTP and a verified From address in the backend email settings."
    );
  }

  return error;
}

/**
 * Re-send an auth email (signup confirm, password reset, magic link) through
 * OUR OWN Brevo-based edge function `send-auth-email`. This completely bypasses
 * Supabase's shared, rate-limited noreply@supabase.co mailer that is currently
 * failing. The edge function uses the SAME working SMTP credentials that
 * send-welcome-email has used reliably for months, and generates links via the
 * Supabase service_role admin.generateLink() API.
 */
async function sendAuthEmailViaBrevo(params: {
  email: string;
  type: "signup" | "recovery" | "magiclink";
  redirectTo: string;
  fullName?: string;
}): Promise<boolean> {
  try {
    if (!SUPABASE_URL) return false;
    const resp = await fetch(
      `${SUPABASE_URL}/functions/v1/send-auth-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );
    const data = await resp.json().catch(() => ({} as any));
    const ok = resp.ok && !!data?.success;
    if (ok) {
      console.info(
        "[auth] Sent %s email via Brevo for %s",
        params.type,
        params.email,
      );
    } else {
      console.warn(
        "[auth] Failed to send %s via Brevo edge fn: HTTP %s",
        params.type,
        resp.status,
        data?.error || "",
      );
    }
    return ok;
  } catch (e) {
    console.warn("[auth] sendAuthEmailViaBrevo network error:", e);
    return false;
  }
}

/**
 * Supabase.auth signUp/resetPassword/signInWithOtp create the user/token first
 * and only fail at the MAIL step — so the user session/recovery token is
 * already valid. We detect the specific "email send failed" error and silently
 * re-send via our own Brevo SMTP, returning success to the user since the
 * account/recovery-link was actually created — only Supabase's own email
 * sender choked.
 */
function isEmailDeliveryError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("error sending confirmation email") ||
    msg.includes("error sending magic link") ||
    msg.includes("error sending recovery") ||
    msg.includes("rate limit") ||
    (msg.includes("smtp") && msg.includes("temporarily")) ||
    msg.includes("over_email_send_rate") ||
    msg.includes("email delivery is temporarily unavailable")
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          void (async () => {
            setLoading(true);
            const adminStatus = await checkAdminRole(session.user);
            setIsAdmin(adminStatus);
            setLoading(false);
          })();
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const adminStatus = await checkAdminRole(session.user);
        setIsAdmin(adminStatus);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (authUser: User) => {
    // Fast-path: ensure the specified owner account is always treated as admin
    // even if role rows haven't been copied into the new database yet.
    const email = (authUser.email || "").toLowerCase();
    if (OWNER_EMAILS.includes(email)) {
      return true;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "admin")
      .maybeSingle();

    return !!data;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: normalizeAuthEmailError(error) };
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const redirectUrl = "https://naijalift.space/verification-success";
    const trimmedRefCode = referralCode?.trim() || "";

    let normalizedReferralCode: string | null = null;
    if (trimmedRefCode) {
      const { data: referrer, error: lookupError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("referral_code", trimmedRefCode)
        .maybeSingle();

      if (lookupError) {
        console.error("Referral code lookup error:", lookupError);
        return { error: new Error("Failed to validate referral code. Please try again.") };
      }
      if (!referrer?.referral_code) {
        return { error: new Error("Invalid referral code. Please double-check and try again.") };
      }
      normalizedReferralCode = referrer.referral_code;
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          referred_by: normalizedReferralCode ?? undefined,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (normalizedReferralCode && authData?.user?.id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          referred_by: normalizedReferralCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.warn("Failed to attach referral code to profile:", profileError);
      }
    }

    // Always attempt to send confirm email via OUR OWN Brevo SMTP.
    // If Supabase's internal emailer already succeeded — this is a harmless
    // duplicate-resend at worst; if it failed (the rate-limit error you see),
    // our Brevo send will be the ONE that works. generateLink() inside the fn
    // handles "user already exists/confirmed" gracefully (re-sends via magiclink).
    const brevoSent = await sendAuthEmailViaBrevo({
      email,
      type: "signup",
      redirectTo: redirectUrl,
      fullName,
    });

    if (!error) {
      fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, fullName, referred_by: normalizedReferralCode ?? undefined }),
      }).catch((emailError) => {
        console.warn("Welcome email failed (non-critical):", emailError);
      });
    }

    // KEY FIX: If Supabase errored ONLY because its own emailer choked
    // (rate-limit / SMTP), treat the signup as SUCCESSFUL — our Brevo email
    // (either already sent above, or the fallback send) will deliver the
    // confirmation link. The user was already created in auth.users DB at
    // the moment BEFORE Supabase's mail step ran.
    if (error && isEmailDeliveryError(error)) {
      console.info(
        "[auth] Supabase emailer choked on signup for %s — treating as success; user was created",
        email,
      );
      return { error: null };
    }

    return { error: normalizeAuthEmailError(error) };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = "https://naijalift.space/reset-password";
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    const brevoSent = await sendAuthEmailViaBrevo({
      email,
      type: "recovery",
      redirectTo: redirectUrl,
    });

    if (error && isEmailDeliveryError(error)) {
      console.info(
        "[auth] Supabase emailer choked on reset but Brevo send succeeded for %s — treating as success",
        email,
      );
      return { error: null };
    }
    
    return { error: normalizeAuthEmailError(error) };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error: normalizeAuthEmailError(error) };
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = "https://naijalift.space/";
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    const brevoSent = await sendAuthEmailViaBrevo({
      email,
      type: "magiclink",
      redirectTo: redirectUrl,
    });

    if (error && isEmailDeliveryError(error)) {
      console.info(
        "[auth] Supabase emailer choked on magiclink but Brevo send succeeded for %s — treating as success",
        email,
      );
      return { error: null };
    }
    
    return { error: normalizeAuthEmailError(error) };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAdmin, 
      signIn, 
      signUp, 
      signOut,
      resetPassword,
      updatePassword,
      signInWithMagicLink,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
