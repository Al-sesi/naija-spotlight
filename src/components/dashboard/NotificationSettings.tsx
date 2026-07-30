import { useState } from "react";
import { Bell, Mail, MessageSquare, GraduationCap, Building2, HandCoins, Calendar, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useIsPremium } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useEffect } from "react";

const CATEGORIES = [
  { 
    key: "scholarships", 
    label: "Scholarships", 
    icon: GraduationCap, 
    description: "Educational funding opportunities",
    color: "bg-category-scholarship/10 text-category-scholarship"
  },
  { 
    key: "government", 
    label: "Recruitments", 
    icon: Building2, 
    description: "Job vacancies & recruitment",
    color: "bg-category-government/10 text-category-government"
  },
  { 
    key: "grants", 
    label: "Grants", 
    icon: HandCoins, 
    description: "Business & personal funding",
    color: "bg-category-grant/10 text-category-grant"
  },
  { 
    key: "social_tech", 
    label: "Social/Tech Events", 
    icon: Calendar, 
    description: "Networking & tech gatherings",
    color: "bg-category-tech/10 text-category-tech"
  },
];

export function NotificationSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { isPremium, isLoading: isPremiumLoading } = useIsPremium();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (preferences?.phone_number) {
      setPhoneNumber(preferences.phone_number);
    }
  }, [preferences]);

  const handleToggle = (type: "email" | "sms" | "whatsapp", category: string, checked: boolean) => {
    // If trying to enable SMS/WhatsApp and not premium, show upgrade modal
    if ((type === "sms" || type === "whatsapp") && checked && !isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    
    const key = `${type}_${category}` as keyof typeof preferences;
    updatePreferences.mutate({ [key]: checked });
  };

  const handlePhoneUpdate = () => {
    if (phoneNumber !== preferences?.phone_number) {
      updatePreferences.mutate({ phone_number: phoneNumber });
    }
  };

  if (isLoading || isPremiumLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <Card className="max-w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Notification Preferences</CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            Choose which categories you want to receive alerts for. Toggle on to get notified when new opportunities are posted.
          </CardDescription>
          {isPremium ? (
            <Badge className="w-fit bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 mt-3 mb-1">
              ✨ Premium Lifter
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-0 mt-3 mb-1">
              Free Plan
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6 max-w-full">
          {/* Phone Number for SMS */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 max-w-full">
            {!isPremium && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600 mb-1">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            )}
            <Label htmlFor="phone" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Phone Number (for SMS alerts)
            </Label>
            <div className="flex gap-2 max-w-full">
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onBlur={handlePhoneUpdate}
                className="w-full sm:max-w-xs"
                disabled={!isPremium}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPremium 
                ? "Enter your Nigerian phone number to receive SMS alerts"
                : "Upgrade to Premium to receive SMS alerts for new opportunities"
              }
            </p>
          </div>

          {/* Category Toggles */}
          <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const emailKey = `email_${category.key}` as keyof typeof preferences;
              const smsKey = `sms_${category.key}` as keyof typeof preferences;
              const emailEnabled = preferences?.[emailKey] ?? false;
              const smsEnabled = preferences?.[smsKey] ?? false;

              return (
                <Card key={category.key} className="border-border/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{category.label}</p>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`email-${category.key}`} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email Alerts
                        </Label>
                        <Switch
                          id={`email-${category.key}`}
                          checked={!!emailEnabled}
                          onCheckedChange={(checked) => handleToggle("email", category.key, checked)}
                          disabled={updatePreferences.isPending}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`sms-${category.key}`} className="flex items-center gap-2 text-sm cursor-pointer">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          SMS Alerts
                          {!isPremium && <Lock className="h-3 w-3 text-amber-500" />}
                        </Label>
                        <Switch
                          id={`sms-${category.key}`}
                          checked={isPremium ? !!smsEnabled : false}
                          onCheckedChange={(checked) => handleToggle("sms", category.key, checked)}
                          disabled={updatePreferences.isPending || !isPremium}
                          className={!isPremium ? "opacity-50" : ""}
                        />
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pricing Info - Only show for non-premium users */}
          {!isPremium && (
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">✨ Upgrade to Premium Lifter</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• SMS Alerts for new opportunities</p>
                  <p>• Verified badge on your profile</p>
                  <p>• Priority support & early access</p>
                  <p>• Unlimited applications per month</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                    ₦430/month
                  </Badge>
                  <span className="text-xs text-muted-foreground">• Browse always free • 5 applies/mo free</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature="SMS Alerts"
      />
    </div>
  );
}
