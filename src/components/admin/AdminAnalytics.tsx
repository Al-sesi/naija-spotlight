import { BarChart3, TrendingUp, Bell, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRecommendationAnalytics } from "@/hooks/useAdminAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function AdminAnalytics() {
  const { data: analytics, isLoading } = useRecommendationAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Total Matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalMatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              User Events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Notifications Sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalNotifications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Engagement Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalEvents && analytics?.totalMatches
                ? `${Math.min(100, Math.round((analytics.totalEvents / analytics.totalMatches) * 100))}%`
                : "0%"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Opportunities</CardTitle>
          <CardDescription>Most engaged opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.topOpportunities?.length ? (
              analytics.topOpportunities.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Badge className="h-6 w-6 flex items-center justify-center">{idx + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {item?.opportunities?.[0]?.title || "Opportunity"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item?.opportunities?.[0]?.provider || "—"} • {item?.opportunities?.[0]?.category || "—"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{item?.type}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No data available yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
