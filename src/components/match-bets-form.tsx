"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { PageHeader, PrimaryButton, StatusPill } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Match } from "@/lib/types";

type ExistingBet = {
  match_id: string;
  home_score: number;
  away_score: number;
};

export function MatchBetsForm({ matches, bets }: { matches: Match[]; bets: ExistingBet[] }) {
  const reduceMotion = useReducedMotion();
  const initial = useMemo(() => {
    const map = new Map<string, { homeScore: string; awayScore: string }>();
    for (const bet of bets) {
      map.set(bet.match_id, { homeScore: String(bet.home_score), awayScore: String(bet.away_score) });
    }
    return map;
  }, [bets]);

  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());
  const motionTransition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };
  const itemProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
      };

  function update(matchId: string, key: "homeScore" | "awayScore", value: string) {
    setValues((current) => {
      const next = new Map(current);
      next.set(matchId, { homeScore: "", awayScore: "", ...next.get(matchId), [key]: value });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = [...values.entries()]
      .filter(([, value]) => value.homeScore !== "" && value.awayScore !== "")
      .map(([matchId, value]) => ({
        matchId,
        homeScore: Number(value.homeScore),
        awayScore: Number(value.awayScore),
      }));

    const response = await fetch("/api/bets/matches", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bets: payload }),
    });
    const result = (await response.json()) as { error?: string; saved?: number };
    setSaving(false);
    setMessage(response.ok ? `${result.saved || 0} ${t.matches.saved}` : result.error || "Could not save bets");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.matches.title}
        body={t.matches.body}
        action={
          <PrimaryButton onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? t.matches.saving : t.matches.save}
          </PrimaryButton>
        }
      />

      {message ? <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((match, index) => {
          const locked = new Date(match.kickoff_at).getTime() <= now;
          const value = values.get(match.id) || { homeScore: "", awayScore: "" };

          return (
            <motion.article
              key={match.id}
              className="rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-sm shadow-emerald-900/5 backdrop-blur sm:p-5"
              {...itemProps}
              transition={reduceMotion ? undefined : { ...motionTransition, delay: Math.min(index * 0.025, 0.25) }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{match.group_code}</p>
                  <h2 className="mt-2 text-lg font-black leading-snug sm:text-xl">
                    {match.team1_name} vs {match.team2_name}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {new Date(match.kickoff_at).toLocaleString()} · {match.venue}
                  </p>
                </div>
                <StatusPill locked={locked} labels={{ locked: t.matches.locked, open: t.matches.open }} />
              </div>

              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
                <label className="text-sm font-bold text-start">
                  {match.team1_name}
                  <input
                    type="number"
                    min={0}
                    max={30}
                    disabled={locked}
                    value={value.homeScore}
                    onChange={(event) => update(match.id, "homeScore", event.target.value)}
                    inputMode="numeric"
                    className="mt-2 min-h-14 w-full rounded-2xl border border-emerald-100 px-3 py-3 text-center text-xl font-black disabled:bg-slate-100"
                  />
                </label>
                <span className="pb-4 font-black text-slate-400">-</span>
                <label className="text-sm font-bold text-start">
                  {match.team2_name}
                  <input
                    type="number"
                    min={0}
                    max={30}
                    disabled={locked}
                    value={value.awayScore}
                    onChange={(event) => update(match.id, "awayScore", event.target.value)}
                    inputMode="numeric"
                    className="mt-2 min-h-14 w-full rounded-2xl border border-emerald-100 px-3 py-3 text-center text-xl font-black disabled:bg-slate-100"
                  />
                </label>
              </div>

              {match.status === "final" ? (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  {t.matches.final}: {match.home_score} - {match.away_score}
                </p>
              ) : null}
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
