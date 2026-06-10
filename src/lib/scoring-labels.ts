import { t } from "@/lib/i18n";
import type { ScoreReason } from "@/lib/types";

const LABEL_MAP: Record<string, () => string> = {
  "scoring.exactHome": () => t.scoring.exactHome,
  "scoring.exactAway": () => t.scoring.exactAway,
  "scoring.exactDiff": () => t.scoring.exactDiff,
  "scoring.correctResult": () => t.scoring.correctResult,
  "scoring.groupPosition": () => t.scoring.groupPosition,
  "scoring.groupPerfect": () => t.scoring.groupPerfect,
};

export function labelForReason(reason: Pick<ScoreReason, "labelKey">) {
  return LABEL_MAP[reason.labelKey]?.() || reason.labelKey;
}

export function formatReasons(reasons: Pick<ScoreReason, "labelKey" | "points">[]) {
  return reasons.map((r) => `${labelForReason(r)} (${r.points})`).join(", ");
}
