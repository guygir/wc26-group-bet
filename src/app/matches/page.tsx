import Link from "next/link";
import { MatchBetsForm } from "@/components/match-bets-form";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUserProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/types";

export default async function MatchesPage() {
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
  const [{ data: matches }, { data: bets }] = await Promise.all([
    supabase.from("matches").select("*").not("group_code", "is", null).order("kickoff_at"),
    supabase.from("match_bets").select("match_id,home_score,away_score").eq("user_id", user.id),
  ]);

  return (
    <SiteShell profile={profile}>
      {matches?.length ? (
        <MatchBetsForm matches={matches as Match[]} bets={bets || []} />
      ) : (
        <Card className="p-8">
          <h1 className="text-3xl font-black">{t.matches.empty}</h1>
          <p className="mt-2 text-slate-600">{t.matches.emptyBody}</p>
        </Card>
      )}
    </SiteShell>
  );
}
