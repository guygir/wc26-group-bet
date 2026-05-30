import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File) || avatar.size === 0) {
    return NextResponse.json({ error: "Avatar image is required" }, { status: 400 });
  }

  if (!avatar.type.startsWith("image/")) {
    return NextResponse.json({ error: "Avatar must be an image" }, { status: 400 });
  }

  const extension = avatar.name.split(".").pop() || "png";
  const path = `${user.id}/avatar.${extension}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("avatars").upload(path, avatar, {
    contentType: avatar.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);
  await admin.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("user_id", user.id);

  return NextResponse.json({ avatarUrl: publicUrl.publicUrl });
}
