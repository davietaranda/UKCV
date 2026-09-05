import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_BADGE_VARIANT } from "@/lib/admin/status";
import type { RequestStatus } from "@/lib/supabase/types";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
