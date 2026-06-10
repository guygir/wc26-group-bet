import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function POST(_request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(_request);
  if (forbidden) return forbidden;

  const { matchId } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      status: "scheduled",
    })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("computed_scores").delete().eq("source_type", "match").eq("source_id", matchId);

  const scoring = await recomputeAllScores(admin);
  revalidateLivePages();
  return NextResponse.json({ success: true, scoring });
}
