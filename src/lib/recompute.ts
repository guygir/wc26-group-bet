import { actualGroupTeamIds } from "@/lib/group-actual-order";
import { fetchOfficialStandings } from "@/lib/group-official-standings";
import { matchHasFinalScore, scoreGroupStandingBetDetailed, scoreMatchBetDetailed } from "@/lib/scoring";
import { pickScoringRules, SCORING_RULES_SELECT } from "@/lib/scoring-rules";
import type { Match, Team } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recomputeAllScores(admin: SupabaseClient) {
  const { data: rulesRow } = await admin.from("scoring_rules").select(SCORING_RULES_SELECT).eq("id", true).maybeSingle();
  const rules = pickScoringRules(rulesRow as Record<string, unknown> | null);

  const [{ data: matches }, { data: teams }, { data: matchBets }, { data: groupBets }, officialRows] =
    await Promise.all([
      admin.from("matches").select("*").not("group_code", "is", null),
      admin.from("teams").select("*").not("group_code", "is", null),
      admin.from("match_bets").select("*"),
      admin.from("group_standing_bets").select("*"),
      fetchOfficialStandings(admin),
    ]);

  const officialByGroup = new Map(officialRows.map((row) => [row.group_code, row.ordered_team_ids]));

  const scoreRows: {
    user_id: string;
    source_type: "match" | "group";
    source_id: string;
    points: number;
    detail: Record<string, unknown>;
    computed_at: string;
  }[] = [];

  const activeMatchIds = new Set<string>();
  const activeGroupCodes = new Set<string>();
  const matchMap = new Map((matches || []).map((match) => [match.id, match as Match]));

  for (const bet of matchBets || []) {
    const match = matchMap.get(bet.match_id);
    if (!match || !matchHasFinalScore(match)) continue;

    activeMatchIds.add(bet.match_id);
    const breakdown = scoreMatchBetDetailed(
      { match_id: bet.match_id, home_score: bet.home_score, away_score: bet.away_score },
      match,
      rules
    );

    scoreRows.push({
      user_id: bet.user_id,
      source_type: "match",
      source_id: bet.match_id,
      points: breakdown.total,
      detail: {
        predicted: [bet.home_score, bet.away_score],
        actual: [match.home_score, match.away_score],
        match: `${match.team1_name} vs ${match.team2_name}`,
        reasons: breakdown.reasons,
      },
      computed_at: new Date().toISOString(),
    });
  }

  const teamsByGroup = new Map<string, Team[]>();
  for (const team of (teams || []) as Team[]) {
    teamsByGroup.set(team.group_code, [...(teamsByGroup.get(team.group_code) || []), team]);
  }

  const matchesByGroup = new Map<string, Match[]>();
  for (const match of (matches || []) as Match[]) {
    if (!match.group_code) continue;
    matchesByGroup.set(match.group_code, [...(matchesByGroup.get(match.group_code) || []), match]);
  }

  for (const bet of groupBets || []) {
    const groupTeams = teamsByGroup.get(bet.group_code) || [];
    const groupMatches = matchesByGroup.get(bet.group_code) || [];
    const actual = actualGroupTeamIds(groupTeams, groupMatches, officialByGroup.get(bet.group_code));
    if (!actual) continue;

    activeGroupCodes.add(bet.group_code);
    const predicted = bet.ordered_team_ids as string[];
    const breakdown = scoreGroupStandingBetDetailed(predicted, actual, rules);

    scoreRows.push({
      user_id: bet.user_id,
      source_type: "group",
      source_id: bet.group_code,
      points: breakdown.total,
      detail: { predicted, actual, group: bet.group_code, reasons: breakdown.reasons },
      computed_at: new Date().toISOString(),
    });
  }

  const allMatchIds = [...matchMap.keys()];
  if (allMatchIds.length) {
    const staleMatchIds = allMatchIds.filter((id) => !activeMatchIds.has(id));
    if (staleMatchIds.length) {
      await admin.from("computed_scores").delete().eq("source_type", "match").in("source_id", staleMatchIds);
    }
  }

  const allGroupCodes = [...teamsByGroup.keys()];
  if (allGroupCodes.length) {
    const staleGroupCodes = allGroupCodes.filter((code) => !activeGroupCodes.has(code));
    if (staleGroupCodes.length) {
      await admin.from("computed_scores").delete().eq("source_type", "group").in("source_id", staleGroupCodes);
    }
  }

  if (scoreRows.length) {
    const { error } = await admin
      .from("computed_scores")
      .upsert(scoreRows, { onConflict: "user_id,source_type,source_id" });
    if (error) throw error;
  }

  return { scores: scoreRows.length };
}
