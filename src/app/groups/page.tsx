import Link from "next/link";
import { GroupBetsForm } from "@/components/group-bets-form";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { liveGroupTeamIds } from "@/lib/group-actual-order";
import { buildGroupStats, type GroupStandingRow } from "@/lib/group-standings-fifa";
import { fetchOfficialStandings } from "@/lib/group-official-standings";
import { t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GroupCode, Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const GROUP_ORDER: GroupCode[] = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Group G",
  "Group H",
  "Group I",
  "Group J",
  "Group K",
  "Group L",
];

export default async function GroupsPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return (
      <SiteShell profile={profile}>
        <SetupNotice />
      </SiteShell>
    );
  }

  if (!user) {
    return (
      <SiteShell profile={profile}>
        <Card className="p-8 text-center">
          <h1 className="text-3xl font-black">{t.auth.loginTitle}</h1>
          <Link
            className="mt-5 inline-block rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white"
            href="/auth/login"
          >
            {t.auth.loginSubmit}
          </Link>
        </Card>
      </SiteShell>
    );
  }

  const admin = createAdminClient();
  const supabase = await createServerSupabaseClient();

  const [{ data: teams }, { data: bets }, { data: matches }, officials, { data: groupScores }] =
    await Promise.all([
      admin.from("teams").select("*").not("group_code", "is", null).order("group_code").order("name"),
      supabase.from("group_standing_bets").select("group_code,ordered_team_ids").eq("user_id", user.id),
      admin.from("matches").select("*").not("group_code", "is", null),
      fetchOfficialStandings(admin),
      supabase
        .from("computed_scores")
        .select("source_id,points")
        .eq("user_id", user.id)
        .eq("source_type", "group"),
    ]);

  const officialByGroup = new Map(officials.map((row) => [row.group_code, row.ordered_team_ids]));

  const grouped: Record<string, Team[]> = {};
  for (const team of (teams || []) as Team[]) {
    grouped[team.group_code] = [...(grouped[team.group_code] || []), team];
  }

  const matchesByGroup = new Map<string, Match[]>();
  for (const match of (matches || []) as Match[]) {
    if (!match.group_code) continue;
    matchesByGroup.set(match.group_code, [...(matchesByGroup.get(match.group_code) || []), match]);
  }

  const firstKickoffs: Record<string, string> = {};
  for (const match of matches || []) {
    if (match.group_code && !firstKickoffs[match.group_code]) {
      firstKickoffs[match.group_code] = match.kickoff_at;
    }
  }

  const liveOrderByGroup: Record<string, string[]> = {};
  const statsByGroup: Record<string, Record<string, GroupStandingRow>> = {};

  for (const groupCode of GROUP_ORDER) {
    const groupTeams = grouped[groupCode];
    if (!groupTeams?.length) continue;

    const groupMatches = matchesByGroup.get(groupCode) || [];
    const statsMap = buildGroupStats(groupTeams, groupMatches);
    const liveIds = liveGroupTeamIds(groupTeams, groupMatches);

    liveOrderByGroup[groupCode] = liveIds || groupTeams.map((team) => team.id);
    statsByGroup[groupCode] = Object.fromEntries(statsMap.entries());
  }

  const pointsByGroup = Object.fromEntries(
    (groupScores || []).map((row) => [row.source_id as string, row.points as number])
  );

  return (
    <SiteShell profile={profile}>
      {Object.keys(grouped).length ? (
        <GroupBetsForm
          groups={grouped}
          bets={bets || []}
          firstKickoffs={firstKickoffs}
          liveOrderByGroup={liveOrderByGroup}
          statsByGroup={statsByGroup}
          pointsByGroup={pointsByGroup}
          overrideGroups={officials.map((row) => row.group_code)}
        />
      ) : (
        <Card className="p-8">
          <h1 className="text-3xl font-black">{t.groups.empty}</h1>
          <p className="mt-2 text-slate-600">{t.matches.emptyBody}</p>
        </Card>
      )}
    </SiteShell>
  );
}
