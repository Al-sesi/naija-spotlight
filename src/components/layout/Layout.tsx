import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AdBanner } from "@/components/ads/AdBanner";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const standaloneRoutes = new Set(["/verification-success", "/admin", "/ogahouse", "/auth", "/forgot-password", "/reset-password"]);
  const isStandalone = standaloneRoutes.has(location.pathname);
  const showStickyAd = !isStandalone;

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
    </div>
  );
}
