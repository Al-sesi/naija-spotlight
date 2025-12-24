import { Bell, Mail, MessageSquare, GraduationCap, Building2, HandCoins, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useState, useEffect } from "react";

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
    label: "Government Jobs", 
    icon: Building2, 
    description: "Federal & state positions",
    color: "bg-category-government/10 text-category-government"
  },
  { 
    key: "grants", 
    label: "Grants", 
    icon: HandCoins, 
    description: "Business & personal funding",
    color: "bg-category-ngo/10 text-category-ngo"
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
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (preferences?.phone_number) {
      setPhoneNumber(preferences.phone_number);
    }
  }, [preferences]);

  const handleToggle = (type: "email" | "sms", category: string, checked: boolean) => {
    const key = `${type}_${category}` as keyof typeof preferences;
    updatePreferences.mutate({ [key]: checked });
  };

  const handlePhoneUpdate = () => {
    if (phoneNumber !== preferences?.phone_number) {
      updatePreferences.mutate({ phone_number: phoneNumber });
    }
  };

  if (isLoading) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Choose which categories you want to receive alerts for. Toggle on to get notified when new opportunities are posted.
          </CardDescription>
          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-0">
            🎉 Free during Beta Phase!
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number for SMS */}
          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Phone Number (for SMS alerts)
            </Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onBlur={handlePhoneUpdate}
                className="max-w-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter your Nigerian phone number to receive SMS alerts</p>
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
                        </Label>
                        <Switch
                          id={`sms-${category.key}`}
                          checked={!!smsEnabled}
                          onCheckedChange={(checked) => handleToggle("sms", category.key, checked)}
                          disabled={updatePreferences.isPending}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pricing Info */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">💡 Coming Soon: Premium Subscriptions</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• 1 Category: ₦197/month</p>
                <p>• Multiple Categories: ₦197 × Number of categories</p>
                <p>• Yearly: Save 10% on annual plans</p>
              </div>
              <Badge className="mt-3 bg-primary text-primary-foreground">Currently Free for All Beta Users!</Badge>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
