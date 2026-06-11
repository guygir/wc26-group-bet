import {
  DEFAULT_SCORING_RULES,
  type Match,
  type MatchBet,
  type MatchScoreBreakdown,
  type ScoringRules,
  type ScoreReason,
  type Team,
} from "@/lib/types";
import { buildGroupStandingsFifa, type GroupStandingRow } from "@/lib/group-standings-fifa";
import { resultFor } from "@/lib/match-result";

export type TeamStanding = GroupStandingRow;

export { resultFor } from "@/lib/match-result";

export function scoreMatchBetDetailed(
  bet: MatchBet,
  match: Pick<Match, "home_score" | "away_score">,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): MatchScoreBreakdown {
  if (match.home_score === null || match.away_score === null) {
    return { total: 0, reasons: [] };
  }

  const reasons: ScoreReason[] = [];

  if (bet.home_score === match.home_score) {
    reasons.push({
      code: "exact_home",
      points: rules.exact_home_goals_points,
      labelKey: "scoring.exactHome",
    });
  }

  if (bet.away_score === match.away_score) {
    reasons.push({
      code: "exact_away",
      points: rules.exact_away_goals_points,
      labelKey: "scoring.exactAway",
    });
  }

  const predictedDiff = bet.home_score - bet.away_score;
  const actualDiff = match.home_score - match.away_score;
  if (predictedDiff === actualDiff) {
    reasons.push({
      code: "exact_diff",
      points: rules.exact_goal_diff_points,
      labelKey: "scoring.exactDiff",
    });
  }

  if (resultFor(bet.home_score, bet.away_score) === resultFor(match.home_score, match.away_score)) {
    reasons.push({
      code: "correct_result",
      points: rules.correct_result_points,
      labelKey: "scoring.correctResult",
    });
  }

  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  return { total, reasons };
}

export function scoreMatchBet(
  bet: MatchBet,
  match: Pick<Match, "home_score" | "away_score">,
  rules: ScoringRules = DEFAULT_SCORING_RULES
) {
  return scoreMatchBetDetailed(bet, match, rules).total;
}

/** Group table order per FIFA WC26 tie-breakers (see group-standings-fifa.ts). */
export function buildGroupStandings(teams: Team[], matches: Match[]) {
  return buildGroupStandingsFifa(teams, matches);
}

export function scoreGroupStandingBetDetailed(
  predictedTeamIds: string[],
  actualTeamIds: string[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
) {
  const reasons: ScoreReason[] = [];
  let correctCount = 0;

  predictedTeamIds.forEach((predictedTeamId, index) => {
    if (actualTeamIds[index] === predictedTeamId) {
      correctCount += 1;
      reasons.push({
        code: "group_position",
        points: rules.group_correct_position_points,
        labelKey: "scoring.groupPosition",
      });
    }
  });

  if (correctCount === 4 && predictedTeamIds.length === 4) {
    reasons.push({
      code: "group_perfect",
      points: rules.group_perfect_bonus_points,
      labelKey: "scoring.groupPerfect",
    });
  }

  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  return { total, reasons, correctCount };
}

export function scoreGroupStandingBet(
  predictedTeamIds: string[],
  actualTeamIds: string[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
) {
  return scoreGroupStandingBetDetailed(predictedTeamIds, actualTeamIds, rules).total;
}

export function matchHasFinalScore(match: Pick<Match, "home_score" | "away_score"> & Partial<Pick<Match, "status">>) {
  const hasScore = match.home_score !== null && match.away_score !== null;
  return match.status ? match.status === "final" && hasScore : hasScore;
}
