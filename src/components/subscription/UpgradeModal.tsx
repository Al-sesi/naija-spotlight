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

  const handleUpgrade = () => {
    initializePayment.mutate({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-display">
            Upgrade to Premium Lifter
          </DialogTitle>
          <DialogDescription className="text-base">
            {feature 
              ? `Unlock ${feature} and all premium features`
              : "Get the most out of NAIJALIFT"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Card */}
          <div className="relative p-6 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
              30 Days FREE Trial
            </Badge>
            <div className="text-center pt-2">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">₦197</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                First charge after trial ends
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {PREMIUM_FEATURES.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleUpgrade}
              disabled={initializePayment.isPending}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-amber-500/30"
            >
              {initializePayment.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Start Free Trial
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="w-full"
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