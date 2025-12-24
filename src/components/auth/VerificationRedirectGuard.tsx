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
    const signal = `${location.search}${location.hash}`;
    const isSignupVerification = signal.includes("type=signup");

    if (!isSignupVerification) return;
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
