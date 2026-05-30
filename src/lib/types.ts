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
  exact_score_points: number;
  correct_outcome_points: number;
  exact_group_position_points: number;
  qualified_wrong_order_points: number;
};

export const DEFAULT_SCORING_RULES: ScoringRules = {
  exact_score_points: 3,
  correct_outcome_points: 1,
  exact_group_position_points: 3,
  qualified_wrong_order_points: 1,
};
