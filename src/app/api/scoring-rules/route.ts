import { NextResponse } from "next/server";
import { pickScoringRules, SCORING_RULES_SELECT } from "@/lib/scoring-rules";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("scoring_rules").select(SCORING_RULES_SELECT).eq("id", true).maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ rules: pickScoringRules(data as Record<string, unknown> | null) });
  } catch {
    return NextResponse.json({ error: "Scoring rules unavailable" }, { status: 503 });
  }
}
