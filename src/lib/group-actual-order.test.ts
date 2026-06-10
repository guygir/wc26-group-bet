import { describe, expect, it } from "vitest";
import { actualGroupTeamIds, liveGroupTeamIds } from "@/lib/group-actual-order";
import type { Match, Team } from "@/lib/types";

const teams: Team[] = [
  { id: "a", name: "A", group_code: "Group A" },
  { id: "b", name: "B", group_code: "Group A" },
  { id: "c", name: "C", group_code: "Group A" },
  { id: "d", name: "D", group_code: "Group A" },
];

function match(team1_id: string, team2_id: string, home_score: number, away_score: number): Match {
  return {
    id: "m1",
    source_key: "m1",
    match_number: 1,
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

describe("actualGroupTeamIds", () => {
  it("prefers admin override over live table", () => {
    expect(actualGroupTeamIds(teams, [], ["d", "c", "b", "a"])).toEqual(["d", "c", "b", "a"]);
  });

  it("uses live FIFA standings with no finished matches (pre-tournament tie-breakers)", () => {
    const order = actualGroupTeamIds(teams, [], null);
    expect(order).toHaveLength(4);
    expect(new Set(order)).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("uses live FIFA standings after partial group results", () => {
    const order = actualGroupTeamIds(teams, [match("a", "b", 2, 0)], null);
    expect(order?.[0]).toBe("a");
  });

  it("liveGroupTeamIds ignores admin override", () => {
    const matches = [match("a", "b", 1, 1)];
    expect(liveGroupTeamIds(teams, matches)?.[0]).toBe("a");
    expect(actualGroupTeamIds(teams, matches, ["b", "a", "c", "d"])?.[0]).toBe("b");
  });
});
