import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const { matchId } = await params;
  const body = (await request.json()) as { homeScore?: number; awayScore?: number };
  const { homeScore, awayScore } = body;

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore === undefined ||
    awayScore === undefined ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Scores must be non-negative integers" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: "final",
    })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const scoring = await recomputeAllScores(admin);
  return NextResponse.json({ success: true, scoring });
}
