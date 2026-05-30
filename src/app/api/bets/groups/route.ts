import { NextRequest, NextResponse } from "next/server";
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

  const { error } = await supabase.from("group_standing_bets").upsert(rows, {
    onConflict: "user_id,group_code",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, saved: rows.length });
}
