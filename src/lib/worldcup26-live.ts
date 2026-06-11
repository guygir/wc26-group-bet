import type { GroupCode } from "@/lib/types";

type WorldCup26Game = {
  group?: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_score?: string;
  away_score?: string;
  finished?: string;
  time_elapsed?: string;
};

export type WorldCup26LiveScore = {
  homeScore: number;
  awayScore: number;
  status: "in_progress" | "final";
};

const DEFAULT_WORLDCUP26_API_URL = "https://worldcup26.ir/get/games";

function normalizeGroup(group: string | undefined): GroupCode | null {
  if (!group) return null;
  const code = group.startsWith("Group ") ? group : `Group ${group}`;
  return /^Group [A-L]$/.test(code) ? (code as GroupCode) : null;
}

function scoreKey(group: GroupCode, team1: string, team2: string) {
  return `${group}::${team1.trim().toLowerCase()}::${team2.trim().toLowerCase()}`;
}

function finished(game: WorldCup26Game) {
  return game.finished?.toUpperCase() === "TRUE" || game.time_elapsed?.toLowerCase() === "finished";
}

function inProgress(game: WorldCup26Game) {
  const elapsed = game.time_elapsed?.toLowerCase();
  return !!elapsed && elapsed !== "notstarted" && elapsed !== "finished";
}

export function worldCup26ScoreKey(group: GroupCode, team1: string, team2: string) {
  return scoreKey(group, team1, team2);
}

export async function fetchWorldCup26LiveScores() {
  const response = await fetch(process.env.WORLDCUP26_API_URL || DEFAULT_WORLDCUP26_API_URL, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WorldCup26 API fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as { games?: WorldCup26Game[] };
  const scores = new Map<string, WorldCup26LiveScore>();

  for (const game of payload.games || []) {
    const group = normalizeGroup(game.group);
    const homeScore = Number(game.home_score);
    const awayScore = Number(game.away_score);
    if (
      !group ||
      !game.home_team_name_en ||
      !game.away_team_name_en ||
      (!finished(game) && !inProgress(game)) ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore)
    ) {
      continue;
    }

    scores.set(scoreKey(group, game.home_team_name_en, game.away_team_name_en), {
      homeScore,
      awayScore,
      status: finished(game) ? "final" : "in_progress",
    });
  }

  return scores;
}
