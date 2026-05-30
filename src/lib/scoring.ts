import { DEFAULT_SCORING_RULES, type Match, type MatchBet, type ScoringRules, type Team } from "@/lib/types";

type Result = "home" | "away" | "draw";

export type TeamStanding = {
  teamId: string;
  played: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
};

export function resultFor(home: number, away: number): Result {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function scoreMatchBet(
  bet: MatchBet,
  match: Pick<Match, "home_score" | "away_score">,
  rules: ScoringRules = DEFAULT_SCORING_RULES
) {
  if (match.home_score === null || match.away_score === null) {
    return 0;
  }

  if (bet.home_score === match.home_score && bet.away_score === match.away_score) {
    return rules.exact_score_points;
  }

  return resultFor(bet.home_score, bet.away_score) === resultFor(match.home_score, match.away_score)
    ? rules.correct_outcome_points
    : 0;
}

export function buildGroupStandings(teams: Team[], matches: Match[]) {
  const table = new Map<string, TeamStanding>();

  for (const team of teams) {
    table.set(team.id, {
      teamId: team.id,
      played: 0,
      points: 0,
      goalDifference: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  for (const match of matches) {
    if (
      !match.team1_id ||
      !match.team2_id ||
      match.home_score === null ||
      match.away_score === null ||
      !table.has(match.team1_id) ||
      !table.has(match.team2_id)
    ) {
      continue;
    }

    const home = table.get(match.team1_id)!;
    const away = table.get(match.team2_id)!;
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    const result = resultFor(match.home_score, match.away_score);
    if (result === "home") home.points += 3;
    if (result === "away") away.points += 3;
    if (result === "draw") {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()].sort((a, b) => {
    const byPoints = b.points - a.points;
    if (byPoints) return byPoints;
    const byGoalDifference = b.goalDifference - a.goalDifference;
    if (byGoalDifference) return byGoalDifference;
    const byGoalsFor = b.goalsFor - a.goalsFor;
    if (byGoalsFor) return byGoalsFor;
    return a.teamId.localeCompare(b.teamId);
  });
}

export function scoreGroupStandingBet(
  predictedTeamIds: string[],
  actualTeamIds: string[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
) {
  const actualTopTwo = new Set(actualTeamIds.slice(0, 2));

  return predictedTeamIds.reduce((points, predictedTeamId, index) => {
    if (actualTeamIds[index] === predictedTeamId) {
      return points + rules.exact_group_position_points;
    }

    if (index < 2 && actualTopTwo.has(predictedTeamId)) {
      return points + rules.qualified_wrong_order_points;
    }

    return points;
  }, 0);
}
