import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-auth";
import { recomputeAllScores } from "@/lib/recompute";
import { createAdminClient } from "@/lib/supabase/admin";

const RULE_KEYS = [
  "exact_score_points",
  "correct_outcome_points",
  "exact_group_position_points",
  "qualified_wrong_order_points",
] as const;

export async function PATCH(request: NextRequest) {
  const forbidden = await requireAdminOrCron(request);
  if (forbidden) return forbidden;

  const body = (await request.json()) as Record<string, unknown>;
  const update: Record<string, number | string> = { updated_at: new Date().toISOString() };

  for (const key of RULE_KEYS) {
    const value = body[key];
    if (!Number.isInteger(value) || Number(value) < 0) {
      return NextResponse.json({ error: `${key} must be a non-negative integer` }, { status: 400 });
    }
    update[key] = Number(value);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("scoring_rules").update(update).eq("id", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const scoring = await recomputeAllScores(admin);
  return NextResponse.json({ success: true, scoring });
}
