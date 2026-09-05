import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AiRunRow } from "@/lib/admin/ai-runs";

const OPERATION_LABELS: Record<string, string> = {
  cv_extraction: "CV Extraction",
  job_analysis: "Job Analysis",
  evidence_matching: "Evidence Matching",
  cv_tailoring: "CV Tailoring",
  cover_letter: "Cover Letter",
  application_answers: "Application Answers",
};

export function AiRunsLog({ runs }: { runs: AiRunRow[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No AI runs recorded for this request yet.</p>;
  }

  return (
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
              <Badge
                variant={
                  run.status === "success" ? "success" : run.status === "timeout" ? "warning" : "danger"
                }
              >
                {run.status}
              </Badge>
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
  );
}
