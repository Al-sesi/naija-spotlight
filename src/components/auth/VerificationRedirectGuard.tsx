import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Forces email verification callbacks (type=signup) to stay on /verification-success.
 * This prevents accidental landing on /dashboard or /auth if an old email link or backend setting points there.
 */
export function VerificationRedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const signal = `${location.search}${location.hash}`.toLowerCase();
    const hasToken = signal.includes("token=") || signal.includes("token_hash=");
    const isEmailVerification =
      signal.includes("type=signup") ||
      signal.includes("type=email") ||
      signal.includes("type=magiclink");

    if (!hasToken || !isEmailVerification) return;
    if (location.pathname === "/verification-success") return;

    navigate(
      {
        pathname: "/verification-success",
        search: location.search,
        hash: location.hash,
      },
      { replace: true }
    );
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
