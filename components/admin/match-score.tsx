import { Badge } from "@/components/ui/badge";

export function MatchScore({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant = score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
  return <Badge variant={variant}>{score}%</Badge>;
}
