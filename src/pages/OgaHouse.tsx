import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Shield, Plus, Link as LinkIcon, Users, MessageSquare, CheckCircle, XCircle, 
  Trash2, ToggleLeft, Home, FileText, Bell, UserCheck, Menu, X,
  Megaphone, ChevronRight, Calendar, Send, Trophy, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useOpportunities, useCreateOpportunity, useDeleteOpportunity, useUpdateOpportunity } from "@/hooks/useOpportunities";
import { usePendingPosts, useApprovePost, useRejectPost, useRegisteredUsers } from "@/hooks/useAdminData";
import { useSiteAlert, useUpdateSiteAlert } from "@/hooks/useSiteAlert";
import { NIGERIAN_STATES, OPPORTUNITY_TYPES, OpportunityType } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { ReferralStatsTable } from "@/components/admin/ReferralStatsTable";

const ADMIN_EMAILS = ["abdulmajeedsesiadam@gmail.com", "naijalift01@gmail.com"];

interface OpportunityFormState {
  title: string;
  provider: string;
  category: OpportunityType | "";
  description: string;
  link: string;
  deadline: string;
  event_date: string;
  state: string;
  is_verified: boolean;
  is_remote: boolean;
  level: string;
}

interface BroadcastFormState {
  subject: string;
  message: string;
  audience: "all" | "premium" | "free" | "admin";
}

interface SiteAlertFormState {
  message: string;
  is_active: boolean;
  type: "info" | "warning" | "success";
}

interface AdminOpportunity {
  id: string;
  title: string;
  category: string;
  deadline: string | null;
  is_verified: boolean | null;
}

interface AdminPost {
  id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

type Section = "dashboard" | "add" | "manage" | "posts" | "users" | "team" | "alerts" | "broadcast" | "referrals" | "installs";

const sidebarItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "add", label: "Add Opportunity", icon: Plus },
  { id: "manage", label: "Manage Opps", icon: FileText },
  { id: "posts", label: "Review Posts", icon: MessageSquare },
  { id: "users", label: "Users", icon: Users },
  { id: "team", label: "Team (Lifters)", icon: UserCheck },
  { id: "referrals", label: "Ambassadors", icon: Trophy },
  { id: "installs", label: "App Installs", icon: Download },
  { id: "alerts", label: "Site Alerts", icon: Megaphone },
  { id: "broadcast", label: "Broadcast", icon: Send },
];

