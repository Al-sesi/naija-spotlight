import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isStandalone = location.pathname === "/verification-success";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isStandalone && <Header />}
      <main className={isStandalone ? "min-h-screen" : "flex-1"}>{children}</main>
      {!isStandalone && <Footer />}
    </div>
  );
}
