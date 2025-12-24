import { CheckCircle } from "lucide-react";

export default function VerificationSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Success Icon */}
        <div className="flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-emerald-600/10 flex items-center justify-center animate-fade-up">
            <CheckCircle className="h-14 w-14 text-emerald-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Email Verified Successfully!
          </h1>
          <p className="text-muted-foreground text-lg">
            Your account is now active in the{" "}
            <span className="font-semibold text-emerald-600">NAIJALIFT Beta</span>.
          </p>
        </div>

        {/* Instruction Card */}
        <div 
          className="bg-card border border-border rounded-xl p-6 shadow-sm animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-muted-foreground">
            You can now close this tab and return to the app to log in.
          </p>
        </div>

        {/* Footer Branding */}
        <div className="pt-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <p className="text-sm text-muted-foreground">
            Welcome to <span className="font-semibold">NAIJALIFT</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            First of its kind in Nigeria
          </p>
        </div>
      </div>
    </div>
  );
}
