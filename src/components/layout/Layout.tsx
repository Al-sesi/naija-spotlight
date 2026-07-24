import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const standaloneRoutes = new Set(["/verification-success", "/admin", "/ogahouse"]);
  const isStandalone = standaloneRoutes.has(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isStandalone && <Header />}
      <main className={isStandalone ? "min-h-screen" : "flex-1"}>{children}</main>
      {!isStandalone && <Footer />}
    </div>
  );
}
