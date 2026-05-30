import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile, nicknameIsAdmin } from "@/lib/auth";

export async function requireAdminOrCron(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (expected && header === `Bearer ${expected}`) {
    return null;
  }

  const { profile } = await getCurrentUserProfile();
  if (profile?.is_admin || nicknameIsAdmin(profile?.nickname)) {
    return null;
  }

  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}
