"use client";

import { useState } from "react";
import { AdminGroupStandings } from "@/components/admin-group-standings";
import { Card, PrimaryButton } from "@/components/ui";
import { t } from "@/lib/i18n";
import { formatKickoff } from "@/lib/format";
import { appLocale } from "@/lib/i18n";
import { SCORING_RULE_KEYS, type Match, type ScoringRules, type Team } from "@/lib/types";

const RULE_LABELS: Record<(typeof SCORING_RULE_KEYS)[number], () => string> = {
  exact_home_goals_points: () => t.admin.rules.exactHome,
  exact_away_goals_points: () => t.admin.rules.exactAway,
  exact_goal_diff_points: () => t.admin.rules.exactDiff,
  correct_result_points: () => t.admin.rules.correctResult,
  group_correct_position_points: () => t.admin.rules.groupPosition,
  group_perfect_bonus_points: () => t.admin.rules.groupPerfect,
};

type OfficialStanding = {
  group_code: string;
  ordered_team_ids: string[];
};

export function AdminPanel({
  matches,
  rules,
  groups,
  matchesByGroup,
  officials,
}: {
  matches: Match[];
  rules: ScoringRules;
  groups: Record<string, Team[]>;
  matchesByGroup: Record<string, Match[]>;
  officials: OfficialStanding[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [ruleValues, setRuleValues] = useState(rules);

  async function syncFixtures() {
    setMessage("Syncing fixtures...");
    const response = await fetch("/api/admin/sync-fixtures", { method: "POST" });
    const result = (await response.json()) as { error?: string; sync?: { matches: number } };
    setMessage(
      response.ok
        ? `${t.admin.sync}: ${result.sync?.matches || 0} ${t.home.stats.groupMatches.toLowerCase()}`
        : result.error || "Sync failed"
    );
  }

  async function saveScore(matchId: string, formData: FormData, reset = false) {
    setMessage(reset ? "Resetting..." : "Saving score...");
    const homeRaw = formData.get("homeScore");
    const awayRaw = formData.get("awayScore");

    const body =
      reset || homeRaw === "" || awayRaw === ""
        ? { homeScore: null, awayScore: null }
        : { homeScore: Number(homeRaw), awayScore: Number(awayRaw) };

    const response = await fetch(`/api/admin/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? reset
          ? t.admin.scoreResetLive
          : t.admin.scoreSavedLive
        : result.error || "Could not save score"
    );
  }

  async function resetScore(matchId: string) {
    setMessage("Resetting...");
    const response = await fetch(`/api/admin/matches/${matchId}/reset`, { method: "POST" });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? t.admin.scoreResetLive : result.error || "Reset failed");
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
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SCORING_RULE_KEYS.map((key) => (
            <label key={key} className="text-start text-sm font-bold text-slate-700">
              {RULE_LABELS[key]()}
              <input
                type="number"
                min={0}
                value={ruleValues[key]}
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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                {match.group_code}
                {match.match_number ? ` · #${match.match_number}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatKickoff(match.kickoff_at, appLocale)}</p>
              <p className="mt-2 text-start font-black">
                {match.team1_name} vs {match.team2_name}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
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
                <button
                  type="button"
                  onClick={() => resetScore(match.id)}
                  className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700"
                >
                  {t.admin.reset}
                </button>
              </div>
            </form>
          ))}
        </div>
      </Card>

      <AdminGroupStandings
        key={
          officials
            .map((row) => `${row.group_code}:${row.ordered_team_ids.join(",")}`)
            .sort()
            .join("|") || "live"
        }
        groups={groups}
        matchesByGroup={matchesByGroup}
        officials={officials}
        onMessage={setMessage}
      />
    </div>
  );
}
