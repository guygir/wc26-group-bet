import { NextRequest, NextResponse } from "next/server";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const matchIds = [...new Set(rows.map((row) => row.match_id))];
  const { data: lockedMatches, error: lockError } = await supabase
    .from("matches")
    .select("id,kickoff_at,status")
    .in("id", matchIds);

  if (lockError) {
    return NextResponse.json({ error: lockError.message }, { status: 400 });
  }

  const now = Date.now();
  const locked = (lockedMatches || []).some(
    (match) => match.status !== "scheduled" || new Date(match.kickoff_at as string).getTime() <= now
  );

  if (locked) {
    return NextResponse.json({ error: "One or more matches are locked" }, { status: 423 });
  }

  const { error } = await supabase.from("match_bets").upsert(rows, { onConflict: "user_id,match_id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const admin = createAdminClient();
  const scoring = await recomputeAllScores(admin);
  revalidateLivePages();

  return NextResponse.json({ success: true, saved: rows.length, scoring });
}
