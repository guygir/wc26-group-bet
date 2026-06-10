import { MatchBetsForm } from "@/components/match-bets-form";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card, CtaLink } from "@/components/ui";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { scoreMatchBetDetailed, matchHasFinalScore } from "@/lib/scoring";
import { pickScoringRules, SCORING_RULES_SELECT } from "@/lib/scoring-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Match, ScoreReason } from "@/lib/types";

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
          <CtaLink className="mt-5" href="/auth/login">
            {t.auth.loginSubmit}
          </CtaLink>
        </Card>
      </SiteShell>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: matches }, { data: bets }, { data: userScores }] = await Promise.all([
    supabase.from("matches").select("*").not("group_code", "is", null).order("kickoff_at"),
    supabase.from("match_bets").select("match_id,home_score,away_score").eq("user_id", user.id),
    supabase.from("computed_scores").select("source_id,points,detail").eq("user_id", user.id).eq("source_type", "match"),
  ]);

  const scoreByMatch = new Map(
    (userScores || []).map((row) => [
      row.source_id,
      {
        points: row.points as number,
        reasons: ((row.detail as { reasons?: ScoreReason[] })?.reasons || []) as ScoreReason[],
      },
    ])
  );

  const matchList = (matches || []) as Match[];
  const betList = bets || [];
  const missingFinalScores = betList.some((bet) => {
    const match = matchList.find((row) => row.id === bet.match_id);
    return match && matchHasFinalScore(match) && !scoreByMatch.has(bet.match_id);
  });

  if (missingFinalScores && isAdminConfigured()) {
    const admin = createAdminClient();
    const { data: rulesRow } = await admin.from("scoring_rules").select(SCORING_RULES_SELECT).eq("id", true).maybeSingle();
    const rules = pickScoringRules(rulesRow as Record<string, unknown> | null);

    for (const bet of betList) {
      const match = matchList.find((row) => row.id === bet.match_id);
      if (!match || !matchHasFinalScore(match) || scoreByMatch.has(bet.match_id)) continue;

      const breakdown = scoreMatchBetDetailed(
        { match_id: bet.match_id, home_score: bet.home_score, away_score: bet.away_score },
        match,
        rules
      );
      scoreByMatch.set(bet.match_id, { points: breakdown.total, reasons: breakdown.reasons });
    }
  }

  return (
    <SiteShell profile={profile}>
      {matches?.length ? (
        <MatchBetsForm
          matches={matchList}
          bets={bets || []}
          userScores={Object.fromEntries(scoreByMatch)}
        />
      ) : (
        <Card className="p-8">
          <h1 className="text-3xl font-black">{t.matches.empty}</h1>
          <p className="mt-2 text-slate-600">{t.matches.emptyBody}</p>
        </Card>
      )}
    </SiteShell>
  );
}
