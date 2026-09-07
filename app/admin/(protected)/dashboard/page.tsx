import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { MatchScore } from "@/components/admin/match-score";
import { getDashboardStats, getRecentRequests } from "@/lib/admin/requests";

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentRequests(8)]);

  const statCards = [
    { label: "New requests", value: stats.new },
    { label: "Processing", value: stats.processing },
    { label: "Draft ready", value: stats.draftReady },
    { label: "Delivered", value: stats.delivered },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent requests</h2>
          <Link href="/admin/requests" className="text-sm text-accent hover:underline">
            View all requests
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No requests yet. New submissions will appear here.
          </p>
        ) : (
          <>
            {/* Below sm, a wide 6-column table forces horizontal scroll to
                read anything — a stacked card per request is far easier to
                scan with a thumb. Same data, two renderings. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/requests/${r.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{r.customer_name}</span>
                    <MatchScore score={r.match_score} />
                  </div>
                  <p className="text-muted-foreground">
                    {r.job_title ?? "—"}
                    {r.company ? ` · ${r.company}` : ""}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/admin/requests/${r.id}`} className="hover:underline">
                          {r.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.job_title ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.company ?? "—"}</TableCell>
                      <TableCell>
                        <MatchScore score={r.match_score} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
