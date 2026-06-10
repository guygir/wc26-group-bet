import { fifaRankForTeamName } from "@/lib/fifa-world-ranking";
import { resultFor } from "@/lib/match-result";
import type { Match, Team } from "@/lib/types";

export type GroupStandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type ScoredMatch = Pick<Match, "team1_id" | "team2_id" | "home_score" | "away_score">;

function emptyRow(teamId: string): GroupStandingRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function finishedMatches(matches: ScoredMatch[]) {
  return matches.filter(
    (match) =>
      match.team1_id &&
      match.team2_id &&
      match.home_score !== null &&
      match.away_score !== null
  ) as (ScoredMatch & { team1_id: string; team2_id: string; home_score: number; away_score: number })[];
}

/** Full group table from all finished matches (live — partial group stage OK). */
export function buildGroupStats(teams: Team[], matches: ScoredMatch[]) {
  const table = new Map(teams.map((team) => [team.id, emptyRow(team.id)]));

  for (const match of finishedMatches(matches)) {
    const home = table.get(match.team1_id)!;
    const away = table.get(match.team2_id)!;
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    const outcome = resultFor(match.home_score, match.away_score);
    if (outcome === "home") {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (outcome === "away") {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return table;
}

function subsetStats(teamIds: string[], matches: ScoredMatch[]) {
  const allowed = new Set(teamIds);
  const table = new Map(teamIds.map((id) => [id, emptyRow(id)]));

  for (const match of finishedMatches(matches)) {
    if (!allowed.has(match.team1_id) || !allowed.has(match.team2_id)) continue;

    const home = table.get(match.team1_id)!;
    const away = table.get(match.team2_id)!;
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    const outcome = resultFor(match.home_score, match.away_score);
    if (outcome === "home") {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (outcome === "away") {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return table;
}

function compareMini(a: GroupStandingRow, b: GroupStandingRow) {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return 0;
}

function compareStep2(
  a: GroupStandingRow,
  b: GroupStandingRow,
  teamNameById: Map<string, string>,
  fairPlayByTeamId: Map<string, number>
) {
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;

  const fairA = fairPlayByTeamId.get(a.teamId) ?? 0;
  const fairB = fairPlayByTeamId.get(b.teamId) ?? 0;
  if (fairA !== fairB) return fairB - fairA;

  const rankA = fifaRankForTeamName(teamNameById.get(a.teamId) || "");
  const rankB = fifaRankForTeamName(teamNameById.get(b.teamId) || "");
  if (rankA !== rankB) return rankA - rankB;

  return a.teamId.localeCompare(b.teamId);
}

function sameMiniStats(a: GroupStandingRow, b: GroupStandingRow) {
  return a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor;
}

function sameStep2Stats(
  a: GroupStandingRow,
  b: GroupStandingRow,
  teamNameById: Map<string, string>,
  fairPlayByTeamId: Map<string, number>
) {
  if (a.goalDifference !== b.goalDifference || a.goalsFor !== b.goalsFor) return false;
  const fairA = fairPlayByTeamId.get(a.teamId) ?? 0;
  const fairB = fairPlayByTeamId.get(b.teamId) ?? 0;
  if (fairA !== fairB) return false;
  return fifaRankForTeamName(teamNameById.get(a.teamId) || "") === fifaRankForTeamName(teamNameById.get(b.teamId) || "");
}

/**
 * Rank tied teams using FIFA WC26 group criteria
 * (https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/groups-how-teams-qualify-tie-breakers)
 */
function rankTiedTeams(
  teamIds: string[],
  matches: ScoredMatch[],
  fullStats: Map<string, GroupStandingRow>,
  teamNameById: Map<string, string>,
  fairPlayByTeamId: Map<string, number>
): string[] {
  if (teamIds.length <= 1) return teamIds;

  const mini = subsetStats(teamIds, matches);
  const miniRows = teamIds.map((id) => mini.get(id)!);
  const miniAllEqual = miniRows.every((row) => sameMiniStats(row, miniRows[0]));

  if (!miniAllEqual) {
    const sorted = [...teamIds].sort((left, right) =>
      compareMini(mini.get(left)!, mini.get(right)!)
    );
    const clusters: string[][] = [];
    for (const id of sorted) {
      const last = clusters[clusters.length - 1];
      if (!last) {
        clusters.push([id]);
        continue;
      }
      const prev = mini.get(last[0])!;
      const cur = mini.get(id)!;
      if (sameMiniStats(prev, cur)) {
        last.push(id);
      } else {
        clusters.push([id]);
      }
    }
    return clusters.flatMap((cluster) =>
      rankTiedTeams(cluster, matches, fullStats, teamNameById, fairPlayByTeamId)
    );
  }

  const fullRows = teamIds.map((id) => fullStats.get(id)!);
  const step2AllEqual = fullRows.every((row) => sameStep2Stats(row, fullRows[0], teamNameById, fairPlayByTeamId));

  if (!step2AllEqual) {
    const sorted = [...teamIds].sort((left, right) =>
      compareStep2(fullStats.get(left)!, fullStats.get(right)!, teamNameById, fairPlayByTeamId)
    );
    const clusters: string[][] = [];
    for (const id of sorted) {
      const last = clusters[clusters.length - 1];
      if (!last) {
        clusters.push([id]);
        continue;
      }
      const prev = fullStats.get(last[0])!;
      const cur = fullStats.get(id)!;
      if (sameStep2Stats(prev, cur, teamNameById, fairPlayByTeamId)) {
        last.push(id);
      } else {
        clusters.push([id]);
      }
    }
    return clusters.flatMap((cluster) =>
      rankTiedTeams(cluster, matches, fullStats, teamNameById, fairPlayByTeamId)
    );
  }

  return [...teamIds].sort((left, right) => {
    const rankLeft = fifaRankForTeamName(teamNameById.get(left) || "");
    const rankRight = fifaRankForTeamName(teamNameById.get(right) || "");
    if (rankLeft !== rankRight) return rankLeft - rankRight;
    return left.localeCompare(right);
  });
}

/** Ordered standings rows per FIFA WC26 tie-breakers (live from entered scores). */
export function buildGroupStandingsFifa(
  teams: Team[],
  matches: ScoredMatch[],
  options?: { fairPlayByTeamId?: Map<string, number> }
) {
  const fullStats = buildGroupStats(teams, matches);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const fairPlayByTeamId = options?.fairPlayByTeamId ?? new Map<string, number>();

  const pointsGroups = new Map<number, string[]>();
  for (const team of teams) {
    const points = fullStats.get(team.id)!.points;
    pointsGroups.set(points, [...(pointsGroups.get(points) || []), team.id]);
  }

  const orderedIds: string[] = [];
  const pointLevels = [...pointsGroups.keys()].sort((a, b) => b - a);

  for (const points of pointLevels) {
    const tied = pointsGroups.get(points)!;
    orderedIds.push(...rankTiedTeams(tied, matches, fullStats, teamNameById, fairPlayByTeamId));
  }

  return orderedIds.map((teamId) => fullStats.get(teamId)!);
}
