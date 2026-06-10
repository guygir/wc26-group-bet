export type GroupCode =
  | "Group A"
  | "Group B"
  | "Group C"
  | "Group D"
  | "Group E"
  | "Group F"
  | "Group G"
  | "Group H"
  | "Group I"
  | "Group J"
  | "Group K"
  | "Group L";

export type MatchStatus = "scheduled" | "in_progress" | "final";

export type OpenFootballMatch = {
  round: string;
  num?: number;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: GroupCode;
  ground?: string;
  score?: {
    ft?: [number, number];
  };
  status?: string;
};

export type OpenFootballPayload = {
  name: string;
  matches: OpenFootballMatch[];
};

export type Team = {
  id: string;
  name: string;
  group_code: GroupCode;
};

export type Match = {
  id: string;
  source_key: string;
  match_number: number | null;
  round: string;
  group_code: GroupCode | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_name: string;
  team2_name: string;
  kickoff_at: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
};

export type MatchBet = {
  match_id: string;
  home_score: number;
  away_score: number;
};

export type GroupStandingBet = {
  group_code: GroupCode;
  ordered_team_ids: string[];
};

export type ScoringRules = {
  exact_home_goals_points: number;
  exact_away_goals_points: number;
  exact_goal_diff_points: number;
  correct_result_points: number;
  group_correct_position_points: number;
  group_perfect_bonus_points: number;
};

export const SCORING_RULE_KEYS = [
  "exact_home_goals_points",
  "exact_away_goals_points",
  "exact_goal_diff_points",
  "correct_result_points",
  "group_correct_position_points",
  "group_perfect_bonus_points",
] as const;

export const DEFAULT_SCORING_RULES: ScoringRules = {
  exact_home_goals_points: 1,
  exact_away_goals_points: 1,
  exact_goal_diff_points: 1,
  correct_result_points: 3,
  group_correct_position_points: 1,
  group_perfect_bonus_points: 1,
};

export type MatchScoreReasonCode =
  | "exact_home"
  | "exact_away"
  | "exact_diff"
  | "correct_result";

export type ScoreReason = {
  code: MatchScoreReasonCode | "group_position" | "group_perfect";
  points: number;
  labelKey: string;
};

export type MatchScoreBreakdown = {
  total: number;
  reasons: ScoreReason[];
};
