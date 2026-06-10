import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { PageHeader } from "@/components/ui";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";

type Profile = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
};

type ScoreRow = {
  user_id: string;
  source_type: "match" | "group";
  points: number;
};

export default async function LeaderboardPage() {
  const { profile } = await getCurrentUserProfile();

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return (
      <SiteShell profile={profile}>
        <SetupNotice />
      </SiteShell>
    );
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: scores }] = await Promise.all([
    admin.from("profiles").select("user_id,nickname,avatar_url").order("nickname"),
    admin.from("computed_scores").select("user_id,source_type,points"),
  ]);

  const totals = new Map<string, { match: number; group: number }>();
  for (const row of (scores || []) as ScoreRow[]) {
    const current = totals.get(row.user_id) || { match: 0, group: 0 };
    current[row.source_type] += row.points;
    totals.set(row.user_id, current);
  }

  const rows = ((profiles || []) as Profile[]).map((player) => ({
    player,
    score: totals.get(player.user_id) || { match: 0, group: 0 },
  }));

  return (
    <SiteShell profile={profile}>
      <PageHeader title={t.leaderboard.title} body={t.leaderboard.body} />
      <LeaderboardTabs rows={rows} />
    </SiteShell>
  );
}