export default function OgaHouse() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { data: opportunities } = useOpportunities({ types: [], states: [], search: "" });
  const createOpportunity = useCreateOpportunity();
  const deleteOpportunity = useDeleteOpportunity();
  const updateOpportunity = useUpdateOpportunity();
  const { data: pendingPosts, isLoading: postsLoading } = usePendingPosts();
  const approvePost = useApprovePost();
  const rejectPost = useRejectPost();
  const { data: users, isLoading: usersLoading } = useRegisteredUsers();
  const { data: siteAlert } = useSiteAlert();
  const updateSiteAlert = useUpdateSiteAlert();

  const [form, setForm] = useState({
    title: "",
    provider: "",
    category: "" as OpportunityType | "",
    description: "",
    link: "",
    deadline: "",
    event_date: "",
    state: "Nationwide",
    is_verified: true,
    is_remote: false,
    level: "",
  });

  const [alertForm, setAlertForm] = useState({
    message: "",
    is_active: false,
    type: "info" as "info" | "warning" | "success",
  });

  const [broadcastForm, setBroadcastForm] = useState<BroadcastFormState>({
    subject: "",
    message: "",
    audience: "all",
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: typeof broadcastForm) => {
      const { data: result, error } = await supabase.functions.invoke("send-broadcast", {
        body: data,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(`Broadcast failed: ${data.error || "Unknown error"}`);
        return;
      }

      if (data.stats.failed > 0) {
        const errorMsg = data.stats.errors && data.stats.errors.length > 0 
           ? `First error: ${data.stats.errors[0]}`
           : "Check logs for details.";
        toast.warning(`Partial success. Sent: ${data.stats.success}, Failed: ${data.stats.failed}. ${errorMsg}`, { duration: 10000 });
      } else {
        toast.success(`Broadcast sent! Success: ${data.stats.success}, Failed: ${data.stats.failed}`);
      }
      setBroadcastForm({ subject: "", message: "", audience: "all" });
    },
    onError: (error) => {
      toast.error(`Failed to send broadcast: ${error.message}`);
    },
  });

  useEffect(() => {
    if (siteAlert) {
      setAlertForm({
        message: siteAlert.message || "",
        is_active: siteAlert.is_active || false,
        type: siteAlert.type || "info",
      });
    }
  }, [siteAlert]);

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse text-lg">Loading OgaHouse...</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Access control - redirect if not the admin email
  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    navigate("/", { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Access denied. Redirecting...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.provider || !form.category || !form.link || !form.deadline) {
      toast.error("Please fill in all required fields including deadline");
      return;
    }

    try {
      await createOpportunity.mutateAsync({
        title: form.title,
        provider: form.provider,
        category: form.category as OpportunityType,
        description: form.description || null,
        link: form.link,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
        state: form.state,
        is_verified: true, // Admin posts are always verified
        is_remote: form.is_remote,
        level: form.level || null,
      });
      toast.success("Opportunity added successfully!");
      setForm({
        title: "", provider: "", category: "", description: "", link: "",
        deadline: "", event_date: "", state: "Nationwide", is_verified: true, is_remote: false, level: "",
      });
    } catch {
      toast.error("Failed to add opportunity");
    }
  };

  const handleExtendDeadline = async (id: string, currentDeadline: string | null) => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):", currentDeadline ? currentDeadline.split('T')[0] : '');
    if (!newDeadline) return;
    
    // Validate the date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      toast.error("Invalid date format. Please use YYYY-MM-DD");
      return;
    }

    try {
      await updateOpportunity.mutateAsync({ id, deadline: new Date(newDeadline).toISOString() });
      toast.success("Deadline extended successfully!");
    } catch {
      toast.error("Failed to extend deadline");
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;
    try {
      await deleteOpportunity.mutateAsync(id);
      toast.success("Opportunity deleted");
    } catch {
      toast.error("Failed to delete opportunity");
    }
  };

  const handleToggleVerified = async (id: string, currentStatus: boolean) => {
    try {
      await updateOpportunity.mutateAsync({ id, is_verified: !currentStatus });
      toast.success(`Opportunity ${!currentStatus ? "verified" : "unverified"}`);
    } catch {
      toast.error("Failed to update opportunity");
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      await approvePost.mutateAsync(postId);
      toast.success("Post approved and is now live!");
    } catch {
      toast.error("Failed to approve post");
    }
  };

  const handleRejectPost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await rejectPost.mutateAsync(postId);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const handleUpdateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSiteAlert.mutateAsync(alertForm);
      toast.success("Site alert updated!");
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview 
          opportunitiesCount={opportunities?.length || 0}
          pendingPostsCount={pendingPosts?.length || 0}
          usersCount={users?.length || 0}
          onNavigate={setActiveSection}
        />;
      case "add":
        return <AddOpportunityForm form={form} setForm={setForm} onSubmit={handleSubmit} isLoading={createOpportunity.isPending} />;
      case "manage":
        return <ManageOpportunities 
          opportunities={opportunities || []} 
          onDelete={handleDeleteOpportunity} 
          onToggleVerified={handleToggleVerified}
          onExtendDeadline={handleExtendDeadline}
        />;
      case "posts":
        return <ReviewPosts 
          posts={pendingPosts || []} 
          isLoading={postsLoading} 
          onApprove={handleApprovePost} 
          onReject={handleRejectPost}
          approvePending={approvePost.isPending}
          rejectPending={rejectPost.isPending}
        />;
      case "users":
        return <UserManagement users={users || []} isLoading={usersLoading} />;
      case "team":
        return <TeamManagement />;
      case "alerts":
        return <SiteAlerts form={alertForm} setForm={setAlertForm} onSubmit={handleUpdateAlert} isLoading={updateSiteAlert.isPending} />;
      case "broadcast":
        return <BroadcastMessage 
          form={broadcastForm} 
          setForm={setBroadcastForm} 
          onSubmit={(e) => { e.preventDefault(); broadcastMutation.mutate(broadcastForm); }} 
          isLoading={broadcastMutation.isPending} 
        />;
      case "referrals":
        return <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ambassador Performance</h2>
          <ReferralStatsTable />
        </div>;
      case "installs":
        return <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">App Installations</h2>
          <AppInstallsTable />
        </div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-emerald-600 text-white flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span className="font-display font-bold">OgaHouse</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-emerald-600 text-white transition-all duration-300 z-40",
          sidebarOpen ? "w-64" : "w-0 lg:w-16",
          "lg:top-0 pt-14 lg:pt-0"
        )}>
          <div className="p-4 border-b border-emerald-500 hidden lg:flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-display font-bold">OgaHouse</h1>
                <p className="text-xs text-emerald-200">Admin Portal</p>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <nav className="p-2 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                    activeSection === item.id
                      ? "bg-white/20 text-white font-medium"
                      : "text-emerald-100 hover:bg-white/10"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.id === "posts" && pendingPosts && pendingPosts.length > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">{pendingPosts.length}</Badge>
                      )}
                    </>
                  )}
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Toggle button for desktop */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 rounded-full bg-emerald-600 border-2 border-white items-center justify-center hover:bg-emerald-700"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", sidebarOpen && "rotate-180")} />
          </button>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          "pt-14 lg:pt-0",
          sidebarOpen ? "lg:ml-0" : "lg:ml-0"
        )}>
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>

          {/* Footer */}
          <footer className="p-4 text-center text-sm text-muted-foreground border-t space-y-1">
            <p>ALL RIGHTS RESERVED. NAIJALIFT.</p>
            <p className="text-xs">
              For advertising or sponsored listings, contact naijalift01@gmail.com or call 09070899927.
            </p>
          </footer>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Broadcast Message Component
