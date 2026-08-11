import { useState, Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  Search,
  Trophy,
  Users,
  CreditCard,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Gift,
  UserPlus,
  MousePointerClick,
  AlertTriangle,
  TrendingUp,
  X,
} from "lucide-react";
import { useReferralStats, ReferralStat, useReferralTrackingFailures } from "@/hooks/useReferralStats";
import { useRegisteredUsers, useGenerateReferralCode, RegisteredUser } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReferredUserDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
}

export function ReferralStatsTable() {
  const { data: stats, isLoading: statsLoading } = useReferralStats();
  const { data: allUsers, isLoading: usersLoading } = useRegisteredUsers();
  const { data: failures } = useReferralTrackingFailures(true);
  const generateReferralCode = useGenerateReferralCode();

  const [sortConfig, setSortConfig] = useState<{ key: keyof ReferralStat; direction: 'asc' | 'desc' }>({
    key: 'total_referrals',
    direction: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showFailures, setShowFailures] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [generateLoading, setGenerateLoading] = useState(false);

  const handleSort = (key: keyof ReferralStat) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const buildReferralLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://naijalift.space";
    return `${origin}/sign-up?ref=${encodeURIComponent(code)}`;
  };

  const handleCopyLink = async (stat: ReferralStat) => {
    const link = buildReferralLink(stat.referral_code);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(stat.referral_code);
      toast.success(`Referral link for ${stat.ambassador_name} copied!`);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  const handleGenerateForUser = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user first");
      return;
    }
    try {
      setGenerateLoading(true);
      const res = await generateReferralCode.mutateAsync(selectedUserId);
      toast.success(
        res?.regenerated
          ? "Referral code regenerated!"
          : `Referral code created: ${res.referral_code}`
      );
      setSelectedUserId("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate code";
      toast.error(msg);
    } finally {
      setGenerateLoading(false);
    }
  };

  const getReferredUsersForCode = (code: string): ReferredUserDetail[] => {
    if (!allUsers) return [];
    return allUsers
      .filter((u) => u.referred_by === code)
      .map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        created_at: u.created_at,
        subscription_status: u.subscription_status,
        subscription_ends_at: u.subscription_ends_at,
      }));
  };

  const usersWithoutCode: RegisteredUser[] =
    allUsers?.filter((u) => !u.referral_code) ?? [];

  const sortedData = [...(stats || [])]
    .filter((stat) => 
      stat.ambassador_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.ambassador_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  if (statsLoading || usersLoading) {
    return <div className="p-8 text-center">Loading referral data...</div>;
  }

  const totalReferrers = stats?.length || 0;
  const totalReferrals = stats?.reduce((s, r) => s + r.total_referrals, 0) || 0;
  const totalActiveSubs = stats?.reduce((s, r) => s + r.active_subscriptions, 0) || 0;
  const totalClicks = stats?.reduce((s, r) => s + r.link_clicks, 0) || 0;
  const activeFailures = failures && failures.length > 0 ? failures.length : 0;

  return (
    <div className="space-y-6">
      {activeFailures > 0 && showFailures && (
        <Card className="border-red-300 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 dark:from-red-950/30 dark:via-amber-950/20 dark:to-orange-950/20 dark:border-red-800/50">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">
                      {activeFailures} referral tracking issue{activeFailures !== 1 ? 's' : ''} detected in the last 24 hours
                    </h4>
                    <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                      Monitor the tracking failures table below to identify downtime causes.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setShowFailures(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Generate Referral Link For Any User
          </CardTitle>
          <CardDescription>
            Pick any registered user below to instantly give them a unique referral link they can share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="referral-user-picker">Select User</Label>
              <Select
                value={selectedUserId}
                onValueChange={(v) => setSelectedUserId(v)}
              >
                <SelectTrigger id="referral-user-picker" className="bg-background">
                  <SelectValue
                    placeholder={
                      usersWithoutCode.length === 0
                        ? "All users already have referral codes"
                        : `Pick from ${usersWithoutCode.length} users without a code...`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-[320px]">
                  {usersWithoutCode.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      Every user already has a referral code
                    </SelectItem>
                  ) : (
                    usersWithoutCode.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{u.full_name || "No Name"}</span>
                          <span className="text-muted-foreground text-xs">
                            {u.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerateForUser}
              disabled={!selectedUserId || generateLoading || usersWithoutCode.length === 0}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {generateLoading ? (
                <>Generating…</>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Give Referral Link
                </>
              )}
            </Button>
          </div>
          {usersWithoutCode.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              👍 Every registered user already has a referral code. Click a row below to see who they&apos;ve referred.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Active Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalReferrers}</div>
            <p className="text-xs text-muted-foreground mt-1">Users with referral codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-purple-500" />
              Link Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time referral link visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Signups Via Referral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClicks > 0
                ? `${Math.round((totalReferrals / totalClicks) * 100)}% click-to-signup`
                : "0% click-to-signup"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Premium Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalActiveSubs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalReferrals > 0
                ? `${Math.round((totalActiveSubs / totalReferrals) * 100)}% conversion rate`
                : "0% conversion rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Referral Performance (All Users)
          </CardTitle>
          <CardDescription>
            Click any row to expand and see the full list of people that signed up using that referrer&apos;s link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {sortedData.length} of {totalReferrers} shown
            </div>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36px]"></TableHead>
                  <TableHead className="w-[300px]">Referrer</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('link_clicks')} className="font-bold text-purple-600">
                      Clicks
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('total_referrals')} className="font-bold">
                      Signups
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('click_to_signup_rate')} className="font-bold text-indigo-600">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      Click→Signup
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('active_subscriptions')} className="font-bold text-green-600">
                      Premium
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('trial_users')} className="font-bold text-blue-600">
                      Free
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right w-[110px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No referrers yet. Use the panel above to generate a referral code for a user.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.flatMap((stat) => {
                    const isExpanded = expandedUserId === stat.user_id;
                    const referredUsers = getReferredUsersForCode(stat.referral_code);
                    const rowHeader = (
                      <TableRow
                        key={stat.user_id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/40 transition-colors",
                          isExpanded && "bg-primary/5"
                        )}
                        onClick={() =>
                          setExpandedUserId(isExpanded ? null : stat.user_id)
                        }
                      >
                        <TableCell className="py-3 px-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{stat.ambassador_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{stat.ambassador_email}</span>
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 w-fit mt-1">
                              {stat.referral_code}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4 text-purple-500" />
                            <span className="font-bold tabular-nums">{stat.link_clicks}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold tabular-nums">{stat.total_referrals}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={cn(
                            stat.click_to_signup_rate >= 20
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : ""
                          )}>
                            {stat.click_to_signup_rate > 0
                              ? `${stat.click_to_signup_rate}%`
                              : <span className="text-muted-foreground">—</span>}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-600" />
                            <span className="font-bold tabular-nums text-green-700">{stat.active_subscriptions}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-bold tabular-nums text-blue-700">{stat.trial_users}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopyLink(stat);
                            }}
                            className="text-xs"
                          >
                            {copiedCode === stat.referral_code ? (
                              <Fragment>
                                <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                                Copied
                              </Fragment>
                            ) : (
                              <Fragment>
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Link
                              </Fragment>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );

                    if (!isExpanded) return [rowHeader];

                    const detailRow = (
                      <TableRow key={`${stat.user_id}-detail`} className="bg-muted/20">
                        <TableCell colSpan={8} className="py-4 px-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                People Referred By {stat.ambassador_name}
                                <Badge variant="secondary" className="text-xs">
                                  {referredUsers.length} user{referredUsers.length !== 1 ? "s" : ""}
                                </Badge>
                              </h4>
                              <div className="text-xs text-muted-foreground flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <MousePointerClick className="h-3 w-3 text-purple-500" />
                                  {stat.link_clicks} link clicks
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-indigo-500" />
                                  {stat.click_to_signup_rate > 0
                                    ? `${stat.click_to_signup_rate}% click→signup`
                                    : "No clicks yet"}
                                </span>
                              </div>
                            </div>
                            {referredUsers.length === 0 ? (
                              <div className="text-center py-6 text-sm text-muted-foreground">
                                No one has signed up with this referral link yet.
                              </div>
                            ) : (
                              <div className="rounded-md border bg-background overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Referred User</TableHead>
                                      <TableHead>Joined</TableHead>
                                      <TableHead>Plan</TableHead>
                                      <TableHead className="text-right">Subscription Valid Until</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {referredUsers.map((ru) => {
                                      const isPremium = ru.subscription_status === "active";
                                      return (
                                        <TableRow key={ru.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                  {(ru.full_name?.[0] || ru.email?.[0] || "U").toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                  {ru.full_name || "No Name"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  {ru.email}
                                                </span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {ru.created_at
                                              ? format(new Date(ru.created_at), "MMM d, yyyy")
                                              : "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            {isPremium ? (
                                              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 capitalize text-xs">
                                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                                Premium
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="capitalize text-xs">
                                                Free
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right text-sm text-muted-foreground">
                                            {isPremium && ru.subscription_ends_at
                                              ? format(new Date(ru.subscription_ends_at), "MMM d, yyyy")
                                              : "—"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );

                    return [rowHeader, detailRow];
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {failures && failures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Recent Tracking Failures (Last 24h)
              <Badge variant="destructive" className="text-xs">{failures.length}</Badge>
            </CardTitle>
            <CardDescription>
              These are automatically recorded when referral link tracking or signup lookup fails.
              Investigate to prevent referral attribution loss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {format(new Date(f.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {f.failure_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {f.referral_code || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={f.error_message || ""}>
                        {f.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...values: (string | false | undefined | null)[]): string {
  return values.filter(Boolean).join(" ");
}
