import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOpenFootball } from "@/lib/openfootball-sync";
import { recomputeAllScores } from "@/lib/recompute";

export async function POST(request: NextRequest) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  try {
    const admin = createAdminClient();
    const sync = await syncOpenFootball(admin);
    const scoring = await recomputeAllScores(admin);

    return NextResponse.json({ success: true, sync, scoring });
  } catch (error) {
    console.error("Fixture sync failed", error);
    return NextResponse.json({ error: "Fixture sync failed" }, { status: 500 });
  }
}
