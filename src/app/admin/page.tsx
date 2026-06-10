import { AdminPanel } from "@/components/admin-panel";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUserProfile, nicknameIsAdmin } from "@/lib/auth";
import { pickScoringRules, SCORING_RULES_SELECT } from "@/lib/scoring-rules";
import { DEFAULT_SCORING_RULES, type GroupCode, type Match, type ScoringRules, type Team } from "@/lib/types";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { fetchOfficialStandings } from "@/lib/group-official-standings";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const { profile } = await getCurrentUserProfile();

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return (
      <SiteShell profile={profile}>
        <SetupNotice />
      </SiteShell>
    );
  }

  if (!profile?.is_admin && !nicknameIsAdmin(profile?.nickname)) {
    return (
      <SiteShell profile={profile}>
        <Card className="p-8">
          <h1 className="text-3xl font-black">{t.admin.deniedTitle}</h1>
          <p className="mt-2 text-slate-600">{t.admin.deniedBody}</p>
        </Card>
      </SiteShell>
    );
  }

  const admin = createAdminClient();
  const [{ data: matches }, { data: teams }, { data: rulesRow }, officials] = await Promise.all([
    admin.from("matches").select("*").not("group_code", "is", null).order("kickoff_at"),
    admin.from("teams").select("*").not("group_code", "is", null).order("group_code").order("name"),
    admin.from("scoring_rules").select(SCORING_RULES_SELECT).eq("id", true).maybeSingle(),
    fetchOfficialStandings(admin),
  ]);

  const rules: ScoringRules = pickScoringRules(rulesRow as Record<string, unknown> | null) || DEFAULT_SCORING_RULES;

  const groups: Record<string, Team[]> = {};
  for (const team of (teams || []) as Team[]) {
    groups[team.group_code] = [...(groups[team.group_code] || []), team];
  }

  const matchesByGroup: Record<string, Match[]> = {};
  for (const match of (matches || []) as Match[]) {
    if (!match.group_code) continue;
    matchesByGroup[match.group_code] = [...(matchesByGroup[match.group_code] || []), match];
  }

  return (
    <SiteShell profile={profile}>
      <AdminPanel
        matches={(matches || []) as Match[]}
        rules={rules}
        groups={groups}
        matchesByGroup={matchesByGroup}
        officials={officials as { group_code: GroupCode; ordered_team_ids: string[] }[]}
      />
    </SiteShell>
  );
}
