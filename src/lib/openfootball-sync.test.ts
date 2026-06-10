import { describe, expect, it } from "vitest";
import { openFootballScoreIsSafeFinal, resolveSyncedMatchScore } from "@/lib/openfootball-sync";

describe("openFootballScoreIsSafeFinal", () => {
  const match = {
    date: "2026-06-10",
    time: "18:00 UTC+0",
    score: { ft: [2, 1] as [number, number] },
  };

  it("ignores score payloads during the expected match window", () => {
    expect(openFootballScoreIsSafeFinal(match, new Date("2026-06-10T19:30:00.000Z"))).toBe(false);
  });

  it("accepts score payloads once the match is safely old", () => {
    expect(openFootballScoreIsSafeFinal(match, new Date("2026-06-10T21:01:00.000Z"))).toBe(true);
  });

  it("accepts explicit final statuses even before the time buffer", () => {
    expect(
      openFootballScoreIsSafeFinal({ ...match, status: "final" }, new Date("2026-06-10T19:30:00.000Z"))
    ).toBe(true);
  });

  it("does not treat missing scores as final", () => {
    expect(openFootballScoreIsSafeFinal({ ...match, score: undefined }, new Date("2026-06-10T23:00:00.000Z"))).toBe(
      false
    );
  });

  it("preserves existing/manual scores when upstream has no safe final", () => {
    expect(
      resolveSyncedMatchScore(
        match,
        { status: "final", homeScore: 4, awayScore: 2 },
        new Date("2026-06-10T19:30:00.000Z")
      )
    ).toEqual({ status: "final", homeScore: 4, awayScore: 2 });
  });

  it("updates to the upstream score once it is safely final", () => {
    expect(
      resolveSyncedMatchScore(
        match,
        { status: "final", homeScore: 4, awayScore: 2 },
        new Date("2026-06-10T21:01:00.000Z")
      )
    ).toEqual({ status: "final", homeScore: 2, awayScore: 1 });
  });
});
