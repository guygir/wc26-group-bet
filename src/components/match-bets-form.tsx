"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

type LiveScore = {
  homeScore: number;
  awayScore: number;
  status: "in_progress" | "final";
};

const FLAG_SIZE = 56;

function liveScoreKey(groupCode: string, team1: string, team2: string) {
  return `${groupCode}::${team1.trim().toLowerCase()}::${team2.trim().toLowerCase()}`;
}

export function MatchBetsForm({
  matches,
  bets,
  userScores,
  liveScores,
}: {
  matches: Match[];
  bets: ExistingBet[];
  userScores: Record<string, UserScore>;
  liveScores: Record<string, LiveScore>;
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
  const [feedScores, setFeedScores] = useState(liveScores);
  const firstUpcomingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startId = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshLiveScores() {
      const response = await fetch("/api/matches/live-scores");
      const payload = (await response.json()) as { scores?: Record<string, LiveScore> };
      if (!cancelled) {
        setFeedScores(payload.scores || {});
      }
    }

    const id = window.setInterval(() => {
      refreshLiveScores().catch(() => undefined);
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      firstUpcomingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);

    return () => window.clearTimeout(id);
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
    const openMatchIds = new Set(
      matches
        .filter((match) => match.status === "scheduled" && (now === null || new Date(match.kickoff_at).getTime() > now))
        .map((match) => match.id)
    );
    const payload = [...values.entries()]
      .filter(([matchId]) => openMatchIds.has(matchId))
      .filter(([, value]) => value.homeScore !== "" && value.awayScore !== "")
      .map(([matchId, value]) => ({
        matchId,
        homeScore: Number(value.homeScore),
        awayScore: Number(value.awayScore),
      }));

    if (!payload.length) {
      setSaving(false);
      setMessage(t.matches.noOpenBetsToSave);
      return;
    }

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

  const firstUpcomingMatchId = useMemo(() => {
    if (now === null) return null;

    for (const match of matches) {
      const locked = match.status !== "scheduled" || new Date(match.kickoff_at).getTime() <= now;
      const scoreFinal = matchHasFinalScore(match);
      const persistedScore =
        match.home_score !== null && match.away_score !== null
          ? { homeScore: match.home_score, awayScore: match.away_score, status: match.status }
          : null;
      const feedScore = match.group_code
        ? feedScores[liveScoreKey(match.group_code, match.team1_name, match.team2_name)]
        : undefined;
      const displayFinal = scoreFinal || (persistedScore || feedScore)?.status === "final";
      if (!displayFinal && !locked) {
        return match.id;
      }
    }

    return null;
  }, [feedScores, matches, now]);

  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        title={t.matches.title}
        body={t.matches.body}
      />

      <ScoringRulesPanel variant="match" />

      {message ? (
        <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white" role="status">
          {message}
        </p>
      ) : null}

      <div className="match-cards-grid scroll-mt-28">
        {matches.map((match) => {
            const locked = match.status !== "scheduled" || (now !== null && new Date(match.kickoff_at).getTime() <= now);
            const value = values.get(match.id) || { homeScore: "", awayScore: "" };
            const scoreFinal = matchHasFinalScore(match);
            const persistedScore =
              match.home_score !== null && match.away_score !== null
                ? { homeScore: match.home_score, awayScore: match.away_score, status: match.status }
                : null;
            const feedScore = match.group_code
              ? feedScores[liveScoreKey(match.group_code, match.team1_name, match.team2_name)]
              : undefined;
            const displayScore = persistedScore || feedScore;
            const displayFinal = scoreFinal || displayScore?.status === "final";
            const isFirstUpcoming = match.id === firstUpcomingMatchId;
            const earned = userScores[match.id];

            return (
              <article
                key={match.id}
                ref={isFirstUpcoming ? firstUpcomingRef : undefined}
                className={`match-cards-grid__card scroll-mt-28 ${styles.matchCard} ${locked ? styles.lockedCard : ""}`}
              >
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

                <div className={`${styles.betBox} ${locked ? styles.lockedBetBox : ""}`}>
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

                {displayScore ? (
                  <div className={styles.finishedSections}>
                    <div className={styles.finalBox}>
                      <p className={styles.boxLabel}>{displayFinal ? t.matches.final : t.matches.liveScore}</p>
                      <div className={styles.finalGrid}>
                        <div className={`${styles.cell} ${styles.homeCol}`}>
                          <p className={styles.finalValue}>{displayScore.homeScore}</p>
                        </div>
                        <span className={styles.sep}>:</span>
                        <div className={`${styles.cell} ${styles.awayCol}`}>
                          <p className={styles.finalValue}>{displayScore.awayScore}</p>
                        </div>
                      </div>
                    </div>

                    {scoreFinal ? (
                      <div className={styles.pointsBox}>
                        <p className={styles.boxLabel}>{t.matches.yourPoints}</p>
                        <p className={styles.pointsValue}>{earned?.points ?? 0}</p>
                        {earned?.reasons.length ? (
                          <p className={styles.pointsReasons}>{formatReasons(earned.reasons)}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {scoreFinal ? (
                      <div className={styles.leadersBox}>
                        <MatchPointsLeaders matchId={match.id} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
      </div>

      <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-auto sm:max-w-none">
        <div className="flex justify-center">
          <PrimaryButton
            onClick={save}
            disabled={saving}
            className={`${saveButtonClassName} w-full shadow-2xl shadow-slate-900/20 sm:w-auto`}
          >
            {saving ? t.matches.saving : t.matches.save}
          </PrimaryButton>
        </div>
      </div>

    </div>
  );
}
