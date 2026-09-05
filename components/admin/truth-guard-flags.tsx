import { Badge } from "@/components/ui/badge";
import type { TruthGuardFlag } from "@/lib/ai/schemas";

const STATUS_VARIANT = {
  unsupported: "danger",
  needs_review: "warning",
  supported: "success",
} as const;

const STATUS_LABEL = {
  unsupported: "Unsupported",
  needs_review: "Needs review",
  supported: "Supported",
} as const;

const STATUS_ORDER = { unsupported: 0, needs_review: 1, supported: 2 } as const;

export function TruthGuardFlags({ flags }: { flags: TruthGuardFlag[] }) {
  if (flags.length === 0) {
    return <p className="text-sm text-muted-foreground">No Truth Guard flags recorded.</p>;
  }

  const sorted = [...flags].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const actionable = sorted.filter((f) => f.status !== "supported");

  return (
    <div className="flex flex-col gap-3">
      {actionable.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {actionable.length} claim{actionable.length === 1 ? "" : "s"} need admin attention
          before approval.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          All generated claims are traced to supporting CV evidence.
        </p>
      )}
      {sorted.map((flag, i) => (
        <div key={i} className="rounded-md border border-border p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{flag.generatedClaim}</p>
            <Badge variant={STATUS_VARIANT[flag.status]}>{STATUS_LABEL[flag.status]}</Badge>
          </div>
          {flag.sourceText ? (
            <p className="mt-2 text-muted-foreground">
              Source{flag.sourceSection ? ` (${flag.sourceSection})` : ""}: &ldquo;{flag.sourceText}
              &rdquo;
            </p>
          ) : (
            <p className="mt-2 text-muted-foreground">No source evidence cited.</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Confidence: {flag.confidence}</p>
        </div>
      ))}
    </div>
  );
}
