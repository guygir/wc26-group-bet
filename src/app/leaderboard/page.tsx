import Image from "next/image";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card, PageHeader } from "@/components/ui";
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

  const totals = new Map<string, { total: number; match: number; group: number }>();
  for (const row of (scores || []) as ScoreRow[]) {
    const current = totals.get(row.user_id) || { total: 0, match: 0, group: 0 };
    current.total += row.points;
    current[row.source_type] += row.points;
    totals.set(row.user_id, current);
  }

  const rows = ((profiles || []) as Profile[])
    .map((player) => ({ player, score: totals.get(player.user_id) || { total: 0, match: 0, group: 0 } }))
    .sort((a, b) => b.score.total - a.score.total || a.player.nickname.localeCompare(b.player.nickname));

  return (
    <SiteShell profile={profile}>
      <PageHeader title={t.leaderboard.title} body={t.leaderboard.body} />

      <div className="mt-5 space-y-3">
        {rows.map((row, index) => (
          <Card
            as="article"
            key={row.player.user_id}
            className="motion-rise grid grid-cols-[auto_1fr] items-center gap-4 sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 font-black text-emerald-900">
              {index + 1}
            </div>
            <div className="flex items-center gap-3">
              {row.player.avatar_url ? (
                <Image src={row.player.avatar_url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 font-black text-emerald-800">
                  {row.player.nickname.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-black">{row.player.nickname}</h2>
                <p className="text-sm text-slate-500">
                  {t.leaderboard.matches} {row.score.match} · {t.leaderboard.groups} {row.score.group}
                </p>
              </div>
            </div>
            <p className="col-span-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-3xl font-black text-emerald-900 sm:col-span-1 sm:bg-transparent sm:p-0 sm:text-end sm:text-slate-950">
              {row.score.total}
            </p>
          </Card>
        ))}
        {!rows.length ? <Card>{t.leaderboard.empty}</Card> : null}
      </div>
    </SiteShell>
  );
}
