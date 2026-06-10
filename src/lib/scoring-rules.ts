import { DEFAULT_SCORING_RULES, SCORING_RULE_KEYS, type ScoringRules } from "@/lib/types";

export function pickScoringRules(row: Record<string, unknown> | null | undefined): ScoringRules {
  if (!row) return DEFAULT_SCORING_RULES;

  const rules = { ...DEFAULT_SCORING_RULES };
  for (const key of SCORING_RULE_KEYS) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      rules[key] = value;
    }
  }
  return rules;
}

export const SCORING_RULES_SELECT = SCORING_RULE_KEYS.join(",");
