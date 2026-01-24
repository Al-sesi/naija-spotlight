import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Track the install outcome
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('app_installs' as any).insert({
        user_id: user?.id,
        user_agent: window.navigator.userAgent,
        outcome: outcome
      });
    } catch (error) {
      console.error('Error tracking install:', error);
    }

    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#008751] text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between animate-in slide-in-from-bottom-5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white p-0.5 overflow-hidden shrink-0">
            <img src="/logo.jpg" alt="Naijalift Logo" className="h-full w-full object-cover rounded-md" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Naijalift App</p>
          <p className="text-xs text-white/90">For easier access to opportunities</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleInstallClick} 
          className="h-8 px-3 bg-white text-[#008751] hover:bg-white/90 border-0"
        >
          Install
        </Button>
        <button 
          onClick={() => setIsVisible(false)} 
          className="text-white/80 hover:text-white p-1"
          aria-label="Close install banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
