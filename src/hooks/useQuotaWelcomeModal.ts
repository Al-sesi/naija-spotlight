import { useEffect, useRef, useState } from "react";
import type { MonthlyQuota } from "@/hooks/useMonthlyQuota";
import { useInitializePayment } from "@/hooks/useSubscription";

const LOGIN_SESSION_KEY = "quota-modal-session-v1";
const WELCOME_SEEN_KEY = "quota-welcome-seen-v1";

interface UseQuotaWelcomeModalReturn {
  modalOpen: boolean;
  onModalChange: (open: boolean) => void;
  onUpgrade: () => void;
}

/**
 * Handles showing the quota welcome / reminder / exceeded modal:
 *
 *  - First login EVER → "welcome" mode (explains the 5 apps/month rule).
 *  - Each subsequent successful login/session → "reminder" mode (shows remaining apps).
 *  - If quota exhausted at any time → "exceeded" mode (hard upsell).
 *  - Premium users → never shown.
 *
 * Fires once per browser session (login) by tracking a short-lived sessionStorage flag.
 */
export function useQuotaWelcomeModal(
  quota: MonthlyQuota | null | undefined,
  isPremium: boolean
): UseQuotaWelcomeModalReturn {
  const [modalOpen, setModalOpen] = useState(false);
  const initializePayment = useInitializePayment();
  const hasFiredRef = useRef(false);

  // Decide whether to auto-show the modal, but only once per session/mount window.
  useEffect(() => {
    if (hasFiredRef.current) return;
    if (isPremium) return;
    if (quota === null || quota === undefined) return;

    const isFirstTimeUser =
      typeof window !== "undefined" &&
      window.localStorage.getItem(WELCOME_SEEN_KEY) !== "1";

    const sessionKey = typeof window !== "undefined"
      ? window.sessionStorage.getItem(LOGIN_SESSION_KEY)
      : null;

    if (sessionKey === "shown" && !quota.isQuotaExceeded) {
      // Already reminded this browser session — don't nag again unless exceeded
      hasFiredRef.current = true;
      return;
    }

    // For exceeded quota, always pop it
    if (quota.isQuotaExceeded) {
      // But don't annoy by re-popping every render, use ref
      if (!sessionKey || sessionKey !== "exceeded-shown-session") {
        setModalOpen(true);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(LOGIN_SESSION_KEY, "exceeded-shown-session");
        }
        hasFiredRef.current = true;
        return;
      }
      hasFiredRef.current = true;
      return;
    }

    // First-time user welcome
    if (isFirstTimeUser) {
      setModalOpen(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(LOGIN_SESSION_KEY, "shown");
      }
      hasFiredRef.current = true;
      return;
    }

    // Regular reminder (once per login session)
    if (!sessionKey) {
      setModalOpen(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(LOGIN_SESSION_KEY, "shown");
      }
      hasFiredRef.current = true;
    }
  }, [quota, isPremium]);

  const onUpgrade = () => {
    initializePayment.mutate({});
  };

  return {
    modalOpen,
    onModalChange: setModalOpen,
    onUpgrade,
  };
}
