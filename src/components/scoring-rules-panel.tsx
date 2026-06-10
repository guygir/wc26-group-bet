"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import type { ScoringRules } from "@/lib/types";

export function ScoringRulesPanel({ variant }: { variant: "match" | "group" }) {
  const [rules, setRules] = useState<ScoringRules | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/scoring-rules", { cache: "no-store" });
        const payload = (await response.json()) as { rules?: ScoringRules };
        if (active && payload.rules) setRules(payload.rules);
      } catch {
        /* ignore */
      }
    }

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  if (!rules) return null;

  const lines =
    variant === "match"
      ? [
          `${t.scoring.exactHome}: ${rules.exact_home_goals_points}`,
          `${t.scoring.exactAway}: ${rules.exact_away_goals_points}`,
          `${t.scoring.exactDiff}: ${rules.exact_goal_diff_points}`,
          `${t.scoring.correctResult}: ${rules.correct_result_points}`,
        ]
      : [
          `${t.scoring.groupPosition}: ${rules.group_correct_position_points}`,
          `${t.scoring.groupPerfect}: +${rules.group_perfect_bonus_points} (${t.scoring.groupPerfectHint})`,
        ];

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
      <p className="font-black text-emerald-800">{t.scoring.title}</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
