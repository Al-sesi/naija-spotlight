import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Plus, Calendar, Link as LinkIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { NIGERIAN_STATES, OPPORTUNITY_TYPES, OpportunityType } from "@/lib/constants";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const createOpportunity = useCreateOpportunity();

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
      });
      toast.success("Opportunity added successfully!");
      setForm({
        title: "", provider: "", category: "", description: "", link: "",
        deadline: "", event_date: "", state: "Nationwide", is_verified: true, is_remote: false,
      });
    } catch {
      toast.error("Failed to add opportunity");
    }
  };

  return (
    <div className="container py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Add new opportunities</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Opportunity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. NPF Recruitment 2025" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider *</Label>
                <Input id="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Federal Government" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as OpportunityType })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {OPPORTUNITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover max-h-[200px]">
                    {NIGERIAN_STATES.filter(s => s !== "All States").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Application Link *</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="link" className="pl-10" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date</Label>
                <Input id="event_date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch id="verified" checked={form.is_verified} onCheckedChange={(c) => setForm({ ...form, is_verified: c })} />
                <Label htmlFor="verified">Verified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="remote" checked={form.is_remote} onCheckedChange={(c) => setForm({ ...form, is_remote: c })} />
                <Label htmlFor="remote">Remote</Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createOpportunity.isPending}>
              {createOpportunity.isPending ? "Adding..." : "Add Opportunity"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
