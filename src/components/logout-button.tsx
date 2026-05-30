"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="min-h-10 shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
      {t.shell.signOut}
    </button>
  );
}
