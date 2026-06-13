import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScoreReason } from "@/lib/types";

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
      .order("points", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const exactScores = (scores || []).filter((row) => {
      const reasons = ((row.detail as { reasons?: ScoreReason[] } | null)?.reasons || []).map((reason) => reason.code);
      return reasons.includes("exact_home") && reasons.includes("exact_away");
    });

    const userIds = exactScores.map((row) => row.user_id);
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("user_id,nickname,avatar_url").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const streaks = new Map<string, number>();

    if (userIds.length) {
      const { data: currentMatch } = await admin.from("matches").select("kickoff_at").eq("id", matchId).maybeSingle();
      const { data: finalMatches } = currentMatch?.kickoff_at
        ? await admin
            .from("matches")
            .select("id,kickoff_at")
            .eq("status", "final")
            .lte("kickoff_at", currentMatch.kickoff_at)
            .order("kickoff_at", { ascending: true })
        : { data: [] };
      const matchIds = (finalMatches || []).map((match) => match.id);
      const { data: allExactCandidateScores } = matchIds.length
        ? await admin
            .from("computed_scores")
            .select("user_id,source_id,detail")
            .eq("source_type", "match")
            .in("user_id", userIds)
            .in("source_id", matchIds)
        : { data: [] };
      const exactByUser = new Map<string, Set<string>>();

      for (const row of allExactCandidateScores || []) {
        const reasons = ((row.detail as { reasons?: ScoreReason[] } | null)?.reasons || []).map((reason) => reason.code);
        if (!reasons.includes("exact_home") || !reasons.includes("exact_away")) continue;
        exactByUser.set(row.user_id, new Set([...(exactByUser.get(row.user_id) || []), row.source_id]));
      }

      for (const userId of userIds) {
        let streak = 0;
        const exactMatchIds = exactByUser.get(userId) || new Set<string>();
        for (const match of [...(finalMatches || [])].reverse()) {
          if (!exactMatchIds.has(match.id)) break;
          streak += 1;
        }
        streaks.set(userId, streak);
      }
    }

    const exactHitters = exactScores.map((row) => ({
      userId: row.user_id,
      points: row.points,
      nickname: profileMap.get(row.user_id)?.nickname || "—",
      avatarUrl: profileMap.get(row.user_id)?.avatar_url || null,
      streak: streaks.get(row.user_id) || 1,
      reasons: (row.detail as { reasons?: unknown })?.reasons || [],
    }));

    return NextResponse.json({ exactHitters });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
