import { revalidatePath } from "next/cache";

/** Refresh server-rendered pages that depend on match scores / standings. */
export function revalidateLivePages() {
  revalidatePath("/standings");
  revalidatePath("/leaderboard");
  revalidatePath("/matches");
  revalidatePath("/groups");
  revalidatePath("/");
  revalidatePath("/admin");
}
