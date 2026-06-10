import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const { matchId } = await params;
  const body = (await request.json()) as { locked?: boolean };
  const locked = Boolean(body.locked);

  const admin = createAdminClient();
  const { data: match, error: matchError } = await admin
    .from("matches")
    .select("status,home_score,away_score")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 400 });
  }

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status === "final" || match.home_score !== null || match.away_score !== null) {
    return NextResponse.json({ error: "Final matches cannot be debug-locked" }, { status: 400 });
  }

  const { error } = await admin
    .from("matches")
    .update({ status: locked ? "in_progress" : "scheduled" })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateLivePages();
  return NextResponse.json({ success: true, locked });
}
