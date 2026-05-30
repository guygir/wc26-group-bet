import Link from "next/link";
import { GroupBetsForm } from "@/components/group-bets-form";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUserProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export default async function GroupsPage() {
  const { user, profile } = await getCurrentUserProfile();

  if (!isSupabaseConfigured()) {
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

  const supabase = await createServerSupabaseClient();
  const [{ data: teams }, { data: bets }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("*").not("group_code", "is", null).order("group_code").order("name"),
    supabase.from("group_standing_bets").select("group_code,ordered_team_ids").eq("user_id", user.id),
    supabase.from("matches").select("group_code,kickoff_at").not("group_code", "is", null).order("kickoff_at"),
  ]);

  const grouped: Record<string, Team[]> = {};
  for (const team of (teams || []) as Team[]) {
    grouped[team.group_code] = [...(grouped[team.group_code] || []), team];
  }

  const firstKickoffs: Record<string, string> = {};
  for (const match of matches || []) {
    if (match.group_code && !firstKickoffs[match.group_code]) {
      firstKickoffs[match.group_code] = match.kickoff_at;
    }
  }

  return (
    <SiteShell profile={profile}>
      {Object.keys(grouped).length ? (
        <GroupBetsForm groups={grouped} bets={bets || []} firstKickoffs={firstKickoffs} />
      ) : (
        <Card className="p-8">
          <h1 className="text-3xl font-black">{t.groups.empty}</h1>
          <p className="mt-2 text-slate-600">{t.matches.emptyBody}</p>
        </Card>
      )}
    </SiteShell>
  );
}
