"use client";

import { useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Match, ScoringRules } from "@/lib/types";

export function AdminPanel({ matches, rules }: { matches: Match[]; rules: ScoringRules }) {
  const [message, setMessage] = useState<string | null>(null);
  const [ruleValues, setRuleValues] = useState(rules);

  async function syncFixtures() {
    setMessage("Syncing fixtures...");
    const response = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    const result = (await response.json()) as { error?: string; sync?: { matches: number } };
    setMessage(response.ok ? `Synced ${result.sync?.matches || 0} fixtures` : result.error || "Sync failed");
  }

  async function saveScore(matchId: string, formData: FormData) {
    const homeScore = Number(formData.get("homeScore"));
    const awayScore = Number(formData.get("awayScore"));
    setMessage("Saving score...");
    const response = await fetch(`/api/admin/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Score saved and leaderboard recomputed" : result.error || "Could not save score");
  }

  async function saveRules() {
    setMessage("Saving scoring rules...");
    const response = await fetch("/api/admin/scoring-rules", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ruleValues),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Rules saved and scores recomputed" : result.error || "Could not save rules");
  }

  return (
    <div className="space-y-6">
      <div className="motion-rise rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-emerald-900/20 sm:p-6">
        <h1 className="text-3xl font-black">{t.admin.title}</h1>
        <p className="mt-2 text-sm leading-6 text-emerald-50/80 sm:text-base">{t.admin.body}</p>
        <button
          onClick={syncFixtures}
          className="mt-5 min-h-12 w-full rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 sm:w-auto"
        >
          {t.admin.sync}
        </button>
      </div>

      {message ? <p className="rounded-2xl bg-white p-4 font-bold text-slate-800 shadow-sm">{message}</p> : null}

      <Card as="section">
        <h2 className="text-2xl font-black">{t.admin.scoringRules}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(ruleValues).map(([key, value]) => (
            <label key={key} className="text-start text-sm font-bold text-slate-700">
              {key.replaceAll("_", " ")}
              <input
                type="number"
                min={0}
                value={value}
                onChange={(event) => setRuleValues((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className="mt-2 min-h-12 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-lg font-black"
              />
            </label>
          ))}
        </div>
        <PrimaryButton onClick={saveRules} className="mt-4 w-full sm:w-auto">
          {t.admin.saveRules}
        </PrimaryButton>
      </Card>

      <Card as="section">
        <h2 className="text-2xl font-black">{t.admin.finalScores}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matches.map((match) => (
            <form
              key={match.id}
              action={(formData) => saveScore(match.id, formData)}
              className="rounded-2xl border border-emerald-100 p-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{match.group_code}</p>
              <p className="mt-2 text-start font-black">
                {match.team1_name} vs {match.team2_name}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  name="homeScore"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={match.home_score ?? ""}
                  className="min-h-12 rounded-xl border px-3 py-2 text-center font-black"
                  placeholder={match.team1_name}
                />
                <input
                  name="awayScore"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={match.away_score ?? ""}
                  className="min-h-12 rounded-xl border px-3 py-2 text-center font-black"
                  placeholder={match.team2_name}
                />
                <button type="submit" className="min-h-12 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white">
                  {t.admin.save}
                </button>
              </div>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
