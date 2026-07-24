import { formatDistanceToNow } from "date-fns";
import { Bell, Bookmark, Zap, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useUserNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationList() {
  const { data: notifications, isLoading } = useUserNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
        <p className="text-muted-foreground">
          We'll let you know when there are new opportunities that match your profile!
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Zap className="h-5 w-5 text-primary" />;
      case "deadline":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "saved":
        return <Bookmark className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`transition-all ${
            !notification.is_read ? "border-primary/50 bg-primary/5" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {!notification.is_read && (
                      <Badge className="h-2 w-2 rounded-full p-0 bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
            {!notification.is_read && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead.mutate(notification.id)}
                  disabled={markAsRead.isPending}
                >
                  Mark as read
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
