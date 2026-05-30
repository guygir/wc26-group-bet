import { AdminPanel } from "@/components/admin-panel";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";
import { getCurrentUserProfile, nicknameIsAdmin } from "@/lib/auth";
import { DEFAULT_SCORING_RULES, type Match, type ScoringRules } from "@/lib/types";
import { isAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
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
  const [{ data: matches }, { data: rules }] = await Promise.all([
    admin.from("matches").select("*").not("group_code", "is", null).order("kickoff_at"),
    admin.from("scoring_rules").select("*").eq("id", true).maybeSingle(),
  ]);

  return (
    <SiteShell profile={profile}>
      <AdminPanel matches={(matches || []) as Match[]} rules={(rules as ScoringRules) || DEFAULT_SCORING_RULES} />
    </SiteShell>
  );
}
