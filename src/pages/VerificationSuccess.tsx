import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerificationSuccess() {
  useEffect(() => {
    const title = "Email Verified | NAIJALIFT";
    const description =
      "Email Verified! Your account is now active. Please return to the login page to access your account.";

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
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Email Verified!
          </h1>
          <p className="text-muted-foreground text-base md:text-lg px-4">
            Your account is now active. Please return to the login page to access your account.
          </p>
        </div>

        <div className="pt-4">
          <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
            <Link to="/auth">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
