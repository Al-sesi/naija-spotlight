import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useAppInstalls } from "@/hooks/useAdminData";
import { Smartphone, Download, User, Monitor } from "lucide-react";

export function AppInstallsTable() {
  const { data: installs, isLoading } = useAppInstalls();

  if (isLoading) {
    return <div>Loading install stats...</div>;
  }

  const acceptedInstalls = installs?.filter(i => i.outcome === 'accepted') || [];
  const dismissedInstalls = installs?.filter(i => i.outcome === 'dismissed') || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Installs</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedInstalls.length}</div>
            <p className="text-xs text-muted-foreground">
              Accepted install prompts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dismissedInstalls.length}</div>
            <p className="text-xs text-muted-foreground">
              Dismissed install prompts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Platform/User Agent</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installs?.map((install) => (
              <TableRow key={install.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {install.profile?.full_name || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {install.profile?.email || (install.user_id ? "Authenticated User" : "Guest")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    install.outcome === 'accepted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {install.outcome || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={install.user_agent || ""}>
                  {install.user_agent}
                </TableCell>
                <TableCell>
                  {format(new Date(install.created_at), "PP p")}
                </TableCell>
              </TableRow>
            ))}
            {(!installs || installs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No install data recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
