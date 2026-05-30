import { fetchOpenFootballFixtures, isGroupStageMatch, kickoffIso, sourceKeyForMatch } from "@/lib/fixtures";
import type { OpenFootballPayload } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdmin = SupabaseClient;

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
  const matchRows = data.matches.map((match, index) => {
    const score = match.score?.ft;
    const isGroup = isGroupStageMatch(match);

    return {
      source_key: sourceKeyForMatch(match, index),
      match_number: match.num || null,
      round: match.round,
      group_code: isGroup ? match.group : null,
      team1_id: isGroup ? teamIds.get(match.team1) || null : null,
      team2_id: isGroup ? teamIds.get(match.team2) || null : null,
      team1_name: match.team1,
      team2_name: match.team2,
      kickoff_at: kickoffIso(match.date, match.time),
      venue: match.ground || null,
      status: score ? "final" : "scheduled",
      home_score: score ? score[0] : null,
      away_score: score ? score[1] : null,
      source_payload: match,
      synced_at: new Date().toISOString(),
    };
  });

  const { error: matchesError } = await admin.from("matches").upsert(matchRows, { onConflict: "source_key" });
  if (matchesError) throw matchesError;

  return {
    name: data.name,
    teams: uniqueTeams.length,
    matches: matchRows.length,
    groupStageMatches: groupMatches.length,
  };
}
