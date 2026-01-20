import { useState } from "react";
import { Crown, CheckCircle, Sparkles, MessageSquare, Shield, Zap, Mail, Smartphone } from "lucide-react";
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

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const initializePayment = useInitializePayment();
  const [selectedTier, setSelectedTier] = useState<"basic" | "ultra">("basic");

  const handleUpgrade = () => {
    initializePayment.mutate({ planTier: selectedTier });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
            Choose Your Power Plan
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {feature 
              ? `Unlock ${feature} with a premium plan`
              : "Select the plan that fits your ambition"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Basic Plan */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-amber-500/50",
              selectedTier === "basic" 
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" 
                : "border-border bg-card"
            )}
            onClick={() => setSelectedTier("basic")}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">Basic Premium</h3>
              {selectedTier === "basic" && <CheckCircle className="h-5 w-5 text-amber-500" />}
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold">₦197</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-500" />
                <span>Email for All Categories</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span>Verified Badge</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-500" />
                <span>Unlimited Access</span>
              </li>
            </ul>
          </div>

          {/* Ultra Plan */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50",
              selectedTier === "ultra" 
                ? "border-primary bg-primary/5 dark:bg-primary/10" 
                : "border-border bg-card"
            )}
            onClick={() => setSelectedTier("ultra")}
          >
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 text-[10px] uppercase tracking-wider">
              Best Value
            </Badge>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">Ultra Bundle</h3>
              {selectedTier === "ultra" && <CheckCircle className="h-5 w-5 text-primary" />}
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold">₦1,500</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>All Channels for All Categories</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>Email, SMS & WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Priority Delivery</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2 sm:space-y-3 pt-4">
          <Button 
            onClick={handleUpgrade}
            disabled={initializePayment.isPending}
            className={cn(
              "w-full h-11 sm:h-12 text-white font-semibold shadow-lg text-sm sm:text-base",
              selectedTier === "ultra" 
                ? "bg-primary hover:bg-primary/90 shadow-primary/30" 
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/30"
            )}
          >
            {initializePayment.isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Subscribe to ${selectedTier === "basic" ? "Basic" : "Ultra"} - ₦${selectedTier === "basic" ? "197" : "1,500"}`
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. Secure payment by Paystack.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}