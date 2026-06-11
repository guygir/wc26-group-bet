import { NextResponse } from "next/server";
import { fetchWorldCup26LiveScores } from "@/lib/worldcup26-live";

export async function GET() {
  try {
    const scores = await fetchWorldCup26LiveScores();
    return NextResponse.json({ scores: Object.fromEntries(scores) });
  } catch (error) {
    console.error("Live scores fetch failed", error);
    return NextResponse.json({ scores: {} }, { status: 200 });
  }
}
