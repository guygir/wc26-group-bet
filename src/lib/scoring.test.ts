import { describe, expect, it } from "vitest";
import { buildGroupStandings, scoreGroupStandingBet, scoreMatchBet, scoreMatchBetDetailed } from "@/lib/scoring";
import { DEFAULT_SCORING_RULES } from "@/lib/types";
import type { Match, Team } from "@/lib/types";

describe("scoreMatchBetDetailed", () => {
  it("stacks all applicable rules up to 6", () => {
    const breakdown = scoreMatchBetDetailed(
      { match_id: "m1", home_score: 3, away_score: 1 },
      { home_score: 3, away_score: 1 },
      DEFAULT_SCORING_RULES
    );
    expect(breakdown.total).toBe(6);
    expect(breakdown.reasons).toHaveLength(4);
  });

  it("awards diff for away-win margin", () => {
    const breakdown = scoreMatchBetDetailed(
      { match_id: "m1", home_score: 0, away_score: 2 },
      { home_score: 1, away_score: 3 },
      DEFAULT_SCORING_RULES
    );
    expect(breakdown.reasons.some((r) => r.code === "exact_diff")).toBe(true);
    expect(breakdown.reasons.some((r) => r.code === "correct_result")).toBe(true);
  });

  it("awards 1 point for exact away goals only (e.g. bet 3-2, final 2-2)", () => {
    const breakdown = scoreMatchBetDetailed(
      { match_id: "m1", home_score: 3, away_score: 2 },
      { home_score: 2, away_score: 2 },
      DEFAULT_SCORING_RULES
    );
    expect(breakdown.total).toBe(1);
    expect(breakdown.reasons).toEqual([
      expect.objectContaining({ code: "exact_away", points: 1 }),
    ]);
  });

  it("awards no points before final score", () => {
    expect(
      scoreMatchBet(
        { match_id: "m1", home_score: 0, away_score: 0 },
        { home_score: null, away_score: null }
      )
    ).toBe(0);
  });
});

describe("group standings scoring", () => {
  const teams: Team[] = [
    { id: "a", name: "A", group_code: "Group A" },
    { id: "b", name: "B", group_code: "Group A" },
    { id: "c", name: "C", group_code: "Group A" },
    { id: "d", name: "D", group_code: "Group A" },
  ];

  const matches = [
    ["a", "b", 2, 0],
    ["a", "c", 1, 1],
    ["a", "d", 3, 0],
    ["b", "c", 1, 0],
    ["b", "d", 2, 2],
    ["c", "d", 4, 1],
  ].map(([team1_id, team2_id, home_score, away_score], index) => ({
    id: `m${index}`,
    source_key: `m${index}`,
    match_number: index,
    round: "Matchday",
    group_code: "Group A",
    team1_id,
    team2_id,
    team1_name: String(team1_id),
    team2_name: String(team2_id),
    kickoff_at: "2026-06-01T00:00:00.000Z",
    venue: null,
    status: "final",
    home_score,
    away_score,
  })) as Match[];

  it("builds a points, goal difference, goals-for table", () => {
    expect(buildGroupStandings(teams, matches).map((standing) => standing.teamId)).toEqual(["a", "b", "c", "d"]);
  });

  it("awards 1 per correct slot and +1 bonus when all four match", () => {
    expect(scoreGroupStandingBet(["a", "b", "c", "d"], ["a", "b", "c", "d"])).toBe(5);
  });

  it("awards partial credit without perfect bonus", () => {
    expect(scoreGroupStandingBet(["c", "a", "b", "d"], ["a", "b", "c", "d"])).toBe(1);
  });
});
