import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { matchId } = await params;

  try {
    const admin = createAdminClient();
    const { data: scores, error } = await admin
      .from("computed_scores")
      .select("user_id,points,detail")
      .eq("source_type", "match")
      .eq("source_id", matchId)
      .order("points", { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userIds = (scores || []).map((row) => row.user_id);
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("user_id,nickname,avatar_url").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const leaders = (scores || []).map((row) => ({
      userId: row.user_id,
      points: row.points,
      nickname: profileMap.get(row.user_id)?.nickname || "—",
      avatarUrl: profileMap.get(row.user_id)?.avatar_url || null,
      reasons: (row.detail as { reasons?: unknown })?.reasons || [],
    }));

    return NextResponse.json({ leaders });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
