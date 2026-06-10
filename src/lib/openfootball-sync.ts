import { fetchOpenFootballFixtures, isGroupStageMatch, kickoffIso, sourceKeyForMatch } from "@/lib/fixtures";
import type { OpenFootballMatch, OpenFootballPayload } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdmin = SupabaseClient;
const MIN_FINAL_SCORE_AGE_MS = 3 * 60 * 60 * 1000;
type ExistingMatchSyncState = {
  status: "scheduled" | "in_progress" | "final";
  homeScore: number | null;
  awayScore: number | null;
};

export function openFootballScoreIsSafeFinal(
  match: Pick<OpenFootballMatch, "date" | "time" | "score" | "status">,
  now = new Date()
) {
  if (!match.score?.ft) return false;

  const status = match.status?.toLowerCase();
  if (status && ["final", "fulltime", "full-time", "ft", "finished", "complete", "completed"].includes(status)) {
    return true;
  }

  return now.getTime() - new Date(kickoffIso(match.date, match.time)).getTime() >= MIN_FINAL_SCORE_AGE_MS;
}

export function resolveSyncedMatchScore(
  match: Pick<OpenFootballMatch, "date" | "time" | "score" | "status">,
  existing?: ExistingMatchSyncState,
  now = new Date()
) {
  const score = openFootballScoreIsSafeFinal(match, now) ? match.score?.ft : undefined;
  const existingHasScore = existing && existing.homeScore !== null && existing.awayScore !== null;
  const status = score
    ? ("final" as const)
    : existingHasScore
      ? existing.status
      : existing?.status === "in_progress"
        ? ("in_progress" as const)
        : ("scheduled" as const);

  return {
    status,
    homeScore: score ? score[0] : existing?.homeScore ?? null,
    awayScore: score ? score[1] : existing?.awayScore ?? null,
  };
}

export async function syncOpenFootball(admin: SupabaseAdmin, payload?: OpenFootballPayload) {
  const data = payload || (await fetchOpenFootballFixtures());
  const groupMatches = data.matches.filter(isGroupStageMatch);

  const teamRows = groupMatches.flatMap((match) => [
    { name: match.team1, group_code: match.group },
    { name: match.team2, group_code: match.group },
  ]);

  const uniqueTeams = [...new Map(teamRows.map((team) => [team.name, team])).values()];
  if (uniqueTeams.length) {
    const { error } = await admin.from("teams").upsert(uniqueTeams, { onConflict: "name" });
    if (error) throw error;
  }

  const { data: teams, error: teamsError } = await admin.from("teams").select("id,name,group_code");
  if (teamsError) throw teamsError;

  const teamIds = new Map((teams || []).map((team) => [team.name, team.id]));
  const sourceKeys = groupMatches.map((match, index) => sourceKeyForMatch(match, index));
  const { data: existingMatches, error: existingMatchesError } = await admin
    .from("matches")
    .select("source_key,status,home_score,away_score")
    .in("source_key", sourceKeys);
  if (existingMatchesError) throw existingMatchesError;

  const existingBySourceKey = new Map(
    (existingMatches || []).map((match) => [
      match.source_key as string,
      {
        status: match.status as "scheduled" | "in_progress" | "final",
        homeScore: match.home_score as number | null,
        awayScore: match.away_score as number | null,
      },
    ])
  );

  const matchRows = groupMatches.map((match, index) => {
    const sourceKey = sourceKeys[index];
    const existing = existingBySourceKey.get(sourceKey);
    const resolved = resolveSyncedMatchScore(match, existing);

    return {
      source_key: sourceKey,
      match_number: match.num || null,
      round: match.round,
      group_code: match.group,
      team1_id: teamIds.get(match.team1) || null,
      team2_id: teamIds.get(match.team2) || null,
      team1_name: match.team1,
      team2_name: match.team2,
      kickoff_at: kickoffIso(match.date, match.time),
      venue: match.ground || null,
      status: resolved.status,
      home_score: resolved.homeScore,
      away_score: resolved.awayScore,
      source_payload: match,
      synced_at: new Date().toISOString(),
    };
  });

  if (matchRows.length) {
    const { error: matchesError } = await admin.from("matches").upsert(matchRows, { onConflict: "source_key" });
    if (matchesError) throw matchesError;
  }

  await admin.from("matches").delete().is("group_code", null);

  return {
    name: data.name,
    teams: uniqueTeams.length,
    matches: matchRows.length,
    groupStageMatches: groupMatches.length,
  };
}
