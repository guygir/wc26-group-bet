import { buildGroupStandings, scoreGroupStandingBet, scoreMatchBet } from "@/lib/scoring";
import { DEFAULT_SCORING_RULES, type Match, type ScoringRules, type Team } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RuleRow = ScoringRules | null;

export async function recomputeAllScores(admin: SupabaseClient) {
  const { data: rulesRow } = await admin.from("scoring_rules").select("*").eq("id", true).maybeSingle<RuleRow>();
  const rules = rulesRow || DEFAULT_SCORING_RULES;

  const [{ data: matches }, { data: teams }, { data: matchBets }, { data: groupBets }] = await Promise.all([
    admin.from("matches").select("*").not("group_code", "is", null),
    admin.from("teams").select("*").not("group_code", "is", null),
    admin.from("match_bets").select("*"),
    admin.from("group_standing_bets").select("*"),
  ]);

  const scoreRows = [];
  const matchMap = new Map((matches || []).map((match) => [match.id, match as Match]));

  for (const bet of matchBets || []) {
    const match = matchMap.get(bet.match_id);
    if (!match || match.home_score === null || match.away_score === null) continue;

    scoreRows.push({
      user_id: bet.user_id,
      source_type: "match",
      source_id: bet.match_id,
      points: scoreMatchBet(
        { match_id: bet.match_id, home_score: bet.home_score, away_score: bet.away_score },
        match,
        rules
      ),
      detail: {
        predicted: [bet.home_score, bet.away_score],
        actual: [match.home_score, match.away_score],
        match: `${match.team1_name} vs ${match.team2_name}`,
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
    const finishedCount = groupMatches.filter((match) => match.home_score !== null && match.away_score !== null).length;
    if (groupTeams.length !== 4 || finishedCount < 6) continue;

    const actual = buildGroupStandings(groupTeams, groupMatches).map((standing) => standing.teamId);
    const predicted = bet.ordered_team_ids as string[];
    scoreRows.push({
      user_id: bet.user_id,
      source_type: "group",
      source_id: bet.group_code,
      points: scoreGroupStandingBet(predicted, actual, rules),
      detail: { predicted, actual, group: bet.group_code },
      computed_at: new Date().toISOString(),
    });
  }

  if (!scoreRows.length) {
    return { scores: 0 };
  }

  const { error } = await admin
    .from("computed_scores")
    .upsert(scoreRows, { onConflict: "user_id,source_type,source_id" });
  if (error) throw error;

  return { scores: scoreRows.length };
}
