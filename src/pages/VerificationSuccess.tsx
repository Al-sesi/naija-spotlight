import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerificationSuccess() {
  useEffect(() => {
    const title = "Email Verified | NAIJALIFT";
    const description =
      "Your NAIJALIFT account is now active. You may now close this window and log in from the main site.";

    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://naijalift.vercel.app/verification-success";
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 sm:h-14 sm:w-14 text-primary" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground">
          Email Verified!
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
          Your NAIJALIFT account is now active. Please return to the login page to access your account.
        </p>

        <Button asChild size="lg" className="w-full max-w-xs mx-auto">
          <Link to="/auth">Back to Login</Link>
        </Button>

        <p className="text-xs text-muted-foreground pt-4">
          ALL RIGHTS RESERVED. NAIJALIFT.
        </p>
      </section>
    </main>
  );
}
