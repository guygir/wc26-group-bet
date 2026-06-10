import { buildGroupStandingsFifa } from "@/lib/group-standings-fifa";
import type { Match, Team } from "@/lib/types";

/** Live table order from entered scores only (FIFA tie-breakers). Never uses admin override. */
export function liveGroupTeamIds(teams: Team[], matches: Match[]): string[] | null {
  if (teams.length !== 4) {
    return null;
  }

  return buildGroupStandingsFifa(teams, matches).map((standing) => standing.teamId);
}

/** Group order for scoring: admin override, else live FIFA table from entered scores (any number of finals). */
export function actualGroupTeamIds(
  teams: Team[],
  matches: Match[],
  officialOrder: string[] | null | undefined
): string[] | null {
  if (officialOrder?.length === 4) {
    return officialOrder;
  }

  return liveGroupTeamIds(teams, matches);
}
