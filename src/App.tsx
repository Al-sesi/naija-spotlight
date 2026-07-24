import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { VerificationRedirectGuard } from "@/components/auth/VerificationRedirectGuard";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import Index from "./pages/Index";
import Opportunities from "./pages/Opportunities";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import OgaHouse from "./pages/OgaHouse";
import NotFound from "./pages/NotFound";
import VerificationSuccess from "./pages/VerificationSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import PaymentCallback from "./pages/PaymentCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <VerificationRedirectGuard />
          <OnboardingGuard>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/verification-success" element={<VerificationSuccess />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/payment-callback" element={<PaymentCallback />} />
                <Route path="/community" element={<Community />} />
                <Route path="/admin" element={<Navigate to="/ogahouse" replace />} />
                <Route path="/ogahouse" element={<OgaHouse />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </OnboardingGuard>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

