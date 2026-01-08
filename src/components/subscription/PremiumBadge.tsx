import { Crown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsPremium } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  showTooltip?: boolean;
  variant?: "badge" | "icon" | "verified";
}

export function PremiumBadge({ className, showTooltip = true, variant = "badge" }: PremiumBadgeProps) {
  const { isPremium, isLoading } = useIsPremium();

  if (isLoading || !isPremium) return null;

  const badge = (() => {
    switch (variant) {
      case "icon":
        return (
          <Crown className={cn("h-4 w-4 text-amber-500", className)} />
        );
      case "verified":
        return (
          <div className={cn("flex items-center gap-1", className)}>
            <CheckCircle className="h-4 w-4 text-green-500 fill-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Verified</span>
          </div>
        );
      default:
        return (
          <Badge className={cn("bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1", className)}>
            <Crown className="h-3 w-3" />
            Premium
          </Badge>
        );
    }
  })();

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p>Premium Lifter Member</p>
      </TooltipContent>
    </Tooltip>
  );
}