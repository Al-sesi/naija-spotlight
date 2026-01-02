import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

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
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    canonical.href = `${siteUrl}/verification-success`;
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md text-center space-y-4">
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Email Verified</h1>

        <p className="text-muted-foreground text-base md:text-lg">
          Your NAIJALIFT account is now active. You may now close this window and log in from the main site.
        </p>
      </section>
    </main>
  );
}
