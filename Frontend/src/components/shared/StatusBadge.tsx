import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { Word, WordStatus } from "@/types";

export function StatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant={status} className={className}>
      {t.status[status]}
    </Badge>
  );
}

/** Shows the review button the user last pressed. Unreviewed words stay "Nova". */
export function WordStateBadge({ word, className }: { word: Word; className?: string }) {
  const { t } = useI18n();
  if (!word.lastGrade) return <StatusBadge status={word.status} className={className} />;
  return (
    <Badge variant={word.lastGrade} className={className}>
      {t.review[word.lastGrade]}
    </Badge>
  );
}
