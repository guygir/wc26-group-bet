import { describe, expect, it } from "vitest";
import { buildGroupStandings, scoreGroupStandingBet, scoreMatchBet } from "@/lib/scoring";
import type { Match, Team } from "@/lib/types";

describe("scoreMatchBet", () => {
  it("awards exact score points first", () => {
    expect(
      scoreMatchBet(
        { match_id: "m1", home_score: 2, away_score: 1 },
        { home_score: 2, away_score: 1 }
      )
    ).toBe(3);
  });

  it("awards outcome points for the right winner", () => {
    expect(
      scoreMatchBet(
        { match_id: "m1", home_score: 3, away_score: 1 },
        { home_score: 2, away_score: 1 }
      )
    ).toBe(1);
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
    expect(buildGroupStandings(teams, matches).map((standing) => standing.teamId)).toEqual(["a", "c", "b", "d"]);
  });

  it("awards exact positions and top-two wrong-order points", () => {
    expect(scoreGroupStandingBet(["c", "a", "b", "d"], ["a", "c", "b", "d"])).toBe(8);
  });
});
