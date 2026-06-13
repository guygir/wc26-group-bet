import { NextRequest, NextResponse } from "next/server";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type IncomingBet = {
  groupCode: string;
  orderedTeamIds: string[];
};

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as { bets?: IncomingBet[] };
  const bets = body.bets || [];

  if (!bets.length) {
    return NextResponse.json({ error: "No group bets to save" }, { status: 400 });
  }

  const rows = bets.map((bet) => {
    if (!/^Group [A-L]$/.test(bet.groupCode) || bet.orderedTeamIds.length !== 4) {
      throw new Error("Each group bet must contain exactly four teams");
    }

    return {
      user_id: user.id,
      group_code: bet.groupCode,
      ordered_team_ids: bet.orderedTeamIds,
    };
  });

  const admin = createAdminClient();
  const groupCodes = [...new Set(rows.map((row) => row.group_code))];
  const { data: matches, error: matchesError } = await admin
    .from("matches")
    .select("group_code,kickoff_at")
    .in("group_code", groupCodes);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 400 });
  }

  const firstKickoffs = new Map<string, number>();
  for (const match of matches || []) {
    const time = new Date(match.kickoff_at as string).getTime();
    const current = firstKickoffs.get(match.group_code as string);
    if (Number.isFinite(time) && (current === undefined || time < current)) {
      firstKickoffs.set(match.group_code as string, time);
    }
  }

  const now = Date.now();
  const lockedGroup = groupCodes.some((groupCode) => {
    const firstKickoff = firstKickoffs.get(groupCode);
    return firstKickoff !== undefined && firstKickoff <= now;
  });

  if (lockedGroup) {
    return NextResponse.json({ error: "One or more groups are locked" }, { status: 423 });
  }

  const { error } = await admin.from("group_standing_bets").upsert(rows, {
    onConflict: "user_id,group_code",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const scoring = await recomputeAllScores(admin);
  revalidateLivePages();

  return NextResponse.json({ success: true, saved: rows.length, scoring });
}
