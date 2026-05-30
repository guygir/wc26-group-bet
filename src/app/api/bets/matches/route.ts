import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type IncomingBet = {
  matchId: string;
  homeScore: number;
  awayScore: number;
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
    return NextResponse.json({ error: "No bets to save" }, { status: 400 });
  }

  const rows = bets.map((bet) => {
    if (
      !bet.matchId ||
      !Number.isInteger(bet.homeScore) ||
      !Number.isInteger(bet.awayScore) ||
      bet.homeScore < 0 ||
      bet.awayScore < 0
    ) {
      throw new Error("Scores must be non-negative integers");
    }

    return {
      user_id: user.id,
      match_id: bet.matchId,
      home_score: bet.homeScore,
      away_score: bet.awayScore,
    };
  });

  const { error } = await supabase.from("match_bets").upsert(rows, { onConflict: "user_id,match_id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, saved: rows.length });
}
