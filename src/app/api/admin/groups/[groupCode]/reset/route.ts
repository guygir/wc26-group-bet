import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { revalidateLivePages } from "@/lib/revalidate-pages";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GroupCode } from "@/lib/types";

type Params = {
  params: Promise<{ groupCode: string }>;
};

function decodeGroupCode(raw: string): GroupCode | null {
  const code = decodeURIComponent(raw);
  return /^Group [A-L]$/.test(code) ? (code as GroupCode) : null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const groupCode = decodeGroupCode((await params).groupCode);
  if (!groupCode) {
    return NextResponse.json({ error: "Invalid group code" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("group_official_standings").delete().eq("group_code", groupCode);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("computed_scores").delete().eq("source_type", "group").eq("source_id", groupCode);

  const scoring = await recomputeAllScores(admin);
  revalidateLivePages();
  return NextResponse.json({ success: true, reset: true, scoring });
}
