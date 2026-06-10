import { describe, expect, it } from "vitest";
import { flagCodeForTeam } from "@/lib/team-flags";

describe("flagCodeForTeam", () => {
  it("maps OpenFootball names that were previously missing", () => {
    expect(flagCodeForTeam("Haiti")).toBe("ht");
    expect(flagCodeForTeam("Turkey")).toBe("tr");
    expect(flagCodeForTeam("Sweden")).toBe("se");
    expect(flagCodeForTeam("Uzbekistan")).toBe("uz");
    expect(flagCodeForTeam("DR Congo")).toBe("cd");
    expect(flagCodeForTeam("Iraq")).toBe("iq");
  });

  it("maps user-requested aliases", () => {
    expect(flagCodeForTeam("Czech Republic")).toBe("cz");
    expect(flagCodeForTeam("Czechia")).toBe("cz");
    expect(flagCodeForTeam("Bosnia & Herzegovina")).toBe("ba");
    expect(flagCodeForTeam("Bosnia and Herzegovina")).toBe("ba");
  });
});
