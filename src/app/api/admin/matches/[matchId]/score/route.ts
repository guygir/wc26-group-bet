import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const { matchId } = await params;
  const body = (await request.json()) as { homeScore?: number | null; awayScore?: number | null };
  const { homeScore, awayScore } = body;

  const admin = createAdminClient();

  if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
    const { error } = await admin
      .from("matches")
      .update({ home_score: null, away_score: null, status: "scheduled" })
      .eq("id", matchId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("computed_scores").delete().eq("source_type", "match").eq("source_id", matchId);
    const scoring = await recomputeAllScores(admin);
    revalidateLivePages();
    return NextResponse.json({ success: true, reset: true, scoring });
  }

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Scores must be non-negative integers" }, { status: 400 });
  }

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
  revalidateLivePages();
  return NextResponse.json({ success: true, scoring });
}
