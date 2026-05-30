import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { nickname?: string; password?: string };
    const nickname = body.nickname?.trim();
    const password = body.password;

    if (!nickname || !password) {
      return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: authEmail, error: lookupError } = await admin.rpc("get_auth_email_for_nickname", {
      p_nickname: nickname,
    });

    if (lookupError || typeof authEmail !== "string") {
      return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