function BroadcastMessage({
  form,
  setForm,
  onSubmit,
  isLoading
}: {
  form: BroadcastFormState;
  setForm: (f: BroadcastFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // Reset local submitting state when parent loading state finishes
  useEffect(() => {
    if (!isLoading) {
      setLocalSubmitting(false);
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || localSubmitting) return; // Prevent double submission
    setLocalSubmitting(true);
    onSubmit(e);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-emerald-600" />
          Broadcast Message
        </CardTitle>
        <CardDescription>Send an email to all registered users or specific groups.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audience">Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
              <SelectTrigger id="audience" className="bg-background">
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="premium">Premium Users</SelectItem>
                  <SelectItem value="free">Free Users</SelectItem>
                  <SelectItem value="admin">Test (Admins Only)</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              value={form.subject} 
              onChange={(e) => setForm({ ...form, subject: e.target.value })} 
              placeholder="e.g. Important Update from NaijaLift"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message" 
              value={form.message} 
              onChange={(e) => setForm({ ...form, message: e.target.value })} 
              placeholder="Type your message here..." 
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Note: This will be sent as an email. Line breaks will be preserved.
            </p>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading || localSubmitting}>
            {isLoading || localSubmitting ? "Sending Broadcast..." : "Send Broadcast"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Dashboard Overview Component
function DashboardOverview({ 
  opportunitiesCount, 
  pendingPostsCount, 
  usersCount,
  onNavigate 
}: { 
  opportunitiesCount: number; 
  pendingPostsCount: number; 
  usersCount: number;
  onNavigate: (section: Section) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Welcome, Oga!</h2>
        <p className="text-muted-foreground">Here's what's happening with NAIJALIFT today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("manage")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold text-foreground">{opportunitiesCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("posts")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-amber-500" />
              <span className="text-3xl font-bold text-foreground">{pendingPostsCount}</span>
              {pendingPostsCount > 0 && (
                <Badge variant="destructive" className="ml-auto">Needs Review</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("users")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-bold text-foreground">{usersCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => onNavigate("add")} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
          <Button variant="outline" onClick={() => onNavigate("posts")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Review Posts
          </Button>
          <Button variant="outline" onClick={() => onNavigate("alerts")}>
            <Megaphone className="h-4 w-4 mr-2" />
            Update Alert
          </Button>
          <Button variant="outline" onClick={() => onNavigate("team")}>
            <UserCheck className="h-4 w-4 mr-2" />
            Manage Team
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Add Opportunity Form Component
function AddOpportunityForm({ 
  form, 
  setForm, 
  onSubmit, 
  isLoading 
}: { 
  form: OpportunityFormState; 
  setForm: (f: OpportunityFormState) => void; 
  onSubmit: (e: React.FormEvent) => void; 
  isLoading: boolean;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-emerald-600" />
          Add New Opportunity
        </CardTitle>
        <CardDescription>All opportunities created here will be automatically verified.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. NPF Recruitment 2025" required className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-sm">Provider *</Label>
              <Input id="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Federal Government" required className="text-sm" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as OpportunityType })}>
                <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {OPPORTUNITY_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">State</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger className="bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover max-h-[200px]">
                  {NIGERIAN_STATES.filter(s => s !== "All States").map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.category === "scholarship" && (
            <div className="space-y-2">
              <Label htmlFor="level" className="text-sm">Level (e.g., Undergraduate, Masters, PhD)</Label>
              <Input id="level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="e.g. Masters, PhD" className="text-sm" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="link" className="text-sm">Application Link *</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="link" className="pl-10 text-sm" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." className="text-sm" rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-sm">Deadline *</Label>
              <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="text-sm" required />
              <p className="text-xs text-muted-foreground">Required. Opportunities expire 7 days after deadline.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date" className="text-sm">Event Date</Label>
              <Input id="event_date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch id="remote" checked={form.is_remote} onCheckedChange={(c) => setForm({ ...form, is_remote: c })} />
              <Label htmlFor="remote" className="text-sm">Remote</Label>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Auto-Verified
            </Badge>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Opportunity"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Manage Opportunities Component
function ManageOpportunities({ 
  opportunities, 
  onDelete, 
  onToggleVerified,
  onExtendDeadline
}: { 
  opportunities: AdminOpportunity[]; 
  onDelete: (id: string) => void; 
  onToggleVerified: (id: string, current: boolean) => void;
  onExtendDeadline: (id: string, currentDeadline: string | null) => void;
}) {
  const now = new Date();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Manage Opportunities</CardTitle>
        <CardDescription>Edit or delete existing opportunities ({opportunities.length} total)</CardDescription>
      </CardHeader>
      <CardContent>
        {!opportunities.length ? (
          <p className="text-muted-foreground text-center py-8">No opportunities found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp) => {
                  const deadline = opp.deadline ? new Date(opp.deadline) : null;
                  const isExpired = deadline ? deadline < now : false;
                  
                  return (
                    <TableRow key={opp.id} className={isExpired ? "opacity-60" : ""}>
                      <TableCell className="font-medium max-w-[200px] truncate">{opp.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{opp.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {deadline ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{format(deadline, "MMM d, yyyy")}</span>
                            {isExpired && (
                              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Expired</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No deadline</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={opp.is_verified ? "default" : "secondary"} className={opp.is_verified ? "bg-emerald-600" : ""}>
                          {opp.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onExtendDeadline(opp.id, opp.deadline)}
                          title="Extend Deadline"
                          className="text-xs"
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Extend
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleVerified(opp.id, !!opp.is_verified)}
                          title={opp.is_verified ? "Unverify" : "Verify"}
                        >
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(opp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Review Posts Component
function ReviewPosts({ 
  posts, 
  isLoading, 
  onApprove, 
  onReject,
  approvePending,
  rejectPending
}: { 
  posts: AdminPost[]; 
  isLoading: boolean; 
  onApprove: (id: string) => void; 
  onReject: (id: string) => void;
  approvePending: boolean;
  rejectPending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          Review Community Posts
        </CardTitle>
        <CardDescription>Approve or reject pending community posts</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !posts.length ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
            <p className="text-muted-foreground">No pending posts to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      {(post.profile?.full_name?.[0] || post.profile?.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{post.profile?.full_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-4 bg-muted/50 p-3 rounded">{post.content}</p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onReject(post.id)}
                    disabled={rejectPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onApprove(post.id)}
                    disabled={approvePending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// User Management Component
function UserManagement({ users, isLoading }: { users: AdminUser[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Registered Users
        </CardTitle>
        <CardDescription>{users.length} users registered</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-12 bg-muted rounded" />
            ))}
          </div>
        ) : !users.length ? (
          <p className="text-muted-foreground text-center py-8">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                            {(u.full_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {u.full_name || "No Name"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Team Management Component
function TeamManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-emerald-600" />
          Team Management (Lifters)
        </CardTitle>
        <CardDescription>Manage staff badges and team roles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <UserCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This section will allow you to view Tally form applications and grant 'Staff' badges to team members. 
            For now, manage team roles directly in the database.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Site Alerts Component
function SiteAlerts({ 
  form, 
  setForm, 
  onSubmit, 
  isLoading 
}: { 
  form: SiteAlertFormState; 
  setForm: (f: SiteAlertFormState) => void; 
  onSubmit: (e: React.FormEvent) => void; 
  isLoading: boolean;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          Site-Wide Alert Banner
        </CardTitle>
        <CardDescription>Update the home page alert message</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alertMessage">Alert Message</Label>
            <Textarea 
              id="alertMessage"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="e.g. 🎉 Welcome to NAIJALIFT Beta! Enjoy free access to all features during our pilot phase."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Alert Type</Label>
            <Select value={form.type} onValueChange={(v: "info" | "warning" | "success") => setForm({ ...form, type: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="info">Info (Blue)</SelectItem>
                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                <SelectItem value="success">Success (Green)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Switch 
              id="alertActive" 
              checked={form.is_active} 
              onCheckedChange={(c) => setForm({ ...form, is_active: c })} 
            />
            <Label htmlFor="alertActive" className="flex-1">
              <span className="font-medium">Show Alert on Homepage</span>
              <p className="text-sm text-muted-foreground">Toggle to display or hide the alert banner</p>
            </Label>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Alert"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
