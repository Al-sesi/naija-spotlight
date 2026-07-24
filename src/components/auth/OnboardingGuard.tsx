import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking onboarding status:", error);
        }

        const onboardingCompleted = data?.onboarding_completed === true;

        if (!onboardingCompleted) {
          setNeedsOnboarding(true);
          if (location.pathname !== "/onboarding") {
            navigate("/onboarding");
          }
        } else {
          setNeedsOnboarding(false);
          if (location.pathname === "/onboarding") {
            navigate("/dashboard");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    if (!authLoading) {
      checkOnboarding();
    }
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
