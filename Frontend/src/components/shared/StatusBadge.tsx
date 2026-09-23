import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { WordStatus } from "@/types";

export function StatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant={status} className={className}>
      {t.status[status]}
    </Badge>
  );
}
