import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 32) || "user"
  );
}

function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { nickname?: string; password?: string };
    const nickname = body.nickname?.trim();
    const password = body.password;

    if (!nickname || nickname.length < 2 || nickname.length > 30) {
      return NextResponse.json({ error: "Name must be 2-30 characters" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("nickname", nickname)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "That name is already taken" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const domain = process.env.AUTH_EMAIL_DOMAIN || "wc26.local";
    const authEmail = `${slugify(nickname)}_${shortId()}@${domain}`;
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: { nickname },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Sign up failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
