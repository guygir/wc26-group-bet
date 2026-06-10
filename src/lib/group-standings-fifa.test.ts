import { describe, expect, it } from "vitest";
import { buildGroupStandingsFifa } from "@/lib/group-standings-fifa";
import type { Match, Team } from "@/lib/types";

function match(team1_id: string, team2_id: string, home_score: number, away_score: number, index: number): Match {
  return {
    id: `m${index}`,
    source_key: `m${index}`,
    match_number: index,
    round: "Matchday",
    group_code: "Group A",
    team1_id,
    team2_id,
    team1_name: team1_id,
    team2_name: team2_id,
    kickoff_at: "2026-06-01T00:00:00.000Z",
    venue: null,
    status: "final",
    home_score,
    away_score,
  };
}

describe("buildGroupStandingsFifa", () => {
  const teams: Team[] = [
    { id: "a", name: "A", group_code: "Group A" },
    { id: "b", name: "B", group_code: "Group A" },
    { id: "c", name: "C", group_code: "Group A" },
    { id: "d", name: "D", group_code: "Group A" },
  ];

  it("matches the full-group table from scoring.test fixtures", () => {
    const matches = [
      match("a", "b", 2, 0, 0),
      match("a", "c", 1, 1, 1),
      match("a", "d", 3, 0, 2),
      match("b", "c", 1, 0, 3),
      match("b", "d", 2, 2, 4),
      match("c", "d", 4, 1, 5),
    ];
    expect(buildGroupStandingsFifa(teams, matches).map((row) => row.teamId)).toEqual(["a", "b", "c", "d"]);
  });

  it("uses head-to-head (step one) when two teams are level on overall points", () => {
    const tied: Team[] = [
      { id: "x", name: "X", group_code: "Group A" },
      { id: "y", name: "Y", group_code: "Group A" },
      { id: "z", name: "Z", group_code: "Group A" },
      { id: "w", name: "W", group_code: "Group A" },
    ];
    const matches = [
      match("x", "y", 2, 0, 0),
      match("z", "w", 3, 0, 1),
      match("x", "z", 0, 3, 2),
      match("y", "w", 0, 3, 3),
      match("x", "w", 3, 0, 4),
      match("y", "z", 3, 0, 5),
    ];
    expect(buildGroupStandingsFifa(tied, matches).map((row) => row.teamId)).toEqual(["z", "x", "w", "y"]);
  });

  it("ranks live partial groups with only finished matches", () => {
    const partial = [match("a", "b", 1, 0, 0), match("c", "d", 2, 2, 1)];
    const rows = buildGroupStandingsFifa(teams, partial);
    expect(rows.find((row) => row.teamId === "a")?.points).toBe(3);
    expect(rows.find((row) => row.teamId === "c")?.points).toBe(1);
    expect(rows[0].teamId).toBe("a");
  });

  it("ranks a team with points above teams on zero after one result", () => {
    const partial = [match("a", "b", 1, 1, 0)];
    const order = buildGroupStandingsFifa(teams, partial).map((row) => row.teamId);
    expect(order[0]).toBe("a");
    expect(order[1]).toBe("b");
    expect(buildGroupStandingsFifa(teams, partial).find((row) => row.teamId === "a")?.points).toBe(1);
    expect(buildGroupStandingsFifa(teams, partial).find((row) => row.teamId === "c")?.points).toBe(0);
  });
});
