import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Bookmark, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserApplications, useUpdateApplicationStatus, useRemoveApplication } from "@/hooks/useApplications";
import { APPLICATION_STATUSES, ApplicationStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useUserApplications();
  const updateStatus = useUpdateApplicationStatus();
  const removeApplication = useRemoveApplication();

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold mb-2">Track Your Applications</h2>
        <p className="text-muted-foreground mb-6">Sign in to save and track opportunities you've applied to.</p>
        <Link to="/auth">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">Track the status of opportunities you've saved or applied to.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : !applications?.length ? (
        <Card className="text-center py-12">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No saved opportunities</h3>
          <p className="text-muted-foreground mb-4">Start exploring and save opportunities you're interested in.</p>
          <Link to="/">
            <Button>Browse Opportunities</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Card key={app.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    app.status === "saved" && "border-status-saved text-status-saved",
                    app.status === "applied" && "border-status-applied text-status-applied",
                    app.status === "shortlisted" && "border-status-shortlisted text-status-shortlisted",
                    app.status === "rejected" && "border-status-rejected text-status-rejected"
                  )}>
                    {APPLICATION_STATUSES.find(s => s.value === app.status)?.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeApplication.mutate(app.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-base line-clamp-2">{app.opportunity?.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{app.opportunity?.provider}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.opportunity?.state}
                  {app.opportunity?.deadline && (
                    <span className="ml-auto">Deadline: {format(parseISO(app.opportunity.deadline), "MMM d")}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Select
                    value={app.status}
                    onValueChange={(value) => updateStatus.mutate({ id: app.id, status: value as ApplicationStatus })}
                  >
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {APPLICATION_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" asChild>
                    <a href={app.opportunity?.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
