import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUserProfile() {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id,nickname,avatar_url,is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, profile };
}

export function nicknameIsAdmin(nickname: string | null | undefined) {
  const admins = (process.env.ADMIN_NICKNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(nickname && admins.includes(nickname.toLowerCase()));
}
