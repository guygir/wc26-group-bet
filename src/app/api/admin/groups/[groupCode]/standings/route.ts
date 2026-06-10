import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GroupCode } from "@/lib/types";

type Params = {
  params: Promise<{ groupCode: string }>;
};

function decodeGroupCode(raw: string): GroupCode | null {
  const code = decodeURIComponent(raw);
  return /^Group [A-L]$/.test(code) ? (code as GroupCode) : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const groupCode = decodeGroupCode((await params).groupCode);
  if (!groupCode) {
    return NextResponse.json({ error: "Invalid group code" }, { status: 400 });
  }

  const body = (await request.json()) as { orderedTeamIds?: string[] };
  const orderedTeamIds = body.orderedTeamIds || [];

  if (orderedTeamIds.length !== 4) {
    return NextResponse.json({ error: "Each group must have exactly four teams in order" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: teams, error: teamsError } = await admin
    .from("teams")
    .select("id")
    .eq("group_code", groupCode);

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 400 });
  }

  const teamIds = new Set((teams || []).map((team) => team.id));
  if (teamIds.size !== 4 || !orderedTeamIds.every((id) => teamIds.has(id))) {
    return NextResponse.json({ error: "Order must include each team in the group exactly once" }, { status: 400 });
  }

  const { error } = await admin.from("group_official_standings").upsert(
    {
      group_code: groupCode,
      ordered_team_ids: orderedTeamIds,
    },
    { onConflict: "group_code" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const scoring = await recomputeAllScores(admin);
  revalidateLivePages();
  return NextResponse.json({ success: true, scoring });
}
