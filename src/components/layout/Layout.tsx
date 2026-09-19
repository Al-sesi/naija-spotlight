import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AdBanner } from "@/components/ads/AdBanner";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/DKZf3TXtrOdHUlwwo3vKST?s=cl&p=a&mlu=4&ilr=4";

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const standaloneRoutes = new Set(["/verification-success", "/admin", "/ogahouse", "/auth", "/forgot-password", "/reset-password"]);
  const isStandalone = standaloneRoutes.has(location.pathname);
  const showStickyAd = !isStandalone;
  const showWhatsAppFab = !isStandalone;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isStandalone && <Header />}
      <main className={cn(
        isStandalone ? "min-h-screen" : "flex-1",
        showStickyAd && "pb-[88px] sm:pb-[96px]"
      )}>
        {children}
      </main>
      {!isStandalone && <Footer />}
      {showStickyAd && (
        <AdBanner slot="sticky-bottom" />
      )}
      {showWhatsAppFab && (
        <a
          href={WHATSAPP_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-3 sm:right-5 z-[60] bottom-[104px] sm:bottom-[116px] flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 hover:bg-[#1ebe5a] hover:scale-110 active:scale-95 transition-all duration-200 group"
          aria-label="Join our WhatsApp Community"
          title="Join our WhatsApp Community"
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping" />
          <MessageCircle className="relative h-6 w-6 sm:h-7 sm:w-7 fill-[#25D366]/20 group-hover:fill-[#1ebe5a]/20" />
        </a>
      )}
    </div>
  );
}
