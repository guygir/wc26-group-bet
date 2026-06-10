import type { SupabaseClient } from "@supabase/supabase-js";

export type OfficialStandingRow = {
  group_code: string;
  ordered_team_ids: string[];
};

/** Returns [] if migration 003 was not applied yet. */
export async function fetchOfficialStandings(admin: SupabaseClient): Promise<OfficialStandingRow[]> {
  const { data, error } = await admin.from("group_official_standings").select("group_code,ordered_team_ids");

  if (error) {
    if (error.code === "42P01" || /group_official_standings/i.test(error.message)) {
      return [];
    }
    throw error;
  }

  return (data || []) as OfficialStandingRow[];
}
