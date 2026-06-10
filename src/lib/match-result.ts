export type MatchResult = "home" | "away" | "draw";

export function resultFor(home: number, away: number): MatchResult {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}
