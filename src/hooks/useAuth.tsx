import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Safety timeout: If Supabase takes too long (e.g. network hang), force loading to stop after 4 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth check timed out, forcing loading to false");
          return false;
        }
        return prev;
      });
    }, 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(safetyTimeout); // Clear timeout on success
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          checkAdminRole(session.user);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout); // Clear timeout on success
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        checkAdminRole(session.user);
      }
    }).catch((err) => {
      clearTimeout(safetyTimeout); // Clear timeout on error
      console.error("Auth session check failed:", err);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const checkAdminRole = async (authUser: User) => {
    // Fast-path: ensure the specified owner account is always treated as admin
    // even if role rows haven't been copied into the new database yet.
    const email = (authUser.email || "").toLowerCase();
    if (OWNER_EMAILS.includes(email)) {
      setIsAdmin(true);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: normalizeAuthEmailError(error) };
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    // CRITICAL: Always use production URL for email verification links
    const redirectUrl = "https://naijalift.space/verification-success";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          referral_code: referralCode,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    // Send custom welcome email via Resend (non-blocking)
    if (!error) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, fullName }),
      }).catch((emailError) => {
        console.warn("Welcome email failed (non-critical):", emailError);
      });
    }

    return { error: normalizeAuthEmailError(error) };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // CRITICAL: Hardcoded to production URL
    const redirectUrl = "https://naijalift.space/reset-password";
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    return { error: normalizeAuthEmailError(error) };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error: normalizeAuthEmailError(error) };
  };

  const signInWithMagicLink = async (email: string) => {
    // CRITICAL: Hardcoded to production URL
    const redirectUrl = "https://naijalift.space/";
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
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
