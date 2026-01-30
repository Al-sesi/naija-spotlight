import { useState } from "react";
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
import { ArrowUpDown, Search, Trophy, Users, CreditCard, Clock } from "lucide-react";
import { useReferralStats, ReferralStat } from "@/hooks/useReferralStats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateAmbassadorDialog } from "./CreateAmbassadorDialog";

export function ReferralStatsTable() {
  const { data: stats, isLoading } = useReferralStats();
  const [sortConfig, setSortConfig] = useState<{ key: keyof ReferralStat; direction: 'asc' | 'desc' }>({
    key: 'total_referrals',
    direction: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (key: keyof ReferralStat) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

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

  if (isLoading) {
    return <div className="p-8 text-center">Loading referral data...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Ambassador Performance
          </CardTitle>
          <CardDescription>
            Track top performing ambassadors, subscriptions, and trial conversions.
          </CardDescription>
        </div>
        <CreateAmbassadorDialog />
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ambassador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Ambassador</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('total_referrals')} className="font-bold">
                    Total Referrals
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('active_subscriptions')} className="font-bold text-green-600">
                    Active Subs
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('trial_users')} className="font-bold text-blue-600">
                    Trial Users
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((stat) => (
                  <TableRow key={stat.ambassador_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{stat.ambassador_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{stat.ambassador_email}</span>
                        <span className="text-xs font-mono bg-muted px-1 py-0.5 rounded w-fit mt-1">Code: {stat.referral_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{stat.total_referrals}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-700">{stat.active_subscriptions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-blue-700">{stat.trial_users}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.total_referrals > 0 
                        ? `${Math.round((stat.active_subscriptions / stat.total_referrals) * 100)}%` 
                        : "0%"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
