"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/match-cards-grid.module.css";
import { LockCountdown } from "@/components/lock-countdown";
import { MatchPointsLeaders } from "@/components/match-points-leaders";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { TeamFlag } from "@/components/team-flag";
import { PageHeader, PrimaryButton, StatusPill, saveButtonClassName } from "@/components/ui";
import { appLocale, t } from "@/lib/i18n";
import { formatKickoff } from "@/lib/format";
import { formatReasons } from "@/lib/scoring-labels";
import { matchHasFinalScore } from "@/lib/scoring";
import type { Match, ScoreReason } from "@/lib/types";

type ExistingBet = {
  match_id: string;
  home_score: number;
  away_score: number;
};

type UserScore = {
  points: number;
  reasons: ScoreReason[];
};

const FLAG_SIZE = 56;

export function MatchBetsForm({
  matches,
  bets,
  userScores,
}: {
  matches: Match[];
  bets: ExistingBet[];
  userScores: Record<string, UserScore>;
}) {
  const router = useRouter();
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
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startId = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, []);

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
    if (response.ok) {
      setMessage(`${result.saved || 0} ${t.matches.saved}`);
      router.refresh();
    } else {
      setMessage(result.error || "Could not save bets");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.matches.title}
        body={t.matches.body}
        action={
          <PrimaryButton onClick={save} disabled={saving} className={saveButtonClassName}>
            {saving ? t.matches.saving : t.matches.save}
          </PrimaryButton>
        }
      />

      {message ? (
        <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white" role="status">
          {message}
        </p>
      ) : null}

      <div className="match-cards-grid">
        {matches.map((match) => {
          const locked = now !== null && new Date(match.kickoff_at).getTime() <= now;
          const value = values.get(match.id) || { homeScore: "", awayScore: "" };
          const finished = matchHasFinalScore(match);
          const earned = userScores[match.id];

          return (
            <article key={match.id} className={`match-cards-grid__card ${styles.matchCard}`}>
              <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                  {match.group_code}
                </span>
                <span className="text-sm font-bold text-slate-600">{formatKickoff(match.kickoff_at, appLocale)}</span>
                <StatusPill locked={locked} labels={{ locked: t.matches.locked, open: t.matches.open }} />
              </div>
              <div className="mt-1 text-center">
                <LockCountdown kickoffAt={match.kickoff_at} locked={locked} />
              </div>

              <div className={styles.betBox}>
                <p className={styles.boxLabel}>{t.matches.yourPrediction}</p>
                <div className={styles.matchGrid}>
                  <div className={`${styles.cell} ${styles.homeCol}`} style={{ gridRow: 1 }}>
                    <TeamFlag name={match.team1_name} size={FLAG_SIZE} />
                  </div>
                  <div className={`${styles.cell} ${styles.awayCol}`} style={{ gridRow: 1 }}>
                    <TeamFlag name={match.team2_name} size={FLAG_SIZE} />
                  </div>
                  <div className={`${styles.cell} ${styles.homeCol}`} style={{ gridRow: 2 }}>
                    <p className={styles.teamName}>{match.team1_name}</p>
                  </div>
                  <div className={`${styles.cell} ${styles.awayCol}`} style={{ gridRow: 2 }}>
                    <p className={styles.teamName}>{match.team2_name}</p>
                  </div>
                  <div className={`${styles.cell} ${styles.homeCol}`} style={{ gridRow: 3 }}>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      disabled={locked}
                      value={value.homeScore}
                      onChange={(event) => update(match.id, "homeScore", event.target.value)}
                      inputMode="numeric"
                      aria-label={`${match.team1_name} ${t.matches.yourPrediction}`}
                      className={styles.scoreInput}
                    />
                  </div>
                  <span className={styles.sep} style={{ gridRow: 3 }}>
                    :
                  </span>
                  <div className={`${styles.cell} ${styles.awayCol}`} style={{ gridRow: 3 }}>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      disabled={locked}
                      value={value.awayScore}
                      onChange={(event) => update(match.id, "awayScore", event.target.value)}
                      inputMode="numeric"
                      aria-label={`${match.team2_name} ${t.matches.yourPrediction}`}
                      className={styles.scoreInput}
                    />
                  </div>
                </div>
              </div>

              {finished ? (
                <div className={styles.finishedSections}>
                  <div className={styles.finalBox}>
                    <p className={styles.boxLabel}>{t.matches.final}</p>
                    <div className={styles.finalGrid}>
                      <div className={`${styles.cell} ${styles.homeCol}`}>
                        <p className={styles.finalValue}>{match.home_score}</p>
                      </div>
                      <span className={styles.sep}>:</span>
                      <div className={`${styles.cell} ${styles.awayCol}`}>
                        <p className={styles.finalValue}>{match.away_score}</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.pointsBox}>
                    <p className={styles.boxLabel}>{t.matches.yourPoints}</p>
                    <p className={styles.pointsValue}>{earned?.points ?? 0}</p>
                    {earned?.reasons.length ? (
                      <p className={styles.pointsReasons}>{formatReasons(earned.reasons)}</p>
                    ) : null}
                  </div>

                  <div className={styles.leadersBox}>
                    <MatchPointsLeaders matchId={match.id} />
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <ScoringRulesPanel variant="match" />
    </div>
  );
}
