import { useState } from "react";
import { Crown, CheckCircle, Sparkles, MessageSquare, Shield, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInitializePayment } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const PREMIUM_FEATURES = [
  { icon: Shield, label: "Verified Badge", description: "Stand out in the community" },
  { icon: MessageSquare, label: "SMS Alerts", description: "Never miss an opportunity" },
  { icon: Zap, label: "Early Access", description: "Get notified before others" },
  { icon: Sparkles, label: "Priority Support", description: "Dedicated help when needed" },
];

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const initializePayment = useInitializePayment();
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("basic");

  const handleUpgrade = () => {
    initializePayment.mutate({
      planType: selectedPlan === "pro" ? "pro" : undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-display">
            Upgrade to Premium Lifter
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {feature 
              ? `Unlock ${feature} and all premium features`
              : "Choose the plan that fits your needs"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Plan Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Basic Plan */}
            <div 
              className={cn(
                "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-amber-300",
                selectedPlan === "basic" 
                  ? "bg-amber-50/50 border-amber-500 dark:bg-amber-950/20" 
                  : "bg-card border-border"
              )}
              onClick={() => setSelectedPlan("basic")}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant={selectedPlan === "basic" ? "default" : "outline"} className={selectedPlan === "basic" ? "bg-amber-500" : ""}>
                  Starter
                </Badge>
                {selectedPlan === "basic" && <CheckCircle className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="text-center py-2">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">₦197</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Perfect for getting started
                </p>
              </div>
            </div>

            {/* Pro Plan */}
            <div 
              className={cn(
                "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-amber-300",
                selectedPlan === "pro" 
                  ? "bg-amber-50/50 border-amber-500 dark:bg-amber-950/20" 
                  : "bg-card border-border"
              )}
              onClick={() => setSelectedPlan("pro")}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant={selectedPlan === "pro" ? "default" : "outline"} className={selectedPlan === "pro" ? "bg-amber-500" : ""}>
                  Pro
                </Badge>
                {selectedPlan === "pro" && <CheckCircle className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="text-center py-2">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">₦1,500</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  For serious growth
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-3 rounded-lg bg-muted/50 border border-border text-center">
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-xs">
              30 Days FREE Trial
            </Badge>
            <p className="text-xs text-muted-foreground pt-2">
              Both plans include a 30-day free trial. First charge after trial ends.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2 sm:space-y-3">
            {PREMIUM_FEATURES.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2 sm:space-y-3 pt-2">
            <Button 
              onClick={handleUpgrade}
              disabled={initializePayment.isPending}
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-amber-500/30 text-sm sm:text-base"
            >
              {initializePayment.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Start Free Trial with {selectedPlan === "basic" ? "Starter" : "Pro"}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="w-full text-sm"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Paystack. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}