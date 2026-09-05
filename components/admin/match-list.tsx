import { Badge } from "@/components/ui/badge";
import type { EvidenceMatchItem } from "@/lib/ai/schemas";

function Group({
  title,
  variant,
  items,
}: {
  title: string;
  variant: "success" | "warning" | "danger";
  items: EvidenceMatchItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
        {title}
        <Badge variant={variant}>{items.length}</Badge>
      </h4>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{item.requirement}</p>
            {item.evidence ? (
              <p className="mt-1 text-muted-foreground">
                Evidence{item.sourceSection ? ` (${item.sourceSection})` : ""}: &ldquo;
                {item.evidence}&rdquo;
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">No evidence found in the CV.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchList({
  strongMatches,
  partialMatches,
  missingRequirements,
}: {
  strongMatches: EvidenceMatchItem[];
  partialMatches: EvidenceMatchItem[];
  missingRequirements: EvidenceMatchItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Group title="Strong matches" variant="success" items={strongMatches} />
      <Group title="Partial matches" variant="warning" items={partialMatches} />
      <Group title="Missing" variant="danger" items={missingRequirements} />
    </div>
  );
}
