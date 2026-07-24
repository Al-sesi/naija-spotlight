import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Shield, Plus, Link as LinkIcon, Users, MessageSquare, CheckCircle, XCircle, Trash2, Edit, ToggleLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOpportunities, useCreateOpportunity, useDeleteOpportunity, useUpdateOpportunity } from "@/hooks/useOpportunities";
import { usePendingPosts, useApprovePost, useRejectPost, useRegisteredUsers } from "@/hooks/useAdminData";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { NIGERIAN_STATES, OPPORTUNITY_TYPES, OpportunityType } from "@/lib/constants";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const { data: opportunities } = useOpportunities({ types: [], states: [], search: "" });
  const createOpportunity = useCreateOpportunity();
  const deleteOpportunity = useDeleteOpportunity();
  const updateOpportunity = useUpdateOpportunity();
  const { data: pendingPosts, isLoading: postsLoading } = usePendingPosts();
  const approvePost = useApprovePost();
  const rejectPost = useRejectPost();
  const { data: users, isLoading: usersLoading } = useRegisteredUsers();

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

  if (loading) return <div className="container py-16 text-center">Loading...</div>;

  if (!user || !isAdmin) {
    return (
      <div className="container py-16 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground mb-6">This area is restricted to administrators only.</p>
        <Link to="/"><Button>Go Home</Button></Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.provider || !form.category || !form.link) {
      toast.error("Please fill in all required fields");
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
        is_verified: form.is_verified,
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

  return (
    <div className="container py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage opportunities, posts, and users</p>
        </div>
      </div>

      <Tabs defaultValue="add" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-xs sm:text-sm">
            <Edit className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Manage</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Posts</span>
            {pendingPosts && pendingPosts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingPosts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        {/* Add Opportunity Tab */}
        <TabsContent value="add">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5" />
                Add New Opportunity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." className="text-sm" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-sm">Deadline</Label>
                    <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_date" className="text-sm">Event Date</Label>
                    <Input id="event_date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="text-sm" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch id="verified" checked={form.is_verified} onCheckedChange={(c) => setForm({ ...form, is_verified: c })} />
                    <Label htmlFor="verified" className="text-sm">Verified</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="remote" checked={form.is_remote} onCheckedChange={(c) => setForm({ ...form, is_remote: c })} />
                    <Label htmlFor="remote" className="text-sm">Remote</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createOpportunity.isPending}>
                  {createOpportunity.isPending ? "Adding..." : "Add Opportunity"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Opportunities Tab */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manage Opportunities</CardTitle>
              <CardDescription>Edit or delete existing opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              {!opportunities?.length ? (
                <p className="text-muted-foreground text-center py-8">No opportunities found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunities.map((opp) => (
                        <TableRow key={opp.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{opp.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{opp.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={opp.is_verified ? "default" : "secondary"}>
                              {opp.is_verified ? "Verified" : "Unverified"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleVerified(opp.id, !!opp.is_verified)}
                              title={opp.is_verified ? "Unverify" : "Verify"}
                            >
                              <ToggleLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteOpportunity(opp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Review Community Posts
              </CardTitle>
              <CardDescription>Approve or reject pending community posts</CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : !pendingPosts?.length ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">No pending posts to review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPosts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {(post.profile?.full_name?.[0] || post.profile?.email?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{post.profile?.full_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mb-4 bg-muted/50 p-3 rounded">{post.content}</p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRejectPost(post.id)}
                          disabled={rejectPost.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprovePost(post.id)}
                          disabled={approvePost.isPending}
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registered Users
              </CardTitle>
              <CardDescription>View all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : !users?.length ? (
                <p className="text-muted-foreground text-center py-8">No registered users yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {(u.full_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.full_name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
