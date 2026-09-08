import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AiRunRow } from "@/lib/admin/ai-runs";

const OPERATION_LABELS: Record<string, string> = {
  cv_extraction: "CV Extraction",
  cv_normalization: "CV Normalization",
  job_analysis: "Job Analysis",
  evidence_matching: "Evidence Matching",
  cv_tailoring: "CV Tailoring",
  cover_letter: "Cover Letter",
  application_answers: "Application Answers",
};

function statusVariant(status: AiRunRow["status"]) {
  return status === "success" ? "success" : status === "timeout" ? "warning" : "danger";
}

export function AiRunsLog({ runs }: { runs: AiRunRow[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No AI runs recorded for this request yet.</p>;
  }

  return (
    <>
      {/* Below sm, a 6-column table forces horizontal scroll to read
          anything — a stacked card per run is far easier to scan with a
          thumb. Same data, two renderings. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {runs.map((run) => (
          <div key={run.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{OPERATION_LABELS[run.operation] ?? run.operation}</span>
              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {run.model} · {run.duration_ms ? `${run.duration_ms}ms` : "—"}
            </p>
            <p className="text-muted-foreground">
              Tokens: {run.input_tokens ?? "—"} in / {run.output_tokens ?? "—"} out
            </p>
            {run.error_message ? <p className="text-xs text-danger">{run.error_message}</p> : null}
            <p className="text-xs text-muted-foreground">
              {new Date(run.created_at).toLocaleString("en-GB")}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens (in/out)</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{OPERATION_LABELS[run.operation] ?? run.operation}</TableCell>
                <TableCell className="text-muted-foreground">{run.model}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                  {run.error_message ? (
                    <p className="mt-1 max-w-xs text-xs text-danger">{run.error_message}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {run.input_tokens ?? "—"} / {run.output_tokens ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {run.duration_ms ? `${run.duration_ms}ms` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(run.created_at).toLocaleString("en-GB")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
