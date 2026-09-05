import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { MatchScore } from "@/components/admin/match-score";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listRequests } from "@/lib/admin/requests";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/admin/status";
import type { RequestStatus } from "@/lib/supabase/types";

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && (STATUS_FLOW as string[]).includes(params.status)
      ? (params.status as RequestStatus)
      : undefined;
  const page = Number(params.page ?? "1") || 1;

  const { requests, total, pageSize } = await listRequests({ status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filterHref = (s?: RequestStatus) => (s ? `/admin/requests?status=${s}` : "/admin/requests");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requests</h1>
        <p className="text-sm text-muted-foreground">{total} total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={filterHref()}
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            !status ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-border"
          )}
        >
          All
        </Link>
        {STATUS_FLOW.map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              status === s
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-border"
            )}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No requests match this filter.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
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
                <TableCell>
                  <Link href={`/admin/requests/${r.id}`}>
                    <Button variant="outline" size="sm">
                      Open
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`/admin/requests?${status ? `status=${status}&` : ""}page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
          >
            <Button variant="outline" size="sm" disabled={page <= 1}>
              Previous
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/requests?${status ? `status=${status}&` : ""}page=${Math.min(totalPages, page + 1)}`}
            aria-disabled={page >= totalPages}
          >
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              Next
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
