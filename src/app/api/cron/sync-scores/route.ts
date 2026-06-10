import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { syncOpenFootball } from "@/lib/openfootball-sync";
import { recomputeAllScores } from "@/lib/recompute";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  try {
    const admin = createAdminClient();
    const sync = await syncOpenFootball(admin);
    const scoring = await recomputeAllScores(admin);
    return NextResponse.json({ success: true, sync, scoring });
  } catch (error) {
    console.error("Cron sync failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 });
  }
}
