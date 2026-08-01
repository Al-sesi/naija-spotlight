import { useState } from "react";
import { Bell, Mail, GraduationCap, Building2, HandCoins, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
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

  const handleToggle = (type: "email", category: string, checked: boolean) => {
    const key = `${type}_${category}` as keyof typeof preferences;
    updatePreferences.mutate({ [key]: checked });
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
        </CardHeader>
        <CardContent className="space-y-6 max-w-full">
          {/* Category Toggles */}
          <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const emailKey = `email_${category.key}` as keyof typeof preferences;
              const emailEnabled = preferences?.[emailKey] ?? false;

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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
