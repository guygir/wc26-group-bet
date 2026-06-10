import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card, CtaLink } from "@/components/ui";
import { t } from "@/lib/i18n";

export default async function Home() {
  const { profile } = await getCurrentUserProfile();
  const stats = {
    groupMatches: 0,
    finished: 0,
    users: 0,
  };

  if (isAdminConfigured()) {
    const admin = createAdminClient();
    const [{ count: groupMatches }, { count: finished }, { count: users }] = await Promise.all([
      admin.from("matches").select("id", { count: "exact", head: true }).not("group_code", "is", null),
      admin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .not("group_code", "is", null)
        .not("home_score", "is", null)
        .not("away_score", "is", null),
      admin.from("profiles").select("user_id", { count: "exact", head: true }),
    ]);
    stats.groupMatches = groupMatches || 0;
    stats.finished = finished || 0;
    stats.users = users || 0;
  }

  return (
    <SiteShell profile={profile}>
      <section className="motion-rise overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-emerald-900/20 sm:p-8 md:p-12">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300 sm:text-sm sm:tracking-[0.35em]">
          {t.home.eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl md:text-7xl">{t.home.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg sm:leading-8">{t.home.body}</p>
        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
          <CtaLink href="/matches">{t.home.matchCta}</CtaLink>
          <CtaLink href="/groups" subtle>
            {t.home.groupCta}
          </CtaLink>
          <CtaLink href="/leaderboard" subtle>
            {t.home.standingsCta}
          </CtaLink>
        </div>
      </section>

      {!isSupabaseConfigured() ? (
        <div className="mt-6">
          <SetupNotice />
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [t.home.stats.groupMatches, stats.groupMatches],
          [t.home.stats.finalScores, stats.finished],
          [t.home.stats.players, stats.users],
        ].map(([label, value]) => (
          <Card key={label} className="motion-rise">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-4xl font-black">{value}</p>
          </Card>
        ))}
      </section>
    </SiteShell>
  );
}
