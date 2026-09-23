import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { WordStatus } from "@/types";

export function StatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  return (
    <Badge variant={status} className={className}>
      {statusLabel(status)}
    </Badge>
  );
}
